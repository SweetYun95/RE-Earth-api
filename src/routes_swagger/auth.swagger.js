// RE-Earth-api/src/routes_swagger/auth.swagger.js
const express = require('express')
const bcrypt = require('bcrypt')
const passport = require('passport')
const jwt = require('jsonwebtoken')
const { User } = require('../models')
const { isLoggedIn, isNotLoggedIn } = require('./middlewares')

const router = express.Router()

// ───────── helpers: 비번/휴대폰/검증 ─────────
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9])\S{8,}$/
const isValidPassword = (pw) => PASSWORD_REGEX.test(pw || '')

// userId 4~20, 영문/숫자만 (프론트와 동일 규칙 유지)
const USERID_REGEX = /^[A-Za-z0-9]{4,20}$/
// 닉네임 2~20, 공백 금지
const NICK_REGEX = /^\S{2,20}$/

// 010-1234-5678 형태로 정규화
const onlyDigits = (s) => String(s || '').replace(/\D/g, '')
const formatKrMobile = (raw) => {
   const d = onlyDigits(raw)
   if (!/^01[016789]\d{7,8}$/.test(d)) return null // 10~11자리 휴대폰만 허용
   if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`
   return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`
}

const signJwt = (user) => jwt.sign({ id: user.id, userId: user.userId, role: user.role, name: user.name }, process.env.JWT_SECRET, { expiresIn: '1h', issuer: 're-earth' })

/**
 * @swagger
 * tags:
 *   - name: Auth
 *     description: 인증/회원 관리 API (세션 + JWT 하이브리드)
 *
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   schemas:
 *     AuthUser:
 *       type: object
 *       properties:
 *         id: { type: integer, example: 1 }
 *         userId: { type: string, example: "sweet_yun" }
 *         name: { type: string, example: "윤달콤" }
 *         role: { type: string, enum: [ADMIN, USER], example: "USER" }
 *     AuthTokenResponse:
 *       type: object
 *       properties:
 *         token: { type: string, example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }
 *     AuthLoginResponse:
 *       type: object
 *       properties:
 *         success: { type: boolean, example: true }
 *         message: { type: string, example: "로그인 성공" }
 *         token: { type: string, example: "eyJhbGciOi..." }
 *         user:
 *           $ref: '#/components/schemas/AuthUser'
 *     JoinRequest:
 *       type: object
 *       required: [email, name, address, password]
 *       properties:
 *         email: { type: string, example: "yun@example.com" }
 *         name: { type: string, example: "윤달콤" }
 *         address: { type: string, example: "Seoul ..." }
 *         password: { type: string, example: "Abcd1234!" }
 *         userId: { type: string, example: "sweet_yun" }
 *         phoneNumber: { type: string, example: "010-1234-5678" }
 *         phone1: { type: string, example: "010" }
 *         phone2: { type: string, example: "1234" }
 *         phone3: { type: string, example: "5678" }
 *     JoinResponse:
 *       type: object
 *       properties:
 *         success: { type: boolean, example: true }
 *         message: { type: string, example: "사용자가 성공적으로 등록되었습니다." }
 *         user:
 *           type: object
 *           properties:
 *             id: { type: integer, example: 7 }
 *             userId: { type: string, example: "sweet_yun" }
 *             name: { type: string, example: "윤달콤" }
 *             role: { type: string, enum: [ADMIN, USER], example: "USER" }
 *     AvailabilityRequest:
 *       type: object
 *       properties:
 *         userId: { type: string, example: "sweet_yun" }
 *         name: { type: string, example: "윤달콤" }
 *         email: { type: string, example: "yun@example.com" }
 *     AvailabilityResponse:
 *       type: object
 *       properties:
 *         available: { type: boolean, example: true }
 *     StatusResponse:
 *       type: object
 *       properties:
 *         isAuthenticated: { type: boolean, example: true }
 *         user:
 *           $ref: '#/components/schemas/AuthUser'
 */

/**
 * @swagger
 * /auth/join:
 *   post:
 *     summary: 회원가입 (LOCAL)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/JoinRequest'
 *     responses:
 *       201:
 *         description: 가입 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/JoinResponse'
 *       400:
 *         description: 유효성 오류
 *       409:
 *         description: 이메일 또는 userId 중복
 *       500:
 *         description: 서버 오류
 */
// ───────── 회원가입 (local) ─────────
router.post('/join', isNotLoggedIn, async (req, res, next) => {
   try {
      let { email, name, address, password, userId, phoneNumber, phone1, phone2, phone3 } = req.body

      // 과거 마크업 호환: name="id"로 온 경우 지원
      if (!userId && typeof req.body.id === 'string') {
         userId = req.body.id
      }

      email = (email || '').trim().toLowerCase()
      name = (name || '').trim()
      address = (address || '').trim()
      userId = (userId || '').trim()

      if (!email || !name || !address || !password) {
         const err = new Error('필수 항목이 누락되었습니다. (email, name, address, password)')
         err.status = 400
         return next(err)
      }
      if (!isValidPassword(password)) {
         const err = new Error('비밀번호는 영문, 숫자, 특수문자를 각각 포함하여 8자 이상이어야 합니다.')
         err.status = 400
         return next(err)
      }

      const exUser = await User.findOne({ where: { email } })
      if (exUser) {
         const error = new Error('이미 존재하는 사용자입니다.')
         error.status = 409
         return next(error)
      }

      if (userId) {
         if (!USERID_REGEX.test(userId)) {
            const err = new Error('userId 형식이 올바르지 않습니다. (4~20자 영문/숫자)')
            err.status = 400
            return next(err)
         }
         const dupeId = await User.findOne({ where: { userId } })
         if (dupeId) {
            const err = new Error('이미 사용 중인 userId 입니다.')
            err.status = 409
            return next(err)
         }
      }

      const rawPhone = phoneNumber || [phone1, phone2, phone3].filter((v) => (v ?? '') !== '').join('-') || ''
      const normalizedPhone = rawPhone ? formatKrMobile(rawPhone) : null
      if (rawPhone && !normalizedPhone) {
         const err = new Error('휴대폰 번호 형식이 올바르지 않습니다.')
         err.status = 400
         return next(err)
      }

      const hash = await bcrypt.hash(password, 12)

      const newUser = await User.create({
         email,
         name,
         password: hash,
         role: 'USER',
         address,
         provider: 'LOCAL',
         phoneNumber: normalizedPhone,
         ...(userId ? { userId } : {}),
      })

      return res.status(201).json({
         success: true,
         message: '사용자가 성공적으로 등록되었습니다.',
         user: { id: newUser.id, userId: newUser.userId, name: newUser.name, role: newUser.role },
      })
   } catch (error) {
      error.status = error.status || 500
      error.message = error.message || '회원가입 중 오류가 발생했습니다.'
      return next(error)
   }
})

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: 로그인 (LOCAL)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [idOrEmail, password]
 *             properties:
 *               idOrEmail: { type: string, example: "sweet_yun" }
 *               password: { type: string, example: "Abcd1234!" }
 *     responses:
 *       200:
 *         description: 로그인 성공 (세션 생성 + JWT 발급)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthLoginResponse'
 *       401:
 *         description: 로그인 실패
 *       500:
 *         description: 서버 오류
 */
// ───────── 로그인 (local) ─────────
router.post('/login', isNotLoggedIn, (req, res, next) => {
   passport.authenticate('local', (authError, user, info) => {
      if (authError) {
         authError.status = 500
         authError.message = '인증 중 오류 발생'
         return next(authError)
      }
      if (!user) {
         const error = new Error(info?.message || '로그인 실패')
         error.status = 401
         return next(error)
      }
      req.login(user, (loginError) => {
         if (loginError) {
            loginError.status = 500
            loginError.message = '로그인 중 오류 발생'
            return next(loginError)
         }
         const token = signJwt(user)
         return res.json({
            success: true,
            message: '로그인 성공',
            token, // Authorization 헤더에 그대로 담아 보내세요 (Bearer 접두사 없이)
            user: { id: user.id, userId: user.userId, name: user.name, role: user.role },
         })
      })
   })(req, res, next)
})

/**
 * @swagger
 * /auth/login-admin:
 *   post:
 *     summary: 관리자 로그인 (LOCAL)
 *     description: 세션 생성 전에 role이 ADMIN인지 검증합니다.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [idOrEmail, password]
 *             properties:
 *               idOrEmail: { type: string, example: "admin" }
 *               password: { type: string, example: "Admin1234!" }
 *     responses:
 *       200:
 *         description: 관리자 로그인 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthLoginResponse'
 *       403:
 *         description: 관리자 권한 아님
 *       401:
 *         description: 로그인 실패
 *       500:
 *         description: 서버 오류
 */
// ───────── 관리자 로그인 (local / 세션 생성 전 role 검증) ─────────
router.post('/login-admin', isNotLoggedIn, (req, res, next) => {
   passport.authenticate('local', (authError, user, info) => {
      if (authError) {
         authError.status = 500
         authError.message = '인증 중 오류 발생'
         return next(authError)
      }
      if (!user) {
         const error = new Error(info?.message || '로그인 실패')
         error.status = 401
         return next(error)
      }

      // ★ 세션 만들기 전에 ADMIN 검증
      if (user.role !== 'ADMIN') {
         const error = new Error('관리자 권한이 없습니다.')
         error.status = 403
         return next(error) // req.login 호출 안 함 → 세션/토큰 생성 안 됨
      }

      req.login(user, (loginError) => {
         if (loginError) {
            loginError.status = 500
            loginError.message = '로그인 중 오류 발생'
            return next(loginError)
         }
         const token = signJwt(user)
         return res.json({
            success: true,
            message: '관리자 로그인 성공',
            token,
            user: { id: user.id, userId: user.userId, name: user.name, role: user.role },
         })
      })
   })(req, res, next)
})

/**
 * @swagger
 * /auth/token:
 *   post:
 *     summary: 세션 로그인 상태에서 JWT 재발급
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: 토큰 재발급 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthTokenResponse'
 *       401:
 *         description: 세션 미인증
 */
// ───────── 세션 로그인 상태에서 JWT 재발급 ─────────
router.post('/token', isLoggedIn, (req, res) => {
   const token = signJwt(req.user)
   return res.json({ token })
})

// ───────── 소셜 로그인 (구글/카카오) ─────────
const parseScopes = (s = '') =>
   s
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean)
const GOOGLE_SCOPES = parseScopes(process.env.GOOGLE_SCOPE || 'profile,email')
const KAKAO_SCOPES = parseScopes(process.env.KAKAO_SCOPE || 'profile_nickname,account_email')

/**
 * @swagger
 * /auth/google:
 *   get:
 *     summary: 구글 로그인 시작 (리다이렉트)
 *     tags: [Auth]
 *     responses:
 *       302:
 *         description: 구글 인증 페이지로 리다이렉트
 */
router.get('/google', passport.authenticate('google', { scope: GOOGLE_SCOPES }))

/**
 * @swagger
 * /auth/google/callback:
 *   get:
 *     summary: 구글 로그인 콜백
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: 구글 로그인 성공 (세션 + JWT)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthLoginResponse'
 *       401:
 *         description: 구글 로그인 실패
 *       500:
 *         description: 서버 오류
 */
router.get('/google/callback', (req, res, next) => {
   passport.authenticate('google', (err, user, info) => {
      if (err) {
         err.status = 500
         err.message = '구글 인증 중 오류 발생'
         return next(err)
      }
      if (!user) {
         const e = new Error(info?.message || '구글 로그인 실패')
         e.status = 401
         return next(e)
      }
      req.login(user, (loginError) => {
         if (loginError) {
            loginError.status = 500
            loginError.message = '구글 로그인 세션 처리 중 오류 발생'
            return next(loginError)
         }
         const token = signJwt(user)
         return res.json({
            success: true,
            message: '구글 로그인 성공',
            token,
            user: { id: user.id, userId: user.userId, name: user.name, role: user.role },
         })
      })
   })(req, res, next)
})

/**
 * @swagger
 * /auth/kakao:
 *   get:
 *     summary: 카카오 로그인 시작 (리다이렉트)
 *     tags: [Auth]
 *     responses:
 *       302:
 *         description: 카카오 인증 페이지로 리다이렉트
 */
router.get('/kakao', passport.authenticate('kakao', { scope: KAKAO_SCOPES }))

/**
 * @swagger
 * /auth/kakao/callback:
 *   get:
 *     summary: 카카오 로그인 콜백
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: 카카오 로그인 성공 (세션 + JWT)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthLoginResponse'
 *       401:
 *         description: 카카오 로그인 실패
 *       500:
 *         description: 서버 오류
 */
router.get('/kakao/callback', (req, res, next) => {
   passport.authenticate('kakao', (err, user, info) => {
      if (err) {
         err.status = 500
         err.message = '카카오 인증 중 오류 발생'
         return next(err)
      }
      if (!user) {
         const e = new Error(info?.message || '카카오 로그인 실패')
         e.status = 401
         return next(e)
      }
      req.login(user, (loginError) => {
         if (loginError) {
            loginError.status = 500
            loginError.message = '카카오 로그인 세션 처리 중 오류 발생'
            return next(loginError)
         }
         const token = signJwt(user)
         return res.json({
            success: true,
            message: '카카오 로그인 성공',
            token,
            user: { id: user.id, userId: user.userId, name: user.name, role: user.role },
         })
      })
   })(req, res, next)
})

/**
 * @swagger
 * /auth/check-username:
 *   post:
 *     summary: userId 중복 확인
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId]
 *             properties:
 *               userId: { type: string, example: "sweet_yun" }
 *     responses:
 *       200:
 *         description: 사용 가능 여부
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AvailabilityResponse'
 *       400:
 *         description: 형식 오류
 *       500:
 *         description: 서버 오류
 */
// ───────── 중복확인 API ─────────
router.post('/check-username', async (req, res, next) => {
   try {
      const userId = String(req.body.userId || '').trim()

      if (!userId || !USERID_REGEX.test(userId)) {
         const err = new Error('userId 형식이 올바르지 않습니다. (4~20자 영문/숫자)')
         err.status = 400
         return next(err)
      }
      const exists = await User.findOne({ where: { userId } })
      return res.json({ available: !exists })
   } catch (e) {
      e.status = 500
      e.message = '아이디 중복 확인 중 오류'
      return next(e)
   }
})

/**
 * @swagger
 * /auth/check-nickname:
 *   post:
 *     summary: 닉네임 중복 확인
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string, example: "윤달콤" }
 *     responses:
 *       200:
 *         description: 사용 가능 여부
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AvailabilityResponse'
 *       400:
 *         description: 형식 오류
 *       500:
 *         description: 서버 오류
 */
router.post('/check-nickname', async (req, res, next) => {
   try {
      const name = String(req.body.name || '').trim()
      if (!name || !NICK_REGEX.test(name)) {
         const err = new Error('닉네임 형식이 올바르지 않습니다. (공백 없는 2~20자)')
         err.status = 400
         return next(err)
      }
      const exists = await User.findOne({ where: { name } })
      return res.json({ available: !exists })
   } catch (e) {
      e.status = 500
      e.message = '닉네임 중복 확인 중 오류'
      return next(e)
   }
})

/**
 * @swagger
 * /auth/check-email:
 *   post:
 *     summary: 이메일 중복 확인
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, example: "yun@example.com" }
 *     responses:
 *       200:
 *         description: 사용 가능 여부
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AvailabilityResponse'
 *       400:
 *         description: 형식 오류
 *       500:
 *         description: 서버 오류
 */
router.post('/check-email', async (req, res, next) => {
   try {
      const email = String(req.body.email || '')
         .trim()
         .toLowerCase()
      if (!email) {
         const err = new Error('이메일을 입력하세요.')
         err.status = 400
         return next(err)
      }
      const exists = await User.findOne({ where: { email } })
      return res.json({ available: !exists })
   } catch (e) {
      e.status = 500
      e.message = '이메일 중복 확인 중 오류'
      return next(e)
   }
})

/**
 * @swagger
 * /auth/logout:
 *   get:
 *     summary: 로그아웃
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: 로그아웃 성공
 *       401:
 *         description: 미인증
 */
// ───────── 로그아웃/상태 ─────────
router.get('/logout', isLoggedIn, (req, res, next) => {
   req.logout((logoutError) => {
      if (logoutError) {
         logoutError.status = 500
         logoutError.message = '로그아웃 중 오류 발생'
         return next(logoutError)
      }
      return res.json({ success: true, message: '로그아웃에 성공했습니다.' })
   })
})

/**
 * @swagger
 * /auth/status:
 *   get:
 *     summary: 세션 로그인 상태 조회
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: 세션 상태 정보
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StatusResponse'
 */
router.get('/status', async (req, res, next) => {
   try {
      if (req.isAuthenticated?.() && req.user) {
         return res.status(200).json({
            isAuthenticated: true,
            user: { id: req.user.id, userId: req.user.userId, name: req.user.name, role: req.user.role },
         })
      }
      return res.status(200).json({ isAuthenticated: false })
   } catch (error) {
      error.status = 500
      error.message = '로그인 상태확인 중 오류가 발생했습니다.'
      return next(error)
   }
})

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: 현재 로그인 유저 정보
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: 유저 정보 또는 401
 *       401:
 *         description: 미인증
 */
// ✅ 로그인된 유저 정보를 반환 (새로고침 시 프론트 리덕스 초기화 → 여기로 복구)
router.get('/me', (req, res) => {
   if (req.isAuthenticated && req.isAuthenticated()) {
      const { id, userId, name, email, role } = req.user
      return res.json({ user: { id, userId, name, email, role } })
   }
   return res.status(401).json({ user: null })
})

module.exports = router
