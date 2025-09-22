// RE-Earth-api/src/routes/index.js
const express = require('express')
const router = express.Router()

// ───────── 퍼블릭(유저) 라우터
const authRouter = require('./auth') // /auth/*
const savingRouter = require('./saving') // /saving/*
const donationRouter = require('./donation') // /donations/*
const itemRouter = require('./item') // /item/*
const pointOrderRouter = require('./pointorder') // /pointOrder/*
const qnaRouter = require('./qna')              // /qna/*

// ───────── 관리자 라우터(집결지)
const adminRouter = require('./admin') // /api/admin/*

// ───────── 헬스체크 & 루트
router.get('/health', (req, res) => res.json({ ok: true }))
router.get('/', (req, res) => res.json({ ok: true, root: true }))

// ───────── 퍼블릭(유저) 라우터
router.use('/auth', authRouter)
router.use('/saving', savingRouter)
router.use('/donations', donationRouter)
router.use('/item', itemRouter)
router.use('/pointOrder', pointOrderRouter)
router.use('/qna', qnaRouter)

// ───────── 관리자 라우터
router.use('/api/admin', adminRouter)

module.exports = router
