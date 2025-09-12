// src/auth/passport/kakaoStrategy.js
const passport = require('passport')
const KakaoStrategy = require('passport-kakao').Strategy
const User = require('../../models/user')

module.exports = () => {
  passport.use(
    new KakaoStrategy(
      {
        clientID: process.env.KAKAO_CLIENT_ID,
        clientSecret: process.env.KAKAO_CLIENT_SECRET, // 사용 안하면 생략 가능
        callbackURL: process.env.KAKAO_CALLBACK_URL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const kakaoEmail =
            profile._json?.kakao_account?.email || null // 이메일 동의 안 하면 null
          const name =
            profile.username || profile.displayName || 'Kakao User'

          // 같은 이메일 있으면 그 계정으로 로그인
          if (kakaoEmail) {
            const existing = await User.findOne({ where: { email: kakaoEmail } })
            if (existing) return done(null, existing)
          }

          // 신규 생성
          const user = await User.create({
            userId: `kakao_${profile.id}`,
            name,
            email: kakaoEmail,        // 모델이 NOT NULL이면 email 동의(scope) 필수!
            password: null,           // 소셜 로그인
            provider: 'kakao',
            role: 'USER',
            address: '',              // NOT NULL이면 안전값
          })
          return done(null, user)
        } catch (err) {
          return done(err)
        }
      }
    )
  )
}
