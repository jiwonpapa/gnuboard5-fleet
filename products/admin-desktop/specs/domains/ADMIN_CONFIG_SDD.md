---
doc_type: support
status: active
owner: rust-admin
source_of_truth: false
ai_default_include: true
last_reviewed: 2026-03-13
review_cycle_days: 30
bounded_context: config
---
# ADMIN_CONFIG_SDD

이 문서는 Admin Config 도메인의 지원 설계 문서다.
작업 상태는 `specs/TODO.md`, 우선순위는 `specs/IMPLEMENTATION_ROADMAP.md`를 따른다.

## 1. 목표

관리자 앱이 기본 설정(`/admin/config`)을
route 기반 설정 페이지에서 조회/수정하도록 만든다.

## 2. 계약 입력

Canonical OpenAPI:
- `/Users/neojins/workspace/gnuboard5/php/api/docs/openapi.yaml`

참조한 실제 백엔드 구현:
- `/Users/neojins/workspace/gnuboard5/php/api/v1/Admin/Config/Controller/AdminConfigController.php`
- `/Users/neojins/workspace/gnuboard5/php/api/v1/Admin/Config/Service/AdminConfigService.php`
- `/Users/neojins/workspace/gnuboard5/php/api/v1/Admin/Config/Repository/AdminConfigRepository.php`

사용 엔드포인트:
- `GET /admin/config` (`operationId: adminGetConfig`)
- `PUT /admin/config` (`operationId: adminUpdateConfig`)

## 3. 실제 응답 shape

OpenAPI는 `MessageResponse`로 느슨하게 정의되어 있지만,
실제 PHP 구현은 설정 row 전체를 `data` envelope로 반환한다.
또한 DBAL/PHP 정규화 경로에 따라 일부 설정값은 `"1"` 같은 문자열이 아니라
`1`, `0`, `true`, `false` 같은 scalar로 내려올 수 있으므로 앱 DTO는
`string|number|bool|null`을 모두 수용하고 내부에서는 문자열로 정규화한다.

### 조회

```json
{
  "data": {
    "cf_title": "Gnuboard5",
    "cf_admin_email": "admin@example.com",
    "cf_use_point": "1",
    "cf_register_level": "2"
  }
}
```

### 수정

수정도 동일한 `data` payload를 envelope로 반환한다.

## 4. DTO / Command 매핑

### `cmd_admin_config_get`

- 입력: 없음
- 출력 DTO: `AdminConfigResponse`
- 구성:
  - `config: AdminConfig`
  - `request_id: String`

### `cmd_admin_config_update`

- 입력 DTO: `AdminConfigUpdateInput`
- 규칙:
  - 변경된 필드만 payload에 포함
  - bool 성격 필드는 `"1" | "0"`으로 변환
  - 숫자 성격 필드도 문자열로 받아 서버 정규화에 맡김
- 출력 DTO: `AdminConfigResponse`

## 5. Command 매핑

- `cmd_admin_config_get`
  - 저장된 세션 로드
  - `GET /admin/config`
  - `401`이면 refresh 1회 후 재시도
- `cmd_admin_config_update`
  - 저장된 세션 로드
  - `PUT /admin/config`
  - `401`이면 refresh 1회 후 재시도

## 6. UI 정보구조

### Route

- `/settings/general`

### 화면 블록

1. 설정 도메인 헤더
2. 사이트/관리자 정보 카드
3. 회원/포인트 정책 카드
4. 헤더/테일 설정 카드
5. 현재 편집 요약 사이드 카드

### 상태 규칙

- 로그인 상태에서만 `/settings/general` route를 허용한다.
- 진입 시 `GET /admin/config`를 1회 호출한다.
- 서버 응답이 오면 RHF 폼을 `reset()`으로 hydrate 한다.
- 저장 중에는 버튼을 disable 한다.
- 변경된 필드가 없으면 저장 요청을 보내지 않는다.
- 에러 UI는 `operation`, `api_target`, `request_id`까지 표시한다.

## 7. 프론트 표준

- `React Router` route 기반 페이지
- `React Hook Form + Zod`
- `TanStack Query`
- `shadcn` 기반 UI 컴포넌트
- 설정 toggle은 `Switch`, 요약은 별도 카드에 표시

## 8. 이번 단계의 범위

### 포함

- 기본 설정 조회
- 기본 설정 수정
- route 기반 관리자 셸에 첫 정식 페이지로 편입

### 제외

- 설정 diff 히스토리
- 파일 선택기
- SMS 설정, 메일 설정, maintenance 설정

## 9. 완료 게이트

- 로그인 후 `/settings/general`에서 `/admin/config` 값이 hydrate 된다.
- 변경된 필드만 `PUT /admin/config` payload로 전송된다.
- 저장 성공 시 query cache와 폼 기준선이 즉시 갱신된다.
- Rust command, TS 타입, React Query 키, route path가 일관되게 연결된다.
- `cargo check --manifest-path g5-admin/src-tauri/Cargo.toml`
- `cargo clippy -p g5-admin-desktop --all-targets --all-features -- -D warnings`
- `cd g5-admin && bun run build`
