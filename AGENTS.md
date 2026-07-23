# Codex Wrapper For Rust

이 디렉토리는 **그누보드5 REST API 소비자** 프로젝트입니다.
Codex는 이 파일을 `rust` 작업의 1차 진입점으로 사용합니다.

## 1. 프로젝트 정체성

- 활성 앱은 `g5-admin`이며, PHP REST API를 소비하는 Tauri + React 관리자 클라이언트입니다.
- `g5-api`는 실험용 facade crate이며 routine 구현/감사의 중심은 아닙니다.
- 공개 계약 SSOT는 통합 레포 기준 `connectors/gnuboard5-php/api/docs/openapi.yaml`입니다.
- `flutter`, `web`는 기본 구현/감사 범위에서 제외합니다.

## 2. 최우선 규칙

- React는 G5 REST API를 직접 `fetch()` 하지 않습니다. 항상 `invoke(cmd_*) -> Rust -> PHP API` 경로만 사용합니다.
- Rust DTO, TypeScript 바인딩, `apiTargets`, 인증/에러 매핑은 PHP OpenAPI 계약과 `/admin/schema` 의미를 기준으로 맞춥니다.
- 문서 SSOT는 `specs/README.md`, `specs/IMPLEMENTATION_ROADMAP.md`, `specs/TODO.md`, `specs/HISTORY.md`입니다.
- `g5-admin/src/features/**`는 화면 ownership만, `g5-admin/src-tauri/src/**`는 transport/security/runtime ownership만 가져야 합니다.
- `AppState::from_env()`, route registry, diagnostics registry, `api/client/core.ts` 같은 중앙 조립 지점은 오케스트레이션만 해야 합니다.

## 3. Codex 기본 실행 순서

일반 작업 마감:

```bash
cd g5-admin && bun run audit:implementation
```

OpenAPI, DTO, auth/error, `/admin/schema`, `apiTarget` 의미를 건드렸을 때:

```bash
cd g5-admin && bun run audit:consumer
```

구조가 흔들리거나 대규모 리팩터링 전후:

```bash
cd g5-admin && bun run audit:structure
```

릴리즈 전 또는 전체 workspace 회귀를 명시적으로 닫아야 할 때:

```bash
cd g5-admin && bun run audit:deep
```

PHP와 Rust를 함께 바꿨거나 release 전 교차 회귀를 닫아야 할 때:

```bash
cd g5-admin && bun run audit:integrated
```

## 4. 추가 감사 조건

아래 변경은 `bun run audit:consumer`를 추가합니다.

- `specs/contracts/**`
- `g5-admin/src/api/client/**`
- `g5-admin/src/types/**`
- `g5-admin-models/src/models/**`
- `g5-admin/src-tauri/src/commands/**`
- `g5-admin/src/features/**` 중 `/admin/schema`를 소비하는 route-native 폼

아래 변경은 `bun run audit:structure`를 추가합니다.

- `g5-admin/src/features/layout/navigation.ts`
- `g5-admin/src/features/layout/**`
- `g5-admin/src/features/**` 중 route-native page/workflow smoke, form metadata, save smoke coverage registry가 붙은 surface
- `g5-admin/src-tauri/src/lib.rs`
- `g5-admin/src-tauri/src/app_state/**`
- `g5-admin/src-tauri/src/db/**`
- `g5-admin/src-tauri/src/commands/registry.rs`

중요:

- `audit:structure`는 빠른 거버넌스 gate이며, 기본으로 frontend build나 Cargo workspace check/test를 실행하지 않습니다.
- full workspace Cargo check/test는 `audit:deep`에서만 실행합니다.
- `rust`는 **소비단 감사**를 담당합니다.
- PHP의 DB parity, 레거시 포팅 write/read 정합성은 PHP가 소유하고, Rust는 계약 소비와 UI 의미 적용을 판정합니다.

## 5. 실제 상세 규칙 위치

- 헌법: `.agent/Constitution.md`
- 감사 운영 SSOT: `specs/AUDIT_SYSTEM.md`
- 감사 전략: `specs/AUDIT_STRATEGY.md`
- 도메인 경계 규율: `specs/foundation/DOMAIN_BOUNDARY_ENFORCEMENT.md`
- 감사 예외 registry: `specs/audits/WAIVERS.toml`
- blocker registry: `specs/audits/BLOCKERS.toml`
- 문서 거버넌스: `.agent/sub-constitutions/document-governance.md`
- 구현 감사 설명: `.agent/workflows/codex-audit.md`
- 구조 감사 설명: `.agent/workflows/architecture-audit.md`
- 소비 계약 감사 설명: `.agent/workflows/rust-php-parity-audit.md`
- 통합 감사 설명: `.agent/workflows/integrated-three-way-audit.md`

원칙:

- 감사 실행 기준과 failure/warning 의미는 `specs/AUDIT_SYSTEM.md`를 우선합니다.
- 허용된 예외는 `specs/audits/WAIVERS.toml`에 남기지 않으면 승인된 것으로 보지 않습니다.
- provider blocker로 막힌 backlog는 `specs/audits/BLOCKERS.toml`에 남기지 않으면 공식 handoff 상태로 보지 않습니다.
- 위 워크플로우 문서는 **설명서**입니다.
- 실제 실행 진입점은 항상 `bun run audit:*` 또는 `scripts/run_*_audit.sh` 입니다.
- role-based 명령은 `audit:implementation`, `audit:consumer`, `audit:structure`를 우선 사용합니다.
- `audit:standard`, `audit:contract`는 호환 alias이고, `audit:deep`는 full workspace 확인이 필요한 경우에만 명시적으로 사용합니다.
