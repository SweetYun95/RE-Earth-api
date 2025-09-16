// RE-Earth-api/src/auth/passport/localStrategy.js
const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy
const bcrypt = require('bcrypt')
const User = require('../../models/user')

module.exports = () => {
   passport.use(
      new LocalStrategy(
         {
            // ✅ 프론트에서 "idOrEmail" 로 보냄 (아이디 또는 이메일 모두 허용)
            usernameField: 'idOrEmail',
            passwordField: 'password',
            passReqToCallback: true,
         },
         async (req, idOrEmail, password, done) => {
            try {
               const raw = String(idOrEmail || '').trim()
               if (!raw || !password) {
                  return done(null, false, { message: 'Missing credentials' })
               }

               const isEmail = raw.includes('@')
               const where = isEmail
                  ? { email: raw.toLowerCase(), provider: 'LOCAL' } // ← provider 대문자
                  : { userId: raw, provider: 'LOCAL' }

               const user = await User.findOne({ where })
               if (!user) return done(null, false, { message: '가입되지 않은 계정이거나 소셜 계정입니다.' })
               if (!user.password) return done(null, false, { message: '이 계정은 소셜 로그인으로 가입되었습니다.' })

               const ok = await bcrypt.compare(password, user.password)
               if (!ok) return done(null, false, { message: '비밀번호가 일치하지 않습니다.' })

               return done(null, user)
            } catch (error) {
               return done(error)
            }
         }
      )
   )
}
