// RE-Earth-api/src/routes_swagger/qna.swagger.js
const express = require('express')
const router = express.Router()

const { isLoggedIn } = require('./middlewares')
const ctrl = require('../controllers/qnaController')

/**
 * @swagger
 * tags:
 *   - name: QnA
 *     description: 사용자 문의(QnA) 작성/조회/삭제
 *
 * components:
 *   securitySchemes:
 *     cookieAuth:
 *       type: apiKey
 *       in: cookie
 *       name: connect.sid
 *
 *   schemas:
 *     QnaCreateRequest:
 *       type: object
 *       required: [title, content]
 *       properties:
 *         title:
 *           type: string
 *           example: "배송 문의드립니다"
 *         content:
 *           type: string
 *           example: "주문번호 1234의 배송 예정일이 궁금합니다."
 *         category:
 *           type: string
 *           description: "카테고리(선택)"
 *           example: "DELIVERY"
 *         images:
 *           type: array
 *           description: "이미지 URL 배열(선택)"
 *           items:
 *             type: string
 *             format: uri
 *           example: ["https://cdn.example.com/qna/abc.png"]
 *
 *     QnaListItem:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 101
 *         title:
 *           type: string
 *           example: "환불 처리 관련 문의"
 *         status:
 *           type: string
 *           description: "문의 상태"
 *           example: "PENDING"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2025-09-20T12:34:56.000Z"
 *
 *     QnaDetail:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 101
 *         userId:
 *           type: integer
 *           example: 42
 *         title:
 *           type: string
 *           example: "환불 처리 관련 문의"
 *         content:
 *           type: string
 *           example: "환불이 언제 완료되는지 알고 싶습니다."
 *         category:
 *           type: string
 *           example: "REFUND"
 *         status:
 *           type: string
 *           example: "ANSWERED"
 *         images:
 *           type: array
 *           items:
 *             type: string
 *             format: uri
 *           example: ["https://cdn.example.com/qna/101-1.png"]
 *         answers:
 *           type: array
 *           description: "관리자 답변 목록(있을 수 있음)"
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: integer
 *                 example: 7
 *               adminId:
 *                 type: integer
 *                 example: 1
 *               content:
 *                 type: string
 *                 example: "환불은 영업일 기준 3~5일 소요됩니다."
 *               createdAt:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-09-21T08:20:00.000Z"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2025-09-20T12:34:56.000Z"
 *
 *     CreateQnaResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         qna:
 *           $ref: '#/components/schemas/QnaDetail'
 *
 *     QnaListResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/QnaListItem'
 *
 *     DeleteResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: "오류 메시지"
 */

/**
 * @swagger
 * /qna:
 *   post:
 *     summary: 문의 등록
 *     description: 로그인 사용자가 새로운 QnA를 등록합니다.
 *     tags: [QnA]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/QnaCreateRequest'
 *     responses:
 *       201:
 *         description: 등록 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CreateQnaResponse'
 *       400:
 *         description: 유효성 오류
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: 인증 필요(로그인하지 않음)
 *       500:
 *         description: 서버 오류
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// 문의 등록
// POST /qna
router.post('/', isLoggedIn, ctrl.createQna)

/**
 * @swagger
 * /qna/me:
 *   get:
 *     summary: 내 문의 목록
 *     description: 로그인 사용자의 QnA 목록을 반환합니다.
 *     tags: [QnA]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/QnaListResponse'
 *       401:
 *         description: 인증 필요
 *       500:
 *         description: 서버 오류
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// 내 문의 목록
// GET /qna/me
router.get('/me', isLoggedIn, ctrl.getMyQnas)

/**
 * @swagger
 * /qna/{id}:
 *   get:
 *     summary: 문의 상세
 *     description: 본인 혹은 관리자만 접근 가능합니다.
 *     tags: [QnA]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: QnA ID
 *     responses:
 *       200:
 *         description: 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/QnaDetail'
 *       401:
 *         description: 인증 필요
 *       403:
 *         description: 권한 없음(타 사용자 접근 차단)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: 존재하지 않는 QnA
 *       500:
 *         description: 서버 오류
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// 문의 상세 (본인 or 관리자 접근 허용은 컨트롤러에서 검증)
// GET /qna/:id
router.get('/:id(\\d+)', isLoggedIn, ctrl.getDetail)

/**
 * @swagger
 * /qna/{id}:
 *   delete:
 *     summary: 문의 삭제
 *     description: 본인 또는 관리자만 삭제할 수 있습니다.
 *     tags: [QnA]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: QnA ID
 *     responses:
 *       200:
 *         description: 삭제 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DeleteResponse'
 *       401:
 *         description: 인증 필요
 *       403:
 *         description: 권한 없음
 *       404:
 *         description: 존재하지 않는 QnA
 *       500:
 *         description: 서버 오류
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// 문의 삭제 (본인 or 관리자)
// DELETE /qna/:id
router.delete('/:id(\\d+)', isLoggedIn, ctrl.remove)

module.exports = router
