---
doc_type: governance
status: active
owner: rust-admin
source_of_truth: false
ai_default_include: true
last_reviewed: 2026-03-13
review_cycle_days: 30
bounded_context: global
---
# 멀티 에이전트 동시 편집 금지 서브헌법 v1.1.0

> **상위 헌법**: `Constitution.md` §14 (Rust Edition)
> **적용 대상**: G5 Admin Rust/React 프로젝트에 접근하는 모든 AI 에이전트

---

## 1. 핵심 원칙 (이것만 기억하라)

> 🔥 **같은 파일을 여러 AI가 동시에 수정하면 안 된다. 이것이 전부다.**

- **위반**: 같은 파일을 여러 AI가 실제로 동시에 수정한 경우 → 후행 수정 Revert
- **위반 아님**: 잠금을 안 걸었지만 다른 AI가 해당 파일을 건드리지 않은 경우
- **위반 아님**: 같은 도메인이지만 서로 다른 파일을 각각 수정한 경우

도메인 잠금은 이 원칙을 **보수적으로 운영하기 위한 관리 도구**이다. 잠금 미획득 자체가 위반이 아니다.

## 2. 잠금 시스템 (경합 사전 방지 도구)

```
gnuboard5/.agent-locks/
├── agent-lock-domains.yaml      # 도메인 ↔ 파일경로 매핑 (SSOT)
├── lock.sh / unlock.sh / status.sh / cleanup.sh
└── active/rust/                 # 런타임 잠금 파일 (.gitignore)
```

## 3. 에이전트 작업 프로토콜

### 3.1 잠금 사용 (권장, 강제 아님)

```bash
../.agent-locks/lock.sh rust member my-agent-name
# 작업 수행...
../.agent-locks/unlock.sh rust member my-agent-name
```

### 3.2 Rust 특화 참고사항

- **`core` 도메인**: `api_client.rs`, `error.rs`, `token_store.rs`, `models/` 등 공통 인프라. 영향 범위가 넓으므로 TTL 짧게 설정 권장.
- **`scripts`/`tests` 도메인**: `scripts/`, `tools/`, `g5-admin/tests/` 등. 보조 스크립트와 E2E 테스트.
- **`common` 도메인**: `commands/common.rs`, `commands/session.rs`, `commands/mod.rs` — IPC 공통 모듈.
- **ts-rs 자동 생성**: `cargo test -p g5-admin-models --features ts-bindings models::tests::export_ts_bindings`는 잠금 불필요 (자동 생성 파일)

## 4. 금지 사항

1. ❌ 같은 파일을 여러 AI가 동시에 수정
2. ❌ 다른 에이전트의 잠금 강제 삭제
3. ❌ `agent-lock-domains.yaml` 임의 수정 (사용자 승인 필요)

## 5. 예외 사항

- **긴급 핫픽스**: 사용자 명시 지시 시에만 잠금 무시 허용
- **읽기 전용 작업**: 조회, 분석, 감사는 잠금 불필요
