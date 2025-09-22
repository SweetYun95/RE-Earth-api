<<<<<<< HEAD
const express = require("express");
const axios = require("axios");
const { sequelize } = require("../models");
const { Point, EcoAction, EcoActionLog, User } = require("../models");
const { calcBikePoints, calcBikeCarbonSave } = require("../utils/savingUtils");
=======
// RE-Earth-api/src/routes/saving.js
const express = require('express')
const axios = require('axios')
const { sequelize } = require('../models')
const { Point, EcoAction, EcoActionLog } = require('../models')
const { calcBikePoints, calcBikeCarbonSave } = require('../utils/savingUtils')
>>>>>>> 64246fa715dc70c38c0a1c30d46458692ba73e5a

const router = express.Router();

const BICYCLE_API_URL = process.env.BICYCLE_API_URL;

// 따릉이 API call
router.get("/bicycles", async (req, res, next) => {
  try {
    const { start = 1, end = 1000 } = req.query;
    const url = `${process.env.BICYCLE_API_URL}${start}/${end}/`;
    const { data } = await axios.get(url);
    res.json(data.rentBikeStatus.row);
  } catch (err) {
    next(err);
  }
});

// 따릉이로 인증하기
router.post("/bicycle/end", async (req, res, next) => {
  const { userId, distanceKm } = req.body;
  const t = await sequelize.transaction();

  try {
    const points = calcBikePoints(distanceKm);
    const carbonSave = calcBikeCarbonSave(distanceKm);

    const bikeAction = await EcoAction.findOne({
      where: { code: "BICYCLE" },
      transaction: t,
    });
    if (!bikeAction) {
      await t.rollback();
      return res
        .status(400)
        .json({ error: "친환경 활동 중 BICYCLE 코드가 존재하지 않습니다." });
    }

    const ecoLog = await EcoActionLog.create(
      {
        quantity: distanceKm,
        provider: "API",
        status: "COMPLETED",
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
    );
    await Point.create(
      {
        userId,
        amount: points,
        reason: "BICYCLE_RIDE",
        delta: points,
        description: `자전거 ${distanceKm}km 주행`,
        ecoActionLogId: ecoLog.id,
      },
      { transaction: t }
    );

    await t.commit();

    res.json({ success: true, distanceKm, points, carbonSave });
  } catch (err) {
    await t.rollback();
    console.error(err);
    next(err);
  }
});

// 쓰레기 분리수거 인증 로직 (미구현)
router.post("/recycle", async (req, res) => {
  const { phoneOrEmail, bottleCount } = req.body;
  const t = await sequelize.transaction();

  try {
    // 1. 회원 여부 확인
    const user = await User.findOne({
      where: {
        [Op.or]: [{ phoneNumber: phoneOrEmail }, { email: phoneOrEmail }],
      },
    });

    if (!user) {
      return res.json({
        message:
          "포인트 지급이 필요한 경우 앱 내 회원가입 이후 수거를 진행해 주세요.",
        allowGuest: true,
      });
    }

    // 2. ecoactions에서 수거 코드 가져오기
    const ecoAction = await EcoAction.findOne({
      where: { code: "PET", active: true },
    });

    if (!ecoAction) {
      await t.rollback();
      return res
        .status(400)
        .json({ error: "친환경 활동 중 PET 코드가 존재하지 않습니다." });
    }

    // 3. ecoactionlogs에 수거 기록 저장
    const pointEarned = bottleCount * ecoAction.pointUnit;
    const co2Saved = bottleCount * ecoAction.carbonUnit;

    const ecoLog = await EcoActionLog.create(
      {
        ecoActionId: ecoAction.id,
        userId: user.id,
        quantity: bottleCount,
        pointEarned,
        co2Saved,
        status: "COMPLETED",
      },
      { transaction: t }
    );

    // 4. 포인트 적립 내역 저장
    await Point.create(
      {
        userId: user.id,
        amount: pointEarned,
        reason: "PET bottle recycle",
        description: `페트병 ${bottleCount}개 수거`,
        ecoActionLogId: ecoLog.id,
      },
      { transaction: t }
    );

    await t.commit();
    // 수거량 계산, 포인트 지급 트랜잭션 처리

    // 5. 안내 메시지 반환
    return res.json({
      message: `${pointEarned} 포인트가 적립되었습니다. 홈 화면으로 돌아갑니다.`,
    });
  } catch (err) {
    await t.rollback();
    console.error(err);
    next(err);
  }
});

module.exports = router;
