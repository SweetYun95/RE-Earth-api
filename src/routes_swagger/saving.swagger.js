// RE-Earth-api/src/routes_swagger/saving.swagger.js
const express = require('express')
const axios = require('axios')
const { sequelize } = require('../models')
const { Point, EcoAction, EcoActionLog } = require('../models')
const { calcBikePoints, calcBikeCarbonSave } = require('../utils/savingUtils')

const router = express.Router()

const BICYCLE_API_URL = process.env.BICYCLE_API_URL

/**
 * @swagger
 * tags:
 *   - name: Eco
 *     description: 친환경 활동(따릉이 등) 관련 API
 *
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   schemas:
 *     BicycleStation:
 *       type: object
 *       additionalProperties: true
 *       description: 서울시 따릉이 API 원본 스키마(가변). 주요 필드만 예시로 표시합니다.
 *       properties:
 *         rackTotCnt: { type: string, example: "15", description: "거치대 수" }
 *         stationName: { type: string, example: "101. 광화문역 1번출구 앞" }
 *         parkingBikeTotCnt: { type: string, example: "7", description: "거치 자전거 수" }
 *         shared: { type: string, example: "46" }
 *         stationLatitude: { type: string, example: "37.57142" }
 *         stationLongitude: { type: string, example: "126.9769" }
 *     BicycleCertRequest:
 *       type: object
 *       required: [userId, distanceKm]
 *       properties:
 *         userId: { type: integer, example: 12, description: "주행한 사용자 ID" }
 *         distanceKm: { type: number, example: 5.2, description: "주행 거리(km)" }
 *     BicycleCertResponse:
 *       type: object
 *       properties:
 *         success: { type: boolean, example: true }
 *         distanceKm: { type: number, example: 5.2 }
 *         points: { type: integer, example: 520 }
 *         carbonSave: { type: number, example: 1.1, description: "절감 CO2(kg) 추정치" }
 */

/**
 * @swagger
 * /eco/bicycles:
 *   get:
 *     summary: 따릉이 대여소 현황 조회
 *     description: 서울시 따릉이 오픈 API를 프록시하여 대여소 목록(row 배열)을 반환합니다.
 *     tags: [Eco]
 *     parameters:
 *       - in: query
 *         name: start
 *         schema: { type: integer, default: 1 }
 *         description: 조회 시작 인덱스(서울시 API 원형 파라미터)
 *       - in: query
 *         name: end
 *         schema: { type: integer, default: 1000 }
 *         description: 조회 종료 인덱스(서울시 API 원형 파라미터)
 *     responses:
 *       200:
 *         description: 대여소 목록
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/BicycleStation' }
 *       500:
 *         description: 서버 오류
 */
// 따릉이 API call
router.get('/bicycles', async (req, res, next) => {
   try {
      const { start = 1, end = 1000 } = req.query
      const url = `${BICYCLE_API_URL}${start}/${end}/`
      const { data } = await axios.get(url)
      res.json(data.rentBikeStatus.row)
   } catch (err) {
      next(err)
   }
})

/**
 * @swagger
 * /eco/bicycle/end:
 *   post:
 *     summary: 따릉이 주행 인증(포인트/탄소 절감 적립)
 *     description: 거리(km)를 기반으로 포인트와 CO₂ 절감량을 계산하여 로그를 저장합니다.
 *     tags: [Eco]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/BicycleCertRequest' }
 *     responses:
 *       200:
 *         description: 인증/적립 성공
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/BicycleCertResponse' }
 *       400:
 *         description: 잘못된 요청 또는 EcoAction 미설정
 *       500:
 *         description: 서버 오류
 */
// 따릉이로 인증하기
router.post('/bicycle/end', async (req, res, next) => {
   const { userId, distanceKm } = req.body
   const t = await sequelize.transaction()

   try {
      const points = calcBikePoints(distanceKm)
      const carbonSave = calcBikeCarbonSave(distanceKm)

      const bikeAction = await EcoAction.findOne({ where: { code: 'BICYCLE' }, transaction: t })
      if (!bikeAction) {
         await t.rollback()
         return res.status(400).json({ error: '친환경 활동 중 BICYCLE 코드가 존재하지 않습니다.' })
      }

      const ecoLog = await EcoActionLog.create(
         {
            quantity: distanceKm,
            provider: 'API',
            status: 'COMPLETED',
            ecoActionId: bikeAction.id,
            userId,
            pointEarned: points,
            co2Saved: carbonSave,
            snapPointUnit: bikeAction.pointUnit,
            snapCo2PerUnit: bikeAction.carbonUnit,
            snapUnit: bikeAction.unit,
            quantityCanonical: distanceKm,
            verifiedAt: new Date(),
            verifiedBy: userId, // 임시
            sourceRef: `bike-${Date.now()}`,
         },
         { transaction: t }
      )

      await Point.create(
         {
            userId,
            amount: points,
            reason: 'BICYCLE_RIDE',
            delta: points,
            description: `자전거 ${distanceKm}km 주행`,
            ecoActionLogId: ecoLog.id,
         },
         { transaction: t }
      )

      await t.commit()
      res.json({ success: true, distanceKm, points, carbonSave })
   } catch (err) {
      await t.rollback()
      console.error(err)
      next(err)
   }
})

module.exports = router
