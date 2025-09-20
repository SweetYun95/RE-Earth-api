// 거리 계산식
function getDistance(lat1, lng1, lat2, lng2) {
   const R = 6371e3
   const toRad = (deg) => (deg * Math.PI) / 180

   const φ1 = toRad(lat1)
   const φ2 = toRad(lat2)
   const Δφ = toRad(lat2 - lat1)
   const Δλ = toRad(lng2 - lng1)

   const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
   const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

   return R * c // meter단위
}

// 포인트 산정식
function calcBikePoints(distanceKm) {
   if (distanceKm > 50) distanceKm = 50

   let points = 0

   if (distanceKm >= 10) {
      points = 80 + (distanceKm - 10) * 5
   } else if (distanceKm >= 5) {
      points = 35 + (distanceKm - 5) * ((90 - 35) / (10 - 5))
   } else if (distanceKm >= 3) {
      points = 18 + (distanceKm - 3) * ((35 - 18) / (5 - 3))
   } else if (distanceKm >= 1) {
      points = 6 + (distanceKm - 1) * ((18 - 6) / (3 - 1))
   }

   // 상한 포인트
   if (points > 280) points = 280

   return Math.floor(points)
}

// 탄소절감량 계산
function calcBikeCarbonSave(distanceKm) {
   if (distanceKm <= 0) return 0

   // 1km 이동 시 약 0.21kg CO₂ 절감
   const CO2_PER_KM = 0.21

   // 절감량 계산
   let carbonSaved = distanceKm * CO2_PER_KM

   // 일일 상한 (예: 50km 기준)
   if (distanceKm > 50) {
      carbonSaved = 50 * CO2_PER_KM
   }

   // 소수점 둘째자리까지 (kg 단위로 환산)
   return Number(carbonSaved.toFixed(2))
}

module.exports = { getDistance, calcBikePoints, calcBikeCarbonSave }
