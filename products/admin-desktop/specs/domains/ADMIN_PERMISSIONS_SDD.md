---
doc_type: support
status: active
owner: rust-admin
source_of_truth: false
ai_default_include: true
last_reviewed: 2026-03-13
review_cycle_days: 30
bounded_context: permissions
---
# ADMIN_PERMISSIONS_SDD

이 문서는 Admin Permissions 도메인의 지원 설계 문서다.
작업 상태는 `specs/TODO.md`, 우선순위는 `specs/IMPLEMENTATION_ROADMAP.md`를 따른다.

## 1. 목표

관리자 앱이 시스템 권한 목록 조회, 단건 저장, 단건 삭제를
Rust command를 통해 안정적으로 수행하도록 만든다.

## 2. 계약 입력

Canonical OpenAPI:
- `/Users/neojins/workspace/gnuboard5/php/api/docs/openapi.yaml`

참조한 실제 백엔드 구현:
- `/Users/neojins/workspace/gnuboard5/php/api/v1/Admin/System/Controller/AdminSystemController.php`
- `/Users/neojins/workspace/gnuboard5/php/api/v1/Admin/System/Service/AdminSystemAuthService.php`
- `/Users/neojins/workspace/gnuboard5/php/api/v1/Admin/System/Repository/AdminSystemAuthRepository.php`

사용 엔드포인트:
- `GET /admin/system/auths` (`operationId: adminSystemListAuths`)
- `POST /admin/system/auths` (`operationId: adminSystemSaveAuth`)
- `DELETE /admin/system/auths/{mb_id}/{au_menu}` (`operationId: adminSystemDeleteAuth`)

## 3. 실제 응답 shape

OpenAPI는 `MessageResponse`로 느슨하게 정의돼 있지만,
실제 PHP 구현은 아래 구조를 반환한다.

### 목록

```json
{
  "data": [
    {
      "mb_id": "admin",
      "au_menu": "100100",
      "au_auth": "rwd",
      "mb_name": "관리자",
      "mb_nick": "admin"
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

### 저장

```json
{
  "data": {
    "mb_id": "admin",
    "au_menu": "100100",
    "au_auth": "rwd"
  }
}
```

### 삭제

- 성공 시 `204 No Content`
- 프론트는 이를 `CommandMessage { message: "deleted", request_id }`로 정규화한다.

## 4. Query / DTO 매핑

### `cmd_admin_permission_get_list`

- 입력 DTO: `AdminPermissionListQuery`
- QueryString:
  - `page`
  - `per_page`
  - `mb_id`
- 정규화 규칙:
  - `page >= 1`
  - `1 <= per_page <= 100`
  - 빈 문자열 `mb_id`는 `None`

### `cmd_admin_permission_get_list` 응답

- 출력 DTO: `AdminPermissionListResponse`
- 구성:
  - `permissions: Vec<AdminPermissionItem>`
  - `pagination: Pagination`
  - `request_id: String`

### `cmd_admin_permission_save`

- 입력 DTO: `AdminPermissionSaveInput`
- Body:
  - `mb_id`
  - `au_menu`
  - `au_auth`
- 정규화 규칙:
  - `mb_id`는 trim 후 전달
  - `au_menu`는 trim 후 전달
  - `au_auth`는 공백/쉼표 제거 후 `rwd` 순서로 정규화 시도
  - 유효성 최종 판단은 서버가 수행
- 출력 DTO: `AdminPermissionSaveResponse`

### `cmd_admin_permission_delete`

- 입력 DTO: `AdminPermissionDeleteInput`
- 출력 DTO: `CommandMessage`

## 5. Command 매핑

- `cmd_admin_permission_get_list`
  - keyring 세션 로드
  - `GET /admin/system/auths`
  - `401`이면 refresh 1회 후 재시도
- `cmd_admin_permission_save`
  - keyring 세션 로드
  - `POST /admin/system/auths`
  - `401`이면 refresh 1회 후 재시도
- `cmd_admin_permission_delete`
  - keyring 세션 로드
  - `DELETE /admin/system/auths/{mb_id}/{au_menu}`
  - `401`이면 refresh 1회 후 재시도

## 6. UI 정보구조

### 화면 블록

1. 권한 검색/페이지 이동
2. 권한 목록 테이블
3. 선택 권한 또는 신규 권한 저장 폼
4. 선택 권한 삭제 버튼
5. 선택 권한 상세 확인 패널

### 상태 규칙

- 목록 조회 중에는 검색/페이지 버튼을 비활성화한다.
- 목록 결과가 바뀌어 현재 선택한 `(mb_id, au_menu)`가 사라지면 첫 번째 행으로 selection을 재설정한다.
- 행을 선택하면 우측 저장 폼이 해당 권한 값으로 hydrate 되고, 폼은 `react-hook-form + zod`로 관리한다.
- 저장 mutation 중에는 입력과 저장 버튼을 함께 비활성화한다.
- `mb_id`, `au_menu`, `au_auth`가 유효하지 않으면 저장 버튼을 비활성화한다.
- 삭제는 현재 선택한 권한 항목에 대해서만 허용하고 `ConfirmActionDialog` 확인 뒤에 실행한다.
- 오류 UI는 `guide.reason`과 `request_id`를 함께 보여준다.

## 7. 이번 단계의 범위

### 포함

- 권한 목록 조회
- 회원 아이디 기반 필터
- 페이지 이동
- 단건 권한 저장(upsert)
- 단건 권한 삭제
- refresh 기반 재인증 재시도

### 제외

- 회원 단위 전체 권한 일괄 치환
- 메뉴 코드 추천/자동완성
- 권한 템플릿 프리셋

## 8. 완료 게이트

- 로그인 후 `/admin/system/auths` 목록이 렌더링된다.
- 목록 행 선택 시 저장 폼이 `(mb_id, au_menu, au_auth)`로 hydrate 된다.
- 저장 성공 시 목록이 재조회되고 같은 항목을 다시 선택 상태로 유지한다.
- 삭제 성공 시 목록이 재조회되고 선택 상태가 정리된다.
- Rust command, TS 타입, React Query 키가 일관되게 연결된다.
- `cargo check --manifest-path g5-admin/src-tauri/Cargo.toml`
- `cargo clippy --manifest-path g5-admin/src-tauri/Cargo.toml --all-targets -- -D warnings`
- `cd g5-admin && bun run build`
