// RE_Earth-api/src/app.js
const express = require('express')
const path = require('path') // 경로 처리 유틸리티
const cookieParser = require('cookie-parser') // 쿠키 처리 미들웨어
const morgan = require('morgan') // HTTP 요청 로깅 미들웨어
const session = require('express-session') // 세션 관리 미들웨어
const passport = require('passport') // 인증 미들웨어
require('dotenv').config() // 환경 변수 관리
const cors = require('cors') // CORS 미들웨어 -> ★api 서버는 반드시 설정해줘야 한다
// const { swaggerUi, swaggerSpec } = require('./swagger') // ⚠️ Swagger 모듈 미구현이므로 임시 비활성화
// ⚠️ 아직 Socket.IO 기능이 없으므로 관련 코드는 주석 처리합니다.
// const http = require('http') // http 모듈
// const socketIO = require('./socket') // Socket.IO 초기화 함수

// 라우터 및 기타 모듈 불러오기
const indexRouter = require('./routes')
const authRouter = require('./routes/auth')
const savingRouter = require('./routes/saving')
const donationRouter = require('./routes/donation')

const { sequelize } = require('./models')
const passportConfig = require('./auth/passport')

const app = express()
passportConfig()
app.set('port', process.env.PORT || 8000)

// 시퀄라이즈를 사용한 DB연결
sequelize
   .sync({ force: false })
   .then(() => {
      console.log('데이터베이스 연결 성공')
   })
   .catch((err) => {
      console.error(err)
   })

// 미들웨어 설정
// app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec)) // http://localhost:8000/api-docs (Swagger 준비되면 해제)
app.use(
   cors({
      origin: process.env.FRONTEND_APP_URL || 'http://localhost:5173',
      credentials: true, // 쿠키, 세션 등 인증 정보 허용
   })
)
app.use(morgan('dev')) // HTTP 요청 로깅 (dev 모드)
app.use(express.static(path.join(__dirname, 'uploads'))) // 정적 파일 제공
app.use(express.json()) // JSON 데이터 파싱
app.use(express.urlencoded({ extended: false })) // URL-encoded 데이터 파싱
app.use(cookieParser(process.env.COOKIE_SECRET)) // 쿠키 설정

// 세션 설정
const sessionMiddleware = session({
   resave: false,
   saveUninitialized: false,
   secret: process.env.COOKIE_SECRET,
   cookie: {
      httpOnly: true,
      secure: false, // HTTPS 사용 시 true 권장 (프록시 환경에서는 trust proxy 설정 필요)
      sameSite: 'lax', // 크로스 포트(5173↔8002) 로컬 개발에서 무난
      maxAge: 1000 * 60 * 60 * 24, // ★ 1일
   },
})
app.use(sessionMiddleware)

// Passport 초기화, 세션 연동
app.use(passport.initialize())
app.use(passport.session())

// 라우터 등록
app.use('/', indexRouter) // localhost:8000/
app.use('/auth', authRouter) // localhost:8000/auth
app.use('/saving', savingRouter)
app.use('/donations', donationRouter) // localhost:8000/donations

// ⚠️ Socket.IO 미사용: 아래 코드는 나중에 소켓 붙일 때 주석 해제하세요.
// const server = http.createServer(app)
// socketIO(server, sessionMiddleware)

// 잘못된 라우터 경로 처리
app.use((req, res, next) => {
   const error = new Error(`${req.method} ${req.url} 라우터가 없습니다.`)
   error.status = 404
   next(error)
})

// 에러 미들웨어
app.use((err, req, res, next) => {
   const statusCode = err.status || 500
   const errorMessage = err.message || '서버 내부 오류'
   if (process.env.NODE_ENV === 'development') {
      console.log(err)
   }
   res.status(statusCode).json({ success: false, message: errorMessage, error: err })
})

// ✅ Socket.IO가 없으므로 app.listen 사용
app.listen(app.get('port'), () => {
   console.log(app.get('port'), '번 포트에서 대기중')
})

// server.listen(app.get('port'), () => {
//   console.log(app.get('port'), '번 포트에서 대기중')
// })
