---
doc_type: roadmap
status: active
owner: rust-admin
source_of_truth: true
canonical_for: implementation roadmap
ai_default_include: true
last_reviewed: 2026-03-13
review_cycle_days: 30
bounded_context: global
---
# IMPLEMENTATION_ROADMAP

이 문서는 이 프로젝트의 구현 우선순위와 착수 순서를 결정하는 유일한 로드맵 SSOT다.
새 기능 우선순위 조정은 이 문서에서만 수행한다.

## 현재 목표

Gnuboard5 관리자용 Tauri 2 데스크탑 앱에서
문서/계약/런타임/Auth Core를 고정한 뒤
Admin Config, Admin Members, Admin Boards, Admin Permissions, Admin QA Config, Admin Polls, Admin Popups 기준선을 고정한 뒤
다음 운영 도구 도메인 확장으로 넘어간다.

## Immediate Priority

- 멀티사이트 루트 진입은 반드시 `로컬 마스터 잠금 설정/해제 -> 사이트 등록/선택 -> 사이트 로그인 -> 사이트 작업 홈` 순서를 따른다.
- 다음 관리자 도메인 확장 전에 `구조 안정화(도메인 경계, registry 단일화, page/command 분할, 문서-코드 정합성)` 기준선을 먼저 고정한다.
- 로컬 마스터 잠금은 앱 전용 비밀번호를 기본으로 하고, 비밀번호 verifier는 로컬 SQLite에 저장하며 패스키/생체인증 해제를 함께 지원하는 방향으로 구현한다.
- 로컬 마스터 비밀번호는 PHP/G5 관리자 비밀번호와 별개다. 사이트 관리자 비밀번호 검증은 계속 PHP 레거시 규칙(`G5_STRING_ENCRYPT_FUNCTION`, `check_password()` 호환)에 맡긴다.
- 첫 사이트는 사용자가 직접 입력해야 하며, `app-config.json` 또는 legacy `apiBaseUrl`을 자동으로 `기본 사이트`로 주입하지 않는다.
- `config.php` 및 G5 상수는 앱이 직접 import 하지 않는다. PHP 설치/운영 단계에서 `.env`/`EnvConfig`로 옮겨 적은 값을 진실 원본으로 사용한다.
- 이미 구현된 사이트 대시보드/활성화/로그인/작업 홈 화면은 모두 마스터 잠금 해제 뒤에만 도달 가능해야 한다.

## 개발 시작 필독 문서

- `specs/foundation/FOUNDATION_SDD.md`
- `specs/foundation/DEV_BOOTSTRAP_CHECKLIST.md`
- `specs/foundation/REST_API_CLIENT_STANDARD.md`
- `specs/foundation/TASK_ORDER_EXECUTION.md`
- `specs/foundation/AUTH_CORE_SDD.md`
- `specs/domains/ADMIN_CONFIG_SDD.md`
- `specs/domains/ADMIN_SMS_SDD.md`
- `specs/domains/ADMIN_BOARDS_SDD.md`
- `specs/domains/ADMIN_MEMBERS_SDD.md`
- `specs/domains/ADMIN_PERMISSIONS_SDD.md`
- `specs/domains/ADMIN_QA_CONFIG_SDD.md`
- `specs/domains/ADMIN_POLLS_SDD.md`
- `specs/domains/ADMIN_POPUPS_SDD.md`

## P0 Foundation

- 목표: Tauri 2 워크스페이스, 문서 SSOT, 개발 착수용 지원 문서를 고정한다.
- 완료 게이트:
  - Rust/Tauri 2 프로젝트 구조 확정
  - 문서 SSOT와 거버넌스 스크립트 적용
  - 기본 개발 명령과 디렉터리 책임 정의
  - `FOUNDATION_SDD.md`, `DEV_BOOTSTRAP_CHECKLIST.md`, `TASK_ORDER_EXECUTION.md`, `AUTH_CORE_SDD.md` 준비
  - `cargo check --manifest-path g5-admin/src-tauri/Cargo.toml`, `cd g5-admin && bun run build` 통과

## P1 Auth Core

- 목표: 로그인, 토큰 저장, Rust 프록시 호출 경로를 구현한다.
- 완료 게이트:
  - OS Keyring 기반 JWT 저장
  - `cmd_auth_login`, `cmd_auth_logout`, `cmd_auth_status` 정의
  - 프론트엔드에서 직접 API 호출 금지 규칙 적용
  - `/members/me` 기반 세션 hydrate 동작
  - keyring 세션 복원과 `request_id` 포함 에러 추적 동작

## P2 Admin Domain Bootstrap

- 목표: 핵심 관리 도메인의 조회/수정 흐름을 연다.
- 우선순위:
  1. 기본 설정
  2. 회원 관리
  3. 게시판 관리
  4. 권한 관리
  5. SMS/운영 도구
- 완료 게이트:
  - 각 도메인별 Tauri command 명명 규칙 준수
  - RFC 7807 에러 파싱 경로 확정
  - React Router 기반 route 페이지와 Rust command 타입 동기화
  - 기본 설정 기준선으로 조회/수정 동작
  - 회원 관리 기준선으로 목록/상세/검색/페이지 이동/수정/삭제 동작
  - 게시판 관리 기준선으로 목록/상세/검색/페이지 이동/생성/수정/삭제 동작
  - 권한 관리 기준선으로 목록/검색/페이지 이동/저장/삭제 동작
  - QA 설정 기준선으로 조회/수정 동작
  - 투표 관리 기준선으로 목록/상세/페이지 이동/생성/수정/삭제 동작
  - 팝업 관리 기준선으로 목록/상세/페이지 이동/생성/수정/삭제 동작

## P2.5 Architecture Stabilization

- 목표: 새 도메인을 더 얹기 전에 registry 중복, god file, DI 경계, SDD/TDD 정합성을 먼저 바로잡는다.
- 완료 게이트:
  - `navigation/router/command-context/lib.rs`의 중복 registry를 single manifest 또는 generated registry 기준으로 정리
  - route-native page의 `page + hook + workspace` 분할 기준을 다시 세우고 300줄 초과 상위 파일 우선순위를 확정
  - `AppState` 중심 concrete 조립에 service/port seam을 만들고 `db/app_state/api_client` root 모듈의 책임을 축소
  - route page가 있는 도메인에 대응하는 SDD / smoke test checklist를 보강
  - 구조 감사와 문서-코드 정합성 체크를 routine workflow에 편입

## P3 Quality Gate

- 목표: 테스트, 로깅, 운영성 기준을 기본선으로 만든다.
- 완료 게이트:
  - `cargo fmt --all`
  - `cargo clippy --manifest-path g5-admin/src-tauri/Cargo.toml --all-targets -- -D warnings`
  - `cd g5-admin && bun run lint`
  - `cd g5-admin && bun run test`
  - 프론트엔드 빌드 및 기본 라우팅 확인
  - 문서 인덱스/검증 자동화 정착

## 변경 원칙

1. 새 기능 착수 전 `specs/TODO.md`의 상태와 이 문서의 우선순위를 함께 확인한다.
2. 우선순위가 바뀌면 관련 TODO 항목보다 먼저 이 문서를 수정한다.
3. 장기 완료 이력은 이 문서가 아니라 `specs/HISTORY.md`에 남긴다.
