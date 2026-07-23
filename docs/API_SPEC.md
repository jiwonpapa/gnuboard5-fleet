# Gnuboard5 PHP REST API 명세서

> **버전**: v1 | **베이스 URL**: `/api/v1`

> [!IMPORTANT]
> **프로젝트 범위: 커뮤니티 전용**
> 본 API는 그누보드5의 **커뮤니티 기능**(게시판·회원·댓글·포인트·파일·메뉴·FAQ 등)만을 대상으로 합니다.
> 영카트 쇼핑몰 소비자 API(`shop/`)는 본 프로젝트 범위에서 제외합니다.
> 다만 영카트 관리자 단(`adm/shop_admin/`)은 레거시 분석, API 포팅, 필드 정합성 감사 대상입니다.
> 쇼핑몰 소비자 API 확장이 필요하면 별도 프로젝트로 분리해야 합니다.

## 제0장: API 개발 헌법 및 아키텍처 원칙

1. **Rust급 에러 통제 및 로깅 (No Raw PHP Errors)**
   - PHP 네이티브 에러/스택트레이스는 클라이언트로 절대 노출하지 않는다.
   - 최상단 글로벌 미들웨어에서 모든 예외를 공통 처리해 `RFC 7807`(`type`, `status`, `title`, `detail`)만 반환한다.
   - 동시에 서버에는 `로그 파일`에 발생 지점, 요청 페이로드, 스택트레이스, 요청 ID를 즉시 기록해 디버깅 시간을 최소화한다.

2. **도메인별 DDL 스키마 문서화 강제**
   - Auth, Board, Post, Comment, File, Like, Member, Point, Config, Menu 등 **각 도메인 착수 전** `docs/ddls/*.md` 최신화를 필수로 한다.
   - 엔드포인트는 해당 도메인 문서의 DDL 규약(필드, 키, 조인, 동적 테이블 정책)을 기준으로 구현한다.

3. **CI/CD + TDD 기반 배포 자동화**
   - 배포 스크립트는 PHPUnit 단위테스트를 반드시 파이프라인에 포함한다.
   - 테스트 통과율이 100%가 아니면 프로덕션 빌드/패키징(`vendor` 포함 배포물 생성)을 실행하지 않는다.
   - 개별 수동 확인만으로 배포를 진행하지 않으며 `composer run ci:local` 전체 게이트를 통과해야 한다.

## 1. 개요 및 계약 운영 전략
* **지원 환경**: PHP 8.1 이상 필수 (8.1의 최신 문법 및 컴포저 패키지 제약 반영)
* **공개 계약 SSOT**: `/api/v1/**` 상세 HTTP 계약은 `api/docs/openapi.yaml`을 기준으로 관리합니다.
* **본 문서의 역할**: `docs/API_SPEC.md`는 OpenAPI를 보조하는 사람용 문서이며, 정책·인증·오류 포맷·레거시 호환 경로·운영 예외를 설명합니다.
* **문서 제공**: 저장소에는 `api/docs/openapi.yaml` 원본을 유지하고, 배포 환경에서는 `/api/docs/index.html` 엔드포인트로 Swagger UI를 제공합니다.
* **운영 예외 경로**: `/api/v1/**` 밖 공개 진입점은 OpenAPI SSOT 바깥에서 별도 문서화하며, 현재 예외는 `GET /setup` 1건입니다.
* **인증 방식**: JWT (JSON Web Token) Bearer 타입 (`Authorization: Bearer <token>`)
* **하드코딩 방지**: 커밋/배포 전 `./scripts/check_hardcoding.sh`를 실행해 로컬 절대경로, 민감 설정 하드코딩, API 코드 내 URL/IP 리터럴 유입을 차단합니다.
* **배포 게이트**: `./scripts/build_release_package.sh` 및 `./scripts/deploy_staging.sh`는 `php -l` + OpenAPI/schema 검사 + hardcoding 검사 + `composer audit` + PHPStan + PHPUnit coverage 게이트를 통과해야 진행됩니다.
* **배포 보안 규칙**: `.env`는 Git/패키지/rsync 대상이 아니며, 가능하면 웹루트 밖 경로를 `APP_ENV_FILE` 또는 `API_ENV_FILE`로 주입합니다. 웹루트에 둘 경우 Apache/Nginx에서 `/.env*`, `/composer.json`, `/composer.lock` 접근을 차단해야 합니다.
* **계약 테스트**: 연동계층 계약/실패 시나리오는 `tests/contract/g5-repository/`에서 관리합니다.
* **DDL 거버넌스**: 도메인별 스키마 계약은 `docs/ddls/` 문서군을 기준으로 작성하며, 신규 도메인 착수 전 관련 DDL 문서를 업데이트해야 합니다.
* **플러그인 구현 기준**: 강제 규약은 `docs/architecture/PLUGIN_IMPLEMENTATION_STANDARD.md`, 실무 예시는 `docs/architecture/PLUGIN_DEVELOPER_GUIDE.md`를 따릅니다.
* **개발 철학**: DD3 원칙 — SDD(스펙 주도), DDD(도메인 주도), TDD(테스트 주도) + 외부 의존성 내재화. 상세 정의는 [Constitution.md](../.agent/Constitution.md) 제1조 참조.

---

## 2. 상용 API 솔루션으로서의 4가지 핵심 무기 (Core Architecture)

1. **의존성 선설치 후 동봉 배포 (판매/릴리스 정책)**
   * 판매용/릴리스용 압축 배포 시 의존성은 개발/CI 환경에서 `composer install --no-dev --optimize-autoloader`로 설치하여 `vendor`를 생성합니다.
   * 판매/릴리스 패키지에는 `composer.json`, `composer.lock`(존재 시), `vendor`를 **함께 포함**하여 업로드합니다.
   * 국내 웹호스팅의 Composer 미지원 환경을 고려해, 서버에서 Composer 실행이 불가능해도 동작해야 합니다.
2. **코어 수정 제로 (Hook 최대로 활용)**
   * 그누보드 원본 코어 코드는 **단 한 줄도 수정해서는 안 됩니다.**
   * API 라우터, 인증 로직 등 모든 기능은 철저히 그누보드의 내장 **Hook 기능** 만을 이용하여 완벽하게 독립적인 플러그인(또는 extend) 형태로 동작해야 합니다.
3. **CORS 방어막 기본 탑재**
   * 프론트엔드(React, Vue 등)나 모바일 앱 개발자들이 타 도메인에서 접근하는 것이 기본이므로, 범용적인 **CORS 허용 미들웨어**와 **Preflight (OPTIONS)** 처리 로직이 꼼꼼하게 내장되어야 합니다.
4. **JWT Secret Key 자동화**
   * 보안 사고 방지를 위해 사용자가 직접 키를 관리하게 두지 않습니다.
   * 플러그인 최초 설치/활성화 시, 안전한 난수의 Secret Key를 생성하여 그누보드 DB 설정 테이블(`g5_config` 등)에 자동으로 저장 및 로드되도록 구성합니다.

---

## 3. REST API 설계 원칙 및 기본 컨벤션 (Design Guidelines)

본 API 솔루션은 프론트엔드 및 모바일 앱(Flutter, React Native 등)과의 유연한 통신을 위해 리처드슨 성숙도 모델(Richardson Maturity Model) Level 2 이상을 준수하여 설계되었습니다.

### 3.1. URI 네이밍 규칙 (Naming Convention)
* **명사 및 복수형 사용**: URI는 동작(동사)이 아닌 자원(명사)의 복수형으로 표기합니다.
  * ❌ `/api/v1/getBoardList` (동사 배제)
  * ⭕ `/api/v1/boards` (복수형 명사)
* **계층 구조 표현**: 자원 간의 종속성은 슬래시(`/`)로 표현하며, 최대 2뎁스 이하로 유지하여 복잡도를 낮춥니다.
  * ⭕ `/api/v1/boards/{bo_table}/posts/{wr_id}`
* **소문자 및 하이픈**: URI는 소문자로 작성하며, 단어 구분은 하이픈(`-`)을 사용합니다 (Kebab-case).

### 3.2. HTTP 메서드 활용 (HTTP Methods)
자원에 대한 행위는 URI가 아닌 HTTP 메서드로만 정의합니다.
* **GET**: 자원 조회 (멱등성 보장)
* **POST**: 신규 자원 생성
* **PUT**: 자원 전체 교체 (수정)
* **PATCH**: 자원 부분 수정 (상태 변경, 조회수 증가 등 제한적 업데이트)
* **DELETE**: 자원 삭제 (그누보드 원본 동작 기준의 물리 삭제 + 연관 리소스 정리)

### 3.3. 공통 응답 포맷 (Response Envelope)
클라이언트의 일관된 파싱을 위해, 모든 성공 응답은 최상단에 `data` (또는 목록용 `data` + `pagination`) 키와 부가 `meta` 키를 포함하는 엔벨롭(Envelope) 패턴을 강제합니다.

```json
{
  "data": {
    "bo_table": "notice",
    "bo_subject": "공지사항"
  },
  "meta": {
    "server_time": "2026-03-04T13:06:00+09:00",
    "version": "v1.0.0"
  }
}
```
*에러 발생 시에는 위 포맷 대신 RFC 7807 (Problem Details) 표준 포맷을 단독으로 반환합니다.*

### 3.4. 페이징 및 정렬 표준 (Pagination & Sorting)
목록 조회 시 파라미터 파편화를 막기 위해 아래의 쿼리스트링 규격을 공통으로 사용합니다.
* `page`: 현재 페이지 번호 (기본값: 1)
* `per_page`: 페이지당 노출 레코드 수 (기본값: 20, 최대 100)
* `sort`: 정렬 기준. 내림차순은 `-` 기호를 접두어로 사용합니다. (예: `?sort=-wr_id,wr_hit`)
* `cursor`: 대용량 데이터 조회를 위한 커서 기반 페이징 식별자. 지원 엔드포인트에서는 `cursor`가 전달되면 `page` 기반 pagination 대신 keyset pagination을 사용합니다.

---

## 4. 구조 및 코어 베이스 라이브러리 스택

이 API 솔루션은 가볍고 빠르며 독립적인 마이크로 컴포넌트를 조합하여 구축됩니다. 핵심 스택은 다음과 같습니다.

* **라우팅 및 미들웨어**: `slim/slim` (^4.13) 및 `slim/psr7` (^1.6)
  * **목적:** REST API 구축에 최적화된 마이크로 프레임워크로, 미들웨어 체이닝(CORS, JWT)이 강력합니다.
* **JWT 인증**: `firebase/php-jwt` (^6.10)
  * **목적:** 가볍고 확실한 PHP JWT 업계 표준 라이브러리입니다.
* **입력값 검증 (Validator)**: `rakit/validation` (^1.4)
  * **목적:** 컴팩트하고 프레임워크 종속성 없는 검증 라이브러리로, 지저분한 레거시 입력값을 컨트롤러단에서 깔끔하게 1차 필터링합니다.
* **계약 문서 관리**: `api/docs/openapi.yaml` + `docs/API_SPEC.md`
  * **목적:** `/api/v1/**` 공개 계약은 OpenAPI에 고정하고, 본 문서는 정책/예외/운영 설명을 보조합니다.

### 디렉토리 구조 (배포 기준)

그누보드 최상위 루트에 `/api` 폴더를 배치하고, 로컬/CI에서 Composer로 생성한 `vendor`를 포함해 배포하는 독립 구조입니다.

```text
/api
├── /v1
│   ├── /Controllers   (비즈니스 로직: Auth, Board, Post 등)
│   ├── /Middlewares   (JWT 검증, CORS 방어, Rate Limit)
│   ├── /Services      (도메인 비즈니스 로직)
│   ├── /Repositories  (G5 DB 접근 전담)
│   └── /Models        (DTO/Entity 및 응답 매핑 구조)
├── /docs              (Swagger UI html 및 정적 파일)
├── /vendor            (로컬/CI의 composer install 결과물을 배포에 동봉)
├── routes.php         (엔드포인트 라우팅 정의)
└── index.php          (단일 진입점 - Front Controller)
```

---

## 5. 도메인별 비즈니스 로직 및 API 명세

### DDL 레퍼런스
- 전체 인덱스: [docs/ddls/README.md](./ddls/README.md)
- API Tables: [docs/ddls/api_tables.md](./ddls/api_tables.md)
- Auth: [docs/ddls/auth.md](./ddls/auth.md)
- Board: [docs/ddls/board.md](./ddls/board.md)
- Comment: [docs/ddls/comment.md](./ddls/comment.md)
- Config: [docs/ddls/config.md](./ddls/config.md)
- Content: [docs/ddls/content.md](./ddls/content.md)
- FAQ: [docs/ddls/faq.md](./ddls/faq.md)
- File: [docs/ddls/file.md](./ddls/file.md)
- Group: [docs/ddls/group.md](./ddls/group.md)
- Like: [docs/ddls/like.md](./ddls/like.md)
- Mail: [docs/ddls/mail.md](./ddls/mail.md)
- Member: [docs/ddls/member.md](./ddls/member.md)
- Memo: [docs/ddls/memo.md](./ddls/memo.md)
- Menu: [docs/ddls/menu.md](./ddls/menu.md)
- New Window/Popup: [docs/ddls/new_win.md](./ddls/new_win.md)
- Point: [docs/ddls/point.md](./ddls/point.md)
- Poll: [docs/ddls/poll.md](./ddls/poll.md)
- Popular: [docs/ddls/popular.md](./ddls/popular.md)
- Post: [docs/ddls/post.md](./ddls/post.md)
- Push/Notification: [docs/ddls/push_notification.md](./ddls/push_notification.md)
- QA: [docs/ddls/qa.md](./ddls/qa.md)
- SDUI Layout: [docs/ddls/sdui_layout.md](./ddls/sdui_layout.md)
- Report/Block: [docs/ddls/report_block.md](./ddls/report_block.md)
- Scrap: [docs/ddls/scrap.md](./ddls/scrap.md)
- SMS: [docs/ddls/sms.md](./ddls/sms.md)
- Visit: [docs/ddls/visit.md](./ddls/visit.md)

### 운영 예외 엔드포인트 (`/api/v1` 밖)

* **[GET] `/setup` (설치 점검)**
  * **범위**: `/api/v1/**` 공개 계약 SSOT 바깥의 운영 예외 경로
  * **활성 조건**: `SETUP_ENABLED=true|1|yes|on`일 때만 응답하고, 그 외에는 `404 Not Found`
  * **설명**: PHP 버전, PDO 확장, `.env` 필수 키, DB 연결, `g5_member` 존재, `DATA_PATH` 권한, `JWT_SECRET` 길이, `SETUP_ENABLED=false` 잠금 여부를 점검합니다.
  * **운영 배치**: `.env`는 기본적으로 프로젝트 루트의 `.env`를 읽되, 서버가 `APP_ENV_FILE` 또는 `API_ENV_FILE`를 주입하면 그 외부 경로를 우선 사용합니다.
  * **Response 200**: `{ "data": { "checks": [...], "setup_complete": true|false }, "meta": { "server_time": "...", "version": "1.0.0" } }`
  * **운영 규칙**: 설치 또는 진단이 끝나면 반드시 `SETUP_ENABLED=false`로 되돌려 외부 노출을 차단합니다.

### 🔐 1. Auth (인증 도메인)

* **[GET] `/api/v1/health` (헬스 체크)**
  * **설명**: API 가용성 점검.
  * **Response 200**: `{ "status": "ok", "version": "1.0.0" }`

**비즈니스 로직**: `g5_member` 테이블 기반 비밀번호 해시 검증, 로그인 상태 관리, 세션 의존도를 낮춘 JWT 엑세스/리프레시 토큰 발급.
* **비밀번호 정책**: 그누보드 코어의 `login_password_check()` 및 `check_password()` 검증 흐름과 호환되어야 합니다. 레거시 `sql_password` 해시와 신규 `create_hash` 해시를 모두 검증 가능해야 하며, API 계층에서 독자 해시 규격을 추가하지 않습니다.
* **환경변수 정책**: `G5_ENCRYPT_FUNC`는 원본 `config.php`의 `G5_STRING_ENCRYPT_FUNCTION`와 동일해야 하며, 허용 값은 `create_hash` 또는 `sql_password`만 사용합니다.

* **[POST] `/api/v1/auth/login` (로그인)**
  * **설명**: 아이디와 비밀번호를 검증하여 JWT 발급. 로그인 일자(`mb_today_login`) 갱신.
  * **Request (Body)**:
    * `mb_id` (string, 필수): 회원 아이디
    * `mb_password` (string, 필수): 평문 비밀번호
  * **Response 200**: `{ "data": { "access_token": "...", "refresh_token": "...", "expires_in": 3600 } }`
  * **Error 401**: 계정 정보 불일치
  * **추가 규칙**: `cf_use_email_certify=1`이고 이메일 미인증 상태면 로그인 차단.
  * **추가 규칙**: 로그인 성공 시 `g5_point` 합계를 재계산하여 `mb_point`를 동기화.

* **[POST] `/api/v1/auth/refresh` (토큰 갱신)**
  * **설명**: 리프레시 토큰을 검증하고 신규 토큰 쌍을 발급합니다. 기존 리프레시 토큰은 즉시 폐기(회전)됩니다.
  * **Request (Body)**: `refresh_token` (string, 필수)
  * **Response 200**: 신규 `access_token`, `expires_in`

* **[POST] `/api/v1/auth/logout` (로그아웃)**
  * **Auth**: 필수
  * **설명**: 현재 Access 토큰을 폐기하고, 요청 바디의 `refresh_token`이 있으면 함께 폐기합니다.
  * **Request (Body)**: `refresh_token` (string, 옵션)
  * **Response 200**: `{ "data": { "logged_out": true, "revoked": { "access": true, "refresh": true|false } } }`

* **[POST] `/api/v1/auth/password-reset-requests` (비밀번호 재설정 요청)**
  * **설명**: 이메일 기준으로 비밀번호 재설정 토큰을 발급합니다. 존재 여부 노출을 막기 위해 기본 응답은 동일합니다.
  * **Request (Body)**:
    * `mb_email` (string, 필수)
    * `mb_id` (string, 옵션): 동일 이메일 계정이 여러 개인 경우 필수
  * **Response 200**: `{ "data": { "accepted": true } }`
  * **보안 정책**: 응답 본문에서 `mb_id` 등 계정 식별자는 반환하지 않습니다.
  * **추가 규칙**: 동일 이메일 계정이 2건 이상이면 `mb_id`를 함께 받아야 하며, 누락 시 `400`을 반환합니다.
  * **추가 규칙**: 관리자(`mb_level >= 10`) 계정은 비밀번호 찾기 대상에서 제외합니다.
  * **토큰 만료**: `AUTH_PASSWORD_RESET_TTL_SECONDS` (기본 1800초)
  * **발송 정책**: `AUTH_MAIL_SEND_ENABLED=true`이면 재설정 토큰/링크를 이메일로 발송합니다.
  * **레거시 호환 경로**: `POST /api/v1/auth/password/reset/request`
  * **범위 메모**: 본인인증 기반 비밀번호 재설정은 아직 이 경로에 포함하지 않으며, 공급자 정책이 정해진 뒤 `AUTH-304/305` 외부 인증 foundation 후속 범위에서만 추가합니다.

* **[POST] `/api/v1/auth/password-resets` (비밀번호 재설정 확정)**
  * **설명**: 재설정 토큰으로 신규 비밀번호를 적용합니다.
  * **Request (Body)**: `mb_id`, `reset_token`, `new_password` (모두 필수)
  * **Response 200**: `{ "data": { "password_reset": true } }`
  * **레거시 호환 경로**: `POST /api/v1/auth/password/reset/confirm`

* **[POST] `/api/v1/auth/email-verification-requests` (이메일 인증 토큰 발급)**
  * **Auth**: 필수
  * **설명**: 현재 회원의 이메일 인증 토큰을 갱신합니다. `mb_email` 전달 시 이메일 변경 후 토큰을 발급합니다.
  * **Request (Body)**: `mb_email` (string, 옵션)
  * **Response 200**: `{ "data": { "accepted": true } }`
  * **레거시 호환 경로**: `POST /api/v1/auth/email/verify/request`

* **[POST] `/api/v1/auth/email-reverification-requests` (미인증 이메일 재발송/변경 요청)**
  * **Auth**: 불필요
  * **설명**: 이메일 인증이 끝나지 않아 로그인할 수 없는 회원이 `mb_id + mb_password`로 본인 확인 후 인증 메일을 재발송하거나, `mb_email`을 함께 보내 인증 대상 이메일을 변경합니다.
  * **Request (Body)**:
    * `mb_id` (string, 필수): 회원 아이디
    * `mb_password` (string, 필수): 현재 비밀번호
    * `mb_email` (string, 옵션): 변경할 이메일
  * **Response 200**: `{ "data": { "accepted": true } }`
  * **추가 규칙**: 이메일 인증이 이미 끝난 계정은 동일 응답으로 수용하고 추가 토큰을 발급하지 않습니다.
  * **추가 규칙**: `mb_email`을 전달하면 중복 이메일 검사를 수행하고, 통과 시 인증 대상 이메일을 변경합니다.

* **[POST] `/api/v1/auth/email-verifications` (이메일 인증 확정)**
  * **설명**: 인증 토큰 검증 후 `mb_email_certify`를 확정합니다.
  * **Request (Body)**: `mb_id`, `verify_token` (필수)
  * **Response 200**: `{ "data": { "email_verified": true } }`
  * **토큰 만료**: `AUTH_EMAIL_VERIFY_TTL_SECONDS` (기본 86400초)
  * **발송 정책**: `AUTH_MAIL_SEND_ENABLED=true`이면 인증 토큰/링크를 이메일로 발송합니다.
  * **레거시 호환 경로**: `POST /api/v1/auth/email/verify/confirm`

* **[GET] `/api/v1/auth/availability/member-id` (회원 아이디 사용 가능 여부 확인)**
  * **설명**: 회원가입 전에 `mb_id` 형식/금지어/중복 여부를 확인합니다.
  * **Query**: `value` (string, 필수)
  * **Response 200**: `{ "data": { "type": "member_id", "input": "...", "normalized_value": "...", "available": true|false, "reason": "available|already_taken|invalid|blocked", "message": "..." } }`
  * **Error 400**: `value` 쿼리 파라미터 누락

* **[GET] `/api/v1/auth/availability/nick` (닉네임 사용 가능 여부 확인)**
  * **설명**: 닉네임 길이/금지어/중복 여부를 확인합니다.
  * **Query**: `value` (string, 필수)
  * **Response 200**: `{ "data": { "type": "nick", "input": "...", "normalized_value": "...", "available": true|false, "reason": "available|already_taken|invalid|blocked", "message": "..." } }`
  * **Error 400**: `value` 쿼리 파라미터 누락

* **[GET] `/api/v1/auth/availability/email` (이메일 사용 가능 여부 확인)**
  * **설명**: 이메일 형식/중복 여부를 확인합니다.
  * **Query**: `value` (string, 필수)
  * **Response 200**: `{ "data": { "type": "email", "input": "...", "normalized_value": "...", "available": true|false, "reason": "available|already_taken|invalid", "message": "..." } }`
  * **Error 400**: `value` 쿼리 파라미터 누락

* **[GET] `/api/v1/auth/availability/phone` (휴대폰 번호 사용 가능 여부 확인)**
  * **설명**: 휴대폰 번호 형식/중복 여부를 확인합니다.
  * **Query**: `value` (string, 필수)
  * **Response 200**: `{ "data": { "type": "phone", "input": "...", "normalized_value": "...", "available": true|false, "reason": "available|already_taken|invalid", "message": "..." } }`
  * **Error 400**: `value` 쿼리 파라미터 누락

* **[GET] `/api/v1/auth/availability/recommender` (추천인 사용 가능 여부 확인)**
  * **설명**: 추천인 기능 활성화 여부와 추천인 아이디 존재 여부를 확인합니다.
  * **Query**: `value` (string, 필수)
  * **Response 200**: `{ "data": { "type": "recommender", "input": "...", "normalized_value": "...", "available": true|false, "reason": "available|feature_disabled|invalid|not_found", "message": "..." } }`
  * **Error 400**: `value` 쿼리 파라미터 누락

* **[POST] `/api/v1/auth/register` (회원가입)**
  * **설명**: 신규 회원을 등록합니다. 그누보드 코어의 해시 로직으로 비밀번호를 저장하며, 가입 즉시 JWT를 발급합니다.
  * **Request (Body)**:
    * `mb_id` (string, 필수): 회원 아이디 (3~20자, 영숫자+언더스코어)
    * `mb_password` (string, 필수): 비밀번호 (8자 이상)
    * `mb_name` (string, 필수): 이름
    * `mb_nick` (string, 필수): 닉네임
    * `mb_email` (string, 필수): 이메일
    * `mb_hp` (string, 옵션): 휴대폰 번호 (`01x` 형식, 중복 불가)
    * `mb_mailling` (boolean, 옵션): 이메일 수신 동의
    * `mb_sms` (boolean, 옵션): SMS 수신 동의
    * `mb_open` (boolean, 옵션): 정보공개 여부
    * `mb_homepage` (string, 옵션): 홈페이지 URL
    * `mb_tel` (string, 옵션): 일반 전화번호
    * `mb_zip` (string, 옵션): 우편번호(레거시 호환 입력)
    * `mb_zip1` (string, 옵션): 우편번호 앞 3자리
    * `mb_zip2` (string, 옵션): 우편번호 뒤 3자리
    * `mb_addr1` (string, 옵션): 주소
    * `mb_addr2` (string, 옵션): 상세주소
    * `mb_addr3` (string, 옵션): 참고항목
    * `mb_addr_jibeon` (string, 옵션): 지번/도로명 구분값 `R|J`
    * `mb_signature` (string, 옵션): 서명
    * `mb_profile` (string, 옵션): 자기소개
    * `mb_recommend` (string, 옵션): 추천인 아이디
    * `mb_marketing_agree` (boolean, 옵션): 마케팅 수신 동의
    * `mb_thirdparty_agree` (boolean, 옵션): 제3자 제공 동의
  * **비즈니스 로직**: 아이디/이메일/닉네임 중복 검증(`g5_member`), 금지어 필터링, 포인트 적립.
  * **추가 규칙**: `mb_birth`, `mb_sex`, `mb_certify`, `mb_adult`, `mb_dupinfo` 같은 본인확인 필드는 공개 회원가입 API에서 직접 받을 수 없고, 보내면 `403`을 반환합니다.
  * **닉네임 정책**: 한글 포함 닉네임 2자 이상, 영문/숫자 전용 닉네임 4자 이상.
  * **입력 정규화**: 회원가입 텍스트 입력값은 저장 전 XSS 위험 태그를 제거(서버측 sanitize)합니다.
  * **추천인 정책**: `cf_use_recommend=1`일 때 추천인 존재/본인추천 금지 검증 후 `cf_recommend_point`를 추천인에게 적립합니다.
  * **휴대폰 정책**: `mb_hp`가 전달되면 형식/중복 검증을 수행합니다.
  * **관리자 알림 메일**: `AUTH_REGISTER_NOTIFY_ADMIN_EMAIL` 설정 + `AUTH_MAIL_SEND_ENABLED=true`일 때 관리자에게 가입 알림을 발송합니다.
  * **Response 201**: `{ "data": { "mb_id": "...", "access_token": "...", "refresh_token": "..." } }`
  * **Error 409**: 아이디/이메일/닉네임 중복
  * **비밀번호 정책**: `PASSWORD_REQUIRE_COMPLEXITY=true`일 때 영문/숫자/특수문자 조합 + 연속문자 금지를 적용합니다.
* **잔여 범위 메모**: Auth/Member 공개 범위의 사전검사는 availability 엔드포인트로 닫혔습니다. CAPTCHA는 baseline rate limit 유지 후 provider 토큰 검증 adapter가 준비되면 `AUTH-304/305` 범위에서만 도입하고, 소셜 로그인은 외부 인증 foundation 후속 범위로 유지합니다.

---

### 📋 2. Board (게시판 메타 도메인)
**비즈니스 로직**: 게시판(`g5_board`)의 설정 정보, 카테고리(`bo_category_list`), 읽기/쓰기 권한 레벨(`bo_read_level`, `bo_write_level`) 조회.

* **[GET] `/api/v1/boards` (게시판 목록)**
  * **설명**: 활성화된 전체 게시판 및 그룹화 조회. 사용자 레벨에 따른 접근 가능한 목록만 필터링 기능 제공.
  * **Query**: 
    * `group_id` (string, 옵션): 그룹별 조회
  * **Response 200**:
    ```json
    { "data": [{
        "bo_table": "free",
        "bo_subject": "자유게시판",
        "gr_id": "community",
        "bo_read_level": 1,
        "bo_write_level": 2,
        "bo_comment_level": 1,
        "bo_use_category": 0,
        "bo_category_list": "",
        "bo_count_write": 1523,
        "bo_count_comment": 4201
    }] }
    ```

* **[GET] `/api/v1/boards/new-posts` (최근 게시글/댓글 목록)**
  * **Auth**: 선택 (JWT 있으면 작성자 마스킹/권한 체크 보강)
  * **설명**: `g5_board_new` 기반 최근 게시물 타임라인 조회.
  * **Query**:
    * `page` (integer, 기본 1)
    * `per_page` (integer, 기본 `cf_new_rows`, 최대 100)
    * `cursor` (string, 옵션): keyset pagination 식별자. 전달되면 `page` 대신 사용
    * `bo_table` (string, 옵션): 특정 게시판만 조회
    * `view` (enum, 옵션: `w` | `c`): 글/댓글 필터
    * `wr_id` (integer, 옵션): 특정 원글 기준 필터
    * `mb_id` (string, 옵션): 특정 작성자 필터
  * **Response 200**: 최근글 배열 + `pagination`
  * **Pagination**: 기본은 `total/page/per_page/last_page/has_next/has_prev`, `cursor` 사용 시 `mode=cursor`, `cursor`, `next_cursor`, `has_next`

* **[GET] `/api/v1/boards/{bo_table}` (게시판 상세)**
  * **설명**: 특정 게시판의 카테고리 목록, 권한 수준, 쓰기 설정(html/secret 허용 등) 등 스킨 표시에 필요한 메타 정보 조회.
  * **Response 200**: 위 목록 응답의 단일 객체 + `bo_use_secret`, `bo_use_dhtml_editor`, `bo_upload_count`, `bo_upload_size` 등 추가 필드 포함

---

### 📝 3. Post (게시글 도메인)
**비즈니스 로직**: 동적 테이블(`g5_write_*`) 라우팅, 공지사항(`bo_notice`), 비밀글 제어, 추천/비추천 동시성 제어, 조회수(`wr_hit`) 증가 룰.

* **[GET] `/api/v1/boards/{bo_table}/posts` (게시글 목록)**
  * **설명**: 공지사항 상단 노출 로직 처리, 페이징 데이터 포맷 준수. 삭제/대기 상태인 글 필터링.
  * **Query**: 
    * `page` (integer, 기본 1): 페이지 파라미터 
    * `per_page` (integer, 기본 20): 페이지당 노출 글 수
    * `category` (string, 옵션): 특정 카테고리 필터링 
    * `search_field` (enum, 옵션: `title`, `content`, `title_content`, `author`, `comment`): 검색 필드 (*Constitution 기준과 동기화*)
    * `search` (string, 옵션): 검색 키워드 (*Constitution 기준과 동기화*)
    * `sort` (string, 옵션): 쉼표 구분 정렬 필드, `-` 접두사는 내림차순
  * **Response 200**: 게시글 배열 (댓글수 `wr_comment`, 추천수 `wr_good` 포함) 및 `pagination`

* **[GET] `/api/v1/boards/{bo_table}/posts/{wr_id}` (게시글 상세)**
  * **설명**: 게시판 권한 검증 및 비밀글 접근성 확인 후 반환. 첫 조회 시 조회수 1 증가 (`g5_write_*` 테이블의 `wr_hit` 컬럼 직접 업데이트). DB에 없는 로그 테이블 허구 참조 방지.
  * **Response 200**: OpenAPI `Post`의 24개 공개 필드만 반환하며 내부 `wr_password`와 미문서 DB 컬럼은 포함하지 않습니다.

* **[POST] `/api/v1/boards/{bo_table}/posts` (게시글 작성)**
  * **Auth**: 필수 (게시판 `bo_write_level` 이상 권한 필요)
  * **Body**: 
    * `wr_subject` (string, 필수): 글 제목
    * `wr_content` (string, 필수): 본문 내용
    * `ca_name` (string, 옵션): 카테고리
    * `wr_option` (string, 옵션): 적용 옵션 컴마 구분 (`html1`, `secret` 등)
  * **비즈니스 제약**: XSS 필터, 포인트 차감/적립 로직 반영(`g5_point`).
  * **Response 201**: 생성된 게시글 ID 및 Location 헤더 반환

* **[PUT] `/api/v1/boards/{bo_table}/posts/{wr_id}` (게시글 본문 수정)**
  * **Auth**: 필수 (작성자 본인 또는 관리자만 수정 가능)
  * **Request (Body)**: `wr_subject`, `wr_content`, `ca_name`, `wr_option`, `wr_link1`, `wr_link2`, `is_notice` 중 1개 이상
  * **Response 200**: 수정된 게시글 데이터

* **[DELETE] `/api/v1/boards/{bo_table}/posts/{wr_id}` (게시글 삭제)**
  * **Auth**: 필수 (작성자/관리자)
  * **비즈니스 로직**: 물리 삭제(`DELETE FROM g5_write_*`)를 원칙으로 합니다. 원본 그누보드 로직에 따라 관련 댓글, 첨부파일(`g5_board_file`), 추천/비추천 이력을 함께 정리하고 작성자 포인트를 회수합니다. 이미 삭제된 리소스 재요청은 `404`를 반환하여 멱등성을 유지합니다.
  * **Response 204**: 빈 바디

* **[POST] `/api/v1/boards/{bo_table}/posts/{wr_id}/good` (추천)**
  * **Auth**: 필수
  * **Body**: `type` (enum: `good` | `nogood`, 필수)
  * **비즈니스 로직**: `g5_board_good` 테이블에 이력 기록, `g5_write_*`의 `wr_good`/`wr_nogood` 컬럼 +1 증가. 이미 추천/비추천한 경우 `409 Conflict` 반환.
  * **Response 200**: `{ "data": { "wr_good": 15, "wr_nogood": 2 } }`

* **[POST] `/api/v1/boards/{bo_table}/posts/{wr_id}/reply` (답글 작성)**
  * **Auth**: 필수
  * **Body**: `wr_subject`, `wr_content` (필수), `wr_option` (옵션)
  * **비즈니스 로직**: 원글 존재/권한 검증 후 `wr_parent` 계층 규칙으로 답글 생성.
  * **Response 201**: 생성된 답글 식별자/메타

* **[POST] `/api/v1/boards/{bo_table}/posts/{wr_id}/scrap` (스크랩 추가)**
  * **Auth**: 필수
  * **비즈니스 로직**: 동일 회원-동일 게시글 중복 스크랩은 `409 Conflict`.
  * **Response 201**: 스크랩 생성 결과

* **[DELETE] `/api/v1/boards/{bo_table}/posts/{wr_id}/scrap` (스크랩 해제)**
  * **Auth**: 필수
  * **Response 204**: 빈 바디

* **[GET] `/api/v1/members/me/scraps` (내 스크랩 목록 조회)**
  * **Auth**: 필수
  * **Query**: `page`, `per_page`, `cursor`
  * **Response 200**: 스크랩 목록 + `pagination`
  * **Pagination**: `cursor` 사용 시 `mode=cursor`, `cursor`, `next_cursor`, `has_next`

* **[GET] `/api/v1/boards/{bo_table}/posts/{wr_id}/link/{link_no}` (본문 링크 열기 추적)**
  * **Auth**: 선택
  * **설명**: 게시글 링크 슬롯(`wr_link1~2`) 검증 후 리다이렉트/카운트 반영.
  * **Response 302/200**: 링크 오픈 결과

---

### 💬 4. Comment (댓글 도메인)
**비즈니스 로직**: 원본 게시글 종속 검증, 코멘트 계층형 뎁스(`wr_comment_reply`) 처리.

* **[GET] `/api/v1/boards/{bo_table}/posts/{wr_id}/comments` (댓글 목록)**
  * **설명**: 계층형 정렬 (`wr_comment`, `wr_comment_reply` 순) 적용하여 트리를 그려 응답.

* **[POST] `/api/v1/boards/{bo_table}/posts/{wr_id}/comments` (댓글 작성)**
  * **Auth**: 필수 (`bo_comment_level` 권한)
  * **Request**:
    * `wr_content` (string, 필수): 댓글 본문
    * `parent_comment_id` (integer, 옵션): 대댓글인 경우 부모 댓글 ID
  * **비즈니스 로직**: 게시글의 `wr_comment` 카운트 +1 증가 트리거, 부모 댓글 검증, 포인트 적립.
  * **Response 201**: 작성된 댓글 데이터

* **[PUT] `/api/v1/boards/{bo_table}/posts/{wr_id}/comments/{comment_id}` (댓글 수정)**
  * **Auth**: 필수 (작성자 본인 또는 관리자)
  * **Request**: `wr_content` (string, 필수)
  * **Response 200**: 수정된 댓글 데이터

* **[DELETE] `/api/v1/boards/{bo_table}/posts/{wr_id}/comments/{comment_id}` (댓글 삭제)**
  * **Auth**: 필수 (작성자/관리자)
  * **비즈니스 로직**: 물리 삭제, 게시글의 `wr_comment` 카운트 -1 처리, 포인트 회수.
  * **Response 204**: 빈 바디

---

### 👤 5. Member (회원 계정 도메인)
**비즈니스 로직**: 회원 정보 노출 범위 보안 처리, 포인트 및 활동 이력 제공. 내 정보와 타 유저 프로필 조회 분리.

* **[GET] `/api/v1/members/me` (내 스펙 조회)**
  * **Auth**: 필수 (JWT)
  * **Response 200**:
    ```json
    { "data": {
        "mb_id": "user01",
        "mb_name": "홍길동",
        "mb_nick": "낚시꾼",
        "mb_email": "user01@example.com",
        "mb_level": 2,
        "mb_point": 1500,
        "mb_homepage": "",
        "mb_zip": "",
        "mb_zip1": "",
        "mb_zip2": "",
        "mb_addr1": "",
        "mb_today_login": "2026-03-04T10:00:00+09:00",
        "mb_datetime": "2025-01-15T09:30:00+09:00"
    } }
    ```

* **[PATCH] `/api/v1/members/me` (내 정보 수정)**
  * **Auth**: 필수
  * **사전 검증**: `mb_password_current`(현재 비밀번호) 필수.
  * **허용 필드 화이트리스트**: 아래 필드만 수정 가능. 그 외 필드(`mb_id`, `mb_level`, `mb_point` 등) 전송 시 `403`.
    * `mb_password_current` (string, 필수): 현재 비밀번호
    * `mb_password` (string, 옵션): 신규 비밀번호
    * `mb_nick` (string, 옵션): 닉네임
    * `mb_email` (string, 옵션): 이메일
    * `mb_hp` (string, 옵션): 휴대폰 번호 (`01x` 형식, 중복 불가)
    * `mb_tel` (string, 옵션): 일반 전화번호
    * `mb_homepage` (string, 옵션): 홈페이지
    * `mb_zip` (string, 옵션): 우편번호(레거시 호환 입력)
    * `mb_zip1` (string, 옵션): 우편번호 앞 3자리
    * `mb_zip2` (string, 옵션): 우편번호 뒤 3자리
    * `mb_addr1` (string, 옵션): 주소
    * `mb_addr2` (string, 옵션): 상세주소
    * `mb_addr3` (string, 옵션): 참고항목
    * `mb_addr_jibeon` (string, 옵션): 지번/도로명 구분값 `R|J`
    * `mb_mailling` (boolean, 옵션): 이메일 수신 동의
    * `mb_sms` (boolean, 옵션): SMS 수신 동의
    * `mb_open` (boolean, 옵션): 정보공개 여부
    * `mb_marketing_agree` (boolean, 옵션): 마케팅 수신 동의
    * `mb_thirdparty_agree` (boolean, 옵션): 제3자 제공 동의
    * `mb_signature` (string, 옵션): 서명
    * `mb_profile` (string, 옵션): 프로필
    * `mb_1` ~ `mb_10` (string, 옵션): 커스텀 필드
  * **비즈니스 로직**: 이메일/닉네임 중복 검증, 수정 불가 필드 방어.
  * **추가 규칙**: `mb_birth`, `mb_sex`, `mb_certify`, `mb_adult`, `mb_dupinfo` 같은 본인확인 필드는 공개 수정 API에서 직접 변경할 수 없고, 보내면 `403`을 반환합니다.
  * **추가 규칙**: 이메일 변경 시 인증상태(`mb_email_certify`, `mb_email_certify2`)를 초기화합니다.
  * **추가 규칙**: 이메일 변경 시 인증토큰을 재발급하고, `AUTH_MAIL_SEND_ENABLED=true`일 때 인증 메일을 재발송합니다.
  * **추가 규칙**: `mb_open` 변경 시 `mb_open_date`를 갱신합니다.
  * **추가 규칙**: `mb_mailling`, `mb_sms`, `mb_marketing_agree`, `mb_thirdparty_agree` 변경 시 각각의 일자 컬럼과 `mb_agree_log`를 함께 갱신합니다.
  * **Response 200**: 수정된 회원 정보

* **[DELETE] `/api/v1/members/me` (회원 탈퇴)**
  * **Auth**: 필수
  * **Request (Body)**: `mb_password` (string, 필수)
  * **비즈니스 로직**: 비밀번호 재검증 후 탈퇴 처리(`mb_leave_date` 기록), 관리자 계정 탈퇴 금지.
  * **Response 200**: `{ "data": { "mb_id": "...", "withdrawn": true, "leave_date": "YYYYMMDD" } }`

* **[POST] `/api/v1/members/me/icon` (내 아이콘 업로드)**
  * **Auth**: 필수
  * **Request (Multipart/form-data)**: `icon` 또는 `mb_icon` 또는 `file`
  * **규칙**: `gif/jpg/png`만 허용, `cf_member_icon_size`, `cf_member_icon_width`, `cf_member_icon_height` 제한 적용.
  * **추가 규칙**: 크기 초과 시 `jpg/png`는 리사이즈를 시도하고 실패 시 업로드를 거부합니다.
  * **저장 경로**: `data/member/{mb_id[0:2]}/{mb_id}.gif`
  * **Response 200**: 저장 경로/크기/이미지 메타

* **[DELETE] `/api/v1/members/me/icon` (내 아이콘 삭제)**
  * **Auth**: 필수
  * **Response 200**: `{ "data": { "deleted": true|false, ... } }`

* **[POST] `/api/v1/members/me/image` (내 프로필 이미지 업로드)**
  * **Auth**: 필수
  * **Request (Multipart/form-data)**: `image` 또는 `mb_img` 또는 `file`
  * **규칙**: `gif/jpg/png`만 허용, `cf_member_img_size`, `cf_member_img_width`, `cf_member_img_height` 제한 적용.
  * **추가 규칙**: 크기 초과 시 `jpg/png`는 리사이즈를 시도하고 실패 시 업로드를 거부합니다.
  * **저장 경로**: `data/member_image/{mb_id[0:2]}/{mb_id}.gif`
  * **Response 200**: 저장 경로/크기/이미지 메타

* **[DELETE] `/api/v1/members/me/image` (내 프로필 이미지 삭제)**
  * **Auth**: 필수
  * **Response 200**: `{ "data": { "deleted": true|false, ... } }`

* **[GET] `/api/v1/members/{mb_id}` (공개 프로필 조회)**
  * **Auth**: 선택 (JWT가 있으면 관리자 레벨(`mb_level=10`) 예외 정책 적용, 없으면 공개 프로필 기준)
  * **설명**: 타회원 프로필 조회. 대상 회원이 `mb_open=1`이거나, 조회자가 본인이거나, 관리자(`mb_level=10`)일 때만 조회할 수 있습니다.
  * **Response 200**: 기본 공개 필드 `mb_id`, `mb_nick`, `mb_level`, `mb_point`, `mb_open`, `mb_homepage`, `mb_profile`, `mb_datetime`
  * **추가 규칙**: 관리자 조회자만 `mb_email`을 추가로 받습니다.
  * **Error 403**: 비공개 회원 프로필 접근

---

### ✉️ 5-1. Memo (쪽지 도메인)
**비즈니스 로직**: `g5_memo` 기반 수신/발신함 조회, 미확인 쪽지 집계, 다중 수신자 발송, 수신 열람 시 읽음 처리.

* **[GET] `/api/v1/memos` (내 쪽지함 목록)**
  * **Auth**: 필수
  * **Query**: `kind`(`recv|send`, 기본 `recv`), `page`, `per_page`, `cursor`
  * **Response 200**: 쪽지 목록 + `pagination`
  * **Pagination**: `cursor` 사용 시 `mode=cursor`, `cursor`, `next_cursor`, `has_next`

* **[GET] `/api/v1/memos/unread-count` (안 읽은 쪽지 수)**
  * **Auth**: 필수
  * **Response 200**: `{ "data": { "unread_count": n } }`

* **[GET] `/api/v1/memos/{me_id}` (쪽지 상세)**
  * **Auth**: 필수
  * **Query**: `kind`(`recv|send`)
  * **비즈니스 로직**: 수신함 조회 시 미열람 쪽지는 읽음 처리.
  * **Response 200**: 쪽지 단건

* **[POST] `/api/v1/memos` (쪽지 발송)**
  * **Auth**: 필수
  * **Body**: `me_recv_mb_id`(콤마 구분 다건 허용), `me_memo`
  * **비즈니스 로직**: 수신자 유효성 검증, 발송 포인트 차감, 쪽지 카운트 갱신.
  * **Response 201**: 발송 건수/대상 목록

* **[DELETE] `/api/v1/memos/{me_id}` (쪽지 삭제)**
  * **Auth**: 필수
  * **Response 200**: 삭제 결과

---

### ❓ 5-2. QA (1:1 문의 도메인)
**비즈니스 로직**: `g5_qa_content` 질문/답변/추가질문 라이프사이클 관리, 첨부파일 업로드/다운로드, 상태 전이(`qa_status`) 처리.

* **[GET] `/api/v1/qa` (문의 목록)**
  * **Auth**: 필수
  * **Query**: `page`, `per_page`, `category`, `search_field`, `search`
  * **Response 200**: 문의 목록 + `pagination`

* **[GET] `/api/v1/qa/{qa_id}` (문의 상세)**
  * **Auth**: 필수
  * **Response 200**: 질문/답변/추가질문 포함 상세 데이터

* **[POST] `/api/v1/qa` (질문 등록)**
  * **Auth**: 필수
  * **Request**: `multipart/form-data` (`qa_category`, `qa_subject`, `qa_content`, 첨부 `bf_file[1|2]`)
  * **Response 201**: 생성된 질문 메타

* **[PATCH] `/api/v1/qa/{qa_id}` (질문 수정)**
  * **Auth**: 필수
  * **Request**: `multipart/form-data` (본문/첨부 교체, `bf_file_del[1|2]` 지원)
  * **Response 200**: 수정된 질문 메타

* **[DELETE] `/api/v1/qa/{qa_id}` (질문 삭제)**
  * **Auth**: 필수
  * **Response 204**: 빈 바디

* **[POST] `/api/v1/qa/{qa_id}/answer` (답변 등록)**
  * **Auth**: 필수 (관리자)
  * **Request**: `multipart/form-data` (`qa_subject`, `qa_content`, 첨부 허용)
  * **Response 201**: 생성된 답변 메타

* **[POST] `/api/v1/qa/{qa_id}/related` (추가질문 등록)**
  * **Auth**: 필수
  * **Request**: `multipart/form-data` (`qa_category`, `qa_subject`, `qa_content`, 첨부 허용)
  * **Response 201**: 생성된 추가질문 메타

* **[GET] `/api/v1/qa/{qa_id}/files/{no}/download` (문의 첨부 다운로드)**
  * **Auth**: 필수
  * **Path**: `no`는 `1|2`
  * **Response 200**: 파일 바이너리

* **[DELETE] `/api/v1/admin/qa` (관리자 문의 일괄 삭제)**
  * **Auth**: 관리자 필수
  * **Body**: `qa_ids` (정수 배열)
  * **Response 200**: 삭제 집계 결과

---

### 📁 6. File (미디어 첨부 도메인)
**비즈니스 로직**: 그누보드 레거시 파일 시스템 (`bbs/data/file/{bo_table}/`) 경로 대응 체계 수립, 확장자 및 MIME 타임 이중 검증. 파일 크기 제한.

* **[POST] `/api/v1/files/upload` (파일 폼 업로드)**
  * **Auth**: 필수 (글쓰기 권한)
  * **Request (Multipart/form-data)**: `file` 데이터, `bo_table`(타겟 게시판 정보 필수), `wr_id`(선택, 0이면 신규 글/임시 업로드 대상으로 사용)
  * **비즈니스 로직**: 업로드 후 `g5_board_file`(`bf_source`, `bf_file`)에 삽입할 메타 정보 선행 검증 로직. 유해파일 즉각 파기 체계 적용.
  * **Response 201**: OpenAPI `PostFile`의 16개 공개 메타 필드와 Location 헤더를 반환합니다. 서버 절대경로 `path`는 반환하지 않습니다.

* **[GET] `/api/v1/files/{bo_table}/{wr_id}/{bf_no}` (파일 다운로드)**
  * **Auth**: `bo_download_level` 정책에 따라 선택적(0이면 공개, 1 이상이면 인증 필요)
  * **설명**: 파일 다운로드 요청. `g5_board_file` 테이블에서 메타를 조회하고, 다운로드 카운트(`bf_download`) +1 증가 후 파일을 서빙합니다. 다운로드 포인트 차감 로직 적용.
  * **Response 200**: 파일 바이너리 (Content-Disposition 헤더 포함)

---

### 🛠️ 7. 구현 범위 및 제약

* **현재 구현 범위**: `Auth/Board/Post/Comment/Member/File/Point/Like/Menu/Config/Device/Notification/Layout/Report/Block/Memo/Qa` + `Admin` 도메인까지 구현합니다.
* **관리자 전용 API**: ` /api/v1/admin/* ` 경로는 `JwtAuthMiddleware` + `AdminGuardMiddleware(mb_level=10)`를 공통으로 강제합니다.
* **관리자 구현 도메인 (v1)**:
  * `Board Admin`: `GET/POST/PUT/DELETE /api/v1/admin/boards`, `POST /api/v1/admin/boards/{bo_table}/copy`, `DELETE /api/v1/admin/boards/new-posts`
  * `Group Admin`: `GET/POST/PUT/PATCH/DELETE /api/v1/admin/board-groups`, `GET/POST/DELETE /api/v1/admin/board-groups/{gr_id}/members*`
    * 레거시 호환: `/api/v1/admin/groups*`
    * 생성/수정 body는 closed `AdminGroupCreateRequest`/`AdminGroupUpdateRequest`이며 `gr_device=both|pc|mobile`, `gr_use_access=0|1`을 사용합니다.
    * 그룹 응답은 `gr_id`, `gr_subject`, `gr_admin`, `gr_device`, `gr_use_access`만 반환하고 DB 숫자 플래그를 integer로 정규화합니다.
    * 회원 목록 query는 `page`(기본 1), `per_page`(기본 50, 최대 200), `search`이며 표준/레거시 경로에 동일하게 적용합니다.
  * `Member Admin`: `GET/PATCH/DELETE /api/v1/admin/members`, `GET /api/v1/admin/members/excel`
    * 이미지: `POST/DELETE /api/v1/admin/members/{mb_id}/icon`, `POST/DELETE /api/v1/admin/members/{mb_id}/image`
    * 목록 query: `page`(기본 1), `per_page`(기본 20, 최대 100), `search`, `search_field=all|mb_id|mb_name|mb_nick|mb_email`, `sort_by=mb_id|mb_level|mb_point|mb_datetime`, `sort_direction=ASC|DESC`
    * 수정 body는 closed `AdminMemberUpdateRequest`의 회원 기본·주소·동의·관리자 상태·`mb_1..mb_10` 필드만 허용합니다. `mb_certify_case`는 `mb_certify`의 deprecated 별칭이며 비밀번호는 write-only입니다.
    * 응답은 공개 57개 관리자 회원 필드로 제한합니다. `mb_password`, `mb_email_certify2`, `mb_lost_certify`, `mb_dupinfo` 같은 비밀번호/인증 비밀 컬럼은 반환하지 않습니다.
    * `mb_open` 변경 시 `mb_open_date`, 수신·제3자 동의 플래그 변경 시 대응 일자와 `mb_agree_log`를 같은 수정에서 갱신합니다.
    * 미디어 multipart는 아이콘 `file|icon|mb_icon`, 이미지 `file|image|mb_img` 별칭과 단일 파일 배열 호환을 유지하며 구체 업로드/삭제 결과를 반환합니다.
  * `Config Admin`: `GET/PUT /api/v1/admin/config`
  * `Point Admin`: `GET/POST/DELETE /api/v1/admin/points`
    * `POST /api/v1/admin/points`는 `action=grant|deduct|expire`로 동작
    * 레거시 호환: `POST /api/v1/admin/points/grant`, `POST /api/v1/admin/points/deduct`, `POST /api/v1/admin/points/expire`
    * 통합 action은 `grant|deduct`일 때 `mb_id`, 1 이상의 정수 `point`를 필수로 받고, `expire`일 때 선택 `base_date=YYYY-MM-DD`만 받습니다. 각 body와 레거시 body는 미선언 필드를 거부합니다.
    * 지급·차감 응답은 `before_point`, 부호가 적용된 `changed_point`, `after_point`, `po_content`, `processed_at`을 반환합니다. 삭제는 요청/삭제 건수, 만료는 기준일/만료 행/동기화 회원 수를 반환합니다.
    * 원장 목록은 `g5_point`의 12개 공개 필드(`po_use_point`, `po_expired`, `po_expire_date` 포함)를 모두 고정 타입으로 반환합니다.
  * `Content Admin`: `GET/POST/PUT/DELETE /api/v1/admin/contents`
  * `FAQ Admin`: `GET/POST/PUT/DELETE /api/v1/admin/faqs`, `GET/POST /api/v1/admin/faq-masters`, `GET/PUT/DELETE /api/v1/admin/faq-masters/{fm_id}`
    * 이미지: `POST/DELETE /api/v1/admin/faq-masters/{fm_id}/header-image`, `POST/DELETE /api/v1/admin/faq-masters/{fm_id}/footer-image`
  * `Menu Admin`: `GET/POST/PATCH /api/v1/admin/menus`, `GET/PUT/DELETE /api/v1/admin/menus/{me_id}`
    * 레거시 호환: `PATCH /api/v1/admin/menus/reorder`
    * 생성/수정 body는 closed `MenuCreateRequest`/`MenuUpdateRequest`이며 `me_use`, `me_mobile_use`는 활성 Tauri 소비자와 DB 계약에 맞춘 정수 `0|1`입니다.
    * 생성 기본값은 `me_target=_self`, `me_order=0`, `me_use=1`, `me_mobile_use=1`입니다.
    * 재정렬은 closed `orders[]` 항목의 양수 `me_id`와 0 이상 `me_order`를 요구하며 표준/레거시 경로가 같은 결과를 반환합니다.
    * 메뉴 응답은 `me_id`, `me_code`, `me_name`, `me_link`, `me_target`, `me_order`, `me_use`, `me_mobile_use` 8개 필드를 고정 타입으로 반환합니다.
  * `Schema Admin`: `GET /api/v1/admin/schema`, `GET /api/v1/admin/schema/{domain}`
    * `default_value`는 생성(create) 폼 초기값만 의미하며, 수정(edit) 폼은 상세 조회 응답의 현재값으로 채웁니다.
    * 레거시 폼이 설정값/현재 레코드/헬퍼 함수에 의존하는 필드는 `default_value: null`을 반환할 수 있습니다.
  * `Popular Admin`: `GET/DELETE /api/v1/admin/popular`, `GET /api/v1/admin/popular/rank`
  * `Visit Admin`: `GET /api/v1/admin/visits/stats`, `GET /api/v1/admin/visits/search`, `DELETE /api/v1/admin/visits`
  * `Write Count Admin`: `GET /api/v1/admin/write-count/stats`
  * `System Admin`:
    * 권한: `GET/POST/DELETE /api/v1/admin/system/auths*`
    * 팝업: `GET/POST/PUT/DELETE /api/v1/admin/system/popups*`
    * 투표: `GET/POST/PUT/DELETE /api/v1/admin/system/polls*`
    * QA 설정: `GET/PUT /api/v1/admin/system/qa-config`
    * 테마: `GET/PUT /api/v1/admin/system/theme`, `GET /api/v1/admin/system/themes`, `GET /api/v1/admin/system/themes/{theme}`
    * 메일: `GET /api/v1/admin/system/mails`, `GET /api/v1/admin/system/mail-recipients`, `POST /api/v1/admin/system/mails/test`
    * 회원발송: `POST /api/v1/admin/system/mails/send`
    * 운영 도구: `GET /api/v1/admin/system/phpinfo`
    * 유지보수: `POST /api/v1/admin/system/maintenance/*/purge`, `GET /api/v1/admin/system/browscap`, `POST /api/v1/admin/system/browscap/{update,convert}`
    * 범위 정책: `adm/service.php`는 광고 링크라 제외, `theme_preview.php`는 웹 렌더링 전용, `dbupgrade.php`는 웹/CLI 내부 실행 전용으로 관리
  * `SMS Admin`:
    * 설정/동기화: `GET/PUT /api/v1/admin/sms/config`, `POST /api/v1/admin/sms/member-sync`
    * 템플릿 그룹: `GET/POST /api/v1/admin/sms/template-groups`, `GET/PUT/DELETE /api/v1/admin/sms/template-groups/{fg_no}`, `POST /api/v1/admin/sms/template-groups/{fg_no}/move`, `DELETE /api/v1/admin/sms/template-groups/{fg_no}/templates`
    * 템플릿: `GET/POST /api/v1/admin/sms/templates`, `POST /api/v1/admin/sms/templates/batch`, `GET/PUT/DELETE /api/v1/admin/sms/templates/{fo_no}`
    * 연락처 그룹: `GET/POST /api/v1/admin/sms/contact-groups`, `GET/PUT/DELETE /api/v1/admin/sms/contact-groups/{bg_no}`, `POST /api/v1/admin/sms/contact-groups/{bg_no}/move`, `DELETE /api/v1/admin/sms/contact-groups/{bg_no}/contacts`
    * 연락처: `GET/POST /api/v1/admin/sms/contacts`, `POST /api/v1/admin/sms/contacts/batch`, `POST /api/v1/admin/sms/contacts/import`, `GET /api/v1/admin/sms/contacts/export`, `GET/PUT/DELETE /api/v1/admin/sms/contacts/{bk_no}`
    * 발송/이력: `POST /api/v1/admin/sms/messages`, `GET /api/v1/admin/sms/history/batches`, `GET /api/v1/admin/sms/history/deliveries`, `GET /api/v1/admin/sms/history/batches/{wr_no}`, `POST /api/v1/admin/sms/history/batches/{wr_no}/resend-{failures,all}`
    * 응답 계약: body가 있는 33개 성공 응답은 설정·동기화·템플릿·연락처·발송 이력별 named schema를 사용하며, DB 숫자/플래그와 nullable 문자열을 런타임에서 계약 타입으로 정규화합니다.
    * 관리자 플래그 입력: `fg_member`, `bk_receipt`의 canonical 형식은 Rust 관리자 소비자와 동일한 정수 `0|1`입니다.
    * 범위 정책: 레거시 `adm/sms_admin/*`를 별도 Admin 도메인으로 이관하며, `/admin/push/messages`는 SMS 대체물이 아니라 푸시 큐 경로로 유지합니다.
    * 런타임 토글: `ADMIN_SMS_ENABLED=false`면 SMS 관리자 경로 자체를 등록하지 않아 `404 Not Found`로 비노출합니다. 스테이징 canonical은 `g5_sms5_*` 테이블/icode 운영 준비 전까지 이 모드를 사용합니다.
    * 운영 주의: `g5_sms5_*` 확장 테이블이 설치되지 않은 환경에서는 SMS 상세 기능이 `503 Service Unavailable`로 응답하며, 응답 본문에 누락 테이블명을 함께 제공합니다.

  * `Mail Admin`: `GET /api/v1/admin/mails`, `GET/PUT/DELETE /api/v1/admin/mails/{ma_id}`, `POST /api/v1/admin/mails/templates`, `GET /api/v1/admin/mails/recipients`, `POST /api/v1/admin/mails`, `POST /api/v1/admin/mails/test`
    * 템플릿 기반 발송: `ma_id`를 주면 저장된 메일 제목/본문을 사용하고, 레거시 `ma_last_option`에 해당하는 발송 옵션이 함께 저장됩니다.
    * 템플릿 상세 응답은 `preview_html`과 파싱된 `last_option`을 함께 내려 레거시 `mail_preview.php`, `mail_select_form.php`의 선행 데이터를 대체합니다.
    * 템플릿 쓰기의 canonical 필드는 `ma_subject/ma_content`이며 기존 `subject/content` 쌍도 deprecated 별칭으로 유지합니다. 미선언 JSON 필드는 400으로 거부합니다.
    * 발송 요청은 `target_type=all|level|group|member`와 템플릿 `ma_id` 또는 직접 `subject/content`를 사용합니다. `mailling_only` 기본값은 `true`, `dry_run` 기본값은 `false`입니다.
    * 테스트 발송은 canonical `/admin/mails/test`와 레거시 `/admin/mail-tests`가 같은 `to + (ma_id | subject/content)` 계약과 `ma_id/template_used/mail_enabled/sent/to` 결과를 사용합니다.
    * 목록·상세·수신자·발송 결과는 모두 closed named schema이며, DB 문자열 숫자와 0/1 플래그는 런타임 Presenter에서 계약 타입으로 정규화합니다.
  * `Push Admin`: `POST /api/v1/admin/push/messages`
    * 레거시 호환: `POST /api/v1/admin/push/send`
  * `Layout Admin`: `GET /api/v1/admin/layouts`, `GET/PUT /api/v1/admin/layouts/{page_id}`, `POST/PATCH /api/v1/admin/layouts/{page_id}/widgets`, `PATCH/DELETE /api/v1/admin/layouts/{page_id}/widgets/{widget_id}`
    * 위젯 순서 변경의 표준 경로는 `PATCH /api/v1/admin/layouts/{page_id}/widgets`
    * 레거시 호환: `PATCH /api/v1/admin/layouts/{page_id}/reorder`
  * `Report Admin`: `GET /api/v1/admin/reports`, `PATCH /api/v1/admin/reports/{report_id}`, `GET /api/v1/admin/reports/stats`
  * `QA Admin`: `DELETE /api/v1/admin/qa`

---

### ⚙️ 7. Config & System (환경 설정 도메인)
**비즈니스 로직**: 그누보드 전역 설정(`g5_config`), 약관, 관리자 지정 메뉴 등을 프론트엔드에 제공.

* **[GET] `/api/v1/config` (기본 환경 설정 조회)**
  * **설명**: 사이트 이름, 포인트 정책, 회원가입 약관, 게시판 전역 기본 설정 등을 조회합니다. 민감한 시스템 키나 관리자 전용 설정은 제외합니다.
  * **Response 200**:
    ```json
    { "data": {
        "cf_title": "나의 사이트",
        "cf_add_script": "",
        "cf_register_point": 1000,
        "cf_use_point": 1,
        "cf_login_point": 100,
        "cf_write_point": 10,
        "cf_comment_point": 5,
        "cf_use_email_certify": 0,
        "cf_register_level": 2,
        "cf_stipulation": "약관 내용...",
        "cf_privacy": "개인정보처리방침..."
    } }
    ```
    > **제외 필드** (API 응답에 절대 포함 금지): `cf_admin`, JWT Secret, DB 접속정보, SMTP 설정 등

* **[GET] `/api/v1/menus` (네비게이션 메뉴 조회)**
  * **설명**: 관리자에서 설정한 메뉴 구조(`g5_menu` 테이블 기반)를 계층형으로 렌더링하여 프론트엔드 네비게이션용 데이터로 제공합니다.

### 🧾 8. Point (포인트 도메인)
**비즈니스 로직**: 회원별 포인트 누적/변경 이력(`g5_point`) 조회 및 정렬 제공.

* **[GET] `/api/v1/members/me/points` (내 포인트 히스토리 조회)**
  * **Auth**: 필수 (JWT)
  * **Query**:
    * `page` (integer, 기본 1)
    * `per_page` (integer, 기본 20, 최대 100)
    * `cursor` (string, 옵션): keyset pagination 식별자. 전달되면 `page` 대신 사용
  * **Response 200**:
    * `data`: 포인트 내역 배열
    * `pagination`: 기본은 `total`, `page`, `per_page`, `last_page`, `has_next`, `has_prev`
    * `pagination(cursor)`: `mode`, `cursor`, `next_cursor`, `per_page`, `has_next`

---

### 🔔 9. Push/Notification (디바이스·알림 도메인)
**비즈니스 로직**: 기기 토큰(`g5_push_device`) 등록/해제, 알림 이력(`g5_push_log`) 조회, 개인 수신설정(`g5_push_setting`) 관리.

* **[POST] `/api/v1/devices` (디바이스 토큰 등록)**
  * **Auth**: 필수
  * **Body**: `token`(필수), `platform`(`fcm` | `apns`)
  * **Response 201**: 등록/갱신된 디바이스 메타

* **[DELETE] `/api/v1/devices/{token}` (디바이스 토큰 해제)**
  * **Auth**: 필수
  * **Response 204**: 빈 바디

* **[GET] `/api/v1/members/me/notifications` (내 알림 이력)**
  * **Auth**: 필수
  * **Query**: `page`, `per_page`, `cursor`
  * **Response 200**: 알림 목록 + pagination
  * **Pagination**: `cursor` 사용 시 `mode=cursor`, `cursor`, `next_cursor`, `has_next`

* **[PATCH] `/api/v1/members/me/notifications/settings` (알림 수신 설정)**
  * **Auth**: 필수
  * **Body**: `receive_comment`, `receive_message`, `receive_notice` (boolean)
  * **Response 200**: 현재 저장된 수신 설정

* **[POST] `/api/v1/admin/push/messages` (관리자 수동 발송 큐잉)**
  * **Auth**: 관리자 필수
  * **Body**: `title`, `body`, `type`, (`target=all` 또는 `member_ids[]`)
  * **Response 200**: `requested_by`, `target_count`, `queued`, `failed`
  * **레거시 호환 경로**: `POST /api/v1/admin/push/send`

---

### 📣 9-1. Public Poll/Popup (공개 노출 컴포넌트)
**비즈니스 로직**: 앱/웹 메인에서 사용하는 공개 투표/팝업 노출 API. 운영자(Admin)가 등록한 데이터만 읽기/참여 처리.

* **[GET] `/api/v1/polls/active` (진행중 투표 조회)**
  * **Auth**: 선택 (JWT)
  * **설명**: 현재 활성 투표 1건과 투표 가능 여부(`can_vote`) 반환.
  * **Response 200**: `active`, `can_vote`, `poll`. `poll.po_etc`는 0/1 플래그가 아니라 기타의견 질문 문자열이며 빈 문자열이면 비활성입니다.

* **[POST] `/api/v1/polls/{po_id}/vote` (투표 참여)**
  * **Auth**: 선택 (회원레벨 요구 시 로그인 필요)
  * **Body**: canonical `poll_no` (1~9), 선택적 `po_etc_text`; 레거시 호환은 `gb_poll`, `pc_idea`를 허용하되 canonical/legacy 같은 의미의 필드를 동시에 보내면 400을 반환합니다.
  * **비즈니스 로직**: 동일 IP/회원 중복 투표 차단, 설정된 참여 포인트(`po_point`) 적립. `po_etc_text`는 투표의 `po_etc` 질문 문자열이 비어 있지 않을 때만 저장합니다.
  * **Response 200**: `voted`, `po_id`, `poll_no`, `choice`

* **[GET] `/api/v1/polls/{po_id}/result` (투표 결과 조회)**
  * **Auth**: 선택
  * **Response 200**: 문항별 득표/비율, 기타의견 집계

* **[GET] `/api/v1/popups/active` (활성 팝업 조회)**
  * **Auth**: 불필요
  * **Query**: `device`(`pc|mobile|both`), `division`(`comm|shop|both|layer|new`)
  * **Response 200**: `now`, `device`, `division`, `items[]`

---

### 🧩 10. SDUI Layout (동적 레이아웃 도메인)
**비즈니스 로직**: 페이지별 레이아웃 스키마(`g5_sdui_layout.sl_schema`)를 JSON으로 관리하고 위젯 단위 조회/수정.

* **[GET] `/api/v1/layouts/{page_id}`**
  * **설명**: 페이지 레이아웃 전체 스키마 조회
  * **Response 200**: `page_id`, `title`, `updated_at`, `widgets[]`

* **[GET] `/api/v1/layouts/{page_id}/widgets/{widget_id}/data`**
  * **설명**: 특정 위젯 데이터 조회
  * **Response 200**: `widget_id`, `type`, `config`, `style`, `data`

* **[GET] `/api/v1/admin/layouts`**
  * **설명**: 관리자 레이아웃 목록 조회 (pagination)
  * **Response 200**: `AdminLayoutListResponse` (`data[].sl_id/sl_page_id/sl_title/sl_active/sl_datetime/sl_updated`)

* **[GET] `/api/v1/admin/layouts/{page_id}`**
  * **설명**: 특정 레이아웃 상세 조회
  * **Response 200**: `AdminLayoutDetailResponse` (`data.sl_schema`는 JSON 문자열)

* **[PUT] `/api/v1/admin/layouts/{page_id}`**
  * **설명**: 레이아웃 전체 저장 (widgets 배열 교체)
  * **Body**: closed `AdminLayoutSaveRequest`; `widgets[]`는 `widget_id`, `type`, 선택 `title/order/config/style`

* **[POST] `/api/v1/admin/layouts/{page_id}/widgets`**
  * **설명**: 위젯 신규 추가
  * **Body**: closed `AdminLayoutWidgetCreateRequest`; `type` 필수, `widget_id` 생략 시 서버 생성

* **[PATCH] `/api/v1/admin/layouts/{page_id}/widgets/{widget_id}`**
  * **설명**: 위젯 설정 부분 수정
  * **Body**: closed `AdminLayoutWidgetUpdateRequest`; `type/title/order/config/style` 중 1개 이상

* **[DELETE] `/api/v1/admin/layouts/{page_id}/widgets/{widget_id}`**
  * **설명**: 위젯 삭제

* **[PATCH] `/api/v1/admin/layouts/{page_id}/widgets`**
  * **Body**: closed `AdminLayoutWidgetReorderRequest`의 `widget_ids` 배열
  * **설명**: 위젯 순서 재정렬
  * **레거시 호환 경로**: `PATCH /api/v1/admin/layouts/{page_id}/reorder`

---

### 🚨 11. UGC Moderation (신고/차단 도메인)
**비즈니스 로직**: 사용자 신고(`g5_report`) 접수/상태처리, 사용자 차단(`g5_user_block`) 관리.

* **[POST] `/api/v1/reports`**
  * **Auth**: 필수
  * **Body**: `target_type`(`post|comment|member`), `target_id`, `reason`, `detail`
  * **비즈니스 제약**: 동일 사용자-동일 대상 중복 신고는 `409 Conflict`

* **[GET] `/api/v1/blocks`**
  * **Auth**: 필수
  * **설명**: 내 차단 목록 조회 (pagination)
  * **Query**: `page`, `per_page`, `cursor`
  * **Pagination**: `cursor` 사용 시 `mode=cursor`, `cursor`, `next_cursor`, `has_next`

* **[POST] `/api/v1/blocks`**
  * **Auth**: 필수
  * **Body**: `blocked_mb_id`
  * **비즈니스 제약**: 본인 계정 차단 금지

* **[DELETE] `/api/v1/blocks/{mb_id}`**
  * **Auth**: 필수
  * **설명**: 차단 해제

* **[GET] `/api/v1/admin/reports`**
  * **Auth**: 관리자 필수
  * **Query**: `status`, `target_type`, `page`, `per_page`

* **[PATCH] `/api/v1/admin/reports/{report_id}`**
  * **Auth**: 관리자 필수
  * **Body**: `status`(`pending|approved|rejected|hold`), `admin_memo`

* **[GET] `/api/v1/admin/reports/stats`**
  * **Auth**: 관리자 필수
  * **설명**: 상태별 건수 + total

---

### 🔌 11-1. Plugin Sample & SDK (플러그인 샘플 도메인)

**비즈니스 로직**: 플러그인은 `/api/v1/p/{plugin_name}/...` 경로 하위에서만 동작하며, `manifest.json`의 `scopes`에 선언된 Gateway만 접근할 수 있습니다.
**경로 해석 주의**: `api/plugins/{Vendor}/{Plugin}/`는 저장소 내부 폴더 구조이고, 외부 공개 API 경로는 `/api/v1/p/{plugin_name}/...`입니다. 예를 들어 `api/plugins/Wolchuck/PremiumPush/` 플러그인의 공개 경로는 `/api/v1/p/premium-push/...`입니다.

* **경로 예약 규칙**
  * 플러그인 엔드포인트는 반드시 `/api/v1/p/{plugin_name}/...` 패턴을 사용합니다.
  * `plugin_name`은 디렉토리명 `Plugin`의 PascalCase가 아니라 `manifest.json.name`의 kebab-case 값을 사용합니다.
  * 코어 경로(`/api/v1/auth`, `/api/v1/boards` 등)를 오버라이드하면 안 됩니다.

* **[GET] `/api/v1/p/hello/greet`**
  * **설명**: 무료 샘플 플러그인 인사말 반환
  * **Response 200**: `{ "message": "Hello from HelloPlugin!", "version": "1.0.0" }`

* **[GET] `/api/v1/p/hello/info`**
  * **설명**: 무료 샘플 플러그인 메타데이터 반환
  * **Response 200**: `{ "plugin": "hello", "vendor": "wolchuck", "api_version": "1.1.0" }`

* **[GET] `/api/v1/p/premium-push/status`**
  * **설명**: 부분유료 샘플 플러그인의 무료 상태 조회
  * **Response 200**: `{ "plugin": "premium-push", "status": "ready", "license_required_for": ["/send"] }`

* **[POST] `/api/v1/p/premium-push/messages`**
  * **설명**: 부분유료 샘플 플러그인의 유료 발송 시뮬레이션
  * **비즈니스 로직**: 유효한 라이선스가 없으면 `402`
  * **Response 200**: `{ "status": "sent", "target": "member-1", "message": "hello premium" }`
  * **레거시 호환 경로**: `POST /api/v1/p/premium-push/send`

* **[GET] `/api/v1/p/board-reward/boards/{bo_table}`**
  * **설명**: `board.read` scope 샘플. 게시판 메타와 플러그인 scope를 반환합니다.

* **[POST] `/api/v1/p/board-reward/rewards/preview`**
  * **설명**: `point.write` 샘플의 미리보기 엔드포인트. 실제 지급 없이 검증/정규화만 수행합니다.

* **[POST] `/api/v1/p/board-reward/reward-grants`**
  * **설명**: 샘플 지급 엔드포인트
  * **비즈니스 로직**: `PLUGIN_BOARD_REWARD_ENABLE_GRANT=1`일 때만 동작합니다.
  * **Error 403**: 토글 비활성
  * **레거시 호환 경로**: `POST /api/v1/p/board-reward/rewards/grant`

* **개발 규칙**
  * 플러그인 강제 규약: `docs/architecture/PLUGIN_IMPLEMENTATION_STANDARD.md`
  * 실무 구현 가이드: `docs/architecture/PLUGIN_DEVELOPER_GUIDE.md`

---

## 12. 공통 에러 응답 체계

### 🛡️ 1차 방어막: 에러 메시지가 곧 매뉴얼 (RFC 7807 확장)

> **철학**: API 에러 응답 자체가 "다음에 뭘 해야 하는지"를 알려주는 **셀프 서비스 매뉴얼**이다.
> 프론트엔드/앱 개발자가 Swagger 문서를 뒤지지 않아도, 에러 응답만 보고 즉시 문제를 해결할 수 있어야 한다.

본 API는 RFC 7807 (Problem Details) 표준에 **`guide` 확장 필드**를 추가하여, 모든 에러 응답이 원인 분석과 해결 가이드를 동시에 제공합니다. RFC 7807은 확장 멤버를 공식 허용하므로 표준 위반이 아닙니다.

### 확장 에러 포맷 구조

```json
{
    "type": "https://api.example.com/errors/forbidden",
    "status": 403,
    "title": "Forbidden",
    "detail": "게시판 'notice'의 쓰기 권한이 부족합니다.",
    "instance": "/api/v1/boards/notice/posts",
    "error_code": "auth.forbidden",
    "request_id": "req_01HX8M8YJX8R6S6N2Q3T7A9C4D",
    "meta": {
        "request_id": "req_01HX8M8YJX8R6S6N2Q3T7A9C4D",
        "server_time": "2026-03-06T10:15:30Z",
        "version": "1.0.0",
        "error_code": "auth.forbidden",
        "error_category": "auth"
    },
    "errors": {},

    "guide": {
        "reason": "현재 회원 레벨(2)이 게시판 요구 레벨(5)보다 낮습니다.",
        "action": "관리자에게 레벨 승급을 요청하거나, 쓰기 권한이 낮은 게시판을 이용하세요.",
        "docs": "https://api.example.com/docs#board-permissions",
        "related_fields": ["bo_write_level", "mb_level"]
    }
}
```

### `guide` 객체 필드 정의

| 필드 | 타입 | 설명 |
|------|------|------|
| `reason` | string | 에러가 **왜** 발생했는지 사람이 읽을 수 있는 원인 설명 |
| `action` | string | 개발자/사용자가 **다음에 해야 할 행동** 가이드 |
| `docs` | string (URL) | Swagger UI 또는 API 문서의 **해당 섹션 직결 링크** |
| `related_fields` | string[] | 이 에러와 관련된 요청/응답 **필드명 힌트** |

### 운영용 상관 키

| 필드 | 타입 | 설명 |
|------|------|------|
| `error_code` | string | 클라이언트/운영이 공통으로 참조하는 안정적인 에러 코드 |
| `meta.error_category` | string | `auth`, `request`, `database`, `storage`, `network`, `server` 같은 운영 분류 |
| `request_id` | string | 서버 로그와 응답을 연결하는 상관 키 |

### 상태 코드별 가이드 예시

#### 400 Bad Request — 파라미터 오류
```json
{
    "type": "/errors/bad-request",
    "status": 400,
    "title": "Bad Request",
    "detail": "per_page 값이 허용 범위를 초과합니다.",
    "instance": "/api/v1/boards/free/posts?per_page=500",
    "guide": {
        "reason": "per_page 최대 허용값은 100입니다. 500이 전달되었습니다.",
        "action": "per_page를 1~100 사이의 값으로 수정하세요.",
        "docs": "https://api.example.com/docs#pagination",
        "related_fields": ["per_page"]
    }
}
```

#### 401 Unauthorized — 인증 실패
```json
{
    "type": "/errors/unauthorized",
    "status": 401,
    "title": "Unauthorized",
    "detail": "액세스 토큰이 만료되었습니다.",
    "instance": "/api/v1/members/me",
    "guide": {
        "reason": "JWT 토큰의 exp 클레임이 현재 시각을 초과했습니다.",
        "action": "POST /api/v1/auth/refresh 엔드포인트로 리프레시 토큰을 사용해 새 액세스 토큰을 발급받으세요.",
        "docs": "https://api.example.com/docs#auth-refresh",
        "related_fields": ["Authorization"]
    }
}
```

#### 409 Conflict — 중복/충돌
```json
{
    "type": "/errors/conflict",
    "status": 409,
    "title": "Conflict",
    "detail": "이미 이 게시글을 추천하셨습니다.",
    "instance": "/api/v1/boards/free/posts/123/good",
    "guide": {
        "reason": "g5_board_good 테이블에 동일 회원의 추천 이력이 존재합니다.",
        "action": "한 게시글당 추천은 1회만 가능합니다. 중복 요청을 보내지 마세요.",
        "docs": "https://api.example.com/docs#post-good",
        "related_fields": ["type", "wr_id"]
    }
}
```

#### 422 Validation — 입력 검증 실패
```json
{
    "type": "/errors/validation",
    "status": 422,
    "title": "Unprocessable Entity",
    "detail": "회원가입 입력값 검증에 실패했습니다.",
    "instance": "/api/v1/auth/register",
    "errors": {
        "mb_password": ["8자 이상 입력해야 합니다."],
        "mb_email": ["올바른 이메일 형식이 아닙니다."]
    },
    "guide": {
        "reason": "필수 필드의 형식 또는 길이 제약을 충족하지 못했습니다.",
        "action": "errors 객체의 각 필드별 메시지를 참고하여 입력값을 수정하세요.",
        "docs": "https://api.example.com/docs#auth-register",
        "related_fields": ["mb_password", "mb_email"]
    }
}
```

### ⚠️ 보안 정책: `guide` 노출 제한

| 상태 코드 | `guide` 포함 | 사유 |
|-----------|-------------|------|
| 400, 401, 403, 404, 409, 422, 429 | ✅ 포함 | 클라이언트 개발자가 해결 가능한 에러 |
| **500 Internal Server Error** | ✅ **일반 운영 가이드만 허용** | 내부 구현 상세 없이 `request_id` 기반 로그 조회만 안내 |

500 에러의 경우에도 내부 구현 상세를 숨긴 채, 일반적인 운영 가이드만 제공합니다:

```json
{
    "type": "/errors/internal-server",
    "status": 500,
    "title": "Internal Server Error",
    "detail": "서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
    "instance": "/api/v1/boards/free/posts",
    "error_code": "server.database_error",
    "request_id": "req_01HX8M8YJX8R6S6N2Q3T7A9C4D",
    "meta": {
        "request_id": "req_01HX8M8YJX8R6S6N2Q3T7A9C4D",
        "error_code": "server.database_error",
        "error_category": "database"
    },
    "guide": {
        "reason": "데이터베이스 처리 중 오류가 발생했습니다.",
        "action": "request_id와 요청 경로를 서버 로그에서 조회하세요."
    }
}
```

> 500 에러의 상세 원인은 서버 로그(Monolog)에만 기록됩니다. (헌법 §3.1)
> `request_id`는 응답 헤더 `X-Request-Id`와 동일하며, 장애 분석 시 로그 상관관계 키로 사용합니다.
> `error_code`와 `meta.error_category`는 안전한 운영 분류만 노출하며, SQL/파일경로/클래스명 같은 내부 구현 상세는 노출하지 않습니다.

### 구현 규칙

1. **모든 `ApiException` 계열 예외**는 `guide` 배열을 생성자에서 받을 수 있어야 한다.
2. **글로벌 예외 핸들러**에서 `guide` 필드를 RFC 7807 응답에 병합한다.
3. `docs` URL은 환경변수 `API_DOCS_BASE_URL`로 주입하여 하드코딩을 방지한다. (헌법 §2.3)
4. `guide.reason`과 `error_code`는 DB/스토리지/네트워크 같은 **안전한 운영 분류만** 노출하고, DB 쿼리, 내부 클래스명, 파일 경로 등 구현 상세는 절대 노출하지 않는다.

### HTTP 상태 코드 매핑표

| HTTP Status | Type | 주요 상황 명칭 | `guide` | 비고 |
|---|---|---|---|---|
| `400` | `/errors/bad-request` | 문법/파라미터 타입 오류 | ✅ | 쿼리스트링 필수값 누락 등 |
| `401` | `/errors/unauthorized` | 인증 헤더 없음 / 토큰 만료 | ✅ | `TokenExpiredException` |
| `403` | `/errors/forbidden` | 게시판 권한 부족, 타인 글 수정 시도 | ✅ | `AccessDeniedException` |
| `404` | `/errors/not-found` | 없는 라우트, 없는 게시판/글 조회 시도 | ✅ | `NotFoundException` |
| `409` | `/errors/conflict` | 아이디/이메일 중복, 이미 추천 반영됨 | ✅ | `ConflictException` |
| `422` | `/errors/validation` | 비즈니스 로직 검증 실패 (빈 글 입력 등) | ✅ | 폼 검증 라이브러리 결합 |
| `429` | `/errors/too-many-reqs`| API 호출 제한 초과 방어 | ✅ | `RateLimitMiddleware` |
| `500` | `/errors/internal-server`| DB 통신 오류, 문법 에러 (마스킹) | ✅(일반 가이드만) | 운영 모드 시 에러 콜스택 노출 방지 |
