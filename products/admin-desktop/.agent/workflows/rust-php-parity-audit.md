---
doc_type: workflow
status: active
owner: rust-admin
source_of_truth: false
ai_default_include: true
last_reviewed: 2026-03-13
review_cycle_days: 30
bounded_context: global
description: Rust가 PHP REST 계약을 올바르게 소비하는지 검증하는 소비 계약 감사
---

# 소비 계약 감사 워크플로우

Rust Tauri `cmd_*`, `apiTarget`, DTO, `/admin/schema` 소비가 PHP REST API 계약을 올바르게 읽고 있는지 전수 검증합니다.
이 워크플로우는 Rust가 **무엇을 제공하느냐**가 아니라 **무엇을 어떻게 소비하느냐**를 보는 감사입니다.

> 실행 명령: `cd ${RUST_ROOT}/g5-admin && bun run audit:consumer`
> legacy alias: `bun run audit:contract`
> 운영 SSOT: `specs/AUDIT_SYSTEM.md`

## Phase 1. snapshot과 generated artifact를 확인한다

```bash
cd ${RUST_ROOT}/g5-admin
bun run contract:check
```

필수 판정:

- Rust snapshot이 PHP 최신 OpenAPI와 동기화되어 있는가
- generated Zod artifact가 최신인가
- `api-target-registry.ts`가 현재 계약을 가리키는가

## Phase 2. PHP 계약을 Rust가 실제로 소비하는지 본다

핵심 항목:

- registered command count
- admin path count
- operation gap
- schema domain gap
- `default_value`, label, option, enum drift

필요 시:

```bash
cd ${RUST_ROOT}
python3 scripts/run_integrated_audit.py --rust-root ${RUST_ROOT} --php-root ${PHP_ROOT}
```

## Phase 3. UI 의미 적용을 본다

확인 항목:

- create는 `schema.default_value`를 쓰는가
- edit는 상세 조회값을 덮어쓰는가
- schema fetch 실패 시 hardcoded fallback을 정상으로 착각하지 않는가
- route-native 폼이 `/admin/schema`를 우선 소비하는가

## Phase 4. 판정 기준

- PHP의 DB parity를 Rust에서 재판정하지 않는다
- Rust는 “현재 PHP 계약을 안전하게 읽고 있는가”만 판정한다
- known gap은 warning으로, 실제 drift는 failure로 분리한다
