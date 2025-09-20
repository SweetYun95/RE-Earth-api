// RE-Earth-api/src/routes_swagger/item.swagger.js
const express = require('express')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const { Item, ItemImage } = require('../models')
const { isAdmin, verifyToken } = require('./middlewares')

const router = express.Router()

// Uploads 디렉터리 보장
const UPLOAD_DIR = path.join(process.cwd(), 'uploads')
if (!fs.existsSync(UPLOAD_DIR)) {
   fs.mkdirSync(UPLOAD_DIR, { recursive: true })
   console.log('uploads 폴더가 없어 uploads 폴더를 생성합니다.')
}

// Multer 설정 (이미지 전용)
const storage = multer.diskStorage({
   destination(req, file, cb) {
      cb(null, UPLOAD_DIR)
   },
   filename(req, file, cb) {
      const decodedFileName = decodeURIComponent(file.originalname)
      const ext = path.extname(decodedFileName)
      const basename = path.basename(decodedFileName, ext)
      cb(null, `${basename}-${Date.now()}${ext}`)
   },
})

const fileFilter = (req, file, cb) => {
   if (file.mimetype && file.mimetype.startsWith('image/')) return cb(null, true)
   cb(new Error('이미지 파일만 업로드할 수 있습니다.'))
}

const upload = multer({
   storage,
   fileFilter,
   limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
})

const toPublicUrl = (filename) => `/uploads/${filename}`

/**
 * @swagger
 * tags:
 *   - name: Items
 *     description: 상품(스토어) API
 *
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   schemas:
 *     ItemImage:
 *       type: object
 *       properties:
 *         id: { type: integer, example: 10 }
 *         oriImgName: { type: string, example: "coat.jpg" }
 *         imgUrl: { type: string, example: "/uploads/coat-1695119000000.jpg" }
 *         repImgYn: { type: string, enum: [Y, N], example: "Y" }
 *     Item:
 *       type: object
 *       properties:
 *         id: { type: integer, example: 1 }
 *         itemNm: { type: string, example: "에코 코트" }
 *         price: { type: number, example: 99000 }
 *         itemDetail: { type: string, example: "업사이클 패브릭" }
 *         itemSellStatus: { type: string, example: "SELL" }
 *         stockNumber: { type: integer, example: 100 }
 *         itemSummary: { type: string, example: "따뜻하고 가벼운 코트" }
 *         brandName: { type: string, example: "RE:Earth" }
 *         vendorName: { type: string, example: "RE:Earth 협동조합" }
 *         createdAt: { type: string, format: date-time }
 *         updatedAt: { type: string, format: date-time }
 *         ItemImages:
 *           type: array
 *           items: { $ref: '#/components/schemas/ItemImage' }
 *     ItemCreateMultipart:
 *       type: object
 *       properties:
 *         itemNm: { type: string }
 *         price: { type: number }
 *         itemDetail: { type: string }
 *         itemSellStatus: { type: string, example: "SELL" }
 *         stockNumber: { type: integer }
 *         itemSummary: { type: string }
 *         brandName: { type: string }
 *         vendorName: { type: string }
 *         img:
 *           type: array
 *           items:
 *             type: string
 *             format: binary
 *           description: 업로드 이미지(여러 개)
 */

/**
 * @swagger
 * /items:
 *   post:
 *     summary: 상품 등록 (관리자)
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/ItemCreateMultipart'
 *     responses:
 *       201:
 *         description: 상품 등록 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: "상품이 성공적으로 등록되었습니다." }
 *                 item: { $ref: '#/components/schemas/Item' }
 *                 images:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/ItemImage' }
 *       400:
 *         description: 요청 오류
 *       401:
 *         description: 인증 필요
 *       403:
 *         description: 권한 없음
 *       500:
 *         description: 서버 오류
 */
// 상품 등록
router.post('/', verifyToken, isAdmin, upload.array('img'), async (req, res, next) => {
   try {
      const files = req.files || []
      const { itemNm, price, itemDetail, itemSellStatus, stockNumber, itemSummary, brandName, vendorName } = req.body

      const item = await Item.create({
         itemNm,
         price,
         itemDetail,
         itemSellStatus,
         stockNumber,
         itemSummary,
         brandName,
         vendorName,
      })

      const images = files.map((file, idx) => ({
         oriImgName: file.originalname,
         imgUrl: toPublicUrl(file.filename),
         repImgYn: idx === 0 ? 'Y' : 'N',
         itemId: item.id,
      }))

      if (images.length) await ItemImage.bulkCreate(images)

      res.status(201).json({
         success: true,
         message: '상품이 성공적으로 등록되었습니다.',
         item,
         images,
      })
   } catch (error) {
      error.status = error.status || 500
      error.message = error.message || '상품 등록 중 오류가 발생했습니다.'
      next(error)
   }
})

/**
 * @swagger
 * /items:
 *   get:
 *     summary: 전체 상품 조회
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: sellCategory
 *         schema: { type: string, example: "SELL" }
 *         description: 판매 상태 필터(itemSellStatus)
 *     responses:
 *       200:
 *         description: 상품 목록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: "상품 목록 조회 성공" }
 *                 items:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Item' }
 *       401:
 *         description: 인증 필요
 *       500:
 *         description: 서버 오류
 */
// 전체 상품 조회
router.get('/', verifyToken, async (req, res, next) => {
   try {
      const sellCategory = req.query.sellCategory
      const where = {}
      if (sellCategory) {
         where.itemSellStatus = sellCategory
      }
      const items = await Item.findAll({
         where,
         order: [['createdAt', 'DESC']],
         include: [
            {
               model: ItemImage,
               attributes: ['id', 'oriImgName', 'imgUrl', 'repImgYn'],
            },
         ],
      })
      res.status(200).json({ success: true, message: '상품 목록 조회 성공', items })
   } catch (error) {
      error.status = 500
      error.message = '전체 상품리스트 불러오는 중 오류가 발생'
      next(error)
   }
})

/**
 * @swagger
 * /items/{id}:
 *   get:
 *     summary: 특정 상품 조회
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: 상품 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: "상품 조회 성공" }
 *                 item: { $ref: '#/components/schemas/Item' }
 *       404:
 *         description: 상품 없음
 *       401:
 *         description: 인증 필요
 *       500:
 *         description: 서버 오류
 */
// 특정 상품 조회
router.get('/:id', verifyToken, async (req, res, next) => {
   try {
      const { id } = req.params
      const item = await Item.findOne({
         where: { id },
         include: [
            {
               model: ItemImage,
               attributes: ['id', 'oriImgName', 'imgUrl', 'repImgYn'],
            },
         ],
      })

      if (!item) {
         const error = new Error('해당 상품을 찾을 수 없습니다')
         error.status = 404
         return next(error)
      }

      res.status(200).json({ success: true, message: '상품 조회 성공', item })
   } catch (error) {
      error.status = 500
      error.message = '상품을 불러오는 중 오류가 발생했습니다.'
      next(error)
   }
})

/**
 * @swagger
 * /items/{id}:
 *   put:
 *     summary: 상품 수정 (관리자)
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/ItemCreateMultipart'
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: 수정 성공
 *       401:
 *         description: 인증 필요
 *       403:
 *         description: 권한 없음
 *       404:
 *         description: 상품 없음
 *       500:
 *         description: 서버 오류
 */
// 상품 수정
router.put('/:id', verifyToken, isAdmin, upload.array('img'), async (req, res, next) => {
   try {
      const { id } = req.params
      const { itemNm, price, itemDetail, itemSellStatus, stockNumber, itemSummary, brandName, vendorName } = req.body

      const item = await Item.findByPk(id)
      if (!item) {
         const error = new Error('해당상품을 찾을 수 없습니다.')
         error.status = 404
         return next(error)
      }

      await item.update({
         itemNm,
         price,
         itemDetail,
         itemSellStatus,
         stockNumber,
         itemSummary,
         brandName,
         vendorName,
      })

      const files = req.files || []
      if (files.length > 0) {
         const oldImages = await ItemImage.findAll({ where: { itemId: id } })
         for (const img of oldImages) {
            const filepath = path.join(UPLOAD_DIR, path.basename(img.imgUrl))
            try {
               if (fs.existsSync(filepath)) fs.unlinkSync(filepath)
            } catch (_) {}
         }
         await ItemImage.destroy({ where: { itemId: id } })

         const newImages = files.map((file, idx) => ({
            oriImgName: file.originalname,
            imgUrl: toPublicUrl(file.filename),
            repImgYn: idx === 0 ? 'Y' : 'N',
            itemId: item.id,
         }))
         await ItemImage.bulkCreate(newImages)
      }

      res.status(200).json({ success: true, message: '상품이 성공적으로 수정되었습니다.' })
   } catch (error) {
      error.status = 500
      error.message = '상품 수정 중 오류가 발생했습니다.'
      next(error)
   }
})

module.exports = router
