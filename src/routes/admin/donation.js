// RE-Earth-api/src/routes/admin/donation.js
const express = require('express')
const router = express.Router()
const { isAdmin } = require('../middlewares')
const { Donation, DonationItem, User, sequelize } = require('../../models')

// 상태 전이 규칙(예시)
const ALLOWED = {
   REQUESTED: ['PICKUP_SCHEDULED', 'CANCELED'],
   PICKUP_SCHEDULED: ['PICKED_UP', 'CANCELED'],
   PICKED_UP: ['RECEIVED', 'CANCELED'],
   RECEIVED: ['POINT_ISSUED'],
   POINT_ISSUED: [], // 완료
   CANCELED: [], // 종료
}

function canTransition(prev, next) {
   return (ALLOWED[prev] || []).includes(next)
}

// 목록: GET /api/admin/donations?status=&q=&page=&size=
router.get('/', isAdmin, async (req, res, next) => {
   try {
      const page = Math.max(1, parseInt(req.query.page, 10) || 1)
      const size = Math.max(1, Math.min(100, parseInt(req.query.size, 10) || 20))
      const offset = (page - 1) * size
      const status = req.query.status
      const q = (req.query.q || '').trim()

      const where = {}
      if (status) where.status = status

      // 간단 검색: 신청자 이름/이메일/주소 일부
      const { Op } = require('sequelize')
      if (q) {
         where[Op.or] = [{ returnAddress: { [Op.like]: `%${q}%` } }]
      }

      const { rows, count } = await Donation.findAndCountAll({
         where,
         include: [{ model: DonationItem }, { model: User, attributes: ['id', 'name', 'email', 'userId'] }],
         order: [['createdAt', 'DESC']],
         limit: size,
         offset,
      })

      res.json({ list: rows, page, size, total: count })
   } catch (err) {
      next(err)
   }
})

// 상세: GET /api/admin/donations/:id
router.get('/:id', isAdmin, async (req, res, next) => {
   try {
      const d = await Donation.findByPk(req.params.id, {
         include: [{ model: DonationItem }, { model: User, attributes: ['id', 'name', 'email', 'userId'] }],
      })
      if (!d) return res.status(404).json({ message: '기부 신청이 없습니다.' })
      res.json({ donation: d })
   } catch (err) {
      next(err)
   }
})

// 상태/메타 업데이트: PUT /api/admin/donations/:id
// body: { status?, receiptUrl?, pickupDate? }
router.put('/:id', isAdmin, async (req, res, next) => {
   const t = await sequelize.transaction()
   try {
      const d = await Donation.findByPk(req.params.id, { transaction: t })
      if (!d) {
         await t.rollback()
         return res.status(404).json({ message: '기부 신청이 없습니다.' })
      }

      const { status, receiptUrl, pickupDate } = req.body || {}

      if (status) {
         const prev = d.status
         const next = String(status).toUpperCase()
         if (!canTransition(prev, next)) {
            await t.rollback()
            return res.status(400).json({ message: `상태 전이 불가: ${prev} → ${next}` })
         }
         d.status = next
      }

      if (typeof receiptUrl === 'string') d.receiptUrl = receiptUrl
      if (typeof pickupDate === 'string') {
         // pickupDate를 Donation에 두지 않았다면(현 스키마) 생략 또는 별도 메타 컬럼 필요
         // 예시로 returnAddress 뒤에 표시하는 등은 프론트에서 처리
      }

      await d.save({ transaction: t })
      await t.commit()

      const reloaded = await Donation.findByPk(d.id, {
         include: [{ model: DonationItem }, { model: User, attributes: ['id', 'name', 'email', 'userId'] }],
      })
      res.json({ ok: true, donation: reloaded })
   } catch (err) {
      await t.rollback()
      next(err)
   }
})

module.exports = router
