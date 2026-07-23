---
doc_type: support
status: active
owner: rust-admin
source_of_truth: false
ai_default_include: true
last_reviewed: 2026-03-13
review_cycle_days: 30
bounded_context: global
---
# 코드-문서 정합성 감사 기준

이 문서는 `rust` 프로젝트의 코드-문서 정합성 감사 기준을 설명하는 지원 문서입니다.
정식 운영 규칙은 [AUDIT_SYSTEM.md](/Users/neojins/workspace/gnuboard5/rust/specs/AUDIT_SYSTEM.md) 와 [DOCUMENT_SYSTEM.md](/Users/neojins/workspace/gnuboard5/rust/specs/DOCUMENT_SYSTEM.md)를 따릅니다.

## 1. 목적

코드가 먼저 가고 문서가 안 따라오거나, 문서가 완료처럼 적혀 있는데 코드가 아직 없거나, 폐기된 전략이 active 문서에 남는 문제를 정기적으로 찾습니다.

## 2. 핵심 점검 항목

### 2.1 코드가 먼저 갔는데 정본 문서가 안 바뀐 경우

- 공개 계약이 바뀌었는데 관련 정본 문서가 갱신되지 않았는가
- crate 책임/경계가 바뀌었는데 README, AUDIT, SDD가 따라오지 않았는가
- 구조 감사 기준이 바뀌었는데 헌법/감사 SSOT가 그대로인가

### 2.2 문서는 완료인데 코드엔 아직 안 된 경우

- TODO/README/HISTORY/SDD는 완료처럼 보이는데 테스트/구현 증적이 없는가
- `schema_live`, `save_ready`, `supported` 같은 문구가 실제 코드와 어긋나는가
- provider blocker를 해결하지 않았는데 문서만 active처럼 승격됐는가

### 2.3 폐기된 전략이 active 문서에 남은 경우

- deprecated/superseded/archive 정책이 active 문서에 섞여 있지 않은가
- 과거 설계안이나 임시 전환 전략이 현재 기준처럼 읽히지 않는가
- 더 이상 canonical이 아닌 route/flow/design/배포 방식이 active 문서에 남아 있지 않은가

## 3. 증적 우선순위

코드-문서 정합성 감사에서는 아래 순서로 사실을 판정합니다.

1. 실행 가능한 감사 스크립트와 테스트 결과
2. 정본 문서
3. 지원 문서
4. 기록/보관 문서

기록 문서나 과거 감사 보고서는 현재 기준을 덮어쓸 수 없습니다.

## 4. 운영 결과

코드-문서 정합성 감사 결과는 다음으로 귀결됩니다.

- 즉시 정정 필요: 정본 문서 또는 코드가 명백히 어긋난 경우
- blocked handoff: rust-only 범위를 벗어난 provider blocker인 경우
- 후속 backlog: 구조 리팩터링이나 문서 정리 배치로 넘겨도 되는 경우

## 5. 권장 실행 시점

- 큰 기능 완료 후
- 릴리즈 전
- 월 1회 정기 점검

## 6. 현재 상태

현재 이 감사는 운영 규칙과 체크리스트가 먼저 정립된 단계입니다.
자동화 가능한 항목은 점진적으로 deep audit 계열로 승격합니다.
