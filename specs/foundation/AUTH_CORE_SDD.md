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
# AUTH_CORE_SDD

이 문서는 첫 구현 대상인 Auth Core의 지원 설계 문서다.
작업 상태는 `specs/TODO.md`, 우선순위는 `specs/IMPLEMENTATION_ROADMAP.md`를 따른다.

## 1. 목표

관리자 앱이 로그인, 세션 복원, 로그아웃을
웹뷰 저장소 없이 Rust 세션 저장소와 Tauri IPC만으로 처리하도록 만든다.

## 2. 계약 입력

OpenAPI 기준 파일:
- `/Users/neojins/workspace/gnuboard5/php/api/docs/openapi.yaml`

사용할 실제 엔드포인트:
- `POST /auth/login` (`operationId: login`)
- `POST /auth/refresh` (`operationId: refreshToken`)
- `POST /auth/logout` (`operationId: logout`)
- `GET /members/me` (`operationId: getMyProfile`)

## 3. 범위

### 포함

- 로그인 폼 제출
- access/refresh token 저장
- 앱 시작 시 세션 복원
- 로그아웃
- 현재 사용자 프로필 hydrate

### 제외

- 회원가입
- 비밀번호 재설정
- 이메일 인증
- 관리자 권한 상세 편집

## 4. Command 매핑

- `cmd_auth_login`
  - 입력: `mb_id`, `mb_password`
  - 외부 호출:
    - `POST /auth/login`
    - 성공 후 `GET /members/me`
- `cmd_auth_refresh`
  - 입력: 없음 또는 내부 저장된 `refresh_token`
  - 외부 호출:
    - `POST /auth/refresh`
- `cmd_auth_logout`
  - 입력: 없음
  - 외부 호출:
    - `POST /auth/logout` with optional `refresh_token`
- `cmd_auth_status`
  - 입력: 없음
  - 동작:
    - keyring 세션 읽기
    - access token 유효 시 `GET /members/me`
    - `401` 발생 시 refresh 1회 시도
- `cmd_member_me_get`
  - 입력: 없음
  - 외부 호출:
    - `GET /members/me`

## 5. 세션 저장 정책

- JWT는 WebView `LocalStorage`/`SessionStorage`에 저장하지 않는다.
- 세션 저장소에는 최소 아래 정보를 저장한다.
  - `mb_id`
  - `access_token`
  - `refresh_token`
  - `expires_in` 또는 계산된 만료 시각
- 저장 포맷은 단일 JSON payload를 기본으로 한다.
- `sessionStorage=keychain`이면 keyring service name은 `G5_KEYRING_SERVICE`를 우선 사용하고, 미지정 시 `g5-admin-desktop`을 기본값으로 한다.
- `sessionStorage=file`이면 로컬 앱 데이터 경로의 `g5-admin/session.json`을 기본값으로 사용하고, `G5_SESSION_STORE_PATH`로 override 할 수 있다.
- 개발용 ad-hoc/unsigned fast deploy는 OS 사용자 설정 파일에 `sessionStorage=file`, `dbMasterStorage=file`을 관리한다. 다만 기존 keychain-backed DB가 이미 있으면 런타임이 keychain의 `db-key`를 로컬 `.db-master-key`로 복사 마이그레이션해, fast deploy 후에도 사이트/SSH 프로필을 다시 입력하지 않게 유지한다.

## 6. 런타임 흐름

### 로그인

1. React 로그인 폼 제출
2. `cmd_auth_login` 호출
3. Rust가 `POST /auth/login` 호출
4. 성공 시 세션 저장소 저장
5. Rust가 `GET /members/me` 호출
6. React는 세션 스냅샷을 받아 보호 라우트로 이동

### 앱 시작

1. 앱 시작 시 `cmd_auth_status`
2. 저장된 세션이 없으면 비인증 상태 반환
3. 저장된 세션이 있으면 `GET /members/me`
4. `401`이면 `cmd_auth_refresh` 경로 1회 시도
5. refresh 실패 시 저장된 세션 삭제 후 비인증 상태 반환

### 로그아웃

1. `cmd_auth_logout`
2. 저장된 `refresh_token`이 있으면 `POST /auth/logout`
3. 원격 응답과 관계없이 로컬 세션 저장 제거
4. React 세션 캐시 초기화

## 7. 에러 처리

- `400`: 입력 검증 실패 또는 잘못된 요청
- `401`: 인증 실패/토큰 만료
- `403`: 관리자 권한 부족 또는 접근 금지
- 모든 실패 응답은 Rust에서 `AppError`로 정규화 후 UI에 `request_id`와 함께 전달한다.
- 로그인 실패 시 비밀번호는 절대 로그에 남기지 않는다.

## 8. UI 요구사항

- 로그인 버튼은 제출 중 즉시 비활성화한다.
- `401`과 `403` 메시지를 구분해 보여준다.
- 에러 Toast에는 `guide.action`, `guide.reason`, `request_id`를 표시한다.
- 인증 성공 전에는 관리자 라우트 진입을 허용하지 않는다.

## 9. 완료 게이트

- 로그인 성공 -> 세션 저장 -> 내 정보 hydrate 흐름이 동작한다.
- 앱 재시작 후 세션 복원이 동작한다.
- 로그아웃 시 세션 저장소와 Query 캐시가 함께 초기화된다.
- 모든 장애 로그가 `component`, `operation`, `target`, `error`, `request_id`를 남긴다.
