// RE-Earth-api/src/auth/passport/googleStrategy.js
const passport = require('passport')
const GoogleStrategy = require('passport-google-oauth20').Strategy
const User2 = require('../../models/user')

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
               if (!email) return done(null, false, { message: '구글 계정에서 이메일 정보를 가져오지 못했습니다.' })

               // 같은 이메일이 있으면 그대로 로그인
               const exUser = await User2.findOne({ where: { email } })
               if (exUser) return done(null, exUser)

               // 신규 가입
               const newUser = await User2.create({
                  userId: `google_${profile.id}`,
                  name: profile.displayName || 'Google User',
                  email,
                  password: null,
                  provider: 'GOOGLE', // ✅ 대문자
                  role: 'USER',
                  address: '', // NOT NULL 안전값
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
