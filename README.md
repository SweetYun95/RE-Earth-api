# 🌍 RE:Earth-api
이 프로젝트는 Node.js + Express 기반의 **핀테크·ESG 백엔드**입니다.  
탄소 절감 활동을 통해 포인트를 적립하고, 포인트샵/기부/아나바다 장터(회원 간 거래)를 지원합니다.  
JWT 인증, 기부/거래 처리, Swagger 문서화, 실시간 알림 기능 등을 포함합니다.  
각 팀원이 담당 브랜치에서 기능을 개발하고, 완성 후 `develop` 브랜치로 병합합니다.  

---

## 1) 프로젝트 개요 (Introduction)

- RE:Earth Backend는 **ESG 친화적 핀테크 서비스**를 위한 서버 애플리케이션입니다.
- **탄소 절감 데이터**(대중교통, 분리수거, 리사이클링 등)를 기반으로 포인트를 적립합니다.
- 적립된 포인트는 **포인트샵**, **기부 시스템**, **아나바다 장터(회원 간 물물교환/거래)**에서 활용할 수 있습니다.
- Swagger 문서, JWT 인증, 소켓 알림을 통해 안정적인 서비스 경험을 제공합니다.

---

## 2) 기술 스택 (Tech Stack)

- Runtime / Framework: **Node.js, Express**
- DB / ORM: **MySQL, Sequelize**
- Auth: **Passport(Local, Google OAuth), JWT**
- Docs: **Swagger (OpenAPI)**
- Real-time: **Socket.io**
- Infra/Etc.: dotenv, AWS(배포 시), GitHub Projects

---

## 3) 주요 기능 (Features)

- **회원가입/로그인** (로컬, 구글 OAuth)
- **포인트 관리**  
  - 탄소 절감 활동 기반 포인트 적립 (대중교통, 재활용 API 연동)  
  - 포인트 사용 (포인트샵 구매, 기부, 장터 거래)  
- **기부 시스템**: ESG 단체 기부 및 기록 조회
- **아나바다 장터**: 회원 간 중고거래 및 물물교환
- **포인트샵**: ESG 관련 상품 구매
- **리뷰/거래 후기** 관리
- **토큰 발급/검증 및 보호 라우트**
- **Swagger 기반 API 문서 제공** (/api-docs)

---

## 4) 시스템 아키텍처 / ERD (Architecture & DB)

```bash
[Client] ⇄ [Express API] ⇄ [MySQL]
            ↑     ↓
        [Swagger] [Socket.io]
```
🔗 ERD 설계 링크 (추가 예정)

📁 레포 구조

/config — DB 및 서버 설정 (config.json, 환경별 설정 등)

/models — ORM 모델 정의

user.js, point.js, donation.js, marketItem.js, trade.js, order.js 등

/passport — Passport를 활용한 인증 전략

/routes — API 라우터 정의

auth.js, point.js, donation.js, market.js, order.js 등

/routes_swagger — Swagger 명세 포함 라우터

/swagger.js — Swagger UI 연결 및 설정

/socket.js — 실시간 소켓 통신

/utils — 유틸리티 함수 (포인트 계산, 토큰 생성 등)

.env — 환경 변수

app.js — 서버 진입점

👥 브랜치 전략

main: 최종 배포 브랜치

develop: 통합 개발 브랜치

hcm: 한창민

jsy: 정세연

jse: 정송이

ysy: 윤승영

모든 기능 개발은 개별 브랜치에서 수행 후,
반드시 develop 브랜치 기준으로 PR(Pull Request) 을 생성해주세요.
```bash
🔀 브랜치 작업 및 Push 방법
1. 브랜치 최초 이동
git checkout -t origin/브랜치이름
# 최초 Push 연결
git push --set-upstream origin 브랜치이름
git push -u origin ysy
```

이후에는 git push만 입력하면 됩니다.

🌿 신규 브랜치 생성 규칙

[이니셜]-[작업유형]-[기능이름]
예:

jsy-feat-donation → 정세연 님이 기부 기능 개발

hcm-fix-point-bug → 한창민 님이 포인트 적립 오류 수정

jse-test-market-trade → 정송이 님이 장터 거래 테스트

> ✍️ Git 커밋 메시지 작성 규칙
> ✅ 기본 형식 git commit -m "[태그] 작업한 내용 요약"

✅ 커밋 태그 종류

feat : 새로운 기능 추가

fix : 버그 수정

refactor : 코드 리팩토링

style : 스타일/UI 변경

docs : 문서 수정

test : 테스트 코드 추가/수정

chore : 설정, 빌드 관련

remove : 불필요한 코드/파일 제거

🌱 예시

[feat] 기부 API 구현

[fix] 포인트 적립 오류 수정

[refactor] 마켓 거래 로직 리팩토링

[docs] README에 브랜치 규칙 추가
