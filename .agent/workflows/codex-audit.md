---
doc_type: workflow
status: active
owner: rust-admin
source_of_truth: false
ai_default_include: true
last_reviewed: 2026-03-13
review_cycle_days: 30
bounded_context: global
description: 기능 구현 완료 후 실행하는 Rust 구현 감사 워크플로우
---

# 구현 감사 워크플로우

> 목적: 기능 구현이 현재 소비단 기준으로 닫혔는지 확인합니다.
> 실행 명령: `cd ${RUST_ROOT}/g5-admin && bun run audit:implementation`
> legacy alias: `bun run audit:standard`
> 범위: 문서 거버넌스, 빌드, 타입, lint, critical tests, ts-rs export sync
> 운영 SSOT: `specs/AUDIT_SYSTEM.md`

## Phase 1. 구현 베이스라인

```bash
cd ${RUST_ROOT}
bash scripts/check-doc-governance.sh
cd g5-admin
bun x tsc --noEmit
bun run lint
bun run test:coverage:critical
cargo check --manifest-path src-tauri/Cargo.toml --quiet
cargo test --manifest-path ../g5-admin-models/Cargo.toml --features ts-bindings models::tests::export_ts_bindings -- --exact --nocapture
git diff --exit-code -- src/types
```

## Phase 2. 현재 작업이 소비 의미를 바꿨는지 판정

아래 변경이 있으면 구현 감사만으로 닫지 않습니다.

- `src/api/client/**`
- `src/types/**`
- `g5-admin-models/src/models/**`
- `src-tauri/src/commands/**`
- `/admin/schema`를 소비하는 route-native 폼

이 경우 `rust-php-parity-audit.md`를 추가합니다.

## Phase 3. 보고

`specs/HISTORY.md`에 Why를 남기고, 기능 완료 선언 전에 아래를 기록합니다.

- 무엇을 바꿨는가
- 어떤 테스트가 회귀를 막는가
- 소비 계약 감사로 승격해야 하는지 여부
- warning/failure를 일시 허용했다면 `specs/audits/WAIVERS.toml`에 근거를 남겼는지 여부
