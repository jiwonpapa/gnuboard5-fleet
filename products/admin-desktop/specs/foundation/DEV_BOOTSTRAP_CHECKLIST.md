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
# DEV_BOOTSTRAP_CHECKLIST

이 문서는 개발 착수 전 점검용 지원 체크리스트다.
실제 상태 전이는 `specs/TODO.md`에서만 관리한다.

## 1. 도구체인

- [ ] `rustup show active-toolchain` 이 stable 계열이다.
- [ ] `cargo --version` 이 정상 동작한다.
- [ ] `bun --version` 이 `1.3.x` 계열이다.

## 2. 계약 및 환경변수

- [ ] `/Users/neojins/workspace/gnuboard5/php/api/docs/openapi.yaml` 이 존재하거나 `G5_OPENAPI_PATH`가 설정되어 있다.
- [ ] `g5-admin/src-tauri/app-config.json`의 `apiBaseUrl`이 현재 테스트 대상 API를 가리키는지 확인했다.
- [ ] 외부 설정 파일을 쓸 경우 `G5_APP_CONFIG_PATH` 또는 OS 사용자 설정 파일(`~/Library/Application Support/g5-admin/app-config.json`, `%APPDATA%\\g5-admin\\app-config.json`, `${XDG_CONFIG_HOME:-~/.config}/g5-admin/app-config.json`)의 `apiBaseUrl`이 현재 대상 API를 가리키는지 확인했다.
- [ ] `g5-admin/src-tauri/app-config.json`의 `debugOverlay` 또는 `G5_DEBUG_OVERLAY` 값이 현재 개발 목적에 맞는지 확인했다.
- [ ] `g5-admin/src-tauri/app-config.json`의 `sessionStorage`가 현재 실행 목적에 맞는지 확인했다. 현재 번들 기본값은 `keychain`이며, 개발용 파일 세션은 `G5_SESSION_STORAGE=file`, 외부 설정 파일, 또는 `deploy:desktop:fast`가 생성한 OS 사용자 설정 파일 override로만 쓴다.
- [ ] fast deploy가 아닌 일반 실행에서 `.db-master-key`가 새로 생기면 회귀로 간주하고 수정한다. 개발용 `deploy:desktop:fast`만 예외적으로 file DB master storage를 허용한다.
- [ ] 필요 시 `G5_APP_CONFIG_PATH` 또는 `G5_API_BASE_URL` override 값을 정했다.
- [ ] 필요 시 `G5_SESSION_STORAGE` 또는 `G5_SESSION_STORE_PATH` override 값을 정했다.
- [ ] 필요 시 `G5_LOG_DIR` override 값을 정했다.
- [ ] `RUST_LOG` 기본값을 정했다.
- [ ] `sessionStorage=keychain`을 쓸 경우 `G5_KEYRING_SERVICE` 값을 정했거나 기본 서비스명을 합의했다.

## 3. 로컬 검증 명령

- [ ] `cargo check --manifest-path g5-admin/src-tauri/Cargo.toml`
- [ ] `cargo test -p g5-admin-models --features ts-bindings models::tests::export_ts_bindings -- --exact --nocapture`
- [ ] `cd g5-admin && bun run lint`
- [ ] `cd g5-admin && bun run test`
- [ ] `cd g5-admin && bun run build`
- [ ] `bash scripts/check-doc-governance.sh`
- [ ] `python3 scripts/doc-index.py`

## 3.1 버그 수정 / 회귀 방지 게이트

- [ ] 버그 수정이면 재현 테스트를 먼저 추가했거나, 최소한 같은 변경 세트에 회귀 테스트를 포함했다.
- [ ] 첫 실행, secure storage, keychain/credential manager/secret service, 인증, 세션 복구, DB 마이그레이션 중 영향을 받는 경로가 있으면 fresh/returning/cancel-or-deny/lockout 중 해당 케이스를 테스트로 고정했다.
- [ ] 수정 범위에 맞는 테스트 명령을 실제로 실행했고, 최종 보고에 실행한 명령을 남길 준비가 되어 있다.

## 4. 개발 시작 전 합의

- [ ] Auth Core를 첫 구현 대상으로 합의했다.
- [ ] 첫 정식 route 마이그레이션 도메인을 `Admin Config`로 합의했다.
- [ ] `Members`, `Boards`, `Permissions`, `QA`, `Polls`, `Popups`는 bridge에서 route 페이지로 순차 마이그레이션하기로 합의했다.
- [ ] 에러/로그 규약(`component`, `operation`, `target`, `error`, `request_id`)을 코드에 강제하기로 합의했다.
- [ ] 디버그 독과 로컬 로그 파일을 개발 중 기본 진단 수단으로 사용하기로 합의했다.
- [ ] 프론트 직접 `fetch()` 금지 원칙을 합의했다.
