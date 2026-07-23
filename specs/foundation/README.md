---
doc_type: context_entry
status: active
owner: rust-admin
source_of_truth: false
ai_default_include: true
last_reviewed: 2026-03-15
review_cycle_days: 30
bounded_context: foundation
---
# Foundation Docs

이 디렉터리는 개발 착수 전에 합의해야 하는 초기 지원 문서 묶음이다.

- 우선순위 SSOT: `specs/IMPLEMENTATION_ROADMAP.md`
- 작업 상태 SSOT: `specs/TODO.md`
- 완료 이력 SSOT: `specs/HISTORY.md`

이 디렉터리의 문서는 **지원 문서**다.
체크리스트와 실행 순서는 여기서 설명하지만, 실제 상태 전이와 진행 관리는 `specs/TODO.md`만 기준으로 삼는다.

## 읽기 순서

1. `specs/DOCUMENT_SYSTEM.md`
2. `FOUNDATION_SDD.md`
3. `DEV_BOOTSTRAP_CHECKLIST.md`
4. `REST_API_CLIENT_STANDARD.md`
5. `TASK_ORDER_EXECUTION.md`
6. `APP_CORE_BOUNDARY_PLAN.md`
7. `DOMAIN_BOUNDARY_ENFORCEMENT.md`
8. `AUTH_CORE_SDD.md`
9. `ADMIN_UI_STYLE_GUIDE.md`
10. `ADMIN_FORM_REGRESSION_STRATEGY.md`
11. `DOCUMENT_METADATA_SCHEMA.md`
12. `DOCUMENT_LIFECYCLE_POLICY.md`
13. `CODE_DOC_CONSISTENCY_AUDIT.md`
14. `FORM_METADATA_ROLLOUT_PLAN.md`
15. `FORM_SAVE_SMOKE_ROLLOUT_PLAN.md`
16. `AUDIT_REPORT_TEMPLATE.md`
17. `ADMIN_DOMAIN_CONSUMER_PARITY.md`
18. `ADMIN_DOMAIN_CONSUMER_RENDER_PARITY.md`
19. `xterm_ssh_performance_audit.md`
20. `performance_test_checklist.md`
21. `sftp_native_ux_upgrade_report.md`

## 목적

- 개발 착수 전에 공통 아키텍처와 경계 조건을 고정한다.
- 구현 순서를 통일해 문서 드리프트를 줄인다.
- 첫 구현 대상(Auth Core)을 가짜 엔드포인트 없이 실제 OpenAPI 계약 기준으로 정의한다.
- 관리자 셸과 작업면의 시각 언어를 일관된 admin app 톤으로 유지한다.

## 기본 참조 규칙

- foundation 영역 작업의 기본 진입점은 이 문서다.
- 정본 문서는 `specs/DOCUMENT_SYSTEM.md`, `specs/README.md`, `specs/IMPLEMENTATION_ROADMAP.md`를 먼저 본다.
- 이 디렉터리 문서는 지원 문서이며, 정본 사실을 복제하지 않고 링크한다.
