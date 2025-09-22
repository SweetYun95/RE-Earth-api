// RE_Earth__project/RE-Earth-api/src/routes/middlewares.js
const jwt = require('jsonwebtoken')

/**
 * Bearer 토큰 문자열 파싱
 * ex) "Bearer eyJ..."  -> "eyJ..."
 */
function parseBearer(headerValue) {
   if (!headerValue || typeof headerValue !== 'string') return null
   const parts = headerValue.split(' ')
   if (parts.length === 2 && /^Bearer$/i.test(parts[0])) return parts[1]
   // "Bearer" 접두사 없이 토큰만 오는 케이스도 허용
   if (parts.length === 1 && parts[0].length > 20) return parts[0]
   return null
}

/**
 * 하이브리드 인증 수화기
 * - Authorization 헤더의 Bearer 토큰이 있으면 검증해 req.authUser에 주입
 * - 세션(Passport) 로그인은 기존대로 req.user에 존재
 * 이 미들웨어는 라우터 앞단(app.js)에서 전역으로 한 번만 붙여두면 좋음.
 */
exports.hydrateAuthFromToken = (req, res, next) => {
   try {
      const raw = req.headers.authorization || req.get('Authorization') || ''
      const token = parseBearer(raw)
      if (!token) return next()

      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      // 우리 프로젝트 JWT 페이로드는 { id, userId, role, ... } 형태라고 가정
      req.decoded = decoded
      // 세션 기반과 충돌하지 않도록 별도 필드에 보관
      req.authUser = {
         id: decoded.id,
         userId: decoded.userId,
         role: decoded.role,
         provider: decoded.provider,
         email: decoded.email,
      }
      return next()
   } catch (error) {
      // 토큰이 있긴 한데 잘못됐으면, 여기서 바로 막지 않고 다음으로 넘겨
      // isLoggedIn / verifyToken에서 최종 판단
      return next()
   }
}

/**
 * 내부 유틸: 현재 요청의 "인증된 사용자"를 통합적으로 얻는다.
 * - 우선순위: 세션(req.user) > 토큰(req.authUser)
 */
function getAuthUser(req) {
   if (req.isAuthenticated && req.isAuthenticated() && req.user) return req.user
   if (req.authUser) return req.authUser
   return null
}

/**
 * 로그인 상태 확인 (하이브리드)
 * - 세션 로그인 || 유효한 JWT 토큰 둘 중 하나면 OK
 */
exports.isLoggedIn = (req, res, next) => {
   const me = getAuthUser(req)
   if (me) return next()

   const error = new Error('로그인이 필요합니다.')
   error.status = 403
   return next(error)
}

/**
 * 비로그인 상태 확인
 * - 세션과 토큰 모두 없어야 통과
 */
exports.isNotLoggedIn = (req, res, next) => {
   const me = getAuthUser(req)
   if (!me) return next()

   const error = new Error('이미 로그인이 된 상태입니다.')
   error.status = 400
   return next(error)
}

/**
 * 관리자 권한 확인 (하이브리드)
 * - 로그인 + role === 'ADMIN'
 */
exports.isAdmin = (req, res, next) => {
   const me = getAuthUser(req)
   if (!me) {
      const error = new Error('로그인이 필요합니다.')
      error.status = 403
      return next(error)
   }
   if (String(me.role).toUpperCase() === 'ADMIN') return next()

   const error = new Error('관리자 권한이 필요합니다.')
   error.status = 403
   return next(error)
}

/**
 * 토큰 유효성 확인 (JWT 전용 보호가 필요할 때 선택적으로 사용)
 * - 세션을 쓰지 않는 API에서만 강제하고 싶을 때 활용
 */
exports.verifyToken = (req, res, next) => {
   try {
      const raw = req.headers.authorization || req.get('Authorization') || ''
      const token = parseBearer(raw)
      if (!token) {
         const error = new Error('인증 토큰이 필요합니다.')
         error.status = 401
         return next(error)
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      req.decoded = decoded
      req.authUser = {
         id: decoded.id,
         userId: decoded.userId,
         role: decoded.role,
         provider: decoded.provider,
         email: decoded.email,
      }
      return next()
   } catch (error) {
      if (error.name === 'TokenExpiredError') {
         error.status = 419
         error.message = '토큰이 만료되었습니다.'
         return next(error)
      }
      error.status = 401
      error.message = '유효하지 않은 토큰입니다.'
      return next(error)
   }
}

/**
 * 요청에서 인증된 사용자 id를 얻고 싶은 경우에 쓸 헬퍼
 * - 컨트롤러에서 import해서 사용 가능
 */
exports.getAuthUserId = (req) => {
   const me = (req && (req.user || req.authUser)) || null
   return me?.id || null
}
