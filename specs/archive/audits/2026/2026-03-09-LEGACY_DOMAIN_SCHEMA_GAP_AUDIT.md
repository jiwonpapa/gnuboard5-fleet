# 레거시 도메인 REST/스키마 갭 감사 — 2026-03-09

> 상태 업데이트 (2026-03-09): PHP `extract_admin_schema.py` extractor v3와 `schema-domains.json`의 `table`/`field_patterns`/`field_overrides` 보강으로 `boards`, `config`, `members`, `groups`, `polls`, `popups`, `contents`, `faq-masters`, `faqs`, `menus`의 legacy DB 컬럼 누락은 `0건`, raw field label도 `0건`으로 정리되었다. 검증은 `composer run schema:extract`, `composer run schema:check`, `vendor/bin/phpunit tests/Admin/Schema/AdminSchemaServiceTest.php tests/contract/AdminSchemaContractTest.php`, 그리고 install SQL 대비 parity 스크립트로 다시 확인했다.

> 목적: PHP 레거시 관리자 도메인 기준으로 REST endpoint 구현 누락, `/admin/schema` 필드 메타데이터 제공 범위, Rust 관리자 화면의 실제 소비/게이팅 상태를 다시 점검한다.
> 방식: 정적 감사만 수행. 앱 코드/빌드 산출물 편집 없이 문서만 작성한다.
> 범위: `/Users/neojins/workspace/gnuboard5/php/api/docs/openapi.yaml`, `/Users/neojins/workspace/gnuboard5/php/api/v1/Admin/Schema/schema-domains.json`, `/Users/neojins/workspace/gnuboard5/rust/g5-admin/src`

---

## 최종 판정

**판정: 🔴 메타데이터 관점 미통과**

- REST admin path 정합성 자체는 좋다. 정규화 기준 `106 / 106`으로 PHP OpenAPI와 Rust Tauri admin path 갭이 없었다.
- PHP `/admin/schema` 레지스트리 무결성도 현재 10개 domain에 대해서는 정상이다.
- 하지만 화면 기준으로 보면 field metadata rollout은 아직 초반 단계다.
  - canonical route `44`개 중 `/admin/schema`를 실제 소비하는 route component는 `9`개뿐이다. 약 `20.5%`.
  - 그 `9`개도 schema fetch가 실패하거나 `null`이면 fallback 라벨로 계속 표시하지 않고 작업면을 숨긴다.
  - schema 비소비 편집/설정 화면이 많이 남아 있어서, 형님이 보신 "필드 제목이 없거나 화면이 엉성한 상태"는 현재 코드 기준으로 사실이다.

정리하면, **endpoint 계층은 생각보다 덜 엉망이고, UI metadata 계층이 훨씬 덜 끝난 상태**다.

---

## 실행 결과

### 1. REST endpoint parity

정적 비교 결과:

- Rust admin paths: `106`
- PHP OpenAPI admin paths: `106`
- PHP에 있고 Rust에 없는 path: `0`
- Rust에만 있는 path: `0`

실행 근거:

```bash
python3 - <<'PY'
# Rust src-tauri/src/commands/*.rs 의 "/admin/*" 문자열과
# php/api/docs/openapi.yaml 의 /admin/* path 를 alias 정규화 후 비교
PY
```

판정:

- **endpoint 누락이 현재 주된 병목은 아니다.**
- 형님이 느끼신 품질 저하는 "REST 경로 미구현"보다 **schema/label 소비와 화면 게이팅**에서 온다.

### 2. PHP schema registry 무결성

실행 결과:

```bash
python3 /Users/neojins/workspace/gnuboard5/php/scripts/extract_admin_schema.py --mode check
```

검증 통과:

- `boards`
- `config`
- `members`
- `polls`
- `popups`
- `contents`
- `groups`
- `menus`
- `faq-masters`
- `faqs`

판정:

- **현재 만들어진 10개 domain schema 파일은 깨지지 않았다.**
- 문제는 "레지스트리가 아예 없는 도메인"과 "레지스트리를 소비하지 않는 화면"이다.

---

## 기존 감사 문서 보정

기존 문서 [2026-03-09-FIELD_METADATA_AUDIT.md](./2026-03-09-FIELD_METADATA_AUDIT.md)는 아래처럼 결론을 내렸다.

- `P1/P2 도메인 구현 완료`
- `Rust route-native 소비`
- `API 메타데이터가 비어 있거나 미구현이어도 fallback 라벨로 동작`

하지만 이 결론은 현재 화면 게이팅을 반영하지 못했다.

반증 근거:

- `/Users/neojins/workspace/gnuboard5/rust/specs/audits/2026-03-09-FIELD_METADATA_AUDIT.md:8`
- `/Users/neojins/workspace/gnuboard5/rust/specs/audits/2026-03-09-FIELD_METADATA_AUDIT.md:18`
- `/Users/neojins/workspace/gnuboard5/rust/specs/audits/2026-03-09-FIELD_METADATA_AUDIT.md:99`

실제 코드:

- `/Users/neojins/workspace/gnuboard5/rust/g5-admin/src/features/schema/field-schema-state.ts:4-10`
  - `error != null || loading || schema == null` 이면 state panel로 간다.
- `/Users/neojins/workspace/gnuboard5/rust/g5-admin/src/features/schema/FieldSchemaStatePanel.tsx:13-29`
  - schema 문제 시 "숨겼습니다" 메시지를 보여준다.
- `/Users/neojins/workspace/gnuboard5/rust/g5-admin/src/features/boards/BoardWorkspace.tsx:69-103`
  - 게시판 생성 폼 자체를 숨긴다.
- `/Users/neojins/workspace/gnuboard5/rust/g5-admin/src/features/members/MemberDetailCard.tsx:144-170`
  - 회원 상세 작업면 자체를 숨긴다.
- `/Users/neojins/workspace/gnuboard5/rust/g5-admin/src/features/menus/MenuWorkspace.tsx:50-115`
  - 메뉴 생성/수정 폼을 숨긴다.

즉, **fallback label 함수는 존재하지만, schema가 비정상일 때 그 함수까지 도달하지 못하는 화면이 다수다.**

---

## 현재 schema 적용 범위

`useAdminFieldSchema`가 허용하는 domain은 10개뿐이다.

근거:

- `/Users/neojins/workspace/gnuboard5/rust/g5-admin/src/features/schema/useAdminFieldSchema.ts:11-21`
- `/Users/neojins/workspace/gnuboard5/php/api/v1/Admin/Schema/schema-domains.json:1-120`

현재 schema-backed route component:

1. `AdminConfigPage`
2. `AdminMenusPage`
3. `AdminPopupsPage`
4. `AdminMembersPage`
5. `AdminPollsPage`
6. `AdminBoardsPage`
7. `AdminBoardGroupsPage`
8. `AdminContentsPage`
9. `AdminFaqsPage`

근거:

- `/Users/neojins/workspace/gnuboard5/rust/g5-admin/src/app/router.tsx:88-133`

수치:

- canonical route: `44`
- schema-backed route component: `9`
- route 기준 metadata 적용률: 약 `20.5%`

판정:

- **현재 감사/문서가 암묵적으로 전제한 "전반적 메타데이터 적용 완료"는 사실이 아니다.**
- 메타데이터 기반 화면은 일부 핵심 도메인까지만 올라와 있다.

---

## 제안 규칙 타당성 조사

형님이 제안하신 규칙:

1. 레거시 PHP `<label>` / `<th>` 우선
2. 그누보드 표준 명명 규칙 차선
3. 불명 시 `FIXME_필드명`
4. DB 필드 누락 0건 강제

판정:

- **타당성 높음**
- 이유: 현재 DB 스키마에는 한글 코멘트가 없고, 실제 운영 라벨의 1차 출처는 레거시 관리자 폼이기 때문이다.
- 특히 "한글 제목 창작 금지"는 필수다. 현재처럼 schema rollout이 UI 계약의 일부가 된 상태에서는 잘못 붙은 라벨이 그대로 Rust/Flutter 화면으로 퍼진다.

현재 시스템에 맞는 번역:

- 이 프로젝트는 OpenAPI 개별 property `title`보다 `/admin/schema`의 `AdminFieldSchema.label`을 클라이언트 표시용 메타데이터 SSOT로 쓴다.
- 즉 제안 규칙은 현재 저장소에서는 **OpenAPI title 규칙이라기보다 `label` provenance 규칙**으로 적용하는 것이 맞다.

근거:

- `/Users/neojins/workspace/gnuboard5/php/api/docs/openapi.yaml:10077`
- `/Users/neojins/workspace/gnuboard5/php/tests/contract/AdminSchemaContractTest.php:20`

---

## 실제 코드 반영 상태

### 1순위: 레거시 PHP 라벨 추출

**부분 반영**

- 현재 PHP 추출기는 `<label>`과 `<th>`를 읽는다.
- `extract_field_labels()`로 `<label for="...">`를 추출하고, `extract_row_header()`로 `<th>`를 읽는다.
- 따라서 "레거시 폼을 권위 출처로 삼는다"는 방향 자체는 이미 코드에 녹아 있다.

근거:

- `/Users/neojins/workspace/gnuboard5/php/scripts/extract_admin_schema.py:139-143`
- `/Users/neojins/workspace/gnuboard5/php/scripts/extract_admin_schema.py:281-300`

### 2순위: 표준 명명 규칙 / 명시적 매핑

**부분 반영**

- 현재 구현에는 전역 표준 명명 사전은 없다.
- 대신 `schema-domains.json`의 `field_overrides`, `source_field_map`으로 도메인별 명시적 보정만 한다.
- 즉 "표준 명명 규칙 허용"은 현재도 가능하지만, **코드/문서 차원의 명시적 매핑표**로 제도화되어 있지는 않다.

근거:

- `/Users/neojins/workspace/gnuboard5/php/api/v1/Admin/Schema/schema-domains.json:17-120`

### 3순위: 불명 시 `FIXME_필드명`

**미반영**

- 현재 추출기는 라벨을 못 찾으면 `FIXME_필드명`이 아니라 그냥 raw field name을 넣는다.
- `build_row_candidates()`에서는 `row_header or normalized_name`
- 최종 field_map fallback에서도 `"label": field`

근거:

- `/Users/neojins/workspace/gnuboard5/php/scripts/extract_admin_schema.py:299-315`
- `/Users/neojins/workspace/gnuboard5/php/scripts/extract_admin_schema.py:430-440`

의미:

- 현 상태는 "환각을 줄이는 보수적 fallback"이긴 하지만, **감사 가능성이 떨어진다.**
- `FIXME_`가 없으면 raw field name이 "정상 라벨"인지 "미해결 fallback"인지 diff/grep만으로 구분하기 어렵다.

### 4순위: 누락 0건 강제

**감사 차원에서만 부분 반영**

- PHP/Rust 감사 워크플로에는 Legacy DB ↔ Schema ↔ Rust 비교가 이미 있다.
- 하지만 현재는 "라벨 provenance 무결성"과 "raw label / FIXME 상태"를 별도 품질 게이트로 보지 않았다.

근거:

- `/Users/neojins/workspace/gnuboard5/php/.agent/workflows/field-parity-audit.md`
- `/Users/neojins/workspace/gnuboard5/rust/.agent/workflows/codex-audit.md`

---

## 이번 차수 문서/워크플로 반영

코드 수정 없이, 감사/문서 기준만 먼저 반영했다.

반영 파일:

1. `/Users/neojins/workspace/gnuboard5/php/.agent/workflows/field-parity-audit.md`
   - `label/title` provenance 우선순위 추가
   - raw label / `FIXME_` 검출 단계 추가
2. `/Users/neojins/workspace/gnuboard5/php/.agent/workflows/audit.md`
   - 일반 감사 체크리스트에 schema label provenance 항목 추가
3. `/Users/neojins/workspace/gnuboard5/rust/.agent/workflows/rust-php-parity-audit.md`
   - Rust/PHP parity 감사에 metadata provenance + UI hard gate 점검 추가
4. `/Users/neojins/workspace/gnuboard5/rust/.agent/workflows/codex-audit.md`
   - Codex 사후 감사에 `label` provenance / raw label / `FIXME_` / UI hard gate 점검 추가

효과:

- 앞으로는 "schema 구현 완료" 판정을 내리기 전에
  - `label == field`
  - `FIXME_필드명`
  - schema fetch 실패 시 UI 숨김
  이 세 가지를 반드시 같이 보게 된다.

---

## P1: schema failure 시 화면이 통째로 막히는 도메인

아래 화면들은 schema fetch 실패, 로딩, `null` 상태에서 작업면을 숨긴다.

1. `/environment/basic-config`
2. `/environment/menus`
3. `/environment/popups`
4. `/members/manage`
5. `/members/manage/:mbId`
6. `/members/polls`
7. `/boards/manage`
8. `/boards/groups`
9. `/boards/contents`
10. `/boards/faqs`

대표 증적 파일:

- `/Users/neojins/workspace/gnuboard5/rust/g5-admin/src/features/boards/BoardWorkspace.tsx`
- `/Users/neojins/workspace/gnuboard5/rust/g5-admin/src/features/board-groups/AdminBoardGroupsPage.tsx`
- `/Users/neojins/workspace/gnuboard5/rust/g5-admin/src/features/contents/AdminContentsPage.tsx`
- `/Users/neojins/workspace/gnuboard5/rust/g5-admin/src/features/faqs/AdminFaqsPage.tsx`
- `/Users/neojins/workspace/gnuboard5/rust/g5-admin/src/features/members/MemberDetailCard.tsx`
- `/Users/neojins/workspace/gnuboard5/rust/g5-admin/src/features/menus/MenuWorkspace.tsx`
- `/Users/neojins/workspace/gnuboard5/rust/g5-admin/src/features/polls/PollWorkspace.tsx`
- `/Users/neojins/workspace/gnuboard5/rust/g5-admin/src/features/popups/PopupWorkspace.tsx`

영향:

- PHP `/admin/schema`가 잠깐만 흔들려도 form label 품질 저하가 아니라 **작업 불가**로 이어진다.
- 기존 감사가 말한 "fallback label로 동작"과 실제 체감 사이 괴리가 여기서 발생한다.

---

## P1: schema가 아예 없는 주요 편집/설정 화면

아래는 canonical route 기준에서 편집/설정 성격이 강하지만 `/admin/schema`를 전혀 소비하지 않는 주요 화면들이다.

1. `/environment/auth`
2. `/environment/theme`
3. `/environment/mail-test`
4. `/members/mails`
5. `/members/points`
6. `/boards/qa-config`
7. `/sms/config`
8. `/sms/messages`
9. `/sms/templates`
10. `/sms/contact-groups`, `/sms/contacts`, `/sms/contact-files`

대표 증적:

- `/Users/neojins/workspace/gnuboard5/rust/g5-admin/src/features/permissions/PermissionFormFields.tsx:11-31`
  - 라벨이 `mb_id`, `au_menu`, `au_auth` raw field name 그대로다.
- `/Users/neojins/workspace/gnuboard5/rust/g5-admin/src/features/theme/ThemeWorkspace.tsx:50-63`
  - 테마 설정 폼은 로컬 하드코딩 라벨만 사용한다.
- `/Users/neojins/workspace/gnuboard5/rust/g5-admin/src/features/system/AdminSmsConfigPage.tsx:201-260`
  - SMS 설정 주요 필드가 전부 로컬 라벨이다.
- `/Users/neojins/workspace/gnuboard5/rust/g5-admin/src/features/sms-messages/AdminSmsMessagesPage.tsx:148-205`
  - SMS 발송 폼이 schema 없이 로컬 라벨만 사용한다.
- `/Users/neojins/workspace/gnuboard5/rust/g5-admin/src/features/mails/AdminMailsPage.tsx:344-415`
  - 메일 발송/대상 설정 폼이 schema 없이 로컬 라벨만 사용한다.

판정:

- **형님이 말한 "클라이언트 표시용 제목" 체계가 아직 도메인 전반으로 확장되지 않았다.**
- 현재는 "일부 10개 domain만 schema-driven, 나머지는 화면별 수작업" 상태다.

---

## P2: raw field name / 내부 키가 그대로 노출되는 화면

정적 grep 기준으로 snake_case/raw key 라벨이 확인된 파일은 최소 `16`개다.
테스트 파일 제외 전형 사례:

1. `permissions/PermissionFormFields.tsx`
   - `mb_id`, `au_menu`, `au_auth`
2. `mail-test/AdminMailTestPage.tsx`
   - `mail_log_id`
3. `mails/AdminMailsPage.tsx`
   - `last_option`, `preview_html`
4. `members/AdminMemberFilesPage.tsx`
   - `search_field`, `request_id`, `correlation_id`
5. `points/AdminPointsPage.tsx`
   - `summary.mb_id`, `summary.total_point`, `selected_po_ids`
6. `qa-config/AdminQaConfigPage.tsx`
   - `qa_id`
7. `system-tools/AdminPhpInfoPage.tsx`
   - `php_version`, `loaded_ini`, `server_request_id`
8. `system-tools/AdminBrowscapPage.tsx`
   - `cache_exists`, `pending_visit_count`, `plugin_path`
9. `visits/AdminVisitSearchPage.tsx`
   - `date_from`, `date_to`, `request_id`
10. `visits/AdminVisitDeletePage.tsx`
   - `deleted_rows`, `date_from`, `date_to`
11. `visits/AdminVisitStatsPage.tsx`
   - `total_visits`, `active_days`, `visit_rows`

주의:

- 이 수치는 "완전한 사용자 라벨 품질 감사"가 아니라 **raw key 노출 하한선**이다.
- 실제로는 raw key가 아니더라도 schema 없이 로컬 한글 라벨로 굳은 화면이 더 많다.

---

## 왜 앱 화면이 엉성하게 보이는가

현재 체감 품질 저하 원인은 세 가지가 겹친다.

1. **schema dependency가 강한 화면은 실패 시 통째로 숨긴다**
   - 그래서 일부 화면은 "스키마 없어서 안 나오는" 인상이 강하다.

2. **schema가 없는 도메인은 페이지별 로컬 하드코딩으로 버틴다**
   - 라벨 일관성, 설명, 옵션 텍스트의 SSOT가 없다.

3. **일부 화면은 내부 필드명/응답 키를 그대로 라벨로 쓴다**
   - `mb_id`, `qa_id`, `request_id`, `date_from` 같은 표현이 UI로 새어 나온다.

따라서 현재 상태는 "REST endpoint는 연결됐지만, 레거시 관리자 폼의 정보 설계가 아직 API metadata로 승격되지 않은 절반 이행 상태"로 보는 것이 정확하다.

---

## 시정 우선순위

### P1

1. schema-backed 9개 route component의 **hard gate 제거**
   - schema 오류 시 폼을 숨기지 말고 fallback label로 계속 렌더링해야 한다.
2. `/admin/schema` domain 확장
   - 우선순위: `auth/permissions`, `theme`, `sms-config`, `sms-messages`, `sms-templates`, `sms-contacts`, `mails`, `points`, `qa-config`
3. PHP 추출기의 fallback 정책 명문화 및 구현
   - `extract_admin_schema.py`가 라벨 미확정 시 raw field name 대신 `FIXME_필드명`을 남기도록 바꿔야 한다.
   - 동시에 표준 명명 규칙 허용 범위는 명시적 매핑표/override로만 관리해야 한다.
4. raw field label 제거
   - 최소한 `mb_id`, `au_menu`, `au_auth`, `qa_id`, `date_from`, `date_to` 같은 사용자 노출 key는 즉시 치환해야 한다.

### P2

1. OpenAPI `title` vs `/admin/schema.label` 계약 정리
   - 현재 시스템은 `label`을 클라이언트 SSOT로 쓰므로, 향후 OpenAPI field `title`을 추가하더라도 두 값의 provenance와 동기화 책임을 문서로 먼저 고정해야 한다.
2. 운영/통계 화면의 meta card label 정리
   - `request_id`, `correlation_id`, `server_request_id`는 개발모드/진단영역으로만 제한하는 편이 맞다.
3. field metadata audit 워크플로 보정
   - route coverage와 UI blocking 여부를 같이 보지 않으면 또 "완료" 오판이 난다.

---

## 한 줄 결론

> **REST endpoint parity는 양호하지만, 레거시 관리자 필드 제목/스키마 체계는 아직 전면 적용 전입니다. 현재 앱의 문제는 "API가 없음"보다 "schema rollout 부족 + schema 실패 시 hard block"이 더 큽니다.**
