---
doc_type: support
status: archived
owner: rust-admin
source_of_truth: false
ai_default_include: false
last_reviewed: 2026-03-13
review_cycle_days: 90
bounded_context: codex
---
# Rust/Tauri 다중 사이트 어드민 앱 보안 구현 프롬프트

## 목표
현재 `MULTI_SITE_SDD.md`, `README.md`, `.agent/Constitution.md`에 반영된 최신 보안 정책을 기준으로, 러스트 데스크톱 앱의 로컬 보안 계층을 제품 수준으로 보강한다.

이 문서는 AI 도구(Codex 등)가 바로 읽고 구현할 수 있는 작업 지시서다.

2026-03-10 구현 상태 메모:
- `DB key keyring-only`, `unlock rate limit/temporary lockout`, `선택형 Google OTP(TOTP)`, `/app/security`, `민감 작업 step-up auth(백업 export/import, 전체 사이트 삭제, 마스터 보안 설정 변경)`, `데스크톱 빠른 잠금 해제(Touch ID / Windows Hello)`까지 구현 완료
- 데스크톱 빠른 잠금 해제는 `tauri-plugin-biometry v0.2.6`을 사용하며, OS biometry secure storage에는 랜덤 secret만 저장하고 로컬 SQLCipher DB에는 그 verifier만 저장한다

구현 범위는 아래 4개다.

1. SQLCipher DB 암호화 키 관리 하드닝
2. 로컬 마스터 비밀번호 경로 하드닝
3. 선택형 Google OTP(TOTP) 2차 인증
4. 상단 보안 설정 메뉴 UI/플로우

중요: 공식 `tauri-plugin-biometric` Rust crate `2.3.2`는 여전히 `#![cfg(mobile)]`로 배포되어 현재 구현에 사용하지 않는다. 현재 저장소의 데스크톱 빠른 잠금 해제 provider는 `tauri-plugin-biometry v0.2.6`이다.

---

## 1. SQLCipher DB 암호화 키 관리 하드닝

### 배경

SQLite 데이터베이스는 이미 SQLCipher로 암호화되지만, 현재 저장소에는 `OS keyring 실패 시 파일 fallback` 경로가 존재한다. 새 구현은 제품 기본값을 `OS keyring only`로 강화해야 한다.

### 작업 지시

1. 기존 `load_database_config`, `open_connection`, `load_or_create_master_key` 구조를 기준으로 DB 암호화 키 관리를 재설계한다.
2. 신규 설치 시 DB 암호화 키는 `UUID 문자열`이 아니라 `OS CSPRNG 32바이트 랜덤 키`를 생성해서 사용한다.
3. 생성된 키는 OS keyring에만 저장한다.
   - 기본 service: `g5-admin-desktop`
   - account: `db-key`
4. 운영 기본값에서는 keyring 접근 실패 시 `.db-master-key` 파일 fallback으로 내려가지 말고 fail closed 한다.
   - 로컬 에러 UI 또는 치명적 안내 후 앱 시작 중단
   - 평문 DB 생성 절대 금지
5. 기존 설치 마이그레이션은 별도 처리한다.
   - 과거 `.db-master-key`가 존재하면 1회만 읽어서 keyring으로 옮긴다.
   - keyring 저장 성공 후 기존 파일은 삭제한다.
   - migration 실패 시 사용자에게 로컬 복구 안내를 보여주고 앱을 중단한다.
6. SQLCipher 연결은 계속 `PRAGMA key = ...` 기반으로 유지한다.
7. 백업 export/import도 같은 DB 키 경계를 유지해야 한다.

### 완료 조건

- DB 파일만 단독 탈취되어도 복호화할 수 없다.
- 신규 설치에서는 DB 키가 파일로 떨어지지 않는다.
- 기존 fallback 사용자도 keyring-only 정책으로 migration 가능하다.

---

## 2. 로컬 마스터 잠금 1차 인증 하드닝

### 기준

- 마스터 비밀번호는 로컬 앱 잠금 전용이다.
- 마스터 비밀번호 평문은 저장하지 않는다.
- DB에는 Argon2id verifier만 저장한다.
- 마스터 비밀번호 자체를 OS keyring에 저장하지 않는다.

### 작업 지시

1. `app_lock` 테이블/모델/커맨드 구조를 유지하면서 비밀번호 검증 경로를 하드닝한다.
2. 마스터 비밀번호 설정은 계속 필수다.
3. 비밀번호 저장은 Argon2id verifier만 유지한다.
4. 잠금 해제 실패에 대해 아래 방어를 추가한다.
   - 실패 횟수 카운트
   - 점진적 backoff 또는 임시 lockout
   - 성공 시 카운트 초기화
5. 민감 작업에는 step-up auth를 추가한다.
   - 마스터 비밀번호 변경
   - OTP 활성화/비활성화
   - 휴대용 암호화 백업 export/import (`.g5bak`)
   - 전체 사이트 삭제
   - 이후 SSH 비밀 변경
6. idle auto-lock과 수동 `앱 잠금`은 기존 구현을 유지하되, 잠금 해제 후 민감 정보 query/cache를 다시 점검한다.

### 빠른 잠금 해제(생체/패스키) 처리 원칙

1. UX 상의 목표는 `비밀번호 먼저 설정 -> 빠른 잠금 해제 추가 등록 여부 질문`이다.
2. 현재 구현은 `tauri-plugin-biometry v0.2.6`을 기준으로 `/app/security`에서 등록/폐기하고, 잠금 해제 화면에서 1차 인증 대체 경로로 사용한다.
3. OS biometry secure storage에는 랜덤 secret만 저장하고, SQLite에는 그 verifier만 저장한다. 마스터 비밀번호 평문 저장은 금지한다.
4. Google OTP가 활성화된 경우 빠른 잠금 해제는 1차 인증만 대체하고, OTP 6자리 검증은 그대로 후속 단계로 유지한다.
5. 공식 `tauri-plugin-biometric`을 현재 구현 provider로 오인하지 않는다. 이 플러그인은 여전히 데스크톱 기준이 아니다.

---

## 3. 선택형 2차 인증 (Google OTP / TOTP RFC 6238)

### 기준

- 2차 인증은 기본 필수가 아니라 선택 사항이다.
- 전체 앱 잠금 기본 경로보다 `민감 작업 step-up auth` 성격이 우선이다.
- TOTP secret은 프론트엔드에 영구 저장하지 않는다.

### 작업 지시

1. TOTP는 `RFC 6238` 기준으로 구현한다.
2. 의존성은 `totp-rs` 계열 또는 동급 Rust 라이브러리를 사용한다.
3. `app_lock` 또는 별도 보안 메타데이터 저장소에는 아래만 둔다.
   - `totp_enabled`
   - `totp_enrolled_at`
   - `recovery_codes_hash` 또는 동등 메타데이터
4. 실제 `totp_secret` 평문은 DB에 직접 저장하지 말고 OS keyring에 저장한다.
   - service: `g5-admin-desktop`
   - account: `totp-master`
5. 활성화 플로우:
   - 마스터 비밀번호 재확인
   - Rust가 TOTP secret 생성
   - `otpauth://totp/G5Admin:{device_or_user}?secret=...&issuer=G5Admin&algorithm=SHA1&digits=6&period=30` URI 생성
   - 프론트는 QR 코드 모달 출력
   - 사용자가 6자리 코드를 입력
   - Rust가 검증 성공 시에만 `totp_enabled = true`
6. 비활성화 플로우:
   - 마스터 비밀번호 재확인
   - 필요 시 현재 OTP 코드도 한 번 더 요구 가능
   - keyring secret 삭제 + 메타데이터 비활성화
7. 잠금 해제 플로우:
   - 1차 인증(비밀번호, 또는 장차 추가될 빠른 잠금 해제) 통과
   - `totp_enabled`이면 OTP 입력 단계로 전환
   - 검증 성공 후 최종 해제

---

## 4. 상단 보안 설정 메뉴 UI 구현

### 기술 기준

- 현재 저장소는 `Vite + React + Tauri` 기준이다.
- `Next.js`를 전제하지 않는다.
- 기존 AppShell / header / sidebar IA를 존중한다.

### View/Route 기준

- 진입점은 상단 우측 사용자 카드/프로필 영역에서 가장 직접적으로 들어갈 수 있어야 한다.
- 화면명은 `보안 설정`
- 컴포넌트명은 `SecuritySettingsView`

### 기능 명세

1. 마스터 비밀번호 변경
   - 기존 비밀번호 확인
   - 새 비밀번호 / 새 비밀번호 확인
   - 성공 시 기존 verifier 교체
2. 빠른 잠금 해제 관리
   - 현재는 provider 상태 표시
   - 지원 가능 시 등록/폐기 버튼
   - 미지원 환경이면 명확한 안내문 표시
3. 2차 인증 (Google OTP)
   - 활성화 버튼
   - QR 코드 모달
   - 6자리 코드 확인 입력
   - 비활성화 버튼
4. 자동 잠금 시간 설정
   - 5분 / 15분 / 30분 / 60분 / 사용 안 함
   - 로컬 app_settings 또는 동등 저장소에 유지
5. 민감 작업에는 step-up auth를 재사용한다.

---

## 5. 현재 저장소와의 정합성 제약

1. 프론트엔드 input 값은 사용자가 입력하는 순간에는 일시적으로 존재할 수 있다.
2. 다만 아래는 금지한다.
   - React Query 캐시 저장
   - localStorage/sessionStorage 저장
   - 콘솔 로그 출력
   - PHP API 전송
   - 에러 payload/토스트에 민감 값 포함
3. 민감 정보는 submit 직후 즉시 clear 한다.
4. PHP API는 여전히 사이트 관리자 인증만 담당한다. 로컬 보안 이슈를 PHP로 넘기지 않는다.
5. 아직 구현되지 않은 SSH/SFTP 계층은 이번 턴 범위가 아니다.
   - 다만 이후 구현 시 `SSH host/username/key_path`는 SQLCipher DB
   - `SSH password/passphrase`는 OS keyring
   - 이 정책은 지금 문서/타입 설계에 반영 가능하다

---

## 6. 구현 순서

아래 순서대로만 진행한다.

1. DB 암호화 키 관리 하드닝
2. 마스터 비밀번호 경로 하드닝 + step-up auth 골격
3. 보안 설정 화면 기본 UI
4. 선택형 TOTP 2차 인증
5. 데스크톱 빠른 잠금 해제 구현 (`tauri-plugin-biometry v0.2.6`)

---

## 7. 검증 기준

아래를 통과해야 한다.

- `cargo check`
- `cargo test`
- `bun run lint`
- `bun run test`
- `bun run build:web:fast`
- 문서 반영 시 `python3 scripts/doc-index.py`
- 문서 반영 시 `bash scripts/check-doc-governance.sh`

추가 확인:

- keyring unavailable 경로에서 fail closed 되는지
- 기존 `.db-master-key` migration이 성공하는지
- DB 파일만 단독 복사해도 평문 조회가 안 되는지
- TOTP 활성화/비활성화/해제 실패 경로가 정상인지

---

이 프롬프트를 읽는 구현 에이전트는 위 내용을 현재 저장소 사실로 간주하고, 상상으로 생체인증 플러그인을 확정하지 말 것.
