# 필드 메타데이터 제공 감사 — 2026-03-09

> 목적: PHP REST API가 클라이언트에 필드 라벨/타입/섹션 메타데이터를 실제 제공하고, Rust route-native 화면이 이를 소비하는지 검증
> 기준: `/field-parity-audit` 워크플로우 Phase 4.5

---

## 판정: ✅ P1/P2 도메인 구현 완료

| 항목 | 판정 | 비고 |
|------|------|------|
| `GET /admin/schema` | ✅ | catalog 제공 |
| `GET /admin/schema/{domain}` | ✅ | `boards`, `config`, `members`, `polls`, `popups`, `contents`, `groups`, `menus`, `faq-masters`, `faqs` 확인 |
| 라벨(한글) API 제공 | ✅ | legacy bootstrap 기반 generated registry |
| 필드 타입 정의 | ✅ | `input_type`, `data_type` 제공 |
| 섹션 그룹 정의 | ✅ | section key/label/order 제공 |
| required/create_only/readonly_on_update | ✅ | field 단위 제공 |
| Rust route-native 소비 | ✅ | `boards`, `config`, `members`, `polls`, `popups`, `contents`, `groups`, `menus`, `faq-masters`, `faqs`에서 소비 |
| P2 도메인(`polls/popups/...`) | ✅ | registry 및 화면 소비 구현 완료 |

---

## 구현 상태

### PHP

구현 파일:
- `/Users/neojins/workspace/gnuboard5/php/scripts/extract_admin_schema.py`
- `/Users/neojins/workspace/gnuboard5/php/api/v1/Admin/Schema/Repository/AdminSchemaRepository.php`
- `/Users/neojins/workspace/gnuboard5/php/api/v1/Admin/Schema/Service/AdminSchemaService.php`
- `/Users/neojins/workspace/gnuboard5/php/api/v1/Admin/Schema/Controller/AdminSchemaController.php`
- `/Users/neojins/workspace/gnuboard5/php/api/routes/v1.php`
- `/Users/neojins/workspace/gnuboard5/php/api/routes/v1/admin.php`
- `/Users/neojins/workspace/gnuboard5/php/api/docs/openapi.yaml`

generated registry:
- `/Users/neojins/workspace/gnuboard5/php/api/v1/Admin/Schema/Data/generated/boards.json`
- `/Users/neojins/workspace/gnuboard5/php/api/v1/Admin/Schema/Data/generated/config.json`
- `/Users/neojins/workspace/gnuboard5/php/api/v1/Admin/Schema/Data/generated/members.json`
- `/Users/neojins/workspace/gnuboard5/php/api/v1/Admin/Schema/Data/generated/polls.json`
- `/Users/neojins/workspace/gnuboard5/php/api/v1/Admin/Schema/Data/generated/popups.json`
- `/Users/neojins/workspace/gnuboard5/php/api/v1/Admin/Schema/Data/generated/contents.json`
- `/Users/neojins/workspace/gnuboard5/php/api/v1/Admin/Schema/Data/generated/groups.json`
- `/Users/neojins/workspace/gnuboard5/php/api/v1/Admin/Schema/Data/generated/menus.json`
- `/Users/neojins/workspace/gnuboard5/php/api/v1/Admin/Schema/Data/generated/faq-masters.json`
- `/Users/neojins/workspace/gnuboard5/php/api/v1/Admin/Schema/Data/generated/faqs.json`

추출 결과:
- `boards`: 62 fields
- `config`: 141 fields
- `members`: 28 fields
- `polls`: 19 fields
- `popups`: 12 fields
- `contents`: 10 fields
- `groups`: 5 fields
- `menus`: 7 fields
- `faq-masters`: 8 fields
- `faqs`: 4 fields

### 레거시 bootstrap 사용의 타당성

라벨의 실제 운영 원본은 원래 SSR 폼이었다.
- `/Users/neojins/workspace/gnuboard5/php/adm/board_form.php`
- `/Users/neojins/workspace/gnuboard5/php/adm/config_form.php`
- `/Users/neojins/workspace/gnuboard5/php/adm/member_form.php`

따라서 최초 복원은 여기서 뽑는 것이 타당하다. 다만 런타임에서 레거시 PHP를 다시 읽지 않고, generated JSON registry로 고정한 뒤 `/admin/schema`가 이를 제공하는 구조로 바뀌었다.

### Rust

소비 계층:
- `/Users/neojins/workspace/gnuboard5/rust/g5-admin/src-tauri/src/models/schema.rs`
- `/Users/neojins/workspace/gnuboard5/rust/g5-admin/src-tauri/src/api_client/schema.rs`
- `/Users/neojins/workspace/gnuboard5/rust/g5-admin/src-tauri/src/commands/schema.rs`
- `/Users/neojins/workspace/gnuboard5/rust/g5-admin/src/api/client/schema.ts`
- `/Users/neojins/workspace/gnuboard5/rust/g5-admin/src/features/schema/useAdminFieldSchema.ts`

실제 소비 화면:
- `/Users/neojins/workspace/gnuboard5/rust/g5-admin/src/features/boards/BoardFormFields.tsx`
- `/Users/neojins/workspace/gnuboard5/rust/g5-admin/src/features/boards/BoardWorkspace.tsx`
- `/Users/neojins/workspace/gnuboard5/rust/g5-admin/src/features/config/AdminConfigPage.tsx`
- `/Users/neojins/workspace/gnuboard5/rust/g5-admin/src/features/members/MemberDetailCard.tsx`
- `/Users/neojins/workspace/gnuboard5/rust/g5-admin/src/features/polls/AdminPollsPage.tsx`
- `/Users/neojins/workspace/gnuboard5/rust/g5-admin/src/features/polls/PollFormFields.tsx`
- `/Users/neojins/workspace/gnuboard5/rust/g5-admin/src/features/polls/PollWorkspace.tsx`
- `/Users/neojins/workspace/gnuboard5/rust/g5-admin/src/features/popups/AdminPopupsPage.tsx`
- `/Users/neojins/workspace/gnuboard5/rust/g5-admin/src/features/popups/PopupFormFields.tsx`
- `/Users/neojins/workspace/gnuboard5/rust/g5-admin/src/features/popups/PopupWorkspace.tsx`
- `/Users/neojins/workspace/gnuboard5/rust/g5-admin/src/features/contents/AdminContentsPage.tsx`
- `/Users/neojins/workspace/gnuboard5/rust/g5-admin/src/features/board-groups/AdminBoardGroupsPage.tsx`
- `/Users/neojins/workspace/gnuboard5/rust/g5-admin/src/features/menus/AdminMenusPage.tsx`
- `/Users/neojins/workspace/gnuboard5/rust/g5-admin/src/features/menus/MenuFormFields.tsx`
- `/Users/neojins/workspace/gnuboard5/rust/g5-admin/src/features/menus/MenuWorkspace.tsx`
- `/Users/neojins/workspace/gnuboard5/rust/g5-admin/src/features/faqs/AdminFaqsPage.tsx`

효과:
- 라벨과 설명이 API 메타데이터 우선으로 렌더링된다.
- `textarea`, `select`, `checkbox`가 `input_type` 기반으로 결정된다.
- API 메타데이터가 비어 있거나 미구현이어도 fallback 라벨로 동작한다.
- `menus`, `faqs`, `faq-masters`처럼 레거시가 동적 편집기/팝업 기반인 경우에도 manifest override로 동일 schema 경계를 유지한다.

---

## 검증

- `composer run contract:manifest`
- `composer run contract:check`
- `vendor/bin/phpunit tests/Admin/Schema/AdminSchemaServiceTest.php tests/contract/AdminSchemaContractTest.php`
- `pnpm contract:sync`
- `pnpm contract:generate`
- `pnpm lint`
- `pnpm test`
- `pnpm build`

---

## 남은 항목

1. 레거시 help string 정제
- 일부 description은 legacy PHP 문자열 결합 흔적이 남아 있다.

2. Flutter 소비 계층 연결
- 현재 Flutter는 contract snapshot gate까지만 있고, `/admin/schema` UI 소비는 아직 시작 전이다.
