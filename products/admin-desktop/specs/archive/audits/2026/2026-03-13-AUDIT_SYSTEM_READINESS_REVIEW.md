# Rust 감사 체계 운영 준비도 보고서 — 2026-03-13

## 1. 메타데이터

- 감사 이름: Rust 감사 체계 운영 준비도 점검
- 감사 분류: `structure`
- 감사 대상: `rust` 저장소의 감사 운영 체계 전체
- 감사 기준 문서:
  - [Constitution.md](/Users/neojins/workspace/gnuboard5/rust/.agent/Constitution.md)
  - [AUDIT_SYSTEM.md](/Users/neojins/workspace/gnuboard5/rust/specs/AUDIT_SYSTEM.md)
  - [AUDIT_STRATEGY.md](/Users/neojins/workspace/gnuboard5/rust/specs/AUDIT_STRATEGY.md)
- 감사 일시: 2026-03-13
- 감사자: Codex

## 2. 입력과 범위

- 읽은 코드/문서:
  - [run_deep_audit.sh](/Users/neojins/workspace/gnuboard5/rust/scripts/run_deep_audit.sh)
  - [check_active_crate_boundaries.py](/Users/neojins/workspace/gnuboard5/rust/scripts/check_active_crate_boundaries.py)
  - [check_warning_budgets.py](/Users/neojins/workspace/gnuboard5/rust/scripts/check_warning_budgets.py)
  - [check_audit_waivers.py](/Users/neojins/workspace/gnuboard5/rust/scripts/check_audit_waivers.py)
  - [check_blocker_registry.py](/Users/neojins/workspace/gnuboard5/rust/scripts/check_blocker_registry.py)
  - [collect_architecture_metrics.py](/Users/neojins/workspace/gnuboard5/rust/scripts/collect_architecture_metrics.py)
  - [WARNING_BUDGETS.toml](/Users/neojins/workspace/gnuboard5/rust/specs/audits/WARNING_BUDGETS.toml)
  - [WAIVERS.toml](/Users/neojins/workspace/gnuboard5/rust/specs/audits/WAIVERS.toml)
  - [BLOCKERS.toml](/Users/neojins/workspace/gnuboard5/rust/specs/audits/BLOCKERS.toml)
- 실행한 명령:
  - `bash scripts/run_deep_audit.sh`
  - `python3 scripts/check_active_crate_boundaries.py`
  - `python3 scripts/check_warning_budgets.py`
  - `python3 scripts/doc-index.py`
  - `bash scripts/check-doc-governance.sh`
- 제외 범위:
  - `php` 공급자 코드 자체의 구조 판정
  - `flutter`, `web`
  - 실제 앱 소스 리팩터링
- 가정:
  - 현재 평가는 “감사 체계가 운영 가능한가”에 대한 것이며, active warning 13건은 구조 부채로 남아 있어도 감사 체계 실패로 보지 않는다.

## 3. 요약

- 전체 판정: `warning`
- 핵심 결론:
  - 감사 체계는 이제 `문서 선언` 단계를 넘어 `실행 가능한 운영 체계`로 올라왔다.
  - 구현/소비 계약/구조/통합 감사가 모두 상설 스크립트와 CI 진입점을 갖췄고, waiver·blocked backlog·warning budget까지 machine-readable registry로 관리된다.
  - 다만 active structure warning 13건이 여전히 남아 있어, 체계는 운영 가능하지만 구조 상태 자체가 안정권이라고 보긴 이르다.
- 즉시 조치 필요 여부:
  - 감사 체계 자체는 즉시 추가 수습이 필요한 상태는 아니다.
  - 다만 [WARNING_BUDGETS.toml](/Users/neojins/workspace/gnuboard5/rust/specs/audits/WARNING_BUDGETS.toml) 만료일인 `2026-04-03` 전까지 warning 13건을 줄이거나 budget을 갱신해야 한다.

## 4. Findings

### Failure

- 없음

### Warning

- `[root_orchestrator_growth]` [error/mod.rs](/Users/neojins/workspace/gnuboard5/rust/g5-admin/src-tauri/src/error/mod.rs): `235 LOC`. root error entry가 아직 warning threshold `220`를 넘는다.
- `[root_orchestrator_growth]` [commands/registry.rs](/Users/neojins/workspace/gnuboard5/rust/g5-admin/src-tauri/src/commands/registry.rs): `225 LOC`. IPC registry가 아직 warning threshold `220`를 넘는다.
- `[giant_registry_priority]` [navigation-manifest.ts](/Users/neojins/workspace/gnuboard5/rust/g5-admin/src/features/layout/navigation-manifest.ts): `779 LOC`. data-manifest 예산 `700/900` 안이지만 warning 영역이다.
- `[giant_registry_priority]` [core/ports.rs](/Users/neojins/workspace/gnuboard5/rust/g5-admin/src-tauri/src/core/ports.rs): `285 LOC`. port-definition 예산 `220/320` warning 영역이다.
- `[service_ownership_hotspot]` [master_lock_service.rs](/Users/neojins/workspace/gnuboard5/rust/g5-admin/src-tauri/src/app_state/master_lock_service.rs): `site_catalog_store`, `security_store`, `site_manager` 3개 backend seam을 동시에 건드린다.
- `[service_ownership_hotspot]` [security_settings_service.rs](/Users/neojins/workspace/gnuboard5/rust/g5-admin/src-tauri/src/app_state/security_settings_service.rs): `site_catalog_store`, `security_store`, `backup_store`, `site_manager` 4개 seam을 동시에 건드린다.
- `[service_ownership_hotspot]` [site_catalog_service.rs](/Users/neojins/workspace/gnuboard5/rust/g5-admin/src-tauri/src/app_state/site_catalog_service.rs): `session_store`, `site_catalog_store`, `admin_api`, `site_manager` 4개 seam을 동시에 건드린다.
- `[service_method_ownership_hotspot]` [security_settings_service.rs](/Users/neojins/workspace/gnuboard5/rust/g5-admin/src-tauri/src/app_state/security_settings_service.rs): `import_backup`가 `site_catalog_store`, `backup_store`, `site_manager` 3개 seam을 동시에 건드린다.
- `[service_method_ownership_hotspot]` [site_catalog_service.rs](/Users/neojins/workspace/gnuboard5/rust/g5-admin/src-tauri/src/app_state/site_catalog_service.rs): `delete_site`가 `session_store`, `site_catalog_store`, `site_manager` 3개 seam을 동시에 건드린다.
- `[core_ports_concrete_coupling]` [core/ports.rs](/Users/neojins/workspace/gnuboard5/rust/g5-admin/src-tauri/src/core/ports.rs): `ApiClient`, `SiteRepository`, `TokenStore` concrete adapter import와 impl이 아직 trait 정의와 같이 있다.

### Note

- [g5-api](/Users/neojins/workspace/gnuboard5/rust/g5-api)는 여전히 placeholder crate로 분류된다.
- 구조 감사는 현재 `waived=0`, `failure=0`, `warning=13` 상태다.
- warning 13건은 [WARNING_BUDGETS.toml](/Users/neojins/workspace/gnuboard5/rust/specs/audits/WARNING_BUDGETS.toml)에 모두 owner/만료일과 함께 등록돼 있다.
- metadata coverage warning 8건은 Rust 구현 누락이 아니라 PHP provider blocker이며 [BLOCKERS.toml](/Users/neojins/workspace/gnuboard5/rust/specs/audits/BLOCKERS.toml) 과 generated artifact로 handoff 중이다.

### Evidence

- deep audit 전체는 통과했다: `PASS: rust structure audit`
- structure audit summary:
  - `failures=0`
  - `warnings=13`
  - `waived=0`
  - `notes=5`
- warning budget registry summary:
  - `active_warning_findings=13`
  - `active_budgets=10`
  - `failures=0`
  - `warnings=0`
- generated artifact:
  - [latest.json](/Users/neojins/workspace/gnuboard5/output/integrated-audit/latest.json)
  - [latest.md](/Users/neojins/workspace/gnuboard5/output/integrated-audit/latest.md)
  - [latest.json](/Users/neojins/workspace/gnuboard5/rust/output/form-metadata-blockers/latest.json)
  - [latest.md](/Users/neojins/workspace/gnuboard5/rust/output/form-metadata-blockers/latest.md)

## 5. Waiver

- 적용 waiver id: 없음
- 적용 근거: 없음
- 만료일: 없음
- 제거 조건: 없음

## 6. 다음 액션

- 즉시 처리:
  - 없음. 감사 체계 자체는 운영 가능 상태다.
- 다음 배치:
  - [core/ports.rs](/Users/neojins/workspace/gnuboard5/rust/g5-admin/src-tauri/src/core/ports.rs) concrete coupling 제거
  - [site_catalog_service.rs](/Users/neojins/workspace/gnuboard5/rust/g5-admin/src-tauri/src/app_state/site_catalog_service.rs), [security_settings_service.rs](/Users/neojins/workspace/gnuboard5/rust/g5-admin/src-tauri/src/app_state/security_settings_service.rs), [master_lock_service.rs](/Users/neojins/workspace/gnuboard5/rust/g5-admin/src-tauri/src/app_state/master_lock_service.rs) hotspot 분해
  - [commands/registry.rs](/Users/neojins/workspace/gnuboard5/rust/g5-admin/src-tauri/src/commands/registry.rs), [error/mod.rs](/Users/neojins/workspace/gnuboard5/rust/g5-admin/src-tauri/src/error/mod.rs) warning threshold 아래로 축소
- 문서 후속:
  - 다음 감사 보고서부터는 warning budget 만료 임박 항목을 요약 섹션에 함께 노출
  - `2026-04-03` 전 warning budget 재평가

## 7. 검증 기록

```text
bash scripts/run_deep_audit.sh
python3 scripts/check_active_crate_boundaries.py
python3 scripts/check_warning_budgets.py
python3 scripts/doc-index.py
bash scripts/check-doc-governance.sh
```
