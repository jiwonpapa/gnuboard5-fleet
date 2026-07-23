# 감사 운영 시스템

이 문서는 `php` 프로젝트의 **감사 운영 SSOT**입니다.
헌법이 원칙을 정의한다면, 이 문서는 그 원칙을 **어떤 감사, 어떤 순서, 어떤 증적, 어떤 blocker 관리 방식**으로 집행할지 정의합니다.

## 1. 목적

본 프로젝트의 성공은 단순 구현 속도가 아니라, **bounded context·공개 계약·데이터 소유권·레거시 오염 방지 규칙을 지속적으로 강제하는 체계적 감사 프로세스**에 달려 있습니다.

PHP 프로젝트에서 감사는 아래를 상설 강제해야 합니다.

- OpenAPI와 실제 라우트 드리프트 방지
- `/admin/schema`와 레거시 관리자 폼 의미 드리프트 방지
- Service/Repository/adapter 경계 유지
- shared gateway allowlist와 local contract source-of-truth 유지
- 레거시 전역/env/common.php 접근의 허용 지점 고정
- 문서 SSOT와 코드 상태 정합성 유지

### 1.1 `API_PIPELINE_AUDIT_V1` 공급자 계약

`API_PIPELINE_AUDIT_V1`은 PHP REST API가 Rust/Tauri 관리자 앱에 전달되는 전 구간을 **누락 없이 증명하기 위한 1차 완료 계약**입니다. 현재 미구현 capability는 Failure로 남기며 완료로 선언하지 않습니다. PHP 저장소는 아래 앞단의 소유자입니다.

`레거시 관리자 입력·DB 의미 -> 선언 route graph -> 실제 Slim runtime route/handler -> OpenAPI operation -> request/response/schema field -> Rust handoff`

공급자 감사 범위와 기준은 다음과 같습니다.

- 권위 계약은 `api/docs/openapi.yaml`이며 Swagger UI나 생성 스냅샷은 보조 증적입니다.
- `scripts/docs-check.sh`는 token으로 해석한 도달 가능 include **선언 graph**입니다. `scripts/extract_runtime_route_graph.php`는 DB 요청 없이 실제 Slim RouteCollector를 감사 프로필로 부팅한 **로컬 runtime 등록 graph**입니다. 선언 graph, 로컬 runtime graph, live 배포 route 증거를 서로 같은 증거로 부르지 않습니다.
- route/OpenAPI scanner는 OpenAPI 표준 operation key 8개(`GET/PUT/POST/DELETE/OPTIONS/HEAD/PATCH/TRACE`)를 모두 보며, 동적·연결식 route path처럼 정적으로 해석하지 못한 선언은 누락시키지 않고 Failure로 처리합니다.
- 활성 소비 범위의 PHP 진실 원본은 `api/docs/openapi.phase1-consumer-scope.json`입니다. 서로 다른 path를 alias로 합치지 않으며 `/admin/*` non-shop 관리자 operation `184`개와 인증·상태 bootstrap `5`개, 총 `189`개입니다. 감사 정책 파일은 이 범위를 중복 선언하지 않고 같은 파일을 참조해야 합니다.
- 전체 OpenAPI `312` operation의 method+path 집합 SHA와 분류별 개수는 축소 금지 contract inventory입니다. operation 삭제·추가·교체 또는 분류 개수 변화는 소비 여부와 무관하게 Failure입니다.
- `/admin/boards/*`는 관리자 게시판 관리 기능이므로 active입니다. 일반 게시판 `/boards`, `/boards/*`, `/files/*`, `/polls/*`의 exact `26` operation은 1차 소비만 deferred이지만, 향후 게시판 소비 가능성을 보존하기 위해 provider/runtime/field 감사의 protected hard gate로 유지합니다. `/admin-inspect/*`와 기타 비관리자 API만 deferred evidence로 남깁니다.
- 쇼핑몰 API 소비는 기본 범위에서 제외하지만, 레거시 분류에서는 `adm/shop_admin/**/*.php`를 재귀적으로 포함합니다. `shop/` 제외 규칙을 `adm/shop_admin/` 제외로 확대 해석하면 안 됩니다.
- 요청은 path/query/header/cookie/body 위치, required, media type, 필드명, 타입, format, nullable, default, enum을 비교합니다.
- 응답은 status별 schema, envelope, 필드명·타입, nullable과 RFC 7807 오류 계약을 비교합니다.
- `api/docs/openapi.audit-policy.json`은 공통 소비 범위 참조, 공개 쓰기 허용, 내부 보안 scheme, named/closed request-response, 오류·rate-limit·민감 필드 기준의 machine-readable 정책입니다.
- `api/docs/openapi.field-binding-policy.json`은 같은 공통 소비 범위 참조, PHP source root, 필수 Controller/Service/Repository 계층과 `/health` route closure 예외를 고정합니다.
- `composer run audit:openapi-provider`는 범용/무필드 성공 응답, 열린 anonymous request, required ambiguity, path parameter 변질, 오류 media/status/header, plugin license, 인증 없는 쓰기를 Failure로 냅니다.
- `composer run audit:runtime-routes`는 실제 Slim 등록 결과의 method/path/handler/middleware, 명시적 `withStatus()`, `201 Location` 응답 선언을 OpenAPI와 대조하며, active handler 미해석·중복·route 누락·security/response 의미 불일치를 Failure로 냅니다. deferred 항목도 누락하지 않고 별도 배열과 분류별 수치로 기록합니다.
- `composer run audit:openapi-field-bindings`는 저장된 runtime binding에서 handler FQCN/source를 찾아 PHP AST로 Controller→Service→Repository 호출을 따라가며 실제 request field read, type/default/enum 증거, success response field와 동적·미해석 전달을 대조합니다.
- `composer run quality-gate`는 semantic audit, runtime graph, field binding, 선언 route/docs 검사를 모두 실행하고 하나라도 실패하면 이후 품질 단계를 진행하지 않습니다.
- `/admin/schema`는 domain/section/field 이름뿐 아니라 `input_type`, `data_type`, `required`, `readonly_on_update`, `default_value`, `options`, `option_source`까지 소비자에게 전달되는지 확인합니다.
- 현재 구현된 공급자 증거는 선언 route graph, 로컬 Slim runtime route/handler/middleware/201-Location graph, OpenAPI semantic policy, contract manifest의 parameter/security/media/error/header fingerprint, route·response·manifest mutation, operation별 PHP field-flow AST, 17-domain manifest, `adm/**/*.php` 254개 파일별 inventory입니다. 현재 로컬 runtime은 OpenAPI `312` operation과 handler를 결합하고 active `189`개와 protected 일반 게시판 `26`개를 검사합니다. 두 범위의 route/security/response-contract finding은 0건이며 `/admin-inspect/*` deferred route 누락 3건과 security 차이 3건은 별도 증거로 남습니다.
- OpenAPI의 429·500 공통 오류 응답은 `312/312` operation에 고정하며, 게시판 다운로드 2개는 실제 runtime header와 binary body를 계약으로 표현합니다.
- OpenAPI 공급자 의미 감사의 현재 PHP 로컬 기준선은 blocking `0`, deferred `17`, `/admin/shop/*` excluded `29`, `certified=true`입니다. active `189`와 protected 일반 게시판 `26`의 named/closed request, 구체 success response, required/envelope, 오류·status·media·header 계약이 hard gate를 통과합니다. deferred/excluded finding은 성공 수치에 섞거나 삭제하지 않고 별도 증거로 보존합니다.
- field binding 하네스는 active `189` + protected 일반 게시판 `26`, exact `215` operation을 보고하며 현재 `215 passed / 0 failed`, `0 findings`, `certified=true`입니다. Controller→Service→Repository 입력·타입·default·enum·응답 필드 증거가 모두 결합됐습니다. 이는 로컬 PHP 공급자 인증이며 live provider identity/write-readback과 Rust 소비 aggregate를 포함한 최종 파이프라인 인증은 아닙니다.
- 아직 구현되지 않은 증거는 live provider revision/OpenAPI SHA 결합과 실제 API write/readback입니다. 이 capability는 계속 Failure/Blocked이며 완료로 계산하지 않습니다.

아래 상태가 Phase 1 active operation, protected 일반 게시판 operation 또는 공통 계약에서 발생하면 warning이나 note가 아니라 모두 **Failure**입니다. 그 외 deferred/excluded surface의 동일 finding은 증거에서 제거하지 않되 1차 hard gate를 차단하지 않습니다.

- active 선언 route 또는 실제 runtime route와 OpenAPI 사이의 누락·초과·method/path/handler 불일치
- route module include 제거 후에도 검사가 통과하는 상태
- request/response/schema field 불일치 또는 비교 대상 0건
- 범용/무필드 성공 schema, 열린 anonymous request schema, required/nullable/default/enum 의미가 검증되지 않은 상태
- active runtime middleware와 OpenAPI security, active plugin protected path와 라이선스 응답 의미가 다른 상태
- 명시적 runtime status가 OpenAPI에 없거나, `201 Created`에 Location 계약이 없거나 OpenAPI와 실제 handler의 Location 선언이 다른 상태
- `adm/shop_admin`을 포함한 레거시 관리자 PHP 파일의 미분류
- child command 실패를 무시하거나 이전 `latest.*`/`pipeline-summary.json`을 재사용한 상태
- `blocked`, `skipped`, `stale`, `scanner_zero`를 완료로 계산한 상태

이번 1차 범위는 PHP 공급자 하네스까지입니다. Rust/Tauri aggregate와 live/browser 입력을 결합한 교차 진입점은 Rust 저장소의 별도 변경·검증·커밋 없이 PHP CI에 선반영하지 않습니다. 최종 인증은 후속 교차 하네스가 PHP와 Rust revision, 입력 hash, 고유 run artifact를 같은 실행에 결합하고 실제 API write/readback·live provider identity까지 확인한 경우에만 유효합니다.

### 1.2 감사 하네스 언어 경계와 자체 품질 게이트

- Python은 감사 orchestration, JSON/OpenAPI 비교, current-run 산출물 검증과 보고를 소유합니다.
- PHP token/AST/runtime 의미 분석은 독립 PHP CLI·라이브러리가 소유하며 Python은 구조화된 결과만 소비합니다.
- Shell은 환경 준비와 호환 진입점만 소유하고, Python/PHP 정책 본문을 heredoc으로 새로 추가하지 않습니다.
- `composer run audit:harness`는 Python 하네스 전체 회귀 테스트, 신규·분리 모듈의 Ruff/Mypy, 변경된 Shell 진입점의 ShellCheck를 실행합니다. 이 gate가 실패하면 통합 감사와 로컬 CI는 진행하지 않습니다.
- scanner 입력이 0건이거나 schema 구조를 해석할 수 없는 상태는 정상 빈 결과가 아니라 Failure입니다.

PHP 공급자 단독 진입점과 증적은 다음과 같습니다.

- `composer run audit:openapi-provider` -> `output/openapi-provider-audit/latest.{json,md}`
- `composer run audit:runtime-routes` -> `output/openapi-provider-audit/runtime-route-graph.json`
- `composer run audit:openapi-field-bindings` -> `output/openapi-field-binding/latest.{json,md}`
- `composer run contract:check` -> parameter/security/server/media type/header와 재귀 `$ref`까지 포함한 `api/docs/openapi.contract-manifest.json`

live/browser 증적은 command exit와 manifest 존재만으로 통과하지 않습니다. domain/run-id/target/final URL이 일치하고 snapshot·console·network artifact가 실제로 존재하며, 로그인·404·fatal DOM, uncaught console, 4xx/5xx network evidence가 없어야 합니다. domain row별 status/exit/current-run과 top count가 다르면 aggregate가 실패합니다.

## 2. 권한 계층

1. `.agent/Constitution.md`
   - 최고 규범입니다.
   - 금지/허용, 불변식, 개발 철학을 정의합니다.
2. `docs/AUDIT_SYSTEM.md`
   - 감사 운영 규정입니다.
   - 감사 종류, 실행 순서, blocker 관리, 산출 형식을 정의합니다.
3. `docs/AUDIT_STRATEGY.md`
   - 감사 선택 매트릭스입니다.
   - 어떤 변경에 어떤 감사를 붙일지 정의합니다.
4. `.agent/workflows/*.md`
   - 사람용 실행 설명서입니다.
   - 독자 규칙을 가지지 않고 상위 문서를 따라야 합니다.
5. `scripts/run_*_audit.sh`, `scripts/check_*.py`
   - 실제 집행 도구입니다.
   - 문서와 다르면 스크립트가 아니라 문서를 먼저 고칩니다.

## 3. 감사 종류와 진입점

| 감사 | 명령 | 목적 | 기본 산출물 |
|------|------|------|------|
| 구현 감사 | `composer run audit:implementation` | 기능 완료 판정 | `docs/audits/AUDIT_REPORT_YYYY-MM-DD.md`, `docs/audits/AUDIT_LATEST.md` |
| 구조 감사 | `composer run audit:structure` | 구조 드리프트, 경계 위반, 레거시 누수 탐지 | `docs/audits/DEEP_AUDIT_YYYY-MM-DD.md`, `output/php-structure-audit/latest.{md,json}` |
| 변경분 hotspot 감사 | `composer run audit:hotspots` | 현재 diff 기준 LOC hotspot, god file 후보를 빠르게 탐지 | `output/php-hotspot-audit/latest.{md,json}` |
| 포팅 정합성 감사 | `composer run audit:porting` | `adm/*.php`와 `/admin/schema` 의미 정합성 확인 | `docs/audits/FIELD_PARITY_AUDIT_YYYY-MM-DD.md` |
| schema provider readiness 감사 | `composer run audit:schema-provider-readiness` | `/admin/schema` provider coverage와 blocked backlog 정합성 확인 | `output/admin-schema-provider-readiness/latest.{md,json}` |
| OpenAPI field binding 감사 | `composer run audit:openapi-field-bindings` | active 189 + protected 일반 게시판 26, exact 215 operation의 OpenAPI field와 PHP 계층별 request/response flow 증거 대조 | `output/openapi-field-binding/latest.{md,json}` |
| 통합 감사 | `composer run audit:integrated` | PHP 공급자 변경이 Rust 소비단을 깨뜨리는지 확인 | `../output/integrated-audit/latest.{md,json}` |
| blocker registry 감사 | `composer run audit:blockers` | `docs/TODO.md` Blocked와 운영 blocker registry 정합성 확인 | 콘솔 요약 |

기본 실행 진입점:

- `composer run audit:auto`는 worktree 변경 파일을 기준으로 `implementation / structure / porting / readiness / integrated / blackbox` 조합을 자동 선택합니다.
- 푸시·릴리스 전 정본 진입점은 `composer run ci:local`입니다. PHP 8.1 production lock 호환성, 하네스 자체 품질, 전체 공급자 품질 게이트, PHP-Rust 통합 감사를 한 번에 실행합니다.
- `composer run hooks:install`은 저장소의 `core.hooksPath`를 `.githooks`로 설정하며, 이후 `pre-push`에서 같은 로컬 CI를 fail-closed로 실행합니다.
- GitHub Actions 검증 workflow는 `workflow_dispatch` 전용 fallback이며 `push`/`pull_request`에서 자동 실행하지 않습니다. 배포 workflow는 별도 수동 운영 경계입니다.
- 변경 범위를 사람이 이미 정확히 알고 있을 때만 개별 `audit:*` 명령을 직접 실행합니다.

## 4. 표준 요약 형식

자동/수기 감사 보고는 가능한 한 아래 형식을 따릅니다.

- `Failure`: 즉시 수정이 필요한 실패 조건
- `Warning`: 진행은 가능하지만 debt나 drift를 남기는 항목
- `Note`: 상태 기록 또는 운영 메모
- `Evidence`: 근거가 되는 파일, 경로, 카운트
- `Blocked`: 외부 credential, staging, upstream provider 부재 등으로 현재 저장소 안에서 닫을 수 없는 항목

원칙:

- `Blocked`는 `Failure`의 완곡한 표현이 아닙니다.
- `Blocked`는 반드시 **owner, upstream, next_action**이 있어야 합니다.
- `Blocked`는 `docs/TODO.md`의 `## Blocked`와 `docs/audits/BLOCKERS.toml`에 동시에 기록됩니다.

### 4.1 증적 로그(`*.log`) 규칙

- 권위 감사 결과는 항상 `docs/audits/*.md`로 남깁니다.
- `*.log`는 watcher 출력, smoke raw log, 배치 실행 캡처 같은 보조 증적일 뿐이며 단독 완료 판정 근거가 아닙니다.
- `.log`를 생성했다면 같은 범위의 `.md` 감사 보고 또는 `docs/HISTORY.md` 기록에서 왜 필요한지 연결돼야 합니다.
- 활성 분석이 끝난 `.log`는 `docs/archive/audits/`로 이동하고, 활성 `docs/audits/`에는 장기 잔존시키지 않습니다.

## 5. Blocker 운영 규칙

### 5.1 SSOT

- 작업 상태 SSOT: `docs/TODO.md`
- blocker registry SSOT: `docs/audits/BLOCKERS.toml`

### 5.2 관리 규칙

- `docs/TODO.md`의 `## Blocked` 항목은 모두 `docs/audits/BLOCKERS.toml`에 있어야 합니다.
- registry에만 있고 `TODO`에 없는 blocker는 stale로 간주합니다.
- blocker는 최소한 아래 필드를 가집니다.
  - `id`
  - `owner`
  - `scope`
  - `upstream`
  - `summary`
  - `next_action`
- blocker가 해소되면 같은 턴에
  - `docs/TODO.md` 상태 이동
  - `docs/audits/BLOCKERS.toml` 제거 또는 상태 갱신
  - `docs/HISTORY.md` 기록
  를 함께 수행합니다.

## 6. 실행 순서

### 6.1 일반 구현

1. `composer run audit:auto` 또는 `composer run audit:implementation`
2. auth/error/support/DTO/OpenAPI/contract path처럼 Rust 소비 의미가 바뀔 수 있는 경로는 `audit:auto`가 `audit:integrated`까지 자동 승격합니다.

### 6.2 구조 리팩터링 또는 단계 마감

1. `composer run audit:auto` 또는 `composer run audit:structure`
2. 필요 시 `composer run audit:implementation`

### 6.2.1 변경분만 빠르게 볼 때

1. `composer run audit:hotspots`
2. dirty worktree가 있으면 현재 변경 파일만 검사합니다.
3. worktree가 깨끗하면 기본으로 `HEAD~1..HEAD`를 검사합니다.
4. 다른 기준점이 필요하면 `python3 ./scripts/run_hotspot_audit.py --base-ref <ref>`를 사용합니다.

원칙:

- `audit:hotspots`는 구조 감사의 축약판이 아니라 **변경분 우선 triage**입니다.
- root/service-repository 임계치와 warning budget을 그대로 재사용합니다.
- 여기서 경고가 없어도 단계 마감 전에는 `audit:structure`를 대체하지 않습니다.

### 6.3 관리자 포팅, `/admin/schema`, generated registry 변경

1. `composer run audit:auto` 또는 `composer run audit:porting`
2. `/admin/schema` provider rollout/backlog를 건드렸다면 `composer run audit:schema-provider-readiness`
3. 필요 시 `composer run audit:integrated`

주의:

- `audit:porting`은 이제 `schema:check + contract:check`뿐 아니라 `./scripts/docs-check.sh`까지 포함해 OpenAPI ↔ Route 드리프트를 함께 막습니다.

### 6.4 문서/운영 체계 변경

1. `./scripts/docs-check.sh`
2. `composer run audit:blockers`
3. 구조 규칙까지 바뀌면 `composer run audit:structure`

## 7. 완료 판정

아래가 충족돼야 완료입니다.

- 해당 변경에 필요한 감사가 모두 실행됨
- 실패 조건이 없음
- blocker가 생겼다면 `TODO + BLOCKERS.toml + HISTORY`가 동시에 갱신됨
- Why가 `docs/HISTORY.md`에 남음
- 구현 감사 결과가 `docs/audits/AUDIT_REPORT_YYYY-MM-DD.md`와 `docs/audits/AUDIT_LATEST.md`에 동기화됨
- 문서 SSOT와 코드 설명이 충돌하지 않음

## 8. 현재 운영 범위

현재 구현된 운영 레지스트리는 아래 둘입니다.

- `docs/audits/BLOCKERS.toml`
- `docs/TODO.md`의 `## Blocked`

### 8.1 예외/경고 레지스트리

현재 PHP 쪽 운영 레지스트리는 아래 넷입니다.

- `docs/audits/BLOCKERS.toml`
- `docs/audits/WAIVERS.toml`
- `docs/audits/WARNING_BUDGETS.toml`
- `docs/TODO.md`의 `## Blocked`

원칙:

- waiver는 **예외 허용**입니다. 규칙 위반을 영구 면제하지 않고, owner와 만료일이 있어야 합니다.
- warning budget은 **남아 있는 구조 경고를 일정 기간 운영 debt로 관리**하기 위한 레지스트리입니다.
- blocker와 waiver와 warning budget은 서로 대체 관계가 아닙니다.
- PHP 쪽 warning budget은 `scripts/check_active_structure_boundaries.py`가 출력하는 `rule/path` 구조 warning과 자동 매칭합니다.
- `AdminSmsService`처럼 길이가 길어도 public API가 순수 위임만 하는 façade는 같은 스크립트에서 note로만 추적하고 active warning으로 취급하지 않습니다.

### 8.2 구조 warning 진실 원본

- 구조 warning/failure의 진실 원본은 `scripts/check_active_structure_boundaries.py`입니다.
- `docs/audits/WARNING_BUDGETS.toml`는 이 스크립트가 출력한 active warning에만 budget을 둘 수 있습니다.
- active warning이 budget 없이 남아 있으면 `composer run audit:warning-budgets`는 실패합니다.
- budget은 “경고를 무시한다”가 아니라, owner와 제거 기준과 만료일을 붙여 **운영 debt**로 관리한다는 뜻입니다.
- shared gateway/local contract allowlist의 machine-readable 진실 원본은 `docs/architecture/GATEWAY_USAGE_RULES.json`입니다.
- delegation façade로 판정된 note는 budget 대상이 아니며, 필요한 경우만 구조 로드맵/TODO로 추적합니다.

### 8.2.1 `/admin/schema` provider readiness 진실 원본

- `/admin/schema` provider coverage/backlog의 machine-readable 진실 원본은 `docs/audits/ADMIN_SCHEMA_PROVIDER_READINESS.toml`입니다.
- implemented feature는 `schema-domains.json`과 generated JSON 파일이 모두 존재해야 합니다.
- blocked feature는 `provider_domain_missing`과 `planned_schema_domains`를 가져야 하며, planned domain이 이미 manifest에 생겼는데도 blocked로 남아 있으면 failure입니다.
- generated handoff는 `output/admin-schema-provider-readiness/latest.{md,json}`를 사용합니다.

### 8.3 구조 감사 생성 산출물

- `scripts/generate_structure_audit_report.py`는 active structure finding, warning budget, blocker registry를 합쳐 `output/php-structure-audit/latest.md`, `latest.json`을 생성합니다.
- 이 generated artifact는 `composer run audit:structure`의 최신 증적이며, deep audit와 handoff에서 재사용합니다.
- 수기 구조 감사 문서는 여전히 `docs/audits/*.md`에 남기되, 숫자와 현재 active finding은 generated artifact를 진실 원본으로 봅니다.
- `scripts/check_structure_report_freshness.py`는 `latest.{md,json}`가 구조 스캔 입력보다 최신인지 검증하며, stale artifact를 최신 handoff처럼 사용하는 것을 막습니다.
- `scripts/generate_admin_schema_provider_report.py`는 `ADMIN_SCHEMA_PROVIDER_READINESS.toml`과 `schema-domains.json`을 합쳐 `output/admin-schema-provider-readiness/latest.{md,json}`를 생성합니다.

### 8.4 구현 감사 생성 산출물

- `scripts/run_standard_audit.py`는 구현 감사 체크를 실행하고 결과를 `docs/audits/AUDIT_REPORT_YYYY-MM-DD.md`에 기록합니다.
- 같은 실행에서 `docs/audits/AUDIT_LATEST.md`를 최신 표준 감사본과 동일 내용으로 동기화합니다.
- 보고서 작성 뒤 `python3 scripts/doc-processor.py --write`와 `python3 scripts/doc-index.py`를 다시 실행해 `docs/DOCUMENT_REGISTRY.md`와 `docs/docs.db`를 최신 상태로 맞춥니다.
