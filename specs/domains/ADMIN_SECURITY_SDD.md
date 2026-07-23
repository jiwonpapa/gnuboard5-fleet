---
doc_type: support
status: active
owner: rust-admin
source_of_truth: false
ai_default_include: true
last_reviewed: 2026-03-13
review_cycle_days: 30
bounded_context: security
---
# ADMIN_SECURITY_SDD

이 문서는 `security` 로컬 앱 보안 작업면의 지원 설계 문서입니다.

## 1. 목표

- `/local/security`에서 마스터 비밀번호, 자동 잠금, 빠른 잠금 해제, OTP, 백업/복구를 하나의 보안 작업면으로 관리합니다.
- 이 도메인은 PHP 관리자 계약이 아니라 로컬 앱 보안 bounded context라는 점을 명확히 유지합니다.

## 2. 계약 표면

주요 local target:
- `local://security/settings`
- `local://security/fast-unlock/status`
- `local://security/fast-unlock/enable`
- `local://security/fast-unlock/disable`
- `local://security/master-password`
- `local://security/idle-timeout`
- `local://security/totp/enrollment`
- `local://security/totp/enable`
- `local://security/totp/disable`
- `local://backup/export`
- `local://backup/import`

## 3. Rust 작업면 경계

관련 feature:
- `g5-admin/src/features/security`

관련 command/service:
- `g5-admin/src-tauri/src/commands/security/*`
- `g5-admin/src-tauri/src/commands/backup.rs`
- `g5-admin/src-tauri/src/app_state/security_settings_service.rs`
- `g5-admin/src-tauri/src/app_state/master_lock_service.rs`

## 4. 상태/오류 원칙

- 보안 설정은 active site와 분리된 로컬 앱 bounded context입니다.
- 민감 작업은 현재 비밀번호와 필요 시 OTP 검증을 거칩니다.
- 빠른 잠금 해제, OTP, 백업은 각각 별도 action이지만 동일한 보안 감사 surface로 취급합니다.

## 최소 smoke checklist

- 보안 설정 조회 시 idle timeout, OTP enabled, fast unlock 상태가 hydrate 됩니다.
- 마스터 비밀번호 변경은 step-up 검증 뒤에만 수행됩니다.
- 자동 잠금 시간 저장 후 즉시 설정 상태가 갱신됩니다.
- 빠른 잠금 해제 등록/해제가 각각 독립 action으로 동작합니다.
- OTP 등록 시작, 활성화, 비활성화가 분리된 단계로 동작합니다.
- 백업 export/import는 보안 검증 뒤에만 수행되고 결과가 activity에 남습니다.
