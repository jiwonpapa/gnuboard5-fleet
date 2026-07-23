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
# FORM METADATA ROLLOUT PLAN

이 문서는 `T2-100`의 실행 완료 상태와 회귀 방지 기준을 정리한 지원 로드맵입니다.
상태 숫자는 [`FORM_METADATA_COVERAGE.toml`](/Users/neojins/workspace/gnuboard5/rust/specs/domains/FORM_METADATA_COVERAGE.toml)와 [`check_form_metadata_coverage.py`](/Users/neojins/workspace/gnuboard5/rust/scripts/check_form_metadata_coverage.py)를 기준으로 갱신합니다.

## 목적

- `/admin/schema` 소비 확대를 감이 아니라 우선순위와 목표 수준으로 관리합니다.
- `schema_live`와 `schema_planned`를 분리해, 이미 schema를 쓰는 feature와 아직 local metadata만 쓰는 feature를 같은 버킷으로 취급하지 않습니다.
- 구현 전에 어떤 feature를 먼저 옮길지 감사 체계가 먼저 결정하고, 완료 후에는 회귀 방지 기준을 유지합니다.

## 현재 기준선

- `schema_live`: 16
- `schema_planned`: 0
- `local_canonical`: 1
- `provider_schema_domains`: 17
- `provider_blocked_features`: 0
- `schema_full`: 12
- `schema_labels`: 4
- `local_only`: 1

## Current Ownership

### Schema Live

- `boards`
- `board-groups`
- `config`
- `contents`
- `faqs`
- `mails`
- `members`
- `menus`
- `points`
- `polls`
- `popups`
- `sms-contacts`
- `sms-messages`
- `sms-templates`
- `system`
- `theme`

### Local Canonical

- `security`

## 원칙

- `schema_live` feature는 회귀 방지가 우선입니다. 이미 `schema_labels` 이상인 feature를 무리하게 다시 로컬 hardcode로 되돌리지 않습니다.
- `schema_planned` feature가 다시 생기면 provider는 준비됐지만 Rust consumer wiring이 아직 붙지 않은 backlog로 간주합니다.
- `local_canonical` feature는 canonical metadata source가 PHP `/admin/schema`가 아니라 로컬 앱 상태/도메인 규칙인 작업면입니다. 이 버킷은 provider blocker queue에 넣지 않습니다.
- provider domain이 생기고 소비자 wiring까지 붙은 feature는 `schema_live`로 승격합니다.
- 목표 수준은 기본적으로 `schema_full`입니다.
- 예외적으로 provider가 `options/widget/default`를 아직 제공하지 않는 경우에만 `schema_labels`를 interim 목표로 둡니다.

## 완료 기준

- `schema_planned` 0개 유지
- `schema_live` 16개 유지
- `schema_full` 12개 유지
- `local_canonical` 1개(`security`)는 `/admin/schema` 전환 대상이 아니라 로컬 메타데이터 명시성과 회귀 방지가 유지되면 완료로 본다.
- `system`, `theme`처럼 provider rollout과 Rust 소비가 동시에 닫힌 feature는 이후 회귀 방지 대상으로만 관리합니다.
- `mails`, `points`, `sms-contacts`, `sms-messages`, `sms-templates`는 이제 rollout backlog가 아니라 회귀 방지 대상입니다.
