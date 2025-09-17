// src/auth/passport/kakaoStrategy.js
const passport = require('passport')
const KakaoStrategy = require('passport-kakao').Strategy
const User3 = require('../../models/user')

module.exports = () => {
   passport.use(
      new KakaoStrategy(
         {
            clientID: process.env.KAKAO_CLIENT_ID,
            clientSecret: process.env.KAKAO_CLIENT_SECRET, // 사용 안하면 생략 가능
            callbackURL: process.env.KAKAO_CALLBACK_URL || '/auth/kakao/callback',
         },
         async (accessToken, refreshToken, profile, done) => {
            try {
               const kakaoEmail = profile._json?.kakao_account?.email || null
               const name = profile.username || profile.displayName || 'Kakao User'

               if (kakaoEmail) {
                  const existing = await User3.findOne({ where: { email: kakaoEmail } })
                  if (existing) return done(null, existing)
               }

               const user = await User3.create({
                  userId: `kakao_${profile.id}`,
                  name,
                  email: kakaoEmail, // 이메일 동의(scope)가 없으면 모델 NOT NULL이면 라우트에서 차단 필요
                  password: null,
                  provider: 'KAKAO', // ✅ 대문자
                  role: 'USER',
                  address: '',
               })
               return done(null, user)
            } catch (err) {
               return done(err)
            }
         }
      )
   )
}
