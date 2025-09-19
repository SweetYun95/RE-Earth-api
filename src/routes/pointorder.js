// RE-Earth-api/src/routes/pointOrder.js
const express = require('express')
const router = express.Router()

const { Op } = require('sequelize')
const { sequelize, User, Point, PointOrder, OrderItem, Item, ItemImage } = require('../models')
const { verifyToken, isLoggedIn } = require('./middlewares')

// [POST] 주문 생성
// req.body = { items: [{ itemId:number, count:number }, ...] }
router.post('/', verifyToken, isLoggedIn, async (req, res, next) => {
   let transaction
   try {
      transaction = await sequelize.transaction()

      const { items } = req.body // [{ itemId, count }]
      if (!Array.isArray(items) || items.length === 0) {
         const err = new Error('주문할 상품 목록이 비어있습니다.')
         err.status = 400
         throw err
      }

      // 1) 회원 + 포인트 잔액 조회 (잠금)
      const userId = req.decoded.id
      const user = await User.findByPk(userId, { transaction, lock: transaction.LOCK.UPDATE })
      if (!user) {
         const err = new Error('회원 정보를 찾을 수 없습니다.')
         err.status = 404
         throw err
      }
      // 포인트 잔액
      const pointBalanceRaw = await Point.sum('delta', {
         where: { userId },
         transaction,
      })
      const pointBalance = Number(pointBalanceRaw) || 0 // null → 0

      // 2) 아이템 잠금 + 합계 계산 + 재고 검증
      let orderTotal = 0
      const itemRows = []
      for (const it of items) {
         const row = await Item.findByPk(it.itemId, {
            transaction,
            lock: transaction.LOCK.UPDATE,
         })
         if (!row) {
            const err = new Error(`상품(${it.itemId})을 찾을 수 없습니다.`)
            err.status = 404
            throw err
         }
         if (row.stockNumber < it.count) {
            const err = new Error(`재고 부족: ${row.itemNm}`)
            err.status = 400
            throw err
         }
         orderTotal += row.price * it.count
         itemRows.push({ row, count: it.count })
      }

      // 3) 포인트 잔액 확인
      if (pointBalance < orderTotal) {
         const err = new Error('보유 포인트가 부족합니다.')
         err.status = 400
         throw err
      }

      // 4) 포인트 차감 로그 생성 (여기서 생성된 id가 pointOrders.pointId로 들어가야 함!)
      const pointLog = await Point.create(
         {
            userId,
            delta: -orderTotal,
            reason: 'SPEND_ORDER', // enum/문자열은 프로젝트 컨벤션에 맞추세요
            meta: { items },
         },
         { transaction }
      )

      // 5) 주문 생성 (pointId 필수)
      const order = await PointOrder.create(
         {
            userId,
            totalPrice: orderTotal,
            pointId: pointLog.id, // ★ 여기!
            status: 'PAID', // 컨벤션에 맞게
         },
         { transaction }
      )

      // 6) 주문 아이템 생성 + 재고 차감
      const orderItemsBulk = itemRows.map(({ row, count }) => ({
         orderPrice: row.price * count,
         pointOrderId: order.id,
         itemId: row.id,
      }))
      await OrderItem.bulkCreate(orderItemsBulk, { transaction })

      for (const { row, count } of itemRows) {
         row.stockNumber -= count
         await row.save({ transaction })
      }

      await transaction.commit()
      return res.status(201).json({ success: true, message: '주문 생성 성공', orderId: order.id })
   } catch (err) {
      if (transaction) await transaction.rollback()
      err.status = err.status || 500
      err.message = err.message || '주문 처리 중 오류가 발생했습니다.'
      return next(err)
   }
})

/**
 * [GET] 주문 목록
 * /list?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&page=1&size=10
 */
router.get('/list', verifyToken, isLoggedIn, async (req, res, next) => {
   try {
      const { startDate, endDate } = req.query
      const page = Math.max(1, parseInt(req.query.page ?? '1', 10))
      const size = Math.max(1, Math.min(100, parseInt(req.query.size ?? '10', 10)))
      const offset = (page - 1) * size
      const limit = size

      const where = { userId: req.decoded.id }

      if (startDate && endDate) {
         where.orderDate = { [Op.between]: [startDate, endDate] }
      }

      const totalOrders = await PointOrder.count({ where })

      const orders = await PointOrder.findAll({
         where,
         limit,
         offset,
         order: [['orderDate', 'DESC']],
         include: [
            {
               model: OrderItem,
               attributes: ['id', 'count', 'orderPrice', 'itemId'],
               include: [
                  {
                     model: Item,
                     attributes: ['id', 'itemNm', 'price'],
                     include: [
                        {
                           model: ItemImage,
                           attributes: ['imgUrl', 'repImgYn'],
                           where: { repImgYn: 'Y' },
                           required: false, // 대표 이미지 없으면 null 허용
                        },
                     ],
                  },
               ],
            },
         ],
      })

      res.json({
         success: true,
         message: '주문 목록 조회 성공',
         page,
         size,
         total: totalOrders,
         orders,
      })
   } catch (error) {
      error.status = 500
      error.message = '주문내역을 불러오는 중 오류가 발생했습니다.'
      next(error)
   }
})

// [POST] 주문 취소
router.post('/cancel/:id', verifyToken, isLoggedIn, async (req, res, next) => {
   let transaction
   try {
      transaction = await sequelize.transaction()

      const id = Number(req.params.id)
      const order = await PointOrder.findByPk(id, {
         include: [{ model: OrderItem, include: [{ model: Item }] }],
         transaction,
         lock: transaction.LOCK.UPDATE,
      })

      if (!order) {
         const err = new Error('주문내역이 존재하지 않습니다.')
         err.status = 404
         throw err
      }
      if (order.userId !== req.decoded.id) {
         const err = new Error('본인 주문만 취소할 수 있습니다.')
         err.status = 403
         throw err
      }
      if (order.orderStatus === 'CANCEL') {
         const err = new Error('이미 취소된 주문입니다.')
         err.status = 400
         throw err
      }

      // 1) 재고 복구
      for (const oi of order.OrderItems) {
         const product = oi.Item
         product.stockNumber += oi.count
         await product.save({ transaction })
      }

      // 2) 주문 상태 변경
      order.orderStatus = 'CANCEL'
      await order.save({ transaction })

      await transaction.commit()
      res.json({ success: true, message: '주문이 성공적으로 취소되었습니다.' })
   } catch (error) {
      if (transaction) await transaction.rollback()
      error.status = 500
      error.message = '주문 취소 중 오류가 발생했습니다.'
      next(error)
   }
})

// [DELETE] 주문 삭제 (본인/관리자)
router.delete('/delete/:id', verifyToken, isLoggedIn, async (req, res, next) => {
   try {
      const id = Number(req.params.id)
      const order = await PointOrder.findByPk(id)
      if (!order) {
         const err = new Error('주문내역이 존재하지 않습니다.')
         err.status = 404
         throw err
      }
      if (order.userId !== req.decoded.id /* && !req.user.isAdmin */) {
         const err = new Error('본인 주문만 삭제할 수 있습니다.')
         err.status = 403
         throw err
      }

      await PointOrder.destroy({ where: { id: order.id } }) // CASCADE 가정

      res.json({ success: true, message: '주문내역이 성공적으로 삭제되었습니다.' })
   } catch (error) {
      error.status = 500
      error.message = '주문 삭제 중 오류가 발생했습니다.'
      next(error)
   }
})

module.exports = router
