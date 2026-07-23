---
doc_type: support
status: active
owner: rust-admin
source_of_truth: false
ai_default_include: true
last_reviewed: 2026-03-13
review_cycle_days: 30
bounded_context: sms
---
# ADMIN_SMS_SDD

이 문서는 Admin SMS 도메인의 지원 설계 문서다.
작업 상태는 `specs/TODO.md`, 우선순위는 `specs/IMPLEMENTATION_ROADMAP.md`를 따른다.

## 1. 목표

관리자 앱이 SMS 설정(`/admin/sms/config`)과 회원 연락처 동기화(`/admin/sms/member-sync`)를
route 기반 설정 페이지에서 조회/수정/실행하도록 만든다.

## 2. 계약 입력

Canonical OpenAPI:
- `/Users/neojins/workspace/gnuboard5/php/api/docs/openapi.yaml`

참조한 실제 백엔드 구현:
- `/Users/neojins/workspace/gnuboard5/php/api/v1/Admin/Sms/Controller/AdminSmsController.php`
- `/Users/neojins/workspace/gnuboard5/php/api/v1/Admin/Sms/Service/AdminSmsService.php`
- `/Users/neojins/workspace/gnuboard5/php/api/v1/Admin/Sms/Repository/AdminSmsRepository.php`

사용 엔드포인트:
- `GET /admin/sms/config` (`operationId: adminGetSmsConfig`)
- `PUT /admin/sms/config` (`operationId: adminUpdateSmsConfig`)
- `POST /admin/sms/member-sync` (`operationId: adminSyncSmsMembers`)

## 3. 실제 응답 shape

OpenAPI는 세 endpoint 모두 `MessageResponse`로 느슨하게 정의되어 있지만,
실제 PHP 구현은 아래 shape를 `data` envelope로 반환한다.

### 설정 조회 / 저장

```json
{
  "data": {
    "cf_title": "Gnuboard5",
    "cf_sms_use": "icode",
    "cf_sms_type": "LMS",
    "cf_icode_id": "icode-user",
    "cf_icode_pw": "secret",
    "cf_icode_server_ip": "121.78.96.124",
    "cf_icode_server_port": "7295",
    "cf_icode_token_key": "token-key",
    "cf_phone": "0212345678",
    "cf_datetime": "2026-03-07 01:02:03",
    "provider_ready": true,
    "uses_token_key": true,
    "uses_legacy_credentials": false,
    "storage_ready": true,
    "missing_tables": []
  }
}
```

### 회원 연락처 동기화

```json
{
  "data": {
    "datetime": "2026-03-07 01:05:33",
    "summary": {
      "total_members": 321,
      "leave_members": 3,
      "phone_empty": 12,
      "phone_valid": 280,
      "phone_invalid": 26,
      "receipt_enabled": 190,
      "receipt_disabled": 90
    }
  }
}
```

## 4. DTO / Command 매핑

### `cmd_admin_sms_config_get`

- 입력: 없음
- 출력 DTO: `AdminSmsConfigResponse`
  - `config: AdminSmsConfig`
  - `request_id: String`

### `cmd_admin_sms_config_update`

- 입력 DTO: `AdminSmsConfigUpdateInput`
- 규칙:
  - 변경된 필드만 payload에 포함
  - `cf_sms_use`: `"" | "icode"`
  - `cf_sms_type`: `"" | "LMS"`
  - 포트와 회신번호는 문자열로 유지하고 서버 검증에 위임
- 출력 DTO: `AdminSmsConfigResponse`

### `cmd_admin_sms_member_sync`

- 입력: 없음
- 출력 DTO: `AdminSmsMemberSyncResponse`
  - `result.datetime`
  - `result.summary.total_members`
  - `result.summary.leave_members`
  - `result.summary.phone_empty`
  - `result.summary.phone_valid`
  - `result.summary.phone_invalid`
  - `result.summary.receipt_enabled`
  - `result.summary.receipt_disabled`
  - `request_id`

## 5. UI 정보구조

### Route

- `/settings/sms`

### 화면 블록

1. SMS 도메인 헤더
2. 공급자 설정 카드
3. 회원 연락처 동기화 액션 카드
4. 현재 상태 요약 사이드 카드

### 상태 규칙

- 로그인 상태에서만 `/settings/sms` route를 허용한다.
- 진입 시 `GET /admin/sms/config`를 1회 호출한다.
- 저장 중과 동기화 중에는 버튼을 disable 한다.
- 변경된 필드가 없으면 저장 요청을 보내지 않는다.
- `cf_sms_use !== "icode"`이면 동기화 버튼을 비활성화한다.
- 동기화 성공 시 SMS 설정 query를 invalidate 해서 `cf_datetime`을 다시 hydrate 한다.
- 에러 UI는 `operation`, `api_target`, `request_id`까지 표시한다.

## 6. 이번 단계의 범위

### 포함

- SMS 설정 조회
- SMS 설정 저장
- 회원 연락처 동기화 실행
- route 기반 설정 페이지 편입

### 제외

- 템플릿 그룹/템플릿 CRUD
- 주소록 그룹/연락처 CRUD
- CSV import/export
- 발송 이력 목록/재발송

## 7. 완료 게이트

- 로그인 후 `/settings/sms`에서 `/admin/sms/config` 값이 hydrate 된다.
- 변경된 필드만 `PUT /admin/sms/config` payload로 전송된다.
- `POST /admin/sms/member-sync` 실행 결과가 summary 카드에 표시된다.
- Rust command, TS 타입, React Query 키, route path가 일관되게 연결된다.
- `cargo check --manifest-path g5-admin/src-tauri/Cargo.toml`
- `cargo clippy --manifest-path g5-admin/src-tauri/Cargo.toml --all-targets -- -D warnings`
- `cd g5-admin && bun run lint`
- `cd g5-admin && bun run test`
- `cd g5-admin && bun run build`

## 최소 smoke checklist

- `/settings/sms` 진입 시 SMS 설정과 provider 상태가 hydrate 됩니다.
- 설정 변경 후 저장하면 동일 route에서 최신 상태가 다시 반영됩니다.
- member sync action은 설정 저장과 다른 action으로 동작하고 summary를 갱신합니다.
- diagnostics는 SMS 설정 조회/저장과 member sync를 서로 다른 operation으로 구분합니다.
