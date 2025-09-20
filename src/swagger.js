// RE_Earth-api/src/swagger.js
const swaggerJSDoc = require('swagger-jsdoc')
const swaggerUi = require('swagger-ui-express')

const options = {
   definition: {
      openapi: '3.0.0', // OpenAPI 문서 버전
      info: {
         title: 'Shopmax API',
         version: '1.0.0',
         description: 'Shopmax API 문서입니다.',
      },
      servers: [
         {
            url: process.env.APP_API_URL, // 실제 서버 주소
         },
      ],
      components: {
         securitySchemes: {
            bearerAuth: {
               type: 'http',
               scheme: 'bearer',
               bearerFormat: 'JWT',
            },
         },
      },
      security: [
         {
            bearerAuth: [],
         },
      ],
   },
   // Swagger 주석이 달린 라우터 파일들 (admin/ 하위 포함)
   apis: ['./routes/**/*.swagger.js'],
}

const swaggerSpec = swaggerJSDoc(options)

module.exports = {
   swaggerUi,
   swaggerSpec,
}
