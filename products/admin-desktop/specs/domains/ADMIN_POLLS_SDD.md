---
doc_type: support
status: active
owner: rust-admin
source_of_truth: false
ai_default_include: true
last_reviewed: 2026-03-13
review_cycle_days: 30
bounded_context: polls
---
# ADMIN_POLLS_SDD

이 문서는 Admin Polls 도메인의 지원 설계 문서다.
작업 상태는 `specs/TODO.md`, 우선순위는 `specs/IMPLEMENTATION_ROADMAP.md`를 따른다.

## 1. 목표

관리자 앱이 운영 투표 목록 조회, 상세 조회, 생성, 수정, 삭제를
Rust command를 통해 안정적으로 수행하도록 만든다.

## 2. 계약 입력

Canonical OpenAPI:
- `/Users/neojins/workspace/gnuboard5/php/api/docs/openapi.yaml`

참조한 실제 백엔드 구현:
- `/Users/neojins/workspace/gnuboard5/php/api/v1/Admin/System/Controller/AdminSystemController.php`
- `/Users/neojins/workspace/gnuboard5/php/api/v1/Admin/System/Service/AdminSystemPollService.php`
- `/Users/neojins/workspace/gnuboard5/php/api/v1/Admin/System/Repository/AdminSystemPollRepository.php`

사용 엔드포인트:
- `GET /admin/system/polls` (`operationId: adminSystemListPolls`)
- `GET /admin/system/polls/{po_id}` (`operationId: adminSystemGetPoll`)
- `POST /admin/system/polls` (`operationId: adminSystemCreatePoll`)
- `PUT /admin/system/polls/{po_id}` (`operationId: adminSystemUpdatePoll`)
- `DELETE /admin/system/polls/{po_id}` (`operationId: adminSystemDeletePoll`)

## 3. 실제 응답 shape

OpenAPI는 `MessageResponse`로 느슨하게 정의돼 있지만,
실제 PHP 구현은 아래 구조를 반환한다.

### 목록

```json
{
  "data": [
    {
      "po_id": 7,
      "po_subject": "신규 기능 선호도",
      "po_date": "20260306",
      "po_level": 1,
      "po_point": 0,
      "po_use": 1
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "per_page": 20,
    "last_page": 1,
    "has_next": false,
    "has_prev": false
  }
}
```

### 상세

```json
{
  "data": {
    "po_id": 7,
    "po_subject": "신규 기능 선호도",
    "po_poll1": "게시판",
    "po_poll2": "회원",
    "po_cnt1": 3,
    "po_cnt2": 5,
    "po_etc": "기타 의견 허용",
    "po_use": 1
  }
}
```

### 생성 / 수정

생성과 수정은 둘 다 상세와 동일한 `data` payload를 envelope로 반환한다.

### 삭제

- 성공 시 `204 No Content`
- 프론트는 이를 `CommandMessage { message: "deleted", request_id }`로 정규화한다.

## 4. Query / DTO 매핑

### `cmd_admin_poll_get_list`

- 입력 DTO: `AdminPollListQuery`
- QueryString:
  - `page`
  - `per_page`
- 정규화 규칙:
  - `page >= 1`
  - `1 <= per_page <= 100`

### `cmd_admin_poll_get_list` 응답

- 출력 DTO: `AdminPollListResponse`
- 구성:
  - `polls: Vec<AdminPoll>`
  - `pagination: Pagination`
  - `request_id: String`

### `cmd_admin_poll_get`

- 입력:
  - `po_id: i32`
- 출력 DTO: `AdminPollDetailResponse`

### `cmd_admin_poll_create`

- 입력 DTO: `AdminPollCreateInput`
- 필수:
  - `po_subject`
  - `po_poll1`
  - `po_poll2`
- 선택:
  - `po_poll3` ~ `po_poll9`
  - `po_etc`
  - `po_level`
  - `po_point`
  - `po_use`
- 출력 DTO: `AdminPollDetailResponse`

### `cmd_admin_poll_update`

- 입력 DTO: `AdminPollUpdateInput`
- 규칙:
  - `po_id`는 path identity로 유지
  - 변경된 필드만 payload에 포함
  - 제목과 항목 1, 2는 빈 문자열 상태에서 저장 버튼을 비활성화한다.
- 출력 DTO: `AdminPollDetailResponse`

### `cmd_admin_poll_delete`

- 입력 DTO: `AdminPollDeleteInput`
- 출력 DTO: `CommandMessage`

## 5. Command 매핑

- `cmd_admin_poll_get_list`
  - keyring 세션 로드
  - `GET /admin/system/polls`
  - `401`이면 refresh 1회 후 재시도
- `cmd_admin_poll_get`
  - keyring 세션 로드
  - `GET /admin/system/polls/{po_id}`
  - `401`이면 refresh 1회 후 재시도
- `cmd_admin_poll_create`
  - keyring 세션 로드
  - `POST /admin/system/polls`
  - `401`이면 refresh 1회 후 재시도
- `cmd_admin_poll_update`
  - keyring 세션 로드
  - `PUT /admin/system/polls/{po_id}`
  - `401`이면 refresh 1회 후 재시도
- `cmd_admin_poll_delete`
  - keyring 세션 로드
  - `DELETE /admin/system/polls/{po_id}`
  - `401`이면 refresh 1회 후 재시도

## 6. UI 정보구조

### 화면 블록

1. 투표 목록 테이블
2. 페이지 이동
3. 투표 생성 폼
4. 선택 투표 수정 폼
5. 선택 투표 상세 확인 패널
6. 선택 투표 삭제 버튼

### 상태 규칙

- 목록 조회 중에는 페이지 버튼을 비활성화한다.
- 상세는 목록에서 선택된 `po_id`가 있을 때만 조회한다.
- 목록 결과가 바뀌어 현재 선택한 `po_id`가 사라지면 첫 번째 행으로 selection을 재설정한다.
- 생성/수정 폼은 `react-hook-form + zod` 기준으로 관리하고, 생성/수정/삭제 mutation 중에는 관련 입력과 버튼을 모두 비활성화한다.
- 제목 또는 항목 1, 2가 비어 있거나 숫자 필드 형식이 맞지 않으면 생성/수정 버튼을 비활성화한다.
- 삭제는 `ConfirmActionDialog` 확인 뒤에만 실행한다.
- 오류 UI는 `guide.reason`과 `request_id`를 함께 보여준다.

## 7. 이번 단계의 범위

### 포함

- 투표 목록 조회
- 투표 상세 조회
- 투표 생성
- 투표 수정
- 투표 삭제
- 페이지 이동
- refresh 기반 재인증 재시도

### 제외

- 실시간 결과 차트
- 투표 참여자 상세 조회
- 투표 결과 export

## 8. 완료 게이트

- 로그인 후 `/admin/system/polls` 목록이 렌더링된다.
- 목록 행 선택 시 `/admin/system/polls/{po_id}` 상세가 렌더링된다.
- 생성 성공 시 목록 재조회 후 새 투표를 선택 상태로 전환한다.
- 수정 성공 시 상세 캐시가 즉시 갱신되고 목록이 재조회된다.
- 삭제 성공 시 상세 캐시를 제거하고 목록을 재조회한다.
- Rust command, TS 타입, React Query 키가 일관되게 연결된다.
- `cargo check --manifest-path g5-admin/src-tauri/Cargo.toml`
- `cargo clippy --manifest-path g5-admin/src-tauri/Cargo.toml --all-targets -- -D warnings`
- `cd g5-admin && bun run build`
