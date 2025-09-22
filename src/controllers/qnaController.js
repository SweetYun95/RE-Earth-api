// RE-Earth-api/src/controllers/qnaController.js
const { Qna, QnaComment, User } = require('../models')
const { getAuthUserId } = require('../routes/middlewares')

/** 유저 id 가져오기 (세션 or 토큰 호환) */
function getUserId(req) {
   return getAuthUserId(req)
}

/** QNA 생성 (USER) */
exports.createQna = async (req, res, next) => {
   try {
      const userId = getUserId(req)
      const { title, question } = req.body
      if (!title?.trim() || !question?.trim()) {
         const err = new Error('제목과 내용을 입력해 주세요.')
         err.status = 400
         throw err
      }
      const q = await Qna.create({ title: title.trim(), question: question.trim(), userId })
      res.status(201).json(q)
   } catch (e) {
      next(e)
   }
}

/** 내 QNA 목록 (USER) */
exports.getMyQnas = async (req, res, next) => {
   try {
      const userId = getUserId(req)
      const rows = await Qna.findAll({
         where: { userId },
         order: [['createdAt', 'DESC']],
         attributes: ['id', 'title', 'status', 'createdAt', 'updatedAt'],
      })
      res.json(rows)
   } catch (e) {
      next(e)
   }
}

/** QNA 상세 (본인 또는 관리자) */
exports.getDetail = async (req, res, next) => {
   try {
      const id = Number(req.params.id)
      const userId = getUserId(req)
      const me = req.user || req.authUser

      const qna = await Qna.findByPk(id, {
         include: [
            { model: QnaComment, include: [{ model: User, as: 'Admin', attributes: ['id', 'name', 'userId', 'role'] }] },
            { model: User, attributes: ['id', 'name', 'userId', 'role'] },
         ],
      })
      if (!qna) {
         const err = new Error('해당 문의를 찾을 수 없습니다.')
         err.status = 404
         throw err
      }
      const isOwner = qna.userId === userId
      const isAdmin = me?.role === 'ADMIN'
      if (!isOwner && !isAdmin) {
         const err = new Error('열람 권한이 없습니다.')
         err.status = 403
         throw err
      }
      res.json(qna)
   } catch (e) {
      next(e)
   }
}

/** QNA 삭제 (본인 또는 관리자) */
exports.remove = async (req, res, next) => {
   try {
      const id = Number(req.params.id)
      const userId = getUserId(req)
      const me = req.user || req.authUser

      const qna = await Qna.findByPk(id)
      if (!qna) {
         const err = new Error('이미 삭제되었거나 존재하지 않습니다.')
         err.status = 404
         throw err
      }
      const isOwner = qna.userId === userId
      const isAdmin = me?.role === 'ADMIN'
      if (!isOwner && !isAdmin) {
         const err = new Error('삭제 권한이 없습니다.')
         err.status = 403
         throw err
      }
      await qna.destroy()
      res.json({ ok: true })
   } catch (e) {
      next(e)
   }
}

/** (ADMIN) 전체 목록 조회 */
exports.adminList = async (req, res, next) => {
   try {
      const page = Math.max(1, Number(req.query.page) || 1)
      const size = Math.min(100, Math.max(1, Number(req.query.size) || 20))
      const offset = (page - 1) * size
      const status = req.query.status

      const where = {}
      if (status) where.status = status

      const { rows, count } = await Qna.findAndCountAll({
         where,
         include: [{ model: User, attributes: ['id', 'name', 'userId', 'email'] }],
         order: [['createdAt', 'DESC']],
         offset,
         limit: size,
      })

      res.json({ items: rows, page, size, total: count })
   } catch (e) {
      next(e)
   }
}

/** (ADMIN) 답변 작성 */
exports.adminAnswer = async (req, res, next) => {
   try {
      const adminId = getUserId(req)
      const { id } = req.params
      const { body } = req.body
      if (!body?.trim()) {
         const err = new Error('답변 내용을 입력하세요.')
         err.status = 400
         throw err
      }
      const qna = await Qna.findByPk(id)
      if (!qna) {
         const err = new Error('문의가 존재하지 않습니다.')
         err.status = 404
         throw err
      }
      const comment = await QnaComment.create({ qnaId: qna.id, adminId, body: body.trim() })
      if (qna.status === 'OPEN') {
         qna.status = 'ANSWERED'
         await qna.save()
      }
      res.status(201).json(comment)
   } catch (e) {
      next(e)
   }
}

/** (ADMIN) 상태 변경 */
exports.adminUpdateStatus = async (req, res, next) => {
   try {
      const { id } = req.params
      const { status } = req.body
      if (!['OPEN', 'ANSWERED', 'CLOSED'].includes(status)) {
         const err = new Error('유효하지 않은 상태값입니다.')
         err.status = 400
         throw err
      }
      const qna = await Qna.findByPk(id)
      if (!qna) {
         const err = new Error('문의가 존재하지 않습니다.')
         err.status = 404
         throw err
      }
      qna.status = status
      await qna.save()
      res.json(qna)
   } catch (e) {
      next(e)
   }
}
