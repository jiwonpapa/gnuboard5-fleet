# 구현 로드맵 SSOT

이 문서는 이 프로젝트의 유일한 구현 우선순위 SSOT입니다.
개별 planning 문서, 감사 문서, Codex 프롬프트는 본 문서를 보조할 수는 있어도 대체할 수 없습니다.

## 1. 현재 우선순위

| 순서 | 스트림 | 상태 | 완료 게이트 | 지원 문서 |
|------|------|------|------|------|
| R0 | 문서 관리 SSOT 도입 | 완료 | 로드맵/TODO/레지스트리/검색 인덱스/보관 스크립트 도입 | `docs/DOCUMENT_REGISTRY.md` |
| R1 | 문서-계약 정합성 1차 | 완료 | `docs/API_SPEC.md` 역할 정정, DDL 레퍼런스 전수 보강 | `docs/audits/DOC_CODE_CONSISTENCY_AUDIT_2026-03-06.md` |
| R2 | OpenAPI 계약 누락 해소 | 완료 | OpenAPI 누락 29건 반영, `/setup` 문서화 또는 비활성 결정 | `docs/audits/DOC_CODE_CONSISTENCY_AUDIT_2026-03-06.md` |
| R3 | 감사 문서 위생 정리 | 완료 | 감사 파일명 규칙 정리, `AUDIT_LATEST` 동기화, 보관 정책 통과 | `docs/audits/AUDIT_REPORT_2026-03-06.md` |
| R4 | 품질 게이트 신뢰성 회복 | 완료 | service coverage `82.01% (6035/7359)` 유지, `./scripts/run_quality_gates.sh` 재통과 | `docs/audits/AUDIT_REPORT_2026-03-11.md` |
| R5 | 레거시 Admin 메뉴 단계 이행 | 완료 | `menu100` 범위 정책 확정, `menu200` 정합화 완료, `menu300` FAQ 마스터 이행 완료, `menu900` SMS 관리자 이행 완료, 비메뉴 대시보드(`/admin/dashboard`) 구현 완료, 스테이징 SMS 운영 방침(`ADMIN_SMS_ENABLED`)까지 고정 | `docs/audits/ADMIN_DOMAIN_PROGRESS_AUDIT_2026-03-06.md`, `docs/audits/POINT_CONCURRENCY_AUDIT_2026-03-10.md` |
| R6 | 구조 정상화 마감과 레거시 경계 축소 | 완료 | local-only gateway 경계 가드 유지, direct env/global 접근을 intentional boundary로 제한, `SMS legacy bootstrap`을 token-only patch로 고정, `Auth/Point/Post`는 local source contract와 shared narrow port(`identity/session/recovery`, `query/reward/maintenance`, `read/write`) 기준으로 slim phase를 마감해 broad shell을 `compatibility` 수준으로 축소했고, 구조/구현/포팅 감사와 원격 Hurl smoke까지 녹색 유지 | `docs/AUDIT_STRATEGY.md`, `docs/architecture/SHARED_GATEWAY_INVENTORY.md`, `docs/HISTORY.md` |
| R7 | 실제 외부 인증 smoke | Blocked | staging `Google`/`Kakao` credential 반영 후 callback/login/linkage 수동 smoke 재개 | `docs/testing/EXTERNAL_PROVIDER_SANDBOX_MATRIX.md`, `docs/TODO.md` |
| R8 | 기능 확장 계획 | 대기 | Push / SDUI / UGC 계획 문서 중 착수 대상 확정 | `docs/planning/01_PUSH_NOTIFICATION.md`, `docs/planning/02_SDUI_DYNAMIC_LAYOUT.md`, `docs/planning/03_APPSTORE_UGC_COMPLIANCE.md` |
| R9 | 장기 탈의존 전략 | 대기 | G5 탈의존 장기 전략을 실행 가능한 분해 단위로 재편 | `docs/planning/04_G5_DECOUPLING_ROADMAP.md` |
| R10 | PHP OpenAPI 공급자 hard gate | 완료 | OpenAPI 312, active 189, protected 일반 게시판 26을 유지하고 provider/field binding blocking 0, audited 215/215 달성 | `docs/AUDIT_SYSTEM.md`, `output/openapi-provider-audit/latest.md`, `output/openapi-field-binding/latest.md` |

## 2. 다음 착수 범위

### 반드시 먼저 끝낼 항목

1. 실제 외부 인증 smoke를 위해 스테이징 `Google`/`Kakao` credential을 반영하고 `AUTH-308`, `AUTH-310`을 재개한다.
2. PHP 공급자 최종 운영 인증은 `QG-210` live identity·revision·OpenAPI SHA·write/readback을 먼저 결합하고, 이후 Rust 저장소의 `QG-208` 소비 aggregate에서 같은 실행 증적을 묶는다.
3. `adm/shop_admin` 포팅은 `QG-206` 별도 backlog로 유지하며 공개 `shop/` API로 범위를 확대하지 않는다.

### 이번 스프린트 종료 조건

- `composer audit`, 커버리지 게이트, 하드코딩 검사, 원격 배포 보안 프리플라이트(`.env` 비노출, `/setup` 잠금)가 재현 가능한 상태로 유지된다.
- 커버리지 게이트는 CI 하드 기준 80% 이상으로 통과한다. 현재 기준선은 `82.01% (6035/7359)`이다.
- `php-cs-fixer` dry-run은 `.php-cs-fixer.dist.php` 범위에서 `0 files`를 유지한다.
- 문서 거버넌스 게이트가 계속 통과한다.
- local-only gateway의 deprecated `Integration\\Contracts` 사용은 허용된 호환 지점만 유지한다.
- shared gateway의 cross-domain 사용은 `docs/architecture/SHARED_GATEWAY_INVENTORY.md` allowlist와 계약 테스트를 같이 통과한다.
- direct env/global 접근은 `EnvValueReader`, `EnvLoader`, `LegacyConfigProvider`, `LegacyIcodeEnvironmentBootstrapper` 같은 의도된 경계에만 남긴다.
- `docs/HISTORY.md`에 Why가 기록된다.

## 3. 지원 문서 역할

- `docs/planning/*.md`: 기능 제안과 설계 배경
- `docs/audits/*.md`: 근거와 발견사항
- `docs/architecture/*.md`: 구조 설명과 운영 규약

## 4. 변경 원칙

- 새 로드맵 문서를 추가하지 않는다.
- 우선순위 변경은 이 문서에서만 반영한다.
- 장기 전략 문서는 support 역할로 유지하고, 실행 순서는 여기서만 정한다.
