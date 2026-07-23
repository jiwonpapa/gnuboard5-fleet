---
doc_type: work_registry
status: active
owner: rust-admin
source_of_truth: true
canonical_for: work registry
ai_default_include: true
last_reviewed: 2026-07-23
review_cycle_days: 14
bounded_context: global
---
# TODO

이 문서는 작업 상태를 관리하는 유일한 작업 레지스터 SSOT다.
상태 전이는 `Inbox -> Next -> In Progress -> Blocked -> Done`만 허용한다.

## Inbox

- [ ] 현재 없음

## Next

- [ ] T2-277 wayland-scanner가 quick-xml 0.41 이상을 허용하고 russh가 RSA timing advisory 수정판을 배포하면 즉시 잠금 파일을 갱신해 RustSec 잔여 3건을 닫기
- [ ] T2-267 완료된 production Rust wire 17-domain live roundtrip을 실제 Tauri invoke로 승격하고, 남은 15-domain DOM adapter에서 저장·재조회·rollback 증거를 격리 test entity로 확보해 full certification 닫기
- [ ] T2-270 완료된 live provider site identity·revision·OpenAPI SHA current-run 결합을 유지하면서 실제 설치 앱 UI의 저장·재조회·rollback 전 도메인 증적 확보
- [ ] T2-271 runtime 미사용 generated Zod client를 계약 검증 전용으로 유지할지 실제 frontend 소비 경로로 편입할지 결정하고, 선택한 ownership을 import/reachability gate로 고정

## In Progress

- [ ] 현재 없음

## Blocked

- [ ] T2-285 공개 `gnuboard5.local`의 ModSecurity CRS 911100이 PUT·PATCH·DELETE를 HTML 403으로 차단한다. 별도 VPSGuard 테스트 경계를 변경하지 않고 허용 정책이 확정될 때까지 공개 경로 write certification은 차단하며, Apache origin 검증과 동일시하지 않는다

## Done

- [x] T2-284 17-domain 실서버 관리자 API 왕복 하네스: canonical registry 75개 operation과 비가역 또는 외부효과 제외 13개 operation을 고정하고, 실제 요청 operationId와 unavailable-accounted operationId의 완전한 합집합을 검증한다. production Rust wire client로 writable 13-domain 저장·재조회·정리와 SMS 미설치 4-domain의 503 계약을 검사하며, 공개 경로의 PUT·PATCH·DELETE가 차단되면 fixture 0건으로 fail-closed 중단한다. 기존 Apache origin 결과는 JSON 미보존 `historical_observation`이므로 destination certification으로 승계하지 않는다
- [x] T2-280 남은 release/live 경계 1차 closeout: macOS `cargo-xwin` Windows MSVC target check를 통과시키고, 격리 MariaDB staging에 clean PHP HEAD를 배포해 health·site identity·revision·OpenAPI SHA를 결합했다. production Rust wire client로 config `cf_10` 실제 저장·재조회·무조건 원복을 통과시키고 민감값 비노출 current-run artifact·회귀 gate로 고정했다
- [x] T2-279 ultra 재감사 개선: routine scoped pre-push와 full/release CI를 분리하고 중복 aggregate를 제거했다. PR 자동 contract/docs/structure gate, 전체 workspace 동적 hotspot/build-radius 예산, 500줄 차단, placeholder 제거, 프런트 의존성 축소를 회귀 테스트로 고정했다
- [x] T2-276 Rust/Tauri crate와 React/TypeScript 도구체인을 최신 호환선으로 갱신하고, Cargo/Bun lockfile 재현성, Prettier 3 runtime formatting, Vite 8 React dedupe, Rust 1.96 `-D warnings` 회귀를 닫았다
- [x] T2-275 `run_api_pipeline_audit.py`와 `run_integrated_audit.py`의 subprocess·timeout·blocked·민감값 마스킹·bounded evidence 실행부를 `scripts/audit_harness` 패키지로 통합하고, Python 하네스 67개 회귀와 Ruff/Mypy를 CI hard gate로 고정했다
- [x] T2-274 Tauri OpenAPI active consumer parity closeout: canonical PHP OpenAPI 전체 `312`개를 축소하지 않고 active 관리자 `184` + bootstrap `5`를 Rust wire/client/Tauri IPC/frontend에 `189/189`로 연결했다. protected 일반 게시판 `26`개는 provider-only로 보존했으며 게시판 UI 소비는 미확정 범위로 구현하지 않았다. static aggregate는 `19 passed / 0 failed / 0 blocked`, `static_passed_not_certified`다
- [x] T2-273 Tauri IPC registry를 Rust AST 기준으로 해석해 `#[tauri::command] 253`, 등록 `253`, frontend apiTarget `253`의 양방향 ownership과 orphan `0`을 고정했다
- [x] T2-272 frontend wrapper -> invoke command -> HTTP method/path edge를 `191`개 active edge까지 해석하고 path/method swap mutation으로 drift를 fail-closed 검출하게 했다
- [x] T2-269 멀티사이트 요청을 `site_id + base_url + token` 원자 컨텍스트로 묶고 사이트 전환 중 A 사이트 token이 B URL로 나가지 않는 동시성 회귀 테스트를 추가했다
- [x] T2-268 OpenAPI parameter/request/모든 status response와 media type을 canonical Rust wire manifest와 runtime validator에 연결했다. active `189` operations, parameters `230`, responses `1186`, error responses `997`을 검증한다
- [x] T2-266 누락됐던 mail list/recipients/send와 health exact 소비를 구현해 active operation 소비를 `185/189 -> 189/189`로 닫았다
- [x] T2-265 `API_PIPELINE_AUDIT_V1` 1차 감사 정의와 fail-closed 통합 harness 도입: exact `184 + 5 = 189` operation, 14 capability, capability↔실행 check binding, current-run/run-id/artifact 무결성, 17-domain 고정, 8개 OpenAPI method, route/edge/type/stale/child-failure mutation을 고정했다. 이는 하네스 도입 완료이며 앱 소비 완료가 아니다. 현재 정적 baseline은 Rust `185/189`, helper edge 15개 미해석, field signature mismatch 72개 등으로 의도된 Failure다
- [x] T2-209 통합 감사 active consumer scope registry 도입: `specs/integration/ACTIVE_CONSUMER_SCOPE.json`를 추가해 Rust 활성 소비 범위 밖의 provider-only backlog(`shop-catalog`)를 machine-readable registry로 고정했고, `run_integrated_audit.py`와 `check_openapi_contract.mjs`가 같은 registry를 읽어 path/schema domain/operation gap을 failure 대신 handoff note/evidence로 분류하도록 정리했다
- [x] T2-208 도메인 경계 강제 규율 1차 도입: `DOMAIN_BOUNDARY_RULES.toml`와 `domain_boundary_watch.py`를 추가해 monitored feature(`mails`, `sms-contacts`, `points`, `security`, `sites`)의 direct cross-feature import, support namespace(`shared/components/lib/api`)의 business drift, `app_state/*service.rs`의 `&AppState` wrapper coupling을 구조 감사에 편입했다. frontend 위반은 failure로, wrapper coupling은 warning budget(`WB-2026-011`~`014`)으로 관리한다
- [x] T2-207 활성 사이트 작업 홈에 PHP `/admin/dashboard` 소비 연결: `AdminOverviewPage`가 활성 사이트 로그인 상태일 때 원격 관리자 대시보드 요약과 최근 회원/게시물/포인트 목록을 함께 보여주도록 연결했고, dashboard 모델 parity(`visits`, `po_mb_point`)와 `api-target-registry`/diagnostics registry도 같이 맞춰 integrated audit의 `/admin/dashboard` 잔여 warning을 제거했다
- [x] T2-100 관리자 폼 메타데이터 확장: `mails`, `points`, `sms-contacts`, `sms-messages`, `sms-templates` 작업면에 `useAdminFieldSchema`와 schema gate를 연결하고 label/description/options/default 소비를 실제 폼까지 닫아 `schema_planned` 5개를 전부 `schema_live`로 승격했다. 최종 baseline은 `schema_live=16`, `schema_planned=0`, `schema_full=12`, `schema_labels=4`, `local_canonical=1`, `warnings=0`이다
- [x] T2-206 통합 감사에 PHP schema provider readiness handoff 노출: `run_integrated_audit.py`가 `php/output/admin-schema-provider-readiness/latest.{md,json}`를 읽어 `latest.md/json`의 note/evidence 및 `PHP Schema Provider Readiness Handoff` section에 provider rollout 상태, blocked feature 수, blocked backlog를 함께 싣도록 정리했다
- [x] T2-205 통합 감사 operation 추출 기준을 현재 Rust 구조로 정렬: `run_integrated_audit.py`가 `src-tauri/src/api_client` 최상위 파일만 보던 문제를 고쳐 nested `member/`, `board_group/`, `faq/`, `sms_contact/`, `sms_template/` 모듈까지 재귀로 읽도록 정리했다. 이로써 구현된 command surface가 `php_operations_missing_in_rust` false warning으로 다시 잡히지 않게 됐다
- [x] T2-204 관리자 schema `default_value` 소비 정합성 복구: PHP provider가 추가한 create-time `default_value`를 Rust `AdminFieldSchema`/ts-rs 타입에 반영하고 `useAdminFieldSchema` helper 및 회귀 테스트를 추가했다. `MemberDetailCard`/`AdminMembersPage` fixture도 새 필드에 맞춰 보정했고, `vitest.critical.config.ts`는 `coverage-critical/.tmp`를 선제 생성해 implementation/consumer audit가 temp directory 부재로 흔들리지 않도록 고정했다
- [x] T2-203 통합 감사에 PHP 구조 감사 handoff 노출: `run_integrated_audit.py`가 `php/output/php-structure-audit/latest.{md,json}`를 읽어 `latest.md/json`의 note/evidence 및 `PHP Structure Audit Handoff` section에 PHP 구조 warning, warning budget, blocker 상태를 함께 싣도록 정리했다
- [x] T2-202 로컬 보안 작업면을 provider blocker queue에서 분리: `FORM_METADATA_COVERAGE.toml`의 `security`를 `local_canonical`로 재분류해 로컬 앱 보안 surface를 PHP `/admin/schema` backlog로 잘못 넘기지 않도록 정리했고, 메타데이터 blocker 수를 `8 -> 7`로 바로잡았다
- [x] T2-201 `specs/codex` 문서를 기록 영역으로 편입: `specs/codex/README.md`를 추가하고 기존 Codex prompt/report 5개에 `archived + ai_default_include:false` 메타데이터를 부여해 AI 기본 참조에서 제외했다. `check_document_metadata.py`, `DOCUMENT_SYSTEM.md`, `DOCUMENT_METADATA_SCHEMA.md`, `README.md`도 `specs/codex/*.md`를 관리 범위로 반영했다
- [x] T2-200 문서 위생 감사 상설화: `check_document_hygiene.py`를 추가해 expired dated audit, active entrypoint coverage drift, inactive 문서 재참조, `source_of_truth:false` 문서의 self-claimed SSOT를 자동 점검하게 했고, `run_document_audit.sh`에 편입했다. `FORM_METADATA_ROLLOUT_PLAN.md`, `FORM_SAVE_SMOKE_ROLLOUT_PLAN.md`의 잘못된 SSOT 표현을 정리하고 `foundation/README.md`에 빠진 active 지원 문서도 다시 연결했다
- [x] T2-199 문서 감사 2차 자동화 확대: `check_document_metadata.py`가 `.agent/sub-constitutions/*.md`, `.agent/workflows/*.md`, `specs/*`, `specs/foundation/*`, `specs/domains/*`, `specs/integration/*`, `specs/audits/README.md`의 active-scope를 전수 검사하도록 확장했고, `source_of_truth`의 `canonical_for`, review cycle stale, duplicate canonical, archive/status drift를 failure 기준으로 승격했다. 관련 active 문서 48개에 frontmatter 메타데이터를 rollout하고 docs index/거버넌스 검사까지 통과시켰다
- [x] T2-198 정기 문서/정합성 감사 운영 절차 고정: `AUDIT_SYSTEM.md`에 정기 구조 감사, 정기 문서 감사, 정기 코드-문서 정합성 감사 루프를 상설 운영 절차로 추가했고, `DOCUMENT_SYSTEM.md`와 `CODE_DOC_CONSISTENCY_AUDIT.md`로 active 문서 메타데이터 점검, status/drift, 정본 중복, archive/deprecated 정리, 코드-문서 드리프트 탐지 기준을 고정했다
- [x] T2-197 문서 감사를 정식 감사 루프로 승격: `scripts/run_document_audit.sh`, `g5-admin/package.json`의 `audit:docs`, `.github/workflows/docs.yml`를 추가해 문서 메타데이터/인덱스/거버넌스를 독립 audit gate로 만들고, `run_standard_audit.sh`, `AUDIT_SYSTEM.md`, `AUDIT_STRATEGY.md`, `README.md`를 함께 갱신해 구현 감사 부속이 아니라 상설 감사 루프로 편입했다
- [x] T2-196 문서 운영 체계 1차 도입: `specs/DOCUMENT_SYSTEM.md`, `specs/foundation/DOCUMENT_METADATA_SCHEMA.md`, `specs/foundation/DOCUMENT_LIFECYCLE_POLICY.md`를 추가해 문서 타입/상태/정본/AI 기본 참조 규칙을 SSOT로 고정했고, 핵심 active 문서에 frontmatter 메타데이터를 붙인 뒤 `scripts/check_document_metadata.py`, `doc-index.py`, `check-doc-governance.sh`로 문서 신분증과 AI 참조 규칙을 상설 검증하게 만들었다
- [x] T2-195 구조 감사 warning budget registry 도입: `specs/audits/WARNING_BUDGETS.toml`를 추가해 active structure warning 10개에 owner/만료일/제거 기준을 등록했고, `scripts/check_warning_budgets.py`와 `run_deep_audit.sh`를 통해 missing budget·stale budget·expired budget을 상설 검증하도록 만들었다
- [x] T2-194 통합 감사에 blocked backlog handoff 노출: `run_integrated_audit.py`가 `specs/audits/BLOCKERS.toml`와 `output/form-metadata-blockers/latest.{md,json}`를 읽어 `latest.md/json`의 note/evidence 및 handoff section에 Rust blocked backlog 상태를 같이 싣도록 정리했다
- [x] T2-193 blocked backlog registry 도입: `specs/audits/BLOCKERS.toml`를 추가해 rust-only 범위의 provider blocker를 machine-readable registry로 고정했고, `scripts/check_blocker_registry.py`와 `run_deep_audit.sh`로 `TODO.md`의 `Blocked`, handoff 문서, generated blocker artifact 정합성을 상설 검증하도록 만들었다
- [x] T2-192 메타데이터 provider blocker handoff 산출물 자동화: `scripts/generate_form_metadata_blocker_report.py`를 추가해 `output/form-metadata-blockers/latest.{md,json}`를 생성하고, `run_deep_audit.sh`에 편입해 rust-only 범위의 `/admin/schema` blocker 8개가 수기 문서 없이도 최신 handoff artifact로 남도록 정리했다
- [x] T2-191 메타데이터 감사에 provider blocker 분류 추가: `FORM_METADATA_COVERAGE.toml`에 `provider_blocker`를 도입하고 `check_form_metadata_coverage.py`가 PHP `schema-domains.json`을 함께 읽어 `schema_live` domain drift를 교차 검증하며, `schema_planned` warning은 `blocked_by=php_schema_missing`로 분리 보고하도록 확장했다
- [x] T2-101 관리자 폼 저장 스모크 자동화: `FORM_SAVE_SMOKE_COVERAGE.toml` 기준 route-native 저장 surface 18개에 representative `page save -> validation -> unsupported 404` evidence를 전부 연결했다. 최종 baseline은 `warnings=0`, `page_save_features=18`, `validation_guard_features=18`, `unsupported_404_features=17`, `save_ready_features=18`이며, remote 17개 feature는 전부 unsupported 404 UX까지 page level에서 고정됐다
- [x] T2-189 관리자 폼 metadata coverage 감사 상설화: `specs/domains/FORM_METADATA_COVERAGE.toml`를 추가해 schema-live / schema-planned route-native 폼을 machine-readable registry로 고정했고, `scripts/check_form_metadata_coverage.py`와 `run_deep_audit.sh`로 `/admin/schema` hook/gate/label/description/options/widget 소비 수준을 상설 보고하게 만들었다
- [x] T2-190 관리자 폼 save smoke coverage 감사 상설화: `specs/domains/FORM_SAVE_SMOKE_COVERAGE.toml`를 추가해 route-native 저장 폼의 page save / validation / unsupported 404 기준을 machine-readable registry로 고정했고, `scripts/check_form_save_smoke_coverage.py`와 `run_deep_audit.sh`로 현재 저장 스모크 증적 수준과 rollout 우선순위를 상설 보고하게 만들었다
- [x] T2-188 route-native page smoke 보강: `menus`, `theme`, `reports`, `visits`, `system-tools`, `sms-messages`에 `*Page.test.tsx` smoke evidence를 추가하고 `specs/domains/DOMAIN_COVERAGE.toml`에 등록해 `check_domain_coverage.py`의 `manual-only`/`form-only` warning을 해소했다. 이제 17개 target domain 모두 page/flow smoke evidence를 가진다
- [x] T2-114 SDD/TDD coverage 확대: `specs/domains/DOMAIN_COVERAGE.toml`를 route-native domain coverage SSOT로 추가하고 `scripts/check_domain_coverage.py`로 `contents`, `faqs`, `menus`, `mails`, `points`, `reports`, `visits`, `theme`, `security`, `system-tools`, `board-groups`, `layouts`, `system`, `sms-*` 17개 target의 SDD 연결과 최소 smoke checklist 존재를 검증하도록 만들었다. 누락 도메인용 SDD를 보강하고 `run_deep_audit.sh`에도 편입해 coverage drift가 상설 감사에 포함되도록 정리했다
- [x] T2-182 `g5-admin-core` 1차 split 착수 준비: `scripts/core_split_readiness.py`와 `collect_architecture_metrics.py`에 core split readiness 보고를 추가해 `SessionService / SiteCatalogService / SecuritySettingsService / MasterLockService`의 blocker를 자동으로 드러내게 했고, `specs/foundation/APP_CORE_BOUNDARY_PLAN.md`에 첫 외부 core 경계를 `trait-only ports + SessionService`로 고정했다
- [x] T2-184 활성 크레이트 내부 경계 감사 5차: `scripts/ownership_watch.py`를 추가해 domain별 source-of-truth owner와 registry alignment를 공통 파서로 읽게 만들었고, `scripts/check_active_crate_boundaries.py`는 ownership 충돌/registry drift를 failure로, giant registry-orchestrator 우선순위와 `core::ports` concrete budget을 warning으로 출력하도록 확장했다. `scripts/collect_architecture_metrics.py`도 같은 helper를 소비해 `source_of_truth_watch`, `registry_alignment_watch`, `giant_registry_orchestrator_priority` 섹션을 추가했다
- [x] T2-185 감사 예외/waiver registry 도입: `specs/audits/WAIVERS.toml`를 active waiver SSOT로 추가하고 `scripts/check_audit_waivers.py`로 만료·중복·orphan waiver를 검증하도록 만들었으며, `scripts/check_active_crate_boundaries.py`는 matching waiver를 `waived` 섹션으로 출력해 허용된 구조 부채가 감사 결과와 CI에서 함께 보이도록 정리했다
- [x] T2-187 구조/통합 감사 summary 형식 통일: `scripts/check_active_crate_boundaries.py`, `scripts/check_audit_waivers.py`, `scripts/run_integrated_audit.py`가 `Failure / Warning / Note / Evidence` 공통 섹션과 `Waived` 보조 섹션을 step summary/Markdown report에 같이 출력하도록 정리했고, `specs/AUDIT_SYSTEM.md`, `specs/integration/INTEGRATED_AUDIT_STANDARD.md`, 수기 보고 템플릿도 같은 naming을 기준으로 고정했다
- [x] T2-186 감사 운영 SSOT 분리: `specs/AUDIT_SYSTEM.md`를 추가해 감사 분류, 실행 매트릭스, failure/warning 의미, 필수 산출물, 문서 계층을 한 문서에 고정했다. 헌법은 최고 규범만 남기고 운영 세부는 새 감사 운영 SSOT를 참조하도록 줄였으며, `AGENTS.md`, `README.md`, `specs/README.md`, `.agent/workflows/*.md`, `specs/AUDIT_STRATEGY.md`도 이 구조를 기준으로 재정렬했다
- [x] T2-181 `g5-admin-models` purity 감사 추가: `scripts/check_active_crate_boundaries.py`가 `g5-admin-models/src/**`에서 `reqwest`, `rusqlite`, `tauri`, `tokio`, `keyring`, shell/infra module import를 실패로 잡아 DTO/ts-rs 계약 crate가 runtime/infra 하수구로 변질되지 않도록 구조 감사에 포함했다
- [x] T2-183 활성 크레이트 내부 경계 감사 4차: `scripts/check_active_crate_boundaries.py`가 `app_state/*service.rs` 함수 단위 backend seam 경고, `db/**` 밖 transaction boundary 위반 실패, `core/ports.rs` concrete adapter coupling 경고를 추가했고, `scripts/collect_architecture_metrics.py`도 같은 지점을 별도 섹션으로 보고하도록 확장해 구조 감사가 file-level을 넘어 method/transaction/port ownership drift까지 드러내게 했다
- [x] T2-179 `g5-admin-models` 1차 crate split 착수: workspace member `g5-admin-models`를 추가하고 `src-tauri/src/models/**`를 새 crate로 이동했다. `src-tauri/src/lib.rs`는 `pub use g5_admin_models::models;` re-export만 남겨 기존 `crate::models::*` import를 유지했고, `ts-rs export_to` 경로와 export harness를 새 crate 기준으로 보정한 뒤 workspace/build/test가 import cycle 없이 통과하는 것을 검증했다
- [x] T2-180 활성 크레이트 내부 경계 감사 3차: `scripts/check_active_crate_boundaries.py`가 `app_state/*service.rs`의 backend seam 수를 읽어 `multi-backend service ownership hotspot`을 경고하도록 확장해, 분리 전에도 `master_lock_service`, `security_settings_service`, `site_catalog_service` 같은 ownership hotspot이 구조 감사 결과에 명시적으로 드러나게 했다
- [x] T2-178 활성 크레이트 내부 경계 감사 2차: `scripts/check_active_crate_boundaries.py`가 `commands -> AppState` 직접 wrapper 호출(`admin_api/database_path/service accessor` 제외)과 `error/mod.rs`, `commands/registry.rs` 같은 root orchestrator/module LOC 허용치를 추가 검사하도록 확장해, concrete import/legacy/shared leak 외에 우회 호출/재비대화도 구조 감사에서 상설 경고로 표면화했다
- [x] T2-177 crate split 착수 판정: `g5-admin-models`를 첫 분리 후보로 확정했고, blocker였던 `models/auth.rs -> error::ErrorGuide` 순환을 `models/problem.rs` 도입으로 제거해 `ProblemDetails`, `ErrorGuide`, `AppErrorPayload`를 모델 계약으로 승격했다. 남은 후속은 실제 workspace member 추가와 `ts-rs export_to` 경로 조정이다
- [x] T2-175 활성 크레이트 내부 경계 감사 자동화: `scripts/check_active_crate_boundaries.py`를 추가해 `commands -> db/token_store/runtime_config/api_client/site_manager` concrete import, `legacy.rs` quarantine 위반, `shared/common` 최상위 namespace의 concrete IO leak, placeholder crate 오판을 `audit:structure`와 CI 구조 감사 workflow에서 상설 점검하도록 승격
- [x] T2-176 `site/security/master_lock/session` command의 service direct-call 정리: `commands/site/*`, `commands/security/*`, `commands/master_lock.rs`, `commands/auth/{shared,session}.rs`, `commands/common.rs`, `commands/activity.rs`, `commands/debug.rs`가 `AppState` wrapper 메서드 대신 `site_catalog_service()`, `security_settings_service()`, `master_lock_service()`, `session_service()`를 직접 사용하도록 바꿨고, 예전 `AppState` entry wrapper는 테스트 전용 호환 API로 한정해 command -> service -> port -> infra 경계를 더 명확히 했다
- [x] T2-174 `AdminApiPort` 최소 도입: `core/ports.rs`에 `AdminApiPort`를 추가하고 `ApiClient`에 구현했으며, `SiteCatalogService`의 base URL 적용, `auth/session` 흐름, `member me`, `debug`는 concrete `ApiClient` 대신 `AppState.admin_api()` 경유로 정리했다
- [x] T2-173 `SecurityStorePort`·`BackupStorePort` 최소 도입: `core/ports.rs`에 `SecurityStorePort`, `BackupStorePort`를 추가하고 `SiteRepository`에 구현했으며, `SecuritySettingsService`, `MasterLockService`, `build_totp`는 concrete `SiteRepository` 대신 `AppState` port accessor 경유로 동작하도록 정리했다
- [x] T2-172 최소 app-core port 도입: `core/ports.rs`에 `SessionStorePort`, `SiteCatalogStorePort`를 추가하고 `TokenStore`, `SiteRepository`에 구현했으며, `SessionService`, `SiteCatalogService`, `AppState` accessor는 concrete 필드 대신 port 경유로 정리했다
- [x] T2-171 `SessionService` seam 1차 도입: `app_state/session_service.rs`를 추가해 active-site 세션 load/save/clear와 session hint 갱신을 service 경계로 뺐고, `commands/common.rs`, `commands/auth/{shared,session}.rs`는 더 이상 `token_store + local-site-db`를 직접 조합하지 않고 `AppState` service entry를 경유하도록 정리했다
- [x] T2-170 `MasterLockService` seam 1차 도입: `app_state/master_lock_service.rs`를 추가해 앱 잠금 상태 조회, setup/lock, 비밀번호·빠른 잠금 해제 unlock, OTP unlock challenge, unlock rate-limit/lockout 상태 전이를 service 경계로 뺐고, `app_state/master_lock/{status,unlock,totp}.rs`는 public entry wrapper 중심으로 정리했다
- [x] T2-169 `SecuritySettingsService` seam 1차 도입: `app_state/security_settings_service.rs`를 추가해 로컬 보안 설정 조회/변경, 빠른 잠금 해제, 백업 export/import, TOTP 등록/활성화/비활성화를 service 경계로 뺐고, `app_state/security/{mod,settings,fast_unlock,backup,totp}.rs`는 검증 wrapper와 service entry 중심으로 정리했다
- [x] T2-168 `SiteCatalogService` seam 1차 도입: `app_state/site_catalog_service.rs`를 추가해 site catalog 조회, active site 전환, site CRUD, site reload/load, active site 적용을 service 경계로 뺐고, `AppState`와 `app_state/sites.rs`는 보안 체크와 entry wrapper 중심으로 정리했다
- [x] T2-113 app-core 경계 및 DI 계획 고정: `specs/foundation/APP_CORE_BOUNDARY_PLAN.md`를 추가해 `AppStateDependencies -> AppState::from_dependencies` seam 위에서 `ApiClient`, `TokenStore`, `SiteRepository`, `SiteManager`의 목표 포트와 `SiteCatalogService / MasterLockService / SecuritySettingsService / SessionService` 경계, `g5-admin-models -> core -> infra -> command` crate split 순서를 문서로 확정했다
- [x] T2-167 `navigation` mixed file을 `types / routes / manifest / helpers` 구조로 분해: 공개 import 경로는 `navigation.ts` 그대로 유지하면서 실제 책임을 `navigation-types.ts`, `navigation-routes.ts`, `navigation-manifest.ts`, `navigation-helpers.ts`로 분리했다. 그 결과 route 상수, nav manifest, 파생 helper가 섞여 있던 giant mixed file은 해소했고, 남은 대형 파일은 의도된 data manifest인 `navigation-manifest.ts`로 한정됐다
- [x] T2-166 `SMS Contacts` 목록/편집 ownership 2차 분해: `AdminSmsContactsSection.tsx`를 `AdminSmsContactsListSection.tsx`, `AdminSmsContactEditorSection.tsx`로 재편해 검색·일괄 처리·페이징과 개별 연락처 편집 폼을 분리했고, `AdminSmsContactsWorkspace.tsx`는 새 섹션 파일을 직접 소비하도록 정리했다. 그 결과 프론트 300줄 초과 섹션/manifest 파일은 `navigation.ts`만 남았다
- [x] T2-165 `Admin Config`·`SMS Templates`·`FAQs` 섹션 ownership 분해: `AdminConfigSections.tsx`에서 개발 진단 카드와 공용 field control을 `AdminConfigDiagnosticsCard.tsx`, `admin-config-field-controls.tsx`, `admin-config-schema-label.ts`로 분리했고, `AdminSmsTemplatesSections.tsx`와 `AdminFaqsSections.tsx`는 각각 `Groups/List/Editor/Dialogs`, `Master/Items/Dialogs` 파일로 재편해 실제 작업면 ownership 기준으로 쪼갰다. 그 결과 남은 프론트 300줄 초과 섹션/manifest 후보는 `navigation.ts`와 `AdminSmsContactsSection.tsx` 수준으로 축소됐다
- [x] T2-164 `SMS Contacts` 섹션 ownership 분해: `AdminSmsContactsSections.tsx` 단일 파일을 `AdminSmsContactGroupsSection.tsx`, `AdminSmsContactsSection.tsx`, `AdminSmsContactImportExportCard.tsx`로 나눠 그룹 CRUD, 연락처 목록·편집, 가져오기/내보내기 미리보기 ownership을 직접 분리했고 `AdminSmsContactsWorkspace.tsx`는 새 섹션 파일을 직접 소비하도록 정리해 프론트 잔여 hotspot에서 SMS 연락처 monolith를 제거했다
- [x] T2-163 `db/sites`·`site health-check` helper 분해: `db/sites.rs`를 `sites/{mod,catalog,activity,runtime_state}.rs`로, `commands/site/shared/health_check.rs`를 `health_check/{mod,probe,tests}.rs`로 재편해 사이트 CRUD, activity 로그, session hint 저장과 health probe 루프, transport 진단, 테스트 harness ownership을 분리했고 backend 잔여 hotspot을 `menu/mutations`, `sms_history/queries`, `permission/auth` 같은 단일 도메인 세부 모듈 수준으로 더 낮췄다
- [x] T2-162 `menu`·`sms_history` command 분해: `commands/menu.rs`를 `menu/{queries,mutations}.rs`로, `commands/sms_history.rs`를 `sms_history/{queries,actions}.rs`로 재편하고 IPC registry를 실제 정의 경로 기준으로 갱신해 메뉴 조회/변경과 SMS 이력 조회/재전송 책임을 분리했고 backend 잔여 hotspot을 `site/shared/health_check`, `db/sites` 같은 소수의 단일 도메인 helper 축으로 압축했다
- [x] T2-161 `permission`·`security`·`sms_contact shared` command ownership 분해: `commands/permission.rs`를 `permission/{auth,permissions}.rs`로, `commands/security.rs`를 `security/{settings,fast_unlock,totp,shared}.rs`로, `commands/sms_contact/shared.rs`를 `shared/{normalize,responses}.rs` 소비 구조로 재편해 admin auth/권한 CRUD, 로컬 보안 설정/빠른 잠금 해제/TOTP, SMS 연락처 응답 조립/입력 정규화 책임을 각각 분리했고 backend 잔여 hotspot을 `menu`, `sms_history`, `db/sites` 같은 단일 도메인 command 축으로 더 좁혔다
- [x] T2-160 `point` model·`site shared` 분해: `models/point.rs`를 `point/{mod,queries,actions}.rs`로, `commands/site/shared.rs`를 `shared/{mod,catalog,health_check}.rs`로 재편해 포인트 조회/액션 계약과 사이트 catalog/error helper, health-check probe 흐름을 분리했고 backend 잔여 hotspot을 `permission/sms_contact/security/menu` command 축으로 좁혔다
- [x] T2-159 `api_client/member`·`db/tests` 구조 분해: `api_client/member.rs`를 `member/{mod,profile,admin,media}.rs`로, `db/tests.rs`를 `tests/{mod,support,master_key,sites_security,backup}.rs`로 재편해 회원 API client endpoint 축과 DB 테스트 시나리오 축을 분리했고, backend 잔여 hotspot을 `command/shared`와 `point` model 중심으로 더 좁혔다
- [x] T2-158 `mail`·`member` model 분해: `models/mail.rs`를 `mail/{mod,templates,recipients,send}.rs`로, `models/member.rs`를 `member/{mod,list,detail,profile}.rs`로 재편해 메일 템플릿/수신자/발송과 회원 목록/상세/프로필/미디어 경계를 실제 endpoint 계약 축에 맞게 분리했고, backend dense model 잔량을 `point` 1건 수준으로 줄였다
- [x] T2-157 `sms_template`·`faq` model 분해: `models/sms_template.rs`를 `sms_template/{mod,groups,templates}.rs`로, `models/faq.rs`를 `faq/{mod,masters,images,faqs}.rs`로 재편해 그룹/템플릿과 FAQ 마스터/이미지/문항 경계를 코드 구조와 동일하게 맞췄고, 남은 backend dense model 후보를 `mail`·`member` 중심으로 더 좁혔다
- [x] T2-156 `board model`·`model export test`·`app_state test` 모듈화: `models/board.rs`를 `board/{mod,contract,payload,serde_impl}.rs`로 나눠 계약 타입, payload builder, scalar parity deserializer를 분리했고, `models/tests.rs`와 `app_state/tests.rs`는 각각 `tests/{mod,...}.rs` 구조의 도메인/시나리오 모듈로 재편해 giant export registry와 state inline scenario 묶음을 해소했다
- [x] T2-155 `models/config` 계약/파서/페이로드 분해: `models/config.rs`를 `config/{mod,contract,payload,serde_impl,tests}.rs` 구조로 재편해 admin config 계약 타입, scalar parity deserializer, update payload builder, 전용 테스트를 분리했고, `models/config.rs` 단일 god file을 해소했다
- [x] T2-154 `SecuritySettingsSections`·`AdminMailsSections` 섹션 ownership 분해: `SecuritySettingsSections.tsx`를 `cards / core-cards / totp-cards / dialogs / fields` 구조로 재편해 보안 카드와 OTP 다이얼로그 책임을 분리했고, `AdminMailsSections.tsx`를 `template / compose / recipients / send / shared` 구조로 재구성해 메일 목록·수신자·발송·삭제 경계를 파일 단위 ownership으로 나눴다
- [x] T2-153 `MemberDetailCard`·`AppShell` 상호작용 집중 파일 분해: `MemberDetailCard.tsx`를 `MemberDetailSections.tsx`, `MemberDetailMediaSection.tsx`, `MemberDetailProfileSection.tsx`, `MemberDetailControls.tsx` 조합의 소비자로 바꿔 메인 파일을 `234 LOC`, 섹션 파일을 `181 LOC`로 줄였고, `AppShell.tsx`의 캡처/컨텍스트 메뉴 부하는 `useAppShellCapture.tsx`, `useAppShellContextMenu.ts`, `app-shell-context-menu-actions.ts`로 옮겨 셸 본체를 `168 LOC`로 축소했다
- [x] T2-152 `faq`·`sms_template` API client 분해: `api_client/faq.rs`를 `faq/{masters,media,faqs}.rs`로, `api_client/sms_template.rs`를 `sms_template/{groups,templates}.rs`로 나눠 client 계층도 command와 같은 책임 축으로 맞췄고 root는 각각 `3 / 2 LOC` 모듈 entry로 축소했다
- [x] T2-151 `models/sms_contact`·`app_state/security`·`models/mod`·`operations` 집중 파일 분해: `models/sms_contact.rs`를 `sms_contact/{groups,contacts,files}.rs`로, `app_state/security.rs`를 `security/{settings,backup,totp,fast_unlock}.rs`로, `models/mod.rs`를 `tests.rs` include 구조로, `command-context-builders/operations.ts`를 `operations/{report-push,access,points,engagement}.ts`로 재구성해 root 길이를 각각 `7 / 64 / 41 / 11 LOC`로 낮췄다
- [x] T2-150 `api_client` 도메인 세부 모듈 분해: `api_client/board_group.rs`를 `board_group/{groups,members,legacy}.rs`로, `api_client/sms_contact.rs`를 `sms_contact/{groups,contacts,files}.rs`로 나눠 API client에서도 command와 같은 도메인 책임 축을 맞췄고, root는 각각 `3 LOC` 하위 모듈 entry로 축소했다
- [x] T2-149 `command-context` registry 도메인 분해: `command-context-registry.ts`를 `command-context-builders/{local,content-faq-system,mail-menu-theme,members-boards,operations,sms-debug,shared}.ts` 조합으로 재구성해 root registry를 `26 LOC`로 축소했고, 212개 diagnostic metadata를 도메인별 builder map으로 나눠 다음 단계의 generated registry/manifest 전환 준비선을 세웠다
- [x] T2-148 transport·master-lock 세부 모듈 분해: `api_client/request.rs`를 `request + request_io + request_headers`로 나눠 public transport API와 raw HTTP I/O를 분리했고, `app_state/master_lock.rs`를 `master_lock/{status,unlock,lockout,totp}.rs`로 바꿔 상태 조회/해제 흐름/락아웃/TOTP 검증 책임을 분리해 각각 `213 LOC`, `96/107/68/86 LOC` 구조로 낮췄다
- [x] T2-147 `token_store`·`runtime_config` 모듈 분해: `token_store.rs`를 `token_store/{mod,backend}.rs`로, `runtime_config.rs`를 `runtime_config/{mod,resolve,tests}.rs`로 나눠 비동기 세션 orchestration과 파일/keychain backend, 런타임 계약 타입과 환경 해석/경로 탐색 책임을 분리하고 root 길이를 각각 `181`, `166 LOC`로 낮췄다
- [x] T2-146 app-core root module 분해 1차 완료: `api_client.rs`를 `api_client/{mod,request,problem}.rs`로, `db/mod.rs`를 `db/{connection,master_key,secret_store,portable_backup,backup}.rs` 조합으로, `app_state/mod.rs`의 대형 inline test를 `app_state/tests.rs`로 분리해 root orchestrator 길이를 `api_client/mod 119`, `db/mod 111`, `app_state/mod 186 LOC`로 낮추고 다음 단계의 DI/crate split 준비선을 세웠다
- [x] T2-145 `error` 모듈 분해: 단일 `src-tauri/src/error.rs`를 `error/mod.rs`, `error/classification.rs`, `error/payload.rs`로 나눠 에러 열거형, payload export, classification fallback 책임을 분리하고 `235 / 186 / 41 LOC`로 축소했다
- [x] T2-141 workspace 구조 분해 2차 완료: `AdminMailsWorkspace`, `AdminMembersWorkspace`, `AdminBoardGroupsWorkspace`, `AdminLayoutsWorkspace`, `BoardWorkspace`를 `hook + sections` 소비자로 정리해 각각 `134 / 94 / 110 / 155 / 103 LOC`로 축소했고, `300줄 초과 *Workspace.tsx` 잔량을 `0`으로 만들었다
- [x] T2-144 workspace 구조 분해 2차 2배치: `AdminContentsWorkspace`, `AdminSmsContactsWorkspace`, `AdminSmsTemplatesWorkspace`, `AdminFaqsWorkspace`를 `sections + hook/model` 구조로 전환해 각각 `103 / 187 / 136 / 123 LOC`로 축소하고, 남은 oversized workspace를 `5개`로 줄였다
- [x] T2-143 `SecuritySettingsWorkspace` 구조 분해: state/handler orchestration을 `use-security-settings-workspace.ts` hook으로 옮겨 `SecuritySettingsWorkspace.tsx`를 `229 LOC`로 축소하고, 로컬 보안 다이얼로그 상태 변경을 화면 렌더링에서 분리
- [x] T2-142 workspace 구조 분해 2차 1배치: `AdminReportsWorkspace`, `AdminPopularWorkspace`, `AdminBrowscapWorkspace`에서 카드/리스트/결과 패널을 `Sections`로 분리해 각각 `210 / 181 / 157 LOC`로 축소하고, 후속 기준을 `wrapper-only 분해 금지`로 명문화
- [x] T2-112 구조 분해 1차 완료: 남아 있던 `AdminContentsPage`, `SecuritySettingsPage`, `AdminReportsPage`, `AdminPopularPage`, `AdminBrowscapPage`를 얇은 route entry + workspace 구조로 정리해 `300줄 초과 route-native page`와 `300줄 초과 top-level command`를 모두 `0`으로 만들었다
- [x] T2-140 `auth` command 분해: 단일 `commands/auth.rs`를 `session / health / shared` 하위 모듈로 나눠 마지막 oversized command 1건을 해소하고 인증 세션 흐름과 로컬 health probe 경계를 분리
- [x] T2-139 `AdminSmsConfigPage` 구조 분해: `AdminSmsConfigWorkspace.tsx`, `AdminSmsConfigSections.tsx`, `admin-sms-config-page-helpers.ts`, `AdminSmsConfigPage.test.tsx`를 도입해 SMS 기본설정 route page를 얇은 entry로 분리하고 oversized route-native page 1건을 해소
- [x] T2-138 `board` command 분해: 단일 `commands/board.rs`를 `queries / mutations / shared` 하위 모듈로 나눠 oversized command 1건을 해소하고 조회와 변경/복사/새글삭제 경계를 분리
- [x] T2-137 `AdminSmsHistoryPage` 구조 분해: `AdminSmsHistoryWorkspace.tsx`, `AdminSmsHistorySections.tsx`, `admin-sms-history-page-helpers.ts`, `AdminSmsHistoryPage.test.tsx`를 도입해 SMS 이력 route page를 얇은 entry로 분리하고 oversized route-native page 1건을 해소
- [x] T2-136 `mail` command 분해: 단일 `commands/mail.rs`를 `queries / mutations / shared` 하위 모듈로 나눠 oversized command 1건을 해소하고 목록/상세/수신자 조회와 템플릿 변경/발송 경계를 분리
- [x] T2-135 `AdminSmsContactsPage` 구조 분해: `AdminSmsContactsWorkspace.tsx`, `admin-sms-contacts-page-helpers.ts`를 도입해 SMS 연락처 route page를 얇은 entry로 분리하고 oversized route-native page 1건을 해소
- [x] T2-134 `poll` command 분해: 단일 `commands/poll.rs`를 `queries / mutations / legacy / shared` 하위 모듈로 나눠 oversized command 1건을 해소하고 조회/변경/legacy alias 경계를 분리
- [x] T2-133 `popup` command 분해: 단일 `commands/popup.rs`를 `queries / mutations / legacy / shared` 하위 모듈로 나눠 oversized command 1건을 해소하고 목록/상세 조회와 변경/legacy alias 경계를 분리
- [x] T2-132 `AdminMembersPage` 구조 분해: `AdminMembersWorkspace.tsx`, `AdminMembersSections.tsx`, `admin-members-page-helpers.ts`를 도입해 회원 route page를 얇은 entry로 분리하고 oversized route-native page 1건을 해소
- [x] T2-123 `sms_contact` command 분해: 단일 `commands/sms_contact.rs`를 `groups / contacts / files / shared` 하위 모듈로 나눠 oversized command 1건을 해소하고 endpoint 성격별 경계를 분리
- [x] T2-122 `AdminFaqsPage` 구조 분해: `AdminFaqsWorkspace.tsx`, `AdminFaqsSections.tsx`, `admin-faqs-page-helpers.ts`, `AdminFaqsPage.test.tsx`를 도입해 FAQ route page를 얇은 entry로 분리하고 oversized route-native page 1건을 해소
- [x] T2-125 `sms_template` command 분해: 단일 `commands/sms_template.rs`를 `groups / templates / shared` 하위 모듈로 나눠 oversized command 1건을 해소하고 그룹 관리와 템플릿 CRUD 경계를 분리
- [x] T2-124 `AdminSmsTemplatesPage` 구조 분해: `AdminSmsTemplatesWorkspace.tsx`, `AdminSmsTemplatesSections.tsx`, `admin-sms-templates-page-helpers.ts`, `AdminSmsTemplatesPage.test.tsx`를 도입해 SMS 템플릿 route page를 얇은 entry로 분리하고 oversized route-native page 1건을 해소
- [x] T2-127 `faq` command 분해: 단일 `commands/faq.rs`를 `masters / faqs / media / shared` 하위 모듈로 나눠 oversized command 1건을 해소하고 FAQ 마스터/문항/이미지 명령 경계를 분리
- [x] T2-126 `AdminBoardGroupsPage` 구조 분해: `AdminBoardGroupsWorkspace.tsx`, `AdminBoardGroupsSections.tsx`, `admin-board-groups-page-helpers.ts`를 도입해 게시판 그룹 route page를 얇은 entry로 분리하고 oversized route-native page 1건을 해소
- [x] T2-129 `point` command 분해: 단일 `commands/point.rs`를 `queries / actions / legacy / shared` 하위 모듈로 나눠 oversized command 1건을 해소하고 조회/현대 액션/레거시 엔드포인트 경계를 분리
- [x] T2-128 `AdminPointsPage` 구조 분해: `AdminPointsWorkspace.tsx`, `AdminPointsSections.tsx`, `admin-points-page-helpers.ts`, `AdminPointsPage.test.tsx`를 도입해 포인트 route page를 얇은 entry로 분리하고 oversized route-native page 1건을 해소
- [x] T2-131 `layout` command 분해: 단일 `commands/layout.rs`를 `queries / mutations / legacy / shared` 하위 모듈로 나눠 oversized command 1건을 해소하고 레이아웃 조회/변경/legacy reorder 경계를 분리
- [x] T2-130 `AdminLayoutsPage` 구조 분해: `AdminLayoutsWorkspace.tsx`, `AdminLayoutsSections.tsx`, `admin-layouts-page-helpers.ts`, `AdminLayoutsPage.test.tsx`를 도입해 레이아웃 route page를 얇은 entry로 분리하고 oversized route-native page 1건을 해소
- [x] T2-121 `board_group` command 분해: 단일 `commands/board_group.rs`를 `queries / mutations / legacy / shared` 하위 모듈로 나눠 oversized command 1건을 해소하고 modern/legacy 경계를 분리
- [x] T2-120 `AdminMailsPage` 구조 분해: `AdminMailsWorkspace.tsx`, `AdminMailsSections.tsx`, `admin-mails-page-helpers.ts`, `AdminMailsPage.test.tsx`를 도입해 메일 발송 route page를 얇은 entry로 분리하고 oversized route-native page 1건을 해소
- [x] T2-119 `site` command 분해: 단일 `commands/site.rs`를 `catalog / health / mutations / shared` 하위 모듈로 나눠 oversized command 1건을 해소하고, health probe/로컬 catalog 응답 helper를 공용화
- [x] T2-118 `SiteDashboardPage` 구조 분해: `SiteDashboardSections.tsx`, `SiteDashboardDialogs.tsx`, `site-dashboard-helpers.ts`를 도입해 사이트 대시보드 페이지를 `288 LOC` orchestration page로 축소하고 oversized route-native page 1건을 해소
- [x] T2-117 app-core seam 1차: `AppStateDependencies`를 도입해 `RuntimeConfig / TokenStore / ApiClient / SiteRepository / SiteManager` 조립을 `AppState::from_dependencies` 경로로 분리하고 composition root 교체 시작점을 마련
- [x] T2-116 `member` command 분해: 단일 `commands/member.rs`를 `queries / mutations / media / shared` 하위 모듈로 나눠 oversized command 1건을 해소하고 registry는 실제 선언 모듈 경로를 따르도록 정리
- [x] T2-115 `AdminConfigPage` 구조 분해: `AdminConfigSections.tsx`, `admin-config-page-meta.ts`를 도입해 기본환경설정 페이지를 `page + sections + static meta`로 나누고 route-native page 300줄 기준 아래(`279 LOC`)로 복귀
- [x] T2-111 registry 단일화 1차: 범위를 `rust/g5-admin` + `rust/g5-admin/src-tauri`로 한정하고, `adminRouteRegistry.tsx`, `command-context-registry.ts`, `api-target-registry.ts`, `src-tauri/src/commands/registry.rs`를 도입해 `router.tsx`, `command-context.ts`, `api-targets.ts`, `src-tauri/src/lib.rs`의 중복 route/diagnostic/IPC registry를 export registry/매크로 기준으로 정리
- [x] T2-110 Rust 구조 감사 기준선 수립: 코드/문서/생성물/설정을 분리해 LOC와 구조 부채를 재계량하고, 도메인 경계/SRP/DI/hardcoding/workspace/crate/문서 정합성 기준의 구조 감사 보고서와 workflow를 현재 헌법에 맞게 갱신
- [x] T2-102 로그인 전 절차 UI를 단일 컬럼 entry screen으로 재정렬하고, 보안 저장소 gate/session refresh 회귀를 고정: secure storage gate, 마스터 잠금 설정/해제, 첫 사이트 등록, 사이트 로그인 화면에서 pre-auth 툴바/2컬럼 정보 패널을 제거하고 짧은 서비스 톤 copy로 정리했으며, 같은 세션 새로고침 시 첫 화면으로 다시 빠지지 않도록 `App.first-run.e2e` 회귀를 추가
- [x] T2-103 관리자 작업면 정합성 보정: `사이트관리`를 앱 셸 내부 작업면으로 고정하고, `앱설정` top tab/gear 아이콘/관리자 ID-only 헤더/300px viewport 대응/좌측 서브메뉴 middle 정렬/`#efefef + white surface`/shadow 제거 기준을 현재 셸과 작업면에 반영
- [x] T2-104 환경설정·SMS UX/오류 회귀 정리: `cmd_admin_config_update`의 `extra` 누락 회귀를 payload/serde 양쪽에서 막고, `SMS 설정 조회 404`는 사용자용 미지원 안내로 치환했으며, 상하 save bar·설명 info callout·dev-only trace 패널 기준으로 작업면을 재구성
- [x] T2-105 보안 설정 노출 정책 정리: 빠른 잠금 해제는 지원 가능한 OS/기기에서만 일반 모드에 노출하고, 미지원 상태와 세부 trace는 개발모드에서만 드러내도록 조정
- [x] T2-099 주요 route-native 작업면 1차 densify: `환경설정`, `회원관리`, `게시판관리`, `SMS 연락처 관리`를 기준으로 PageIntro/action tile/table/form/search bar/card 밀도를 conventional admin template 톤으로 줄이고, 기본 글자 크기와 radius를 함께 낮춰 셸-작업면 간 시각 언어를 맞춤
- [x] T2-096 표시 설정 툴바를 `light / dark / OS auto` 3모드 테마 선택으로 확장하고, runtime theme 상태를 `theme + resolvedTheme` 기준으로 재정리해 사용자 디자인 방향과 일치시키며 로컬 기억을 유지
- [x] T2-098 멀티사이트 canonical IA를 `상단 작업 탭(고정 최상위 + 열린 사이트 + 더보기) + 좌측 서브메뉴 + 중앙 작업면`으로 재정의하고, 등록 사이트 전체 좌측 목록 대신 작업중 사이트 탭만 상단에 노출하도록 셸과 SSOT를 동기화
- [x] T2-097 공용 admin primitives 밀도 조정: `Badge/Button/Input/InputGroup/Textarea`, `AdminDataTable`, `AdminFormFields`, `ErrorBanner`, `PageIntro`의 radius/spacing/table rhythm을 conventional admin app 기준으로 더 평평하고 촘촘하게 맞춰 개별 메뉴를 따로 수정하지 않아도 같은 톤이 퍼지게 정리
- [x] T2-095 관리자 셸 시각 언어를 conventional admin app 기준으로 재정렬: 상단 주메뉴 + 좌측 사이트/서브메뉴 + 중앙 작업면 구조를 유지한 채 radius/shadow/spacing을 더 평평하고 촘촘한 admin template 톤으로 줄이고, `/overview`를 dense KPI + 최근 작업 + 빠른 링크 중심 작업 홈으로 재구성
- [x] T2-094 `api/client/core.ts` 기능 분리: 거대 command diagnostic spine을 `core/command-context.ts`와 `core/api-targets.ts`로 나눠 `invoke/error`와 `명령 컨텍스트 레지스트리/API target 해석기` 책임을 분리하고, `command-context.test.ts`로 대표 명령 및 case parity 회귀를 고정
- [x] T2-093 `AdminSmsContactsPage` 기능 분리: 거대 `src/features/sms-contacts/AdminSmsContactsPage.tsx`를 `AdminSmsContactsSections.tsx`의 `그룹 작업면 / 연락처 작업면 / 가져오기·내보내기` 렌더링 섹션으로 분해하고, `AdminSmsContactsPage.test.tsx`로 기본 연락처 화면과 `contact-files` 라우트 회귀를 고정
- [x] T2-092 `SecuritySettingsPage` 기능 분리: 거대 `src/features/security/SecuritySettingsPage.tsx`에서 상태/핸들러는 페이지에 남기고 렌더링을 `SecuritySettingsSections.tsx`로 분리했으며, `SecuritySettingsPage.test.tsx`로 정상 렌더/오류 fallback/idle-timeout step-up dialog 회귀를 고정
- [x] T2-097 startup gate/백업 구조 재정렬: 첫 화면을 단일 히어로 + 보안 저장소 안내 카드로 단순화하고, OS secure storage는 런타임 비밀 저장용으로 유지하되 `/sites/dashboard` 백업은 사용자 지정 백업 암호로 암호화된 `portable encrypted backup(.g5bak)` 포맷으로 승격했으며, 기존 `.db` SQLCipher 스냅샷 import는 동일 장치/동일 로컬 키 기준의 레거시 호환 경로로 제한
- [x] T2-091 `db` 기능 분리: 거대 `src-tauri/src/db.rs`를 `db/{sites,security,backup}.rs`로 분해해 사이트 저장소, 앱 잠금/보안 설정, 백업 머지 경계를 세우고 기존 `db::tests` 회귀망(`8 passed`, 전체 `340 passed`)으로 SQLCipher/keyring/backup 행위를 재검증
- [x] T2-090 `app_state` 기능 분리: 거대 `src-tauri/src/app_state.rs`를 `app_state/{master_lock,security,sites}.rs`로 분해해 로컬 잠금/보안 설정/사이트 카탈로그 경계를 세우고, 기존 `app_state::tests` 회귀망(`340 passed`)으로 동작 보존을 재검증
- [x] T2-089 critical coverage 여유폭 보강: `admin-mails-form`, `admin-permissions-form`, `admin-points-form`에 normalization/negative/default 회귀 테스트를 추가해 critical coverage를 `86.46 / 77.98 / 82.42 / 86.51`까지 상향
- [x] T2-088 local fast deploy에서 keychain prompt를 제거: 현재 canonical은 ad-hoc/unsigned `deploy:desktop:fast`가 OS 사용자 설정 파일에 `sessionStorage=file`, `dbMasterStorage=file` override를 써서 개발용 로컬 저장소를 file 기준으로 유지하되, 기존 keychain-backed DB는 런타임이 `.db-master-key`로 복사 마이그레이션해 재온보딩 없이 이어받는 방식이다.
- [x] T2-087 배포 신뢰 보고를 `deploy:desktop*` 표준에 포함: 로컬 fast/release 배포 직후 현재 OS 기준 서명/신뢰 상태를 출력하도록 `deploy-rust-admin-desktop.mjs`를 보강하고, 문서에 `fast deploy는 ad-hoc/local trust일 수 있으므로 trust report를 함께 본다` 기준을 고정
- [x] T2-086 첫 실행 전체 E2E 자동화: secure storage gate -> 마스터 잠금 설정 -> 초기 사이트 등록 -> 사이트 활성화 -> 사이트 로그인 -> overview 진입을 `src/App.first-run.e2e.test.tsx` 단일 회귀 시나리오로 고정
- [x] T2-085 통합 감사 기준을 `php + rust` 2자로 재정렬하고 보관 상태인 Flutter/Web를 routine 감사 범위에서 제외: 루트 헌법, Rust/PHP 진입 스크립트, GitHub Actions workflow, 통합 감사 표준 문서를 현재 제품 범위에 맞게 정리
- [x] T2-084 테스트/빌드 잡음 정리: Vitest setup의 `localStorage` getter 접근을 제거해 Node 25 `--localstorage-file` 경고를 없앴고, Vite manual chunk 규칙을 로컬 route page 기준으로 재조정해 `index` 500kB chunk warning 없이 `feature-environment / feature-admin-content / feature-sms / feature-tools / feature-popups` 분할을 정착
- [x] T2-083 첫 실행 멀티사이트 회귀 스모크 보강: `초기 사이트 등록 -> 사이트 활성화`, `인증된 로그인 화면 -> overview`, `auth/session cache -> site catalog cache 동기화`를 React 테스트로 고정해 흰 화면/리다이렉트 루프 회귀를 차단
- [x] T2-082 멀티OS secure storage gate와 마스터 BF 방어 UX를 보강: 앱 시작 시 보안 저장소 안내 화면을 먼저 보여주고 사용자가 `계속`을 눌렀을 때만 OS keyring/keychain 접근을 요청하도록 지연시켰으며, 마스터 잠금 해제는 5회 실패 후 5분 차단, 이후 실패마다 5분 가산, 잠금 중 입력/버튼 비활성화 기준으로 재정의
- [x] T2-038 PHP live 환경 trace 최종 E2E 마감: 2026-03-10 실서버에서 `/health`, `/admin/members` 401, `/auth/login` 401, `/auth/login -> /members/me` 200까지 `request_id/correlation_id/server_request_id/owner/fault_domain` 계약을 재검증했고, stale staging smoke credential이 가리키던 누락 회원도 `create_hash` 호환 해시로 복구
- [x] T2-052 Rust command 보일러플레이트 정리: `command_context` + `execute_with_access_token` helper로 `next_request_id + state.inner().clone() + closure clone` 반복을 command layer 공통으로 흡수
- [x] T2-015A 스테이징 `gnurestapi.cc` create_hash 호환성 재감사: 원격 `check_password_hash_compat.php --json` 기준 `encrypt_func=create_hash`, `total=1`, `incompatible_count=0` 확인으로 기존 bcrypt drift blocker 해소
- [x] T2-081 로컬 SQLCipher DB 마스터키 저장을 JWT `sessionStorage` 설정과 분리해 항상 OS keyring-only로 고정하고, 번들 `app-config.json` 기본값도 `keychain`으로 상향
- [x] T2-077 로컬 마스터 잠금의 빠른 잠금 해제(Touch ID / Windows Hello)를 `tauri-plugin-biometry v0.2.6`으로 구현하고, OS biometry secure storage의 랜덤 secret + SQLCipher DB verifier 조합으로 1차 인증을 연결
- [x] T2-079 로컬 보안 설정을 `/app/security`에 연결하고, 선택형 Google OTP(TOTP) 2차 인증, unlock rate limit/temporary lockout, keyring-only DB key migration 경로를 구현
- [x] T2-080 로컬 민감 작업 step-up auth를 추가해 `백업 export/import`, `전체 사이트 삭제`, `마스터 보안 설정 변경`에 현재 비밀번호 재인증과 선택형 OTP 재확인을 적용
- [x] T2-078 멀티사이트 로컬 보호 마감: 15분 idle auto-lock, 수동 앱 잠금, 초기 SQLCipher 로컬 백업 export/import(`sites + site_settings` 머지) 경로를 구현하고 마스터 대시보드에 연결
- [x] T2-075 로컬 마스터 잠금 UX를 `SQLite verifier 기반 비밀번호 + 패스키/생체인증` 기준으로 재정의하고, `마스터 계정/ID` 개념을 문서와 구현 범위에서 제거
- [x] T2-074 bundled `app-config.json` 및 legacy `apiBaseUrl`을 `기본 사이트`로 자동 승격하지 않도록 제거하고, 첫 사이트는 사용자가 직접 입력하게 강제
- [x] T2-073 멀티사이트 루트 진입을 `로컬 마스터 잠금 설정/해제 -> 사이트 수동 등록/선택 -> 사이트 로그인 -> 사이트 작업 홈` 기준으로 재정렬하고 `/master/*`를 앱 진입 gate로 승격
- [x] T2-076 `g5-admin` JS 툴체인을 `pnpm`에서 `bun`으로 전환하고 스크립트/CI/SSOT 문서를 `bun` 기준으로 고정
- [x] T2-072 멀티사이트 사이트 삭제 후 activity 로그 FK 회귀를 수정해 실제 `site delete`가 실패하지 않도록 보정
- [x] T2-071 멀티사이트 P0 흐름을 `사이트 온보딩 -> 사이트 목록 대시보드 -> 사이트 세션 활성화 -> 사이트 로그인 -> 사이트 작업 홈` 기준으로 재구성
- [x] T2-070 SQLite 기반 멀티사이트 코어를 도입하고 사이트별 세션/탭/온보딩/로컬 대시보드/업데이트 플러그인 로드를 정착
- [x] T2-069 `codex-audit` 워크플로를 실사용 기준으로 보정하고 lint/smoke 회귀를 정리해 종합 3자 대면감사 결과가 오탐 없이 나오도록 수정
- [x] T2-068 멀티OS 헌법 개정에 맞춰 데스크톱 배포 명령을 `deploy:desktop` 표준으로 승격하고 OS별 설정 경로/Windows WebView2/크로스플랫폼 CI 기준을 반영
- [x] T2-067 `/admin/schema` 소비 도메인 전수 점검 후 menus/polls/popups/contents/faqs/members/groups/config 화면을 schema gate 뒤로 이동해 raw field fallback 노출을 차단
- [x] T2-066 화면 캡처를 viewport 기준으로 되돌리고 config extra boolean 필드의 schema 소비 오분류를 정리
- [x] T2-065 Tauri 로컬 반복 작업 시간을 줄이기 위해 `desktop-fast` Cargo profile과 `deploy:mac:fast` 경로를 추가
- [x] T2-064 화면 캡처 기본 범위를 viewport에서 전체 페이지로 확장하고 full-page 옵션 회귀 테스트를 추가
- [x] T2-063 화면 캡처 클립보드를 `RGBA direct IPC`로 교체하고 저장 위치 열기를 네이티브 reveal command로 보강
- [x] T2-062 전역 링크/버튼 affordance를 손가락 커서로 통일하고 브랜드 홈 버튼 회귀 테스트를 추가
- [x] T2-061 Tauri PNG 클립보드 캡처를 `Image.fromBytes` 기반으로 수정하고 저장 완료 토스트에서 Finder/탐색기 reveal 액션을 제공
- [x] T2-060 화면 캡처 회귀를 막기 위해 runtime theme token의 `oklch`를 `rgb/rgba`로 교체하고 clone stylesheet rule sanitizer + 회귀 테스트를 추가
- [x] T2-059 `AppShellHeader` 검색 no-result 키보드/같은 경로 재이동/unknown route fallback/refresh/busy logout 테스트를 추가하고 크리티컬 게이트를 `84 / 75 / 80 / 84`로 재상향
- [x] T2-058 `AppShell` 컨텍스트 메뉴 helper를 별도 모듈로 분리해 크리티컬 게이트에 편입하고 `navigation.ts` 분기 테스트를 확장해 threshold를 `82 / 73 / 79 / 82`로 재상향
- [x] T2-057 `AppShell` 컨텍스트 메뉴/캡처 실패 경로 직접 테스트와 `PageIntro` 추가 분기 테스트를 넣어 전체 테스트를 `45 files / 319 tests`까지 확장
- [x] T2-056 크리티컬 커버리지 게이트에 캡처 색 정규화/사이드바 fallback/헤더 검색/공용 폼 가드 회귀 테스트를 추가하고 threshold를 `80 / 71 / 77 / 80`으로 상향
- [x] T2-055 화면 캡처 clone 단계에 `oklch/oklab/lch/lab -> rgb/rgba` 정규화 계층과 회귀 테스트를 추가해 클립보드/저장 캡처 색 파서 오류를 차단
- [x] T2-054 `shadcn` init/components registry를 도입하고 관리자 헤더를 compact 기본으로 재정렬하면서 InputGroup/읽기 전용 필드 기준을 공용 폼 레이어에 반영
- [x] T2-053 우클릭 컨텍스트 메뉴를 브라우저형 편집 메뉴 + 개발모드 전용 화면 캡처/저장 흐름으로 재구성하고 디버그 UI 노출을 개발모드 플래그로 통합
- [x] T2-001 문서 관리 SSOT 체계 도입
- [x] T2-002 Tauri 2 워크스페이스 초기 구조 생성 및 빌드 확인
- [x] T2-003 개발 착수용 foundation 문서 세트 작성
- [x] T2-006 Auth Core 구현 skeleton 작성
- [x] T2-007 AppError/request_id/api_client/token_store 공통 런타임 spine 구현
- [x] T2-008 OpenAPI 기반 관리자 도메인 매핑 상세화
- [x] T2-009 Admin Members DTO/command 매핑표 작성
- [x] T2-010 관리자 UI 정보구조 초안 정리
- [x] T2-011 Admin Members 레벨 수정 flow 구현
- [x] T2-012 Admin Members 수정/삭제 flow 구현
- [x] T2-013 다음 도메인(Board 또는 Permission) bootstrap 선택 및 SDD 작성
- [x] T2-014 다음 도메인 command/DTO/UI 초안 구현
- [x] T2-015 Admin Boards mutation flow 구현
- [x] T2-016 Permission bootstrap 및 목록/저장/삭제 flow 구현
- [x] T2-017 Admin Popups bootstrap 및 목록/상세/생성/수정/삭제 flow 구현
- [x] T2-018 Admin Polls bootstrap 및 목록/상세/생성/수정/삭제 flow 구현
- [x] T2-019 Admin QA Config 조회/수정 flow 구현
- [x] T2-020 헌법 리팩터링 1차: runtime config 주입, `api_client` 모듈 분할, command 공통 세션 helper 정리
- [x] T2-023 개발 모드 디버그 독과 로컬 로그 파일 추적 추가
- [x] T2-024 개발용 세션 저장소를 `file` 모드로 분리하고 Debug Dock에 현재 세션 저장 백엔드 노출
- [x] T2-025 관리자 화면을 상단 드롭다운 네비게이션 기반 도메인 워크스페이스로 전환하고 활성 도메인만 조회하도록 정리
- [x] T2-026 `next-shadcn-dashboard-starter`의 좌측 사이드바/상단 헤더/페이지 컨테이너 패턴을 현재 Tauri React 앱 셸에 이식
- [x] T2-027 `REST API Client` 구현 표준 지원 문서 추가
- [x] T2-028 `Admin Config` command/route/page 및 SDD 추가
- [x] T2-029 Settings/SMS 도메인 bootstrap SDD 및 command/UI 구현
- [x] T2-030 Members 도메인 route 기반 마이그레이션 (`Data Table + RHF`)
- [x] T2-032 헌법/SDD/REST client 표준 문서를 현재 route 구조, lint/test 게이트, `Admin Config` 적용 상태와 정합하게 재작성
- [x] T2-033 Debug Dock을 하단 화이트 상태바 UX로 재정렬하고 기본 테마 fallback을 `light`로 고정
- [x] T2-034 기본 실행 창 크기를 관리자 작업면 기준으로 확대하고 최소 크기를 고정
- [x] T2-035 전역 라운드를 직각형 톤으로 재정렬하고 외부 API 설정 파일 우선순위를 추가
- [x] T2-036 상단 액션/주메뉴 아이콘 체계를 Lucide 한 세트로 통일하고 설정 아이콘을 실제 이동 액션으로 연결
- [x] T2-037 `/admin/config` scalar 혼합 응답을 허용하도록 Admin Config DTO 역직렬화 보강
- [x] T2-039 PHP-Rust 책임 귀속 추적 구조 정비 (`correlation_id`, `server_request_id`, `owner`, `fault_domain`, `retryable`를 성공/실패 경계와 Debug Dock까지 일관 전파)
- [x] T2-040 관리자 셸 IA를 `상단 주메뉴 + 좌측 서브메뉴 + 소개형 첫 화면`으로 재구성하고 Debug Dock/레거시 bridge 디자인을 통일
- [x] T2-041 앱 번들 이름을 `그누5어드민`으로 고정하고 Gnuboard5용 아이콘 세트를 적용
- [x] T2-042 표시 설정 툴바에 글자 크기 단계 조절과 로컬 기억 기능 추가
- [x] T2-043 상단 우측 검색/표시 설정/프로필/로그아웃 컨트롤을 단일 툴바 리듬으로 재정렬하고 새로고침을 툴바 내부로 통합
- [x] T2-044 관리자 셸의 컨텐츠 내부 스크롤을 제거하고 브라우저/앱 viewport 기준 단일 세로 스크롤 구조로 전환
- [x] T2-045 상단 메뉴를 스티키 hide/show 네비게이션으로 전환하고 Debug Dock을 좌측 하단 아이콘 독 + 펼침 시 하단 전폭 패널 구조로 재정렬
- [x] T2-046 Debug Dock 접힘 상태를 더 낮고 좁은 좌측 아이콘 트레이로 축소하고, 라이트/다크 테마를 시간 기반이 아닌 수동 토글 전용으로 고정하면서 인트로/셸 톤을 명확한 밝기 계층으로 재정렬
- [x] T2-047 로그인/소개 화면을 큰 빈 여백 구조에서 인포그래픽형 히어로 레이아웃으로 재작성하고 브라우저/설치본 캐시 기준까지 재검증
- [x] T2-021 프론트 헌법 리팩터링 2차: 단일 대시보드 토글 구조를 폐기하고 `React Router + route-based admin pages + shadcn/Tailwind + 공통 admin shell` 구조로 전환
- [x] T2-031 `Boards`, `Permissions`, `QA Config`, `Polls`, `Popups` 도메인을 `LegacyDomainBridge` 없이 route-native 페이지로 전환
- [x] T2-050 프론트 구조 리팩터링 3차: `api/client` 모듈 분할, `AppShell`/`DebugDock` 분해, `App.css` 및 구 dashboard 제거
- [x] T2-051 `ts-rs` export path를 `g5-admin/src/types` 단일 경로로 통일하고 `src-tauri/src/types` 중복 생성물을 제거
- [x] T2-048 route-native 관리자 폼 2차 정규화: `Permissions`, `QA Config`, `Boards`, `Polls`, `Popups`를 `react-hook-form + zod` 기준으로 재정렬
- [x] T2-049 프론트 번들 청크 분할: `vite manualChunks`로 `react-core / tanstack / vendor` 청크로 분리하고 대형 단일 번들 경고를 제거
