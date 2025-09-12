// RE-Earth-api/src/auth/passport/index.js
const passport = require('passport')
const local = require('./localStrategy')
const google = require('./googleStrategy')
const User = require('../../models/user')

module.exports = () => {
   // 로그인 성공 시 유저 정보를 세션에 저장
   passport.serializeUser((user, done) => {
      // user.id만 저장 (세션의 용량 절약을 위해)
      done(null, user.id)
   })

   // 매 요청 시 세션에 저장된 id를 이용해 유저 정보 복원
   passport.deserializeUser((id, done) => {
   // 세션에 저장된 id를 기반으로 유저 정보를 복원
      User.findOne({ where: { id } })
         .then((user) => done(null, user)) // 세션에서 유저 정보를 복원
         .catch((err) => done(err)) // 오류 발생 시 에러 반환
   })

   // 로컬 로그인 전략 설정
   local()
   // 구글 로그인 전략 설정
   google()
   // 카카오 로그인 전략 설정 (추후 구현 예정)
   // kakao()
}
