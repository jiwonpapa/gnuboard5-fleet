---
doc_type: schema
status: active
owner: rust-admin
source_of_truth: true
canonical_for: document metadata schema
ai_default_include: true
last_reviewed: 2026-03-13
review_cycle_days: 30
bounded_context: global
---
# 문서 메타데이터 스키마

이 문서는 `rust` 프로젝트 문서 frontmatter 스키마의 정본입니다.

## 1. 형식

모든 active-scope 문서는 Markdown 본문 앞에 YAML frontmatter를 둡니다.

```yaml
---
doc_type: governance
status: active
owner: rust-admin
source_of_truth: true
ai_default_include: true
last_reviewed: 2026-03-13
review_cycle_days: 30
bounded_context: global
---
```

## 2. 필수 필드

### `doc_type`

문서 종류를 나타냅니다.

허용값:

- `constitution`
- `governance`
- `strategy`
- `index`
- `roadmap`
- `work_registry`
- `history`
- `context_entry`
- `schema`
- `policy`
- `workflow`
- `support`

### `status`

문서 수명 상태입니다.

허용값:

- `draft`
- `active`
- `deprecated`
- `superseded`
- `archived`

### `owner`

문서 소유자입니다. 예:

- `rust-admin`
- `php-api`
- `auth-domain`

### `source_of_truth`

이 문서가 특정 사실의 정본인지 나타냅니다.

- `true`
- `false`

### `ai_default_include`

AI 기본 참조 대상 여부입니다.

- `true`
- `false`

### `last_reviewed`

마지막 검토 날짜입니다.

- 형식: `YYYY-MM-DD`

### `review_cycle_days`

재검토 주기 일수입니다.

- 양의 정수
- 주기 초과는 문서 감사 경고입니다. 필수 메타데이터 누락, 중복 SSOT, archive/status drift처럼 현재 판단을 깨는 위반만 실패로 처리합니다.

## 3. 선택 필드

### `bounded_context`

적용되는 bounded context입니다.

예:

- `global`
- `foundation`
- `members`
- `boards`
- `multisite`

### `supersedes`

대체하는 문서 경로입니다.

예:

- `specs/archive/2026-03-01-OLD_PLAN.md`

### `canonical_for`

정본 대상 사실을 짧게 설명합니다.

예:

- `audit operating system`
- `document lifecycle policy`

### `related_crates`

관련 crate나 surface를 쉼표 구분 문자열로 기록합니다.

예:

- `g5-admin-models,g5-admin/src-tauri`

## 4. 규칙

- `source_of_truth: true`면 `status: active`여야 합니다.
- `source_of_truth: true`면 `canonical_for`를 반드시 가져야 합니다.
- `status`가 `deprecated`, `superseded`, `archived`면 `ai_default_include: false`여야 합니다.
- 새 문서를 만들 때 메타데이터가 없으면 active 문서로 승격하지 않습니다.
- 메타데이터는 문서 본문보다 먼저 업데이트되어야 합니다.

## 5. 점진 이행

현재는 active-scope 문서(`.agent/sub-constitutions`, `.agent/workflows`, `specs/*`, `specs/codex/*`, `specs/foundation/*`, `specs/domains/*`, `specs/integration/*`, `specs/audits/README.md`)에 메타데이터를 강제합니다.
archive, 과거 감사, 오래된 지원 문서는 점진 이행 대상으로 둡니다.
