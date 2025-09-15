// RE-Earth-api/src/routes/auth.js
const express = require('express')
const bcrypt = require('bcrypt')
const passport = require('passport')
const User = require('../models/user')

const router = express.Router()

// ──────────────────────────────────────────────────────────────
// ENV Helpers
const parseScopes = (s = '') =>
   s
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean)
const GOOGLE_SCOPES = parseScopes(process.env.GOOGLE_SCOPE || 'profile,email')
const KAKAO_SCOPES = parseScopes(process.env.KAKAO_SCOPE || 'profile_nickname,account_email')

// 선택(리다이렉트 UX를 원할 때 사용)
const FRONTEND_URL = process.env.FRONTEND_APP_URL || process.env.CLIENT_URL

// ──────────────────────────────────────────────────────────────
// Validators
// 비밀번호: 영문 + 숫자 + 특수문자 각각 1개 이상, 길이 8자 이상 (공백 불가)
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9])\S{8,}$/
const isValidPassword = (pw) => PASSWORD_REGEX.test(pw || '')

// 아이디: 4~20자, 영문/숫자만
const USERID_REGEX = /^[A-Za-z0-9]{4,20}$/
const isValidUserId = (id) => USERID_REGEX.test((id || '').trim())

// 닉네임: 2~20자, 공백 금지 (간단 rule). 필요시 한글/특수문자 허용 규칙으로 교체 가능.
const NICK_REGEX = /^\S{2,20}$/
const isValidNick = (name) => NICK_REGEX.test((name || '').trim())

// ──────────────────────────────────────────────────────────────
// 회원가입 (local)
router.post('/join', async (req, res, next) => {
   try {
      let { userId, email, name, address, password } = req.body

      // 기본 유효성
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

      // (선택) 사용자가 아이디를 직접 입력하는 경우
      if (userId) {
         if (!isValidUserId(userId)) {
            const err = new Error('아이디는 4~20자의 영문/숫자만 가능합니다.')
            err.status = 400
            return next(err)
         }
         const idDup = await User.findOne({ where: { userId } })
         if (idDup) {
            const err = new Error('이미 사용 중인 아이디입니다.')
            err.status = 409
            return next(err)
         }
      }

      // 닉네임(=name) 중복 정책: UI에서 중복확인 버튼이 있으므로 여기서도 검사
      // DB 레벨 고정이 필요하면 User.name에 unique 인덱스를 추가하세요.
      const nameDup = await User.findOne({ where: { name } })
      if (nameDup) {
         const err = new Error('이미 사용 중인 닉네임입니다.')
         err.status = 409
         return next(err)
      }

      // 이메일 중복 검사
      const exUser = await User.findOne({ where: { email } })
      if (exUser) {
         const error = new Error('이미 존재하는 사용자입니다.')
         error.status = 409 // Conflict
         return next(error)
      }

      // 비밀번호 해시
      const hash = await bcrypt.hash(password, 12)

      // 사용자 생성 (provider: LOCAL — ENUM 대문자 규격)
      const newUser = await User.create({
         userId: userId || undefined, // 미입력 시 hooks에서 이메일 기반 자동 생성
         email,
         name,
         password: hash,
         role: 'USER',
         address,
         provider: 'LOCAL',
      })

      return res.status(201).json({
         success: true,
         message: '사용자가 성공적으로 등록되었습니다.',
         user: { id: newUser.id, name: newUser.name, role: newUser.role },
      })
   } catch (error) {
      error.status = error.status || 500
      error.message = error.message || '회원가입 중 오류가 발생했습니다.'
      return next(error)
   }
})

// ──────────────────────────────────────────────────────────────
// 중복확인: 아이디
router.post('/check-username', async (req, res, next) => {
   try {
      const userId = (req.body.userId || '').trim()
      if (!userId) return res.status(400).json({ ok: false, field: 'userId', message: '아이디가 없습니다.' })
      if (!isValidUserId(userId)) return res.status(400).json({ ok: false, field: 'userId', message: '아이디는 4~20자의 영문/숫자만 가능합니다.' })

      const exists = await User.findOne({ where: { userId } })
      return res.json({ ok: true, field: 'userId', value: userId, available: !exists })
   } catch (err) {
      err.status = 500
      err.message = '아이디 중복 확인 중 오류가 발생했습니다.'
      return next(err)
   }
})

// 중복확인: 닉네임(name)
router.post('/check-nickname', async (req, res, next) => {
   try {
      const name = (req.body.name || '').trim()
      if (!name) return res.status(400).json({ ok: false, field: 'name', message: '닉네임이 없습니다.' })
      if (!isValidNick(name)) return res.status(400).json({ ok: false, field: 'name', message: '닉네임은 공백 없이 2~20자여야 합니다.' })

      const exists = await User.findOne({ where: { name } })
      return res.json({ ok: true, field: 'name', value: name, available: !exists })
   } catch (err) {
      err.status = 500
      err.message = '닉네임 중복 확인 중 오류가 발생했습니다.'
      return next(err)
   }
})

// 중복확인: 이메일
router.post('/check-email', async (req, res, next) => {
   try {
      const raw = (req.body.email || '').trim()
      const email = raw.toLowerCase()
      if (!email) return res.status(400).json({ ok: false, field: 'email', message: '이메일이 없습니다.' })

      const exists = await User.findOne({ where: { email } })
      return res.json({ ok: true, field: 'email', value: email, available: !exists })
   } catch (err) {
      err.status = 500
      err.message = '이메일 중복 확인 중 오류가 발생했습니다.'
      return next(err)
   }
})

// ──────────────────────────────────────────────────────────────
// 로그인 (local)
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

// ──────────────────────────────────────────────────────────────
// 소셜 로그인: Google
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
         // return res.redirect(`${FRONTEND_URL || ''}/auth/callback?ok=1&provider=google`)
      })
   })(req, res, next)
})

// 소셜 로그인: Kakao
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
         // return res.redirect(`${FRONTEND_URL || ''}/auth/callback?ok=1&provider=kakao`)
      })
   })(req, res, next)
})

// ──────────────────────────────────────────────────────────────
// 로그아웃
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

// 로그인 상태확인
router.get('/status', async (req, res, next) => {
   try {
      if (req.isAuthenticated?.() && req.user) {
         return res.status(200).json({
            isAuthenticated: true,
            user: { id: req.user.id, name: req.user.name, role: req.user.role },
         })
      }
      return res.status(200).json({ isAuthenticated: false })
   } catch (error) {
      error.status = 500
      error.message = '로그인 상태확인 중 오류가 발생했습니다.'
      return next(error)
   }
})

module.exports = router
