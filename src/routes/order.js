// RE-Earth-api/src/routes/pointOrder.js
const express = require('express')
const router = express.Router()

const { Sequelize, Op, col } = require('sequelize')
const { sequelize, User, Point, PointOrder, OrderItem, Item, ItemImage } = require('../models')
const { verifyToken, isLoggedIn } = require('./middlewares')

// [POST] 주문 생성
// req.body = { items: [{ itemId: number, count: number }, ...] }
router.post('/', verifyToken, isLoggedIn, async (req, res, next) => {
   let transaction
   try {
      transaction = await sequelize.transaction()

      const { items } = req.body
      if (!Array.isArray(items) || items.length === 0) {
         const err = new Error('주문할 상품 목록이 비어있습니다.')
         err.status = 400
         throw err
      }

      // 회원 확인
      const user = await User.findByPk(req.user.id, { transaction })
      if (!user) {
         const err = new Error('회원이 존재하지 않습니다.')
         err.status = 404
         throw err
      }

      // (선택) 포인트 지갑/계정 확인이 필요하면 pointId를 프론트에서 받거나, 유저의 기본 포인트 계정을 조회하세요.
      // 예: const point = await Point.findOne({ where: { userId: user.id }, transaction })
      // 여기서는 필수 검증을 생략하고 주문만 생성합니다.

      // 1) 주문 생성
      const order = await PointOrder.create(
         {
            userId: user.id,
            orderDate: new Date(),
            orderStatus: 'ORDER',
            // pointId: point?.id, // 포인트 연동 시 사용
         },
         { transaction }
      )

      // 2) 각 아이템 재고 확인 + 차감, 주문상품 리스트 준비
      let totalOrderPrice = 0
      const orderItemsData = []

      for (const it of items) {
         const product = await Item.findByPk(it.itemId, { transaction })
         if (!product) {
            const err = new Error(`상품(id=${it.itemId})이 존재하지 않습니다.`)
            err.status = 404
            throw err
         }

         const count = Number(it.count) || 0
         if (count <= 0) {
            const err = new Error(`상품(id=${it.itemId})의 수량이 올바르지 않습니다.`)
            err.status = 400
            throw err
         }

         if (product.stockNumber < count) {
            const err = new Error(`상품(id=${it.itemId}) 재고가 부족합니다.`)
            err.status = 400
            throw err
         }

         // 재고 차감
         product.stockNumber -= count
         await product.save({ transaction })

         const orderPrice = product.price * count
         totalOrderPrice += orderPrice

         orderItemsData.push({
            pointOrderId: order.id, // ★ FK 이름 통일
            itemId: product.id,
            orderPrice,
            count,
         })
      }

      // 3) 주문상품 벌크 생성
      await OrderItem.bulkCreate(orderItemsData, { transaction })

      // (선택) 포인트 차감/적립 로직이 있다면 여기서 Point 갱신
      // if (point) {
      //   point.balance -= totalOrderPrice
      //   await point.save({ transaction })
      // }

      await transaction.commit()

      res.status(201).json({
         success: true,
         message: '주문이 성공적으로 생성되었습니다.',
         orderId: order.id,
         totalPrice: totalOrderPrice,
      })
   } catch (error) {
      if (transaction) await transaction.rollback()
      error.status = error.status || 500
      error.message = error.message || '상품 주문 중 오류가 발생했습니다.'
      next(error)
   }
})

/**
 * [GET] 주문 목록

 */
router.get('/list', verifyToken, isLoggedIn, async (req, res, next) => {
   try {
      const { startDate, endDate } = req.query
      const where = { userId: req.user.id }

      if (startDate && endDate) {
         // DATEONLY 컬럼이면 그대로 between 가능. DATETIME이면 끝을 23:59:59로 보정
         where.orderDate = { [Op.between]: [startDate, endDate] }
      }

      const totalOrders = await PointOrder.count({ where })

      // PointOrder → OrderItem → Item(+ItemImage) 형태로 include
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
                           required: false, // 대표 이미지가 없어도 주문 목록은 조회되도록
                        },
                     ],
                  },
               ],
            },
            // (선택) 포인트/유저 정보가 필요하면 함께 반환
            // { model: Point, attributes: ['id', 'balance'] },
            // { model: User, attributes: ['id', 'name'] },
         ],
      })

      res.json({
         success: true,
         message: '주문 목록 조회 성공',
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
      if (order.userId !== req.user.id) {
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

      // (선택) 포인트 복구 로직이 있다면 여기서 수행
      // const point = await Point.findByPk(order.pointId, { transaction })
      // if (point) { ... }

      await transaction.commit()

      res.json({ success: true, message: '주문이 성공적으로 취소되었습니다.' })
   } catch (error) {
      if (transaction) await transaction.rollback()
      error.status = 500
      error.message = '주문 취소 중 오류가 발생했습니다.'
      next(error)
   }
})

// [DELETE] 주문 삭제 (관리자나 본인만)
router.delete('/delete/:id', verifyToken, isLoggedIn, async (req, res, next) => {
   try {
      const id = Number(req.params.id)
      const order = await PointOrder.findByPk(id)
      if (!order) {
         const err = new Error('주문내역이 존재하지 않습니다.')
         err.status = 404
         throw err
      }
      if (order.userId !== req.user.id /* && !req.user.isAdmin */) {
         const err = new Error('본인 주문만 삭제할 수 있습니다.')
         err.status = 403
         throw err
      }

      // CASCADE면 OrderItem도 함께 삭제됨
      await PointOrder.destroy({ where: { id: order.id } })

      res.json({ success: true, message: '주문내역이 성공적으로 삭제되었습니다.' })
   } catch (error) {
      error.status = 500
      error.message = '주문 삭제 중 오류가 발생했습니다.'
      next(error)
   }
})

module.exports = router
