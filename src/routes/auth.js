// RE-Earth-api/src/routes/auth.js
const express = require("express");
const bcrypt = require("bcrypt");
const passport = require("passport");
const jwt = require("jsonwebtoken");
const { User } = require("../models");
const { isLoggedIn, isNotLoggedIn } = require("./middlewares");
const { where } = require("sequelize");

const router = express.Router();

// ───────── helpers: 비번/휴대폰/검증 ─────────
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9])\S{8,}$/;
const isValidPassword = (pw) => PASSWORD_REGEX.test(pw || "");

// userId 4~20, 영문/숫자만 (프론트와 동일 규칙 유지)
const USERID_REGEX = /^[A-Za-z0-9]{4,20}$/;
// 닉네임 2~20, 공백 금지
const NICK_REGEX = /^\S{2,20}$/;

// 010-1234-5678 형태로 정규화
const onlyDigits = (s) => String(s || "").replace(/\D/g, "");
const formatKrMobile = (raw) => {
  const d = onlyDigits(raw);
  if (!/^01[016789]\d{7,8}$/.test(d)) return null; // 10~11자리 휴대폰만 허용
  if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
};

const signJwt = (user) =>
  jwt.sign(
    { id: user.id, userId: user.userId, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: "1h", issuer: "re-earth" }
  );

// ───────── 회원가입 (local) ─────────
router.post("/join", isNotLoggedIn, async (req, res, next) => {
  try {
    let {
      email,
      name,
      address,
      password,
      userId,
      phoneNumber,
      phone1,
      phone2,
      phone3,
    } = req.body;

    // 과거 마크업 호환: name="id"로 온 경우 지원
    if (!userId && typeof req.body.id === "string") {
      userId = req.body.id;
    }

    email = (email || "").trim().toLowerCase();
    name = (name || "").trim();
    address = (address || "").trim();
    userId = (userId || "").trim();

    if (!email || !name || !address || !password) {
      const err = new Error(
        "필수 항목이 누락되었습니다. (email, name, address, password)"
      );
      err.status = 400;
      return next(err);
    }
    if (!isValidPassword(password)) {
      const err = new Error(
        "비밀번호는 영문, 숫자, 특수문자를 각각 포함하여 8자 이상이어야 합니다."
      );
      err.status = 400;
      return next(err);
    }

    const exUser = await User.findOne({ where: { email } });
    if (exUser) {
      const error = new Error("이미 존재하는 사용자입니다.");
      error.status = 409;
      return next(error);
    }

    if (userId) {
      if (!USERID_REGEX.test(userId)) {
        const err = new Error(
          "userId 형식이 올바르지 않습니다. (4~20자 영문/숫자)"
        );
        err.status = 400;
        return next(err);
      }
      const dupeId = await User.findOne({ where: { userId } });
      if (dupeId) {
        const err = new Error("이미 사용 중인 userId 입니다.");
        err.status = 409;
        return next(err);
      }
    }

    const rawPhone =
      phoneNumber ||
      [phone1, phone2, phone3].filter((v) => (v ?? "") !== "").join("-") ||
      "";
    const normalizedPhone = rawPhone ? formatKrMobile(rawPhone) : null;
    if (rawPhone && !normalizedPhone) {
      const err = new Error("휴대폰 번호 형식이 올바르지 않습니다.");
      err.status = 400;
      return next(err);
    }

    const hash = await bcrypt.hash(password, 12);

    const newUser = await User.create({
      email,
      name,
      password: hash,
      role: "USER",
      address,
      provider: "LOCAL",
      phoneNumber: normalizedPhone,
      ...(userId ? { userId } : {}),
    });

    return res.status(201).json({
      success: true,
      message: "사용자가 성공적으로 등록되었습니다.",
      user: {
        id: newUser.id,
        userId: newUser.userId,
        name: newUser.name,
        role: newUser.role,
      },
    });
  } catch (error) {
    error.status = error.status || 500;
    error.message = error.message || "회원가입 중 오류가 발생했습니다.";
    return next(error);
  }
});

// ───────── 로그인 (local) ─────────
router.post("/login", isNotLoggedIn, (req, res, next) => {
  passport.authenticate("local", (authError, user, info) => {
    if (authError) {
      authError.status = 500;
      authError.message = "인증 중 오류 발생";
      return next(authError);
    }
    if (!user) {
      const error = new Error(info?.message || "로그인 실패");
      error.status = 401;
      return next(error);
    }
    req.login(user, (loginError) => {
      if (loginError) {
        loginError.status = 500;
        loginError.message = "로그인 중 오류 발생";
        return next(loginError);
      }
      const token = signJwt(user);
      return res.json({
        success: true,
        message: "로그인 성공",
        token, // Authorization 헤더에 그대로 담아 보내세요 (Bearer 접두사 없이)
        user: {
          id: user.id,
          userId: user.userId,
          name: user.name,
          role: user.role,
        },
      });
    });
  })(req, res, next);
});

// ───────── 관리자 로그인 (local / 세션 생성 전 role 검증) ─────────
router.post("/login-admin", isNotLoggedIn, (req, res, next) => {
  passport.authenticate("local", (authError, user, info) => {
    if (authError) {
      authError.status = 500;
      authError.message = "인증 중 오류 발생";
      return next(authError);
    }
    if (!user) {
      const error = new Error(info?.message || "로그인 실패");
      error.status = 401;
      return next(error);
    }

    // ★ 세션 만들기 전에 ADMIN 검증
    if (user.role !== "ADMIN") {
      const error = new Error("관리자 권한이 없습니다.");
      error.status = 403;
      return next(error); // req.login 호출 안 함 → 세션/토큰 생성 안 됨
    }

    req.login(user, (loginError) => {
      if (loginError) {
        loginError.status = 500;
        loginError.message = "로그인 중 오류 발생";
        return next(loginError);
      }
      const token = signJwt(user);
      return res.json({
        success: true,
        message: "관리자 로그인 성공",
        token,
        user: {
          id: user.id,
          userId: user.userId,
          name: user.name,
          role: user.role,
        },
      });
    });
  })(req, res, next);
});

// ───────── 회원 정보 수정 (유저) ─────────
router.patch("/edit", isLoggedIn, async (req, res, next) => {
  try {
    const user = await User.findOne({ where: { id: req.user.id } });
    const { address, email, name, phoneNumber, newPassword } = req.body;
    console.log("-------------프론트와 통신 성공");
    if (!user) {
      const error = new Error("회원 정보가 존재하지 않습니다.");
      error.status = 404;
      return next(error);
    }
    console.log("user데이터 확인 완료");
    if (newPassword) {
      user.password = bcrypt.hash(newPassword, 12);
    }
    user.address = address;
    user.email = email;
    user.name = name;
    user.phoneNumber = phoneNumber;

    await user.save();
    console.log("user데이터 수정 완료");
    res.status(200).json({
      success: true,
      message: "회원 정보 수정이 완료되었습니다.",
    });
  } catch (e) {
    e.status = 500;
    e.message = "회원 정보 수정 중 오류";
    return next(e);
  }
});

// 아이디 찾기
router.post("/:email", async (req, res, next) => {
  try {
    const { email } = req.query;
    const user = await User.findOne({ where: email });
    if (!user) {
      const err = new Error("회원 정보가 존재하지 않습니다.");
      err.status = 404;
      next(err);
    }
  } catch (err) {
    err.status = 500;
    err.message = "아이디 조회 중 오류";
    return next(err);
  }
});

// 임시 비밀번호 발급
router.get("/:userId", async (req, res, next) => {
  try {
    const { userId } = req.query;
    const user = await User.findOne({ where: userId });
    if (!user) {
      const err = new Error("존재하지 않는 ID입니다.");
      err.status = 404;
      next(err);
    }
  } catch (err) {
    err.status = 500;
    err.message = "임시 비밀번호 발급 중 오류";
    return next(err);
  }
});

// ───────── 세션 로그인 상태에서 JWT 재발급 ─────────
router.post("/token", isLoggedIn, (req, res) => {
  const token = signJwt(req.user);
  return res.json({ token });
});

// ───────── 소셜 로그인 (구글/카카오) ─────────
const parseScopes = (s = "") =>
  s
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
const GOOGLE_SCOPES = parseScopes(process.env.GOOGLE_SCOPE || "profile,email");
const KAKAO_SCOPES = parseScopes(
  process.env.KAKAO_SCOPE || "profile_nickname,account_email"
);

router.get(
  "/google",
  passport.authenticate("google", { scope: GOOGLE_SCOPES })
);
router.get("/google/callback", (req, res, next) => {
  passport.authenticate("google", (err, user, info) => {
    if (err) {
      err.status = 500;
      err.message = "구글 인증 중 오류 발생";
      return next(err);
    }
    if (!user) {
      const e = new Error(info?.message || "구글 로그인 실패");
      e.status = 401;
      return next(e);
    }
    req.login(user, (loginError) => {
      if (loginError) {
        loginError.status = 500;
        loginError.message = "구글 로그인 세션 처리 중 오류 발생";
        return next(loginError);
      }
      const token = signJwt(user);
      return res.json({
        success: true,
        message: "구글 로그인 성공",
        token,
        user: {
          id: user.id,
          userId: user.userId,
          name: user.name,
          role: user.role,
        },
      });
    });
  })(req, res, next);
});

router.get("/kakao", passport.authenticate("kakao", { scope: KAKAO_SCOPES }));
router.get("/kakao/callback", (req, res, next) => {
  passport.authenticate("kakao", (err, user, info) => {
    if (err) {
      err.status = 500;
      err.message = "카카오 인증 중 오류 발생";
      return next(err);
    }
    if (!user) {
      const e = new Error(info?.message || "카카오 로그인 실패");
      e.status = 401;
      return next(e);
    }
    req.login(user, (loginError) => {
      if (loginError) {
        loginError.status = 500;
        loginError.message = "카카오 로그인 세션 처리 중 오류 발생";
        return next(loginError);
      }
      const token = signJwt(user);
      return res.json({
        success: true,
        message: "카카오 로그인 성공",
        token,
        user: {
          id: user.id,
          userId: user.userId,
          name: user.name,
          role: user.role,
        },
      });
    });
  })(req, res, next);
});

// ───────── 중복확인 API ─────────
router.post("/check-username", async (req, res, next) => {
  try {
    const userId = String(req.body.userId || "").trim();

    if (!userId || !USERID_REGEX.test(userId)) {
      const err = new Error(
        "userId 형식이 올바르지 않습니다. (4~20자 영문/숫자)"
      );
      err.status = 400;
      return next(err);
    }
    const exists = await User.findOne({ where: { userId } });
    return res.json({ available: !exists });
  } catch (e) {
    e.status = 500;
    e.message = "아이디 중복 확인 중 오류";
    return next(e);
  }
});

router.post("/check-nickname", async (req, res, next) => {
  try {
    const name = String(req.body.name || "").trim();
    if (!name || !NICK_REGEX.test(name)) {
      const err = new Error(
        "닉네임 형식이 올바르지 않습니다. (공백 없는 2~20자)"
      );
      err.status = 400;
      return next(err);
    }
    const exists = await User.findOne({ where: { name } });
    return res.json({ available: !exists });
  } catch (e) {
    e.status = 500;
    e.message = "닉네임 중복 확인 중 오류";
    return next(e);
  }
});

router.post("/check-email", async (req, res, next) => {
  try {
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();
    if (!email) {
      const err = new Error("이메일을 입력하세요.");
      err.status = 400;
      return next(err);
    }
    const exists = await User.findOne({ where: { email } });
    return res.json({ available: !exists });
  } catch (e) {
    e.status = 500;
    e.message = "이메일 중복 확인 중 오류";
    return next(e);
  }
});

// ───────── 로그아웃/상태 ─────────
router.get("/logout", isLoggedIn, (req, res, next) => {
  req.logout((logoutError) => {
    if (logoutError) {
      logoutError.status = 500;
      logoutError.message = "로그아웃 중 오류 발생";
      return next(logoutError);
    }
    return res.json({ success: true, message: "로그아웃에 성공했습니다." });
  });
});

router.get("/status", async (req, res, next) => {
  try {
    if (req.isAuthenticated?.() && req.user) {
      return res.status(200).json({
        isAuthenticated: true,
        user: {
          id: req.user.id,
          userId: req.user.userId,
          name: req.user.name,
          role: req.user.role,
        },
      });
    }
    return res.status(200).json({ isAuthenticated: false });
  } catch (error) {
    error.status = 500;
    error.message = "로그인 상태확인 중 오류가 발생했습니다.";
    return next(error);
  }
});

// ✅ 로그인된 유저 정보를 반환 (새로고침 시 프론트 리덕스 초기화 → 여기로 복구)
router.get("/me", (req, res) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    const { id, userId, name, address, phoneNumber, email, role } = req.user;
    return res.json({
      user: { id, userId, name, address, phoneNumber, email, role },
    });
  }
  return res.status(401).json({ user: null });
});

module.exports = router;
