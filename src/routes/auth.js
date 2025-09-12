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
// Password policy: 영문 + 숫자 + 특수문자 각각 1개 이상, 길이 8자 이상 (공백 불가)
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9])\S{8,}$/
const isValidPassword = (pw) => PASSWORD_REGEX.test(pw || '')

// ──────────────────────────────────────────────────────────────
// 회원가입 (local)
router.post('/join', async (req, res, next) => {
   try {
      let { email, name, address, password } = req.body

      // 기본 유효성
      email = (email || '').trim().toLowerCase()
      name = (name || '').trim()
      address = (address || '').trim()

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
         error.status = 409 // Conflict
         return next(error)
      }

      // 비밀번호 해시
      const hash = await bcrypt.hash(password, 12)

      // 사용자 생성 (provider: local)
      const newUser = await User.create({
         email,
         name,
         password: hash,
         role: 'USER',
         address,
         provider: 'local',
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

         return res.json({
            success: true,
            message: '로그인 성공',
            user: { id: user.id, name: user.name, role: user.role },
         })
      })
   })(req, res, next)
})

// ──────────────────────────────────────────────────────────────
// 소셜 로그인: Google (scopes from .env)
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
         // JSON 응답 방식
         return res.json({ success: true, message: '구글 로그인 성공', user: { id: user.id, name: user.name, role: user.role } })
         // 리다이렉트 UX를 원하면 아래 주석 해제
         // return res.redirect(`${FRONTEND_URL || ''}/auth/callback?ok=1&provider=google`)
      })
   })(req, res, next)
})

// ──────────────────────────────────────────────────────────────
// 소셜 로그인: Kakao (scopes from .env)
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
         // JSON 응답 방식
         return res.json({ success: true, message: '카카오 로그인 성공', user: { id: user.id, name: user.name, role: user.role } })
         // 리다이렉트 UX를 원하면 아래 주석 해제
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
