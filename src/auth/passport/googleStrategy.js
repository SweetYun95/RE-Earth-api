// RE-Earth-api/src/auth/passport/googleStrategy.js
const passport = require('passport')
const GoogleStrategy = require('passport-google-oauth20').Strategy
const User3 = require('../../models/user')

module.exports = () => {
   passport.use(
      new GoogleStrategy(
         {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: process.env.GOOGLE_CALLBACK_URL || '/auth/google/callback',
         },
         async (accessToken, refreshToken, profile, done) => {
            try {
               const email = ((profile.emails && profile.emails[0] && profile.emails[0].value) || '').toLowerCase()
               if (!email) {
                  return done(null, false, { message: '구글 계정에서 이메일 정보를 가져오지 못했습니다.' })
               }

               // 같은 이메일이 이미 있으면 그대로 로그인 (로컬/구글 상관없이 허용)
               const exUser = await User3.findOne({ where: { email } })
               if (exUser) return done(null, exUser)

               // 새로 가입 처리 (모델 스키마에 맞춰 필요한 필드 채움)
               const newUser = await User3.create({
                  userId: `google_${profile.id}`,
                  name: profile.displayName || 'Google User',
                  email,
                  password: null, // 소셜 로그인
                  provider: 'google',
                  role: 'USER',
                  address: '', // model이 NOT NULL이면 빈 문자열 등 안전값
               })
               return done(null, newUser)
            } catch (error) {
               console.error('Google 로그인 실패:', error)
               return done(error)
            }
         }
      )
   )
}