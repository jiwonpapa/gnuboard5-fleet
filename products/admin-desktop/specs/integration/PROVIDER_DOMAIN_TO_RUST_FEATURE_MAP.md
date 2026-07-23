---
doc_type: support
status: active
owner: rust-admin
source_of_truth: false
ai_default_include: true
last_reviewed: 2026-03-21
review_cycle_days: 30
bounded_context: integration
---
# Provider Domain To Rust Feature Map

## 목적

이 문서는 PHP `/admin/schema` provider domain과 Rust 관리자 앱 feature/workspace, 그리고 실제 navigation group의 관계를 한 장에서 고정합니다.

이 매핑의 목적은 세 가지입니다.

1. `schema-backed form domain`과 `Rust feature`가 어디까지 1:1인지 구분합니다.
2. `navigation group`이 canonical domain이 아니라 메뉴 묶음이라는 점을 명시합니다.
3. `local-only`, `provider-only`, `API-backed but non-schema` surface를 분리해 도메인 감사의 기준선을 고정합니다.

## 경계 원칙

- PHP `schema domain`은 **schema-backed 관리자 폼 surface**의 1차 기준입니다.
- Rust `feature`는 가능하면 provider domain을 따르지만, rename 또는 aggregation이 있을 수 있습니다.
- `navigation group`은 메뉴 UX 묶음일 뿐 canonical domain이 아닙니다.
- `/admin/schema`가 없는 작업면도 존재합니다.
  - 예: `auth`, `mail-test`, `maintenance`, `popular`, `visits`
- 로컬 앱 전용 feature는 provider domain이 아니라 Rust local canonical domain으로 분류합니다.
  - 예: `security`, `sites`

## 1. Schema-Backed Domain Mapping

| PHP schema domain | Rust feature | Navigation group | Legacy source | 분류 | 비고 |
| --- | --- | --- | --- | --- | --- |
| `config` | `config` | `environment` | `adm/config_form.php`, `adm/_rewrite_config_form.php` | direct | 기본환경설정과 짧은주소 보조 폼을 함께 포함합니다. |
| `system` | `system` | `sms` | `adm/config_form.php` | direct | provider domain 이름은 `system`이지만 현재 Rust 메뉴에서는 `SMS 기본설정` 작업면으로 노출됩니다. |
| `theme` | `theme` | `environment` | `adm/theme.php`, `adm/config_form.php` | direct | 테마 선택/상세는 환경설정 축에 배치합니다. |
| `menus` | `menus` | `environment` | `adm/menu_list.php`, `adm/menu_form.php` | direct | 메뉴 트리/reorder 본면은 `menu_list.php`이고, `menu_form.php`는 동일 작업면의 popup helper입니다. |
| `popups` | `popups` | `environment` | `adm/newwinform.php` | direct | 팝업 레이어 관리입니다. |
| `members` | `members` | `members` | `adm/member_form.php` | direct | 회원 수정/상세 폼입니다. |
| `mails` | `mails` | `members` | `adm/mail_form.php`, `adm/mail_select_form.php` | direct | 회원 메일 발송/대상 선택입니다. |
| `points` | `points` | `members` | `adm/point_list.php` | direct | 포인트 관리입니다. |
| `polls` | `polls` | `members` | `adm/poll_form.php` | direct | 투표 생성/수정입니다. |
| `boards` | `boards` | `boards` | `adm/board_form.php` | direct | 게시판 생성/수정 폼입니다. |
| `groups` | `board-groups` | `boards` | `adm/boardgroup_form.php` | rename | provider `groups`를 Rust에서 `board-groups`로 명시적으로 rename 했습니다. |
| `contents` | `contents` | `boards` | `adm/contentform.php` | direct | 내용관리입니다. |
| `faq-masters` + `faqs` | `faqs` | `boards` | `adm/faqmasterform.php`, `adm/faqform.php` | aggregate | FAQ 마스터와 FAQ 항목을 Rust `faqs` 작업면이 함께 소비합니다. |
| `sms-contacts` | `sms-contacts` | `sms` | `adm/sms_admin/num_group.php`, `adm/sms_admin/num_book_write.php`, `adm/sms_admin/num_book_file.php` | direct | 주소록/그룹/파일을 같은 기능 축으로 다룹니다. |
| `sms-messages` | `sms-messages` | `sms` | `adm/sms_admin/sms_write.php`, `adm/sms_admin/sms_write_form.php` | direct | 문자 발송 화면입니다. |
| `sms-templates` | `sms-templates` | `sms` | `adm/sms_admin/form_group.php`, `adm/sms_admin/form_write.php` | direct | 이모티콘 그룹/템플릿입니다. |

## 2. API-Backed But Non-Schema Features

이 영역은 REST API는 소비하지만 `/admin/schema` 기반 필드 메타데이터 domain은 아닙니다.

| Rust feature/workspace | Navigation group | Legacy source | 분류 | 비고 |
| --- | --- | --- | --- | --- |
| `auth` | `environment` | `adm/auth_list.php` | api-backed list/action | 권한 목록/부여/삭제는 schema form보다 operation surface에 가깝습니다. |
| `mail-test` | `environment` | `adm/sendmail_test.php` | api-backed action | 테스트 메일 발송입니다. |
| `maintenance` | `environment` | `adm/session_file_delete.php`, `adm/cache_file_delete.php`, `adm/captcha_file_delete.php`, `adm/thumbnail_file_delete.php`, `adm/member_list_file_delete.php` | api-backed action | purge/maintenance 액션 묶음입니다. |
| `popular` | `boards` | `adm/popular_list.php`, `adm/popular_rank.php` | api-backed report | 인기검색어 관리/순위입니다. |
| `qa-config` | `boards` | `adm/qa_config.php` | api-backed single-form | 현재는 별도 feature로 유지하지만 schema domain과는 분리됩니다. |
| `write-count` | `boards` | `adm/write_count.php` | api-backed report | 글/댓글 현황 보고입니다. |
| `visits` | `members` | `adm/visit_list.php`, `adm/visit_search.php`, `adm/visit_delete.php` | api-backed report/action | 접속자 집계/검색/삭제입니다. |
| `layouts` | `tools` | `adm/layout_list.php` | api-backed utility | 레이아웃 관리입니다. |
| `reports` | `tools` | `adm/report_list.php` | api-backed utility | 신고 관리입니다. |
| `push` | `tools` | `adm/push_send.php` | api-backed utility | 푸시 발송입니다. |

## 3. Local Canonical / Local Only Features

이 영역은 PHP provider schema를 정본으로 삼지 않습니다.

| Rust feature | Navigation group | 분류 | 비고 |
| --- | --- | --- | --- |
| `security` | `app-settings` | local canonical | 로컬 마스터 비밀번호, OTP, 자동 잠금은 Rust 앱 자체 정책이 정본입니다. |
| `sites` | `site-management` | local only | 멀티사이트 등록/백업/활성화는 로컬 앱 고유 기능입니다. |
| `overview` | `overview` | local aggregate | PHP 대시보드/로컬 상태/최근 활동을 합성한 앱 홈입니다. |

## 4. Provider-Only Allowances

현재 Rust 활성 소비 범위 밖이지만 provider audit에는 남기는 영역입니다.

| PHP schema domain prefix | 상태 | 비고 |
| --- | --- | --- |
| `shop-catalog-*` | provider-only | Rust 활성 소비 범위 밖이며 handoff/backlog로만 추적합니다. |

근거: [ACTIVE_CONSUMER_SCOPE.json](/Users/neojins/workspace/gnuboard5/rust/specs/integration/ACTIVE_CONSUMER_SCOPE.json)

## 5. 운영 규칙

- 새 provider schema domain을 추가할 때는 이 문서에 `direct / rename / aggregate / provider-only` 중 어떤 매핑인지 먼저 적습니다.
- Rust feature를 새로 만들 때는 provider domain을 그대로 따를지, rename/aggregate 할지 먼저 이 문서에서 결정합니다.
- `navigation-manifest.ts`의 메뉴 묶음은 UX 조직이며, domain 정본으로 취급하지 않습니다.
- 감사 파이프라인에서 `domain mismatch`를 볼 때는 먼저 이 문서의 예외(`rename`, `aggregate`, `local canonical`, `provider-only`)를 확인합니다.

## 6. 현재 판단

- 현재 구조는 **순수 비즈니스 도메인 분리**보다는 **관리자 기능 도메인 분리**에 가깝습니다.
- 당장 억지로 더 쪼개야 할 수준은 아닙니다.
- 우선 개선 대상은 개별 도메인 분할보다 아래 글루 레이어입니다.
  - `navigation-manifest.ts`
  - `api-target-registry.ts`
  - `command-context-registry.ts`
  - `src-tauri/src/commands/registry.rs`
  - `AppShell.tsx`
