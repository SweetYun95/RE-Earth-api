// RE-Earth-api/src/routes/admin/index.js
const express = require('express')
const router = express.Router()
const { isLoggedIn, isAdmin } = require('../middlewares')

// 공통 가드
router.use(isLoggedIn, isAdmin)

// 하위 라우터 연결
router.use('/', require('./user'))
router.use('/donations', require('./donation'))
// router.use('/items', require('./item'))
router.use('/qna', require('./qna'))

module.exports = router
