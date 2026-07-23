# Route-Native Form Metadata Provider Blockers — 2026-03-13

## 목적

- Rust 소비자 기준 `T2-100` provider blocker와 consumer rollout이 모두 해소됐음을 고정합니다.
- 이 문서는 provider handoff 종료와 Rust 쪽 후속 완료를 함께 기록하는 감사 증적입니다.

## 전체 판정

- 판정: `resolved`
- owner: `php_api`
- blocker: `none`

Rust 쪽 메타데이터 감사는 현재 `warnings=0`입니다. `security`는 로컬 앱 보안 surface라 provider blocker queue에서 제외했고, `system`, `theme`, `mails`, `points`, `sms-contacts`, `sms-messages`, `sms-templates`는 provider rollout과 소비 wiring이 모두 닫혀 `schema_live` 또는 `local_canonical` 상태로 정리됐습니다.

## 근거

- provider catalog: `/Users/neojins/workspace/gnuboard5/php/api/v1/Admin/Schema/schema-domains.json`
- 현재 provider schema domain 수: `17`
- Rust `schema_live` feature 수: `16`
- Rust `schema_planned` + `provider_blocker` feature 수: `0`

현재 provider가 제공하는 schema domain:

- `boards`
- `config`
- `contents`
- `faq-masters`
- `faqs`
- `groups`
- `mails`
- `members`
- `menus`
- `polls`
- `points`
- `popups`
- `sms-contacts`
- `sms-messages`
- `sms-templates`
- `system`
- `theme`

## Blocked Surface

- none

## Rust 기준 해석

- Rust 쪽에서 지금 남은 provider blocker와 consumer rollout은 없습니다.
- `security`는 `/app/security` 로컬 작업면이라 `/admin/schema` provider backlog가 아닙니다. 이 surface는 `FORM_METADATA_COVERAGE.toml`에서 `local_canonical`로 별도 관리합니다.
- `system`, `theme`, `mails`, `points`, `sms-contacts`, `sms-messages`, `sms-templates`는 provider domain 추가 후 `useAdminFieldSchema` wiring, schema gate, label/description/options/default 소비를 실제 작업면에 연결해 `schema_live`로 승격했습니다.
- 따라서 rust-only 범위에서는 provider blocker queue와 consumer rollout queue가 모두 비어 있는 상태가 맞습니다.

## PHP handoff

- 완료됨: `sms-contacts`, `sms-messages`, `sms-templates`, `mails`, `points` provider domain이 모두 추가됐다.
- 완료됨: Rust consumer rollout도 모두 닫혀 추가 handoff는 없다.

## 검증

- `python3 scripts/check_form_metadata_coverage.py`
- `python3 scripts/doc-index.py`
- `bash scripts/check-doc-governance.sh`
