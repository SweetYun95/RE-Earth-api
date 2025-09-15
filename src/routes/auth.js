// RE-Earth-api/src/routes/auth.js
const express = require('express')
const bcrypt = require('bcrypt')
const passport = require('passport')
const User = require('../models/user')

const router = express.Router()

// ───────── helpers: 비번/휴대폰 ─────────
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9])\S{8,}$/
const isValidPassword = (pw) => PASSWORD_REGEX.test(pw || '')

// 010-1234-5678 형태로 정규화
const onlyDigits = (s) => String(s || '').replace(/\D/g, '')
const formatKrMobile = (raw) => {
   const d = onlyDigits(raw)
   // 10~11자리의 휴대폰(01[016789])만 허용
   if (!/^01[016789]\d{7,8}$/.test(d)) return null
   // 11자리: 3-4-4, 10자리: 3-3-4
   if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`
   return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`
}

// ───────── 회원가입 (local) ─────────
router.post('/join', async (req, res, next) => {
   try {
      let { email, name, address, password, phoneNumber, phone1, phone2, phone3 } = req.body

      email = (email || '').trim().toLowerCase()
      name = (name || '').trim()
      address = (address || '').trim()

      // 필수값 체크
      if (!email || !name || !address || !password) {
         const err = new Error('필수 항목이 누락되었습니다. (email, name, address, password)')
         err.status = 400
         return next(err)
      }

      // 비밀번호 정책
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

      // 휴대폰 조립/정규화 (phoneNumber 단일값 또는 phone1-3 조합 둘 다 지원)
      const rawPhone = phoneNumber || [phone1, phone2, phone3].filter((v) => (v ?? '') !== '').join('-') || ''
      const normalizedPhone = rawPhone ? formatKrMobile(rawPhone) : null
      if (rawPhone && !normalizedPhone) {
         const err = new Error('휴대폰 번호 형식이 올바르지 않습니다.')
         err.status = 400
         return next(err)
      }

      // 비밀번호 해시
      const hash = await bcrypt.hash(password, 12)

      // 사용자 생성
      const newUser = await User.create({
         email,
         name,
         password: hash,
         role: 'USER',
         address,
         provider: 'LOCAL', // 모델 ENUM 대문자
         phoneNumber: normalizedPhone, // 정규화된 휴대폰 저장(선택)
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

module.exports = router
