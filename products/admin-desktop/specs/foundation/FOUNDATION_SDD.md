---
doc_type: support
status: active
owner: rust-admin
source_of_truth: false
ai_default_include: true
last_reviewed: 2026-03-13
review_cycle_days: 30
bounded_context: foundation
---
# FOUNDATION_SDD

이 문서는 개발 착수에 필요한 최소 공통 설계를 정의하는 지원 문서다.
상태 관리와 우선순위는 각각 `specs/TODO.md`, `specs/IMPLEMENTATION_ROADMAP.md`를 따른다.

## 1. 목표

G5 Admin Desktop App의 첫 구현 사이클에서
Rust 코어, Tauri IPC, React UI, OpenAPI 계약, 에러/로그 추적 규칙이 흔들리지 않도록
공통 기반을 먼저 고정한다.

## 2. 권위 입력

- 헌법: `.agent/Constitution.md`
- 로드맵 SSOT: `specs/IMPLEMENTATION_ROADMAP.md`
- 작업 상태 SSOT: `specs/TODO.md`
- API 계약 SSOT: `/Users/neojins/workspace/gnuboard5/php/api/docs/openapi.yaml`
- API 계약 환경변수: `G5_OPENAPI_PATH`

## 3. 범위

### 포함

- Tauri 2 데스크탑 앱 셸
- Rust `reqwest` 기반 API 프록시
- 로컬 SQLCipher DB + file 기반 DB key/session 저장소
- React + TanStack Query 기반 관리자 UI 골격
- `request_id`, `AppError`, RFC 7807 파싱, 구조화 로그 규약
- `ts-rs` 타입 export 파이프라인

### 제외

- `g5-api` Rust facade 구현
- `/auth/register`, 비밀번호 재설정, 이메일 인증
- Excel, 파일 업로드, 이미지 업로드, 푸시 발송 등 확장 기능
- 관리자 전 도메인 일괄 구현

## 4. 시스템 경계

```text
React UI
  -> invoke(cmd_*)
  -> Tauri Command
  -> Rust Service / ApiClient
  -> G5 REST API (/api/v1)
```

- React: 화면 렌더링, 사용자 입력, UI 상태, Query 상태
- Tauri Command: `request_id` 생성, 입력 DTO 수신, 서비스 호출, `AppError` 직렬화
- Rust Service: bearer 주입, timeout/retry, RFC 7807 파싱, 세션 저장소 접근
- G5 API: 최종 권위 데이터와 권한 판정

## 5. 초기 모듈 책임

### Rust (`g5-admin/src-tauri/src`)

- `commands/`
  - Tauri command entrypoint
  - `cmd_[domain]_[action]` 명명 강제
- `api_client.rs`
  - 공통 `reqwest::Client` 생성
  - macOS/Windows 시스템 trust store를 사용하는 TLS 백엔드 사용
  - base URL, timeout, auth header, RFC 7807 파싱
- `api_client/*.rs`
  - 도메인별 endpoint 함수 분리
- `token_store.rs`
  - session store read/write/delete
  - `sessionStorage=file` 기준 local session backend
- `runtime_config.rs`
  - `app-config.json`, `G5_APP_CONFIG_PATH`, `G5_API_BASE_URL` 해석
- `models/`
  - OpenAPI 계약 대응 DTO
  - `serde` + `ts-rs`
- `error.rs`
  - `AppError`, `ApiError`, UI 전달 payload

### Frontend (`g5-admin/src`)

- `api/client.ts`
  - `invoke()` 래퍼
- `app/router.tsx`
  - route 기반 관리자 네비게이션
- `features/auth/`
  - 로그인 폼, 세션 상태, 보호 라우트
- `features/layout/`
  - AppShell, ProtectedLayout, 사이드바/헤더
- `features/config/`
  - 첫 정식 route 마이그레이션 도메인 `Admin Config`
- `features/legacy/`
  - 기존 Members/Boards/Permissions/QA/Polls/Popups bridge
- `components/`
  - 공통 레이아웃, 테이블, 토스트
- `types/`
  - `ts-rs` 자동 생성 타입

## 6. 초기 Command 표면

### 1차 구현 필수

- `cmd_auth_login`
- `cmd_auth_refresh`
- `cmd_auth_logout`
- `cmd_auth_status`
- `cmd_member_me_get`

### 2차 구현 예정

- `cmd_admin_member_get_list`
- `cmd_admin_member_get`
- `cmd_admin_member_update`
- `cmd_admin_member_update_level`

## 7. 에러/로그/추적 규약

- 모든 사용자 액션 시작점에서 `request_id`를 생성하고, 이는 Rust 앱 내부의 `correlation_id`와 동일하게 취급한다.
- PHP는 요청마다 별도 `server_request_id`를 생성하고 성공/실패 응답과 로그에 함께 남긴다.
- 장애/경계 경로 로그는 `component`, `operation`, `target`, `error` 4필드를 강제한다.
- UI로 전달되는 실패 payload는 `code`, `message`, `guide`, `request_id`, `correlation_id`, `server_request_id`를 포함하고,
  가능하면 `status`, `target`, `detail`, `owner`, `fault_domain`, `error_category`, `retryable`, `user_actionable`를 함께 담아 사용자와 로그가 같은 실패를 즉시 추적할 수 있어야 한다.
- PHP API의 RFC 7807 응답은 Rust에서 먼저 파싱하고, 프론트는 이미 정규화된 에러를 소비한다.
- `401`은 토큰 만료/부재로 취급하고, refresh 가능 여부를 판단한다.
- `403`은 권한 부족으로 취급하고, 관리 화면에서 명시적 메시지로 노출한다.
- 개발 모드 또는 `debugOverlay=true`일 때는 하단 디버그 독을 노출하고 최근 command, endpoint, status, request_id, correlation_id, server_request_id, owner, fault_domain, duration을 실시간으로 보여준다.
- Rust `tracing` 로그는 로컬 파일에도 남기고, 디버그 독에서 tail 확인이 가능해야 한다.

## 8. 설정 계약

### 필수

- `G5_OPENAPI_PATH`

### 권장

- `G5_API_BASE_URL`
- `G5_APP_CONFIG_PATH`
- `G5_DEBUG_OVERLAY`
- `G5_LOG_DIR`
- `RUST_LOG`
- `G5_SESSION_STORAGE`
- `G5_SESSION_STORE_PATH`

### 기본 규칙

- OpenAPI 계약 참조는 `G5_OPENAPI_PATH`를 우선 사용한다.
- 런타임 API 주소는 `g5-admin/src-tauri/app-config.json`에서 읽는다.
- `G5_APP_CONFIG_PATH`가 있으면 런타임 설정 파일 경로를 override 한다.
- `G5_APP_CONFIG_PATH`가 없으면 OS 사용자 설정 파일을 먼저 찾는다.
  - macOS 기본 경로: `~/Library/Application Support/g5-admin/app-config.json`
  - Windows 기본 경로: `%APPDATA%\\g5-admin\\app-config.json`, `%LOCALAPPDATA%\\g5-admin\\app-config.json`
  - Linux 기본 경로: `${XDG_CONFIG_HOME:-~/.config}/g5-admin/app-config.json`, `${XDG_DATA_HOME:-~/.local/share}/g5-admin/app-config.json`
- `G5_API_BASE_URL`이 있으면 런타임 설정 파일의 `apiBaseUrl`보다 우선한다.
- `G5_API_BASE_URL`이 없으면 `G5_APP_CONFIG_PATH` 또는 OS 사용자 설정 파일의 `apiBaseUrl`을 우선하고, 둘 다 없을 때만 번들 `app-config.json` 값을 사용한다.
- `G5_DEBUG_OVERLAY`가 있으면 런타임 설정 파일의 `debugOverlay`보다 우선한다.
- `app-config.json`의 `sessionStorage`는 JWT 세션 저장소 백엔드만 정하며, canonical local runtime은 `file`이다.
- 로컬 SQLCipher DB 마스터키는 canonical local runtime에서 `.db-master-key` file 저장소를 사용한다. 개발/테스트 재배포 후에도 기존 사이트/SSH 데이터를 다시 입력하게 만들면 안 된다.
- `G5_SESSION_STORAGE`가 있으면 런타임 설정 파일의 `sessionStorage`보다 우선하지만, 현재 구현은 `keychain` 값을 받아도 `file`로 정규화한다.
- `G5_SESSION_STORE_PATH`가 있으면 파일 세션 저장 경로를 override 한다.
- `dbMasterStorage`는 현재 local runtime에서 `file`만 허용한다. 설정 파일이나 환경변수에 legacy `keychain` 값이 남아 있어도 `file`로 정규화한다.
- `debugOverlay=true` 환경에서는 선택적으로 `app-config.json`의 `devBootstrap` 블록을 읽을 수 있다. 이 값은 canonical 운영 설정이 아니라 개발용 bootstrap 입력이며, 프런트 개발모드가 켜진 상태에서만 `마스터 잠금 + 첫 사이트 + 사이트 로그인 + SSH 프로필` 자동 채우기 UI를 노출한다.
- `G5_API_BASE_URL`이 설정되면 실제 API 호스트의 `/api/v1`까지 포함한 절대 URL이어야 한다.
- 운영값은 코드 하드코딩 대신 환경변수 또는 설정 파일로 주입한다.
- 로컬 로그 경로는 기본적으로 OS 로컬 데이터 디렉터리의 `g5-admin/logs/g5-admin.log`를 사용하고, 필요 시 `G5_LOG_DIR`로 override 한다.

## 9. 타입 동기화

```text
Rust DTO (derive TS)
  -> export_ts_bindings 테스트
  -> g5-admin/src/types/*.ts 생성
  -> React import
```

- 프론트에서 수동 타입 중복 정의 금지
- `cargo test -p g5-admin-models --features ts-bindings models::tests::export_ts_bindings -- --exact --nocapture`
- `git diff --exit-code -- g5-admin/src/types`

## 10. 개발 시작 게이트

- desktop scoped `cargo check --manifest-path g5-admin/src-tauri/Cargo.toml` 통과
- 프론트 `cd g5-admin && bun run lint` 통과
- 프론트 `cd g5-admin && bun run test` 통과
- 프론트 `cd g5-admin && bun run build` 통과
- 문서 검증 `bash scripts/check-doc-governance.sh` 통과
- `G5_OPENAPI_PATH`, `G5_API_BASE_URL`, `G5_APP_CONFIG_PATH` 해석 규칙 문서화 완료
- `debugOverlay`, 로컬 로그 파일 경로, 디버그 독 사용 규칙 문서화 완료
- Auth Core 구현 입력 문서(`AUTH_CORE_SDD.md`) 준비 완료
