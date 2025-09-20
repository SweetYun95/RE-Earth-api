// RE-Earth-api/src/routes/admin/user.js
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
 * GET /api/admin/members
 * 쿼리:
 *  - page, size           : 페이지네이션 (기본 1, 20)
 *  - sort, order          : 정렬 필드/방향 (기본 createdAt / DESC)
 *  - userId, name, email  : 부분검색
 *  - joinedFrom, joinedTo : 가입일 범위 (YYYY-MM-DD)
 *  - minPoint, maxPoint   : 포인트 합계 필터(옵션) – 필요 시 활성화
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
      // 기본 응답에 pointTotal 포함. min/maxPoint로 필터 가능.
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
 * GET /api/admin/members/stats
 * - totalUsers: 전체 회원 수
 * - byRole: { ADMIN, USER }
 * - newUsers7d: 최근 7일 신규 가입자 수
 * - signupsByDay: 최근 7일(또는 14일) 일자별 가입 수
 * - recentMembers: 최신 가입자 6명
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
 * GET /api/admin/members/:id  — 단건 조회
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
 * PUT /api/admin/members/:id  — 기본 정보 수정
 * body: { name?, address?, phoneNumber?, role?('ADMIN'|'USER') }
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
 * DELETE /api/admin/members  — 일괄 삭제
 * body: { ids: number[] }
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
