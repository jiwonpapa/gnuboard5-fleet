---
doc_type: support
status: active
owner: rust-admin
source_of_truth: false
ai_default_include: true
last_reviewed: 2026-03-13
review_cycle_days: 30
bounded_context: members
---
# ADMIN_MEMBERS_SDD

이 문서는 Admin Members 도메인의 지원 설계 문서다.
작업 상태는 `specs/TODO.md`, 우선순위는 `specs/IMPLEMENTATION_ROADMAP.md`를 따른다.

## 1. 목표

관리자 앱이 route 기반 작업면에서 회원 목록 조회, 회원 상세 조회,
레벨 변경, 프로필 수정, 삭제를 Rust command 경계를 통해 안정적으로 수행하도록 만든다.

## 2. 계약 입력

Canonical OpenAPI:
- `/Users/neojins/workspace/gnuboard5/php/api/docs/openapi.yaml`

참조한 실제 백엔드 구현:
- `/Users/neojins/workspace/gnuboard5/php/api/v1/Admin/Member/Controller/AdminMemberController.php`
- `/Users/neojins/workspace/gnuboard5/php/api/v1/Admin/Member/Service/AdminMemberQueryService.php`
- `/Users/neojins/workspace/gnuboard5/php/api/v1/Admin/Member/Repository/AdminMemberRepository.php`

사용 엔드포인트:
- `GET /admin/members` (`operationId: adminListMembers`)
- `GET /admin/members/{mb_id}` (`operationId: adminGetMember`)
- `PATCH /admin/members/{mb_id}` (`operationId: adminUpdateMember`)
- `PATCH /admin/members/{mb_id}/level` (`operationId: adminUpdateMemberLevel`)
- `DELETE /admin/members/{mb_id}` (`operationId: adminDeleteMember`)

## 3. 실제 응답 shape

OpenAPI는 `MessageResponse`로 느슨하게 정의돼 있지만,
실제 PHP 구현은 아래 구조를 반환한다.

### 목록

```json
{
  "data": [
    {
      "mb_id": "admin",
      "mb_name": "관리자",
      "mb_nick": "admin",
      "mb_email": "admin@example.com",
      "mb_level": 10,
      "mb_point": 100,
      "mb_datetime": "2026-03-06 10:00:00",
      "mb_today_login": "2026-03-06 11:00:00",
      "mb_leave_date": "",
      "mb_intercept_date": ""
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
    "mb_id": "admin",
    "mb_name": "관리자",
    "mb_nick": "admin",
    "mb_email": "admin@example.com",
    "mb_level": 10,
    "mb_point": 100
  }
}
```

## 4. Query / DTO 매핑

### `cmd_admin_member_get_list`

- 입력 DTO: `AdminMemberListQuery`
- QueryString:
  - `page`
  - `per_page`
  - `search`
- 정규화 규칙:
  - `page >= 1`
  - `1 <= per_page <= 100`
  - 빈 문자열 검색어는 `None`

### `cmd_admin_member_get_list` 응답

- 출력 DTO: `AdminMemberListResponse`
- 구성:
  - `members: Vec<AdminMemberListItem>`
  - `pagination: Pagination`
  - `request_id: String`

### `cmd_admin_member_get`

- 입력:
  - `mb_id: String`
- 출력 DTO: `AdminMemberDetailResponse`

### `cmd_admin_member_update_level`

- 입력 DTO: `AdminMemberLevelUpdateInput`
- Body:
  - `mb_id`
  - `mb_level`
- 제약:
  - `mb_level`은 `1..10`
  - 자기 자신 레벨 수정 금지
  - 최고관리자 레벨 수정 금지
  - 본인보다 높은 레벨로 올리기 금지
- 출력 DTO: `AdminMemberDetailResponse`

### `cmd_admin_member_update`

- 입력 DTO: `AdminMemberUpdateInput`
- 현재 구현한 수정 필드:
  - `mb_name`
  - `mb_nick`
  - `mb_email`
  - `mb_homepage`
  - `mb_zip`
  - `mb_addr1`
  - `mb_addr2`
  - `mb_intercept_date`
  - `mb_mailling`
  - `mb_sms`
  - `mb_marketing_agree`
  - `mb_thirdparty_agree`
- 전송 규칙:
  - 변경된 필드만 payload에 포함
  - 빈 문자열은 clear 의도이므로 실제 값으로 전송
- 출력 DTO: `AdminMemberDetailResponse`

### `cmd_admin_member_delete`

- 입력 DTO: `AdminMemberDeleteInput`
- 출력 DTO: `CommandMessage`
- 성공 응답:
  - `message = "deleted"`
  - `request_id`

## 5. Command 매핑

- `cmd_admin_member_get_list`
  - keyring 세션 로드
  - `GET /admin/members`
  - `401`이면 refresh 1회 후 재시도
- `cmd_admin_member_get`
  - keyring 세션 로드
  - `GET /admin/members/{mb_id}`
  - `401`이면 refresh 1회 후 재시도
- `cmd_admin_member_update_level`
  - keyring 세션 로드
  - `PATCH /admin/members/{mb_id}/level`
  - `401`이면 refresh 1회 후 재시도
- `cmd_admin_member_update`
  - keyring 세션 로드
  - `PATCH /admin/members/{mb_id}`
  - `401`이면 refresh 1회 후 재시도
- `cmd_admin_member_delete`
  - keyring 세션 로드
  - `DELETE /admin/members/{mb_id}`
  - `401`이면 refresh 1회 후 재시도
- `cmd_member_me_get`
  - 대시보드 상단 현재 사용자 정보 hydrate

## 6. UI 정보구조

### 화면 블록

1. 현재 로그인한 관리자 세션 요약
2. 회원 검색/페이지 이동
3. 회원 목록 테이블
4. 선택 회원 상세 패널
5. 상세 패널 내 레벨 수정 컨트롤
6. 상세 패널 내 프로필 수정 폼
7. 상세 패널 내 삭제 버튼

### route 구조

- `/members`
  - 회원 목록 조회 전용 작업면
  - 검색/페이지 상태는 query string(`page`, `search`)으로 유지
- `/members/{mb_id}`
  - 목록 query string을 유지한 채 상세 패널을 활성화
  - 상세 조회, 레벨 수정, 프로필 저장, 삭제를 이 route에서 수행

### 상태 규칙

- 목록 조회 중에는 검색/페이지 버튼을 비활성화한다.
- 상세는 route param으로 선택된 `mb_id`가 있을 때만 조회한다.
- 검색/페이지 이동 시 route는 기본적으로 `/members`로 복귀하고, selection은 명시적 row click으로만 활성화한다.
- 오류 UI는 `guide.reason`과 `request_id`를 함께 보여준다.
- 레벨 수정 제출 중에는 `select`와 저장 버튼을 함께 비활성화한다.
- 자기 자신 또는 최고관리자 선택 시 레벨 저장 버튼은 프론트에서 비활성화한다.
- 프로필 수정은 변경된 필드가 하나도 없으면 저장 버튼을 비활성화한다.
- 삭제는 `ConfirmActionDialog` 확인 뒤에만 실행한다.
- 삭제 성공 시 detail selection을 비우고 목록을 다시 조회한다.

## 7. 이번 단계의 범위

### 포함

- 회원 목록 조회
- 회원 상세 조회
- 검색어 기반 필터
- 페이지 이동
- 레벨 수정
- 프로필 수정
- 회원 삭제
- refresh 기반 재인증 재시도

### 제외

- 이미지/아이콘 업로드
- 대량 액션

## 8. 완료 게이트

- 로그인 후 `/admin/members` 목록이 렌더링된다.
- 목록 행 선택 시 `/admin/members/{mb_id}` 상세가 렌더링된다.
- 상세 패널에서 레벨을 바꾸면 `/admin/members/{mb_id}/level` 호출 후 목록/상세가 함께 갱신된다.
- 상세 패널에서 프로필 저장 시 `/admin/members/{mb_id}` patch 후 목록/상세가 함께 갱신된다.
- 상세 패널에서 삭제 시 `/admin/members/{mb_id}` delete 후 선택이 초기화되고 목록이 재조회된다.
- Rust command, TS 타입, React Query 키가 일관되게 연결된다.
- `cargo check --manifest-path g5-admin/src-tauri/Cargo.toml`
- `cargo clippy --manifest-path g5-admin/src-tauri/Cargo.toml --all-targets -- -D warnings`
- `cd g5-admin && bun run build`
