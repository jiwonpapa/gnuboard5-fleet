---
doc_type: workflow
status: active
owner: rust-admin
source_of_truth: false
ai_default_include: true
last_reviewed: 2026-03-15
review_cycle_days: 30
bounded_context: global
description: 절대 틀어지면 안 되는 Rust 소비단 구조를 검증하는 구조 감사
---

# 구조 감사 워크플로우

> 목적: 소비단 앱 구조가 커져도 같은 방식으로 확장 가능한지 확인합니다.
> 실행 명령: `cd ${RUST_ROOT}/g5-admin && bun run audit:structure`
> full workspace 확인: `bun run audit:deep`
> 운영 SSOT: `specs/AUDIT_SYSTEM.md`

## 언제 실행하나

- `navigation.ts`, `AppShell`, `AppState`, `db`, command registry를 건드렸을 때
- 새 route-native 도메인을 추가했을 때
- “기능은 되는데 중앙 파일이 너무 커진다”는 신호가 있을 때

## Phase 1. 절대 불변식을 선언한다

- `invoke(cmd_*) -> Rust -> PHP API` 경로 유지
- `AppState`, registry, shell은 오케스트레이션만 담당
- feature/page/workspace ownership 유지
- monitored feature는 다른 business feature를 직접 import하지 않음
- `shared/components/lib/api`는 support namespace만 유지
- hardcoded route/metadata drift는 기록하고 줄인다

## Phase 2. 구조 metric을 수집한다

```bash
cd ${RUST_ROOT}
python3 scripts/collect_architecture_metrics.py
```

반드시 기록할 것:

- 300줄 초과 feature/workspace 파일
- 300줄 초과 command 파일
- 500줄 초과 central orchestrator
- cross-feature import pair
- hardcoded admin path literal count

## Phase 3. 구조 기준으로 판정한다

- central registry가 도메인 추가 때 병목이 되는가
- `apiTargets`, diagnostics, routes가 서로 다른 registry로 drift하는가
- route-native 폼이 schema consumer를 거치지 않고 다시 hardcode로 회귀하는가
- `specs/audits/DOMAIN_BOUNDARY_RULES.toml` 기준 direct import / support drift / AppState wrapper coupling이 새로 생기지 않았는가
- 허용된 구조 부채가 있다면 `specs/audits/WAIVERS.toml`에 만료일/소유자/제거 기준까지 남겼는가

## Phase 4. 개선 순서를 남긴다

구조 감사는 “문제 있음”에서 끝내지 않습니다. 아래를 함께 남깁니다.

- 지금 즉시 막아야 하는 구조 위반
- 다음 리팩터링에서 쪼개야 할 중앙 파일
- consumer audit과 함께 묶어야 하는 drift 영역
- 수기 보고서는 `specs/foundation/AUDIT_REPORT_TEMPLATE.md` 형식을 따른다
