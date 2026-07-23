---
doc_type: strategy
status: active
owner: rust-admin
source_of_truth: true
canonical_for: audit strategy
ai_default_include: true
last_reviewed: 2026-03-15
review_cycle_days: 30
bounded_context: global
---
# 감사 전략

이 문서는 `rust` 프로젝트의 감사가 **왜 존재하는지**와 **무엇을 지키기 위한 것인지**를 설명합니다.
실행 타이밍, 실패 기준, 명령 진입점, 산출물 규칙은 [`specs/AUDIT_SYSTEM.md`](/Users/neojins/workspace/gnuboard5/rust/specs/AUDIT_SYSTEM.md)가 SSOT입니다.

## 1. 전략 목표

- Rust는 PHP REST API를 소비하는 관리자 앱입니다.
- 따라서 감사의 목적도 “무엇을 구현했는가”보다 “무엇을 어떻게 소비하고 경계를 어떻게 유지하는가”에 있습니다.
- 이 프로젝트의 성공은 구현 속도보다, bounded context·계약·데이터 소유권·레거시 오염 방지 규칙을 지속적으로 강제하는 감사 체계에 달려 있습니다.

## 2. Rust 감사의 책임 경계

- `rust`는 **소비단 감사**를 담당합니다.
- `php`는 **공급자 감사**를 담당합니다.
- Rust가 책임지는 것은 다음입니다.
  - OpenAPI snapshot / DTO / ts-rs 바인딩 정합성
  - `/admin/schema` 의미 적용
  - auth/error/meta 소비 일관성
  - command/service/port/infra 경계 유지
- Rust가 최종 판정하지 않는 것은 다음입니다.
  - PHP의 DB parity
  - 레거시 write/read provider parity
  - provider contract 생성 책임
  - provider schema domain 생성 책임

## 3. 감사가 지속 강제해야 하는 것

1. bounded context가 흐려지지 않는가
1. monitored feature가 다른 business feature를 직접 import하지 않는가
2. OpenAPI와 `/admin/schema` 계약이 드리프트하지 않는가
3. 데이터 소유권과 transaction boundary가 명확한가
4. legacy가 quarantine 밖으로 새지 않는가
5. AppState, registry, shell이 다시 giant orchestrator로 커지지 않는가
6. route-native domain마다 SDD와 최소 smoke checklist가 실제 surface와 맞물리는가
7. route-native form마다 save success / validation / unsupported 404 증적이 자동으로 드러나는가
8. 문서와 코드, 문서와 스크립트, 문서와 CI가 같은 규칙을 말하는가
9. active 문서만 AI 기본 참조 대상으로 남고, deprecated/superseded/archive 문서가 현재 설계를 오염시키지 않는가
10. active-scope 문서의 review cycle과 canonical uniqueness가 상설 검사에서 유지되는가

## 4. 감사 원칙

- 감사는 구현 뒤의 옵션이 아니라 완료 조건입니다.
- 감사는 file size policing이 아니라 ownership drift 탐지여야 합니다.
- domain boundary 규칙은 문장 권고가 아니라 machine-readable registry(`specs/audits/DOMAIN_BOUNDARY_RULES.toml`)로 강제해야 합니다.
- warning과 failure는 섞지 않습니다.
- 허용된 예외는 구두 승인이나 채팅 로그가 아니라 waiver registry로 남겨야 합니다.
- active warning도 owner/기한 없는 자유 메모로 두지 않고 warning budget registry로 운영해야 합니다.
- 문서 감사는 구현 감사의 부속이 아니라 독립된 정식 감사 루프여야 하며, 문서 정책 변경은 별도 gate를 통과해야 합니다.
- 억지 분리, 숫자 맞추기, 근거 없는 구조 변경은 개선으로 보지 않습니다.
- 감사는 자동화가 우선이고, 수기 문서는 자동화가 다루지 못하는 판정을 보완해야 합니다.
- 소비자 warning이 provider blocker로 판정되면 구현 backlog가 아니라 handoff backlog로 분류해야 합니다.
- provider blocker는 가능하면 generated artifact로 남겨 다음 교차 감사와 handoff에서 재사용 가능해야 합니다.
- blocked backlog는 `TODO.md` 한 줄 메모로 끝내지 않고 registry와 artifact까지 갖춘 운영 객체로 관리해야 합니다.
- provider가 먼저 구현했지만 Rust 활성 소비 범위 밖인 surface는 parity 실패로 오판하지 않도록 `specs/integration/ACTIVE_CONSUMER_SCOPE.json`에서 provider-only allowance를 관리해야 합니다.

## 5. 활성 구현 표면

- 현재 활성 구현 크레이트는 `g5-admin-models`, `g5-admin/src-tauri`입니다.
- `g5-admin-models`는 DTO/ts-rs 계약 surface입니다.
- `g5-admin/src-tauri`는 command/service/port/infra 조립 표면입니다.
- 구현 없는 `g5-api` placeholder는 활성 workspace에서 제거했습니다. PHP REST API가 provider이고 이 저장소는 소비자라는 경계를 유지합니다.

## 6. 운영 SSOT 관계

- 최고 규범: `.agent/Constitution.md`
- 감사 운영 SSOT: `specs/AUDIT_SYSTEM.md`
- 이 문서: `specs/AUDIT_STRATEGY.md`
- 사람/Codex 절차 설명: `.agent/workflows/*.md`
- 자동 집행: `scripts/run_*_audit.sh`, `scripts/check_*`, CI workflow
