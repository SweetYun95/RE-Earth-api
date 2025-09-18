const express = require('express')
const axios = require('axios')
const { sequelize } = require('../models')
const { Point, EcoAction, EcoActionLog } = require('../models')
const { calcBikePoints, calcBikeCarbonSave } = require('../utils/savingUtils')

const router = express.Router()

const BICYCLE_API_URL = process.env.BICYCLE_API_URL

// 따릉이 API call
router.get('/bicycles', async (req, res, next) => {
   try {
      const { start = 1, end = 1000 } = req.query
      const url = `${process.env.BICYCLE_API_URL}${start}/${end}/`
      const { data } = await axios.get(url)
      res.json(data.rentBikeStatus.row)
   } catch (err) {
      next(err)
   }
})

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
      console.log('🎈🎈🎈🎈6번:', ecoLog)
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
