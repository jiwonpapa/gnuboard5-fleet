---
doc_type: policy
status: active
owner: rust-admin
source_of_truth: false
ai_default_include: true
last_reviewed: 2026-03-13
review_cycle_days: 30
bounded_context: foundation
---
# REST API Client Standard

이 문서는 `g5-admin`의 Rust/Tauri REST API client 구현 표준을 정의하는 지원 문서다.
OpenAPI 계약을 앱이 실제로 소비하는 방식, Rust command 경계, 프론트 invoke 규칙, 진단/로그 정책을 한곳에 고정한다.

- 로드맵 SSOT: `specs/IMPLEMENTATION_ROADMAP.md`
- 작업 상태 SSOT: `specs/TODO.md`
- 완료 이력 SSOT: `specs/HISTORY.md`

## 1. 범위

- 대상: `g5-admin/src-tauri/src/api_client/**`
- 대상: `g5-admin/src-tauri/src/commands/**`
- 대상: `g5-admin/src/api/client.ts`
- 대상: `g5-admin/src/debug/diagnostics.ts`
- 대상: `g5-admin/src/debug/DebugDock.tsx`

이 문서는 서버 구현 규칙이 아니라, 데스크탑 앱이 REST API를 호출하는 표준을 정의한다.

## 2. 권위 원본

- API 계약 권위 원본은 `/Users/neojins/workspace/gnuboard5/php/api/docs/openapi.yaml`이다.
- `G5_OPENAPI_PATH`가 설정되면 로컬 기본 경로보다 우선한다.
- Swagger UI는 탐색용 화면일 뿐, DTO/command/테스트의 권위 원본이 아니다.
- OpenAPI가 `MessageResponse`처럼 느슨하면 PHP 실제 구현을 대조해 실제 envelope shape를 확인한다.

## 3. 경계 원칙

### 3.1 Tauri command는 유일한 브리지다

- 프론트는 REST API를 직접 호출하지 않는다.
- 모든 네트워크 호출은 `React -> invoke(cmd_*) -> Rust reqwest -> API` 경로로만 흐른다.
- command 명명은 `cmd_[domain]_[action]`을 강제한다.
- command는 인증, `request_id(=correlation_id)`, `server_request_id`, refresh 재시도, 에러 매핑을 경계에서 보장한다.

### 3.2 Rust API client는 transport 계층이다

- `api_client.rs`는 공통 transport, timeout, retry, RFC 7807 파싱만 담당한다.
- 실제 endpoint별 함수는 `api_client/<domain>.rs`로 분리한다.
- endpoint 함수는 `target` 경로를 문자열 상수로 명시하고, 호출자는 경로를 추론하지 않는다.

### 3.3 프론트 client.ts는 invoke adapter다

- `src/api/client.ts`는 `invoke(cmd_*)` thin adapter로 유지한다.
- 프론트 client는 REST URL 조립을 하지 않는다.
- 프론트 client는 `operation`, `area`, `command`, `api_target`, `local_target` 진단 컨텍스트를 반드시 붙인다.

## 4. 설정 규칙

- 운영 API 주소는 코드에 하드코딩하지 않는다.
- 기본 런타임 설정은 `g5-admin/src-tauri/app-config.json`에서 읽는다.
- `G5_APP_CONFIG_PATH`가 있으면 설정 파일 경로를 override 한다.
- `G5_APP_CONFIG_PATH`가 없으면 OS 사용자 설정 파일을 먼저 찾는다.
  - macOS 기본 경로: `~/Library/Application Support/g5-admin/app-config.json`
  - Windows 기본 경로: `%APPDATA%\\g5-admin\\app-config.json`, `%LOCALAPPDATA%\\g5-admin\\app-config.json`
  - Linux 기본 경로: `${XDG_CONFIG_HOME:-~/.config}/g5-admin/app-config.json`, `${XDG_DATA_HOME:-~/.local/share}/g5-admin/app-config.json`
- `G5_API_BASE_URL`이 있으면 설정 파일의 `apiBaseUrl`보다 우선한다.
- 우선순위는 `G5_API_BASE_URL -> G5_APP_CONFIG_PATH -> OS 사용자 설정 파일 -> 번들 app-config.json` 순서다.
- 개발/운영 저장소는 `sessionStorage=file|keychain`으로 구분한다.
- 개발 기본 세션 저장소는 `file`, 운영 서명 빌드는 `keychain`이다.

## 5. DTO 규칙

### 5.1 DTO는 Rust가 기준이다

- DTO는 `src-tauri/src/models/*.rs`에서 정의한다.
- TS 타입은 `ts-rs` export 결과를 사용한다.
- TS에서 수동 타입을 따로 만들지 않는다.
- Rust DTO는 필요한 필드만 선언해도 되지만, 실제 응답 shape와 어긋나면 안 된다.

### 5.2 Envelope를 명시한다

- `data` envelope가 있는 응답은 `*Envelope` DTO를 별도로 둔다.
- command response DTO는 성공 응답에도 `request_id`, `correlation_id`, `server_request_id`를 포함한다.
- OpenAPI가 모호한 경우에도 앱 내부 응답 계약은 명확히 typed response로 고정한다.
- 성공 응답은 `Traced<T>` 같은 trace 보존 구조를 통해 중간 경계에서 식별자를 잃지 않게 유지한다.

### 5.3 변경 payload는 최소 diff를 원칙으로 한다

- 수정용 input DTO는 `to_update_payload()`를 제공한다.
- 프론트는 변경된 필드만 payload로 보낸다.
- 민감 필드나 서버 전용 필드는 input DTO에 포함하지 않는다.

## 6. 인증/세션 규칙

- JWT는 웹뷰 저장소에 두지 않는다.
- 세션은 `token_store` 경계에서만 읽고 쓴다.
- 인증 필요한 command는 `execute_with_access_token()` 패턴을 사용한다.
- `401` 발생 시 refresh 후 1회 재시도한다.
- refresh가 `401/403`이면 로컬 세션을 정리하고 unauthenticated로 전이한다.

## 7. 타임아웃/재시도 규칙

- connect timeout과 request timeout은 명시적으로 고정한다.
- retry는 idempotent 요청에만 허용한다.
- transport error만 자동 재시도 대상이다.
- mutation은 기본적으로 자동 재시도를 하지 않는다.

## 8. 에러 처리 규칙

### 8.1 RFC 7807 우선

- 서버 에러는 RFC 7807을 우선 파싱한다.
- `meta.request_id`와 top-level `request_id` 둘 다 파싱한다.
- `correlation_id`, `server_request_id`, `error_code`, `error_category`, `fault_domain`, `owner`, `retryable`, `user_actionable`를 top-level과 `meta` 양쪽에서 보존한다.
- `guide.action`, `guide.reason`, `status`, `target`, `detail`을 payload에 유지한다.

### 8.2 사용자 메시지는 이해 가능해야 한다

- `Internal Server Error`만 보여주고 끝내면 안 된다.
- 최소한 아래 항목은 프론트에서 확인 가능해야 한다.
  - `operation`
  - `area`
  - `command`
  - `api_target`
  - `local_target`
  - `status`
  - `code`
  - `request_id`
  - `correlation_id`
  - `server_request_id`
  - `owner`
  - `fault_domain`
  - `error_category`
  - `retryable`
  - `occurred_at`

### 8.3 개발 모드 진단은 앱 안에서 끝나야 한다

- 개발 모드에서는 Debug Dock을 통해 최근 `invoke(cmd_*)` 흐름을 바로 본다.
- 모든 진단 항목은 `command`, `apiTarget`, `requestId`, `correlationId`, `serverRequestId`, `durationMs`, `status`, `owner`, `faultDomain`을 남긴다.
- Rust `tracing` 로그는 로컬 파일에도 남기고 앱 내부 tail 조회가 가능해야 한다.

## 9. 로그 규칙

- `warn!`/`error!`는 `component`, `operation`, `target`, `error`를 포함한다.
- 사용자 액션과 연결되는 경로는 `request_id`, `correlation_id`, `server_request_id`를 남긴다.
- 책임 귀속이 필요한 실패 로그는 `code`, `owner`, `fault_domain`, `error_category`, `retryable`, `user_actionable`, `status`를 함께 남긴다.
- `Authorization`, JWT, refresh token, password는 절대 로그에 남기지 않는다.
- 구조화 로그를 우선하고 문자열 보간형 단독 에러 로그는 금지한다.

## 10. 프론트 호출 규칙

- React Query query key는 `["admin", domain, resource, ...]` 패턴을 유지한다.
- 활성 route에 필요한 query만 `enabled`로 켠다.
- 로그인 직후 모든 도메인을 한 번에 prefetch 하지 않는다.
- 도메인 페이지는 route 단위로 분리하고, 목록/상세/수정 폼 상태도 route 중심으로 관리한다.

## 11. 테스트/검증 규칙

- `cargo test -p g5-admin-models --features ts-bindings models::tests::export_ts_bindings -- --exact --nocapture`
- `git diff --exit-code -- g5-admin/src/types`
- `cargo check --manifest-path g5-admin/src-tauri/Cargo.toml`
- `cargo clippy -p g5-admin-desktop --all-targets --all-features -- -D warnings`
- `cd g5-admin && bun run build`

새 endpoint를 붙일 때는 최소한 아래를 같이 점검한다.

- DTO export drift 없음
- `api_target` 진단 매핑 추가됨
- 성공/실패 모두 `request_id`, `correlation_id`, `server_request_id`가 전달됨
- RFC 7807의 `owner`, `fault_domain`, `error_category`, `retryable`가 프론트까지 보존됨
- mutation 중 double-submit 방지됨
- route 진입 시 필요한 query만 실행됨

## 12. 구현 체크리스트

새 REST endpoint를 앱에 추가할 때는 아래 순서를 따른다.

1. OpenAPI와 PHP 실제 구현을 대조해 envelope shape를 확정한다.
2. Rust DTO와 `Envelope`를 `models/<domain>.rs`에 추가한다.
3. `api_client/<domain>.rs`에 endpoint 함수를 추가한다.
4. `commands/<domain>.rs`에 `cmd_*` 경계를 추가한다.
5. `src/api/client.ts`에 invoke adapter와 진단 컨텍스트를 추가한다.
6. React Query key, route page, mutation invalidation 규칙을 반영한다.
7. `ts-rs` export와 `bun` 빌드/클리피/문서 검증을 통과시킨다.

## 13. 현재 적용 대상

이 표준은 현재 아래 도메인에 적용된다.

- Auth
- Admin Config
- Members
- Boards
- Permissions
- Polls
- Popups
- QA Config

다음 추가 대상:

- Admin SMS
- Mail
