# G5 Rust Workspace

Gnuboard5 관리자용 Rust 워크스페이스입니다.

## Workspace 구성

- `g5-admin`: Tauri v2 + React 기반 관리자 데스크톱 앱
- `specs`: 스펙, 감사, 구현 이력 문서

## 기본 품질 게이트

```bash
cd g5-admin && bun run audit:implementation
```

## 로컬 CI

```bash
cd g5-admin
bun run hooks:install
bun run ci:local
bun run ci:release-local
```

- `pre-push`는 diff 기준 타입·lint·관련 테스트·변경 crate·계약·구조 검사만 실행합니다. 의존성 설치와 전체 workspace 재빌드는 하지 않습니다.
- `ci:local`은 릴리스 전 전체 정적 파이프라인, frontend coverage/build, Rust workspace lint/test를 각 1회 실행합니다. 의존성 fingerprint가 같으면 설치를 재사용합니다.
- `ci:release-local`만 macOS의 Windows MSVC target type check를 추가합니다.
- GitHub Actions의 contract/docs/structure는 PR·main push에서 자동 실행하고, 무거운 통합·교차 플랫폼 workflow는 수동 실행합니다. Windows `.exe/.msi` 최종 증명은 로컬 Windows 호스트에서 수행합니다.

## 빌드 산출물 자동 정리

```bash
cd g5-admin
bun run clean:artifacts:schedule
bun run clean:artifacts:auto
```

- 매주 일요일 02:00에 용량을 기록하고 오래된 배포 rollback archive만 정리합니다.
- `target/`과 incremental 캐시는 크기와 무관하게 자동 삭제하지 않으며, 32GB 초과 시 경고만 남깁니다.
- 실제 캐시 삭제는 `clean:artifacts` 또는 `clean:artifacts:full`을 명시적으로 실행할 때만 수행합니다.

## Codex 감사 래퍼

```bash
cd g5-admin
bun run audit:implementation
bun run audit:consumer
bun run audit:structure
bun run contract:check
bun run audit:integrated
```

- `audit:implementation` — document governance, TypeScript/lint/test, scoped Rust desktop check/test, ts-rs export sync
- `audit:consumer` — OpenAPI snapshot/local manifest 검증 + PHP-Rust integrated audit
- `audit:structure` — 구조 metric + domain/form metadata/save smoke + 변경 source hotspot 검사
- `audit:integrated` — generated JSON/Markdown 결과를 남기는 PHP-Rust 교차 감사

## 감사 문서 SSOT

- 운영 SSOT: `specs/AUDIT_SYSTEM.md`
- 전략 문서: `specs/AUDIT_STRATEGY.md`
- 최고 규범: `.agent/Constitution.md`
- 도메인 경계 규율: `specs/foundation/DOMAIN_BOUNDARY_ENFORCEMENT.md`
- 예외 registry: `specs/audits/WAIVERS.toml`
- blocker registry: `specs/audits/BLOCKERS.toml`
- 수기 보고 템플릿: `specs/foundation/AUDIT_REPORT_TEMPLATE.md`

## OpenAPI 계약 게이트

- `bun run contract:check`
- `bun run contract:sync`
- snapshot source of truth: `specs/contracts/php-openapi.snapshot.yaml`
- manifest snapshot: `specs/contracts/php-openapi.contract-manifest.json`
- generated Zod artifact: `g5-admin/contracts/generated/openapi-zod-client.ts`
- 통합 레포에서는 `connectors/gnuboard5-php`의 `api/docs/openapi.yaml`과 `api/docs/openapi.contract-manifest.json`을 자동 검증하며, 독립 체크아웃에서는 legacy sibling PHP를 호환합니다.
- routine 통합 감사 기준은 `php + rust`입니다. 보관 상태인 Flutter/Web는 기본 감사 범위에 포함하지 않습니다.

## License

This project is licensed under the [AGPL-3.0](LICENSE).
