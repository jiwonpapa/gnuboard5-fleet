---
doc_type: support
status: active
owner: rust-admin
source_of_truth: false
ai_default_include: true
last_reviewed: 2026-03-13
review_cycle_days: 30
bounded_context: boards
---
# ADMIN_BOARDS_SDD

이 문서는 Admin Boards 도메인의 지원 설계 문서다.
작업 상태는 `specs/TODO.md`, 우선순위는 `specs/IMPLEMENTATION_ROADMAP.md`를 따른다.

## 1. 목표

관리자 앱이 게시판 목록 조회, 상세 조회, 생성, 수정, 삭제를
Rust command를 통해 안정적으로 수행하도록 만든다.

## 2. 계약 입력

Canonical OpenAPI:
- `/Users/neojins/workspace/gnuboard5/php/api/docs/openapi.yaml`

참조한 실제 백엔드 구현:
- `/Users/neojins/workspace/gnuboard5/php/api/v1/Admin/Board/Controller/AdminBoardController.php`
- `/Users/neojins/workspace/gnuboard5/php/api/v1/Admin/Board/Service/AdminBoardService.php`
- `/Users/neojins/workspace/gnuboard5/php/api/v1/Admin/Board/Repository/AdminBoardRepository.php`

사용 엔드포인트:
- `GET /admin/boards` (`operationId: adminListBoards`)
- `GET /admin/boards/{bo_table}` (`operationId: adminGetBoard`)
- `POST /admin/boards` (`operationId: adminCreateBoard`)
- `PUT /admin/boards/{bo_table}` (`operationId: adminUpdateBoard`)
- `DELETE /admin/boards/{bo_table}` (`operationId: adminDeleteBoard`)

## 3. 실제 응답 shape

OpenAPI는 `MessageResponse`로 느슨하게 정의돼 있지만,
실제 PHP 구현은 아래 구조를 반환한다.

### 목록

```json
{
  "data": [
    {
      "bo_table": "notice",
      "bo_subject": "공지사항",
      "gr_id": "community",
      "bo_read_level": 1,
      "bo_write_level": 10,
      "bo_comment_level": 10,
      "bo_download_level": 1,
      "bo_use_category": 0,
      "bo_category_list": "",
      "bo_count_write": 42,
      "bo_count_comment": 17,
      "bo_use_secret": 0,
      "bo_upload_count": 2,
      "bo_upload_size": 10485760
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
    "bo_table": "notice",
    "bo_subject": "공지사항",
    "gr_id": "community"
  }
}
```

### 생성 / 수정

생성과 수정은 둘 다 상세와 동일한 `data` payload를 envelope로 반환한다.

### 삭제

- 성공 시 `204 No Content`
- 프론트는 이를 `CommandMessage { message: "deleted", request_id }`로 정규화한다.

## 4. Query / DTO 매핑

### `cmd_admin_board_get_list`

- 입력 DTO: `AdminBoardListQuery`
- QueryString:
  - `page`
  - `per_page`
  - `gr_id`
  - `search`
- 정규화 규칙:
  - `page >= 1`
  - `1 <= per_page <= 100`
  - 빈 문자열 검색어는 `None`
  - 빈 문자열 `gr_id`는 `None`

### `cmd_admin_board_get_list` 응답

- 출력 DTO: `AdminBoardListResponse`
- 구성:
  - `boards: Vec<AdminBoard>`
  - `pagination: Pagination`
  - `request_id: String`

### `cmd_admin_board_get`

- 입력:
  - `bo_table: String`
- 출력 DTO: `AdminBoardDetailResponse`

### `cmd_admin_board_create`

- 입력 DTO: `AdminBoardCreateInput`
- 필수:
  - `bo_table`
  - `bo_subject`
  - `gr_id`
- 선택:
  - `bo_read_level`
  - `bo_write_level`
  - `bo_comment_level`
  - `bo_download_level`
  - `bo_use_category`
  - `bo_category_list`
  - `bo_use_secret`
  - `bo_upload_count`
  - `bo_upload_size`
- 출력 DTO: `AdminBoardDetailResponse`

### `cmd_admin_board_update`

- 입력 DTO: `AdminBoardUpdateInput`
- 규칙:
  - `bo_table`은 path identity로 유지
  - 변경된 필드만 payload에 포함
  - 빈 문자열도 명시 수정값으로 허용
- 출력 DTO: `AdminBoardDetailResponse`

### `cmd_admin_board_delete`

- 입력 DTO: `AdminBoardDeleteInput`
- 출력 DTO: `CommandMessage`

## 5. Command 매핑

- `cmd_admin_board_get_list`
  - keyring 세션 로드
  - `GET /admin/boards`
  - `401`이면 refresh 1회 후 재시도
- `cmd_admin_board_get`
  - keyring 세션 로드
  - `GET /admin/boards/{bo_table}`
  - `401`이면 refresh 1회 후 재시도
- `cmd_admin_board_create`
  - keyring 세션 로드
  - `POST /admin/boards`
  - `401`이면 refresh 1회 후 재시도
- `cmd_admin_board_update`
  - keyring 세션 로드
  - `PUT /admin/boards/{bo_table}`
  - `401`이면 refresh 1회 후 재시도
- `cmd_admin_board_delete`
  - keyring 세션 로드
  - `DELETE /admin/boards/{bo_table}`
  - `401`이면 refresh 1회 후 재시도

## 6. UI 정보구조

### 화면 블록

1. 게시판 검색/페이지 이동
2. 게시판 목록 테이블
3. 게시판 생성 폼
4. 선택 게시판 수정/삭제 패널
5. 선택 게시판 상세 확인 패널

### 상태 규칙

- 목록 조회 중에는 검색/페이지 버튼을 비활성화한다.
- 상세는 목록에서 선택된 `bo_table`이 있을 때만 조회한다.
- 목록 결과가 바뀌어 현재 선택한 `bo_table`이 사라지면 첫 번째 행으로 selection을 재설정한다.
- 생성/수정 폼은 `react-hook-form + zod` 기준으로 관리하고, 생성/수정/삭제 mutation 중에는 관련 입력과 버튼을 모두 비활성화한다.
- 숫자 필드가 정수 형식이 아니면 생성/수정 버튼을 비활성화한다.
- 삭제는 `ConfirmActionDialog` 확인 뒤에만 실행한다.
- 오류 UI는 `guide.reason`과 `request_id`를 함께 보여준다.

## 7. 이번 단계의 범위

### 포함

- 게시판 목록 조회
- 게시판 상세 조회
- 게시판 생성
- 게시판 수정
- 게시판 삭제
- 검색어 기반 필터
- 페이지 이동
- refresh 기반 재인증 재시도

### 제외

- 게시판 복사
- 최근글/운영 도구 연동

## 8. 완료 게이트

- 로그인 후 `/admin/boards` 목록이 렌더링된다.
- 목록 행 선택 시 `/admin/boards/{bo_table}` 상세가 렌더링된다.
- 생성 성공 시 목록 재조회 후 새 게시판을 선택 상태로 전환한다.
- 수정 성공 시 상세 캐시가 즉시 갱신되고 목록이 재조회된다.
- 삭제 성공 시 상세 캐시를 제거하고 목록을 재조회한다.
- Rust command, TS 타입, React Query 키가 일관되게 연결된다.
- `cargo check --manifest-path g5-admin/src-tauri/Cargo.toml`
- `cargo clippy --manifest-path g5-admin/src-tauri/Cargo.toml --all-targets -- -D warnings`
- `cd g5-admin && bun run build`
