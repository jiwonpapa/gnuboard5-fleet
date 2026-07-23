---
doc_type: roadmap
status: active
owner: rust-admin
source_of_truth: false
ai_default_include: true
last_reviewed: 2026-03-13
review_cycle_days: 30
bounded_context: foundation
---
# FORM SAVE SMOKE ROLLOUT PLAN

이 문서는 `T2-101 관리자 폼 저장 스모크 자동화`의 rollout 지원 문서입니다.
현재 baseline과 경고는 `specs/domains/FORM_SAVE_SMOKE_COVERAGE.toml`,
`python3 scripts/check_form_save_smoke_coverage.py`,
`specs/audits/2026-03-13-FORM_SAVE_SMOKE_AUDIT.md`를 기준으로 봅니다.

## 1. 목적

- route-native 관리자 폼의 저장 회귀를 사람 수동 점검이 아니라 상설 smoke evidence로 표면화합니다.
- `schema load -> 입력 -> 저장 -> 성공/404/validation` 흐름을 feature별 최소 증적으로 고정합니다.
- page render smoke와 form serializer/unit test 사이의 빈 구간을 메웁니다.

## 2. 대상 수준

- 원격 PHP-backed 폼 목표:
  - `page_save_404_validation`
  - 의미: page-level save success + unsupported 404 + validation evidence
- 로컬 폼 목표:
  - `page_save_validation`
  - 의미: page-level save success + validation evidence

## 3. 구현 원칙

1. page-level save smoke는 대표 저장 경로 하나만 검증합니다.
2. validation은 form/helper test와 page test 중 더 안정적인 쪽에 둡니다.
3. unsupported 404는 remote-backed surface에서만 요구합니다.
4. serializer/diff unit test는 유지하되, page smoke가 없으면 저장 회귀가 닫힌 것으로 보지 않습니다.
5. 억지로 모든 필드를 입력하지 말고, 저장 mutation과 사용자 메시지/상태 전이만 최소 단위로 고정합니다.

## 4. rollout 상태

### 완료 상태

- `P1`, `P2` feature 18개가 모두 `save_ready`로 승격됐습니다.
- 최종 baseline은 `warnings=0`, `page_save_features=18`, `validation_guard_features=18`, `unsupported_404_features=17`, `save_ready_features=18`입니다.
- remote-backed 17개는 page-level unsupported 404 UX까지 확보했고, local `security`는 save + validation 기준을 유지합니다.

## 5. feature별 최소 성공 기준

- `config`: `updateAdminConfig` 호출 + diff payload 유지 + unsupported 404
- `layouts`: `saveAdminLayout` 또는 `updateAdminLayoutWidget` 호출 + unsupported 404
- `mails`: `sendAdminMail` 또는 template save 호출 + validation + unsupported 404
- `members`: profile/level edit 저장 호출 + unsupported 404
- `points`: grant/deduct/expire action 호출 + validation + unsupported 404
- `security`: idle timeout 또는 password/TOTP 저장 호출 + validation
- `system`: `updateAdminSmsConfig` 호출 + 기존 unsupported 404 유지
- `theme`: `updateAdminThemeConfig` 호출 + unsupported 404
- `sms-contacts`: contact/group save 호출 + unsupported 404
- `sms-messages`: `sendAdminSmsMessage` 호출 + unsupported 404
- `sms-templates`: template/group save 호출 + unsupported 404

## 6. 감사 운용

- registry SSOT: `specs/domains/FORM_SAVE_SMOKE_COVERAGE.toml`
- audit command: `python3 scripts/check_form_save_smoke_coverage.py`
- deep audit entry: `bash scripts/run_deep_audit.sh`
- 결과 보고: `specs/audits/2026-03-13-FORM_SAVE_SMOKE_AUDIT.md`

## 7. 완료 판정

- `FORM_SAVE_SMOKE_COVERAGE.toml`의 18개 feature가 모두 `save_ready`일 것
- remote feature는 `unsupported_404_missing` 경고가 제거될 것
- `check_form_save_smoke_coverage.py` baseline이 `warnings=0`일 것
- 새 저장 폼은 registry 추가 없이 merge하지 않을 것
