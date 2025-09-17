const express = require('express')
const axios = require('axios')

const router = express.Router()

const BICYCLE_API_URL = process.env.BICYCLE_API_URL

router.get('/bicycles', async (req, res, next) => {
   try {
      const { data } = await axios.get(process.env.BICYCLE_API_URL)
      res.json(data.rentBikeStatus.row) // ✅ 여기
   } catch (err) {
      next(err)
   }
})

module.exports = router
