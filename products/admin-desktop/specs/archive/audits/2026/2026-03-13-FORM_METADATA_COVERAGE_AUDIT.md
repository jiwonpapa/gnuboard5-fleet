# Route-Native Form Metadata Coverage Audit — 2026-03-13

## 범위

- registry SSOT: [`FORM_METADATA_COVERAGE.toml`](/Users/neojins/workspace/gnuboard5/rust/specs/domains/FORM_METADATA_COVERAGE.toml)
- audit script: [`check_form_metadata_coverage.py`](/Users/neojins/workspace/gnuboard5/rust/scripts/check_form_metadata_coverage.py)
- 대상 feature:
  - `boards`, `config`, `contents`, `faqs`, `board-groups`, `members`, `menus`, `polls`, `popups`
  - `mails`, `points`, `security`, `system`, `theme`, `sms-contacts`, `sms-messages`, `sms-templates`

## 전체 판정

- 판정: `pass`
- 이유:
  - `schema_live` 16개 feature는 모두 `useAdminFieldSchema` + schema gate를 실제로 소비한다.
  - `security`는 로컬 앱 보안 surface라 `local_canonical`로 유지하고, `/admin/schema` provider backlog에 넣지 않는다.
  - `mails`, `points`, `sms-contacts`, `sms-messages`, `sms-templates`도 실제 작업면에서 label/description/options/default wiring을 닫아 `schema_live`로 승격됐다.

## Failure

- none

## Warning

- none

## Note

- `schema_full`: `boards`, `config`, `board-groups`, `members`, `popups`, `system`, `theme`, `mails`, `points`, `sms-contacts`, `sms-messages`, `sms-templates`
- `schema_labels`: `contents`, `faqs`, `menus`, `polls`
- `local_canonical`: `security`
- PHP provider catalog 기준 `provider_schema_domains=17`, `provider_blocked_features=0`이다.
- `schema_planned`가 0개가 되어 `T2-100` consumer rollout backlog도 해소됐다.
- `mails`, `points`, `sms-contacts`, `sms-messages`, `sms-templates`는 이제 rollout queue가 아니라 회귀 방지 대상이다.

## Evidence

- features: `17`
- schema_live_features: `16`
- schema_planned_features: `0`
- local_canonical_features: `1`
- provider_schema_domains: `17`
- provider_blocked_features: `0`
- schema_full_features: `12`
- schema_labels_features: `4`
- local_only_features: `1`
- local_canonical: `security`
- rollout_priority: `none`
- audit command:
  - `python3 scripts/check_form_metadata_coverage.py`
