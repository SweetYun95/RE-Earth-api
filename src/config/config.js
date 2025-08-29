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
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      host: process.env.DB_HOST,
      dialect: process.env.DB_DIALECT,
      timezone: '+09:00', // KST로 설정
   },
   production: {
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      host: process.env.DB_HOST,
      dialect: process.env.DB_DIALECT,
      timezone: '+09:00', // KST로 설정
   },
}
