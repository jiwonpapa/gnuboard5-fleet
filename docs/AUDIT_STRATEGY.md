# 감사 전략

이 문서는 `php` 프로젝트의 감사 체계를 **공급자 관점**에서 재분류한 선택 매트릭스입니다.
실제 감사 운영 규정과 blocker 관리 SSOT는 `docs/AUDIT_SYSTEM.md`입니다.
목표는 “무조건 많은 감사를 돌리는 것”이 아니라, **변경 종류에 맞는 감사만 정확히 선택**해 구조 드리프트와 포팅 실패를 조기에 차단하는 것입니다.

## 1. 감사 책임 경계

- `php`는 **REST API 공급자 감사**를 담당합니다.
- `rust`는 **소비단 감사**를 담당합니다.
- `php`는 OpenAPI, `/admin/schema`, 레거시 격리, write/read parity를 책임집니다.
- `rust`는 DTO 소비, create/edit 적용, fallback/hardcode 제거, UI 의미 drift를 책임집니다.
- `php + rust` 통합 감사는 **계약/의미 변경이 있을 때만** 수행합니다.
- OpenAPI 공급자 의미 검사는 `composer run audit:openapi-provider`, 실제 Slim 등록 graph 검사는 `composer run audit:runtime-routes`, PHP field-flow 검사는 `composer run audit:openapi-field-bindings`가 담당하며 셋 모두 API 파이프라인 감사의 선행 hard gate입니다.
- `api/docs/openapi.phase1-consumer-scope.json`은 전체 `312` operation 인벤토리, active `189`, protected 일반 게시판 `26`, 나머지 deferred/excluded 분류를 함께 정의합니다. `/admin/boards/*`는 active이고 일반 게시판은 소비만 deferred일 뿐 공급자 감사에서는 보호합니다.

## 2. 절대 틀어지면 안 되는 구조 불변식

1. 공개 계약 SSOT는 `api/docs/openapi.yaml` 하나입니다.
2. `api/routes/v1.php`, `api/routes/v1/admin.php`, `api/container.php`는 조립기 역할만 합니다.
3. `Controller -> Service -> Repository` 경계는 유지합니다.
4. Service는 HTTP 객체, `$_ENV/getenv`, `$GLOBALS`, 레거시 함수에 직접 의존하지 않습니다.
5. 레거시 GnuBoard 접근은 adapter/provider/repository 허용 지점 안에만 둡니다.
6. 문서 SSOT는 `docs/README.md`, `docs/IMPLEMENTATION_ROADMAP.md`, `docs/TODO.md`, `docs/HISTORY.md`, `docs/AUDIT_SYSTEM.md`, `docs/DOCUMENT_REGISTRY.md`입니다.
7. 과거 감사/프롬프트/history는 기본 AI 검색에서 제외합니다.
8. `Comment/File/Like/Memo/Menu/Qa` 같은 local-only gateway는 도메인 `Contracts/*Gateway`를 진실 원본으로 사용하고, deprecated `Integration\Contracts`는 정의 파일/호환 저장소/계약 테스트 바깥에서 새로 사용하지 않습니다.
9. `Auth/Board/Member/Point/Post` shared gateway는 `docs/architecture/SHARED_GATEWAY_INVENTORY.md`에 기록된 허용 소비 경계 안에서만 사용하고, 새 cross-domain usage는 인벤토리와 계약 테스트 allowlist를 같이 갱신해야 합니다.
10. shared gateway라도 provider domain에 local source contract가 생긴 경우(`Auth`, `Point`, `Post`) 해당 도메인 내부에서는 local contract를 진실 원본으로 사용하고 deprecated `Integration\\Contracts`는 호환 지점만 남깁니다.

## 3. 감사 분류

### 3.1 구조 감사

- 목적: 프로젝트가 커져도 산으로 가지 않게 **아키텍처 드리프트**를 막습니다.
- 명령: `composer run audit:structure`
- legacy alias: `composer run audit:deep`
- generated artifact: `output/php-structure-audit/latest.{md,json}`
- 책임:
  - 갓파일 회귀
  - 도메인 경계 / DIP / SRP
  - 레거시 ACL 누수
  - 중앙 `Integration/Contracts` 재집중
  - `GATEWAY_USAGE_RULES.json` 기준 shared gateway allowlist drift
  - local-only gateway compatibility namespace 누수
  - shared gateway inventory allowlist drift
  - 문서 거버넌스와 구조 회귀

### 3.2 구현 감사

- 목적: 기능 구현이 계약, 테스트, 문서와 함께 닫혔는지 봅니다.
- 명령: `composer run audit:implementation`
- legacy alias: `composer run audit:standard`
- 책임:
  - `quality-gate`
  - blackbox 조건부 실행
  - OpenAPI / schema / HISTORY / API_SPEC 동기화
  - 구현 단위 회귀 테스트

### 3.3 포팅 정합성 감사

- 목적: 레거시 `adm/*.php` 의미가 REST API와 `/admin/schema`에서 유지되는지 확인합니다.
- 명령: `composer run audit:porting`
- legacy alias: `composer run audit:field-parity`
- 책임:
  - 레거시 폼 필드 ↔ generated registry
  - create 기본값 ↔ edit 현재값 의미 분리
  - `label`, `required`, `readonly_on_update`, `create_only`, `default_value`
  - DB / 레거시 폼 / Repository / generated schema 정합성

### 3.3A schema provider readiness 감사

- 목적: `/admin/schema` provider coverage와 blocked backlog를 machine-readable registry 기준으로 유지합니다.
- 명령: `composer run audit:schema-provider-readiness`
- generated artifact: `output/admin-schema-provider-readiness/latest.{md,json}`
- 책임:
  - implemented provider domain ↔ `schema-domains.json` ↔ generated JSON 정합성
  - blocked provider backlog와 planned domain 정합성
  - handoff 가능한 provider rollout 순서 고정

### 3.4 통합 감사

- 목적: 공급자 계약 변경이 Rust 소비단을 깨뜨리지 않는지 확인합니다.
- 명령: `composer run audit:integrated`
- 책임:
  - path / method / schema / field 의미 변화
  - auth/error/meta envelope
  - `/admin/schema`의 label/default/option 의미 변화

### 3.5 OpenAPI field binding 감사

- 목적: active `189` + protected 일반 게시판 `26`, exact `215` operation의 OpenAPI request/response field가 실제 PHP handler 계층에서 빠짐없이 결합되는지 fail-closed로 확인합니다.
- 명령: `composer run audit:openapi-field-bindings`
- generated artifact: `output/openapi-field-binding/latest.{md,json}`
- 책임:
  - runtime graph의 operation→handler FQCN/source 결합과 OpenAPI SHA freshness
  - `201 Created`의 OpenAPI Location header와 실제 handler 선언 정합성
  - path/query/header/cookie/body field read와 type/default/enum 증거
  - 조립 배열의 key별 계보와 literal `foreach`/`array_keys()` 기반 반복 정규화의 필드별 증거
  - Controller→Service→Repository 도달 증거와 동적·미해석 tainted call
  - success response field와 실제 반환 array/envelope field 대조

### 3.6 Phase 1 범위 드리프트 감사

- 목적: provider/runtime/field/docs 감사가 서로 다른 operation 집합을 보아 거짓 통과하는 일을 막습니다.
- 진실 원본: `api/docs/openapi.phase1-consumer-scope.json`
- 고정 수치: 전체 `312`; active `189` = non-shop admin `184` + bootstrap `5`; protected 일반 게시판 `26`; deferred internal tool `3`; deferred non-admin `68`; excluded admin shop `26`
- 규칙: active와 protected 일반 게시판 finding은 hard-fail, `/admin-inspect/*`·기타 비관리자는 deferred evidence, `/admin/shop/*`는 excluded evidence로 각각 분리합니다.
- 회귀: 전체 method+path 집합 SHA와 분류 개수, active operation, protected 일반 게시판 exact operation, 범위 SHA, optional JWT 의미가 변하면 fail-closed 변이 테스트로 막습니다.

## 4. 어떤 변경에 어떤 감사를 붙이는가

| 변경 유형 | 필수 감사 | 조건부 감사 |
|------|------|------|
| 내부 리팩터링(Service/Repository 분해) | 구현 감사 | 구조 감사 |
| 라우팅/DI/컨테이너/도메인 경계 변경 | 구조 감사 | 구현 감사 |
| `adm/*.php`, `/admin/schema`, generated JSON 변경 | 포팅 정합성 감사 | 통합 감사 |
| `/admin/schema` coverage backlog, provider rollout 순서 변경 | schema provider readiness 감사 | 통합 감사 |
| OpenAPI path/request/response 변경 | 구현 감사 | 통합 감사 |
| OpenAPI 감사 정책/소비 범위/manifest/route graph/field policy 변경 | `audit:openapi-provider` + `audit:runtime-routes` + `audit:openapi-field-bindings` + `docs-check` | 통합 감사 |
| auth/error/default_value/enum 의미 변경 | 구현 감사 | 통합 감사 |
| 단순 문서/테스트 보강 | 구현 감사 | 없음 |

## 5. 단계별 감사 순서

일반 변경의 선택형 진입점은 `composer run audit:auto`입니다. 이 명령은 현재 worktree 변경 파일을 기준으로 필요한 감사를 자동 선택합니다. 푸시·릴리스 전에는 선택형 결과로 대체하지 않고 `composer run ci:local` 전체 게이트를 실행하며, 설치된 `pre-push` 훅이 이를 강제합니다. GitHub-hosted workflow는 수동 fallback입니다.

1. 구현 변경 직후 `audit:auto` 또는 `audit:implementation`
2. 구조 리팩터링 전후 `audit:auto` 또는 `audit:structure`
3. 레거시 관리자 포팅/폼 메타데이터 변경 시 `audit:auto` 또는 `audit:porting`
4. Rust가 읽는 계약/의미가 바뀌는 경로(`OpenAPI`, `route`, `auth/error/support`, DTO/enum/response, contract test)는 `audit:auto`가 `audit:integrated`까지 자동 승격

원칙:

- 구조 감사 결과가 나쁘면 기능 완료 선언을 하지 않습니다.
- 포팅 정합성 감사 없이 `adm/*.php` 의미 변경을 완료로 선언하지 않습니다.
- 포팅 정합성 감사는 `docs-check`까지 포함해 OpenAPI ↔ Route 드리프트를 함께 막아야 합니다.
- Rust 영향이 있는 변경을 PHP 단독 감사만으로 닫지 않습니다.
- 구현 감사는 결과를 `docs/audits/AUDIT_REPORT_YYYY-MM-DD.md`와 `docs/audits/AUDIT_LATEST.md`에 자동 반영해야 합니다.
- `Blocked` 상태는 `docs/TODO.md`와 `docs/audits/BLOCKERS.toml`에 동시에 기록합니다.
- 예외 허용은 `docs/audits/WAIVERS.toml`, 경고 운영 debt는 `docs/audits/WARNING_BUDGETS.toml`로 관리합니다.
- 구조 warning의 진실 원본은 `scripts/check_active_structure_boundaries.py`이며, `WARNING_BUDGETS.toml`는 이 finding과 path/rule 단위로 일치해야 합니다.
- pure delegation façade는 LOC note로는 남길 수 있지만, public API가 순수 위임만 하는 경우 active structure warning으로 승격하지 않습니다.
- 구조 감사 최신 handoff와 회귀 비교는 `output/php-structure-audit/latest.{md,json}`를 기준으로 봅니다.
- 구조 감사 generated artifact는 freshness 검사까지 통과해야 최신 handoff로 취급합니다.

## 6. 통과 기준

### 구조 감사 통과 기준

- 중앙 조립 파일이 조립기 역할만 유지
- Service의 HTTP/전역/레거시 직접 접근 없음
- local-only gateway의 deprecated namespace 사용처가 허용된 호환 지점만 유지
- shared gateway의 cross-domain 사용처가 인벤토리 allowlist 안에 유지
- 구조 hotspot은 기록되고 개선 순서가 남아 있음

### 구현 감사 통과 기준

- `quality-gate` 통과
- 관련 테스트/문서가 같이 갱신
- Why가 `docs/HISTORY.md`에 남아 있음

### 포팅 정합성 감사 통과 기준

- raw label (`label == field name`) 없음
- `FIXME_필드명`은 레거시 폼/그누보드 표준 명명 규칙으로도 제목을 확정할 수 없는 경우에만 허용
- 허용된 `FIXME_필드명`은 감사 출력에서 별도 집계되고, 다음_action 또는 provider backlog로 추적
- `default_value`는 create용 정적 기본값만 사용
- 레거시 필드와 API 필드 간 의미 불일치 없음

## 7. 주의사항

- 소비단 호환성 세부 감사는 Rust에서 소유합니다.
- PHP는 “소비단이 깨질 수 있는 계약/의미를 바꿨는가”까지만 판정합니다.
- 통합 감사는 routine 상시 실행이 아니라, **계약 변경 시 게이트 상승** 용도입니다.
