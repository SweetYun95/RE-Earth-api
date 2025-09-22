// RE-Earth-api/src/routes/qna.js
const express = require('express')
const router = express.Router()

const { isLoggedIn } = require('./middlewares')
const ctrl = require('../controllers/qnaController')

// ---------------------------------------------
// 유저용 QnA 엔드포인트
// ---------------------------------------------

// 문의 등록
// POST /qna
router.post('/', isLoggedIn, ctrl.createQna)

// 내 문의 목록
// GET /qna/me
router.get('/me', isLoggedIn, ctrl.getMyQnas)

// 문의 상세 (본인 or 관리자 접근 허용은 컨트롤러에서 검증)
// GET /qna/:id
router.get('/:id(\\d+)', isLoggedIn, ctrl.getDetail)

// 문의 삭제 (본인 or 관리자)
// DELETE /qna/:id
router.delete('/:id(\\d+)', isLoggedIn, ctrl.remove)

module.exports = router
