// RE-Earth-api/src/routes_swagger/donation.swagger.js
const express = require('express')
const router = express.Router()

const { Donation, DonationItem, sequelize } = require('../models')
const { isLoggedIn } = require('./middlewares')

// ────────────────────────────────────────────────
// 개발용 OTP 저장소 (서버 재시작 시 사라짐) → 운영: Redis 등으로 교체
const otpStore = new Map()
const OTP_TTL_SEC = parseInt(process.env.OTP_TTL_SEC || '300', 10) // 5분

function genOtp() {
   return String(Math.floor(100000 + Math.random() * 900000))
}
function sanitizePhone(p) {
   return String(p || '').replace(/[^0-9]/g, '')
}

// ────────────────────────────────────────────────
// 포인트 계산 규칙
// - 기본 단가: DONATION_POINT_PER_UNIT (기본 100)
// - 가중치: OUTER×3, SHOES×2, 나머지×1 (환경변수로 덮어쓰기 가능)
const UNIT_POINT = parseInt(process.env.DONATION_POINT_PER_UNIT || '100', 10)
const WEIGHT = {
   TOP: parseFloat(process.env.W_TOP || '1'),
   BOTTOM: parseFloat(process.env.W_BOTTOM || '1'),
   OUTER: parseFloat(process.env.W_OUTER || '3'),
   SHOES: parseFloat(process.env.W_SHOES || '2'),
   BAG: parseFloat(process.env.W_BAG || '1'),
   ETC: parseFloat(process.env.W_ETC || '1'),
}
function calcCount(items = []) {
   return items.reduce((sum, it) => sum + Math.max(0, Number(it.quantity || 0)), 0)
}
function calcExpectedPoint(items = []) {
   const weightedUnits = items.reduce((sum, it) => {
      const cat = String(it.category || 'ETC').toUpperCase()
      const w = WEIGHT[cat] ?? 1
      const q = Math.max(0, Number(it.quantity || 0))
      return sum + w * q
   }, 0)
   return Math.round(weightedUnits * UNIT_POINT)
}

/**
 * @swagger
 * tags:
 *   - name: Donations
 *     description: 의류/물품 기부 신청 및 조회 API
 *
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   schemas:
 *     DonationItemInput:
 *       type: object
 *       properties:
 *         category:
 *           type: string
 *           description: 품목 카테고리 (TOP/BOTTOM/OUTER/SHOES/BAG/ETC)
 *           example: "OUTER"
 *         condition:
 *           type: string
 *           description: 상태 (NORMAL/GOOD/BAD 등 내부 규칙)
 *           example: "NORMAL"
 *         quantity:
 *           type: integer
 *           minimum: 1
 *           example: 3
 *         note:
 *           type: string
 *           nullable: true
 *           example: "겨울 패딩 3벌"
 *         itemName:
 *           type: string
 *           nullable: true
 *         amount:
 *           type: number
 *           nullable: true
 *     DonationCreateRequest:
 *       type: object
 *       required: [donorName, donorPhone, zipcode, address1, pickupDate, agreePolicy, items]
 *       properties:
 *         donorName: { type: string, example: "윤달콤" }
 *         donorPhone: { type: string, example: "010-1234-5678" }
 *         donorEmail: { type: string, example: "yun@example.com" }
 *         zipcode: { type: string, example: "06236" }
 *         address1: { type: string, example: "서울 강남구 테헤란로 123" }
 *         address2: { type: string, nullable: true, example: "101동 505호" }
 *         pickupDate: { type: string, example: "2025-09-22" }
 *         memo: { type: string, nullable: true, example: "저녁 7시 이후 방문 가능" }
 *         agreePolicy: { type: boolean, example: true }
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/DonationItemInput'
 *     DonationOTPRequest:
 *       type: object
 *       required: [phone]
 *       properties:
 *         phone: { type: string, example: "010-1234-5678" }
 *     DonationOTPVerifyRequest:
 *       type: object
 *       required: [phone, code]
 *       properties:
 *         phone: { type: string, example: "010-1234-5678" }
 *         code: { type: string, example: "123456" }
 */

/**
 * @swagger
 * /donations/otp/request:
 *   post:
 *     summary: 기부 신청용 휴대폰 OTP 요청
 *     tags: [Donations]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DonationOTPRequest'
 *     responses:
 *       200:
 *         description: OTP 발송(개발환경은 devCode 포함)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok: { type: boolean, example: true }
 *                 ttl: { type: integer, example: 300 }
 *                 devCode: { type: string, example: "123456", nullable: true }
 *       400:
 *         description: 잘못된 휴대폰 번호
 *       500:
 *         description: 서버 오류
 */
// [OTP] 요청
// POST /donations/otp/request { phone }
router.post('/otp/request', async (req, res, next) => {
   try {
      const phone = sanitizePhone(req.body.phone)
      if (!phone || phone.length < 10) {
         return res.status(400).json({ ok: false, message: '휴대폰 번호를 정확히 입력하세요.' })
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

/**
 * @swagger
 * /donations/otp/verify:
 *   post:
 *     summary: 휴대폰 OTP 검증
 *     tags: [Donations]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DonationOTPVerifyRequest'
 *     responses:
 *       200:
 *         description: 인증 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 verified: { type: boolean, example: true }
 *       400:
 *         description: 인증요청 없음 / 만료 / 불일치
 *       500:
 *         description: 서버 오류
 */
// [OTP] 검증
// POST /donations/otp/verify { phone, code }
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

/**
 * @swagger
 * /donations:
 *   post:
 *     summary: 기부 신청 생성 (로그인 불필요)
 *     tags: [Donations]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DonationCreateRequest'
 *     responses:
 *       201:
 *         description: 생성 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok: { type: boolean, example: true }
 *                 donation:
 *                   type: object
 *                   description: 생성된 기부 엔터티(품목 포함)
 *       400:
 *         description: 필수값 누락/유효성 오류
 *       500:
 *         description: 서버 오류
 */
// [CREATE] 기부 신청 생성 (로그인 없어도 가능)
router.post('/', async (req, res, next) => {
   const t = await sequelize.transaction()
   try {
      const { donorName, donorPhone, donorEmail, zipcode, address1, address2, pickupDate, memo, agreePolicy, items = [] } = req.body

      // 필수 검증 (서버 사이드)
      if (!donorName || !donorPhone) return res.status(400).json({ ok: false, message: '신청자 정보가 필요합니다.' })
      if (!zipcode || !address1) return res.status(400).json({ ok: false, message: '주소를 입력하세요.' })
      if (!pickupDate) return res.status(400).json({ ok: false, message: '수거 예정일을 선택하세요.' })
      if (!Array.isArray(items) || items.length < 1) return res.status(400).json({ ok: false, message: '기부 물품을 1개 이상 등록하세요.' })
      if (agreePolicy !== true) return res.status(400).json({ ok: false, message: '정책 동의가 필요합니다.' })

      // 합계/포인트 계산
      const count = calcCount(items)
      if (count <= 0) return res.status(400).json({ ok: false, message: '물품 수량을 확인하세요.' })
      const expectedPoint = calcExpectedPoint(items)

      const userId = req.user?.id || null

      // 부모 생성
      const donation = await Donation.create(
         {
            donorName,
            donorPhone,
            donorEmail: donorEmail || null,
            zipcode,
            address1,
            address2: address2 || null,
            pickupDate,
            memo: memo || null,
            status: 'REQUESTED',
            agreePolicy: !!agreePolicy,
            count,
            expectedPoint,
            receiptUrl: null,
            userId,
         },
         { transaction: t }
      )

      // 자식 품목 생성
      const rows = items.map((it) => ({
         category: String(it.category || 'ETC').toUpperCase(),
         condition: String(it.condition || 'NORMAL').toUpperCase(),
         quantity: Math.max(1, Number(it.quantity || 1)),
         note: it.note || null,
         donationId: donation.id,
         // 레거시 호환 필드(선택)
         itemName: it.itemName || null,
         amount: it.amount ?? null,
      }))
      await DonationItem.bulkCreate(rows, { transaction: t })

      await t.commit()

      // include 하여 반환
      const created = await Donation.findByPk(donation.id, {
         include: [{ model: DonationItem, as: 'items' }],
      })
      return res.status(201).json({ ok: true, donation: created })
   } catch (err) {
      await t.rollback()
      next(err)
   }
})

/**
 * @swagger
 * /donations/mine:
 *   get:
 *     summary: 내 기부 목록 조회 (인증 필요)
 *     tags: [Donations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: size
 *         schema: { type: integer, minimum: 1, maximum: 50, default: 10 }
 *     responses:
 *       200:
 *         description: 조회 성공
 *       401:
 *         description: 미인증
 *       500:
 *         description: 서버 오류
 */
// [LIST] 내 기부 목록 (로그인 필요)
router.get('/mine', isLoggedIn, async (req, res, next) => {
   try {
      const page = Math.max(1, parseInt(req.query.page, 10) || 1)
      const size = Math.max(1, Math.min(50, parseInt(req.query.size, 10) || 10))
      const offset = (page - 1) * size

      const { rows, count } = await Donation.findAndCountAll({
         where: { userId: req.user.id },
         include: [{ model: DonationItem, as: 'items' }],
         order: [['createdAt', 'DESC']],
         limit: size,
         offset,
      })

      res.json({ ok: true, list: rows, page, size, total: count })
   } catch (err) {
      next(err)
   }
})

/**
 * @swagger
 * /donations/{id}:
 *   get:
 *     summary: 기부 신청 단건 조회
 *     tags: [Donations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: 조회 성공
 *       404:
 *         description: 존재하지 않음
 *       500:
 *         description: 서버 오류
 */
// [READ] 단건 조회 (로그인 불필요: 완료 페이지에서 바로 조회 가능)
router.get('/:id', async (req, res, next) => {
   try {
      const d = await Donation.findByPk(req.params.id, {
         include: [{ model: DonationItem, as: 'items' }],
      })
      if (!d) return res.status(404).json({ ok: false, message: 'NOT_FOUND' })
      return res.json({ ok: true, donation: d })
   } catch (err) {
      next(err)
   }
})

/**
 * @swagger
 * /donations/{id}/cancel:
 *   put:
 *     summary: 기부 신청 취소 (요청자 본인 + 상태가 REQUESTED일 때만)
 *     tags: [Donations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: 취소 성공
 *       400:
 *         description: 현재 상태에서 취소 불가
 *       401:
 *         description: 미인증
 *       403:
 *         description: 권한 없음
 *       404:
 *         description: 존재하지 않음
 *       500:
 *         description: 서버 오류
 */
// [CANCEL] 취소 (요청자만, 상태가 REQUESTED일 때만)
router.put('/:id/cancel', isLoggedIn, async (req, res, next) => {
   try {
      const d = await Donation.findByPk(req.params.id)
      if (!d) return res.status(404).json({ ok: false, message: 'NOT_FOUND' })
      if (d.userId !== req.user.id) return res.status(403).json({ ok: false, message: '권한이 없습니다.' })
      if (d.status !== 'REQUESTED') return res.status(400).json({ ok: false, message: '현재 상태에선 취소할 수 없습니다.' })

      d.status = 'CANCELLED' // ★ ENUM과 철자 일치
      await d.save()
      res.json({ ok: true, donation: d })
   } catch (err) {
      next(err)
   }
})

module.exports = router
