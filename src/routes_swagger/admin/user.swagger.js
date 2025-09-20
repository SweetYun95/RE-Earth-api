// RE-Earth-api/src/routes_swagger/admin/user.swagger.js
const express = require('express')
const { Op, fn, col, literal } = require('sequelize')
const { User, Point } = require('../../models')
const { verifyToken, isAdmin } = require('../middlewares')

const router = express.Router()

/**
 * 유틸: 안전한 Like 검색
 */
const like = (v) => ({ [Op.like]: `%${String(v).trim()}%` })

/**
 * @swagger
 * tags:
 *   name: AdminMembers
 *   description: 관리자 회원 관리 API
 *
 * components:
 *   schemas:
 *     AdminMember:
 *       type: object
 *       properties:
 *         id: { type: integer, example: 12 }
 *         userId: { type: string, example: "sweet_yun" }
 *         name: { type: string, example: "윤달콤" }
 *         email: { type: string, example: "yun@example.com" }
 *         role: { type: string, enum: [ADMIN, USER], example: "USER" }
 *         address: { type: string, nullable: true, example: "Seoul ..." }
 *         phoneNumber: { type: string, nullable: true, example: "010-1234-5678" }
 *         createdAt: { type: string, format: date-time }
 *         updatedAt: { type: string, format: date-time }
 *         pointTotal: { type: number, example: 1500 }
 *         status: { type: string, example: "활성" }
 *     AdminMemberListResponse:
 *       type: object
 *       properties:
 *         page: { type: integer, example: 1 }
 *         size: { type: integer, example: 20 }
 *         total: { type: integer, example: 123 }
 *         totalPages: { type: integer, example: 7 }
 *         list:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/AdminMember'
 *     AdminMemberStatsResponse:
 *       type: object
 *       properties:
 *         totalUsers: { type: integer, example: 421 }
 *         byRole:
 *           type: object
 *           properties:
 *             ADMIN: { type: integer, example: 3 }
 *             USER: { type: integer, example: 418 }
 *         newUsers7d: { type: integer, example: 27 }
 *         signupsByDay:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               date: { type: string, example: "2025-09-14" }
 *               count: { type: integer, example: 5 }
 *         recentMembers:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id: { type: integer, example: 25 }
 *               userId: { type: string, example: "neo" }
 *               name: { type: string, example: "네오" }
 *               email: { type: string, example: "neo@example.com" }
 *               role: { type: string, enum: [ADMIN, USER], example: "USER" }
 *               createdAt: { type: string, format: date-time }
 */

/**
 * @swagger
 * /api/admin/members:
 *   get:
 *     summary: 회원 목록 조회
 *     description: 상태(역할), 검색어, 날짜 범위, 포인트 합계 등으로 회원 목록을 페이지네이션하여 조회합니다.
 *     tags: [AdminMembers]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *         description: 페이지 번호
 *       - in: query
 *         name: size
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *         description: 페이지 크기
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [id, userId, name, email, createdAt, updatedAt, pointTotal]
 *           default: createdAt
 *         description: 정렬 필드
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *           default: DESC
 *         description: 정렬 방향
 *       - in: query
 *         name: userId
 *         schema: { type: string }
 *         description: userId 부분검색
 *       - in: query
 *         name: name
 *         schema: { type: string }
 *         description: 이름 부분검색
 *       - in: query
 *         name: email
 *         schema: { type: string }
 *         description: 이메일 부분검색
 *       - in: query
 *         name: joinedFrom
 *         schema: { type: string, format: date }
 *         description: 가입 시작일 (YYYY-MM-DD)
 *       - in: query
 *         name: joinedTo
 *         schema: { type: string, format: date }
 *         description: 가입 종료일 (YYYY-MM-DD)
 *       - in: query
 *         name: minPoint
 *         schema: { type: number }
 *         description: 포인트 합계 최소값
 *       - in: query
 *         name: maxPoint
 *         schema: { type: number }
 *         description: 포인트 합계 최대값
 *     responses:
 *       200:
 *         description: 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminMemberListResponse'
 *       500:
 *         description: 서버 오류
 */
router.get('/members', verifyToken, isAdmin, async (req, res, next) => {
   try {
      // ───────── 페이지네이션/정렬
      const page = Math.max(1, parseInt(req.query.page, 10) || 1)
      const size = Math.min(100, Math.max(1, parseInt(req.query.size, 10) || 20))
      const offset = (page - 1) * size

      const sort = ['id', 'userId', 'name', 'email', 'createdAt', 'updatedAt'].includes(req.query.sort) ? req.query.sort : 'createdAt'
      const order = String(req.query.order || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC'

      // ───────── 필터
      const where = {}
      if (req.query.userId) where.userId = like(req.query.userId)
      if (req.query.name) where.name = like(req.query.name)
      if (req.query.email) where.email = like(req.query.email)

      // 가입일 범위
      if (req.query.joinedFrom || req.query.joinedTo) {
         where.createdAt = {}
         if (req.query.joinedFrom) where.createdAt[Op.gte] = new Date(`${req.query.joinedFrom}T00:00:00.000Z`)
         if (req.query.joinedTo) where.createdAt[Op.lte] = new Date(`${req.query.joinedTo}T23:59:59.999Z`)
      }

      // ───────── 포인트 합계 (옵션 필터/정렬)
      const include = [
         {
            model: Point,
            attributes: [],
            required: false, // Left Join
         },
      ]

      const attributes = [
         'id',
         'userId',
         'name',
         'email',
         'role',
         'address',
         'phoneNumber',
         'createdAt',
         'updatedAt',
         // 누적 포인트 = SUM(Point.delta)
         [fn('COALESCE', fn('SUM', col('Points.delta')), 0), 'pointTotal'],
      ]

      // having 으로 포인트 범위 필터
      const having = {}
      const hasMin = req.query.minPoint !== undefined && req.query.minPoint !== ''
      const hasMax = req.query.maxPoint !== undefined && req.query.maxPoint !== ''
      if (hasMin || hasMax) {
         if (hasMin) having.pointTotal = { [Op.gte]: Number(req.query.minPoint || 0) }
         if (hasMax) {
            const maxV = Number(req.query.maxPoint)
            having.pointTotal = { ...(having.pointTotal || {}), [Op.lte]: isNaN(maxV) ? Number.MAX_SAFE_INTEGER : maxV }
         }
      }

      const { rows, count } = await User.findAndCountAll({
         where,
         include,
         attributes,
         group: ['User.id'],
         having: Object.keys(having).length ? having : undefined,
         order: [[sort === 'pointTotal' ? literal('pointTotal') : sort, order]],
         limit: size,
         offset,
         subQuery: false,
         distinct: true, // group by가 있어도 총계 보정
      })

      const list = rows.map((u) => ({
         id: u.id,
         userId: u.userId,
         name: u.name,
         email: u.email,
         role: u.role,
         address: u.address,
         phoneNumber: u.phoneNumber,
         createdAt: u.createdAt,
         pointTotal: Number(u.get('pointTotal') || 0),
         // TODO: 상태(status) 필드는 모델에 없으므로 추후 컬럼 추가 시 연결
         status: '활성',
      }))

      const total = Array.isArray(count) ? count.length : count
      const totalPages = Math.max(1, Math.ceil(total / size))

      return res.json({ page, size, total, totalPages, list })
   } catch (err) {
      err.status = err.status || 500
      err.message = err.message || '회원 목록 조회 중 오류'
      return next(err)
   }
})

/**
 * @swagger
 * /api/admin/members/stats:
 *   get:
 *     summary: 회원 통계 조회
 *     description: 전체 회원 수, 역할별 분포, 최근 7일 신규 가입자 수, 일자별 가입 수, 최신 가입자 목록을 반환합니다.
 *     tags: [AdminMembers]
 *     responses:
 *       200:
 *         description: 통계 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminMemberStatsResponse'
 *       500:
 *         description: 서버 오류
 */
router.get('/members/stats', verifyToken, isAdmin, async (req, res, next) => {
   try {
      const now = new Date()
      const from7d = new Date(now)
      from7d.setDate(from7d.getDate() - 6) // 오늘 포함 7일

      const [totalUsers, adminCount, userCount] = await Promise.all([User.count(), User.count({ where: { role: 'ADMIN' } }), User.count({ where: { role: 'USER' } })])

      const newUsers7d = await User.count({
         where: { createdAt: { [Op.gte]: from7d } },
      })

      const signupsByDayRaw = await User.findAll({
         attributes: [
            [fn('DATE', col('createdAt')), 'date'],
            [fn('COUNT', col('id')), 'count'],
         ],
         where: { createdAt: { [Op.between]: [from7d, now] } },
         group: [fn('DATE', col('createdAt'))],
         order: [[literal('date'), 'ASC']],
         raw: true,
      })

      const recentMembers = await User.findAll({
         attributes: ['id', 'userId', 'name', 'email', 'createdAt', 'role'],
         order: [['createdAt', 'DESC']],
         limit: 6,
      })

      res.json({
         totalUsers,
         byRole: { ADMIN: adminCount, USER: userCount },
         newUsers7d,
         signupsByDay: signupsByDayRaw.map((r) => ({
            date: r.date,
            count: Number(r.count),
         })),
         recentMembers,
      })
   } catch (err) {
      err.status = err.status || 500
      err.message = err.message || '대시보드 통계 조회 중 오류'
      return next(err)
   }
})

/**
 * @swagger
 * /api/admin/members/{id}:
 *   get:
 *     summary: 회원 단건 조회
 *     tags: [AdminMembers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: 회원 ID
 *     responses:
 *       200:
 *         description: 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminMember'
 *       404:
 *         description: 존재하지 않는 회원
 *       500:
 *         description: 서버 오류
 */
router.get('/members/:id', verifyToken, isAdmin, async (req, res, next) => {
   try {
      const user = await User.findByPk(req.params.id, {
         attributes: ['id', 'userId', 'name', 'email', 'role', 'address', 'phoneNumber', 'createdAt', 'updatedAt'],
      })
      if (!user) {
         const e = new Error('존재하지 않는 회원입니다.')
         e.status = 404
         throw e
      }
      // 포인트 합계
      const pointSum = await Point.sum('delta', { where: { userId: user.id } })
      return res.json({ ...user.toJSON(), pointTotal: Number(pointSum || 0), status: '활성' })
   } catch (err) {
      err.status = err.status || 500
      err.message = err.message || '회원 단건 조회 중 오류'
      return next(err)
   }
})

/**
 * @swagger
 * /api/admin/members/{id}:
 *   put:
 *     summary: 회원 기본 정보 수정
 *     tags: [AdminMembers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: 회원 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string, example: "윤달콤" }
 *               address: { type: string, example: "Seoul ..." }
 *               phoneNumber: { type: string, example: "010-1234-5678" }
 *               role:
 *                 type: string
 *                 enum: [ADMIN, USER]
 *                 example: USER
 *     responses:
 *       200:
 *         description: 수정 성공
 *       404:
 *         description: 존재하지 않는 회원
 *       500:
 *         description: 서버 오류
 */
router.put('/members/:id', verifyToken, isAdmin, async (req, res, next) => {
   try {
      const user = await User.findByPk(req.params.id)
      if (!user) {
         const e = new Error('존재하지 않는 회원입니다.')
         e.status = 404
         throw e
      }
      const payload = {}
      ;['name', 'address', 'phoneNumber', 'role'].forEach((k) => {
         if (req.body[k] !== undefined) payload[k] = req.body[k]
      })

      await user.update(payload)
      return res.json({ success: true, message: '수정 완료', user })
   } catch (err) {
      err.status = err.status || 500
      err.message = err.message || '회원 수정 중 오류'
      return next(err)
   }
})

/**
 * @swagger
 * /api/admin/members:
 *   delete:
 *     summary: 회원 일괄 삭제
 *     description: 주어진 ID 배열에 해당하는 회원들을 일괄 삭제합니다.
 *     tags: [AdminMembers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ids]
 *             properties:
 *               ids:
 *                 type: array
 *                 items: { type: integer }
 *                 example: [3, 7, 12]
 *     responses:
 *       200:
 *         description: 삭제 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 deleted: { type: integer, example: 3 }
 *       400:
 *         description: 잘못된 요청(삭제할 ID 없음)
 *       500:
 *         description: 서버 오류
 */
router.delete('/members', verifyToken, isAdmin, async (req, res, next) => {
   try {
      const ids = Array.isArray(req.body.ids) ? req.body.ids.map(Number).filter(Boolean) : []
      if (!ids.length) {
         const e = new Error('삭제할 회원 ID가 필요합니다.')
         e.status = 400
         throw e
      }
      const deleted = await User.destroy({ where: { id: { [Op.in]: ids } } })
      return res.json({ success: true, deleted })
   } catch (err) {
      err.status = err.status || 500
      err.message = err.message || '회원 일괄 삭제 중 오류'
      return next(err)
   }
})

module.exports = router
