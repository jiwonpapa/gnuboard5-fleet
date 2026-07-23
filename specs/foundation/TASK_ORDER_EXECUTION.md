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
# TASK_ORDER_EXECUTION

이 문서는 구현 순서를 고정하는 지원 문서다.
실제 진행 상태는 `specs/TODO.md`만 기준으로 삼는다.

## 1. 시작 순서

1. `FOUNDATION_SDD.md`로 공통 경계를 고정한다.
2. `DEV_BOOTSTRAP_CHECKLIST.md`로 로컬 개발 조건을 확인한다.
3. `AUTH_CORE_SDD.md` 기준으로 첫 기능을 구현한다.
4. Auth Core가 안정화되면 관리자 셸과 첫 관리자 도메인으로 넘어간다.

## 2. Phase 0 — Foundation Lock

### 입력

- `.agent/Constitution.md`
- `specs/IMPLEMENTATION_ROADMAP.md`
- `specs/TODO.md`
- `/Users/neojins/workspace/gnuboard5/php/api/docs/openapi.yaml`

### 산출물

- 개발 시작용 foundation 문서 세트
- OpenAPI 참조 규칙
- 로깅/에러/타입 동기화 기준

### 완료 게이트

- 문서 세트가 존재한다.
- OpenAPI 계약 참조 경로가 문서에 명시되어 있다.
- `docs-check`가 통과한다.

## 3. Phase 1 — Shared Rust Spine

### 구현 대상

- `AppError` / `ApiError`
- `request_id` 생성/전파
- `reqwest` API client
- keyring token store
- `ts-rs` export 테스트

### 완료 게이트

- 모든 command가 공통 에러 타입을 사용한다.
- 외부 호출 timeout이 명시된다.
- 장애 로그가 4필드 + `request_id` 규약을 따른다.

## 4. Phase 2 — Auth Core

### 입력 문서

- `AUTH_CORE_SDD.md`

### 구현 대상

- `cmd_auth_login`
- `cmd_auth_refresh`
- `cmd_auth_logout`
- `cmd_auth_status`
- `cmd_member_me_get`
- 로그인 화면과 세션 가드

### 완료 게이트

- 로그인 성공 시 keyring 저장이 동작한다.
- 앱 재실행 후 `cmd_auth_status`로 세션 복원이 가능하다.
- `401/403`가 UI에서 구분 노출된다.

## 5. Phase 3 — Admin Shell

### 구현 대상

- App layout
- 사이드바/헤더/보호 라우트
- QueryProvider, ErrorToast, Loading fallback

### 완료 게이트

- 인증 없는 접근이 로그인 화면으로 이동한다.
- 공통 레이아웃에서 `request_id` 포함 오류 표시가 가능하다.

## 6. Phase 4 — Admin Members Bootstrap

### 구현 대상

- `/admin/members`
- `/admin/members/{mb_id}`
- `/admin/members/{mb_id}/level`

### 완료 게이트

- 목록/상세/레벨 수정 흐름이 최소 1회 통과한다.
- `cmd_admin_member_*` naming 규칙이 일관된다.

## 7. Phase 5 — 다음 도메인 확장

우선순위는 아래 순서를 따른다.

1. Admin Boards
2. Admin Auth
3. Admin Points
4. Admin Menus

## 8. 운영 규칙

- 상태 변경은 이 문서가 아니라 `specs/TODO.md`에서만 수행한다.
- 우선순위 변경은 먼저 `specs/IMPLEMENTATION_ROADMAP.md`를 수정한다.
- 완료 작업은 `specs/HISTORY.md`에 Why와 함께 기록한다.
