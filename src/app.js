// RE_Earth-api/src/app.js
const express = require('express')
const path = require('path')
const cookieParser = require('cookie-parser')
const morgan = require('morgan')
const session = require('express-session')
const passport = require('passport')
require('dotenv').config()
const cors = require('cors')
const { swaggerUi, swaggerSpec } = require('./swagger')
// const http = require('http')
// const socketIO = require('./socket')

const indexRouter = require('./routes') // ✅ 라우팅은 이 한 줄로 끝!
const { sequelize } = require('./models')
const passportConfig = require('./auth/passport')
const { hydrateAuthFromToken } = require('./routes/middlewares') // ✅ 하이브리드 인증 수화기

const app = express()
passportConfig()
app.set('port', process.env.PORT || 8000)

// ───────── DB 연결
sequelize
   .sync({ force: false, alter: false })
   .then(() => console.log('데이터베이스 연결 성공'))
   .catch((err) => console.error(err))

// ───────── 공통 미들웨어
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec)) // http://localhost:8000/api-docs

app.use(
   cors({
      origin: process.env.FRONTEND_APP_URL || process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true,
   })
)

app.use(morgan('dev'))
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser(process.env.COOKIE_SECRET))

const sessionMiddleware = session({
   resave: false,
   saveUninitialized: false,
   secret: process.env.COOKIE_SECRET,
   cookie: {
      httpOnly: true,
      secure: false, // 배포(HTTPS, 프록시) 시 true + app.set('trust proxy', 1)
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24, // 1일
   },
})
app.use(sessionMiddleware)

app.use(passport.initialize())
app.use(passport.session())

// ✅ 세션 초기화 이후, 라우터 등록 이전에 토큰 수화기 추가
app.use(hydrateAuthFromToken)

// ───────── 라우팅(허브 하나만)
app.use('/', indexRouter)

// ───────── 404
app.use((req, res, next) => {
   const error = new Error(`${req.method} ${req.url} 라우터가 없습니다.`)
   error.status = 404
   next(error)
})

// ───────── 에러 핸들러
app.use((err, req, res, next) => {
   const statusCode = err.status || 500
   const errorMessage = err.message || '서버 내부 오류'
   if (process.env.NODE_ENV === 'development') console.log(err)
   res.status(statusCode).json({ success: false, message: errorMessage, error: err })
})

// ✅ Socket.IO 미사용: app.listen
app.listen(app.get('port'), () => {
   console.log(app.get('port'), '번 포트에서 대기중')
})

// // Socket.IO 사용 시:
// // const server = http.createServer(app)
// // socketIO(server, sessionMiddleware)
// // server.listen(app.get('port'), () => console.log(app.get('port'), '번 포트에서 대기중'))
