---
doc_type: support
status: active
owner: rust-admin
source_of_truth: false
ai_default_include: true
last_reviewed: 2026-03-13
review_cycle_days: 30
bounded_context: foundation
---
# App Core Boundary Plan

이 문서는 `g5-admin/src-tauri`의 app-core 경계와 DI 방향을 고정하는 지원 문서다.
목표는 지금 있는 `AppStateDependencies -> AppState::from_dependencies` seam을 기준으로,
다음 crate split이 억지 분해가 아니라 **포트/서비스 경계가 선 상태**에서 진행되게 만드는 것이다.
첫 split으로 `g5-admin-models`가 이미 workspace member가 된 뒤에도, 이 문서는 그 다음 `g5-admin-core` 분리 기준을 계속 고정한다.

## 1. 범위

- 대상: `/Users/neojins/workspace/gnuboard5/rust/g5-admin/src-tauri/src`
- 기준 seam:
  - [`AppStateDependencies`](/Users/neojins/workspace/gnuboard5/rust/g5-admin/src-tauri/src/app_state/mod.rs)
  - [`AppState::from_dependencies`](/Users/neojins/workspace/gnuboard5/rust/g5-admin/src-tauri/src/app_state/mod.rs)
- 현재 concrete 타입:
  - [`ApiClient`](/Users/neojins/workspace/gnuboard5/rust/g5-admin/src-tauri/src/api_client/mod.rs)
  - [`TokenStore`](/Users/neojins/workspace/gnuboard5/rust/g5-admin/src-tauri/src/token_store/mod.rs)
  - [`SiteRepository`](/Users/neojins/workspace/gnuboard5/rust/g5-admin/src-tauri/src/db/mod.rs)
  - [`SiteManager`](/Users/neojins/workspace/gnuboard5/rust/g5-admin/src-tauri/src/site_manager.rs)

## 2. 현재 구조 판정

- `AppState`는 아직 composition root이면서 동시에 일부 도메인 orchestration을 직접 가진다.
- command는 대부분 `State<'_, AppState>` concrete 타입을 직접 받는다.
- `ApiClient`, `TokenStore`, `SiteRepository`, `SiteManager`는 각각 역할이 비교적 분명하지만 trait/port로 추상화되지는 않았다.
- 따라서 지금 당장 crate를 쪼개면 `concrete 타입 이동`만 일어나고 결합은 그대로 남을 가능성이 높다.

## 3. 경계 원칙

### 3.1 AppState

- 책임:
  - dependency 조립 결과를 보관
  - 앱 전역 런타임 상태 유지
  - command에서 필요한 service entry 제공
- 금지:
  - SQL query 디테일 소유
  - raw HTTP request 조립
  - keychain/file backend 디테일 소유

### 3.2 ApiClient

- 현재 책임:
  - PHP REST API transport
  - base URL 교체
  - request/response/problem parsing
- 목표 포트:
  - `AdminApiPort`
- 금지:
  - active site 선택 정책 소유
  - 세션 저장소 소유
  - 로컬 보안 설정 소유

### 3.3 TokenStore

- 현재 책임:
  - 사이트별 세션 저장/로드/삭제
  - keychain/file backend 선택
- 목표 포트:
  - `SessionStorePort`
- 금지:
  - API 호출
  - 사이트 catalog 정렬/선택 정책

### 3.4 SiteRepository

- 현재 책임:
  - 로컬 SQLite 저장소
  - 사이트 catalog CRUD
  - 앱 잠금/보안 설정 일부 persistence
  - backup import/export
  - runtime state/session hint 저장
- 목표 포트:
  - `SiteCatalogStorePort`
  - `SecurityStorePort`
  - `BackupStorePort`
- 주의:
  - 현재는 하나의 concrete repository지만, crate split 전에는 trait를 세 개로 나눠 command/service가 필요한 면만 보게 해야 한다.

### 3.5 SiteManager

- 현재 책임:
  - 메모리 내 site ordering
  - active site 선택
  - default site fallback
- 목표 서비스:
  - `SiteCatalogService`
- 금지:
  - DB 접근
  - API 호출
  - 세션 저장소 접근

## 4. 먼저 세워야 할 서비스 경계

### 4.1 SiteCatalogService

- 입력:
  - `SiteCatalogStorePort`
  - `SessionStorePort`
  - `AdminApiPort`
  - `SiteManager`
- 책임:
  - site list 로드/활성 site 변경
  - site session hint 반영
  - active site 전환 시 `ApiClient.set_base_url()`와 `TokenStore.set_active_site_id()`를 함께 적용

### 4.2 MasterLockService

- 입력:
  - `SecurityStorePort`
- 책임:
  - 잠금 상태 조회
  - 비밀번호 검증
  - 락아웃 상태 기계
  - TOTP unlock 보조 흐름

### 4.3 SecuritySettingsService

- 입력:
  - `SecurityStorePort`
- 책임:
  - idle timeout
  - TOTP enroll/enable/disable
  - fast unlock enroll/revoke

### 4.4 SessionService

- 입력:
  - `SessionStorePort`
- 책임:
  - 현재 active site 세션 load/save/clear
  - site 전환과 무관한 순수 세션 수명주기

## 5. crate split 순서

### Phase A. traits/service 추출

- 먼저 `src-tauri` 내부 모듈로 다음을 만든다.
  - `core/ports`
  - `core/services`
- 이 단계에서는 아직 workspace crate를 늘리지 않는다.
- 완료 기준:
  - command가 concrete repository/client 대신 service entry를 우선 호출
  - `AppState`가 concrete infra를 직접 노출하는 범위를 줄임

### Phase B. pure models 분리

- 첫 분리 대상은 `g5-admin-models`
- 이유:
  - `models/*`는 Tauri adapter나 infra 의존이 가장 적다.
  - ts-rs export와 DTO 계약을 독립 검증하기 쉽다.

### Phase C. core 분리

- 다음 대상은 `g5-admin-core`
- 내용:
  - port trait
  - service
  - app-core policy
- 금지:
  - reqwest
  - rusqlite
  - tauri

### Phase D. infra 분리

- 다음 대상은 `g5-admin-infra`
- 내용:
  - `ApiClient`
  - `TokenStore`
  - `SiteRepository`
  - local security/backend adapter

### Phase E. command adapter 분리

- 마지막 대상은 `g5-admin-command`
- 내용:
  - Tauri `#[command]`
  - invoke handler registry
  - AppState wiring

## 6. 금지 규칙

- trait부터 없는 상태에서 crate를 먼저 쪼개지 않는다.
- `State<'_, AppState>`를 각 command에서 더 깊게 전파하지 않는다.
- `AppState`를 새 giant service locator로 키우지 않는다.
- `db`와 `api_client`의 concrete 타입을 프론트 계약 변화에 맞춰 직접 흔들지 않는다.

## 7. 착수 순서

1. `SiteCatalogService` 초안 추가
2. `SessionStorePort` / `SiteCatalogStorePort` / `AdminApiPort` 최소 trait 도입
3. `AppState`에 service field 또는 service factory seam 추가
4. `site` 계열 command부터 service 경유로 전환
5. 그다음 `security` 계열 command 전환
6. 그다음에만 `g5-admin-models -> g5-admin-core -> g5-admin-infra -> g5-admin-command` 순으로 crate split 착수

## 7.1 진행 현황 (`2026-03-13`)

- 완료: `SiteCatalogService`, `SecuritySettingsService`, `MasterLockService`, `SessionService`를 실제 코드에 도입했다.
- 완료: `core/ports.rs`에 `AdminApiPort`를 추가했고, `ApiClient`가 이를 구현한다.
- 완료: `core/ports.rs`에 `SessionStorePort`, `SiteCatalogStorePort`를 추가했고, `TokenStore`, `SiteRepository`가 이를 구현한다.
- 완료: `core/ports.rs`에 `SecurityStorePort`, `BackupStorePort`를 추가했고, `SiteRepository`가 이를 구현한다.
- 완료: `AppState`는 `admin_api()` accessor를 통해 auth/session과 active-site base URL 적용도 concrete `ApiClient` 대신 port를 보게 한다.
- 완료: `AppState`는 `session_store()`, `site_catalog_store()` accessor를 통해 service가 concrete infra 대신 port를 보게 하는 최소 경계를 갖는다.
- 완료: `AppState`는 `security_store()`, `backup_store()` accessor를 통해 `security`/`master_lock` service도 concrete infra 대신 port를 보게 한다.
- 완료: `site/security/master_lock/session` command와 shared helper는 `AppState` wrapper 대신 `site_catalog_service()`, `security_settings_service()`, `master_lock_service()`, `session_service()`를 직접 소비한다.
- 완료: 첫 split 착수 판정 결과 `g5-admin-models`가 가장 안전한 1차 후보로 확정됐다. blocker였던 `models <-> error` 순환은 `models/problem.rs` 도입으로 제거했고, `ProblemDetails`, `ErrorGuide`, `AppErrorPayload`는 모델 계약으로 승격됐다.
- 완료: workspace member `g5-admin-models`를 추가하고 `models/*`, `trace`, `problem` 계약을 실제 외부 crate로 옮겼다. `src-tauri`는 `pub use g5_admin_models::models;` re-export만 남기고, `ts-rs export_to` 경로와 테스트 export harness도 새 crate 기준으로 보정했다.
- 완료: `scripts/core_split_readiness.py`와 `collect_architecture_metrics.py`가 `SessionService / SiteCatalogService / SecuritySettingsService / MasterLockService`의 blocker 수와 `core/ports.rs` 잔존 concrete coupling을 구조 감사 메트릭으로 표면화한다.
- 다음: 아래 `7.2`의 준비선에 맞춰 `core/ports trait-only 분리 -> SessionService constructor 파라미터화 -> g5-admin-core 첫 member 추가` 순서로 실제 분리를 시작한다.

## 7.2 core split readiness snapshot (`2026-03-13`)

### 첫 외부 core 경계

- 고정: **`g5-admin-core` 첫 외부 경계는 `trait-only ports + SessionService`까지만 허용**한다.
- 금지:
  - `ApiClient`, `TokenStore`, `SiteRepository` concrete impl을 같이 옮기는 것
  - `SiteCatalogService`, `SecuritySettingsService`, `MasterLockService`를 첫 배치에 같이 옮기는 것
- 이유:
  - `core/ports.rs`는 아직 concrete adapter import와 impl을 같이 품고 있다.
  - `SessionService`만이 현재 서비스 중 runtime flag, `SiteManager`, TOTP/time helper 없이 `SessionStorePort + SiteCatalogStorePort` 두 포트만으로 설명 가능하다.

### readiness 순서

1. `SessionService`
   - blocker:
     - `AppState` wrapper coupling
   - 준비 작업:
     - `SessionService::new(&AppState)`를 포트 직접 주입 constructor로 바꾼다.
     - `core/ports.rs`의 trait 정의와 concrete impl을 분리한다.

2. `SiteCatalogService`
   - blocker:
     - `AppState` wrapper coupling
     - `site_manager` runtime state
     - `sites_initialized` runtime flag
     - `ensure_master_unlocked()` gate
     - `verify_sensitive_action()` wrapper
     - `apply_active_site()` helper
   - 준비 작업:
     - `SiteManager`/active-site runtime state를 별도 runtime context 또는 port로 분리한다.
     - unlock gate와 민감 작업 검증을 service 외부 policy seam으로 뺀다.

3. `SecuritySettingsService`
   - blocker:
     - `AppState` wrapper coupling
     - `ensure_master_unlocked()` gate
     - `verify_totp_code()` wrapper
     - `site_manager` runtime state
     - `pending_totp_unlock` runtime flag
     - `DEFAULT_IDLE_TIMEOUT_MINUTES`, `TOTP_ISSUER`, `TOTP_ACCOUNT_NAME`, `current_epoch_seconds` 같은 `app_state` helper/constants
   - 준비 작업:
     - TOTP/time/config constants를 service 내부 전용 module 또는 core helper로 승격한다.
     - pending TOTP runtime state를 별도 runtime state seam으로 뺀다.

4. `MasterLockService`
   - blocker:
     - `AppState` wrapper coupling
     - `master_unlocked` runtime flag
     - `pending_totp_unlock` runtime flag
     - `site_manager` runtime state
     - `ensure_sites_loaded()`/`apply_active_site()` helper
     - `current_epoch_seconds()`/`format_unlock_retry_after_message()` helper
     - `load_totp_enabled()` cross-service wrapper
   - 준비 작업:
     - lock runtime state와 site bootstrap/apply helper를 분리한다.
     - TOTP enabled 조회를 별도 policy/reader seam으로 끊는다.

### `core/ports.rs` 준비선

- 현재 blocker:
  - `ApiClient` concrete import
  - `SiteRepository`-backed storage type import
  - `TokenStore` concrete import
  - port trait 정의와 concrete adapter impl 동거
- 다음 분리 규칙:
  - `g5-admin-core`로 가는 것은 **trait declaration only**
  - concrete impl은 `src-tauri` 또는 이후 `g5-admin-infra`에 남긴다
  - `SiteInsert`, `SiteUpdateRecord`, `AppLockRecord`, `BackupImportSummary` 같은 infra type은 core로 직접 들고 가지 않는다

## 8. 완료 기준

- `AppState`가 concrete infra 조립만 담당하고 business orchestration은 service로 이동
- 최소 1개 command 군(`site` 또는 `security`)이 service 경유로 전환
- `models`가 독립 crate로 옮겨져도 import cycle이 생기지 않음
- 문서 기준 crate split 순서가 `TODO`, `HISTORY`, 구조 감사 문서와 일치
