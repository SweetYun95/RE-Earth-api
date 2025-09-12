// RE-Earth-api/src/auth/passport/localStrategy.js
const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy
const bcrypt = require('bcrypt')
const User2 = require('../../models/user')

module.exports = () => {
   passport.use(
      new LocalStrategy(
         {
            // 가입/로그인 폼에서 email, password를 받는 기준으로 통일
            usernameField: 'email',
            passwordField: 'password',
            passReqToCallback: false,
         },
         async (email, password, done) => {
            try {
               email = (email || '').toLowerCase().trim()
               const user = await User2.findOne({ where: { email, provider: 'local' } })

               if (!user) {
                  return done(null, false, { message: '가입되지 않은 이메일이거나 소셜 계정입니다.' })
               }

               if (!user.password) {
                  // 소셜 계정이 로컬로 로그인 시도하는 경우 방어
                  return done(null, false, { message: '이 계정은 소셜 로그인으로 가입되었습니다.' })
               }

               const ok = await bcrypt.compare(password, user.password)
               if (!ok) {
                  return done(null, false, { message: '비밀번호가 일치하지 않습니다.' })
               }

               return done(null, user)
            } catch (error) {
               if (error.name === 'SequelizeConnectionError') {
                  return done(null, false, { message: '데이터베이스 연결 오류' })
               }
               return done(error)
            }
         }
      )
   )
}