---
doc_type: governance
status: active
owner: rust-admin
source_of_truth: false
ai_default_include: true
last_reviewed: 2026-03-13
review_cycle_days: 30
bounded_context: integration
---
# 통합 감사 표준

## 목적

이 프로젝트의 routine 활성 범위는 `php`, `rust`이므로, 저장소별 CI만으로는 PHP 변경이 Rust를 깨뜨렸는지 자동으로 보장되지 않습니다.  
이를 보완하기 위해 **통합 PHP-Rust 감사**를 단일 표준 절차로 사용합니다.
보관 상태인 `flutter`, `web`는 routine 감사에서 제외하며, 필요할 때만 별도 참고 대상으로 다룹니다.

## 단일 진실원본

감사 결과의 SSOT는 아래 둘뿐입니다.

1. `/Users/neojins/workspace/gnuboard5/rust/scripts/run_integrated_audit.py`
2. 이 스크립트가 생성한 `output/integrated-audit/latest.json`, `latest.md`

수기 Markdown 보고서, 수기 개수 표기, "대충 맞음" 식 서술은 감사 근거로 인정하지 않습니다.

도메인 rename/aggregate/local-only 예외는 [`PROVIDER_DOMAIN_TO_RUST_FEATURE_MAP.md`](/Users/neojins/workspace/gnuboard5/rust/specs/integration/PROVIDER_DOMAIN_TO_RUST_FEATURE_MAP.md)를 기준으로 해석합니다.

## 표준 summary 형식

- generated `latest.md`, `latest.json`, CI step summary는 모두 같은 summary naming을 사용합니다.
- 공통 섹션:
  - `Failure`
  - `Warning`
  - `Note`
  - `Evidence`
- 통합 감사는 waiver를 별도로 운영하지 않으므로 `Waived`는 기본적으로 빈 배열을 유지합니다.
- Rust 소비자 backlog가 provider blocker로 막혀 있으면, 통합 감사는 blocker registry와 generated handoff artifact를 `Note/Evidence`와 별도 handoff section으로 함께 싣습니다.
- PHP 공급자 쪽 staging/upstream blocker가 존재하면, 통합 감사는 PHP blocker registry도 별도 handoff section으로 함께 싣습니다.
- PHP 구조 감사 generated artifact가 존재하면, 통합 감사는 `php/output/php-structure-audit/latest.{md,json}` 요약도 별도 handoff section으로 함께 싣습니다.
- PHP `/admin/schema` provider readiness generated artifact가 존재하면, 통합 감사는 `php/output/admin-schema-provider-readiness/latest.{md,json}` 요약과 blocked feature backlog도 별도 handoff section으로 함께 싣습니다.

---

## 감사 방법론

업계 표준 방법론을 기반으로 다음 기술을 채택합니다.

### 채택 방법론

| 방법론 | 적용 영역 | 비고 |
|--------|-----------|------|
| **Strangler Fig Migration Audit** | PHP 레거시 → REST API 구현 커버리지 | `schema-domains.json`의 `legacy_forms[].path` 활용 |
| **Bi-directional Contract Testing** | PHP OpenAPI ↔ Rust 필드명 정합성 | Provider spec ↔ Consumer type 양방향 비교 |
| **Consumer-Driven Contract Testing (CDCT)** | 소비 주체별 도메인 한정 감사 | Rust는 `/admin/*`만 |
| **OpenAPI Schema Validation** | 정적 계약 무결성 | spec 파일 기준 정적 검증 |

### 미채택 (과도하거나 현 규모에 불필요)

| 방법론 | 미채택 사유 |
|--------|------------|
| Pact Broker | 소비자 2~3개 규모에서 단일 스크립트로 충분 |
| Runtime Shadowing | 레거시와 새 API 동시 실행 비교 — 인프라 비용 대비 효과 낮음 |

---

## 검사 범위 (3 계층)

### Level 1: 빌드/테스트 검증

#### PHP
- `composer run schema:check`
- `composer run contract:check`
- `vendor/bin/phpunit tests/Admin/Schema/AdminSchemaServiceTest.php tests/contract/AdminSchemaContractTest.php`

#### Rust
- `cd g5-admin && bun run contract:check`
- `cd g5-admin && bun x tsc --noEmit`
- `cd g5-admin && bun run lint`
- `cargo check --manifest-path g5-admin/src-tauri/Cargo.toml`
- `cd g5-admin && bun run test:coverage:critical`

### Level 2: 교차 정합성 (Path + Operation 수준)

| 비교 | 소스 A | 소스 B | 수준 |
|------|--------|--------|------|
| Admin Path 집합 비교 | PHP OpenAPI `/admin/*` paths | Rust `commands/*.rs` path 문자열 | path |
| **Admin Operation 비교** | PHP OpenAPI (path + HTTP method) | Rust commands (path + method 추론) | **path + method** |
| Schema Domain 비교 | PHP `schema-domains.json` domains | Rust `useAdminFieldSchema` type union | domain name |
| PHP generated schema 품질 | raw label count, FIXME label count | raw label 0은 failure 기준, `FIXME_`는 추적 warning 기준 | label |
| PHP legacy DB parity | `gnuboard5.sql` CREATE TABLE 컬럼 | `generated/{domain}.json` 필드 | column |

### Level 3: 필드 수준 정합성

| 비교 | 소스 A | 소스 B | 방향 |
|------|--------|--------|------|
| **응답 필드 정합성** | PHP OpenAPI `components/schemas` properties | Rust `ts-rs` 생성 TypeScript type 필드 | PHP → Rust |
| **요청 필드 정합성** | PHP OpenAPI requestBody properties | Rust model struct 필드 | Rust → PHP |
| Admin schema 필드 | PHP generated schema 필드 | Rust `useAdminFieldSchema` 소비 도메인 | PHP → Rust |

- 응답 필드 감사는 Rust가 의도적으로 flatten한 envelope를 정규화해서 비교한다.
  - 예: OpenAPI `data/meta/pagination` ↔ Rust `items|board|boards|catalog|schema + request_id/correlation_id/server_request_id`
- Rust 타입이 레거시 parity 수용을 위해 `extra` 확장 버킷을 두는 경우, 해당 확장 필드는 warning으로 세지 않는다.

### 레거시 커버리지 감사 (Strangler Fig)

| 비교 | 소스 A | 소스 B |
|------|--------|--------|
| **레거시 매핑 존재** | `schema-domains.json`의 `legacy_forms[].path` | `adm/` 디렉토리 실제 파일 |
| **미등록 레거시 감지** | `adm/*_form.php`, `*_list.php` 등 관리 파일 | `schema-domains.json` 등록 여부 |
| **도메인별 API 커버리지** | domain에 매핑된 legacy form 수 | domain에 대응하는 OpenAPI 엔드포인트 수 |

- 레거시 커버리지는 아래 4분류로 나눠 본다.
  - `schema-domains.json`에 직접 등록된 schema-bearing form
  - API로 이미 대체된 legacy entrypoint
  - update/delete/export/load/search 같은 보조 helper 스크립트
  - 웹 전용/명시적 비대상 파일
- warning은 위 3분류를 제외하고도 남는 `실제 미등록 entrypoint`만 대상으로 한다.

---

## 실패 조건

### 기존 (유지)
- 실행 명령 하나라도 실패
- PHP OpenAPI admin path ↔ Rust admin path 불일치
- PHP schema domain ↔ Rust schema domain 불일치
- PHP generated schema에 raw label 또는 `FIXME_` 라벨 존재
- PHP generated schema와 legacy DB 컬럼 parity gap 존재
### 추가 (Level 2 — Operation)
- PHP OpenAPI admin operation (path + method) 중 Rust에 없는 것 존재
- Rust admin operation 중 PHP OpenAPI에 없는 것 존재

### 추가 (Level 3 — Field)
- PHP OpenAPI 응답 schema 필드 중 Rust TS type에 없는 것 존재 (warning)
- Rust TS type 필드 중 PHP OpenAPI에 없는 것 존재 (warning)

### 추가 (Legacy Coverage)
- `adm/` 관리 파일 중 API 커버/보조 helper/웹 전용 분류에도 들지 않는 실제 미등록 entrypoint (warning)
- `schema-domains.json`의 `legacy_forms[].path` 파일 중 `adm/`에 존재하지 않는 것 (error)

> **Note**: 신규 추가 항목 중 Field 수준과 Legacy Coverage는 초기에는 **warning** 수준으로 운영하고, 안정화 후 **error**로 격상한다. 현재 스크립트도 이 기준에 맞춰 warning은 보고서에 남기되 exit code 실패 사유로는 취급하지 않는다.

---

## 소비 주체별 감사 범위

| 소비 주체 | 소비 도메인 | 감사 대상 |
|-----------|-------------|-----------|
| **Rust Admin** | `/admin/*` | Path + Operation + Field 정합성 |

---

## 사용법

```bash
cd /Users/neojins/workspace/gnuboard5/rust
python3 ./scripts/run_integrated_audit.py \
  --rust-root /Users/neojins/workspace/gnuboard5/rust \
  --php-root /Users/neojins/workspace/gnuboard5/php
```

결과물:

- `/Users/neojins/workspace/gnuboard5/output/integrated-audit/latest.json`
- `/Users/neojins/workspace/gnuboard5/output/integrated-audit/latest.md`

## 강제 규칙

### 로컬
- PHP / Rust 중 하나라도 계약, 엔드포인트, schema, field label, generated artifact 를 바꿨으면 배포 전에 통합 감사 필수
- 감사 보고는 generated Markdown 기준으로만 작성

### CI
- Rust 저장소의 `integrated-php-rust-audit.yml` 이 두 저장소를 함께 체크아웃해서 통합 감사를 수행
- CI artifact 로 생성 보고서를 업로드
- 통합 감사 실패 시 merge / 배포 금지

## 운영 원칙

- `UPDATABLE_FIELDS`만이 계약의 전부가 아닙니다. 읽기 전용 컬럼 parity 는 `/admin/schema`가 책임집니다.
- OpenAPI codegen은 호출 계약 SSOT이고, 관리자 필드 label SSOT는 `/admin/schema` 입니다.
- 감사 문서에 수기 숫자를 적지 말고 generated report 값을 그대로 인용합니다.
- 신규 감사 계층(Operation, Field, Legacy Coverage)은 warning → error 단계적 적용을 원칙으로 합니다.
- GitHub Actions step summary도 generated report와 같은 `Failure / Warning / Note / Evidence` 제목을 사용합니다.
- Rust 쪽에서 provider blocker가 존재하면 `specs/audits/BLOCKERS.toml`과 `output/form-metadata-blockers/latest.{md,json}`를 통합 감사 증적에 함께 노출해 책임 소재를 분리합니다.
- PHP 쪽에서 staging/upstream blocker가 존재하면 `docs/audits/BLOCKERS.toml`를 통합 감사 증적과 handoff section에 함께 노출해 공급자 책임과 운영 대기 상태를 분리합니다.
- PHP 쪽에서 구조 감사 generated artifact가 존재하면 `output/php-structure-audit/latest.{md,json}`를 통합 감사 증적과 handoff section에 함께 노출해 provider 구조 warning/budget 상태를 재사용합니다.
- PHP 쪽에서 schema provider readiness generated artifact가 존재하면 `output/admin-schema-provider-readiness/latest.{md,json}`를 통합 감사 증적과 handoff section에 함께 노출해 provider `/admin/schema` rollout 상태와 blocked feature queue를 분리합니다.
- Rust 활성 소비 범위 밖의 provider-only surface는 `specs/integration/ACTIVE_CONSUMER_SCOPE.json` registry로 관리하며, 여기에 등록된 path/schema domain/operation gap은 parity failure가 아니라 note/evidence와 handoff section으로만 보고합니다.
