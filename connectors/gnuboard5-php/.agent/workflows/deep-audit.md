description: 절대 틀어지면 안 되는 구조 불변식을 검증하는 구조 감사 워크플로우
---
# 구조 감사 워크플로우

> **목적**: 기능보다 먼저 지켜야 하는 구조 불변식을 감시합니다.
> **차이점**: 구현 감사는 “이번 기능이 닫혔는가”를 보고, 구조 감사는 “프로젝트가 다음 단계에도 같은 방식으로 확장 가능한가”를 봅니다.
> **기준**: `.agent/Constitution.md`, `docs/AUDIT_SYSTEM.md`, `docs/AUDIT_STRATEGY.md`
> **실행 명령**: `composer run audit:structure`
> **legacy alias**: `composer run audit:deep`
> **출력**: `docs/audits/DEEP_AUDIT_YYYY-MM-DD.md`
> **보조 산출물**: `output/php-structure-audit/latest.{md,json}` freshness 통과본

## 언제 실행하는가

- 대규모 리팩터링 전후
- 외부 감사보고를 수용한 직후
- “테스트는 녹색인데 코드가 자꾸 중앙으로 몰린다”는 신호가 있을 때
- 월 1회 또는 주요 Phase 종료 시점
- 도메인 추가 시 중앙 파일 수정 지점이 늘어났다고 느껴질 때

## Phase 1. 구조 불변식부터 세운다

구조 감사는 체크리스트를 훑는 것이 아니라 **프로젝트가 절대 잃으면 안 되는 경계**를 먼저 선언하고 검증합니다. 예:

- 라우팅 조립기가 다시 갓파일로 커지고 있는가
- 도메인 계약이 중앙 폴더로 회귀하고 있는가
- 레거시 접근이 adapter 밖으로 새고 있는가
- 문서/감사 히스토리가 다시 AI 검색 노이즈가 되고 있는가
- 테스트는 많은데 구조 회귀를 못 막고 있는가

## Phase 2. 구조 병목과 갓파일 회귀를 찾는다

현재 구조에서 우선 보는 파일:

- `api/routes/v1.php`
- `api/routes/v1/admin.php`
- `api/container.php`
- 도메인별 `api/v1/*/definitions.php`

점검 항목:

1. 중앙 파일이 조립기 역할만 하는가
2. 새 도메인 추가 시 수정 지점 수가 늘고 있지 않은가
3. 300줄 이상 Service/Repository, 500줄 이상 route/module이 늘고 있지 않은가

```bash
wc -l api/routes/v1.php api/routes/v1/admin.php api/container.php
find api/v1 -path "*/Service/*.php" -o -path "*/Repository/*.php" | xargs wc -l | sort -nr | head -20
```

## Phase 3. 도메인 경계와 DIP 회귀를 찾는다

1. Controller → Repository 직통 호출
2. Service → HTTP/전역/레거시 직접 접근
3. local port가 다시 중앙 `Integration/Contracts`로 모이는지
4. 도메인 간 순환 의존 또는 우회 의존

```bash
rg -n "Repository" api/v1/*/Controller
rg -n "ServerRequestInterface|ResponseInterface|\\$request|\\$response" api/v1/*/Service
rg -n "\\$_ENV|getenv\\(|\\$GLOBALS|common\\.php|sql_query\\(|get_member\\(" api/v1
rg -n "Api\\\\Integration\\\\Contracts" api/v1
```

## Phase 4. 레거시 ACL과 설정 경계를 본다

이 프로젝트는 일반 PHP REST보다 **그누보드 레거시 격리**가 더 중요합니다.

점검 항목:

1. `$g5`, `$member`, `sql_*`, `common.php` 직접 사용이 허용 지점 밖으로 퍼지지 않았는가
2. `$_ENV/getenv` 직접 접근이 route/service/repository에 다시 생기지 않았는가
3. legacy fallback이 provider/adapter 뒤에 숨어 있는가

```bash
rg -n "\\$g5|\\$member|sql_query\\(|sql_fetch\\(|common\\.php" api/v1
rg -n "\\$_ENV|getenv\\(" api/routes api/v1
```

## Phase 5. 계약과 문서 노이즈를 본다

1. OpenAPI와 실제 경로가 다시 벌어지는가
2. `/admin/schema` generated registry가 stale 되기 쉬운 구조인가
3. `.agentignore`, `.cursorignore` 밖에서 과거 감사/프롬프트가 다시 기본 검색에 노출되는가
4. `AUDIT_LATEST`, `HISTORY`, `TODO`, `ROADMAP` 역할이 다시 섞이는가

```bash
./scripts/docs-check.sh
composer run schema:check
composer run contract:check
```

## Phase 6. 테스트 구조를 본다

심층 감사에서는 테스트 숫자보다 **회귀를 막는 위치**를 봅니다.

점검 항목:

1. 구조 변경에 대응하는 회귀 테스트가 있는가
2. contract test가 OpenAPI drift를 실제로 막는가
3. admin schema 변경이 generated/test/docs 세 군데에서 동시에 잡히는가
4. 동시성/락/포인트 구간에 재현 테스트가 있는가

```bash
./vendor/bin/phpunit tests/contract
composer run quality-gate
```

## Phase 7. 보고서 작성

`docs/audits/DEEP_AUDIT_YYYY-MM-DD.md`에 아래를 기록합니다.

추가로 generated handoff `output/php-structure-audit/latest.{md,json}`가 구조 스캔 입력보다 최신인지 freshness까지 확인합니다.

- 감사 가설
- 실제 증거
- 구조 위험도
- 코드 수정이 필요한 항목
- 정책/워크플로우 수정이 필요한 항목
- 다음 Phase 제안

등급 기준:

| 등급 | 의미 |
|------|------|
| Critical | 보안/데이터 정합성/계약 파손 가능성 |
| High | 구조 붕괴나 중앙 병목을 가속하는 문제 |
| Medium | 점진적 부채 누적 |
| Low | 지금 당장 치명적이지 않지만 방향성이 나쁜 문제 |

## 구현 감사 vs 구조 감사

| 항목 | 구현 감사 | 구조 감사 |
|------|----------|---------------|
| 목적 | 완료 판정 | 구조 원인 분석 |
| 빈도 | 작업 직후 항상 | 월 1회 또는 마일스톤 후 |
| 초점 | 게이트 통과 여부 | 구조 드리프트와 병목 |
| 산출물 | 통과/조건부 통과/미통과 | 구조 개선 제안과 위험 지도 |
