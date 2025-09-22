require('dotenv').config() // .env 파일 로드

module.exports = {
   development: {
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      host: process.env.DB_HOST,
      dialect: process.env.DB_DIALECT,
      timezone: '+09:00', // KST로 설정
   },
   test: {
      username: process.env.TEST_DB_USERNAME,
      password: process.env.TEST_DB_PASSWORD,
      database: process.env.TEST_DB_NAME,
      host: process.env.TEST_DB_HOST,
      dialect: process.env.TEST_DB_DIALECT,
      timezone: '+09:00', // KST로 설정
   },
   production: {
      username: process.env.DEPLOY_DB_USERNAME,
      password: process.env.DEPLOY_DB_PASSWORD,
      database: process.env.DEPLOY_DB_NAME,
      host: process.env.DEPLOY_DB_HOST,
      dialect: process.env.DEPLOY_DB_DIALECT,
      logging: false, // 로그 숨기기
      timezone: '+09:00', // KST로 설정
   },
}
