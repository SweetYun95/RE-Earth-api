const express = require('express')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const { Item, ItemImage } = require('../models')
const { isAdmin, verifyToken } = require('./middlewares')
const router = express.Router()

// uploads 폴더가 없을 경우 새로 생성
try {
   fs.readdirSync('uploads')
} catch (error) {
   console.log('uploads 폴더가 없어 uploads 폴더를 생성합니다.')
   fs.mkdirSync('uploads')
}

// multer 설정
const upload = multer({
   storage: multer.diskStorage({
      destination(req, file, cb) {
         cb(null, 'uploads/')
      },
      filename(req, file, cb) {
         const decodedFileName = decodeURIComponent(file.originalname)
         const ext = path.extname(decodedFileName)
         const basename = path.basename(decodedFileName, ext)
         cb(null, basename + Date.now() + ext)
      },
   }),
   limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
})

//상품등록
router.post('/', verifyToken, isAdmin, upload.array('img'), async (req, res, next) => {
   try {
      if (!req.files) {
         const error = new Error('파일 업로드에 실패했습니다.')
         error.status = 400
         return next(error)
      }
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
      //이미지 삽입
      const images = req.files.map((file) => ({
         oriImgName: file.originalname,
         imgUrl: `/${file.filename}`,
         repImgYn: 'N',
         itemId: item.id,
      }))
      if (images.length > 0) images[0].repImgYn = 'Y'
      await ItemImage.bulkCreate(images)

      res.status(201).json({
         success: true,
         message: '상품이 성공적으로 등록되었습니다.',
         item,
         images,
      })
   } catch (error) {
      error.status = error.status || 500
      error.message = error.message || '상품 등록 중 오류가 발생했습니다.'
      return next(error)
   }
})

//전체 상품 불러오기
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
      res.status(201).json({
         success: true,
         message: '상품 목록 조회 성공',
         items,
      })
   } catch (error) {
      error.status = 500
      error.message = '전체 상품리스트 불러오는 중 오류가 발생'
      next(error)
   }
})
//상품삭제
router.delete('/:id', verifyToken, isAdmin, async (req, res, next) => {
   try {
      const id = req.params.id

      const item = await Item.findByPK(id)

      if (!item) {
         const error = new Error('상품을 찾을 수 없습니다.')
         error.status = 404
         return next(error)
      }
      await item.destroy()
      res.status(201).json({
         success: true,
         message: '상품이 성공적으로 삭제되었습니다.',
      })
   } catch (error) {
      error.status = 500
      error.message = '상품 삭제 중 오류가 발생했습니다.'
      next(error)
   }
})
//특정 상품 불러오기
router.get('/:id', verifyToken, async (req, res, next) => {
   try {
      const id = req.params.id

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
      res.status(200).json({
         success: true,
         message: '상품 조회 성공',
         item,
      })
   } catch (error) {
      error.status = 500
      error.message = '상품을 불러오는 중 오류가 발생했습니다.'
      next(error)
   }
})
//상품 수정하기
router.put('/:id', verifyToken, isAdmin, upload.array('img'), async (req, res, next) => {
   try {
      const id = req.params.id
      const { itemNm, price, itemDetail, itemSellStatus, stockNumber, itemSummary, brandName, vendorName } = req.body

      const item = await Item.findByPK(id)

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

      if (req.files && req.files > 0) {
         await ItemImage.destroy({ where: { itemId: id } })
         const images = req.file.map((file) => ({
            oriImgName: file.originalname,
            imgUrl: `/${file.filename}`,
            repImgYn: 'N',
            itemId: item.id,
         }))

         if (images.length > 0) images[0].repImgYn = 'Y'

         await Img.bulkCreate(images)
      }
      res.status(201).json({
         success: true,
         message: '상품이 성공적으로 수정되었습니다.',
      })
   } catch (error) {
      error.status = 500
      error.message = '상품 수정 중 오류가 발생했습니다.'
      next(error)
   }
})
module.exports = router
