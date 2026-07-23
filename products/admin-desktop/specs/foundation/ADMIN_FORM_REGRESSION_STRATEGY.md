---
doc_type: policy
status: active
owner: rust-admin
source_of_truth: false
ai_default_include: true
last_reviewed: 2026-03-13
review_cycle_days: 30
bounded_context: foundation
---
# ADMIN FORM REGRESSION STRATEGY

이 문서는 관리자 폼을 `형님이 일일이 전부 눌러서 확인하지 않아도` 되도록 만드는 회귀 방지 기준을 고정합니다.
실제 작업 상태는 `specs/TODO.md`, 완료 이력은 `specs/HISTORY.md`를 기준으로 봅니다.

## 1. 목적

- 필드 타입, 필수 여부, 기본값, 옵션 목록을 Rust 화면이 임의 추측으로 정하지 않습니다.
- 저장 payload 회귀를 테스트로 먼저 잠급니다.
- 스키마 로딩 실패, 404, unsupported feature 같은 운영 예외를 사용자 친화적으로 처리합니다.

## 2. 필드 메타데이터 원천

- Canonical source는 PHP REST API가 제공하는 `/admin/schema/*` 메타데이터입니다.
- Rust는 아래 정보를 우선적으로 PHP schema에서 소비합니다.
  - `required`
  - `readonly`
  - `options/selectable values`
  - `field label`
  - `description/help text`
  - `default value`
  - `widget kind(select / checkbox / radio / text / textarea)`
- Rust 화면이 이 정보를 하드코딩해도 되는 경우는 아래 두 가지뿐입니다.
  - PHP schema가 아직 해당 도메인을 제공하지 않을 때
  - 레거시 호환 때문에 일시적으로 fallback이 필요할 때

이 경우에도 fallback은 TODO에 남기고, 개발모드에서만 진단 사유를 노출합니다.

## 3. 저장/표현 규칙

- 설명 영역은 input처럼 보이면 안 됩니다.
- 설명은 `info callout` 계열 박스로 분리합니다.
- 수정 불가 값은 일반 input처럼 보이지 않는 읽기 전용 표면으로 표현합니다.
- 긴 편집 폼은 좌측 서브메뉴를 sticky로 유지하고, 주요 저장 액션은 상단/하단 둘 다 제공합니다.

## 4. 자동 검증 계층

모든 관리자 폼은 아래 5단 회귀망을 목표로 합니다.

1. serializer/diff unit test
- `build*UpdateInput` 류 helper가 changed-only payload를 정확히 만드는지 검사합니다.
- 실제로 한 번 터졌던 필드 누락(`extra: {}` 등)은 별도 회귀 테스트를 둡니다.

2. schema loading component test
- `/admin/schema`가 없거나 깨질 때 폼을 숨기고, 사용자 친화 메시지를 보여주는지 검사합니다.
- raw field fallback이 그대로 노출되지 않는지 검사합니다.

3. page-level save test
- 정상 입력, 빈 변경, validation error, unsupported(404) 상태를 테스트합니다.
- 404/미지원은 trace dump가 아니라 사용자 메시지로 바꿔 보여주는지 검사합니다.

4. route/workflow smoke test
- `사이트 선택 -> 페이지 진입 -> 저장 -> 목록/상태 반영` 흐름을 도메인별로 한 번씩 검사합니다.

5. app-level first-run e2e
- `secure storage gate -> master setup/unlock -> site onboarding -> login -> workspace` 흐름이 깨지지 않는지 검사합니다.

추가로, 어떤 작업면이 `/admin/schema`를 실제로 어느 수준까지 소비하는지는 아래 SSOT로 따로 관리합니다.

- registry SSOT: `specs/domains/FORM_METADATA_COVERAGE.toml`
- audit command: `python3 scripts/check_form_metadata_coverage.py`
- deep audit entry: `bash scripts/run_deep_audit.sh`
- rollout plan SSOT: `specs/foundation/FORM_METADATA_ROLLOUT_PLAN.md`

그리고 page-level save smoke coverage는 아래 SSOT로 따로 관리합니다.

- registry SSOT: `specs/domains/FORM_SAVE_SMOKE_COVERAGE.toml`
- audit command: `python3 scripts/check_form_save_smoke_coverage.py`
- deep audit entry: `bash scripts/run_deep_audit.sh`
- rollout plan SSOT: `specs/foundation/FORM_SAVE_SMOKE_ROLLOUT_PLAN.md`

## 5. 수동 검증 최소화 원칙

- 형님이 모든 필드를 수동으로 눌러 확인하는 방식을 기본 QA로 삼지 않습니다.
- 형님 수동 검증은 아래 두 경우에 집중합니다.
  - 실제 운영 데이터와 연결된 최종 UX 판단
  - OS prompt / 배포 / 반응형 같이 자동 테스트로 100% 대체하기 어려운 구간

그 외 필드 동작, 저장 payload, 스키마 fallback, unsupported feature 처리는 자동 테스트가 먼저 책임집니다.

## 6. 현재 적용 범위

- `환경설정(AdminConfigPage)`은 schema-driven required/label/description/options와 payload 회귀 테스트를 적용했습니다.
- `SMS 기본설정(AdminSmsConfigPage)`은 unsupported 404 UX와 저장 흐름 회귀를 우선 적용했고, widget metadata의 완전 schema-driven 전환은 후속 범위로 남깁니다.
- `/admin/schema`가 이미 제공되는 `boards/config/contents/faqs/groups/members/menus/polls/popups/system/theme`는 `FORM_METADATA_COVERAGE.toml` 기준 `schema_live`로 관리합니다.
- `sms-* / mails / points`는 아직 `schema_planned`로 남기고, 경고는 감사에서 상설 노출합니다.
- `security`는 로컬 앱 보안 surface라 `FORM_METADATA_COVERAGE.toml`에서 `local_canonical`로 관리하며, PHP `/admin/schema` provider backlog에 넣지 않습니다.
- page-level save smoke는 `FORM_SAVE_SMOKE_COVERAGE.toml` 기준으로 `page_save / validation / unsupported_404` 증적 수준을 계속 보고하며, 실제 harness rollout은 `FORM_SAVE_SMOKE_ROLLOUT_PLAN.md`를 따른다.
- 이후 관리자 폼은 신규 구현 시 이 문서를 기본 템플릿으로 따릅니다.
