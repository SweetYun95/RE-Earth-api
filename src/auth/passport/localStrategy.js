// RE-Earth-api/src/auth/passport/localStrategy.js
const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy
const bcrypt = require('bcrypt')
const User = require('../../models/user')

module.exports = () => {
   passport.use(
      new LocalStrategy(
         {
            // 기본 필드는 idOrEmail을 기대하되,
            // 실제 콜백에서 req.body.userId도 함께 수용한다.
            usernameField: 'idOrEmail',
            passwordField: 'password',
            passReqToCallback: true,
            session: true,
         },
         /**
          * @param {import('express').Request} req
          * @param {string} idOrEmail - usernameField(idOrEmail)에 매핑된 값
          * @param {string} password
          * @param {(err: any, user?: any, info?: any) => void} done
          */
         async (req, idOrEmail, password, done) => {
            try {
               // 🔸 보강 포인트: userId를 대체 입력으로 허용 (과거 프론트 호환)
               const fallbackUserId = req?.body?.userId
               const raw = String(idOrEmail || fallbackUserId || '').trim()

               if (!raw || !password) {
                  return done(null, false, { message: 'Missing credentials' })
               }

               // 이메일인지 아이디인지 판별
               const isEmail = raw.includes('@')
               const where = isEmail
                  ? { email: raw.toLowerCase(), provider: 'LOCAL' } // ENUM: 'LOCAL'
                  : { userId: raw, provider: 'LOCAL' }

               const user = await User.findOne({ where })
               if (!user) {
                  return done(null, false, { message: '가입되지 않은 계정이거나 소셜 계정입니다.' })
               }

               if (!user.password) {
                  // 소셜 가입 계정 (password null)
                  return done(null, false, { message: '이 계정은 소셜 로그인으로 가입되었습니다.' })
               }

               const ok = await bcrypt.compare(password, user.password)
               if (!ok) {
                  return done(null, false, { message: '비밀번호가 일치하지 않습니다.' })
               }

               return done(null, user)
            } catch (error) {
               return done(error)
            }
         }
      )
   )
}
