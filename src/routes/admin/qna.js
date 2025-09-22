// RE-Earth-api/src/routes/admin/qna.js
const express = require('express')
const router = express.Router()
const { isLoggedIn, isAdmin } = require('../middlewares')
const ctrl = require('../../controllers/qnaController')

// ---------------------------------------------
// 관리자 QnA 엔드포인트 (/api/admin/qna/*)
// ---------------------------------------------

// 공통 가드: 관리자만 접근 가능
router.use(isLoggedIn, isAdmin)

// 전체 목록 조회 (페이징 지원)
// GET /api/admin/qna?status=OPEN&page=1&size=20
router.get('/', ctrl.adminList)

// 답변 등록
// POST /api/admin/qna/:id/answer
// body: { body: "답변 내용" }
router.post('/:id(\\d+)/answer', ctrl.adminAnswer)

// 상태 변경 (OPEN / ANSWERED / CLOSED)
// PATCH /api/admin/qna/:id/status
// body: { status: "CLOSED" }
router.patch('/:id(\\d+)/status', ctrl.adminUpdateStatus)

module.exports = router
