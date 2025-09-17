// RE-Earth-api/src/routes/auth.js
const express = require('express')
const bcrypt = require('bcrypt')
const passport = require('passport')
const User = require('../models/user')

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

// ───────── 회원가입 (local) — ★ userId 보존 패치 (모델 무수정) ─────────
router.post('/join', async (req, res, next) => {
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

      // 이메일 중복 검사
      const exUser = await User.findOne({ where: { email } })
      if (exUser) {
         const error = new Error('이미 존재하는 사용자입니다.')
         error.status = 409
         return next(error)
      }

      // ✅ 입력된 userId가 있으면 그대로 보존 (모델 훅 미수정)
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

      // 휴대폰 조립/정규화 (phoneNumber 단일값 또는 phone1-3)
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
         ...(userId ? { userId } : {}), // ← 중요: 입력된 userId 있으면 그대로 저장
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

// ───────── 로그인 (local) ─────────
router.post('/login', async (req, res, next) => {
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
         return res.json({ success: true, message: '로그인 성공', user: { id: user.id, name: user.name, role: user.role } })
      })
   })(req, res, next)
})

// ───────── 소셜 로그인 (구글/카카오) ─────────
const parseScopes = (s = '') =>
   s
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean)
const GOOGLE_SCOPES = parseScopes(process.env.GOOGLE_SCOPE || 'profile,email')
const KAKAO_SCOPES = parseScopes(process.env.KAKAO_SCOPE || 'profile_nickname,account_email')

router.get('/google', passport.authenticate('google', { scope: GOOGLE_SCOPES }))
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
         return res.json({ success: true, message: '구글 로그인 성공', user: { id: user.id, name: user.name, role: user.role } })
      })
   })(req, res, next)
})

router.get('/kakao', passport.authenticate('kakao', { scope: KAKAO_SCOPES }))
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
         return res.json({ success: true, message: '카카오 로그인 성공', user: { id: user.id, name: user.name, role: user.role } })
      })
   })(req, res, next)
})

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

// ───────── 로그아웃/상태 ─────────
router.get('/logout', async (req, res, next) => {
   req.logout((logoutError) => {
      if (logoutError) {
         logoutError.status = 500
         logoutError.message = '로그아웃 중 오류 발생'
         return next(logoutError)
      }
      return res.json({ success: true, message: '로그아웃에 성공했습니다.' })
   })
})

router.get('/status', async (req, res, next) => {
   try {
      if (req.isAuthenticated?.() && req.user) {
         return res.status(200).json({ isAuthenticated: true, user: { id: req.user.id, name: req.user.name, role: req.user.role } })
      }
      return res.status(200).json({ isAuthenticated: false })
   } catch (error) {
      error.status = 500
      error.message = '로그인 상태확인 중 오류가 발생했습니다.'
      return next(error)
   }
})

module.exports = router
