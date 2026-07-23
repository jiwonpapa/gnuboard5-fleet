description: 기능 구현 완료 후 실행하는 구현 감사 워크플로우
---
# 구현 감사 워크플로우

> **기준**: `.agent/Constitution.md`, `docs/AUDIT_SYSTEM.md`, `docs/AUDIT_STRATEGY.md`, `.agent/sub-constitutions/document-governance.md`
> **출력**: `docs/audits/AUDIT_REPORT_YYYY-MM-DD.md` (같은 날짜 재감사 시 같은 파일 갱신)
> **역할**: 기능 구현 직후 항상 실행하는 공급자 기본 감사 루프
> **실행 명령**: `composer run audit:implementation`
> **권장 진입점**: `composer run audit:auto`
> **legacy alias**: `composer run audit:standard`
> **통합 규칙**: `audit:auto`는 `api/docs/openapi.yaml`, `/admin/schema`, 인증/에러 응답, route/DTO/field 의미를 바꾸는 경로에서 `composer run audit:integrated`까지 자동 승격합니다.

## 0. 어떤 감사가 맞는가

- 일반 구현 완료 후: 이 문서(구현 감사)
- 구조가 흔들리거나 대규모 리팩토링 전후: `deep-audit.md` (구조 감사)
- `adm/*.php`, `/admin/schema`, generated registry를 건드렸을 때: `field-parity-audit.md` (포팅 정합성 감사)

감사 파일을 여러 개 두는 이유는 **전부 한 번에 때려넣기 위해서가 아니라, 구조/구현/포팅 책임을 분리하기 위해서**입니다. 구현 감사는 항상, 구조/포팅 감사는 변경 성격에 따라 추가합니다.

## Phase 1. 감사 범위와 유형 확정

1. 최근 변경 파일을 확인합니다.
   ```bash
   git status --short
   git diff --name-only HEAD~1..HEAD
   ```
2. 아래 조건이면 `composer run audit:integrated`를 추가합니다.
   - `api/docs/openapi.yaml` 변경
   - `api/v1/Admin/Schema/**` 또는 `/admin/schema` 계약 변경
   - 인증/에러 응답/DTO 의미 변경
   - Rust 소비단이 사용하는 path, field, enum, 기본값 의미 변경
3. 아래 조건이면 `field-parity-audit.md`를 추가합니다.
   - `adm/*.php` 관리자 폼 변경
   - `schema-domains.json`, generated schema JSON 변경
   - 관리자 create/edit 기본값, 라벨, 섹션, required 의미 변경

## Phase 2. 자동 게이트를 먼저 실행

구현 감사는 수동 체크 전에 **자동 fitness function**을 먼저 통과해야 합니다. 변경 범위 판단이 애매하면 개별 명령 대신 `composer run audit:auto`를 우선 사용합니다. CI도 같은 스크립트를 diff-base 기준으로 재사용합니다.

```bash
composer run quality-gate
```

API 계약 또는 런타임 응답을 건드렸다면 blackbox도 추가합니다.

```bash
composer run test:api:blackbox
```

## Phase 3. 구현 경계 감사

다음 항목은 “프로젝트가 커져도 선장 없는 배가 되지 않는가”를 보는 핵심 기준입니다.

1. 경계 분리:
   - Controller는 HTTP 입출력과 검증만 담당합니다.
   - Service는 Request/Response, `$_ENV`, `$GLOBALS`, `common.php`를 직접 만지면 안 됩니다.
   - Repository는 SQL/DB I/O만 담당하고 정책을 먹으면 안 됩니다.
2. 도메인 자율성:
   - 도메인별 `definitions.php`, route module, local contracts가 유지되는지 확인합니다.
   - local port가 다시 `Integration/Contracts` 중앙 폴더로 회귀하지 않는지 봅니다.
3. 레거시 격리:
   - 레거시 함수/전역/상수는 adapter, repository, config provider 같은 허용 지점 밖에서 직접 호출하지 않습니다.

빠른 탐색 명령:

```bash
rg -n "new QueryBuilder|SELECT |INSERT |UPDATE |DELETE " api/v1/*/Controller
rg -n "ServerRequestInterface|ResponseInterface|\\$request|\\$response" api/v1/*/Service
rg -n "\\$_ENV|getenv\\(|\\$GLOBALS|common\\.php|sql_query\\(|get_member\\(" api/v1
find api/v1 -path "*/Service/*.php" -o -path "*/Repository/*.php" | xargs wc -l | sort -nr | head
```

## Phase 4. 계약과 문서 감사

1. OpenAPI와 실제 라우트 정합성은 `composer run quality-gate` 안의 `contract:check`, `schema:check`, `docs-check` 결과를 기준으로 봅니다.
2. 관리자 schema를 건드렸다면 아래를 확인합니다.
   - `label == field name` 잔존 여부
   - `FIXME_필드명`이 꼭 필요한 예외만 남았는지와 그 개수/다음 작업이 감사에 기록되는지
   - `default_value`가 **create용 정적 기본값** 의미로만 쓰이는지
   - edit 현재값과 schema 기본값을 혼동하지 않는지
3. `docs/API_SPEC.md`, `docs/HISTORY.md`, 관련 `docs/ddls/*.md`가 같은 변경에 반영됐는지 확인합니다.
4. 같은 변경에 Why가 없으면 감사 실패입니다.

## Phase 5. 테스트와 회귀 감사

1. 변경된 Service/Repository에 대응하는 테스트가 같이 있는지 확인합니다.
2. 버그 수정이면 재현 테스트가 같이 들어갔는지 확인합니다.
3. 다음 민감 경로는 별도 회귀망이 있어야 합니다.
   - 인증/인가
   - 포인트/추천/스크랩 등 동시성 구간
   - env/config fallback
   - admin schema / generated registry
   - plugin isolation

필요 시 추가 실행:

```bash
./vendor/bin/phpunit
./vendor/bin/phpunit tests/contract
./scripts/check_plugin_isolation.sh
```

## Phase 6. php + rust 통합 감사 조건부 실행

다음 변경이면 `composer run audit:integrated`를 실행합니다.

- OpenAPI path/request/response 변경
- `/admin/schema` field 의미 변경
- auth token/error envelope/meta 변경
- Rust DTO/폼 생성 로직이 읽는 기본값, enum, label 변경

그 외 내부 구현 변경만이면 구현 감사만으로 닫습니다.

## Phase 7. 감사 보고서 작성

`composer run audit:implementation`는 결과를 `docs/audits/AUDIT_REPORT_YYYY-MM-DD.md`와 `docs/audits/AUDIT_LATEST.md`에 자동 기록합니다.

- 감사 범위
- 실행한 자동 게이트
- 주요 발견사항
- 시정 조치
- 테스트/blackbox/integrated audit 결과
- 최종 판정: `통과 / 조건부 통과 / 미통과`

## 구현 감사 체크리스트

| # | 항목 | 판정 |
|---|------|------|
| 1 | `quality-gate` 통과 | ☐ |
| 2 | 계약 영향 변경에만 blackbox / integrated audit를 추가 실행함 | ☐ |
| 3 | Controller → Service → Repository 경계 유지 | ☐ |
| 4 | Service에서 HTTP/전역/레거시 직접 접근 없음 | ☐ |
| 5 | 중앙 조립 파일이 다시 갓파일로 커지지 않음 | ☐ |
| 6 | OpenAPI / schema / 문서 / HISTORY가 같은 변경에서 동기화됨 | ☐ |
| 7 | 변경된 코드에 회귀 테스트가 동반됨 | ☐ |
