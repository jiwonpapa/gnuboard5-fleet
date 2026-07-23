# Route-Native Domain Coverage Audit — 2026-03-13

## 범위

- registry SSOT: [`DOMAIN_COVERAGE.toml`](/Users/neojins/workspace/gnuboard5/rust/specs/domains/DOMAIN_COVERAGE.toml)
- 대상 feature:
  - `contents`, `faqs`, `menus`, `mails`, `points`, `reports`, `visits`, `theme`, `security`, `system-tools`, `board-groups`, `layouts`, `system`, `sms-*`

## 전체 판정

- 판정: `pass`
- 이유:
  - required route-native domain `17/17`은 모두 SDD와 최소 smoke checklist를 가진다.
  - `menus`, `theme`, `reports`, `visits`, `system-tools`, `sms-messages`에 route-native `*Page.test.tsx` smoke evidence를 추가해 기존 `manual-only`/`form-only` warning을 모두 해소했다.

## Failure

- none

## Warning

- none

## Note

- `ADMIN_CONTENT_FAQ_SDD.md`, `ADMIN_MENU_LAYOUT_THEME_SDD.md`, `ADMIN_BOARD_GROUPS_POINTS_SDD.md`, `ADMIN_MAIL_REPORT_VISIT_SYSTEM_TOOLS_SDD.md`, `ADMIN_SECURITY_SDD.md`, `ADMIN_SMS_WORKSPACE_SDD.md`를 추가해 route-native domain coverage SSOT를 보강했다.
- 기존 [`ADMIN_SMS_SDD.md`](/Users/neojins/workspace/gnuboard5/rust/specs/domains/ADMIN_SMS_SDD.md)는 `/settings/sms` 전용 SDD로 유지하고 최소 smoke checklist 섹션을 추가했다.
- `T2-188`에서 [`AdminMenusPage.test.tsx`](/Users/neojins/workspace/gnuboard5/rust/g5-admin/src/features/menus/AdminMenusPage.test.tsx), [`AdminThemePage.test.tsx`](/Users/neojins/workspace/gnuboard5/rust/g5-admin/src/features/theme/AdminThemePage.test.tsx), [`AdminReportsPage.test.tsx`](/Users/neojins/workspace/gnuboard5/rust/g5-admin/src/features/reports/AdminReportsPage.test.tsx), [`AdminVisitStatsPage.test.tsx`](/Users/neojins/workspace/gnuboard5/rust/g5-admin/src/features/visits/AdminVisitStatsPage.test.tsx), [`AdminPhpInfoPage.test.tsx`](/Users/neojins/workspace/gnuboard5/rust/g5-admin/src/features/system-tools/AdminPhpInfoPage.test.tsx), [`AdminSmsMessagesPage.test.tsx`](/Users/neojins/workspace/gnuboard5/rust/g5-admin/src/features/sms-messages/AdminSmsMessagesPage.test.tsx)를 추가해 warning 6개를 0으로 줄였다.

## Evidence

- required_features: `17`
- covered_features: `17`
- automated_smoke_features: `17`
- page_or_flow_smoke_features: `17`
- audit command:
  - `python3 scripts/check_domain_coverage.py`
