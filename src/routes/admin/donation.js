// RE-Earth-api/src/routes/admin/donation.js
const express = require('express')
const router = express.Router()
const { Op, fn, col, literal } = require('sequelize')
const { isAdmin } = require('../middlewares')
const { Donation, DonationItem, User, sequelize } = require('../../models')

// ────────────────────────────────────────────────
// 상태 전이 규칙 (모델 ENUM: REQUESTED, SCHEDULED, PICKED, CANCELLED)
const ALLOWED = {
   REQUESTED: ['SCHEDULED', 'CANCELLED'],
   SCHEDULED: ['PICKED', 'CANCELLED'],
   PICKED: ['CANCELLED'],
   CANCELLED: [],
}
const canTransition = (prev, next) => (ALLOWED[prev] || []).includes(next)

// ────────────────────────────────────────────────
// [통계] GET /api/admin/donations/stats
router.get('/stats', isAdmin, async (req, res, next) => {
   try {
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

      const sevenDaysAgo = new Date(now)
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)

      const [donationsThisMonth, pointsThisMonth] = await Promise.all([Donation.count({ where: { createdAt: { [Op.between]: [monthStart, monthEnd] } } }), Donation.sum('expectedPoint', { where: { createdAt: { [Op.between]: [monthStart, monthEnd] } } })])

      const dailyRaw = await Donation.findAll({
         attributes: [
            [fn('DATE', col('createdAt')), 'date'],
            [fn('COUNT', col('id')), 'count'],
         ],
         where: { createdAt: { [Op.between]: [sevenDaysAgo, now] } },
         group: [fn('DATE', col('createdAt'))],
         order: [[literal('date'), 'ASC']],
         raw: true,
      })
      const map = new Map(dailyRaw.map((r) => [String(r.date), Number(r.count || 0)]))
      const donationsByDay = Array.from({ length: 7 }, (_, i) => {
         const d = new Date(now)
         d.setDate(d.getDate() - (6 - i))
         const key = d.toISOString().slice(0, 10)
         return { date: key, count: map.get(key) || 0 }
      })

      const recentDonations = await Donation.findAll({
         attributes: ['id', 'donorName', 'status', 'count', 'expectedPoint', 'createdAt'],
         order: [['createdAt', 'DESC']],
         limit: 6,
      })

      const byStatusRaw = await Donation.findAll({
         attributes: ['status', [fn('COUNT', col('id')), 'cnt']],
         group: ['status'],
         raw: true,
      })
      const byStatus = byStatusRaw.reduce(
         (acc, r) => {
            acc[r.status] = Number(r.cnt || 0)
            return acc
         },
         { REQUESTED: 0, SCHEDULED: 0, PICKED: 0, CANCELLED: 0 }
      )

      res.json({
         donationsThisMonth: Number(donationsThisMonth || 0),
         pointsThisMonth: Number(pointsThisMonth || 0),
         donationsByDay,
         recentDonations,
         byStatus,
      })
   } catch (err) {
      err.status = err.status || 500
      err.message = err.message || '기부 통계 조회 중 오류'
      next(err)
   }
})

// ────────────────────────────────────────────────
// [목록] GET /api/admin/donations?status=&q=&page=&size=
router.get('/', isAdmin, async (req, res, next) => {
   try {
      const page = Math.max(1, parseInt(req.query.page, 10) || 1)
      const size = Math.max(1, Math.min(100, parseInt(req.query.size, 10) || 20))
      const offset = (page - 1) * size
      const status = (req.query.status || '').trim()
      const q = (req.query.q || '').trim()

      const where = {}
      if (status) where.status = status
      if (q) {
         where[Op.or] = [{ donorName: { [Op.like]: `%${q}%` } }, { donorPhone: { [Op.like]: `%${q}%` } }, { donorEmail: { [Op.like]: `%${q}%` } }, { address1: { [Op.like]: `%${q}%` } }, { address2: { [Op.like]: `%${q}%` } }, { zipcode: { [Op.like]: `%${q}%` } }]
      }

      const { rows, count } = await Donation.findAndCountAll({
         where,
         include: [
            { model: DonationItem, as: 'items' },
            { model: User, attributes: ['id', 'name', 'email', 'userId'] },
         ],
         order: [['createdAt', 'DESC']],
         limit: size,
         offset,
      })

      res.json({ list: rows, page, size, total: count })
   } catch (err) {
      next(err)
   }
})

// ────────────────────────────────────────────────
// [상세] GET /api/admin/donations/:id
router.get('/:id', isAdmin, async (req, res, next) => {
   try {
      const id = Number(req.params.id)
      if (!Number.isInteger(id)) return res.status(400).json({ message: '잘못된 ID' })

      const d = await Donation.findByPk(id, {
         include: [
            { model: DonationItem, as: 'items' },
            { model: User, attributes: ['id', 'name', 'email', 'userId'] },
         ],
      })
      if (!d) return res.status(404).json({ message: '기부 신청이 없습니다.' })
      res.json({ donation: d })
   } catch (err) {
      next(err)
   }
})

// ────────────────────────────────────────────────
// [수정] PUT /api/admin/donations/:id
// body: { status?, receiptUrl?, memo? }
router.put('/:id', isAdmin, async (req, res, next) => {
   const t = await sequelize.transaction()
   try {
      const id = Number(req.params.id)
      if (!Number.isInteger(id)) {
         await t.rollback()
         return res.status(400).json({ message: '잘못된 ID' })
      }

      const d = await Donation.findByPk(id, { transaction: t })
      if (!d) {
         await t.rollback()
         return res.status(404).json({ message: '기부 신청이 없습니다.' })
      }

      const { status, receiptUrl, memo } = req.body || {}

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
      if (typeof memo === 'string') d.memo = memo

      await d.save({ transaction: t })
      await t.commit()

      const reloaded = await Donation.findByPk(d.id, {
         include: [
            { model: DonationItem, as: 'items' },
            { model: User, attributes: ['id', 'name', 'email', 'userId'] },
         ],
      })
      res.json({ ok: true, donation: reloaded })
   } catch (err) {
      await t.rollback()
      next(err)
   }
})

module.exports = router
