// RE-Earth-api/src/auth/passport/index.js
const passport = require('passport')
const local = require('./localStrategy')
const google = require('./googleStrategy')
// const kakao = require('./kakaoStrategy')
const User = require('../../models/user')

module.exports = () => {
   // 로그인 성공 시 세션에 최소 정보만 저장
   passport.serializeUser((user, done) => {
      done(null, user.id)
   })

   // 매 요청마다 id로 유저 복원 (비밀번호 제외)
   passport.deserializeUser(async (id, done) => {
      try {
         const user = await User.findByPk(id, {
            attributes: { exclude: ['password'] },
         })
         return done(null, user)
      } catch (err) {
         return done(err)
      }
   })

   // 전략 등록
   local()
   google()
   // kakao()
}
