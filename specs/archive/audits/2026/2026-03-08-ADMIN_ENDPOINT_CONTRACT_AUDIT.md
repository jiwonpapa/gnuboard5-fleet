# Admin Endpoint Contract Audit

Date: 2026-03-08
Workspace: `/Users/neojins/workspace/gnuboard5`
Scope:
- PHP route/runtime source: `php/api/routes/v1/admin.php`, `php/api/v1/Admin/**`
- Public contract: `php/api/docs/openapi.yaml`
- Rust Tauri transport: `rust/g5-admin/src-tauri/src/api_client/**`, `rust/g5-admin/src-tauri/src/commands/**`
- TS invoke wrappers and route pages: `rust/g5-admin/src/api/client/**`, `rust/g5-admin/src/app/router.tsx`, `rust/g5-admin/src/features/**`

## Method

1. `php/api/docs/openapi.yaml`에서 `/admin*` method/path를 전수 추출했다.
2. `rust/g5-admin/src-tauri/src/api_client/**`와 `rust/g5-admin/src/api/client/**`에서 실제 호출 method/path를 전수 추출했다.
3. `rust/g5-admin/src/app/router.tsx`와 각 feature hook/page에서 UI 진입점이 실제로 연결되어 있는지 확인했다.
4. 구현된 30개 operation에 대해서는 PHP service/repository와 Rust DTO/form을 직접 대조했다.
5. 정적 대조 외에 현재 구현 범위 관련 테스트를 실행했다.

## Verification Evidence

- `pnpm test` in `rust/g5-admin` -> `9` files, `25` tests, 모두 통과
- `vendor/bin/phpunit tests/Admin/Member tests/Admin/System tests/Admin/Poll tests/Admin/Popup tests/Admin/Sms tests/Config --colors=never` in `php` -> `35` tests, `126` assertions, 모두 통과
- 주의: 이번 감사는 소스/계약/테스트 기반 감사다. CLI 세션에는 명시적 관리자 인증 토큰이 전달되지 않았으므로 live admin endpoint 실호출은 포함하지 않았다.

## Executive Summary

- OpenAPI 기준 unique admin operation: `181`
- Rust 관리자 앱 exact endpoint implementation: `30`
- Literal endpoint coverage: `30 / 181 = 16.6%`
- 실제 라우트로 연결된 Rust 관리자 페이지:
  - `settings/general`
  - `settings/qa`
  - `settings/sms`
  - `members`
  - `members/:mbId`
  - `boards`
  - `permissions`
  - `operations/polls`
  - `operations/popups`
- 구현된 도메인:
  - `config`
  - `members`
  - `boards`
  - `permissions` via `/admin/system/auths`
  - `polls` via `/admin/system/polls`
  - `popups` via `/admin/system/popups`
  - `qa-config` via `/admin/system/qa-config`
  - `sms` 일부 (`config`, `member-sync`)

## Findings

### P1. OpenAPI 원본이 현재 기계 파싱 불가능하며, FAQ footer-image path block이 실제로 깨져 있다.

Owner: `PHP/OpenAPI`

Evidence:
- `php/api/docs/openapi.yaml:860`의 description은 백틱 문자열이 quote 없이 들어가 있어 표준 YAML parser가 즉시 실패한다.
- `php/api/docs/openapi.yaml:6194`와 `php/api/docs/openapi.yaml:6222`에 `DELETE /admin/faq-masters/{fm_id}/footer-image`가 중복 선언되어 있다.
- 두 번째 block은 `summary: 관리자 FAQ 삭제`, `operationId: adminDeleteFaq`, `fa_id` parameter를 같은 footer-image path 아래에 잘못 붙여 놓았다.

Impact:
- OpenAPI를 SSOT로 쓰는 자동 감사, SDK 생성, 문서 검증이 깨진다.
- 이번 감사도 표준 YAML 파서 대신 line-based fallback으로 진행해야 했다.

### P1. `GET /admin/boards`의 `gr_id` query는 문서와 Rust 타입에 존재하지만 PHP 런타임에서 실제로 동작하지 않는다.

Owner: `PHP backend` with `OpenAPI` drift

Evidence:
- `php/api/docs/openapi.yaml:3533`에 `gr_id` query가 문서화되어 있다.
- `rust/g5-admin/src-tauri/src/models/board.rs:9`와 `rust/g5-admin/src/api/client/boards.ts:15`는 `gr_id`를 실제 요청 payload에 포함한다.
- 그러나 `php/api/v1/Admin/Board/Service/AdminBoardService.php:27`와 `php/api/v1/Admin/Board/Repository/AdminBoardRepository.php:43`의 실제 list 경로는 `page`, `per_page`, `search`, `sort_by`, `sort_direction`만 소비하며 `gr_id`는 받지 않는다.

Impact:
- Rust 쪽에서 게시판 그룹 필터를 붙여도 서버가 무시한다.
- 현재 UI가 `gr_id` 입력면을 노출하지 않더라도, 타입과 transport는 “되는 기능”처럼 보이므로 이후 구현자가 오해할 수 있다.

### P1. `POST /admin/boards`의 `gr_id`는 PHP에서 필수인데 OpenAPI는 선택처럼 문서화돼 있다.

Owner: `OpenAPI`

Evidence:
- `php/api/docs/openapi.yaml:3566`의 required 배열에는 `bo_table`, `bo_subject`만 있고 `gr_id`가 없다.
- 실제 런타임은 `php/api/v1/Admin/Board/Service/AdminBoardService.php:66`에서 `gr_id` 빈값을 바로 `400`으로 거절한다.
- Rust UI는 이 런타임 규칙에 맞춰 `rust/g5-admin/src/features/boards/admin-boards-form.ts:31`과 `rust/g5-admin/src/features/boards/admin-boards-form.ts:81`에서 `gr_id`를 필수로 처리하고 있다.

Impact:
- Rust 구현은 PHP 실제와 맞지만, OpenAPI를 보고 다른 클라이언트를 만들면 실패한다.

### P2. `GET /admin/members`의 `search_field`는 OpenAPI에 있지만 PHP 런타임은 소비하지 않는다.

Owner: `PHP backend` with `OpenAPI` drift

Evidence:
- `php/api/docs/openapi.yaml:5264`에 `search_field` query가 문서화돼 있다.
- 실제 list 구현인 `php/api/v1/Admin/Member/Service/AdminMemberQueryService.php:21`은 `page`, `per_page`, `sort_by`, `sort_direction`, `search`만 읽고 `search_field`는 읽지 않는다.

Impact:
- Rust 앱은 현재 `search`만 사용하므로 실제 동작은 맞지만, 문서 기준으로 보면 backend capability가 과장되어 있다.

### P2. SMS 설정 페이지의 프런트 검증은 PHP보다 느슨해서, UI에서는 통과하지만 API에서는 실패하는 입력이 있다.

Owner: `Rust client`

Evidence:
- Rust UI는 `rust/g5-admin/src/features/system/AdminSmsConfigPage.tsx:45`에서 `cf_phone`을 `/^[0-9-]{8,20}$/`로만 확인하고, `:53`에서 `cf_icode_server_port`를 빈 문자열도 허용한다.
- PHP는 `php/api/v1/Admin/Sms/Service/AdminSmsService.php:60`에서 `cf_icode_server_port`가 비면 `400`, `:68`에서 `cf_phone`이 실제 callback pattern을 만족하지 않으면 `400`을 준다.

Impact:
- 사용자가 폼에서 “유효하다”고 본 값이 저장 시점에야 서버에서 거절될 수 있다.

### P2. SMS member-sync summary의 TS 타입은 `bigint`인데 실제 IPC/JSON 경계는 number다.

Owner: `Rust client`

Evidence:
- 생성된 타입 파일 `rust/g5-admin/src/types/AdminSmsMemberSyncSummary.ts:3`은 모든 카운터를 `bigint`로 선언한다.
- 실제 Rust source `rust/g5-admin/src-tauri/src/models/sms.rs`는 `u64`를 JSON으로 직렬화하고, Tauri `invoke` 결과는 JS에서 `number`로 들어온다.

Impact:
- 현재 화면은 문자열화만 하고 있어 당장 깨지지 않지만, 타입 계약이 실제 런타임과 어긋나 있어 추후 산술/비교 로직에서 문제를 만들 수 있다.

## Domain Coverage

| Domain | Implemented / Total | Coverage |
| --- | ---: | ---: |
| `config` | `2 / 2` | `100%` |
| `qa-config` | `2 / 2` | `100%` |
| `boards` | `5 / 7` | `71.4%` |
| `members` | `5 / 10` | `50.0%` |
| `permissions` | `3 / 6` | `50.0%` |
| `polls` | `5 / 10` | `50.0%` |
| `popups` | `5 / 10` | `50.0%` |
| `sms` | `3 / 37` | `8.1%` |
| `board-groups` | `0 / 17` | `0%` |
| `contents` | `0 / 5` | `0%` |
| `faqs` | `0 / 14` | `0%` |
| `layouts` | `0 / 8` | `0%` |
| `mails` | `0 / 13` | `0%` |
| `maintenance` | `0 / 9` | `0%` |
| `menus` | `0 / 7` | `0%` |
| `points` | `0 / 7` | `0%` |
| `popular` | `0 / 3` | `0%` |
| `push` | `0 / 2` | `0%` |
| `qa` | `0 / 1` | `0%` |
| `reports` | `0 / 3` | `0%` |
| `themes` | `0 / 4` | `0%` |
| `visits` | `0 / 3` | `0%` |
| `write-count` | `0 / 1` | `0%` |

## Implemented Operation Matrix

Status legend:
- `Exact`: Rust method/path/request/response가 PHP 실제 구현과 일치
- `Runtime exact, spec drift`: Rust는 PHP 실제와 맞지만 OpenAPI가 틀림
- `Partial`: 엔드포인트는 연결됐지만 query/validation/type 일부 drift 존재

| Method | Path | Route | Page | Wrapper | Command | Status |
| --- | --- | --- | --- | --- | --- | --- |
| `GET` | `/admin/config` | `settings/general` | `AdminConfigPage` | `config.ts` | `cmd_admin_config_get` | `Exact` |
| `PUT` | `/admin/config` | `settings/general` | `AdminConfigPage` | `config.ts` | `cmd_admin_config_update` | `Exact` |
| `GET` | `/admin/members` | `members` | `AdminMembersPage` | `members.ts` | `cmd_admin_member_get_list` | `Runtime exact, spec drift` |
| `GET` | `/admin/members/{mb_id}` | `members/:mbId` | `AdminMembersPage` | `members.ts` | `cmd_admin_member_get` | `Exact` |
| `PATCH` | `/admin/members/{mb_id}` | `members/:mbId` | `AdminMembersPage` | `members.ts` | `cmd_admin_member_update` | `Exact` |
| `DELETE` | `/admin/members/{mb_id}` | `members/:mbId` | `AdminMembersPage` | `members.ts` | `cmd_admin_member_delete` | `Exact` |
| `PATCH` | `/admin/members/{mb_id}/level` | `members/:mbId` | `AdminMembersPage` | `members.ts` | `cmd_admin_member_update_level` | `Exact` |
| `GET` | `/admin/boards` | `boards` | `AdminBoardsPage` | `boards.ts` | `cmd_admin_board_get_list` | `Partial` |
| `POST` | `/admin/boards` | `boards` | `AdminBoardsPage` | `boards.ts` | `cmd_admin_board_create` | `Runtime exact, spec drift` |
| `GET` | `/admin/boards/{bo_table}` | `boards` | `AdminBoardsPage` | `boards.ts` | `cmd_admin_board_get` | `Exact` |
| `PUT` | `/admin/boards/{bo_table}` | `boards` | `AdminBoardsPage` | `boards.ts` | `cmd_admin_board_update` | `Exact` |
| `DELETE` | `/admin/boards/{bo_table}` | `boards` | `AdminBoardsPage` | `boards.ts` | `cmd_admin_board_delete` | `Exact` |
| `GET` | `/admin/system/auths` | `permissions` | `AdminPermissionsPage` | `permissions.ts` | `cmd_admin_permission_get_list` | `Exact` |
| `POST` | `/admin/system/auths` | `permissions` | `AdminPermissionsPage` | `permissions.ts` | `cmd_admin_permission_save` | `Exact` |
| `DELETE` | `/admin/system/auths/{mb_id}/{au_menu}` | `permissions` | `AdminPermissionsPage` | `permissions.ts` | `cmd_admin_permission_delete` | `Exact` |
| `GET` | `/admin/system/polls` | `operations/polls` | `AdminPollsPage` | `polls.ts` | `cmd_admin_poll_get_list` | `Exact` |
| `POST` | `/admin/system/polls` | `operations/polls` | `AdminPollsPage` | `polls.ts` | `cmd_admin_poll_create` | `Exact` |
| `GET` | `/admin/system/polls/{po_id}` | `operations/polls` | `AdminPollsPage` | `polls.ts` | `cmd_admin_poll_get` | `Exact` |
| `PUT` | `/admin/system/polls/{po_id}` | `operations/polls` | `AdminPollsPage` | `polls.ts` | `cmd_admin_poll_update` | `Exact` |
| `DELETE` | `/admin/system/polls/{po_id}` | `operations/polls` | `AdminPollsPage` | `polls.ts` | `cmd_admin_poll_delete` | `Exact` |
| `GET` | `/admin/system/popups` | `operations/popups` | `AdminPopupsPage` | `popups.ts` | `cmd_admin_popup_get_list` | `Exact` |
| `POST` | `/admin/system/popups` | `operations/popups` | `AdminPopupsPage` | `popups.ts` | `cmd_admin_popup_create` | `Exact` |
| `GET` | `/admin/system/popups/{nw_id}` | `operations/popups` | `AdminPopupsPage` | `popups.ts` | `cmd_admin_popup_get` | `Exact` |
| `PUT` | `/admin/system/popups/{nw_id}` | `operations/popups` | `AdminPopupsPage` | `popups.ts` | `cmd_admin_popup_update` | `Exact` |
| `DELETE` | `/admin/system/popups/{nw_id}` | `operations/popups` | `AdminPopupsPage` | `popups.ts` | `cmd_admin_popup_delete` | `Exact` |
| `GET` | `/admin/system/qa-config` | `settings/qa` | `AdminQaConfigPage` | `qa-config.ts` | `cmd_admin_qa_config_get` | `Exact` |
| `PUT` | `/admin/system/qa-config` | `settings/qa` | `AdminQaConfigPage` | `qa-config.ts` | `cmd_admin_qa_config_update` | `Exact` |
| `GET` | `/admin/sms/config` | `settings/sms` | `AdminSmsConfigPage` | `sms.ts` | `cmd_admin_sms_config_get` | `Exact` |
| `PUT` | `/admin/sms/config` | `settings/sms` | `AdminSmsConfigPage` | `sms.ts` | `cmd_admin_sms_config_update` | `Partial` |
| `POST` | `/admin/sms/member-sync` | `settings/sms` | `AdminSmsConfigPage` | `sms.ts` | `cmd_admin_sms_member_sync` | `Partial` |

## Unimplemented Admin Operations

### board-groups
- `GET /admin/board-groups`
- `POST /admin/board-groups`
- `GET /admin/board-groups/{gr_id}`
- `PUT /admin/board-groups/{gr_id}`
- `PATCH /admin/board-groups/{gr_id}`
- `DELETE /admin/board-groups/{gr_id}`
- `GET /admin/board-groups/{gr_id}/members`
- `POST /admin/board-groups/{gr_id}/members`
- `DELETE /admin/board-groups/{gr_id}/members/{mb_id}`
- `GET /admin/groups`
- `POST /admin/groups`
- `GET /admin/groups/{gr_id}`
- `PUT /admin/groups/{gr_id}`
- `DELETE /admin/groups/{gr_id}`
- `GET /admin/groups/{gr_id}/members`
- `POST /admin/groups/{gr_id}/members`
- `DELETE /admin/groups/{gr_id}/members/{mb_id}`

### boards
- `POST /admin/boards/{bo_table}/copy`
- `DELETE /admin/boards/new-posts`

### contents
- `GET /admin/contents`
- `POST /admin/contents`
- `GET /admin/contents/{co_id}`
- `PUT /admin/contents/{co_id}`
- `DELETE /admin/contents/{co_id}`

### faqs
- `GET /admin/faqs`
- `POST /admin/faqs`
- `GET /admin/faqs/{fa_id}`
- `PUT /admin/faqs/{fa_id}`
- `DELETE /admin/faqs/{fa_id}`
- `GET /admin/faq-masters`
- `POST /admin/faq-masters`
- `GET /admin/faq-masters/{fm_id}`
- `PUT /admin/faq-masters/{fm_id}`
- `DELETE /admin/faq-masters/{fm_id}`
- `POST /admin/faq-masters/{fm_id}/header-image`
- `DELETE /admin/faq-masters/{fm_id}/header-image`
- `POST /admin/faq-masters/{fm_id}/footer-image`
- `DELETE /admin/faq-masters/{fm_id}/footer-image`

### layouts
- `GET /admin/layouts`
- `GET /admin/layouts/{page_id}`
- `PUT /admin/layouts/{page_id}`
- `POST /admin/layouts/{page_id}/widgets`
- `PATCH /admin/layouts/{page_id}/widgets`
- `PATCH /admin/layouts/{page_id}/widgets/{widget_id}`
- `DELETE /admin/layouts/{page_id}/widgets/{widget_id}`
- `PATCH /admin/layouts/{page_id}/reorder`

### mails
- `GET /admin/mails`
- `POST /admin/mails`
- `POST /admin/mails/templates`
- `GET /admin/mails/recipients`
- `POST /admin/mails/test`
- `POST /admin/mail-tests`
- `GET /admin/mails/{ma_id}`
- `PUT /admin/mails/{ma_id}`
- `DELETE /admin/mails/{ma_id}`
- `GET /admin/system/mails`
- `GET /admin/system/mail-recipients`
- `POST /admin/system/mails/test`
- `POST /admin/system/mails/send`

### maintenance
- `GET /admin/system/phpinfo`
- `POST /admin/system/maintenance/session-files/purge`
- `POST /admin/system/maintenance/cache-files/purge`
- `POST /admin/system/maintenance/captcha-files/purge`
- `POST /admin/system/maintenance/thumbnail-files/purge`
- `POST /admin/system/maintenance/member-list-files/purge`
- `GET /admin/system/browscap`
- `POST /admin/system/browscap/update`
- `POST /admin/system/browscap/convert`

### members
- `GET /admin/members/excel`
- `POST /admin/members/{mb_id}/icon`
- `DELETE /admin/members/{mb_id}/icon`
- `POST /admin/members/{mb_id}/image`
- `DELETE /admin/members/{mb_id}/image`

### menus
- `GET /admin/menus`
- `POST /admin/menus`
- `PATCH /admin/menus`
- `GET /admin/menus/{me_id}`
- `PUT /admin/menus/{me_id}`
- `DELETE /admin/menus/{me_id}`
- `PATCH /admin/menus/reorder`

### permissions
- `GET /admin/auth`
- `PUT /admin/auth/{mb_id}`
- `DELETE /admin/auth/{mb_id}`

### points
- `GET /admin/points`
- `POST /admin/points`
- `DELETE /admin/points`
- `POST /admin/points/grant`
- `POST /admin/points/deduct`
- `GET /admin/points/summary`
- `POST /admin/points/expire`

### polls
- `GET /admin/polls`
- `POST /admin/polls`
- `GET /admin/polls/{po_id}`
- `PATCH /admin/polls/{po_id}`
- `DELETE /admin/polls/{po_id}`

### popular
- `GET /admin/popular`
- `DELETE /admin/popular`
- `GET /admin/popular/rank`

### popups
- `GET /admin/popups`
- `POST /admin/popups`
- `GET /admin/popups/{nw_id}`
- `PATCH /admin/popups/{nw_id}`
- `DELETE /admin/popups/{nw_id}`

### push
- `POST /admin/push/send`
- `POST /admin/push/messages`

### qa
- `DELETE /admin/qa`

### reports
- `GET /admin/reports`
- `PATCH /admin/reports/{report_id}`
- `GET /admin/reports/stats`

### sms
- `GET /admin/sms/template-groups`
- `POST /admin/sms/template-groups`
- `GET /admin/sms/template-groups/{fg_no}`
- `PUT /admin/sms/template-groups/{fg_no}`
- `DELETE /admin/sms/template-groups/{fg_no}`
- `POST /admin/sms/template-groups/{fg_no}/move`
- `DELETE /admin/sms/template-groups/{fg_no}/templates`
- `GET /admin/sms/templates`
- `POST /admin/sms/templates`
- `POST /admin/sms/templates/batch`
- `GET /admin/sms/templates/{fo_no}`
- `PUT /admin/sms/templates/{fo_no}`
- `DELETE /admin/sms/templates/{fo_no}`
- `GET /admin/sms/contact-groups`
- `POST /admin/sms/contact-groups`
- `GET /admin/sms/contact-groups/{bg_no}`
- `PUT /admin/sms/contact-groups/{bg_no}`
- `DELETE /admin/sms/contact-groups/{bg_no}`
- `POST /admin/sms/contact-groups/{bg_no}/move`
- `DELETE /admin/sms/contact-groups/{bg_no}/contacts`
- `GET /admin/sms/contacts`
- `POST /admin/sms/contacts`
- `POST /admin/sms/contacts/batch`
- `POST /admin/sms/contacts/import`
- `GET /admin/sms/contacts/export`
- `GET /admin/sms/contacts/{bk_no}`
- `PUT /admin/sms/contacts/{bk_no}`
- `DELETE /admin/sms/contacts/{bk_no}`
- `GET /admin/sms/history/batches`
- `GET /admin/sms/history/deliveries`
- `GET /admin/sms/history/batches/{wr_no}`
- `POST /admin/sms/history/batches/{wr_no}/resend-failures`
- `POST /admin/sms/history/batches/{wr_no}/resend-all`
- `POST /admin/sms/messages`

### themes
- `GET /admin/system/theme`
- `PUT /admin/system/theme`
- `GET /admin/system/themes`
- `GET /admin/system/themes/{theme}`

### visits
- `GET /admin/visits/stats`
- `GET /admin/visits/search`
- `DELETE /admin/visits`

### write-count
- `GET /admin/write-count/stats`

## Bottom Line

- Rust 관리자 앱은 현재 admin REST 전체를 구현한 상태가 아니다.
- 다만 현재 연결된 30개 operation은 대체로 PHP 실제 구현과 맞게 붙어 있다.
- 예외는 다음 5개 축이다:
  - OpenAPI 원본 파손
  - Boards list의 `gr_id` dead query
  - Boards create의 `gr_id` required drift
  - Members list의 `search_field` dead query
  - SMS 설정/동기화의 프런트 validation/type drift
