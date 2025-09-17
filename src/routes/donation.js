// RE-Earth-api/src/routes/donation.js
const express = require('express')
const router = express.Router()

const { Donation, DonationItem, sequelize } = require('../models')
const { isLoggedIn } = require('./middlewares')

// ────────────────────────────────────────────────
// 개발용 OTP 저장소 (서버 재시작 시 사라짐) → 운영: Redis 등으로 교체
// key: phone, value: { code, exp }
const otpStore = new Map()
const OTP_TTL_SEC = parseInt(process.env.OTP_TTL_SEC || '300', 10) // 5분

function genOtp() {
   return String(Math.floor(100000 + Math.random() * 900000))
}

function sanitizePhone(p) {
   return String(p || '').replace(/[^0-9]/g, '')
}

// 계산 규칙: 1개당 기본 100포인트 (환경변수 DONATION_POINT_PER_ITEM 로 조정)
function calcExpectedPoint(count) {
   const perItem = parseInt(process.env.DONATION_POINT_PER_ITEM || '100', 10)
   return Math.max(0, Number(count || 0)) * perItem
}

// ────────────────────────────────────────────────
// [Step 2] OTP 요청
// POST /api/donations/otp/request { phone }
router.post('/otp/request', async (req, res, next) => {
   try {
      const phone = sanitizePhone(req.body.phone)
      if (!phone || phone.length < 10) {
         return res.status(400).json({ message: '휴대폰 번호를 정확히 입력하세요.' })
      }

      const code = genOtp()
      const exp = Date.now() + OTP_TTL_SEC * 1000
      otpStore.set(phone, { code, exp })

      // TODO: 실제 SMS 전송 로직 연동
      const payload = { ok: true, ttl: OTP_TTL_SEC }
      if (process.env.NODE_ENV !== 'production') payload.devCode = code

      return res.json(payload)
   } catch (err) {
      next(err)
   }
})

// [Step 2] OTP 검증
// POST /api/donations/otp/verify { phone, code }
router.post('/otp/verify', async (req, res, next) => {
   try {
      const phone = sanitizePhone(req.body.phone)
      const code = String(req.body.code || '')
      const rec = otpStore.get(phone)

      if (!rec) return res.status(400).json({ verified: false, message: '인증요청이 필요합니다.' })
      if (Date.now() > rec.exp) return res.status(400).json({ verified: false, message: '인증번호가 만료되었습니다.' })
      if (rec.code !== code) return res.status(400).json({ verified: false, message: '인증번호가 올바르지 않습니다.' })

      otpStore.delete(phone)
      return res.json({ verified: true })
   } catch (err) {
      next(err)
   }
})

// ────────────────────────────────────────────────
// [Step 3~4] 기부 신청 생성
// POST /api/donations
// body 예시:
// {
//   items: [{ itemName: '의류', amount: 3 }],
//   count: 3,
//   packaging: { box: 1, bag: 0 },
//   method: 'VISIT' | 'COURIER',
//   pickupDate: '2025-10-10',
//   returnAddress: '인천광역시 …',
// }
router.post('/', isLoggedIn, async (req, res, next) => {
   const t = await sequelize.transaction()
   try {
      const userId = req.user.id
      const { items = [], count, returnAddress, method, pickupDate } = req.body

      if (!Array.isArray(items) || items.length === 0) {
         return res.status(400).json({ message: '기부 품목을 1개 이상 입력하세요.' })
      }
      if (!count || Number(count) <= 0) {
         return res.status(400).json({ message: '물품 총 수량(count)을 확인하세요.' })
      }
      if (!returnAddress) {
         return res.status(400).json({ message: '회수/반송 주소를 입력하세요.' })
      }

      const expectedPoint = calcExpectedPoint(count)

      const donation = await Donation.create(
         {
            count,
            expectedPoint,
            returnAddress,
            status: 'REQUESTED',
            receiptUrl: '', // 발급 후 업데이트
            userId,
         },
         { transaction: t }
      )

      // 자식 품목 생성
      const rows = items.map((it) => ({
         itemName: String(it.itemName || '기타'),
         amount: Number(it.amount || 0),
         donationId: donation.id,
      }))

      await DonationItem.bulkCreate(rows, { transaction: t })

      await t.commit()

      // include 하여 반환
      const created = await Donation.findByPk(donation.id, {
         include: [{ model: DonationItem }],
      })

      return res.status(201).json({
         donation: created,
         meta: { method, pickupDate }, // 별도 테이블이 없으므로 응답 메타로 회신 (원하면 DB 테이블로 분리)
      })
   } catch (err) {
      await t.rollback()
      next(err)
   }
})

// 내 기부 목록
// GET /api/donations/mine?page=1&size=10
router.get('/mine', isLoggedIn, async (req, res, next) => {
   try {
      const page = Math.max(1, parseInt(req.query.page, 10) || 1)
      const size = Math.max(1, Math.min(50, parseInt(req.query.size, 10) || 10))
      const offset = (page - 1) * size

      const { rows, count } = await Donation.findAndCountAll({
         where: { userId: req.user.id },
         include: [{ model: DonationItem }],
         order: [['createdAt', 'DESC']],
         limit: size,
         offset,
      })

      res.json({ list: rows, page, size, total: count })
   } catch (err) {
      next(err)
   }
})

// 단건 조회
router.get('/:id', isLoggedIn, async (req, res, next) => {
   try {
      const d = await Donation.findByPk(req.params.id, { include: [{ model: DonationItem }] })
      if (!d || d.userId !== req.user.id) return res.status(404).json({ message: '존재하지 않거나 접근 권한이 없습니다.' })
      res.json(d)
   } catch (err) {
      next(err)
   }
})

// 취소 (요청 상태에서만)
router.put('/:id/cancel', isLoggedIn, async (req, res, next) => {
   try {
      const d = await Donation.findByPk(req.params.id)
      if (!d || d.userId !== req.user.id) return res.status(404).json({ message: '존재하지 않거나 접근 권한이 없습니다.' })
      if (d.status !== 'REQUESTED') return res.status(400).json({ message: '현재 상태에선 취소할 수 없습니다.' })

      d.status = 'CANCELED'
      await d.save()
      res.json({ ok: true, donation: d })
   } catch (err) {
      next(err)
   }
})

module.exports = router
