# Rust 구조 감사 보고서 — 2026-03-12

## 목적

`g5-admin` Tauri 워크스페이스를 보편적 구현 방법론 기준으로 다시 점검한다.
이번 감사는 새 기능 구현이 아니라 다음 리팩터링 착수 전에 아래 기준을 문서 SSOT로 고정하는 준비 작업이다.

- 도메인 분리
- 비즈니스 로직 / 화면 로직 경계
- 하나의 책임 원칙(SRP)
- god file 금지
- 의존성 주입 및 강결합 완화
- 하드코딩 억제
- AI 친화적, 반복 감사 가능한 구조
- 워크스페이스 / crate 분리
- TDD / SDD / 문서-코드 정합성

## 범위

- 코드: `g5-admin/src`, `g5-admin/src-tauri/src`, `rust/scripts`
- 문서: `specs`, `.agent/workflows`
- 제외: `node_modules`, `target`, `dist`, `coverage*`
- 현재 단계별 실행 범위: `rust/g5-admin` 프론트 + `rust/g5-admin/src-tauri` 백엔드만
- 이번 remediation 실행선에서 제외: `g5-api`, PHP 교차 감사, 배포/빌드 변경

## 측정 요약

| 항목 | 값 | 메모 |
|------|----|------|
| Rust 워크스페이스 총 LOC | 143,249 | 코드 + 문서 + 생성물 + 설정 |
| 순수 작업 코드 LOC | 75,566 | `g5-admin/src`, `src-tauri/src`, `scripts` 기준 |
| 문서·스펙 LOC | 37,212 | `specs`, `docs`, 계약 snapshot 포함 |
| 생성물 LOC | 21,279 | generated client, Tauri schema |
| 설정·락파일 LOC | 8,783 | `Cargo.lock`, `bun.lock`, 설정 파일 |
| Workspace member 수 | 2 | `g5-api`, `g5-admin/src-tauri` |
| 실제 구현 crate | 1 | `g5-admin/src-tauri`가 대부분 담당 |
| route page가 있는 feature dir | 35 | `src/features/*Page.tsx` 기준 |
| admin / multisite SDD 문서 | 10 | `ADMIN_*_SDD`, `MULTI_SITE_*` 기준 |
| 300줄 초과 page 파일 | 0 | Phase 2에서 `AdminConfigPage`/`SiteDashboardPage`/`AdminMailsPage`/`AdminFaqsPage`/`AdminSmsTemplatesPage`/`AdminBoardGroupsPage`/`AdminPointsPage`/`AdminLayoutsPage`/`AdminMembersPage`/`AdminSmsContactsPage`/`AdminSmsHistoryPage`/`AdminSmsConfigPage`/`AdminContentsPage`/`SecuritySettingsPage`/`AdminReportsPage`/`AdminPopularPage`/`AdminBrowscapPage`를 thin entry + workspace 구조로 정리 |
| 300줄 초과 command 파일 | 0 | Phase 2 완료, `member`/`site`/`board_group`/`sms_contact`/`sms_template`/`faq`/`point`/`layout`/`popup`/`poll`/`mail`/`board`/`auth` command 분해 반영 |
| route-native form save smoke warning | 0 | `check_form_save_smoke_coverage.py` baseline; `page_save_features=18`, `save_ready_features=18`, `unsupported_404_features=17` |
| `invoke_handler` 등록 command | 217 | `src-tauri/src/commands/registry.rs` |
| command-context metadata entry 수 | 212 | `command-context-builders/*` registry |
| commands 내부 `/admin/*` 문자열 | 183 | command 파일 전반에 분산 |
| navigation route const 수 | 50 | `navigation.ts` |
| navigation `legacySource` 수 | 49 | `navigation.ts` |
| navigation `apiTargets` 수 | 43 | `navigation.ts` |

## 종합 판정

판정은 `🟠 구조 안정화 우선`이다.

- 아키텍처가 무너진 상태는 아니다.
- 그러나 새 도메인을 계속 얹기 전에 registry 중복, page/command 비대화, AppState 중심 결합, SDD 커버리지 부족을 먼저 정리해야 한다.
- 지금 손보면 리팩터링 비용이 통제 가능하지만, 이 상태로 도메인 수를 더 늘리면 `문서 드리프트 + AI 출력 품질 저하 + 회귀 범위 확대`가 같이 온다.

## 후속 상태 (2026-03-15)

- `specs/audits/DOMAIN_BOUNDARY_RULES.toml`와 `scripts/domain_boundary_watch.py`를 추가해 일부 domain feature(`mails`, `sms-contacts`, `points`, `security`, `sites`)의 direct cross-feature import, support namespace drift, `app_state/*service.rs` wrapper coupling을 구조 감사가 직접 판정하도록 승격했다.
- frontend monitored scope는 baseline에서 녹색이며, backend `AppState` wrapper coupling 4건은 `WB-2026-011`~`014` warning budget으로 관리한다.
- 따라서 현재 구조 감사는 “큰 파일/registry”뿐 아니라 “도메인 경계 위반 자체”를 일부 범위에서 자동 강제하는 단계로 올라왔다.

## 확인된 장점

- React에서 직접 `fetch`/`axios`를 호출하는 패턴은 확인되지 않았다.
- Rust command는 공통 `api_client`를 경유한다.
- command 모듈은 도메인별 파일 단위로 어느 정도 정리돼 있다.
- 테스트는 이미 일정 수준 존재해 분리 작업을 위한 안전망이 전혀 없는 상태는 아니다.

## 주요 지적 사항

### P1. Workspace / crate 분리가 아직 명목상이다

- root workspace member는 `g5-api`, `g5-admin/src-tauri` 두 개뿐이다.
- `g5-api`는 현재 사실상 placeholder 수준이고, 실제 구현은 `g5-admin/src-tauri` 단일 crate에 집중돼 있다.
- `AppState`가 `ApiClient`, `TokenStore`, `SiteRepository`, `SiteManager`, `RuntimeConfig`를 직접 조립한다.
- 결과적으로 `app-core`, `infra`, `command adapter`, `models`가 crate 수준에서 분리되지 못하고 한 crate 안에 공존한다.

영향:

- 도메인 단위 빌드 / 테스트 / 소유권 분리가 안 된다.
- 보안/로컬 저장소/원격 API/도메인 명령이 같은 변경 단위로 엮인다.
- AI가 “어디를 수정해야 하는가”를 좁히기 어렵다.

근거 파일:

- `Cargo.toml`
- `g5-admin/src-tauri/Cargo.toml`
- `g5-admin/src-tauri/src/app_state/mod.rs`

### P1. 수기 registry가 너무 많아 단일 진실원본이 약하다

- 라우트 정보는 `navigation.ts`와 `router.tsx`에 분산돼 있다.
- command 진단 문맥은 `command-context-registry.ts`의 대형 수기 registry로 따로 유지된다.
- IPC 등록은 `src-tauri/src/commands/registry.rs`에서 다시 나열된다.
- command 파일 안에는 `/admin/*` 경로 문자열이 183건 흩어져 있다.

이 구조는 “한 곳만 수정하면 끝”이 아니라 아래를 동시에 수정하게 만든다.

- route constant
- navigation metadata
- route element binding
- command context label
- command handler registration
- endpoint 문자열

영향:

- 하드코딩 자체보다 “중복 하드코딩”이 커졌다.
- 문서와 코드뿐 아니라 코드 안의 registry끼리도 drift가 생긴다.
- AI가 새 도메인을 추가할 때 누락 지점이 늘어난다.

근거 파일:

- `g5-admin/src/features/layout/navigation.ts`
- `g5-admin/src/app/router.tsx`
- `g5-admin/src/api/client/core/command-context-registry.ts`
- `g5-admin/src-tauri/src/commands/registry.rs`

### P1. page/command 분할 기준이 헌법과 어긋난다

헌법 SSOT는 route-native 페이지를 `page + hook + workspace`로 나누고 300줄 기준을 넘기지 말라고 적고 있다.
현재 확인된 초과 파일은 아래와 같다.

- page 파일 0개 초과
- command 파일 0개 초과
- root orchestrator 파일 `db/mod.rs 111`, `app_state/mod.rs 186`, `api_client/mod.rs 119`
- 후속 backend dense/test/adapter 파일 `commands/menu/mutations.rs 205`, `commands/sms_history/queries.rs 173`, `commands/permission/auth.rs 159`, `commands/security/fast_unlock.rs 156`, `commands/sms_contact/shared/normalize.rs 149`, `db/sites/catalog.rs 134`, `commands/site/shared/health_check/mod.rs 122`
- 후속 frontend dense section/manifest 파일 `navigation-manifest.ts 779 (intentional data manifest)`, `AdminConfigSections.tsx 292`, `FaqMasterSection.tsx 285`, `admin-config-field-controls.tsx 272`, `AdminSmsContactsListSection.tsx 225`
- workspace 파일 0개 초과
- 후속 focus: 대형 `models/*`, 일부 `api_client/*`, 레이아웃/섹션 파일, 바인딩 export 테스트 registry
- 분해 규칙 보정: `wrapper-only` 파일 추가는 금지하고, `sections / hook / helper`로 독립 책임이 생길 때만 분해한다.

대표 page 초과 파일:

- 현재 `src/features/*Page.tsx` route page 중 300줄 초과 파일은 없다.

대표 command 초과 파일:

- 현재 `src-tauri/src/commands/*.rs` top-level command 중 300줄 초과 파일은 없다.

영향:

- 하나의 파일이 query, mutation, form normalization, view composition, dialog orchestration, route mode 분기를 같이 품는다.
- command 파일은 transport, payload normalization, legacy alias, business rule, error mapping이 한곳에 몰린다.
- 테스트가 있어도 수정 영향 범위를 좁히기 어렵다.

보정 상황 (`2026-03-12` 2차):

- `AdminReportsWorkspace`, `AdminPopularWorkspace`, `AdminBrowscapWorkspace`는 카드/패널 렌더링을 `Sections` 파일로 옮겨 각각 `210 / 181 / 157 LOC`로 축소했다.
- `SecuritySettingsWorkspace`는 상태/핸들러 orchestration을 `use-security-settings-workspace.ts`로 옮겨 `229 LOC`로 축소했다.
- `AdminContentsWorkspace`, `AdminSmsContactsWorkspace`, `AdminSmsTemplatesWorkspace`, `AdminFaqsWorkspace`는 `sections + hook/model` 구조로 전환해 각각 `103 / 187 / 136 / 123 LOC`로 축소했다.
- `AdminMailsWorkspace`, `AdminMembersWorkspace`, `AdminBoardGroupsWorkspace`, `AdminLayoutsWorkspace`는 orchestration을 전용 hook으로 옮겨 각각 `134 / 94 / 110 / 155 LOC`로 축소했고, `BoardWorkspace`는 `BoardWorkspaceSections.tsx`로 생성/편집/운영 카드를 분리해 `103 LOC`로 줄였다.
- `error.rs`는 `error/mod.rs`, `error/classification.rs`, `error/payload.rs`로 나눠 코어 공통 에러 계약은 유지하면서 fallback 분류 책임을 모듈로 격리했다.
- `api_client.rs`는 `api_client/{mod,request,problem}.rs`로, `db/mod.rs`는 `db/{connection,master_key,secret_store,portable_backup,backup}.rs`로, `app_state/mod.rs`의 inline tests는 `app_state/tests.rs`로 옮겨 root orchestrator 기준의 과대 파일을 해소했다.
- `token_store.rs`는 `token_store/{mod,backend}.rs`로, `runtime_config.rs`는 `runtime_config/{mod,resolve,tests}.rs`로 분리해 local infra root 파일도 300줄 기준 아래로 내렸다.
- `api_client/request.rs`는 `request + request_io + request_headers`로, `app_state/master_lock.rs`는 `master_lock/{status,unlock,lockout,totp}.rs`로 분리해 남아 있던 backend transport/state 집중 파일도 해소했다.
- `models/board.rs`는 `board/{mod,contract,payload,serde_impl}.rs`로 재편해 계약 타입, payload builder, scalar parity deserializer를 분리했고 public 경로는 그대로 유지했다.
- `models/tests.rs`는 `models/tests/{mod,core,board_content,members_access,messaging,operations,system}.rs`로, `app_state/tests.rs`는 `app_state/tests/{mod,support,sites,master_lock,security}.rs`로 재구성해 giant export/test registry와 state scenario 묶음을 도메인/시나리오 ownership 기준으로 분리했다.
- `models/sms_template.rs`는 `sms_template/{mod,groups,templates}.rs`로, `models/faq.rs`는 `faq/{mod,masters,images,faqs}.rs`로 재구성해 command/api_client와 같은 경계에서 계약 타입과 payload builder를 정렬했다.
- `models/mail.rs`는 `mail/{mod,templates,recipients,send}.rs`로, `models/member.rs`는 `member/{mod,list,detail,profile}.rs`로 재구성해 dense model 경계를 endpoint 계약 축과 맞췄고, `Pagination`만 member root에 남겼다.
- `api_client/member.rs`는 `member/{mod,profile,admin,media}.rs`로 재구성해 profile 조회, 관리자 CRUD, 미디어 upload-delete 흐름을 endpoint 축으로 분리했고, `db/tests.rs`는 `tests/{mod,support,master_key,sites_security,backup}.rs`로 바꿔 keyring/env harness와 테스트 시나리오를 분리했다.
- `models/point.rs`는 `point/{mod,queries,actions}.rs`로 재구성해 목록/요약 계약과 액션·삭제·만료 payload를 분리했고, `commands/site/shared.rs`는 `shared/{mod,catalog,health_check}.rs`로 바꿔 local-site-db helper와 health-check probe를 서로 다른 ownership으로 나눴다.
- `commands/permission.rs`는 `permission/{auth,permissions}.rs`로 재편해 권한 CRUD와 `admin/auth` upsert/delete를 분리했고, `commands/security.rs`는 `security/{settings,fast_unlock,totp,shared}.rs`로 바꿔 로컬 보안 설정, 빠른 잠금 해제, TOTP, 공통 에러 매핑을 서로 다른 ownership으로 분리했다.
- `commands/sms_contact/shared.rs`는 `shared/{normalize,responses}.rs` 소비 구조로 정리해 입력 정규화와 응답 조립 helper를 별도 모듈로 격리했고, `commands/registry.rs`는 실제 command 정의 경로 기준으로 handler path를 다시 맞췄다.
- `commands/menu.rs`는 `menu/{queries,mutations}.rs`로, `commands/sms_history.rs`는 `sms_history/{queries,actions}.rs`로 재편해 조회와 변경/재전송 액션을 분리했고, registry도 실제 module path 기준으로 조정했다.
- `db/sites.rs`는 `sites/{mod,catalog,activity,runtime_state}.rs`로 재편해 사이트 CRUD, activity 로그, session hint 저장을 분리했고, `commands/site/shared/health_check.rs`는 `health_check/{mod,probe,tests}.rs`로 바꿔 health-check policy entry, probe retry loop, 테스트 harness를 분리했다.
- `AdminSmsContactsSections.tsx`는 `AdminSmsContactGroupsSection.tsx`, `AdminSmsContactsSection.tsx`, `AdminSmsContactImportExportCard.tsx`로 나눠 그룹 CRUD, 연락처 목록·편집, 파일 import/export preview ownership을 직접 분리했고, workspace는 새 파일들을 직접 소비하도록 정리했다.
- 후속으로 `AdminSmsContactsSection.tsx`는 `AdminSmsContactsListSection.tsx`, `AdminSmsContactEditorSection.tsx`로 다시 나눠 검색·일괄 처리·페이징 목록과 개별 연락처 편집 폼 ownership을 분리했고, SMS 연락처 화면에서도 300줄 초과 섹션 파일을 제거했다.
- `AdminConfigSections.tsx`는 `AdminConfigDiagnosticsCard.tsx`, `admin-config-field-controls.tsx`, `admin-config-schema-label.ts`로 진단 카드/입력 control/helper를 분리해 `292 LOC` 편집 레이아웃 파일로 축소했고, `react-refresh` lint 경고도 함께 제거했다.
- `AdminSmsTemplatesSections.tsx`는 `SmsTemplateGroupsSection.tsx`, `SmsTemplateListSection.tsx`, `SmsTemplateEditorSection.tsx`로 재편해 그룹 CRUD·이동/비우기, 템플릿 검색·일괄 처리, 편집 폼 ownership을 분리했고 기존 monolith 파일을 제거했다.
- `AdminFaqsSections.tsx`는 `FaqMasterSection.tsx`, `FaqItemsSection.tsx`, `FaqDialogs.tsx`로 재편해 FAQ 마스터·이미지, 문항 목록/편집, 삭제 dialog ownership을 분리했고 기존 monolith 파일을 제거했다.
- `navigation.ts`는 `navigation-types.ts`, `navigation-routes.ts`, `navigation-manifest.ts`, `navigation-helpers.ts`를 re-export하는 `4 LOC` 공개 barrel로 바뀌었고, route 상수/manifest/helper 혼합 파일을 해소했다. 대형 `navigation-manifest.ts`는 동일 사실을 한곳에 보관하는 의도된 data manifest로 남긴다.
- `check_form_save_smoke_coverage.py`와 `FORM_SAVE_SMOKE_COVERAGE.toml`를 추가해 route-native 저장 폼 18개의 `page save / validation / unsupported 404` baseline을 상설 경고로 표면화했고, `FORM_SAVE_SMOKE_ROLLOUT_PLAN.md`로 `T2-101` 우선순위를 고정했다.
- 후속으로 `SecuritySettingsPage.test.tsx`에 idle-timeout step-up save smoke, `AdminConfigPage.test.tsx`에 diff-only save + validation + 404 smoke, `AdminSmsConfigPage.test.tsx`에 회신번호 diff-only save smoke, `AdminPointsPage.test.tsx`에 포인트 지급 + 404 smoke, `AdminMailsPage.test.tsx`에 템플릿 생성 save smoke, `AdminThemePage.test.tsx`에 `PC 적용` quick action save smoke, `AdminLayoutsPage.test.tsx`에 선택 레이아웃 save smoke, `AdminSmsMessagesPage.test.tsx`에 문자 발송 save smoke, `AdminSmsContactsPage.test.tsx`에 연락처 생성 save smoke, `AdminSmsTemplatesPage.test.tsx`에 템플릿 생성 save smoke, `AdminMembersPage.test.tsx`에 profile save smoke, `AdminMenusPage.test.tsx`에 메뉴 생성 save smoke, `AdminFaqsPage.test.tsx`에 FAQ 마스터 생성 save smoke, `AdminContentsPage.test.tsx`에 내용 생성 save smoke, `AdminBoardsPage.test.tsx`에 게시판 생성 save smoke, `AdminBoardGroupsPage.test.tsx`에 그룹 생성 save smoke, `AdminPollsPage.test.tsx`에 투표 생성 save smoke, `AdminPopupsPage.test.tsx`에 팝업 생성 save smoke를 추가해 route-native 저장 surface 18개 전부를 representative `save_ready` feature로 올렸고, 현재 baseline은 `warnings=0`, `page_save_features=18`, `save_ready_features=18`이다.
- 이 배치부터는 `route entry`를 더 얇게 만드는 방식이 아니라, 실제 orchestration 파일에서 독립 렌더링 책임을 걷어내는 방식만 허용한다.

### P1. SDD / 문서 커버리지가 구현 속도를 못 따라가고 있다

- page가 있는 feature dir는 35개다.
- 그러나 현재 admin / multisite SDD 문서는 10개 수준이다.
- 즉 실제 사용자 표면 대비 설계 문서 coverage가 낮다.
- `specs/README.md`는 헌법 버전을 아직 `v1.5.0`으로 적고 있었고, `.agent/workflows/integrated-three-way-audit.md`는 아직 Flutter 3자 routine 감사를 전제로 두고 있었다.

영향:

- “문서가 맞는가, 코드가 맞는가”를 한 번 더 손으로 판단해야 한다.
- AI가 참고할 canonical 문서가 부족한 도메인은 기존 구현을 역추적해 답을 추론하게 된다.
- 헌법과 실코드 사이의 기준 위반을 자동으로 감지하기 어렵다.

### P2. 의존성 주입보다는 concrete singleton 조립에 가깝다

- `AppState::from_env()`가 런타임 config, token store, api client, repository, site manager를 직접 생성한다.
- command는 대부분 `State<'_, AppState>`를 받아 concrete `AppState` clone을 직접 사용한다.
- frontend page도 `getAdminConfig`, `updateAdminConfig` 같은 concrete client 함수를 직접 import하는 패턴이 기본이다.

현재 구조는 “전혀 DI가 없다”는 수준은 아니지만, 포트 / 어댑터 / service seam 기준으로 보면 약하다.

보정 상황 (`2026-03-12`):

- `AppStateDependencies -> AppState::from_dependencies` 1차 seam은 추가했다.
- 다만 command 계층은 여전히 `State<'_, AppState>` concrete 타입을 직접 받으며, `ApiClient`/`TokenStore`/`SiteRepository` 포트 분리는 아직 시작 전이다.

영향:

- 인프라 교체나 테스트 더블 주입이 구조적으로 쉽지 않다.
- 로컬 앱 보안 기능과 원격 관리자 도메인 기능이 같은 composition root에 묶인다.
- 향후 crate 분리를 시작하려면 먼저 interface boundary를 세워야 한다.

근거 파일:

- `g5-admin/src-tauri/src/app_state/mod.rs`
- `g5-admin/src-tauri/src/commands/common.rs`
- `g5-admin/src/features/config/AdminConfigPage.tsx`

### P2. 도메인 경계는 있지만 local flow 쪽 결합이 남아 있다

cross-feature import를 단순 집계하면 `auth`, `sites`, `master`, `security` 사이에 직접 연결이 반복된다.
이 연결은 제품 특성상 일부 필연적이지만, 현재는 로컬 앱 도메인과 원격 관리자 도메인을 분리하는 명시적 상위 계층 모델이 약하다.

관측된 대표 pair:

- `auth -> sites`
- `overview -> sites`
- `onboarding -> sites`
- `security <-> master`
- `sites <-> master`

영향:

- 앱 진입 플로우 수정이 여러 feature 폴더 동시 수정으로 이어진다.
- local app domain과 remote admin domain을 별도 ownership으로 나누기 어렵다.

### P2. 하드코딩 금지 원칙은 “문자열 zero”보다 “권위 registry 1곳”으로 재정의해야 한다

현재는 아래 값들이 여러 위치에 중복 하드코딩돼 있다.

- route constant 50개
- `legacySource` 49개
- `apiTargets` 43개
- command context case 212개
- `/admin/*` path string 183개

모든 문자열을 없애는 것은 현실적이지 않다.
문제는 하드코딩 문자열의 수보다 “같은 사실이 여러 파일에 다시 적힌다”는 점이다.

개선 기준:

- 계약 문자열은 generated artifact 또는 single manifest에서만 관리
- 진단용 라벨은 manifest에서 파생
- UI 라우터와 nav metadata도 같은 원본에서 파생

## 문서-코드 정합성 판정

이번 감사에서 확인된 문서 drift는 아래와 같다.

- `specs/README.md`의 헌법 버전 표기가 실제와 달랐다.
- `integrated-three-way-audit.md`가 여전히 Flutter routine 감사를 기본값으로 전제했다.
- 헌법의 300줄 page 분할 기준과 실제 page size가 어긋났다.
- “구조 감사”를 반복 실행할 공식 workflow 문서가 없었다.

따라서 이번 작업에서 구조 감사 보고서뿐 아니라 workflow와 SSOT 문서도 같이 갱신한다.

## 단계별 개선 방향

### Phase 0. 기준선 고정

- 구조 감사 보고서를 canonical audit로 남긴다.
- `README`, `TODO`, `HISTORY`, workflow 문서를 현재 상태와 맞춘다.
- 앞으로 구조 리팩터링 착수 전 이 감사 보고서를 기준선으로 본다.

### Phase 1. Registry 단일화

우선순위:

- `navigation.ts`
- `router.tsx`
- `command-context-registry.ts`
- `src-tauri/src/commands/registry.rs`

목표:

- route / nav / diagnostic / IPC registration이 single manifest 또는 generated registry에서 파생되게 한다.
- 새 도메인 추가 시 수정 파일 수를 최소화한다.

진행 현황 (`2026-03-12`):

- 완료: `adminRouteRegistry.tsx` 도입으로 `router.tsx`의 canonical route/legacy alias redirect를 `navigation.ts` metadata에서 파생하도록 정리
- 완료: `command-context-registry.ts` 도입으로 `command-context.ts`의 212개 diagnostic metadata를 giant switch 대신 export registry로 이동
- 완료: giant `command-context-registry.ts 1421`를 `command-context-builders/{local,content-faq-system,mail-menu-theme,members-boards,operations,sms-debug,shared}.ts`로 분해해 root registry를 `26 LOC` 합성 파일로 축소
- 완료: `api-target-registry.ts` 도입으로 `api-targets.ts`의 212개 API/local target을 giant switch 대신 export registry로 이동
- 완료: `src-tauri/src/commands/registry.rs` 도입으로 `src-tauri/src/lib.rs`의 217개 IPC 등록을 `app_invoke_handler!` 매크로로 분리
- 판정: Phase 1의 1차 범위(`router`, `command-context`, `api-targets`, `lib.rs`)는 완료. 다음 우선순위는 Phase 2의 oversized page/command 분리와 Phase 3의 `AppState` 경계 정리다.

### Phase 2. Frontend page 분리 기준 회복

우선순위:

- 300줄 초과 page 0개
- layout / overview / site dashboard / config / mails / sms 계열 대형 페이지

목표:

- `page + hook + workspace + sections` 규칙을 다시 강제한다.
- query orchestration, form normalization, view composition을 분리한다.

진행 현황 (`2026-03-12`):

- 완료: `AdminConfigPage`를 `AdminConfigSections.tsx` + `admin-config-page-meta.ts`로 분리해 `279 LOC`로 축소
- 완료: `member` command를 `queries / mutations / media / shared`로 분리해 oversized command 1건 해소
- 완료: `SiteDashboardPage`를 `SiteDashboardSections.tsx` + `SiteDashboardDialogs.tsx` + `site-dashboard-helpers.ts`로 분리해 `288 LOC` orchestration page로 축소
- 완료: `site` command를 `catalog / health / mutations / shared`로 분리해 oversized command 1건 해소
- 완료: `AdminMailsPage`를 route entry + `AdminMailsWorkspace.tsx` + section/helper/test 구조로 분리해 oversized route-native page 1건 해소
- 완료: `board_group` command를 `queries / mutations / legacy / shared`로 분리해 oversized command 1건 해소
- 완료: `AdminFaqsPage`를 route entry + `AdminFaqsWorkspace.tsx` + section/helper/test 구조로 분리해 oversized route-native page 1건 해소
- 완료: `sms_contact` command를 `groups / contacts / files / shared`로 분리해 oversized command 1건 해소
- 완료: `AdminSmsTemplatesPage`를 route entry + `AdminSmsTemplatesWorkspace.tsx` + section/helper/test 구조로 분리해 oversized route-native page 1건 해소
- 완료: `sms_template` command를 `groups / templates / shared`로 분리해 oversized command 1건 해소
- 완료: `AdminBoardGroupsPage`를 route entry + `AdminBoardGroupsWorkspace.tsx` + section/helper 구조로 분리해 oversized route-native page 1건 해소
- 완료: `faq` command를 `masters / faqs / media / shared`로 분리해 oversized command 1건 해소
- 완료: `AdminPointsPage`를 route entry + `AdminPointsWorkspace.tsx` + section/helper/test 구조로 분리해 oversized route-native page 1건 해소
- 완료: `point` command를 `queries / actions / legacy / shared`로 분리해 oversized command 1건 해소
- 완료: `AdminLayoutsPage`를 route entry + `AdminLayoutsWorkspace.tsx` + section/helper/test 구조로 분리해 oversized route-native page 1건 해소
- 완료: `layout` command를 `queries / mutations / legacy / shared`로 분리해 oversized command 1건 해소
- 완료: `AdminMembersPage`를 route entry + `AdminMembersWorkspace.tsx` + section/helper 구조로 분리해 oversized route-native page 1건 해소
- 완료: `popup` command를 `queries / mutations / legacy / shared`로 분리해 oversized command 1건 해소
- 완료: `poll` command를 `queries / mutations / legacy / shared`로 분리해 oversized command 1건 해소
- 완료: `AdminSmsContactsPage`를 route entry + `AdminSmsContactsWorkspace.tsx` + helper 구조로 분리해 oversized route-native page 1건 해소
- 완료: `mail` command를 `queries / mutations / shared`로 분리해 oversized command 1건 해소
- 완료: `AdminSmsHistoryPage`를 route entry + `AdminSmsHistoryWorkspace.tsx` + sections/helper/test 구조로 분리해 oversized route-native page 1건 해소
- 완료: `board` command를 `queries / mutations / shared`로 분리해 oversized command 1건 해소
- 완료: `AdminSmsConfigPage`를 route entry + `AdminSmsConfigWorkspace.tsx` + sections/helper/test 구조로 분리해 oversized route-native page 1건 해소
- 완료: `auth` command를 `session / health / shared`로 분리해 마지막 oversized command 1건을 해소
- 완료: `AdminContentsPage`, `SecuritySettingsPage`, `AdminReportsPage`, `AdminPopularPage`, `AdminBrowscapPage`를 thin entry + workspace 구조로 옮겨 route-native oversized page 5건을 정리
- 잔여: page 0개, command 0개
- 후속: Phase 3 `app-core` 분리와 대형 `models/*`, 일부 `api_client/*`, 레이아웃/섹션 파일, 그리고 바인딩 export/test registry 같은 남은 집중 지점

### Phase 3. Backend app-core 경계 세우기

우선순위:

- 대형 `models/*`
- 일부 `api_client/*`
- 레이아웃/섹션 파일
- 바인딩 export/test registry
- crate split 전용 DI/port 문서화

목표:

- `app-core`, `infra`, `command adapter`, `diagnostics`, `models` 경계를 먼저 module 수준에서 분리한다.
- 그 다음에만 crate split을 시작한다.

진행 현황 (`2026-03-12` 2차):

- 완료: `api_client.rs`를 `api_client/{mod,request,problem}.rs`로 분리해 root transport entry를 `119 LOC`로 축소
- 완료: `app_state/mod.rs`의 대형 inline tests를 `app_state/tests.rs`로 이동해 state 조립 파일을 `186 LOC`로 축소
- 완료: `db/mod.rs`를 `db/{connection,master_key,secret_store,portable_backup,backup}.rs` 조합으로 재정리해 root 저장소 조립 파일을 `111 LOC`로 축소
- 완료: `token_store.rs`를 `token_store/{mod,backend}.rs`, `runtime_config.rs`를 `runtime_config/{mod,resolve,tests}.rs`로 분리해 local infra root도 각각 `181`, `166 LOC`로 축소
- 완료: `api_client/request.rs`를 `213 LOC`로, `app_state/master_lock` 계열을 `96/107/68/86 LOC` 하위 모듈로 분리해 남은 backend transport/state 집중 파일도 해소
- 완료: giant `command-context-registry.ts`를 도메인별 builder map으로 분해해 root registry를 `26 LOC`로 축소하고, 프론트 diagnostic metadata 212건을 builder ownership 단위로 나눴다
- 완료: `api_client/board_group.rs`를 `board_group/{groups,members,legacy}.rs`, `api_client/sms_contact.rs`를 `sms_contact/{groups,contacts,files}.rs`로 나눠 client 계층도 command와 같은 책임 축으로 정렬했다
- 완료: `models/sms_contact.rs`를 `sms_contact/{groups,contacts,files}.rs`, `app_state/security.rs`를 `security/{settings,backup,totp,fast_unlock}.rs`, `models/mod.rs`를 `tests.rs` include 구조, `command-context-builders/operations.ts`를 `operations/{report-push,access,points,engagement}.ts`로 재구성해 남은 model/state/builder 집중 파일 4건도 해소했다
- 완료: `api_client/faq.rs`를 `faq/{masters,media,faqs}.rs`, `api_client/sms_template.rs`를 `sms_template/{groups,templates}.rs`로 분리해 client 계층의 남은 대형 도메인 파일 2건도 command 경계와 같은 책임 축으로 정렬했다
- 완료: `MemberDetailCard.tsx`를 `MemberDetailSections.tsx`, `MemberDetailMediaSection.tsx`, `MemberDetailProfileSection.tsx`, `MemberDetailControls.tsx` 조합의 소비자로 바꿔 메인 파일을 `234 LOC`, 섹션 파일을 `181 LOC`로 축소하고, 회원 상세 작업면의 표시/폼/업로드 책임을 파일 단위 ownership으로 분리했다
- 완료: `AppShell.tsx`의 캡처/컨텍스트 메뉴 사이드이펙트를 `useAppShellCapture.tsx`, `useAppShellContextMenu.ts`, `app-shell-context-menu-actions.ts`로 옮겨 셸 본체를 `168 LOC`로 줄였고, 라우트 변경 시 메뉴 닫힘은 `routeKey` ownership으로 처리해 `setState-in-effect`를 제거했다
- 완료: `SecuritySettingsSections.tsx`를 `SecuritySettingsCoreCards.tsx`, `SecuritySettingsTotpCards.tsx`, `SecuritySettingsDialogs.tsx`, `SecuritySettingsFields.tsx` 조합으로 재분해해 보안 카드/OTP/다이얼로그 책임을 분리했고, 가장 큰 보안 카드 파일도 `243 LOC`까지 낮췄다
- 완료: `AdminMailsSections.tsx`를 `AdminMailTemplateSections.tsx`, `AdminMailRecipientsSection.tsx`, `AdminMailSendSection.tsx`, `admin-mails-section-shared.tsx` 구조로 재편해 템플릿 목록/편집, 수신자 미리보기, 발송/삭제 책임을 나누고 가장 큰 메일 섹션 파일을 `276 LOC`까지 낮췄다
- 완료: `models/config.rs`를 `config/{mod,contract,payload,serde_impl,tests}.rs` 구조로 재편해 admin config 계약 타입, scalar parity deserializer, update payload builder, 전용 테스트를 분리했고 `models/config.rs 379` 단일 집중 파일도 해소했다
- 완료: `models/board.rs`를 `board/{mod,contract,payload,serde_impl}.rs`로 나눠 `board/mod 118`, `contract 120`, `payload 146`, `serde_impl 32 LOC` 구조로 낮추고 계약/페이로드/파서 경계를 세웠다
- 완료: `models/tests.rs`를 `models/tests/{mod,core,board_content,members_access,messaging,operations,system}.rs`로 재편해 giant TS binding export registry를 도메인 helper로 나눴고, 가장 큰 helper는 `141 LOC`로 줄였다
- 완료: `app_state/tests.rs`를 `app_state/tests/{mod,support,sites,master_lock,security}.rs`로 재편해 temp/session/state harness와 시나리오를 분리했고, 가장 큰 시나리오 모듈도 `247 LOC`로 낮췄다
- 완료: `models/sms_template.rs`를 `sms_template/{mod,groups,templates}.rs`로 나눠 그룹/템플릿 계약을 분리했고, 각 하위 파일을 `177 / 195 LOC` 수준으로 유지했다
- 완료: `models/faq.rs`를 `faq/{mod,masters,images,faqs}.rs`로 나눠 FAQ 마스터/이미지/문항 경계를 분리했고, 가장 큰 하위 파일도 `184 LOC`로 낮췄다
- 완료: `models/mail.rs`를 `mail/{mod,templates,recipients,send}.rs`로 나눠 템플릿/수신자/발송 계약을 분리했고, 각 하위 파일을 `157 / 72 / 99 LOC` 수준으로 유지했다
- 완료: `models/member.rs`를 `member/{mod,list,detail,profile}.rs`로 나눠 목록/상세 수정·미디어/프로필 경계를 세웠고, 공용 `Pagination`만 root에 남겨 가장 큰 하위 파일도 `190 LOC`로 낮췄다
- 완료: `api_client/member.rs`를 `member/{mod,profile,admin,media}.rs`로 나눠 프로필 조회/관리자 CRUD/회원 미디어 흐름을 분리했고, 가장 큰 하위 파일도 `151 LOC`로 낮췄다
- 완료: `db/tests.rs`를 `tests/{mod,support,master_key,sites_security,backup}.rs`로 재편해 keyring/env harness와 backup/import 시나리오를 분리했고, 가장 큰 테스트 모듈도 `204 LOC`로 낮췄다
- 완료: `models/point.rs`를 `point/{mod,queries,actions}.rs`로 나눠 포인트 조회/요약 계약과 액션/삭제/만료 payload를 분리했고, 가장 큰 하위 파일도 `179 LOC`로 낮췄다
- 완료: `commands/site/shared.rs`를 `shared/{mod,catalog,health_check}.rs`로 재구성해 local-site-db helper와 health-check probe를 분리했고, health-check 하위 모듈도 `279 LOC`로 낮췄다
- 완료: 기존 oversized root orchestrator 5건과 backend 집중 파일 2건(`api_client/request.rs`, `app_state/master_lock.rs`)은 모두 해소
- 잔여: fresh scan 기준 프론트 mixed hotspot은 해소됐고, 큰 파일은 `navigation-manifest.ts 779` 같은 의도된 data manifest와 `AdminConfigSections.tsx 292`, `FaqMasterSection.tsx 285`, `admin-config-field-controls.tsx 272` 수준이다. 백엔드는 `commands/menu/mutations.rs 205`, `commands/sms_history/queries.rs 173`, `commands/permission/auth.rs 159`, `commands/security/fast_unlock.rs 156`, `commands/sms_contact/shared/normalize.rs 149`, `db/sites/catalog.rs 134`, `commands/site/shared/health_check/mod.rs 122` 수준으로 내려왔다

### Phase 4. Workspace / crate 분리

권장 순서:

1. `g5-admin-core`
2. `g5-admin-infra`
3. `g5-admin-command`
4. `g5-admin-models`

진행 현황 (`2026-03-13`):

- 완료: `specs/foundation/APP_CORE_BOUNDARY_PLAN.md`를 추가해 `AppStateDependencies -> AppState::from_dependencies` seam 기준의 목표 포트(`AdminApiPort`, `SessionStorePort`, `SiteCatalogStorePort`, `SecurityStorePort`, `BackupStorePort`)와 선행 service(`SiteCatalogService`, `MasterLockService`, `SecuritySettingsService`, `SessionService`), crate split 착수 순서를 문서 SSOT로 고정했다.
- 완료: `app_state/site_catalog_service.rs`를 도입해 site catalog 조회, active site 전환, site add/update/delete, `reload_sites`, `ensure_sites_loaded`, `apply_active_site`를 `SiteCatalogService`로 추출했고, `AppState`/`app_state/sites.rs`는 보안 체크와 entry wrapper 중심으로 정리했다.
- 완료: `app_state/security_settings_service.rs`를 도입해 보안 설정 조회/변경, 민감 작업 검증, 빠른 잠금 해제, 백업 export/import, TOTP enrollment/verify/disable를 `SecuritySettingsService`로 추출했고, `app_state/security/{mod,settings,fast_unlock,backup,totp}.rs`는 service entry wrapper 중심으로 정리했다.
- 완료: `app_state/master_lock_service.rs`를 도입해 앱 잠금 상태 조회, setup/lock, 비밀번호·빠른 잠금 해제 unlock, OTP unlock challenge 완료, unlock 실패 누적/lockout 계산을 `MasterLockService`로 추출했고, `app_state/master_lock/{status,unlock,totp}.rs`는 public entry wrapper 중심으로 정리했다.
- 완료: `app_state/session_service.rs`를 도입해 active-site 세션 load/save/clear와 session hint 갱신을 `SessionService`로 추출했고, `commands/common.rs`, `commands/auth/{shared,session}.rs`는 더 이상 `token_store + local-site-db`를 직접 조합하지 않고 `AppState` service entry를 경유하도록 정리했다.
- 완료: `core/ports.rs`에 `SessionStorePort`, `SiteCatalogStorePort`를 추가하고 `TokenStore`, `SiteRepository`에 구현했으며, `AppState` accessor와 `SessionService`, `SiteCatalogService`는 concrete field 대신 port 경유로 동작하도록 정리했다.
- 완료: `core/ports.rs`에 `SecurityStorePort`, `BackupStorePort`를 추가하고 `SiteRepository`에 구현했으며, `SecuritySettingsService`, `MasterLockService`, `build_totp` helper는 concrete `SiteRepository` 대신 `AppState`의 `security_store()/backup_store()` accessor 경유로 동작하도록 정리했다.
- 완료: `core/ports.rs`에 `AdminApiPort`를 추가하고 `ApiClient`에 구현했으며, `SiteCatalogService`의 base URL 적용과 `auth/session`, `member me`, `debug` 흐름은 `AppState.admin_api()` 경유로 정리했다.
- 완료: `site/security/master_lock/session` command와 shared helper는 `AppState` wrapper 메서드 대신 `site_catalog_service()`, `security_settings_service()`, `master_lock_service()`, `session_service()`를 직접 호출하도록 정리했다. 이 과정에서 `SiteCatalogService`는 site delete 민감 작업 검증과 session 정리, activity list 응답 조립까지 소유하게 됐고, 예전 `AppState` entry wrapper는 테스트 전용 호환 API로 한정됐다.
- 완료: crate split 착수 판정 결과, 첫 분리 후보는 `g5-admin-models`가 맞으며 blocker였던 `models/auth.rs -> error::ErrorGuide` 순환은 `models/problem.rs` 도입으로 제거했다. `ProblemDetails`, `ErrorGuide`, `AppErrorPayload`는 모델 계약으로 승격돼 `error`와 `api_client/problem`이 이를 소비하도록 정리됐다.
- 완료: `g5-admin-models` 분리 이후 `scripts/core_split_readiness.py`를 추가해 `SessionService / SiteCatalogService / SecuritySettingsService / MasterLockService`의 blocker를 자동 보고하게 만들었고, 첫 외부 `g5-admin-core` 경계는 `trait-only ports + SessionService`까지만 허용하도록 `APP_CORE_BOUNDARY_PLAN.md`에 고정했다.
- 다음 구현 순서: `core/ports.rs`에서 trait 정의와 concrete impl을 분리하고, `SessionService::new(&AppState)`를 포트 직접 주입 constructor로 바꾼 뒤에만 첫 `g5-admin-core` member를 추가한다. `SiteCatalogService`, `SecuritySettingsService`, `MasterLockService`는 `SiteManager/runtime flag/helper coupling`을 줄인 뒤 후속 배치로 넘긴다.

주의:

- 지금 당장 crate를 많이 쪼개는 것은 금지한다.
- 먼저 interface boundary와 module ownership이 서야 crate split이 의미가 있다.

### Phase 5. SDD / TDD / AI 감사성 회복

목표:

- route page가 있는 도메인은 최소 SDD 하나를 가진다.
- new domain / large refactor는 구조 감사 workflow를 통과해야 한다.
- page / command / registry 크기와 문서 drift를 CI 또는 routine audit에서 숫자로 보고한다.

진행 현황 (`2026-03-13`):

- 완료: `scripts/ownership_watch.py`를 추가해 `navigation-manifest.ts`, `useAdminFieldSchema.ts`, `command-context-registry.ts`, `api-target-registry.ts`, `commands/registry.rs`의 source-of-truth owner를 공통 파서로 읽고, ownership 충돌이 생기면 구조 감사가 바로 failure를 내도록 만들었다.
- 완료: 같은 helper는 `command-context builders`, `api-target-registry`, `app_invoke_handler!`의 command set 정합성과 `navigation-manifest apiTargets`의 admin path coverage를 함께 계산하며, 승인된 IPC-only command만 note로 남기고 나머지 drift는 failure로 끌어올린다.
- 완료: `scripts/check_active_crate_boundaries.py`는 giant registry-orchestrator 우선순위(`navigation-manifest.ts`, `core/ports.rs` 등)와 `core::ports` concrete impl budget을 warning으로 상설 출력하도록 확장됐고, `scripts/collect_architecture_metrics.py`도 `source_of_truth_watch`, `registry_alignment_watch`, `giant_registry_orchestrator_priority` 섹션을 추가해 같은 사실을 메트릭/CI에서 동시에 보이게 했다.
- 완료: `specs/domains/DOMAIN_COVERAGE.toml`와 `scripts/check_domain_coverage.py`를 추가해 route-native domain별 SDD 연결과 `## 최소 smoke checklist` 존재를 상설 감사 범위로 편입했다. 이후 `T2-188`에서 `menus`, `theme`, `reports`, `visits`, `system-tools`, `sms-messages`의 `*Page.test.tsx` smoke evidence를 채워 현재 17개 target domain은 모두 coverage registry + page/flow smoke evidence를 동시에 가진다.
- 완료: `specs/domains/FORM_METADATA_COVERAGE.toml`와 `scripts/check_form_metadata_coverage.py`를 추가해 route-native admin form의 `/admin/schema` 소비 수준을 `schema_live / schema_planned / schema_full / schema_labels / local_only` 기준으로 상설 보고하게 만들었다. 현재 `schema_live` 9개는 모두 통과하고, `schema_planned` 8개가 `T2-100` 잔량으로 남는다.
- 판정: 이제 구조 감사는 “큰 파일 경고”를 넘어서 ownership/source-of-truth 충돌과 registry drift를 상설 감시하는 단계까지 올라왔다. 다음 단계는 `g5-admin-core` 외부 crate 경계와 SDD/TDD coverage를 이 기준 위에 얹는 것이다.

권장 게이트:

- page 300줄 초과 warning / 상위 파일 집중 관리
- command 300줄 초과 warning
- `db/mod.rs`, `app_state/mod.rs`, `lib.rs` 같은 root orchestrator 파일 budget 별도 관리
- 새 route page 추가 시 대응 SDD 없으면 warning
- 새 `/admin/*` 문자열 추가 시 registry 위치 점검

## 이번 문서 작업으로 반영한 것

- 구조 감사 보고서 신규 작성
- `README`, `IMPLEMENTATION_ROADMAP`, `TODO`, `HISTORY` 정합성 갱신
- `codex-audit`에 구조/문서 정합성 감사 phase 추가
- structure 전용 workflow 추가
- 구 `integrated-three-way-audit` workflow를 현재 `php + rust` routine 기준으로 수정

## 비고

- 초기 기준선 작성 턴에서는 코드 수정, 빌드 산출물 변경, 리팩터링 착수를 하지 않았다.
- 이후 Phase 진행 현황은 이 문서의 진행 현황 섹션과 `specs/TODO.md`, `specs/HISTORY.md`에 누적 반영한다.
- 판단 근거는 정적 구조 분석과 문서 SSOT 비교다.
