// RE-Earth-api/src/routes_swagger/admin/qna.swagger.js
const express = require('express')
const router = express.Router()
const { isLoggedIn, isAdmin } = require('../../routes/middlewares')
const ctrl = require('../../controllers/qnaController')

/**
 * @swagger
 * tags:
 *   name: Admin/QnA
 *   description: 관리자 전용 QnA 관리 API
 */

/**
 * @swagger
 * /api/admin/qna:
 *   get:
 *     summary: 전체 QnA 목록 조회
 *     description: 페이징과 상태 필터링이 가능한 관리자 전용 QnA 목록 조회 API
 *     tags: [Admin/QnA]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [OPEN, ANSWERED, CLOSED]
 *         description: QnA 상태 필터
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: size
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: QnA 목록
 */

/**
 * @swagger
 * /api/admin/qna/{id}/answer:
 *   post:
 *     summary: QnA 답변 등록
 *     tags: [Admin/QnA]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: QnA ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               body:
 *                 type: string
 *                 example: "관리자가 작성한 답변 내용"
 *     responses:
 *       201:
 *         description: 답변 등록 성공
 */

/**
 * @swagger
 * /api/admin/qna/{id}/status:
 *   patch:
 *     summary: QnA 상태 변경
 *     tags: [Admin/QnA]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: QnA ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [OPEN, ANSWERED, CLOSED]
 *                 example: "CLOSED"
 *     responses:
 *       200:
 *         description: 상태 변경 성공
 */

// 공통 가드: 관리자만 접근 가능
router.use(isLoggedIn, isAdmin)

router.get('/', ctrl.adminList)
router.post('/:id(\\d+)/answer', ctrl.adminAnswer)
router.patch('/:id(\\d+)/status', ctrl.adminUpdateStatus)

module.exports = router
