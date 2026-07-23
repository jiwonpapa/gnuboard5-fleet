---
doc_type: support
status: active
owner: rust-admin
source_of_truth: false
ai_default_include: true
last_reviewed: 2026-03-13
review_cycle_days: 30
bounded_context: qa-config
---
# ADMIN_QA_CONFIG_SDD

이 문서는 Admin QA Config 도메인의 지원 설계 문서다.
작업 상태는 `specs/TODO.md`, 우선순위는 `specs/IMPLEMENTATION_ROADMAP.md`를 따른다.

## 1. 목표

관리자 앱이 QA 설정 조회와 수정을
Rust command를 통해 안정적으로 수행하도록 만든다.

## 2. 계약 입력

Canonical OpenAPI:
- `/Users/neojins/workspace/gnuboard5/php/api/docs/openapi.yaml`

참조한 실제 백엔드 구현:
- `/Users/neojins/workspace/gnuboard5/php/api/v1/Admin/System/Controller/AdminSystemController.php`
- `/Users/neojins/workspace/gnuboard5/php/api/v1/Admin/System/Service/AdminSystemConfigService.php`
- `/Users/neojins/workspace/gnuboard5/php/api/v1/Admin/System/Repository/AdminSystemConfigRepository.php`

사용 엔드포인트:
- `GET /admin/system/qa-config` (`operationId: adminSystemGetQaConfig`)
- `PUT /admin/system/qa-config` (`operationId: adminSystemUpdateQaConfig`)

## 3. 실제 응답 shape

OpenAPI는 `MessageResponse`로 느슨하게 정의돼 있지만,
실제 PHP 구현은 아래 구조를 반환한다.

### 조회

```json
{
  "data": {
    "qa_id": 1,
    "qa_title": "1:1 문의",
    "qa_category": "",
    "qa_skin": "basic",
    "qa_mobile_skin": "basic",
    "qa_admin_email": "admin@example.com"
  }
}
```

QA 설정 row가 아직 없으면 서비스가 기본값을 합성해서 반환한다.

### 수정

수정도 동일한 `data` payload를 envelope로 반환한다.

## 4. DTO / Command 매핑

### `cmd_admin_qa_config_get`

- 입력: 없음
- 출력 DTO: `AdminQaConfigResponse`
- 구성:
  - `config: AdminQaConfig`
  - `request_id: String`

### `cmd_admin_qa_config_update`

- 입력 DTO: `AdminQaConfigUpdateInput`
- 규칙:
  - 변경된 필드만 payload에 포함
  - 문자열 필드는 trim 후 전송
  - 빈 문자열도 유효한 설정값으로 허용
- 출력 DTO: `AdminQaConfigResponse`

## 5. Command 매핑

- `cmd_admin_qa_config_get`
  - keyring 세션 로드
  - `GET /admin/system/qa-config`
  - `401`이면 refresh 1회 후 재시도
- `cmd_admin_qa_config_update`
  - keyring 세션 로드
  - `PUT /admin/system/qa-config`
  - `401`이면 refresh 1회 후 재시도

## 6. UI 정보구조

### 화면 블록

1. QA 설정 헤더
2. 설정 입력 폼
3. 장문 설정 textarea 묶음
4. 저장 버튼
5. 현재 적용 설정 요약

### 상태 규칙

- 로그인 상태에서만 QA 설정을 조회한다.
- 설정 로드 완료 시 폼을 서버 값으로 hydrate 하고, 폼은 `react-hook-form + zod` 기준으로 관리한다.
- 수정 mutation 중에는 입력과 저장 버튼을 모두 비활성화한다.
- 변경된 필드가 없으면 저장 버튼을 비활성화한다.
- 오류 UI는 `guide.reason`과 `request_id`를 함께 보여준다.

## 7. 이번 단계의 범위

### 포함

- QA 설정 조회
- QA 설정 수정
- refresh 기반 재인증 재시도

### 제외

- QA 설정 diff 히스토리
- 스킨 파일 탐색기
- 설정 preset 적용

## 8. 완료 게이트

- 로그인 후 `/admin/system/qa-config` 값이 폼으로 hydrate 된다.
- 변경된 필드만 `PUT /admin/system/qa-config` payload로 전송된다.
- 저장 성공 시 현재 설정 캐시가 즉시 갱신된다.
- Rust command, TS 타입, React Query 키가 일관되게 연결된다.
- `cargo check --manifest-path g5-admin/src-tauri/Cargo.toml`
- `cargo clippy --manifest-path g5-admin/src-tauri/Cargo.toml --all-targets -- -D warnings`
- `cd g5-admin && bun run build`
