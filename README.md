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
🔗 [ERD 설계 링크](https://www.erdcloud.com/d/f3jnTmAkShKLQgXhi)

📁 레포 구조
```bash
RE-Earth-api/
├─ node_modules/              # 프로젝트에서 사용하는 모든 외부 라이브러리들이 설치되는 디렉토리
├─ src/                       # 서버 애플리케이션 핵심 소스 코드
│  ├─ auth/                   # 인증(Authentication) 관련 로직 모음
│  │  └─ passport/            # Passport.js 전략(구글, 카카오, 로컬 로그인 등) 정의
│  ├─ config/                 # 환경 변수, DB 연결, 로거, Swagger 등 설정 파일
│  ├─ models/                 # Sequelize ORM 모델 정의 (DB 테이블 매핑)
│  ├─ routes/                 # Express 라우터: REST API 엔드포인트 정의
│  │  ├─ admin/               # 관리자(admin) 전용 라우트
│  │  └─ routes_swagger/      # Swagger API 문서 라우트
│  │     └─ admin/            # 관리자 전용 Swagger 문서
│  ├─ utils/                  # 재사용 유틸리티 함수 (JWT, geo 계산 등)
├─ uploads/                   # multer 등을 통해 업로드된 이미지/파일 저장 위치

```
## 👥 브랜치 전략

-  `main`: 배포용
-  `develop`: 통합 개발 브랜치
-  `hcm` : 한창민
-  `jsy` : 정세연
-  `jse` : 정송이
-  `ysy` : 윤승영

> 모든 기능 개발은 **개별 브랜치에서 수행 후**,  
> 반드시 `develop` 브랜치 기준으로 **PR(Pull Request)** 을 생성해주세요.

---

## 🔀 브랜치 작업 및 Push 방법

### 1. 브랜치 최초 이동

```bash
git checkout -t origin/브랜치이름

# 예
git checkout -t origin/hcm

# 이후 작업할 때는
git checkout 브랜치이름

# 최초 Push 연결
git push --set-upstream origin 브랜치이름

# 이후부터는 그냥 git push 만 해도 됩니다.
```

---

## 🌿 신규 브랜치 생성 규칙

✅ 브랜치 전략은 협업의 중심입니다.
원활한 관리와 통합을 위해 가이드에 따라 작업해주세요 🙌

기능이 세분화되거나 테스트/임시 작업이 필요한 경우, 아래 규칙에 따라 **개별 브랜치에서 파생 브랜치**를 생성할 수 있습니다.

### ✅ 브랜치 네이밍 규칙

[이니셜]-[작업유형]-[기능이름]
예시:

-  `jsy-feat-popup` → 정세연 님이 팝업 기능 개발
-  `hcm-fix-login-bug` → 한창민 님이 로그인 버그 수정
-  `jse-test-api-token` → 정송이 님이 토큰 API 테스트

### ✅ 브랜치 생성 명령어

```bash
git checkout -b 본인지명-작업유형-기능명
git push -u origin 본인지명-작업유형-기능명
예:
git checkout -b jsy-feat-chat-ui
git push -u origin jsy-feat-chat-ui
```

> ❗ 브랜치를 새로 생성할 때는 팀 리더와 간단히 공유 후 작업해주세요.
> 작업 완료 후에는 develop 브랜치 기준으로 Pull Request를 생성합니다.

---
## ✍️ Git 커밋 메시지 작성 규칙

커밋 메시지는 형식과 내용을 명확하게 작성해야 협업 시 변경 내역을 빠르게 파악할 수 있습니다.
아래 형식을 따라 작성해주세요:

### ✅ 기본 형식

```bash
git commit -m "[태그] 작업한 내용 요약"

# 예:
git commit -m "[feat] 로그인 API 구현"
git commit -m "[fix] 장바구니 오류 수정"
git commit -m "[style] 버튼 정렬 개선"
```

---

### ✅ 커밋 태그 종류

| 태그       | 설명                                        |
| ---------- | ------------------------------------------- |
| `feat`     | 새로운 기능 추가                            |
| `patch`    | 간단한 수정 (줄바꿈, 줄추가, 정렬 등)       |
| `fix`      | 버그 수정                                   |
| `refactor` | 코드 리팩토링 (기능 변화 없음)              |
| `style`    | 스타일, 포맷팅, 주석 등 UI 외 변경          |
| `docs`     | 문서 (README 등) 변경                       |
| `test`     | 테스트 코드 추가/수정                       |
| `chore`    | 빌드, 패키지 매니저, 설정 파일 등 기타 작업 |
| `remove`   | 불필요한 코드/파일 제거                     |

---

### ✅ 커밋 메시지 팁

-  커밋 메시지는 **한 줄 요약**, 50자 이내 권장
-  작업 내용을 명확히 드러내는 동사를 사용
-  PR 리뷰자가 한눈에 파악할 수 있도록 작성

---

### 💬 예시

-  [feat] 상품 상세 페이지 레이아웃 구현
-  [fix] 로그인 실패 시 에러 메시지 표시
-  [refactor] useEffect 로직 정리
-  [style] ChartPage 컴포넌트 마진 조정
-  [test] orderSlice 테스트 코드 작성
-  [chore] ESLint 룰 추가 및 적용
-  [docs] README.md에 커밋 규칙 추가
