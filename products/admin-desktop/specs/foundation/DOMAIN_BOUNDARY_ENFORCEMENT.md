---
doc_type: support
status: active
owner: rust-admin
source_of_truth: false
ai_default_include: true
last_reviewed: 2026-03-15
review_cycle_days: 30
bounded_context: foundation
description: Rust 어드민에서 도메인 경계, support namespace, AppState service seam을 강제하는 규율과 처리 수단
---
# 도메인 경계 강제 규율

이 문서는 Rust 어드민에서 **도메인 경계를 느슨하게 유지하기 위한 강제 규율**과 **위반 처리 수단**을 정의합니다.

이 문서는 헌법의 짧은 조항을 실행 가능한 수준으로 풀어쓴 지원 문서입니다. 실제 자동 강제는 `specs/audits/DOMAIN_BOUNDARY_RULES.toml`와 `scripts/check_active_crate_boundaries.py`가 담당합니다.

## 1. 최상위 원칙

- 폴더 분리보다 **의존 방향 통제**가 우선입니다.
- feature domain은 자기 책임만 가지며, 다른 business feature의 내부 구현에 직접 의존하지 않습니다.
- cross-domain 조정은 `application/service seam`으로 올리고, shared/support namespace는 business owner 없는 계약과 primitive만 가집니다.
- `shared/common/utils`가 business logic 하수구가 되면 구조 실패로 간주합니다.

## 2. 1차 강제 범위

현재 machine-readable registry가 직접 강제하는 범위는 아래입니다.

- monitored frontend feature:
  - `mails`
  - `sms-contacts`
  - `points`
  - `security`
  - `sites`
- support namespace:
  - `g5-admin/src/features/shared`
  - `g5-admin/src/components`
  - `g5-admin/src/lib`
  - `g5-admin/src/api`
- backend service seam:
  - `site_catalog_service`
  - `security_settings_service`
  - `master_lock_service`
  - `session_service`

범위는 **baseline이 녹색일 때만** 넓힙니다. 감시 대상을 늘리기 전에 허용 target과 remediation 경로를 registry에 먼저 적어야 합니다.

## 3. 강제 규칙

### 3.1 feature domain 직접 import 금지

- monitored feature는 자기 파일과 허용된 support namespace 외의 다른 feature를 직접 import하면 안 됩니다.
- 허용 target은 `DOMAIN_BOUNDARY_RULES.toml`에 명시합니다.
- 위반은 구조 감사 `failure`입니다.

허용 예:

- `mails -> admin/layout/schema/shared`
- `sms-contacts -> admin/layout/schema/shared`
- `points -> admin/layout/schema/shared`
- `security -> master/layout/shared`
- `sites -> master/security/layout/shared`

금지 예:

- `mails -> members`
- `points -> boards`
- `sms-contacts -> mails`

### 3.2 support namespace business drift 금지

- `features/shared`, `components`, `lib`, `api`는 business feature를 직접 import하면 안 됩니다.
- 예외는 registry에 명시된 support dependency만 허용합니다.
- 위반은 구조 감사 `failure`입니다.

현재 허용 예:

- `features/shared -> layout`

### 3.3 AppState wrapper service coupling 경고

- `app_state/*service.rs`는 최종적으로 `&AppState` wrapper가 아니라 constructor-injected collaborator/port를 받아야 합니다.
- 현재 남아 있는 wrapper service는 registry에 명시하고, 구조 감사 `warning` + warning budget으로 관리합니다.
- 새 service는 같은 패턴을 복제하지 않습니다.

## 4. 처리 수단

### 4.1 feature direct import 위반

아래 순서로 처리합니다.

1. 다른 feature에서 필요한 정보가 **진짜로 business policy**인지 확인합니다.
2. policy가 아니라면 owner feature 내부 구현 의존을 지우고, 아래 중 하나로 이동합니다.
   - `admin/shared`
   - `schema`
   - `shared`
   - `layout`
3. policy/조정이 맞다면 UI hook/page에서 직접 엮지 말고 application/service seam으로 올립니다.

### 4.2 support namespace drift

아래 순서로 처리합니다.

1. code가 owner feature 전용인지 확인합니다.
2. owner feature 전용이면 그 feature로 돌립니다.
3. 여러 feature가 쓰더라도 business 의미가 있으면 shared가 아니라 **별도 owner/support contract**로 분리합니다.
4. truly generic한 formatting/view helper만 support namespace에 남깁니다.

### 4.3 AppState service wrapper coupling

아래 순서로 처리합니다.

1. service가 실제로 쓰는 collaborator를 목록화합니다.
2. `AppState` field를 없애고 필요한 collaborator만 constructor parameter로 받습니다.
3. 가능하면 `Port` 또는 작은 runtime context로 축소합니다.
4. `service -> AppState` direct dereference 수가 0이 되면 budget을 제거합니다.

## 5. 강제 수단

- 규칙 SSOT: `specs/audits/DOMAIN_BOUNDARY_RULES.toml`
- 구조 감사: `scripts/check_active_crate_boundaries.py`
- 메트릭: `scripts/collect_architecture_metrics.py`
- 운영 경고 관리: `specs/audits/WARNING_BUDGETS.toml`

운영 원칙:

- 새 위반은 registry 없는 예외로 허용하지 않습니다.
- `warning`은 budget이 있어야만 유지할 수 있습니다.
- 만료된 budget은 자동으로 실패입니다.
- `failure`는 waiver 없이는 merge/완료 기준을 통과할 수 없습니다.

## 6. 현재 baseline 해석

- frontend monitored scope는 현재 녹색이어야 합니다.
- backend service seam은 아직 `warning budget` 대상입니다.
- 즉, 현재 구조는 “감시 없이 느슨한 결합을 기대하는 상태”가 아니라, **강제 규칙은 도입됐고 남은 wrapper coupling만 계획된 부채로 관리하는 상태**여야 합니다.
