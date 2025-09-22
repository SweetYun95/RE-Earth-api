// RE-Earth-api/src/routes_swagger/pointOrder.swagger.js
const express = require('express')
const router = express.Router()

const { Op } = require('sequelize')
const { sequelize, User, Point, PointOrder, OrderItem, Item, ItemImage } = require('../models')
const { verifyToken, isLoggedIn } = require('./middlewares')

/**
 * @swagger
 * tags:
 *   - name: PointOrders
 *     description: 포인트 결제 기반 주문 API
 *
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   schemas:
 *     OrderItem:
 *       type: object
 *       properties:
 *         id: { type: integer, example: 5 }
 *         count: { type: integer, example: 2 }
 *         orderPrice: { type: integer, example: 19800 }
 *         itemId: { type: integer, example: 7 }
 *         Item:
 *           type: object
 *           properties:
 *             id: { type: integer, example: 7 }
 *             itemNm: { type: string, example: "에코 티셔츠" }
 *             price: { type: integer, example: 9900 }
 *             ItemImages:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   imgUrl: { type: string, example: "/uploads/tshirt.jpg" }
 *                   repImgYn: { type: string, enum: [Y, N], example: "Y" }
 *     PointOrder:
 *       type: object
 *       properties:
 *         id: { type: integer, example: 1 }
 *         userId: { type: integer, example: 3 }
 *         totalPrice: { type: integer, example: 20000 }
 *         orderStatus: { type: string, example: "PAID" }
 *         orderDate: { type: string, format: date-time }
 *         OrderItems:
 *           type: array
 *           items: { $ref: '#/components/schemas/OrderItem' }
 *     CreateOrderRequest:
 *       type: object
 *       required: [items]
 *       properties:
 *         items:
 *           type: array
 *           description: 주문 상품 목록
 *           items:
 *             type: object
 *             properties:
 *               itemId: { type: integer, example: 7 }
 *               count: { type: integer, example: 2 }
 */

/**
 * @swagger
 * /point-orders:
 *   post:
 *     summary: 주문 생성
 *     tags: [PointOrders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateOrderRequest'
 *     responses:
 *       201:
 *         description: 주문 생성 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: "주문 생성 성공" }
 *                 orderId: { type: integer, example: 12 }
 *       400:
 *         description: 요청 오류(포인트 부족, 재고 부족 등)
 *       401:
 *         description: 인증 필요
 *       404:
 *         description: 존재하지 않는 상품/회원
 *       500:
 *         description: 서버 오류
 */
// [POST] 주문 생성
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

      const userId = req.decoded.id
      const user = await User.findByPk(userId, { transaction, lock: transaction.LOCK.UPDATE })
      if (!user) {
         const err = new Error('회원 정보를 찾을 수 없습니다.')
         err.status = 404
         throw err
      }

      const pointBalanceRaw = await Point.sum('delta', { where: { userId }, transaction })
      const pointBalance = Number(pointBalanceRaw) || 0

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

      if (pointBalance < orderTotal) {
         const err = new Error('보유 포인트가 부족합니다.')
         err.status = 400
         throw err
      }

      const pointLog = await Point.create(
         {
            userId,
            delta: -orderTotal,
            reason: 'ORDER_PAYMENT',
            memo: `주문 결제`,
         },
         { transaction }
      )

      const order = await PointOrder.create(
         {
            userId,
            totalPrice: orderTotal,
            pointId: pointLog.id,
            orderStatus: 'PAID',
         },
         { transaction }
      )

      const orderItemsBulk = itemRows.map(({ row, count }) => ({
         itemId: row.id,
         pointOrderId: order.id,
         orderPrice: row.price * count,
         count,
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
 * @swagger
 * /point-orders/list:
 *   get:
 *     summary: 주문 목록 조회
 *     tags: [PointOrders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date }
 *         description: 시작일
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date }
 *         description: 종료일
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: size
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200:
 *         description: 주문 목록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: "주문 목록 조회 성공" }
 *                 page: { type: integer, example: 1 }
 *                 size: { type: integer, example: 10 }
 *                 total: { type: integer, example: 2 }
 *                 orders:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/PointOrder' }
 *       401:
 *         description: 인증 필요
 *       500:
 *         description: 서버 오류
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
                           required: false,
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

/**
 * @swagger
 * /point-orders/cancel/{id}:
 *   post:
 *     summary: 주문 취소
 *     tags: [PointOrders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: 주문 ID
 *     responses:
 *       200:
 *         description: 취소 성공
 *       400:
 *         description: 이미 취소된 주문
 *       401:
 *         description: 인증 필요
 *       403:
 *         description: 권한 없음
 *       404:
 *         description: 주문 없음
 *       500:
 *         description: 서버 오류
 */
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

      for (const oi of order.OrderItems) {
         const product = oi.Item
         product.stockNumber += oi.count
         await product.save({ transaction })
      }

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

/**
 * @swagger
 * /point-orders/delete/{id}:
 *   delete:
 *     summary: 주문 삭제
 *     tags: [PointOrders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: 삭제 성공
 *       401:
 *         description: 인증 필요
 *       403:
 *         description: 권한 없음
 *       404:
 *         description: 주문 없음
 *       500:
 *         description: 서버 오류
 */
router.delete('/delete/:id', verifyToken, isLoggedIn, async (req, res, next) => {
   try {
      const id = Number(req.params.id)
      const order = await PointOrder.findByPk(id)
      if (!order) {
         const err = new Error('주문내역이 존재하지 않습니다.')
         err.status = 404
         throw err
      }
      if (order.userId !== req.decoded.id) {
         const err = new Error('본인 주문만 삭제할 수 있습니다.')
         err.status = 403
         throw err
      }

      await PointOrder.destroy({ where: { id: order.id } })
      res.json({ success: true, message: '주문내역이 성공적으로 삭제되었습니다.' })
   } catch (error) {
      error.status = 500
      error.message = '주문 삭제 중 오류가 발생했습니다.'
      next(error)
   }
})

module.exports = router
