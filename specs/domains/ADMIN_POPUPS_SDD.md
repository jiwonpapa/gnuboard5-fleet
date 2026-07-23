---
doc_type: support
status: active
owner: rust-admin
source_of_truth: false
ai_default_include: true
last_reviewed: 2026-03-13
review_cycle_days: 30
bounded_context: popups
---
# ADMIN_POPUPS_SDD

이 문서는 Admin Popups 도메인의 지원 설계 문서다.
작업 상태는 `specs/TODO.md`, 우선순위는 `specs/IMPLEMENTATION_ROADMAP.md`를 따른다.

## 1. 목표

관리자 앱이 운영 팝업 목록 조회, 상세 조회, 생성, 수정, 삭제를
Rust command를 통해 안정적으로 수행하도록 만든다.

## 2. 계약 입력

Canonical OpenAPI:
- `/Users/neojins/workspace/gnuboard5/php/api/docs/openapi.yaml`

참조한 실제 백엔드 구현:
- `/Users/neojins/workspace/gnuboard5/php/api/v1/Admin/System/Controller/AdminSystemController.php`
- `/Users/neojins/workspace/gnuboard5/php/api/v1/Admin/System/Service/AdminSystemPopupService.php`
- `/Users/neojins/workspace/gnuboard5/php/api/v1/Admin/System/Repository/AdminSystemPopupRepository.php`

사용 엔드포인트:
- `GET /admin/system/popups` (`operationId: adminSystemListPopups`)
- `GET /admin/system/popups/{nw_id}` (`operationId: adminSystemGetPopup`)
- `POST /admin/system/popups` (`operationId: adminSystemCreatePopup`)
- `PUT /admin/system/popups/{nw_id}` (`operationId: adminSystemUpdatePopup`)
- `DELETE /admin/system/popups/{nw_id}` (`operationId: adminSystemDeletePopup`)

## 3. 실제 응답 shape

OpenAPI는 `MessageResponse`로 느슨하게 정의돼 있지만,
실제 PHP 구현은 아래 구조를 반환한다.

### 목록

```json
{
  "data": [
    {
      "nw_id": 12,
      "nw_division": "both",
      "nw_device": "pc",
      "nw_begin_time": "2026-03-06 10:00:00",
      "nw_end_time": "2026-03-13 10:00:00",
      "nw_disable_hours": 24,
      "nw_left": 100,
      "nw_top": 100,
      "nw_height": 400,
      "nw_width": 600,
      "nw_subject": "점검 공지",
      "nw_content_html": 1
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
    "nw_id": 12,
    "nw_subject": "점검 공지",
    "nw_content": "<p>점검 일정</p>"
  }
}
```

### 생성 / 수정

생성과 수정은 둘 다 상세와 동일한 `data` payload를 envelope로 반환한다.

### 삭제

- 성공 시 `204 No Content`
- 프론트는 이를 `CommandMessage { message: "deleted", request_id }`로 정규화한다.

## 4. Query / DTO 매핑

### `cmd_admin_popup_get_list`

- 입력 DTO: `AdminPopupListQuery`
- QueryString:
  - `page`
  - `per_page`
- 정규화 규칙:
  - `page >= 1`
  - `1 <= per_page <= 100`

### `cmd_admin_popup_get_list` 응답

- 출력 DTO: `AdminPopupListResponse`
- 구성:
  - `popups: Vec<AdminPopup>`
  - `pagination: Pagination`
  - `request_id: String`

### `cmd_admin_popup_get`

- 입력:
  - `nw_id: i32`
- 출력 DTO: `AdminPopupDetailResponse`

### `cmd_admin_popup_create`

- 입력 DTO: `AdminPopupCreateInput`
- 필수:
  - `nw_subject`
  - `nw_content`
- 선택:
  - `nw_division`
  - `nw_device`
  - `nw_begin_time`
  - `nw_end_time`
  - `nw_disable_hours`
  - `nw_left`
  - `nw_top`
  - `nw_height`
  - `nw_width`
  - `nw_content_html`
- 출력 DTO: `AdminPopupDetailResponse`

### `cmd_admin_popup_update`

- 입력 DTO: `AdminPopupUpdateInput`
- 규칙:
  - `nw_id`는 path identity로 유지
  - 변경된 필드만 payload에 포함
  - 본문/제목은 빈 문자열로 보내지 않도록 프론트에서 차단
- 출력 DTO: `AdminPopupDetailResponse`

### `cmd_admin_popup_delete`

- 입력 DTO: `AdminPopupDeleteInput`
- 출력 DTO: `CommandMessage`

## 5. Command 매핑

- `cmd_admin_popup_get_list`
  - keyring 세션 로드
  - `GET /admin/system/popups`
  - `401`이면 refresh 1회 후 재시도
- `cmd_admin_popup_get`
  - keyring 세션 로드
  - `GET /admin/system/popups/{nw_id}`
  - `401`이면 refresh 1회 후 재시도
- `cmd_admin_popup_create`
  - keyring 세션 로드
  - `POST /admin/system/popups`
  - `401`이면 refresh 1회 후 재시도
- `cmd_admin_popup_update`
  - keyring 세션 로드
  - `PUT /admin/system/popups/{nw_id}`
  - `401`이면 refresh 1회 후 재시도
- `cmd_admin_popup_delete`
  - keyring 세션 로드
  - `DELETE /admin/system/popups/{nw_id}`
  - `401`이면 refresh 1회 후 재시도

## 6. UI 정보구조

### 화면 블록

1. 팝업 목록 테이블
2. 페이지 이동
3. 팝업 생성 폼
4. 선택 팝업 수정 폼
5. 선택 팝업 상세 확인 패널
6. 선택 팝업 삭제 버튼

### 상태 규칙

- 목록 조회 중에는 페이지 버튼을 비활성화한다.
- 상세는 목록에서 선택된 `nw_id`가 있을 때만 조회한다.
- 목록 결과가 바뀌어 현재 선택한 `nw_id`가 사라지면 첫 번째 행으로 selection을 재설정한다.
- 생성/수정 폼은 `react-hook-form + zod` 기준으로 관리하고, 생성/수정/삭제 mutation 중에는 관련 입력과 버튼을 모두 비활성화한다.
- enum 값이 허용 범위를 벗어나거나 숫자 필드 형식이 맞지 않으면 생성/수정 버튼을 비활성화한다.
- 삭제는 `ConfirmActionDialog` 확인 뒤에만 실행한다.
- 오류 UI는 `guide.reason`과 `request_id`를 함께 보여준다.

## 7. 이번 단계의 범위

### 포함

- 팝업 목록 조회
- 팝업 상세 조회
- 팝업 생성
- 팝업 수정
- 팝업 삭제
- 페이지 이동
- refresh 기반 재인증 재시도

### 제외

- 배너/테마 연동
- 팝업 미리보기 렌더러
- 팝업 검색/필터

## 8. 완료 게이트

- 로그인 후 `/admin/system/popups` 목록이 렌더링된다.
- 목록 행 선택 시 `/admin/system/popups/{nw_id}` 상세가 렌더링된다.
- 생성 성공 시 목록 재조회 후 새 팝업을 선택 상태로 전환한다.
- 수정 성공 시 상세 캐시가 즉시 갱신되고 목록이 재조회된다.
- 삭제 성공 시 상세 캐시를 제거하고 목록을 재조회한다.
- Rust command, TS 타입, React Query 키가 일관되게 연결된다.
- `cargo check --manifest-path g5-admin/src-tauri/Cargo.toml`
- `cargo clippy --manifest-path g5-admin/src-tauri/Cargo.toml --all-targets -- -D warnings`
- `cd g5-admin && bun run build`
