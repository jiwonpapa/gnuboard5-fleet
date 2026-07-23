---
doc_type: context_entry
status: active
owner: rust-admin
source_of_truth: false
ai_default_include: true
last_reviewed: 2026-03-13
review_cycle_days: 30
bounded_context: domains
---
# Domain Docs

이 디렉터리는 Foundation 이후 실제 구현 중인 도메인별 지원 설계 문서를 둔다.

- 우선순위 SSOT: `specs/IMPLEMENTATION_ROADMAP.md`
- 작업 상태 SSOT: `specs/TODO.md`
- 완료 이력 SSOT: `specs/HISTORY.md`
- coverage registry SSOT: `specs/domains/DOMAIN_COVERAGE.toml`
- form metadata registry SSOT: `specs/domains/FORM_METADATA_COVERAGE.toml`
- form metadata rollout SSOT: `specs/foundation/FORM_METADATA_ROLLOUT_PLAN.md`
- form save smoke registry SSOT: `specs/domains/FORM_SAVE_SMOKE_COVERAGE.toml`
- form save smoke rollout SSOT: `specs/foundation/FORM_SAVE_SMOKE_ROLLOUT_PLAN.md`

## 활성 문서

- `ADMIN_CONFIG_SDD.md`
- `ADMIN_SMS_SDD.md`
- `ADMIN_SMS_WORKSPACE_SDD.md`
- `ADMIN_BOARDS_SDD.md`
- `ADMIN_CONTENT_FAQ_SDD.md`
- `ADMIN_MEMBERS_SDD.md`
- `ADMIN_BOARD_GROUPS_POINTS_SDD.md`
- `ADMIN_MAIL_REPORT_VISIT_SYSTEM_TOOLS_SDD.md`
- `ADMIN_MENU_LAYOUT_THEME_SDD.md`
- `ADMIN_PERMISSIONS_SDD.md`
- `ADMIN_POLLS_SDD.md`
- `ADMIN_POPUPS_SDD.md`
- `ADMIN_QA_CONFIG_SDD.md`
- `ADMIN_SECURITY_SDD.md`
- `MULTI_SITE_SDD.md`

도메인 문서는 구현 경계, DTO/command 매핑, UI 정보구조를 보조한다.
실제 진행 상태는 `specs/TODO.md`만 기준으로 삼는다.

## 기본 참조 규칙

- domain 작업의 기본 진입점은 이 문서다.
- 이 문서는 관련 SDD와 registry SSOT로 이동시키는 entrypoint이며, 작업 상태 정본은 아니다.
- `deprecated`, `superseded`, `archived` 상태의 문서는 기본 참조 대상에서 제외한다.
