---
doc_type: history
status: active
owner: rust-admin
source_of_truth: true
canonical_for: change history
ai_default_include: true
last_reviewed: 2026-07-23
review_cycle_days: 14
bounded_context: global
---
# HISTORY

완료 작업의 영구 이력을 기록한다.
`specs/TODO.md`의 `Done`에는 최근 완료 작업만 잠깐 두고, 장기 기록은 이 문서로 이관한다.

## 2026-07-23

### 문서 검색 인덱스 공개 이력 제외

- 문서 검색용 SQLite를 tracked `specs/docs.db`에서 Git 제외 경로 `.cache/docs/docs.db`로 옮기고, 문서 감사 실행 시 Markdown 정본에서 다시 생성하도록 통일했습니다.
- Why: 재생성 가능한 FTS 바이너리를 공개 소스 이력에 고정하면 불투명한 중복 데이터와 비결정적 binary diff가 남습니다. Markdown만 권위 원본으로 보존하고 검색 인덱스는 로컬 캐시로 제한해야 합니다.
- Verification: `bash scripts/run_document_audit.sh`, `bash scripts/check-doc-governance.sh`

## 2026-07-22

### `T2-284` 17-domain 실서버 관리자 API 왕복 하네스

- `LIVE_DOMAIN_CERTIFICATION.json`에 관리자 17-domain의 baseline/setup/mutate/readback/cleanup 또는 unavailable probe를 75개 OpenAPI operationId로 고정하고, 비가역 또는 외부효과가 있는 13개 operation은 실행 금지 목록으로 분리했습니다.
- 후속 hardening에서 모든 제외 operation과 실행 계획의 교집합을 차단하고, live runner가 실제 요청 operationId와 unavailable-accounted operationId를 current-run artifact에 기록해 계획 전체가 둘 중 정확히 하나로 귀결되는지 집계기가 검증하도록 강화했습니다.
- production `ApiClient`와 canonical wire validator를 쓰는 live runner가 writable 13-domain을 격리 fixture로 생성·수정·재조회한 뒤 성공 여부와 관계없이 정리하고, SMS5 미설치 4-domain은 문서화된 503 상태를 정상 unavailable 계약으로 검증합니다.
- 공개 경로에서 PUT·PATCH·DELETE를 무해한 존재하지 않는 리소스 404 요청으로 먼저 검사합니다. ModSecurity가 메서드를 막으면 fixture 생성 전에 종료하고 원문 HTML 403 계약 위반을 artifact에 남깁니다.
- 테스트 VM Apache origin에서는 사전점검과 17/17 domain, readback, cleanup, 외부 발송 0건이 모두 통과했습니다. 공개 `gnuboard5.local`은 CRS rule 911100 때문에 세 메서드 모두 차단되어 공개 write certification은 보류합니다.
- Boundary: 이는 Rust production wire 소비 증거입니다. 설치된 Tauri UI의 모든 writable command invoke와 17-domain DOM 저장·재수화 증거가 아니므로 capability는 `partial`을 유지합니다.
- Evidence boundary: 당시 live JSON이 현재 저장소에 보존되지 않았으므로 Apache origin 결과는 `historical_observation`이며 새 통합 저장소나 destination의 인증으로 승계하지 않습니다.
- Verification: Python 하네스 `93 tests`, 신규/집계 단위 회귀 `27 tests`, Ruff·Mypy PASS, API pipeline static `19 passed / 0 failed / 0 blocked`, Rust standard audit와 critical UI `680 passed / 4 skipped` PASS. desktop-fast 빌드·앱 재설치·codesign·실제 Intro→마스터 잠금 해제 렌더도 통과했습니다.

### `T2-283` SQLCipher 마스터키 유실 시 데이터 보존형 중단

- 기존 로컬 DB가 있는데 file/keychain 마스터키를 찾지 못하면 DB를 `orphaned-*`로 이동하고 빈 DB를 만들던 동작을 제거했습니다. 이제 원본 DB와 파일 상태를 그대로 보존한 채 저장소 오류로 중단합니다.
- file/keychain 양쪽에 대해 키 생성·DB 교체·orphan 생성이 일어나지 않는 회귀 테스트를 추가했고, fresh DB의 keychain 테스트도 실제 사용자 경로를 보지 않도록 완전히 격리했습니다.
- 동일 설치본 교체 전후의 `.db-master-key`와 DB SHA-256 및 orphan 개수를 비교해, 정상 배포 루틴 자체는 앱 데이터를 변경하지 않음을 확인했습니다.
- Why: 암호화 키 유실은 자동 초기화로 숨길 장애가 아닙니다. 복구 가능성을 보존하고 원인을 명시적으로 노출해야 멀티사이트 설정과 관리자 세션의 2차 손실을 막을 수 있습니다.

### `T2-282` 실서버 관리자 E2E 장애 3종 수정

- OpenAPI wire validator가 optional query의 JSON `null`을 실제 전송된 값으로 오판하던 문제를 수정해, `Option::None`은 누락된 query와 동일하게 처리합니다.
- PHP OpenAPI의 SMS 저장소 503 계약을 생성 스냅샷·Zod 계약에 동기화했습니다. 문자 발송·템플릿·연락처·전송 이력 화면은 `storage_ready=false`일 때 저장소 목록 요청을 보내지 않고 선택 기능 미설치 안내를 표시합니다.
- health check는 API prefix 자체가 아니라 공개 `/health` operation을 사용해 설치된 provider를 판정합니다.
- OpenAPI 변경으로 와이어 계약을 재생성해 status response `1186`, RFC7807 error response `997`을 고정했습니다. hotspot 감사는 파일 선두의 명시적 `@generated` 마커가 있는 생성물만 일반 수작업 LOC 제한에서 제외하며, 생성물 드리프트·의미 fingerprint 검증은 기존 계약 게이트가 계속 차단합니다.
- PHP OpenAPI의 이중 이스케이프 숫자 정규식 7곳을 교정한 스냅샷과 Rust wire 계약을 다시 생성했습니다.
  - Why: 실앱 회원메일 화면에서 정상 `mb_datetime` 응답이 계약 위반으로 차단됐으며, 공급자 값이 아니라 생성 소비자가 읽는 정규식 의미까지 live E2E로 검증해야 합니다.
- Why: 실서버 전 메뉴 조작에서 optional query `null`이 17개 operation을 로컬 차단했고, SMS5 미설치가 4개 화면의 오류처럼 보였으며, `/api/v1` root 404가 정상 서버를 오프라인으로 오판하게 했습니다. 지원되는 빈·선택 상태와 실제 장애를 구분해야 멀티사이트 관리자가 신뢰할 수 있는 진단을 받습니다.

### `T2-281` 백업 친화형 빌드 캐시 보존 정책 적용

- `prune_build_artifacts.sh --auto`는 Rust incremental/target과 프론트 테스트 캐시를 삭제하지 않고 용량만 기록합니다. 32GB를 넘어도 경고만 남기며, 오래된 배포 rollback archive retention만 적용합니다.
- 실제 incremental 또는 전체 target 삭제는 `clean:artifacts`/`clean:artifacts:full`을 명시적으로 실행할 때만 허용합니다.
- 매주 일요일 02:00에 저우선순위로 자동 실행하는 macOS LaunchAgent 설치기를 추가하고, 경고 임계값 위·아래에서 컴파일 캐시가 그대로 보존되는 회귀 테스트를 고정했습니다.
- Python type/lint/Playwright 캐시를 Git 무시 대상으로 명시해 디버그 도구 찌꺼기가 source 상태에 섞이지 않게 했습니다.
- Why: 백업 용량 문제는 백업 제외 규칙으로 해결하고, 로컬 컴파일 캐시는 빌드속도를 위해 보존해야 합니다.

### `T2-280` Windows release target과 live provider/runtime 경계 1차 closeout

- macOS에서 `cargo-xwin 0.23.0`과 OpenSSL 3를 사용한 Windows MSVC target type check를 실제 통과시켰습니다. 이는 native Windows `.exe/.msi` 번들 증명과는 분리합니다.
- `gnurestapi.cc` staging의 nginx PHP-FPM socket과 DB 연결을 복구하고, 운영 DB를 변경하지 않는 별도 MariaDB 10.3 컨테이너에 non-shop G5를 설치했습니다. PHP dirty worktree는 배포하지 않고 clean worktree의 provider HEAD `d7c7789ba`만 배포했습니다.
- `check_live_provider_identity.py`가 live health, G5 독립 상태, admin-inspect site identity, 배포 runtime revision, live OpenAPI SHA를 current-run local PHP HEAD와 canonical OpenAPI에 fail-closed 결합합니다. site 원문과 inspect secret은 산출물에 기록하지 않습니다.
- `live_config_roundtrip.rs`가 앱과 동일한 production `ApiClient`와 canonical wire validator로 config `cf_10`을 실제 저장·재조회한 뒤 baseline으로 무조건 원복하고 다시 재조회합니다. access token은 환경변수로만 전달하며 산출물에는 성공 boolean과 operation만 남깁니다.
- 진단 중 오류 문자열 노출 가능성이 있었던 격리 DB 자격 증명은 즉시 회전했고, 파일 소유권과 PHP-FPM 재로드 후 `/api/v1/health` 200을 재확인했습니다. PHP legacy Playwright 하네스도 secret query argv를 제거해 환경변수 기반 HTTP header로 바꾸고, current CLI `requests`, inline artifact redaction, 설정형 bootstrap 관리자, 명령당 45초 process-group timeout으로 보강했습니다. 실제 header bootstrap은 `g5audit` 최고관리자와 목표 경로를 반환했고, 멈춘 local daemon은 `exit 124`로 유한 종료되며 artifact secret scan이 clean임을 확인했습니다.
- Boundary: live provider identity capability는 `implemented`, 실제 write/readback capability는 config 한 field만 닫혀 `partial`입니다. 나머지 15-domain DOM adapter와 모든 writable domain의 실제 Tauri invoke 증적 전에는 full certification으로 승격하지 않습니다.
- Verification:
  - `bash scripts/run_windows_target_check.sh` (`PASS: Windows MSVC target type check via cargo-xwin`)
  - `cargo run --quiet -p g5-admin-api-client --example live_config_roundtrip -- ...` (`readback_verified=true`, `rollback_verified=true`)
  - `python3 scripts/check_live_provider_identity.py ...` (health/identity/revision/OpenAPI SHA 전부 PASS)
  - PHP `python3 -m unittest scripts.tests.test_run_admin_domain_playwright_smoke scripts.tests.test_run_admin_domain_pipeline` (`10 passed`), Ruff PASS, 원격 PHP 8.4 syntax/member resolution PASS

### `T2-279` 빌드 지옥 방지형 CI·hotspot·의존성 재감사 개선

- routine `pre-push`를 변경 영역 타입·lint·관련 테스트·변경 Rust crate·계약·구조 검사로 좁히고, 전체 `ci:local`은 중첩 aggregate를 제거해 각 full gate를 한 번만 실행하도록 재구성했습니다. Windows target은 `ci:release-local`에서만 명시적으로 실행하며, `desktop-fast`는 sccache wrapper 없이 Cargo incremental을 직접 재사용합니다.
- contract/docs/structure GitHub workflow를 PR·main push 자동 게이트로 복구하고 concurrency cancellation을 적용했습니다. 무거운 통합·cross-platform 검증은 수동 경계로 유지했습니다.
- hotspot 감사가 모든 workspace crate를 동적으로 발견하고 `--check`에서 tracked 산출물을 쓰지 않게 했습니다. 변경 파일 350줄 이상은 관찰 경고, 500줄 이상은 차단이며 `SiteSshShellCard`는 표시·입력·생명주기를 분리해 `676 -> 496`줄로 낮췄습니다.
- 구현 없는 `g5-api` placeholder를 workspace에서 제거하고, 크레이트 이름 17개를 강제하던 검사를 workspace member/내부 path edge/desktop direct edge/placeholder 개수의 동적 예산으로 교체했습니다.
- 미사용 font/opener와 타입만 빌리던 DnD tree, 중복 DnD v16, 55개 Radix 모듈 aggregate를 제거하고 실제 쓰는 Accordion/Tabs/Slot만 직접 의존하도록 축소했습니다.
- Why: 예쁜 구조보다 개발·빌드 속도와 회귀 탐지 신뢰도를 우선하며, routine 변경이 전체 workspace·Windows target·중복 하네스를 매번 재실행하는 병목과 고정 topology의 false-green을 함께 제거해야 했습니다.

## 2026-07-20

### `T2-278` 로컬 빌드 산출물 용량 상한과 정리 루틴 도입

- Rust `target/` 84GB 중 증분 컴파일 디렉터리가 약 47GB, macOS 배포 rollback archive가 프로젝트 내부·사용자 Library 합계 약 3.7GB까지 무제한 누적되는 상태를 확인했습니다.
- `bun run clean:artifacts`는 증분 컴파일·프론트 빌드/coverage 캐시만 정리하고, `bun run clean:artifacts:full`은 전체 Cargo target을 재생성 가능한 산출물로 정리합니다. 소스, lockfile, `node_modules`, Cargo registry/xwin 캐시, 감사 증적, 현재 설치 앱은 보존합니다.
- 로컬 CI는 Cargo incremental과 dev/test debug symbol을 기본 비활성화했고, `desktop-fast`도 incremental을 끄되 `opt-level=1`, `codegen-units=16`, sccache 경로는 유지했습니다.
- macOS·Linux·Windows 배포 백업은 최신 2개만 남기도록 retention을 적용했습니다.
- Why: GitHub Actions를 대체한 로컬 full audit가 동일 Mac mini에서 반복될 때 재생성 가능한 Rust 산출물이 디스크를 고갈시키지 않아야 합니다.

### `T2-277` GitHub-hosted 검증을 로컬 CI와 pre-push hard gate로 전환

- Rust 검증 workflow 5개의 자동 `push`/`pull_request` 실행을 중지하고 `workflow_dispatch` fallback으로만 남겼습니다. `cd g5-admin && bun run ci:local`에 Python 하네스, deep 감사, PHP route→OpenAPI→Rust→Tauri 정적 파이프라인, macOS의 Windows target type check를 결합했습니다.
- `.githooks/pre-push`와 `bun run hooks:install`을 추가해 현재 clone과 신규 clone 모두 동일한 로컬 푸시 차단을 재현할 수 있게 했습니다.
- native Windows `.exe/.msi` 증명은 macOS cross-target check와 구분해 로컬 Windows 호스트 소유로 고정했습니다. GitHub-hosted runner는 명시적으로 실행할 때만 사용하는 비정본 fallback입니다.
- 최신 `ring`과 bundled SQLCipher가 Windows C SDK/OpenSSL header를 요구하므로, macOS target 검사를 단순 `cargo check`에서 `cargo-xwin 0.23.0` + 로컬 OpenSSL 3 include/lib 주입 방식으로 교체했습니다.
- Why: 월 2,000분의 GitHub Actions 한도가 소진돼도 검증 범위와 fail-closed 감사 강도를 낮추지 않고, 기존 하네스를 개발 호스트에서 직접 실행해야 합니다.

## 2026-07-18

### `T2-276` Rust/Tauri 및 프론트엔드 의존성 최신 호환선 갱신

- Why: Tauri 관리자 앱의 Cargo/Bun 의존성이 여러 major 뒤에 남아 있으면 보안 패치와 최신 툴체인 진단을 놓치고, 잠금 파일이 추적되지 않아 같은 소스도 설치 시점마다 다른 전이 의존성을 받을 수 있습니다.
- What:
  - Rust direct crate를 레지스트리 최신선으로 갱신해 Tauri `2.11.5`, rusqlite `0.40.1`, keyring `4.1.5`, russh `0.62.2`, russh-sftp `2.3.0`, tokio-tungstenite `0.30.0`, chacha20poly1305 `0.11.0` 기준으로 올렸습니다.
  - 제거된 `rand_core/getrandom` feature 의존을 최신 `getrandom 0.4`의 실패 전파형 난수 생성으로 교체하고, Prettier 3 standalone plugin 체계와 회귀 테스트를 추가했습니다.
  - React `19.2.7`, Vite `8.1.5`, ESLint `10.7.0`, Prettier `3.9.5`, Vitest `4.1.10` 등 JS 의존성을 최신선으로 갱신하고, TypeScript는 최신 typescript-eslint의 peer 범위(`<6.1`)에 맞는 최신 호환선 `6.0.3`으로 고정했습니다.
  - `openapi-zod-client`의 optional peer가 Bun hoisting에 따라 구형 AJV를 잡는 문제를 막기 위해 계약 생성기 실행 의존성 `ajv 8.20.0`을 직접 고정했습니다.
  - Monaco `0.55.1`이 정확 버전으로 묶은 취약 DOMPurify `3.2.7`은 Bun override로 수정판 `3.4.12`를 적용해 JS 보안 권고를 0으로 닫았습니다.
  - Vite 8에서 중복 React가 번들/테스트 renderer에 섞이지 않도록 dedupe와 Bun lockfile 재생성을 적용하고, 배포 바이너리 재현성을 위해 루트 `Cargo.lock`을 추적 대상으로 전환했습니다.
  - Rust 1.96의 강화된 Clippy 규칙에 맞춰 API 오류 context를 박싱하고 iterator/retain/enum 경고를 제거했습니다.
- Boundary: PHP OpenAPI와 active 소비 범위 `189`, provider-only protected 게시판 `26`은 변경하지 않았습니다.
- Verification:
  - `cargo outdated --workspace --depth 1` (`All dependencies are up to date`)
  - `cd g5-admin && bun audit` (`No vulnerabilities found`)
  - `cargo clippy --workspace --all-targets --all-features -- -D warnings`
  - `cargo test --workspace --all-features -- --test-threads=1`
  - `cd g5-admin && bun run audit:deep` (frontend `676 passed / 4 skipped`, PHP-Rust consumer·구조·문서·운영 번들 게이트 통과)
- Remaining: TypeScript `7.0.2`는 최신 `typescript-eslint 8.64.0`의 peer 범위가 `<6.1.0`이라 적용하지 않았습니다. RustSec은 최신 `wayland-scanner 0.31.10`이 `quick-xml 0.39`를 요구해 남는 Linux build-time DoS 2건과, 최신 `russh 0.62.2`가 사용하며 수정판이 없는 RSA timing advisory 1건을 보고합니다. Vite의 500 kB 초과 chunk 경고와 기존 문서 review overdue 경고 50개도 이번 의존성 갱신 범위 밖의 경고로 남습니다.

## 2026-07-17

### `T2-275` 교차 감사 실행 공통부 패키지화와 Python CI 품질 게이트 도입

- Why: `run_api_pipeline_audit.py`와 3,500줄 규모의 `run_integrated_audit.py`가 subprocess 실행·출력 tail·오류 처리를 따로 구현하면 timeout, 시작 실패, 민감값 마스킹의 의미가 감사기마다 달라질 수 있습니다. Python이 소비 감사 하네스의 주언어인 만큼 하네스 자체 회귀와 정적 품질도 API 계약과 같은 hard gate가 필요했습니다.
- What:
  - `scripts/audit_harness/execution.py`에 `CheckSpec`, `CheckResult`, timeout, 시작 실패, blocked, bounded evidence, secret redaction을 통합하고 두 aggregate CLI가 같은 실행기를 소비하도록 바꿨습니다.
  - 실행 공통부 전용 회귀 4개를 추가해 전체 Python 하네스 `67`개를 고정했습니다.
  - Python 3.12 기준 Ruff·Mypy 설정과 고정 dev requirements를 추가하고, `bun run audit:harness` 및 API 파이프라인 CI 선행 gate로 편입했습니다.
- Boundary: OpenAPI 전체 `312`, active 소비 `189`, protected 게시판 `26`, required capability `14`와 static/full 인증 의미는 변경하지 않았습니다. 실서버 미연결 상태의 정적 PASS는 계속 미인증입니다.

## 2026-07-15

### `T2-266~274` PHP OpenAPI의 Tauri active consumer parity와 fail-closed 검증 완성

- Why: PHP canonical OpenAPI를 고쳤어도 Rust DTO, wire client, Tauri command/IPC, frontend wrapper, React 조회·입력·저장까지 실제로 이어지는지 증명되지 않으면 소비 누락이 다시 숨어들 수 있었다. 특히 기존 생성기는 reusable parameter `$ref`와 오류 response를 놓쳤고, 멀티사이트 전환은 base URL과 token이 서로 다른 lock에 있어 교차 사이트 요청 race가 가능했다.
- What:
  - canonical PHP OpenAPI 전체 `312`개를 보존하면서 active 관리자 `184` + bootstrap `5`를 `189/189`로 소비했다. protected 일반 게시판 `26`개는 provider-only 계약으로 유지했고 게시판 UI는 결정 전 범위로 구현하지 않았다.
  - reusable parameter/request body와 모든 status/media type response를 Rust wire manifest/runtime validator에 포함해 `189 operations / 230 parameters / 1180 responses / 991 error responses`, `210 wire schemas / 1682 fields`를 검사한다. RFC7807 오류 body도 presentation 역직렬화 전에 검증한다.
  - 17개 관리자 domain의 production import graph에서 `414`개 조회 필드, `398`개 저장 필드, `25`개 dynamic option source 소비를 검증하고, board/poll 누락 필드와 schema `option_source` 전달을 보완했다. 불완전/중복 schema는 React query 단계에서 fail-closed 거부한다.
  - frontend active edge `191`, Tauri command attribute/registry/apiTarget `253/253/253`, orphan registry `0`을 AST/edge 하네스로 묶고 method/path swap 변이를 추가했다.
  - `ActiveRequestContext` 단일 write lock으로 `site_id + base_url` 전환과 token 조회를 직렬화하고, A 요청 중 B 전환이 A token/B URL 혼합을 만들지 않는 concurrency test를 고정했다.
  - PHP의 실제 Slim runtime route table과 handler field-flow auditor를 Rust aggregate에 결합해 active `189` + protected `26` 총 `215` operation의 runtime/handler binding을 검사한다.
  - capability별 독립 변이검사를 추가하고 required capability `14`, static 적용 가능 capability `11`을 모두 실행 check와 current-run artifact에 결합했다.
  - canonical DTO 증가분을 반영해 models LOC budget을 `8800 -> 9000`으로 제한적으로 조정하고, ts-rs optional 검사는 Cargo dependency 속성 순서와 추가 feature에 흔들리지 않는 정규식 판정으로 고쳤다.
  - deep 감사가 잡은 command→api_client concrete error import를 제거하고 `AppStateDependencies::from_env`를 별도 모듈로 분리해 `app_state/mod.rs`를 `242 -> 218 LOC`로 낮췄다. 이에 따라 만료된 root orchestrator warning budget도 삭제했다.
- Verification:
  - `python3 scripts/run_api_pipeline_audit.py --rust-root /Users/neojins/workspace/gnuboard5/rust --php-root /Users/neojins/workspace/gnuboard5/php --static-only` (`19 passed`, `0 failed`, `0 blocked`, `static_passed_not_certified`)
  - `python3 -m unittest discover -s scripts/tests -p 'test_*.py'` (`63 passed`)
  - `cd g5-admin && bun run test:coverage:critical` (`674 passed`, statements `94.38%`)
  - `cd g5-admin && bun run build` (contract check, TypeScript, Vite build, dist smoke 통과)
  - `cargo fmt --all -- --check && cargo check --workspace`
  - `cargo test -p g5-admin-models openapi_wire` (`4 passed`)
  - `cargo test -p g5-admin-desktop active_request_context_keeps_site_base_url_and_token_atomic_during_switch` (`1 passed`)
- Remaining: 서버 연결이 없는 이번 실행은 full certification이 아니다. 실제 격리 서버의 site identity/OpenAPI SHA 확인, 인증 credential, 17-domain write/readback/rollback은 `T2-267`, `T2-270`으로 남긴다. 외부 OAuth credential과 `shop_admin`도 별도 범위다.

## 2026-07-13

### `T2-265` API 파이프라인 1차 감사 정의와 fail-closed harness 도입

- Why: 기존 통합 감사는 path alias, path set 비교, stale latest 재사용, child exit 무시, mock save를 live writeback처럼 오해할 여지가 있어 PHP OpenAPI가 Rust/Tauri/UI에서 빠짐없이 소비됐다고 증명할 수 없었다. 형님이 요구한 범위는 앱 결함 수정이 아니라 먼저 누락을 숨길 수 없는 감사 기준과 하네스를 고정하는 것이었다.
- What:
  - `ACTIVE_CONSUMER_SCOPE.json`에 non-shop 관리자 `184`개와 bootstrap `5`개, 총 `189`개 exact operation, 17개 schema domain, 14개 required capability와 hard-fail 상태를 고정했다.
  - aggregate가 static/full 필수 check ID, capability별 `required_check_ids`, 독립 incomplete probe, parent/child `audit_run_id`, current-run artifact, row count/status/exit, worktree fingerprint를 검증하게 했다.
  - OpenAPI 8개 method, 서로 다른 mail path 3개, Tauri command→client operation edge, Rust DTO field signature, IPC/apiTarget 양방향, UI field/save adapter를 검사하고 method/path swap·scanner-zero·stale·child-crash·manifest-shrink 변이를 회귀 테스트로 추가했다.
  - fixture DOM + mock rehydrate와 실제 API write/readback을 분리했고, 미구현 runtime route/handler semantics/multisite/live identity는 blocked probe로 남겨 수동 상태 승격이 인증을 만들지 못하게 했다.
- Verification:
  - `python3 -m unittest discover -s scripts/tests -p 'test_*.py' -v` (`51 passed`)
  - `python3 scripts/check_api_pipeline_scope.py --mode static` (미완료 capability를 검출해 의도된 exit 1)
  - `cd g5-admin && bun run audit:api-pipeline:static` (현재 앱 누락을 검출해 의도된 Failure)

## 2026-03-30

### `T2-264` SFTP 보안 gating과 row-open 동작을 정리하고 SSH 새로고침 프롬프트 복구를 즉시화

- Why: 형님 피드백 기준으로 `앱 잠금 해제되지 않음 / 인증 세션 없음` 상태에서 SFTP 작업면이 먼저 API를 치고 중앙 오류 모달을 띄우는 건 회귀였다. 체크박스-only selection을 분리한 뒤 우측 목록 row click으로 디렉터리 이동까지 막혀 작업 감각도 나빠졌고, SSH는 새로고침 뒤 bridge snapshot이 비어 있으면 여전히 수동 Enter 없이는 프롬프트가 안 떠 답답했다.
- What:
  - `SiteSftpBrowserPage`는 이제 `master unlocked + site authenticated + auth session authenticated`일 때만 SFTP 작업면을 활성화하고, 그 전에는 오류 대신 `세션 복원/사용 준비 중` 안내만 보여준다.
  - `useSiteSftpBrowser`, `useSiteSftpEditor`, `useSiteSftpTransferQueue`, `useSiteSftpWorkspace`, `useSiteSshSession`에 `enabled` gating을 연결해 잠금/로그아웃 상태에서 브라우저/에디터/전송 큐 query가 먼저 치지 않게 막았다.
  - `SiteSftpBrowserList`는 checkbox selection과 row-open을 분리해, 파일 row는 여전히 비선택/비열기지만 디렉터리 row는 single click으로 열리도록 복구했다.
  - `SiteSshShellCard`는 bridge `ready(snapshot="")`일 때 지연 타이머 대신 즉시 `\r` prompt refresh를 보내도록 바꿔 새로고침 직후 프롬프트 복구를 더 직접적으로 처리한다.
- Verification:
  - `cd g5-admin && bun run test -- src/features/server-files/SiteSftpBrowserPage.test.tsx src/features/server-ssh/SiteSshShellCard.test.tsx`
  - `cd g5-admin && bun x tsc --noEmit`
  - `cd g5-admin && bun run lint`
  - `cd g5-admin && bun run audit:implementation`
  - `cd g5-admin && bun run audit:structure`

## 2026-03-27

### `T2-263` dev bootstrap에 사이트 로그인 계정을 추가해 마스터 잠금/사이트/로그인/SSH를 한 번에 채우도록 확장

- Why: 형님 피드백 기준으로 개발/테스트에서는 `마스터 비밀번호 -> 사이트 등록 -> 사이트 로그인 -> SSH 등록`을 매번 다시 입력하게 만들면 안 된다. 기존 dev bootstrap은 `마스터 잠금 + 사이트 + SSH`까지만 다뤄서 사이트 로그인 계정이 빠져 있었고, 실제 반복 테스트 피로를 줄이는 한방 동선으로는 불완전했다.
- What:
  - `runtime_config`의 `devBootstrap`에 `siteAuth(mbId, mbPassword)`를 추가하고, `site` 없이 `siteAuth`만 오는 잘못된 설정은 바로 막았다.
  - `DevBootstrapService`는 `마스터 잠금 -> 사이트 upsert/switch -> 사이트 로그인 세션 저장 -> SSH 프로필 upsert` 순서로 동작하도록 확장했다.
  - entry screen의 `DevBootstrapCard`는 사이트 로그인 준비 상태와 적용 결과(`로그인: <mb_id>`)를 함께 보여주게 바꿨다.
  - `App.first-run.e2e.test.tsx`의 debug bootstrap mock도 함께 맞춰 불필요한 invoke error 노이즈를 제거했다.
  - `app-config.example.json`, `README`, `FOUNDATION_SDD`를 현재 dev bootstrap 입력 기준에 맞게 갱신했다.
- Verification:
  - `cargo test --manifest-path g5-admin/src-tauri/Cargo.toml dev_bootstrap --quiet`
  - `cargo test -p g5-admin-models export_ts_bindings --quiet`
  - `cd g5-admin && bun run test -- src/features/dev/DevBootstrapCard.test.tsx src/features/onboarding/SiteOnboardingPage.test.tsx src/App.first-run.e2e.test.tsx`
  - `cd g5-admin && bun x tsc --noEmit`
  - `cd g5-admin && bun run lint`
  - `cd g5-admin && bun run audit:docs`
  - `cd g5-admin && bun run audit:implementation`
  - `cd g5-admin && bun run audit:structure`

### `T2-262` SFTP 툴바에 좌/우 목록 공통 폰트 `- / +` 조절을 추가

- Why: 형님 피드백 기준으로 SFTP 좌측 트리와 우측 목록은 정적인 `한 단계 키우기`보다 즉석에서 조절 가능한 앱형 폰트 컨트롤이 더 맞았다. 고정값을 다시 바꾸는 식으로는 요구를 반복해서 놓치기 쉬웠고, site별로 기억되는 `- / +` 조절이 필요했다.
- What:
  - `useSiteSftpWorkspaceLayout`에 `font scale(sm/md/lg)` 저장을 추가하고, site별 local storage로 기억되게 했다.
  - `SiteSftpWorkspaceSurface` 툴바에 `- / 현재 px / +` 컨트롤을 추가하고, 좌측 트리와 우측 목록이 같은 스케일을 공유하게 연결했다.
  - `SiteSftpBrowserList`, `SiteSftpDirectoryTree`는 font scale별 row height / text size를 공통 규칙으로 쓰도록 정리했다.
  - page-level 회귀 테스트를 추가해 툴바 조절이 목록/트리 둘 다에 반영되는지 고정했다.
- Verification:
  - `cd g5-admin && bun run test -- src/features/server-files/SiteSftpBrowserPage.test.tsx`
  - `cd g5-admin && bun x tsc --noEmit`
  - `cd g5-admin && bun run lint`
  - `cd g5-admin && bun run audit:implementation`
  - `cd g5-admin && bun run audit:structure`

### `T2-261` local secure storage의 keychain 의존을 제거하고 SSH/TOTP secret을 SQLCipher DB로 이동

- Why: 형님 요구는 개발/테스트 중 `마스터 비밀번호 설정 -> 사이트 등록 -> SSH 등록`을 반복하지 않게 하는 것이고, 별도 지시 없이는 저장된 로컬 데이터를 계속 이어받는 것이었다. 그런데 keychain prompt와 keychain/file 혼합 경로는 반복 테스트를 계속 깨뜨렸고, active 문서도 여전히 keychain 중심으로 남아 있어 다시 회귀할 위험이 있었다.
- What:
  - `runtime_config`는 `sessionStorage`, `dbMasterStorage`의 legacy `keychain` 값을 모두 `file`로 정규화하도록 고정했다.
  - `.db-master-key` 저장 시 Unix 계열에서 `0600` 권한을 강제하도록 보강했다.
  - SSH 비밀번호/SSH key passphrase는 더 이상 OS keyring에 저장하지 않고 SQLCipher DB `app_settings`의 `ssh.secret.password.{id}`, `ssh.secret.key_passphrase.{id}`로 옮겼다. 기존 keyring 값이 있으면 첫 access 때 DB로 옮기고 keyring entry를 지운다.
  - TOTP secret도 SQLCipher DB `app_settings.security.totp_secret`로 옮기고, legacy keyring 값은 1회 migration 후 제거한다.
  - active 문서(`README`, `FOUNDATION_SDD`, `MULTI_SITE_SDD`)를 현재 canonical storage 정책에 맞게 갱신했다.
- Verification:
  - `cargo test --manifest-path g5-admin/src-tauri/Cargo.toml db::tests::ssh_profiles --quiet`
  - `cargo test --manifest-path g5-admin/src-tauri/Cargo.toml db::tests::sites_security --quiet`
  - `cargo test --manifest-path g5-admin/src-tauri/Cargo.toml db::tests::master_key --quiet`
  - `cargo check --manifest-path g5-admin/src-tauri/Cargo.toml --quiet`
  - `cd g5-admin && bun x tsc --noEmit`
  - `cd g5-admin && bun run lint`
  - `cd g5-admin && bun run audit:docs`
  - `cd g5-admin && bun run audit:implementation`
  - `cd g5-admin && bun run audit:structure`

### `T2-260` SFTP 체크박스 선택을 포커스/트리 sync와 분리하고 높이 preset을 추가

- Why: 형님 피드백 기준으로 우측 파일 목록은 `행 클릭 = 선택`보다 체크박스로만 batch 선택이 바뀌는 쪽이 더 예측 가능했고, 이 체크박스 동작이 좌측 트리 selection/focus와 섞이면 안 됐다. 폴더 더블클릭 진입도 파일 클라이언트 감각과 맞지 않았고, 최근 밀도 조정 이후 좌/우 목록 폰트와 전체 작업면 높이도 한 단계 복구가 필요했다.
- What:
  - `useSiteSftpWorkspace`에서 checkbox 토글은 `selectedEntries`만 바꾸고 `selectedEntry`, `stat inspect`, 좌측 트리 highlight는 건드리지 않게 분리했다.
  - `SiteSftpBrowserList`에서 row click / row double click selection-open 경로를 제거하고, selection은 체크박스 토글로만 바뀌도록 정리했다.
  - directory row의 더블클릭 진입을 막고, 기존 keyboard/toolbar/context-menu 기반 batch 흐름은 그대로 유지했다.
  - 좌/우 목록 폰트와 row height를 한 단계 더 키웠고, `SiteSftpWorkspaceSurface`에는 `S / M / L` 높이 preset을 추가해 작업면 전체 높이를 SSH 작업면처럼 조절되게 했다.
  - page-level 회귀 테스트를 추가해 `checkbox does not sync tree selection`, `row click does not select`, `directory double click does not open`, `viewport height preset switches`를 고정했다.
- Verification:
  - `cd g5-admin && bun run test -- src/features/server-files/SiteSftpBrowserPage.test.tsx src/features/server-files/SiteSftpTransferQueuePanel.test.tsx`
  - `cd g5-admin && bun x tsc --noEmit`
  - `cd g5-admin && bun run lint`
  - `cd g5-admin && bun run audit:docs`
  - `cd g5-admin && bun run audit:implementation`
  - `cd g5-admin && bun run audit:structure`

### `T2-259` SFTP 전송 패널에 실패 상세와 최근 완료 요약을 추가

- Why: split 작업면과 Rust 전송 큐까지는 갖췄지만, 하단 패널은 아직 `현재 아이템 목록`에 치우쳐 있었다. FileZilla류 작업센터 감각에 맞추려면 최근 완료 요약과 실패 상세 보기가 바로 보여야 했고, 실패 원인을 다시 찾으려고 row 하나하나 훑지 않게 해야 했다.
- What:
  - `SiteSftpTransferQueuePanel`에 최근 완료 요약 pill과 실패 개수 toggle을 추가했다.
  - 실패 항목은 확장 가능한 details block으로 분리해 파일명, source path, error message, attempt count를 한 번에 보이게 정리했다.
  - 별도 `SiteSftpTransferQueuePanel.test.tsx`를 추가해 최근 완료 요약 렌더와 실패 상세 toggle을 회귀 테스트로 고정했다.
- Verification:
  - `cd g5-admin && bun run test -- src/features/server-files/SiteSftpTransferQueuePanel.test.tsx`
  - `cd g5-admin && bun x tsc --noEmit`
  - `cd g5-admin && bun run lint`
  - `cd g5-admin && bun run audit:implementation`
  - `cd g5-admin && bun run audit:structure`

### `T2-258` SFTP 목록 방향키 선택과 follow-scroll을 탐색기처럼 보강

- Why: `T2-256~257`으로 batch 메뉴와 기본 단축키, 밀도 조정까지는 들어갔지만, 실제 큰 디렉터리에서 항목을 오갈 때는 여전히 마우스 의존이 컸다. FileZilla/Finder 감각에 가까워지려면 `ArrowUp/ArrowDown/Home/End`로 선택을 움직이고, 선택 항목이 목록 안에서 자동으로 따라오는 follow-scroll이 필요했다.
- What:
  - `useSiteSftpWorkspace`에 상대 이동/경계 이동 선택 함수를 추가해 현재 디렉터리 entries 기준으로 단일 선택을 안정적으로 이동하게 했다.
  - `useSiteSftpKeyboardShortcuts`는 `ArrowUp`, `ArrowDown`, `Home`, `End`를 처리해 선택과 inspect를 방향키로 이어 주도록 확장했다.
  - `SiteSftpBrowserList`는 현재 `selectedPath`를 기준으로 non-virtual list와 virtualized list 모두에서 선택 행을 자동 scroll-into-view 하도록 보강했다.
  - page-level 회귀 테스트를 추가해 방향키로 항목을 고른 뒤 `Enter`로 여는 흐름을 고정했다.
- Verification:
  - `cd g5-admin && bun run test -- src/features/server-files/SiteSftpBrowserPage.test.tsx`
  - `cd g5-admin && bun x tsc --noEmit`
  - `cd g5-admin && bun run lint`
  - `cd g5-admin && bun run audit:implementation`
  - `cd g5-admin && bun run audit:structure`

### `T2-257` SFTP 목록/큐 밀도와 트리 자동 펼침을 FileZilla 지향으로 보정

- Why: `T2-256`으로 배치 우클릭과 기본 단축키는 갖췄지만, 형님 체감 기준으로는 우측 파일 목록과 하단 작업 큐가 아직 높고 넓어서 `로그형 카드`처럼 보였고, 좌측 트리도 현재 경로까지 자연스럽게 펼쳐지지 않아 파일 클라이언트 감각이 약했다.
- What:
  - `SiteSftpBrowserList`의 grid 폭, column 비율, row padding, header padding을 더 낮춰 한 화면에 더 많은 항목이 보이도록 줄였다.
  - `SiteSftpTransferQueuePanel`은 header/row/action/error line을 더 촘촘한 한 줄 중심 배치로 바꿔 하단 패널이 로그 카드처럼 과도하게 넓어 보이지 않게 조정했다.
  - `SiteSftpDirectoryTree`는 현재 경로와 그 상위 경로를 기준으로 초기 open state를 계산하게 바꿔, 현재 위치까지는 기본 펼침 상태로 보이게 정리했다. 동시에 row height와 padding도 낮춰 전체 밀도를 맞췄다.
  - 후속 미세조정으로 `SiteSftpSelectionToolbar`, `SiteSftpWorkspaceSurface`까지 더 눌러서, 선택 툴바와 split 작업면 높이/최소폭도 FileZilla류 화면 밀도에 맞게 한 단계 더 줄였다.
  - 마지막 스크린샷 기준 미세조정으로 `SiteSftpBrowserControlsCard`, `SiteSftpDirectoryTree`, `useSiteSftpWorkspaceLayout`도 추가 보정해 좌측 패널을 더 좁히고, 상단 컨트롤과 트리 row를 더 평평하게 눌렀다.
- Verification:
  - `cd g5-admin && bun x tsc --noEmit`
  - `cd g5-admin && bun run lint`
  - `cd g5-admin && bun run test -- src/features/server-files/SiteSftpBrowserPage.test.tsx`

### `T2-256` SFTP 다중선택 우클릭 메뉴와 기본 키보드 단축키를 앱형으로 보강

- Why: `T2-255`까지로 체크박스 다중선택과 배치 툴바는 갖췄지만, 형님 실사용 기준으로는 아직 `파일 클라이언트`보다 `웹 리스트`에 가까웠다. 선택된 항목 위에서 우클릭했을 때 현재 selection 전체를 대상으로 동작해야 했고, `Cmd/Ctrl+A`, `Delete`, `Enter`, `Escape` 같은 기본 키보드 상호작용도 필요했다.
- What:
  - `SiteSftpBrowserList`의 row context menu를 단일 항목 메뉴에서 `현재 selection-aware` 메뉴로 바꿨고, 선택된 여러 항목 위에서 우클릭하면 batch `다운로드/복사/이동/삭제`가 그대로 동작하게 정리했다.
  - 새 `SiteSftpEntryContextMenuContent`를 추가해 batch label, shortcut, 단일 항목 전용 `편집/권한 변경` 노출 규칙을 분리했다.
  - `useSiteSftpKeyboardShortcuts`를 추가해 `Cmd/Ctrl+A` 전체 선택, `Delete/Backspace` 삭제 준비, `Enter` 열기/편집, `Escape` 선택 해제를 window 수준 shortcut으로 붙였다. editable target과 열린 modal state에서는 가로채지 않게 막았다.
  - `useSiteSftpWorkspace`는 현재 `selectedEntry`를 외부에 노출하고, `SiteSftpWorkspaceSurface`는 keyboard shortcut hook과 batch menu 전용 props를 연결했다.
- Verification:
  - `cd g5-admin && bun x tsc --noEmit`
  - `cd g5-admin && bun run lint`
  - `cd g5-admin && bun run test -- src/features/server-files/SiteSftpBrowserPage.test.tsx`
  - `cd g5-admin && bun run audit:implementation`
  - `cd g5-admin && bun run audit:structure`

### `T2-255` SFTP 작업면을 FileZilla 지향 고밀도 UX와 배치 액션으로 재정렬

- Why: `T2-252~254`로 split-pane, virtualization, Rust 전송 큐까지는 들어갔지만, 형님 실사용 기준으로는 여전히 목록/큐가 카드처럼 넓고 행 높이가 커서 `앱형 파일 클라이언트`보다 `웹 관리자 화면`에 더 가까웠다. 또한 다중 선택 후 삭제/복사/이동/다운로드가 안 되어 실제 SFTP 작업 흐름이 끊겼다.
- What:
  - `SiteSftpBrowserList`를 고밀도 테이블로 다시 정리하고, `..` 상위 이동을 같은 목록 SSOT 안에 유지한 채 체크박스 기반 다중 선택과 헤더 전체 선택을 추가했다.
  - `SiteSftpSelectionToolbar`를 도입해 다중 선택 후 `다운로드/복사/이동/삭제`를 한 번에 실행하게 했고, delete/path-operation 다이얼로그를 다중 source/candidate 입력을 처리하도록 확장했다.
  - `useSiteSftpWorkspace`, `useSiteSftpTransferWorkspace`를 재구성해 단일 선택과 다중 선택 상태를 분리하고, batch copy/move/delete/download와 hidden-deleted 경로 추적을 같은 상태 모델로 정리했다.
  - `SiteSftpTransferQueuePanel`, `SiteSftpWorkspaceSurface`, `SiteSftpBrowserControlsCard`의 밀도와 패널 비율을 조정해 목록은 더 넓고 큐는 더 낮게 보이도록 바꿨다.
  - 셀프감사 중 확인된 `useSiteSftpTransferQueue` hydrate race는 stale initial snapshot 무시와 과거 성공 항목 콜백 차단으로 보정했다.
- Verification:
  - `cd g5-admin && bun x tsc --noEmit`
  - `cd g5-admin && bun run lint`
  - `cd g5-admin && bun run test -- src/features/server-files/SiteSftpBrowserPage.test.tsx src/features/server-files/use-site-sftp-transfer-queue.test.tsx`
  - `cd g5-admin && bun run audit:implementation`
  - `cd g5-admin && bun run audit:structure`

### `T2-254` SFTP 전송 큐 hydrate race와 초기 성공 콜백 오판을 셀프감사로 보정

- Why: `T2-252~253` 구현 이후 셀프감사에서 `useSiteSftpTransferQueue`가 두 가지 subtle risk를 가진 걸 확인했다. 첫째, 초기 snapshot fetch와 실시간 queue event가 엇갈리면 오래된 초기 snapshot이 최신 상태를 다시 덮을 수 있었다. 둘째, mount 시 이미 `succeeded` 상태인 과거 전송 항목을 새 성공처럼 처리해 업로드 성공 후속 동작을 잘못 재실행할 수 있었다.
- What:
  - `useSiteSftpTransferQueue`는 이제 초기 hydrate와 live/mutation snapshot을 구분하고, live snapshot이 먼저 적용된 경우 stale initial snapshot을 무시한다.
  - 성공 콜백은 `event/mutation`에서 새로 `succeeded`로 전이된 항목에만 반응하고, 초기 hydrate에 포함된 과거 성공 항목에는 반응하지 않게 정리했다.
  - 회귀 방지를 위해 `use-site-sftp-transfer-queue.test.tsx`를 추가해 `stale initial snapshot 무시`, `과거 성공 항목 콜백 무시`를 검증했다.
- Verification:
  - `cd g5-admin && bun run test -- src/features/server-files/use-site-sftp-transfer-queue.test.tsx src/features/server-files/SiteSftpBrowserPage.test.tsx`
  - `cd g5-admin && bun x tsc --noEmit`

### `T2-253` SFTP 업로드/다운로드를 Rust 이벤트 전송 큐로 승격

- Why: `T2-252`로 작업면은 앱형 split-pane에 가까워졌지만, 실제 전송은 아직 프런트 `useState`가 순차 실행을 흉내 내는 수준이라 대량 업로드/다운로드와 제품형 전송 큐 UX를 받쳐주기 어려웠다. 다음 단계로 가기 전에 최소한 upload/download만큼은 Rust 쪽에서 큐와 상태 이벤트를 소유해야 했다.
- What:
  - `g5-admin-models`에 `SftpTransfer*` 타입을 추가하고, `cmd_sftp_transfer_snapshot`, `cmd_sftp_transfer_enqueue` command를 새 로컬 namespace로 열었다.
  - `sftp_transfer_queue`, `sftp_transfer_ops`, `sftp_transfer_service`를 추가해 site별 upload/download 작업을 Rust in-memory queue에서 순차 처리하고 `g5:sftp-transfer-queue` 이벤트로 snapshot을 푸시하게 했다.
  - 기존 `sftp_upload_service`, `sftp_download_service`의 공통 로직은 `sftp_transfer_ops`로 정리해 중복을 줄였다.
  - 프런트는 `use-site-sftp-transfer-queue`로 queue snapshot을 구독하고, `use-site-sftp-transfer-workspace`는 직접 upload/download를 실행하지 않고 queue 등록만 하도록 바꿨다. 하단 패널은 이제 upload/download 공용 `작업 큐`를 렌더한다.
- Verification:
  - `cargo test -p g5-admin-models export_ts_bindings --quiet`
  - `cargo check --manifest-path g5-admin/src-tauri/Cargo.toml`
  - `cargo test --manifest-path g5-admin/src-tauri/Cargo.toml transfer_queue_processes_upload_and_download_items --quiet -- --test-threads=1`
  - `cd g5-admin && bun x tsc --noEmit`
  - `cd g5-admin && bun run test -- src/api/client/sftp-transfer.test.ts src/api/client/core/command-context.test.ts src/features/server-files/SiteSftpBrowserPage.test.tsx`
  - `cd g5-admin && bun run lint`
  - `cd g5-admin && bun run audit:docs`
  - `cd g5-admin && bun run audit:implementation`
  - `cd g5-admin && bun run audit:consumer`
  - `cd g5-admin && bun run audit:structure`

### `T2-252` SFTP 작업면을 split-pane + 가상화 목록 기반 앱형 구조로 승격

- Why: 기존 SFTP 화면은 고정 2열 grid와 페이지형 카드 배치라 `웹 CRUD` 느낌이 강했고, 큰 디렉터리에서는 목록 행이 그대로 쌓여 제품형 SFTP 클라이언트 체감이 약했다. 형님 요구대로 `앱처럼 계속 쓰는 작업면`에 가깝게 만들기 위해서는 좌/우/하 분할 작업면과 목록 virtualization이 먼저 필요했다.
- What:
  - `react-resizable-panels`를 도입해 `SiteSftpWorkspaceSurface`를 `좌측 탐색/우측 목록/하단 전송 큐` 3패널 구조로 재구성했고, site별 레이아웃은 localStorage에 저장되게 했다.
  - 업로드 큐는 `SiteSftpBrowserControlsCard`에서 떼어내 `SiteSftpTransferQueuePanel`로 분리해, SFTP를 페이지형 폼이 아니라 작업면형 도구로 정리했다.
  - `SiteSftpBrowserList`는 `@tanstack/react-virtual` 기반 row virtualization 경로를 추가해 큰 디렉터리에서의 렌더 비용을 줄였고, `..` 상위 폴더 이동 행도 같은 목록 SSOT 안으로 유지했다.
  - 좌측 디렉터리 트리는 `react-arborist` 기반으로 교체해 기본 확장 상태, 탐색기형 행 렌더링, panel 내부 높이 대응을 함께 정리했다.
- Verification:
  - `cd g5-admin && bun x tsc --noEmit`
  - `cd g5-admin && bun run test -- src/features/server-files/SiteSftpBrowserPage.test.tsx`
  - `cd g5-admin && bun run lint`
  - `cd g5-admin && bun run audit:implementation`
  - `cd g5-admin && bun run audit:structure`

### `T2-251` SSH 새로고침 직후 prompt가 비어 보이던 문제를 shell snapshot hydrate로 복구

- Why: websocket bridge로 입력 hot path를 줄인 뒤에도, 형님 실사용 기준으로는 새로고침 직후 기존 SSH shell이 열린 상태인데 prompt가 비어 보여 Enter를 한 번 더 쳐야 하는 회귀가 남아 있었다. 이건 bootstrap `\r`를 더 보내는 문제라기보다, 새 화면이 기존 shell의 최근 출력 스냅샷을 못 받아오는 문제였다.
- What:
  - `g5-admin-ssh::SshShell`이 최근 출력 history를 bounded buffer로 유지하고 `snapshot()`으로 꺼낼 수 있게 했다.
  - `SshShellPort`와 bridge host는 websocket `ready` 프레임에 shell snapshot을 실어 보내고, 프런트 `SiteSshShellCard`는 transcript가 비어 있을 때 그 snapshot으로 xterm을 즉시 hydrate하도록 바꿨다.
  - snapshot이 들어온 경우 기존 prompt bootstrap timer는 취소해서 불필요한 `\r`가 한 번 더 들어가지 않게 했다.
- Verification:
  - `cargo check --manifest-path g5-admin/src-tauri/Cargo.toml --quiet`
  - `cd g5-admin && bun x tsc --noEmit`
  - `cd g5-admin && bun run test -- src/features/server-ssh/SiteSshShellCard.test.tsx`
  - `cargo test --manifest-path g5-admin/src-tauri/Cargo.toml --lib --quiet -- --test-threads=1`
  - `cd g5-admin && bun run audit:implementation`

### `T2-250` SSH xterm 입력을 localhost websocket bridge로 장기 채널화

- Why: `T2-249`로 backend writer queue와 blocking stream까지 붙였지만, 형님 실사용 기준으로는 아직 `xterm onData -> Tauri invoke -> Rust write` 반복 자체가 남아 있었다. VS Code나 Lightsail 같은 웹 터미널과의 차이도 이 per-invoke 입력 경로에서 크게 났기 때문에, `xterm.js`는 유지한 채 입력 브리지만 terminal 전용 장기 채널로 승격할 필요가 있었다.
- What:
  - `ssh_terminal_bridge` / `ssh_terminal_bridge_service` / `cmd_ssh_terminal_bridge_connect`를 추가해, 열린 SSH shell에 대해 site 단위 일회용 티켓 기반 localhost websocket bridge를 발급하도록 했다.
  - backend shell stream task는 websocket subscriber가 붙은 동안 Tauri event emit를 건너뛰고, 같은 `SshShellStreamEvent`를 websocket으로 직접 전달한다.
  - `SiteSshShellCard`는 shell open 시 bridge를 자동 연결하고, 준비된 뒤부터 입력과 resize를 `cmd_ssh_shell_write`/`cmd_ssh_shell_resize` 대신 websocket frame으로 보낸다. Tauri event/listen 경로는 bridge 실패 시 fallback으로만 남겨 두었다.
  - `SiteSshShellCard` websocket 회귀 테스트와 `ssh-terminal-bridge` client test를 추가했고, 성능 감사 문서와 체크리스트를 새 구조 기준으로 갱신했다.
- Verification:
  - `cargo test --manifest-path g5-admin-models/Cargo.toml export_ts_bindings --quiet`
  - `cargo check --manifest-path g5-admin/src-tauri/Cargo.toml --quiet`
  - `cd g5-admin && bun x tsc --noEmit`
  - `cd g5-admin && bun run test -- src/api/client/ssh-shell.test.ts src/api/client/ssh-terminal-bridge.test.ts src/features/server-ssh/SiteSshShellCard.test.tsx`
  - `cd g5-admin && bun run lint`
  - `cd g5-admin && bun run audit:docs`
  - `cd g5-admin && bun run audit:implementation`
  - `cd g5-admin && bun run audit:consumer`
  - `cd g5-admin && bun run audit:structure`

### `T2-249` SSH xterm 입력 hot path를 write queue + blocking stream으로 추가 최적화

- Why: `T2-246` 이후에도 형님 실사용 기준으로 빠른 타이핑에서 `clear`가 `clea`까지만 보인 채 Enter가 먼저 먹는 체감이 남아 있었다. 출력 polling은 이미 빠졌지만, 입력은 아직 `invoke -> backend write/flush await` 구조라 마지막 hot path 병목이 남아 있었다.
- What:
  - `g5-admin-ssh::SshShell`은 direct writer await 대신 bounded writer queue를 두고, 별도 writer task가 연속 입력을 배치 write/flush 하도록 바꿨다.
  - resize도 문자열 write와 같은 command queue를 타게 정리해 shell state 순서를 보장했다.
  - `SshShellPort`에는 `read_blocking`을 추가했고, `ssh_session_service`의 backend shell stream task는 timed `read()` 대신 blocking read로 바꿔 event push가 새 출력 도착 즉시 반응하게 했다.
  - 프런트는 기존 optimistic local echo + transcript ref 분리 구조를 유지한 채, backend queue/stream 개선과 맞물리도록 감사 문서와 체크리스트를 업데이트했다.
- Verification:
  - `cargo check --manifest-path g5-admin-ssh/Cargo.toml --quiet`
  - `cargo check --manifest-path g5-admin/src-tauri/Cargo.toml --quiet`
  - `cargo test --manifest-path g5-admin/src-tauri/Cargo.toml app_state::tests::ssh_sessions --quiet`
  - `cargo test --manifest-path g5-admin/src-tauri/Cargo.toml app_state::tests::sftp --quiet`
  - `cd g5-admin && bun x tsc --noEmit`
  - `cd g5-admin && bun run lint`
  - `cd g5-admin && bun run test -- src/api/client/ssh-shell.test.ts src/features/server-ssh/SiteSshShellCard.test.tsx src/features/server-ssh/SiteSshSessionPage.test.tsx src/features/server-ssh/use-site-ssh-terminal-workspace.test.tsx`
  - `cd g5-admin && bun run audit:docs`
  - `cd g5-admin && bun run audit:implementation`
  - `cd g5-admin && bun run audit:consumer`
  - `cd g5-admin && bun run audit:structure`

### `T2-248` fast deploy의 DB master key를 file로 되돌리되 기존 keychain DB를 자동 이어받게 보강

- Why: `T2-247`로 fast deploy의 강제 orphan/reset 경로는 막았지만, 개발용 fast deploy가 DB master 저장소까지 keychain으로 남으면서 형님이 `계속하기 -> 키체인 비밀번호 입력 -> file is not a database`를 겪었다. 형님 요구는 테스트/개발 중에는 매번 keychain prompt 없이 기존 사이트/SSH 데이터를 그대로 유지하는 것이었으므로, fast deploy는 다시 file 저장소를 써야 했다.
- What:
  - `deploy:desktop:fast`는 다시 `sessionStorage=file`, `dbMasterStorage=file`을 함께 적용한다.
  - 다만 `file` 저장소에 `.db-master-key`가 없고 keychain에 기존 `db-key`가 있으면, 런타임이 그 값을 로컬 `.db-master-key`로 복사 마이그레이션한 뒤 같은 DB를 이어서 열도록 바꿨다.
  - 즉 fast deploy는 개발용 반복 테스트에서 keychain prompt를 피하면서도, 과거 keychain-backed DB/사이트/SSH 프로필을 다시 입력하지 않게 유지한다.
- Verification:
  - `cd g5-admin && bun x tsc --noEmit`
  - `cd g5-admin && bun run audit:docs`
  - `cd g5-admin && bun run audit:implementation`
  - `cd g5-admin && bun run deploy:desktop:fast`
  - fast deploy 후 `~/Library/Application Support/g5-admin/app-config.json`에 `dbMasterStorage=file`이 다시 반영되는지 확인

### `T2-247` 빠른 배포가 로컬 DB를 orphan 처리하며 초기화처럼 보이던 저장 체계 꼬임 복구

- Why: 형님 피드백 기준으로 가장 큰 UX 파괴는 재배포할 때마다 `마스터 비밀번호 설정 -> 사이트 등록 -> SSH 등록`을 다시 하게 되는 점이었다. 원인을 확인해 보니 `deploy:desktop:fast`가 매번 `dbMasterStorage=file, sessionStorage=file`를 강제로 써버렸고, 과거 keychain 기반 DB와 충돌하는 경우 기존 DB를 `g5-admin.db.orphaned-*`로 격리해 사실상 초기화처럼 보이게 만들고 있었다.
- What:
  - 빠른 배포용 runtime config는 이제 `debugOverlay + sessionStorage=file`만 관리하고, `dbMasterStorage=file` 강제는 제거했다.
  - fast deploy script는 기존에 자신이 만든 관리형 config만 갱신하고, 사용자가 직접 둔 custom config는 덮어쓰지 않도록 바꿨다.
  - deploy script가 배포 전에 로컬 DB를 임의로 orphan 처리하던 로직을 제거했다. DB 복구 불가 판단은 배포 스크립트가 아니라 앱 런타임의 DB master key resolution이 맡는다.
  - macOS 기본 DB master 저장소는 keychain으로 승격했고, 리소스 `app-config.json`에서도 `dbMasterStorage=file` 고정을 제거해 재설치/재배포 시 기존 keychain-backed DB를 그대로 재사용하게 맞췄다.
- Verification:
  - `cd g5-admin && bun x tsc --noEmit`
  - `cd g5-admin && bun run audit:implementation`
  - `cd g5-admin && bun run deploy:desktop:fast`
  - fast deploy 후 `~/Library/Application Support/g5-admin/app-config.json`이 더 이상 `dbMasterStorage=file`을 강제하지 않는지 확인

### `T2-245` 헤더 새로고침을 현재 페이지 재조회로 제한하고 SSH 프로필 JSON을 파일로 입출력

- Why: 형님 피드백 기준으로 새로고침 버튼이 전체 앱 세션 확인까지 다시 타면서 `첫 화면 -> 세션 확인 중 -> 현재 화면`처럼 보여 UX가 가벼워 보이지 않았다. 또 SSH 프로필 JSON은 복사/붙여넣기만 가능해서 앱형 도구답게 파일 저장/불러오기를 지원해야 했다. 마지막으로 활성 사이트 기준 SSH 연결 상태를 최상단에서 눈에 띄게 표시할 필요가 있었다.
- What:
  - `app-shell-refresh` 브리지는 active query 전체 재조회가 아니라, 현재 화면 query만 다시 읽도록 `master/sites/auth` 전역 세션 query를 제외하도록 좁혔다.
  - `AppShellHeader`는 새로고침을 `window.location.reload()` 대신 앱 내부 query refresh로 바꾸고, 현재 사이트 SSH 연결 상태를 바로 보이는 아이콘으로 표시한다.
  - `AppShellSidebar`는 글로벌 사이트 작업면에서도 활성 사이트 기준 `SSH / SFTP` 보조 메뉴를 유지하도록 정리했다.
  - `SiteSshProfileJsonDialog`/`SiteSshProfilesModal`은 JSON 복사/붙여넣기 외에 실제 파일 저장/열기를 지원하도록 확장했고, Tauri `plugin-fs`를 연결해 데스크톱 앱 안에서 직접 `.json` 파일을 다루게 했다.
- Verification:
  - `cd g5-admin && bun x tsc --noEmit`
  - `cd g5-admin && bun run lint`
  - `cd g5-admin && bun run test -- src/features/layout/AppShellHeader.test.tsx src/features/layout/AppShellSidebar.test.tsx src/features/layout/AppShell.test.tsx src/features/server-profiles/site-ssh-profile-json.test.ts`
  - `cd g5-admin && bun run audit:docs`
  - `cd g5-admin && bun run audit:implementation`
  - `cd g5-admin && bun run audit:structure`

### `T2-246` SSH 프롬프트 복구와 xterm 우측 스크롤바 제거, 검색 아이콘 정렬 보정

- Why: 형님 실사용 기준으로 아직 세 가지 거슬리는 지점이 남아 있었다. 첫째, 새로고침 뒤 shell이 살아 있어도 첫 프롬프트가 바로 안 보여 Enter를 한 번 더 쳐야 했다. 둘째, xterm 우측 scrollbar track이 흰 줄처럼 보였고 앱형 터미널 톤을 해쳤다. 셋째, 헤더 검색창 돋보기 아이콘이 수직 가운데에 안 맞아 보였다.
- What:
  - `SiteSshShellCard`는 shell 활성 직후 첫 대기형 read가 빈 응답이면 carriage return을 한 번 자동 전송해 프롬프트를 복구하도록 바꿨다. 기존처럼 transcript 길이만 보고 seed하지 않고, 실제 live output 유무 기준으로 판단한다.
  - `SiteSshXtermSurface`에는 로컬 CSS override를 추가해 xterm viewport scrollbar를 숨기고, 내부 배경을 전체 검정으로 고정해 우측 흰 줄이 보이지 않게 했다.
  - `SiteSshTerminalToolbar`에서는 동작이 불명확했던 `화면 맞춤` 버튼을 제거하고, `AppShellHeaderSearch`는 icon addon 높이를 입력과 맞춰 돋보기가 수직 중앙에 오도록 정리했다.
- Verification:
  - `cd g5-admin && bun x tsc --noEmit`
  - `cd g5-admin && bun run lint`
  - `cd g5-admin && bun run test -- src/features/server-ssh/SiteSshShellCard.test.tsx src/features/layout/AppShellHeader.test.tsx`
  - `cd g5-admin && bun run audit:implementation`
  - `cd g5-admin && bun run deploy:desktop:fast`

### `T2-244` SSH 터미널을 앱형 패널로 다듬고 SFTP를 테이블 + 모달 편집기로 재구성

- Why: 형님 실사용 피드백 기준으로 남은 문제는 두 가지였다. 첫째, SSH 터미널은 입력 한 글자마다 자동 Enter가 붙어 실제 셸처럼 쓸 수 없었고, 상단 툴바 없이 단순 카드처럼 보여 데스크톱 SSH 앱 느낌이 약했다. 둘째, SFTP는 우측 상세 패널과 인라인 편집기 때문에 웹 CRUD처럼 보여서, 파일 클라이언트답게 좌측 트리 + 메인 목록 + 모달 편집기 구조로 다시 묶어야 했다.
- What:
  - `ssh_session_service.write_shell`은 입력에 강제로 `\n`을 붙이던 로직을 제거하고 raw PTY 바이트 스트림을 그대로 보내도록 고쳤다. 이로써 `xterm.js` 입력이 실제 SSH 터미널처럼 동작하고, 공백/개별 키 입력도 정상 처리된다.
  - `SiteSshShellCard`에는 검은 터미널 패널 위에 `SSH 셸 열기/닫기`, `화면 비우기`, 글꼴 크기 조절, 패널 높이(`S/M/L`), 화면 맞춤, 전체 화면 토글을 갖춘 전용 툴바를 추가했다. `SiteSshXtermSurface`는 글꼴 크기와 fit 요청을 직접 반영하도록 정리했다.
  - SFTP 작업면은 우측 상세/미리보기 패널을 제거하고, 좌측 디렉터리 트리 + 상단 경로/업로드/새 폴더 작업 바 + 메인 파일 테이블 조합으로 재구성했다. `SiteSftpBrowserList`는 TanStack Table 기반의 한 줄 한 항목 목록으로 교체했고, 편집 가능한 텍스트 파일은 연필 아이콘과 우클릭 편집으로 바로 모달 편집기를 연다.
  - 편집기는 `SiteSftpEditorModal` + `SiteSftpEditorSurface`로 분리해 바깥 클릭으로는 닫히지 않게 했고, `저장/취소/형식 정리`를 기본 버튼으로 제공했다. 형식 정리는 `prettier`를 직접 의존성으로 올린 뒤 동적 import로만 불러와서, 지원 가능한 확장자만 실제 포맷터를 태운다.
  - 회귀 방지를 위해 Rust SSH session test와 `SiteSshSessionPage`/`SiteSshShellCard`/`SiteSftpBrowserPage` interaction test를 새 동선 기준으로 갱신했다.
- Verification:
  - `bash scripts/with_optional_sccache.sh cargo test --manifest-path g5-admin/src-tauri/Cargo.toml ssh_sessions --quiet`
  - `cd g5-admin && bun x tsc --noEmit`
  - `cd g5-admin && bun run lint`
  - `cd g5-admin && bun run test -- src/features/server-ssh/SiteSshSessionPage.test.tsx src/features/server-ssh/SiteSshShellCard.test.tsx src/features/server-files/SiteSftpBrowserPage.test.tsx`
  - `cd g5-admin && bun run audit:implementation`

## 2026-03-26

### `T2-243` SSH 연결 직후 셸 자동 진입과 접속 유지 복구를 앱 동선에 맞게 보정

- Why: `T2-241~242`로 SSH/SFTP IA는 앱형 작업면으로 모였지만, 실제 연결 흐름은 아직 한 번 더 `셸 열기`를 눌러야 터미널이 살아났고, `접속 유지`는 페이지 이동에는 견디더라도 새 마운트나 앱 재실행에서 transcript를 확실히 복구하지 못했다. 또 셸 open/close가 status refetch를 추가로 때리면서 형님이 지적하신 깜빡임 원인을 더 만들고 있었다.
- What:
  - `SiteSshProfilesModal`은 프로필 연결 성공 직후 shell이 닫혀 있으면 `openShell`까지 이어서 호출하고, 셸이 실제로 열렸을 때만 모달을 닫도록 바꿨다.
  - `useSiteSshShell`은 open/close 성공 시 `sshSessionStatusKey` query cache를 직접 동기화하도록 바꿔, 셸 lifecycle이 status refetch 없이도 페이지 상태와 맞물리게 했다.
  - `SiteSshShellCard`는 open/close 직후 불필요한 `refetchStatus`를 제거해 깜빡임 경로를 줄였고, `SiteSshSessionPage`에서도 수동 `상태 새로고침` 액션을 걷어냈다.
  - `useSiteSshTerminalWorkspace`는 `접속 유지`가 켜진 사이트에 한해 transcript를 localStorage에 저장/복구하도록 보강해, 다른 페이지 이동은 물론 새 마운트에서도 터미널 출력을 이어받게 했다.
- Verification:
  - `cd g5-admin && bun x tsc --noEmit`
  - `cd g5-admin && bun run lint`
  - `cd g5-admin && bun run test -- src/features/server-ssh/SiteSshSessionPage.test.tsx src/features/server-ssh/SiteSshShellCard.test.tsx src/features/server-ssh/use-site-ssh-terminal-workspace.test.tsx`
  - `cd g5-admin && bun run audit:implementation`
  - `cd g5-admin && bun run audit:structure`

### `T2-242` SSH/SFTP 앱형 작업면 정리를 하부 런타임·라우트·사이드바까지 마감

- Why: `T2-241`에서 표면 UX는 이미 `SSH / SFTP` 두 작업면으로 모였지만, 하부에는 `cmd_ssh_exec`용 포트/모델 잔재가 남아 있었고, 라우트 쪽에도 `/server/editor`, `/server/profiles` alias가 살아 있었다. 또 SSH 터미널은 polling을 React Query mutation으로 태워서 입력 중 불필요한 재렌더가 생길 여지가 있었고, 사이트관리 화면에서 바로 `SSH / SFTP` 보조메뉴가 보이지 않아 형님이 지적하신 앱형 IA와 아직 어긋났다.
- What:
  - `SshExecInput/Response`, `SshExecResult/Output`, `SshConnectionPort::exec`, `ssh_session_service.exec`, 관련 Rust 테스트/TS 바인딩까지 걷어내서 SSH 런타임을 `interactive shell + SFTP` 두 축으로만 남겼다.
  - 숨은 `SiteSshProfilesPage`, `SiteSftpEditorPage`와 `/server/profiles`, `/server/editor` 라우트를 삭제해 사용자/코드 기준 SSOT를 `SSH`, `SFTP` 두 작업면으로 고정했다.
  - `AppShellSidebar`는 현재 경로의 `siteId`가 없더라도 활성 사이트 기준으로 `SSH / SFTP` 보조메뉴를 바로 노출하도록 바꿔, 사이트관리 작업면에서도 앱형 서버 서브메뉴가 유지되게 했다.
  - `useSiteSshShell`은 `open/close`만 mutation으로 남기고 `read/write/resize`는 순수 런타임 호출로 분리했으며, `useSiteSshSession`은 focus/reconnect 자동 refetch를 꺼서 xterm 입력 중 상태 query가 불필요하게 흔들리지 않게 했다.
- Verification:
  - `cargo test -p g5-admin-models export_ts_bindings --quiet`
  - `bash scripts/with_optional_sccache.sh cargo check --manifest-path Cargo.toml --workspace --quiet`
  - `bash scripts/with_optional_sccache.sh cargo test --manifest-path Cargo.toml --workspace --lib --quiet -- --test-threads=1`
  - `cd g5-admin && bun x tsc --noEmit`
  - `cd g5-admin && bun run test -- src/features/layout/AppShellSidebar.test.tsx src/features/server-ssh/SiteSshSessionPage.test.tsx src/features/server-ssh/SiteSshShellCard.test.tsx src/features/server-files/SiteSftpBrowserPage.test.tsx src/app/adminRouteRegistry.test.tsx src/api/client/ssh-shell.test.ts src/api/client/core/command-context.test.ts`

### `T2-241` SSH/SFTP IA를 웹형 분리 화면에서 앱형 작업면으로 재정리

- Why: 기존 서버 도구 IA는 `SSH 연결 / SSH 프로필 / SFTP 파일 브라우저 / SFTP 편집기`처럼 기능 하나마다 메뉴가 쪼개져 있어서 데스크톱 SSH/SFTP 클라이언트 경험과 거리가 멀었다. 형님 지적대로 이 영역은 웹 페이지가 아니라 앱 작업면처럼 보여야 했고, 특히 프로필 관리는 SSH 안의 모달 흐름으로, 파일 작업은 SFTP 하나의 작업면으로 합쳐야 했다.
- What:
  - 서버 보조메뉴를 `SSH`, `SFTP` 두 개만 남기고, 기존 `editor`/`profiles` route는 이후 `T2-242`에서 완전히 제거할 전제로 alias로만 남겨 뒀다.
  - SSH는 `SiteSshProfilesModal`로 프로필 CRUD/연결/known_hosts 신뢰 확인을 한 모달에서 처리하게 정리했고, `SiteSshShellCard`는 `접속 유지` 상태를 React Query + localStorage에 저장해 다른 페이지로 이동했다가 돌아와도 터미널 transcript를 이어받게 만들었다.
  - `cmd_ssh_exec` 단일 명령 경로는 SSH 화면에서 완전히 제거하고, Tauri registry / client command context에서도 빼서 interactive shell 하나만 남겼다.
  - `xterm.js` surface는 테마 종속 remount를 끊고 검은 배경/흰 글자 고정 terminal 톤으로 맞췄다.
  - SFTP는 `@minoru/react-dnd-treeview` 기반 디렉터리 트리, 통합 파일 목록, 우클릭 context menu, 복사/이동/권한 변경 dialog를 추가해 한 작업면에서 탐색/편집/관리 흐름이 닫히게 만들었다.
  - SFTP 편집은 별도 페이지가 아니라 `/server/files` 안의 Monaco 작업면으로 통합했고, `copy/move/chmod` backend command, TS bindings, command context, navigation manifest도 같이 연결했다.
- Verification:
  - `cargo test -p g5-admin-models export_ts_bindings --quiet`
  - `bash scripts/with_optional_sccache.sh cargo check --manifest-path Cargo.toml --workspace --quiet`
  - `cd g5-admin && bun x tsc --noEmit`
  - `cd g5-admin && bun run lint`
  - `cd g5-admin && bun run test -- src/features/server-ssh/SiteSshSessionPage.test.tsx src/features/server-files/SiteSftpBrowserPage.test.tsx src/app/adminRouteRegistry.test.tsx src/features/layout/navigation.test.ts`

### `T2-240` SSH 터미널 PTY resize를 `xterm.js` fit과 동기화

- Why: `xterm.js` surface로 UI는 실제 터미널처럼 바뀌었지만, 원격 SSH PTY는 아직 `120x32` 고정 크기로 열리고 있었다. 이 상태에선 창 크기를 바꿔도 `vim`, `less`, 줄바꿈, 전체 화면 명령이 계속 어긋나므로, 다음 얇은 슬라이스는 shell runtime을 다시 키우는 게 아니라 `fit -> window-change`만 끝까지 연결하는 것이었다.
- What:
  - `g5-admin-ssh`의 `SshShell`에 `resize(cols, rows)`를 추가해 `russh`의 `window_change`를 그대로 감싼 뒤, `src-tauri`에는 `cmd_ssh_shell_resize`와 `ssh_session_service.resize_shell`만 얇게 얹었다.
  - 프런트는 `SiteSshTerminalSurface`/`SiteSshXtermSurface`가 `FitAddon` 결과를 `onResize`로 올리도록 바꾸고, `SiteSshShellCard`가 중복 크기 전송을 dedupe 하면서 활성 shell에만 resize command를 보내게 했다.
  - 회귀 방지를 위해 Rust app_state shell lifecycle 테스트, `ssh-shell` API client 테스트, `SiteSshShellCard` resize dedupe 테스트를 추가했다.
- Verification:
  - `cargo test -p g5-admin-models export_ts_bindings --quiet`
  - `bash scripts/with_optional_sccache.sh cargo check --manifest-path Cargo.toml --workspace --quiet`
  - `bash scripts/with_optional_sccache.sh cargo test --manifest-path Cargo.toml --workspace --lib --quiet -- --test-threads=1`
  - `cd g5-admin && bun x tsc --noEmit`
  - `cd g5-admin && bun run lint`
  - `cd g5-admin && bun run test -- src/features/server-ssh/SiteSshShellCard.test.tsx src/features/server-ssh/SiteSshSessionPage.test.tsx src/api/client/ssh-shell.test.ts src/api/client/core/command-context.test.ts`
  - `cd g5-admin && bun run audit:implementation`
  - `cd g5-admin && bun run audit:consumer`
  - `cd g5-admin && bun run audit:structure`
  - `cd g5-admin && bun run audit:docs`

### `T2-239` SSH 호스트 신뢰 확인을 앱 안에서 직접 처리

- Why: 기존 SSH 연결 흐름은 `known_hosts` 검증을 엄격하게 하면서도, 신뢰 등록 자체는 사용자가 터미널로 나가서 `ssh`를 한 번 직접 쳐야 했다. 형님 지적대로 이건 절차가 틀렸고, 앱이 보안 정책을 소유한다면 `지문 확인 -> 신뢰 등록 -> 재연결`도 앱 안에서 닫혀야 했다.
- What:
  - `g5-admin-ssh`에 host verification probe/runtime을 추가해, 서버 지문 조회와 `known_hosts` 등록을 기존 SSH 세션 경계와 분리했다.
  - `cmd_ssh_host_verification_status`, `cmd_ssh_host_verification_trust`를 새로 열고, `SiteSshSessionPage`/`SiteSshConnectProfilesCard`/`SiteSshProfileTrustPanel`에서 연결 실패 시 앱 안에서 바로 지문 확인과 신뢰 등록을 진행하게 만들었다.
  - `ssh_host_verification_error` 안내 문구도 터미널 지시를 제거하고, SSH 연결 화면에서 `이 서버 신뢰`로 처리하라는 앱 기준 안내로 바꿨다.
  - 회귀 방지를 위해 API client test, SSH session page interaction test, Rust app_state host verification test를 추가했다.
- Verification:
  - `cargo test -p g5-admin-models export_ts_bindings --quiet`
  - `bash scripts/with_optional_sccache.sh cargo check --manifest-path Cargo.toml --workspace --quiet`
  - `bash scripts/with_optional_sccache.sh cargo test --manifest-path g5-admin/src-tauri/Cargo.toml app_state::tests::ssh_host_verification --quiet`
  - `cd g5-admin && bun x tsc --noEmit`
  - `cd g5-admin && bun run lint`
  - `cd g5-admin && bun run test -- src/features/server-ssh/SiteSshSessionPage.test.tsx src/api/client/ssh-session.test.ts src/api/client/ssh-host-verification.test.ts`
  - `cd g5-admin && bun run audit:implementation`
  - `cd g5-admin && bun run audit:consumer`
  - `cd g5-admin && bun run audit:structure`
  - `cd g5-admin && bun run audit:docs`

### `T2-238` SSH 셸 UI를 `xterm.js` 실제 터미널 surface로 전환

- Why: 백엔드는 이미 실제 PTY shell을 열고 있었지만, 프런트는 `textarea + 수동 출력 읽기` 수준이라 형님이 기대하신 "실제 터미널처럼 쓰는 SSH" 경험과 거리가 있었다. 이번엔 프로토콜이나 세션 경계를 다시 키우지 않고, 프런트 shell surface만 `xterm.js`로 교체하는 얇은 슬라이스가 맞았다.
- What:
  - `xterm`, `@xterm/addon-fit`를 추가하고, `SiteSshXtermSurface.tsx`에서 lazy-loaded `xterm.js` terminal과 resize fit addon만 붙였다.
  - `SiteSshShellCard.tsx`는 키 입력 버퍼링, 자동 read polling, exit 상태 badge, 화면 초기화까지 담당하고, 실제 터미널 렌더링은 `SiteSshTerminalSurface.tsx`/`SiteSshTerminalFallback.tsx`로 분리했다.
  - 테스트 환경은 fallback input으로 유지해 회귀를 쉽게 잡되, 실제 앱 런타임에서는 `xterm.js` surface가 올라오도록 분기했다.
  - `vite.config.ts`에는 `vendor-terminal` chunk를 추가해 xterm 런타임이 기본 admin/vendor 묶음에 섞이지 않게 맞췄다.
- Verification:
  - `cd g5-admin && bun x tsc --noEmit`
  - `cd g5-admin && bun run lint`
  - `cd g5-admin && bun run test -- src/features/server-ssh/SiteSshSessionPage.test.tsx`
  - `cd g5-admin && bun run audit:implementation`
  - `cd g5-admin && bun run audit:consumer`
  - `cd g5-admin && bun run audit:structure`
  - `cd g5-admin && bun run audit:docs`

### `T2-237` Monaco 편집기 번들을 basic-languages 중심으로 경량화

- Why: 전용 SFTP 편집기에 Monaco를 올린 뒤 기능과 감사는 통과했지만, `monaco-editor` 전체 import 때문에 `vendor-editor` chunk가 과하게 커지고 `ts/css/html` worker 경고가 다시 생겼다. 현재 요구는 IDE급 언어 서비스가 아니라 구문 강조와 편집이므로, 필요한 language contribution과 worker만 남기는 쪽이 맞았다.
- What:
  - `site-sftp-monaco-runtime.ts`를 추가해 `editor.api` 기반 Monaco runtime, `editor.worker + json.worker`, 필요한 basic-language contribution만 명시적으로 등록하도록 바꿨다.
  - `SiteSftpMonacoEditor.tsx`는 full `monaco-editor` import를 제거하고 위 runtime bootstrap만 로드하게 정리했다.
  - `vite.config.ts`는 Monaco 관련 모듈을 `react wrapper / core / basic-languages / json` 정도의 독립 경계만 분리해, 순환 의존을 깨지 않으면서도 lazy editor route 바깥으로 덩치를 전파하지 않게 맞췄다.
  - 결과적으로 `typescript/html/css` 전용 language service worker는 번들에서 빠지고, 전용 editor는 기존처럼 구문 강조와 저장 흐름만 유지한다.
- Verification:
  - `cd g5-admin && bun x tsc --noEmit`
  - `cd g5-admin && bun run lint`
  - `cd g5-admin && bun run test -- src/features/server-files/SiteSftpBrowserPage.test.tsx src/features/server-files/SiteSftpEditorPage.test.tsx src/features/server-files/site-sftp-editor-language.test.ts src/app/adminRouteRegistry.test.tsx`
  - `cd g5-admin && bun run audit:implementation`
  - `cd g5-admin && bun run audit:consumer`
  - `cd g5-admin && bun run audit:structure`
  - `cd g5-admin && bun run audit:docs`

### `T2-236` 사이트별 SFTP 전용 편집기를 Monaco로 교체

- Why: 전용 editor route가 열려도 textarea만으로는 실제 코드 수정 흐름의 가독성과 안전성이 부족했다. 이미 `read/write` 경계는 분리돼 있었으므로, 다음 단계는 새 runtime/glue를 늘리는 게 아니라 editor surface만 Monaco lazy chunk로 교체하는 것이 맞았다.
- What:
  - `@monaco-editor/react`, `monaco-editor`를 추가하고, 로컬 bundle을 쓰도록 `SiteSftpMonacoEditor.tsx` wrapper에서 loader를 구성했다.
  - `SiteSftpCodeEditor.tsx`, `site-sftp-editor-language.ts`를 추가해, 전용 편집기 route는 파일 경로 기반 언어 선택과 테마 연동(`vs`/`vs-dark`)을 갖는 Monaco surface를 쓰게 했다.
  - 테스트 환경은 textarea fallback을 유지하게 만들어 기존 page/save 흐름 테스트를 그대로 살렸고, `site-sftp-editor-language.test.ts`로 경로별 language mapping 회귀를 막았다.
  - 번들 분할은 `vite.config.ts`의 `vendor-editor` chunk로 분리해 기존 feature chunk에 Monaco를 섞어 넣지 않도록 했다.
- Verification:
  - `cd g5-admin && bun x tsc --noEmit`
  - `cd g5-admin && bun run lint`
  - `cd g5-admin && bun run test -- src/features/server-files/SiteSftpBrowserPage.test.tsx src/features/server-files/SiteSftpEditorPage.test.tsx src/features/server-files/site-sftp-editor-language.test.ts src/app/adminRouteRegistry.test.tsx`
  - `cd g5-admin && bun run audit:implementation`
  - `cd g5-admin && bun run audit:consumer`
  - `cd g5-admin && bun run audit:structure`
  - `cd g5-admin && bun run audit:docs`

### `T2-235` 사이트별 전용 SFTP 코드 편집기 라우트 도입

- Why: 파일 브라우저 안의 본문 미리보기 저장만으로는 실제 코드 수정 흐름을 닫기 어렵고, SDD에 정의된 `/sites/:siteId/server/editor` 전용 작업면도 계속 비어 있었다. 그렇다고 Monaco까지 한 번에 열면 범위가 커지므로, 이번에는 기존 SFTP read/write를 재사용하는 전용 editor route를 먼저 열었다.
- What:
  - `SERVER_EDITOR_ROUTE`와 `SiteSftpEditorPage`를 추가해 `/sites/:siteId/server/editor?path=...` 라우트에서 대상 파일을 읽고 저장하도록 연결했다.
  - 파일 브라우저 목록의 파일 항목에 `편집기` 버튼을 추가해, 현재 파일 경로를 query string으로 넘기며 전용 편집 작업면으로 이동하게 했다.
  - 전용 편집기는 `use-site-sftp-editor.ts`, `SiteSftpEditorSurface.tsx`, `site-sftp-editor-path.ts`로 분리해, read/write 재사용 경계와 query param 파싱 경계를 페이지 바깥으로 뺐다.
  - 문서상 `P2`의 코드 편집기는 `textarea 기반 전용 route 완료 / Monaco 교체 보류` 상태로 갱신했다.
- Verification:
  - `cd g5-admin && bun x tsc --noEmit`
  - `cd g5-admin && bun run lint`
  - `cd g5-admin && bun run test -- src/features/server-files/SiteSftpBrowserPage.test.tsx src/features/server-files/SiteSftpEditorPage.test.tsx src/app/adminRouteRegistry.test.tsx`
  - `cd g5-admin && bun run audit:structure`

### `T2-234` 사이트별 SFTP 삭제 슬라이스 도입

- Why: 파일 브라우저가 탐색, 업로드, 저장까지 닫혀도 운영에서는 로그 정리나 잘못 올린 파일 제거 같은 최소 삭제 동작이 빠지면 작업면이 반쪽짜리였다. 그렇다고 재귀 삭제나 bulk 선택까지 같이 열면 범위와 회귀면이 급격히 커지므로, 이번에는 `명시적 확인 + 파일/빈 디렉터리 삭제` 한 조각만 열었다.
- What:
  - `g5-admin-ssh`에는 `delete`와 `SftpDelete` 결과 타입만 추가하고, 실제 삭제는 `russh-sftp`의 `remove_file`/`remove_dir`에 그대로 위임했다.
  - `src-tauri`는 `SftpSessionPort::delete`, `app_state/sftp_delete_service.rs`, `cmd_sftp_delete`만 얹고, 기존 `sftp_support.rs`가 사이트 존재 확인, 세션 재사용, 활동 로그(`site.sftp.delete`)를 공용으로 담당하게 유지했다.
  - 프런트는 기존 `/sites/:siteId/server/files` 목록에 항목별 `삭제` 버튼과 `ConfirmActionDialog`만 추가했다. 현재 슬라이스는 재귀 삭제를 허용하지 않고, 빈 디렉터리 삭제만 서버가 수용하도록 남겼다.
  - local command context, api target registry, route manifest, smoke registry, SFTP 브라우저 테스트에도 `cmd_sftp_delete`를 반영했다.
- Verification:
  - `cargo fmt --all`
  - `cargo test -p g5-admin-models export_ts_bindings --quiet`
  - `bash scripts/with_optional_sccache.sh cargo check --manifest-path Cargo.toml --workspace --quiet`
  - `bash scripts/with_optional_sccache.sh cargo test --manifest-path Cargo.toml --workspace --lib --quiet -- --test-threads=1`
  - `cd g5-admin && bun x tsc --noEmit`
  - `cd g5-admin && bun run test -- src/features/server-files/SiteSftpBrowserPage.test.tsx src/features/server-ssh/SiteSshSessionPage.test.tsx src/features/sites/SiteDashboardPage.test.tsx src/api/client/core/command-context.test.ts tests/e2e/smoke.test.ts`
  - `cd g5-admin && bun run audit:implementation`
  - `cd g5-admin && bun run audit:consumer`
  - `cd g5-admin && bun run audit:structure`
  - `cd g5-admin && bun run audit:docs`

### `T2-233` 사이트별 SFTP 디렉터리 생성 슬라이스 도입

- Why: 파일 브라우저가 다운로드, 업로드, 텍스트 저장까지 닫혀도 실제 운영에서는 release 폴더나 임시 작업 디렉터리를 현재 경로 아래 즉시 만드는 기본 동작이 자주 필요하다. 그렇다고 삭제/이동까지 같이 열면 안전장치와 확인 흐름 때문에 범위가 다시 두꺼워지므로, 이번에는 `현재 디렉터리 기준 mkdir` 한 조각만 여는 것이 맞았다.
- What:
  - `g5-admin-ssh`에는 `mkdir`와 `SftpDirectoryCreate` 결과 타입만 추가하고, 실제 생성은 `russh-sftp`의 `create_dir`에 그대로 위임했다.
  - `src-tauri`는 `SftpSessionPort::mkdir`, `app_state/sftp_mkdir_service.rs`, `cmd_sftp_mkdir`만 얹고, 기존 `sftp_support.rs`가 사이트 존재 확인, 세션 재사용, 활동 로그를 그대로 공용으로 담당하게 유지했다.
  - 프런트는 기존 `/sites/:siteId/server/files` 경로 카드 아래에 `새 폴더 이름 + 폴더 생성` 한 줄만 추가했다. 대상 경로는 현재 브라우저 경로 하위에만 생성되도록 제한했다.
  - local command context, api target registry, route manifest, smoke registry에도 `cmd_sftp_mkdir`를 반영했다.
- Verification:
  - `cargo fmt --all`
  - `cargo test -p g5-admin-models export_ts_bindings --quiet`
  - `bash scripts/with_optional_sccache.sh cargo check --manifest-path Cargo.toml --workspace --quiet`
  - `bash scripts/with_optional_sccache.sh cargo test --manifest-path Cargo.toml --workspace --lib --quiet -- --test-threads=1`
  - `cd g5-admin && bun x tsc --noEmit`
  - `cd g5-admin && bun run test -- src/features/server-files/SiteSftpBrowserPage.test.tsx src/features/server-ssh/SiteSshSessionPage.test.tsx src/features/sites/SiteDashboardPage.test.tsx src/api/client/core/command-context.test.ts tests/e2e/smoke.test.ts`
  - `cd g5-admin && bun run audit:implementation`
  - `cd g5-admin && bun run audit:consumer`
  - `cd g5-admin && bun run audit:structure`
  - `cd g5-admin && bun run audit:docs`

### `T2-232` 사이트별 SFTP 텍스트 저장 슬라이스 도입

- Why: 파일 브라우저가 본문 미리보기, 다운로드, 현재 디렉터리 업로드까지 닫혀도 운영 수정의 마지막 한 조각인 "텍스트 편집 후 바로 저장"이 없으면 여전히 외부 편집기로 흐름이 끊긴다. 그렇다고 Monaco 에디터, binary overwrite, 삭제까지 같이 열면 범위가 다시 두꺼워지므로, 이번에는 기존 미리보기 카드 위에 `text save`만 추가하는 것이 맞았다.
- What:
  - `g5-admin-ssh`에는 `write_file`과 `SftpFileWrite` 결과 타입만 추가하고, 실제 파일 생성/덮어쓰기는 `russh-sftp`의 기존 `create` API에 그대로 위임했다.
  - `src-tauri`는 `SftpSessionPort::write_file`, `app_state/sftp_write_service.rs`, `cmd_sftp_write_file`만 얹고, 기존 `sftp_support.rs`가 사이트 존재 확인, 세션 재사용, 활동 로그를 그대로 공용으로 담당하게 유지했다.
  - 프런트는 기존 `/sites/:siteId/server/files` 미리보기 카드 안에서 텍스트 draft와 `저장` 액션만 추가했다. 미리보기가 `truncated`이거나 `utf8_lossy`인 경우에는 잘못된 덮어쓰기를 막기 위해 저장을 비활성화했다.
  - local command context, api target registry, route manifest, smoke registry에도 `cmd_sftp_write_file`를 반영했다.
- Verification:
  - `cargo fmt --all`
  - `cargo test -p g5-admin-models export_ts_bindings --quiet`
  - `bash scripts/with_optional_sccache.sh cargo check --manifest-path Cargo.toml --workspace --quiet`
  - `bash scripts/with_optional_sccache.sh cargo test --manifest-path Cargo.toml --workspace --lib --quiet -- --test-threads=1`
  - `cd g5-admin && bun x tsc --noEmit`
  - `cd g5-admin && bun run test -- src/features/server-files/SiteSftpBrowserPage.test.tsx src/features/server-ssh/SiteSshSessionPage.test.tsx src/features/sites/SiteDashboardPage.test.tsx src/api/client/core/command-context.test.ts tests/e2e/smoke.test.ts`
  - `cd g5-admin && bun run audit:implementation`
  - `cd g5-admin && bun run audit:consumer`
  - `cd g5-admin && bun run audit:structure`
  - `cd g5-admin && bun run audit:docs`

### `T2-231` 사이트별 현재 디렉터리 SFTP 업로드 슬라이스 도입

- Why: SFTP 브라우저가 탐색, 본문 미리보기, 다운로드까지 닫혀도 실제 운영에서는 로컬 패치를 현재 서버 디렉터리에 바로 올리는 기본 업로드가 빠지면 작업 흐름이 다시 끊긴다. 그렇다고 remote rename, overwrite confirm, 편집 저장, 삭제까지 한 번에 열면 범위가 다시 두꺼워지므로, 이번에는 `현재 디렉터리 + 로컬 파일명 그대로` 업로드 한 조각만 먼저 여는 것이 맞았다.
- What:
  - `g5-admin-ssh`에는 `upload_file`과 `SftpUpload` 결과 타입만 추가하고, 원격 대상은 부모 디렉터리만 canonicalize한 뒤 파일명을 다시 붙이는 방식으로 비존재 파일 업로드를 처리했다.
  - `src-tauri`는 `SftpSessionPort::upload_file`, `app_state/sftp_upload_service.rs`, `cmd_sftp_upload`만 추가하고, 기존 `sftp_support.rs`가 사이트 존재 확인, 세션 재사용, 활동 로그를 그대로 공용으로 담당하게 유지했다.
  - 프런트는 `/sites/:siteId/server/files` 화면 상단에 로컬 파일 picker 기반 `업로드` 액션만 추가하고, 업로드 대상은 현재 브라우저 경로에 같은 파일명으로 고정했다.
  - local command context, api target registry, route manifest, smoke registry에도 `cmd_sftp_upload`를 반영했다.
- Verification:
  - `cargo fmt --all`
  - `cargo test -p g5-admin-models export_ts_bindings --quiet`
  - `bash scripts/with_optional_sccache.sh cargo check --manifest-path Cargo.toml --workspace --quiet`
  - `bash scripts/with_optional_sccache.sh cargo test --manifest-path Cargo.toml --workspace --lib --quiet -- --test-threads=1`
  - `cd g5-admin && bun x tsc --noEmit`
  - `cd g5-admin && bun run test -- src/features/server-files/SiteSftpBrowserPage.test.tsx src/features/server-ssh/SiteSshSessionPage.test.tsx src/features/sites/SiteDashboardPage.test.tsx src/api/client/core/command-context.test.ts tests/e2e/smoke.test.ts`
  - `cd g5-admin && bun run audit:implementation`
  - `cd g5-admin && bun run audit:consumer`
  - `cd g5-admin && bun run audit:structure`
  - `cd g5-admin && bun run audit:docs`

### `T2-230` 사이트별 SFTP 다운로드 슬라이스 도입

- Why: 읽기 전용 브라우저와 본문 미리보기까지는 닫았지만, 실제 운영 점검에서는 원격 파일을 로컬로 즉시 보존하거나 diff용으로 떨궈야 하는 경우가 많다. 그렇다고 업로드/쓰기/삭제까지 한 번에 열면 `g5-admin-ssh`, `src-tauri`, 프런트 작업면이 다시 두꺼워질 위험이 있어서, 이번에는 `download_file`만 별도 세로 슬라이스로 끊는 것이 맞았다.
- What:
  - `g5-admin-ssh`에는 `russh-sftp` 파일 핸들을 그대로 재사용하는 `download_file`과 `SftpDownload` 결과 타입만 추가하고, 로컬 파일 쓰기 실패는 `SshClientError::Storage`로 분리했다.
  - `src-tauri`는 `SftpSessionPort::download_file`, `app_state/sftp_download_service.rs`, `cmd_sftp_download`만 얹고, 기존 사이트별 SSH/SFTP 세션 재사용과 활동 로그 기록은 `sftp_support.rs` 공용 헬퍼로 유지했다.
  - 프런트는 파일 브라우저 안에서 저장 경로를 먼저 받고 `다운로드` 액션만 추가했으며, 업로드/편집 저장 surface는 아직 열지 않았다.
  - local command context, api target registry, route manifest, smoke registry에도 `cmd_sftp_download`를 반영했다.
- Verification:
  - `cargo fmt --all`
  - `cargo test -p g5-admin-models export_ts_bindings --quiet`
  - `bash scripts/with_optional_sccache.sh cargo check --manifest-path Cargo.toml --workspace --quiet`
  - `bash scripts/with_optional_sccache.sh cargo test --manifest-path Cargo.toml --workspace --lib --quiet -- --test-threads=1`
  - `cd g5-admin && bun x tsc --noEmit`
  - `cd g5-admin && bun run test -- src/features/server-files/SiteSftpBrowserPage.test.tsx src/features/server-ssh/SiteSshSessionPage.test.tsx src/features/sites/SiteDashboardPage.test.tsx src/api/client/core/command-context.test.ts tests/e2e/smoke.test.ts`
  - `cd g5-admin && bun run audit:implementation`
  - `cd g5-admin && bun run audit:consumer`
  - `cd g5-admin && bun run audit:structure`
  - `cd g5-admin && bun run audit:docs`

### `T2-229` 사이트별 SFTP 파일 본문 미리보기 슬라이스 도입

- Why: read-only SFTP 브라우저만으로는 디렉터리 탐색과 stat까지만 가능해서, 실제 운영 점검에서 가장 자주 필요한 "파일 본문 열람"이 아직 비어 있었다. 그렇다고 업로드/다운로드/에디터까지 같이 열면 다시 `g5-admin-ssh`, `src-tauri`, 프런트가 한 번에 두꺼워질 위험이 있어, 이번에는 `read_file` 기반 미리보기만 따로 끊는 것이 맞았다.
- What:
  - `g5-admin-ssh`에는 `russh-sftp`의 `read(path)` 성격을 그대로 쓰되, 상한 바이트만 받는 `read_file`과 `SftpFileRead` 결과 타입만 추가했다.
  - `src-tauri`는 `SftpSessionPort::read_file`, `app_state/sftp_service.rs::read_file`, `cmd_sftp_read_file`까지만 추가하고, 기존 사이트별 SSH/SFTP 세션 재사용 구조는 유지했다.
  - 프런트는 `src/features/server-files/SiteSftpFilePreviewCard.tsx`와 `readFile` mutation을 붙여, 브라우저 화면 안에서 파일별 읽기 전용 본문 미리보기만 제공하도록 제한했다.
  - local command context, api target registry, smoke registry에도 `cmd_sftp_read_file`를 반영했다.
- Verification:
  - `cargo fmt --all`
  - `cargo test -p g5-admin-models export_ts_bindings --quiet`
  - `bash scripts/with_optional_sccache.sh cargo check --manifest-path Cargo.toml --workspace --quiet`
  - `bash scripts/with_optional_sccache.sh cargo test --manifest-path Cargo.toml --workspace --lib --quiet -- --test-threads=1`
  - `cd g5-admin && bun x tsc --noEmit`
  - `cd g5-admin && bun run test -- src/features/server-files/SiteSftpBrowserPage.test.tsx src/features/server-ssh/SiteSshSessionPage.test.tsx src/features/sites/SiteDashboardPage.test.tsx src/api/client/core/command-context.test.ts tests/e2e/smoke.test.ts`
  - `cd g5-admin && bun run audit:implementation`
  - `cd g5-admin && bun run audit:consumer`
  - `cd g5-admin && bun run audit:structure`
  - `cd g5-admin && bun run audit:docs`

### `T2-228` 사이트별 읽기 전용 SFTP 파일 브라우저 슬라이스 도입

- Why: SSH 세션, 단일 명령, interactive shell까지는 닫았지만 형님이 여러 번 지시하신 `SSH/SFTP 통합` 기준으로는 아직 반만 구현된 상태였다. 그렇다고 업로드/다운로드/에디터까지 한 번에 밀면 `g5-admin-ssh`, `app_state`, 프런트 작업면이 다시 큰 덩어리로 뭉칠 위험이 있어, 이번에는 `list_dir + stat + path navigation`만 가지는 read-only 브라우저로 끊는 편이 맞았다.
- What:
  - `g5-admin-ssh`를 `client/connection/shell/sftp/types/error` 모듈로 분리하고 `russh-sftp` 기반 `open_sftp`, `list_dir`, `stat` 런타임을 `src-tauri` 밖에서 소유하도록 정리했다.
  - `g5-admin-models`와 `src-tauri`에는 `SFTP` DTO, `SftpSessionPort`, `app_state/sftp_service.rs`, `commands/site/sftp.rs`를 추가하고, 기존 `ssh_session_service.rs`는 runtime만 공유한 채 `disconnect` 시 shell/SFTP cleanup만 담당하도록 제한했다.
  - 프런트는 `src/features/server-files/*`에 `/sites/:siteId/server/files` 읽기 전용 작업면을 추가하고, 서버 네비게이션·사이트 대시보드·SSH 화면에서 파일 브라우저로 이동할 수 있게 연결했다.
  - local command context, api target registry, route manifest, smoke registry에도 `cmd_sftp_list_dir`, `cmd_sftp_stat`를 반영했다.
- Verification:
  - `cargo fmt --all`
  - `cargo test -p g5-admin-models export_ts_bindings --quiet`
  - `bash scripts/with_optional_sccache.sh cargo check --manifest-path Cargo.toml --workspace --quiet`
  - `bash scripts/with_optional_sccache.sh cargo test --manifest-path Cargo.toml --workspace --lib --quiet -- --test-threads=1`
  - `cd g5-admin && bun x tsc --noEmit`
  - `cd g5-admin && bun run test -- src/features/server-files/SiteSftpBrowserPage.test.tsx src/features/server-ssh/SiteSshSessionPage.test.tsx src/features/sites/SiteDashboardPage.test.tsx src/api/client/core/command-context.test.ts tests/e2e/smoke.test.ts`
  - `cd g5-admin && bun run audit:implementation`
  - `cd g5-admin && bun run audit:consumer`
  - `cd g5-admin && bun run audit:structure`
  - `cd g5-admin && bun run audit:docs`

### `T2-227` 사이트별 SSH interactive shell 슬라이스 도입

- Why: `cmd_ssh_exec` 단일 명령만으로는 상태 확인은 되지만, 실제 운영에서는 같은 연결 위에서 짧은 대화형 점검을 이어서 수행할 수 있어야 했다. 그렇다고 SFTP와 터미널 스트리밍까지 한 번에 합치면 경계가 다시 끈적해지므로, 이번에는 사이트별 활성 SSH 세션 위에 interactive shell lifecycle만 얇게 얹는 것이 맞았다.
- What:
  - `g5-admin-ssh`의 `SshConnection`에 PTY 기반 `open_shell`, `SshShell`, 백그라운드 reader buffer를 추가해 `write/read/close` lifecycle을 `src-tauri` 밖에서 소유하도록 분리했다.
  - `src-tauri`는 `SshConnectionPort::open_shell`, `SshShellPort`, `app_state/ssh_session_service.rs::{open_shell,write_shell,read_shell,close_shell}`만 추가해 현재 사이트의 활성 SSH 세션에 묶인 shell runtime만 관리하도록 제한했다.
  - 프런트는 `src/features/server-ssh/SiteSshShellCard.tsx`와 `use-site-ssh-shell.ts`를 추가하고, 기존 `/sites/:siteId/server/ssh` 화면에 별도 카드로 연결해 연결 상태, 단일 명령 실행, interactive shell을 서로 분리된 surface로 유지했다.
  - local command registry와 command-context SSOT에도 `cmd_ssh_shell_open`, `cmd_ssh_shell_write`, `cmd_ssh_shell_read`, `cmd_ssh_shell_close`를 반영했다.
- Verification:
  - `cargo fmt --all`
  - `cargo test -p g5-admin-models export_ts_bindings --quiet`
  - `bash scripts/with_optional_sccache.sh cargo check --manifest-path Cargo.toml --workspace --quiet`
  - `bash scripts/with_optional_sccache.sh cargo test --manifest-path Cargo.toml --workspace --lib --quiet -- --test-threads=1`
  - `cd g5-admin && bun x tsc --noEmit`
  - `cd g5-admin && bun run test -- src/features/server-ssh/SiteSshSessionPage.test.tsx src/features/server-profiles/SiteSshProfilesPage.test.tsx src/features/sites/SiteDashboardPage.test.tsx src/api/client/core/command-context.test.ts`
  - `cd g5-admin && bun run audit:implementation`
  - `cd g5-admin && bun run audit:consumer`
  - `cd g5-admin && bun run audit:structure`
  - `cd g5-admin && bun run audit:docs`

### `T2-226` 사이트별 SSH 단일 명령 실행 슬라이스 도입

- Why: SSH 세션 연결만으로는 실제 운영 점검에 바로 쓰기 어려웠다. 그렇다고 interactive shell까지 한 번에 넣으면 터미널 스트림 상태와 프런트 surface가 급격히 커지므로, 먼저 연결된 세션 위에 `cmd_ssh_exec` 단일 명령 실행만 얇게 올리는 편이 맞았다.
- What:
  - `g5-admin-ssh`의 `SshConnection`에 session channel 기반 `exec`를 추가하고, stdout/stderr/exit status를 수집하는 `SshExecOutput`을 도입했다.
  - `src-tauri`는 `SshConnectionPort::exec`와 `app_state/ssh_session_service.rs::exec`만 추가해 현재 사이트의 활성 SSH 세션에서만 단일 명령을 실행하도록 제한했다.
  - 프런트 `src/features/server-ssh/SiteSshSessionPage.tsx`에는 연결된 세션 위에서 명령 입력, 실행, stdout/stderr 확인 surface만 붙였고, interactive shell/SFTP는 그대로 다음 슬라이스로 남겼다.
- Verification:
  - `cargo fmt --all`
  - `cargo test -p g5-admin-models export_ts_bindings --quiet`
  - `bash scripts/with_optional_sccache.sh cargo check --manifest-path Cargo.toml --workspace --quiet`
  - `bash scripts/with_optional_sccache.sh cargo test --manifest-path Cargo.toml --workspace --lib --quiet -- --test-threads=1`
  - `cd g5-admin && bun x tsc --noEmit`
  - `cd g5-admin && bun run test -- src/features/server-ssh/SiteSshSessionPage.test.tsx src/features/server-profiles/SiteSshProfilesPage.test.tsx src/features/sites/SiteDashboardPage.test.tsx src/api/client/core/command-context.test.ts`
  - `cd g5-admin && bun run audit:implementation`
  - `cd g5-admin && bun run audit:consumer`
  - `cd g5-admin && bun run audit:structure`
  - `cd g5-admin && bun run audit:docs`

### `T2-225` 사이트별 SSH 세션 연결 슬라이스 도입

- Why: 형님이 여러 번 지시하신 SSH/SFTP 통합을 계속 문서 상태로만 둘 수는 없었지만, 셸/SFTP까지 한 번에 밀면 `src-tauri`에 다시 큰 인프라 덩어리가 생길 위험이 있었다. 그래서 이번에는 SSH 프로필 CRUD 위에 사이트별 연결/해제와 세션 상태만 얇게 얹는 슬라이스로 끊었다.
- What:
  - 새 workspace crate `g5-admin-ssh`를 추가해 `russh` 연결과 `known_hosts` 검증을 `src-tauri` 밖으로 분리하고, `src-tauri`는 `SshSessionConnectorPort`와 runtime state orchestration만 소유하도록 맞췄다.
  - `g5-admin-models`에 `SshConnectInput`, `SshDisconnectInput`, `SshSessionStatusResponse`를 추가하고, `commands/site/ssh_session.rs`에 `cmd_ssh_status`, `cmd_ssh_connect`, `cmd_ssh_disconnect`를 도입했다.
  - 프런트는 `src/features/server-ssh/*`에 사이트별 SSH 연결 화면을 추가하고, `/sites/:siteId/server/ssh` 라우트에서 연결 상태, 프로필 선택, host key fingerprint를 확인할 수 있게 했다.
  - 현재 범위는 connect/disconnect/status까지만이며, shell exec, interactive terminal, SFTP는 의도적으로 다음 슬라이스로 남겼다.
- Verification:
  - `cargo fmt --all`
  - `cargo test -p g5-admin-models export_ts_bindings --quiet`
  - `bash scripts/with_optional_sccache.sh cargo check --manifest-path Cargo.toml --workspace --quiet`
  - `bash scripts/with_optional_sccache.sh cargo test --manifest-path Cargo.toml --workspace --lib --quiet -- --test-threads=1`
  - `cd g5-admin && bun x tsc --noEmit`
  - `cd g5-admin && bun run test -- src/features/server-ssh/SiteSshSessionPage.test.tsx src/features/server-profiles/SiteSshProfilesPage.test.tsx src/features/sites/SiteDashboardPage.test.tsx src/api/client/core/command-context.test.ts`
  - `cd g5-admin && bun run audit:implementation`
  - `cd g5-admin && bun run audit:consumer`
  - `cd g5-admin && bun run audit:structure`

### `T2-224` 사이트별 SSH 프로필 CRUD 슬라이스 도입

- Why: 멀티사이트 SDD에는 오래전부터 SSH/SFTP 통합이 P1로 정의돼 있었지만, 실제 코드에는 `ssh_profiles` 저장소, `cmd_ssh_profile_*` IPC, 사이트별 관리 화면이 전혀 없었다. 형님이 여러 번 지시하신 범위를 계속 문서 상태로만 두는 건 맞지 않았고, 그렇다고 `russh`/SFTP 런타임까지 한 번에 밀어 넣으면 `src-tauri`에 다시 큰 인프라 덩어리를 만들 위험이 있었다.
- What:
  - `g5-admin-models`에 SSH 프로필 DTO를 추가하고, `src-tauri`에는 `SshProfileStorePort -> SiteRepository adapter -> db/ssh_profiles.rs -> app_state/ssh_profile_service.rs -> commands/site/ssh_profiles.rs` 순으로 얇은 저장/명령 경계만 도입했다.
  - SSH 비밀번호와 키 passphrase는 기존 OS keyring 경로를 재사용하고, 사이트 삭제 시 연결된 SSH 프로필/시크릿도 함께 정리되도록 맞췄다.
  - 백업/복원은 SSH 프로필 메타데이터까지 운반하도록 확장하되, keyring secret은 portable payload에 싣지 않아 보안 경계를 유지했다.
  - 프런트는 `src/features/server-profiles/*`에 사이트별 SSH 프로필 관리 화면과 hook/dialog만 추가하고, 라우트는 `/sites/:siteId/server/profiles` 아래 독립 surface로 붙였다.
  - 이번 슬라이스에서는 의도적으로 SSH 접속/셸/SFTP 런타임(`russh`, `russh-sftp`)은 도입하지 않고 CRUD ownership만 먼저 닫았다.
- Verification:
  - `cargo fmt --all`
  - `bash scripts/with_optional_sccache.sh cargo check --manifest-path Cargo.toml --workspace --quiet`
  - `bash scripts/with_optional_sccache.sh cargo test --manifest-path Cargo.toml --workspace --lib --quiet -- --test-threads=1`
  - `cd g5-admin && bun x tsc --noEmit`
  - `cd g5-admin && bun run test -- src/features/server-profiles/SiteSshProfilesPage.test.tsx src/features/sites/SiteDashboardPage.test.tsx`
  - `cd g5-admin && bun run audit:consumer`
  - `cd g5-admin && bun run audit:structure`

## 2026-03-25

### `T2-223` Vite 공용 vendor chunk 분할

- Why: 구현 감사는 통과했지만 production build에서 `vendor` chunk 하나가 `500 kB`를 넘겨 Vite chunk size warning이 계속 남아 있었다. 현재 설정은 `@tanstack`만 별도 분리하고 나머지 `node_modules`를 전부 `vendor` 한 덩어리로 묶는 구조였다.
- What:
  - `g5-admin/vite.config.ts`에 `resolveVendorChunk()`를 추가해 `react/router`, `tauri`, `form`, `icons/media`, `ui` 공용 의존성을 별도 shared chunk로 분리했다.
  - 기존 feature chunk 정책은 유지하고, build-time 경고를 만들던 과대 `vendor`만 잘게 나누도록 조정했다.
- Verification:
  - `bun run build:web:fast`

### `T2-222` React Fast Refresh 경고 8건 제거

- Why: 구조 경고를 모두 정리한 뒤에도 `eslint`에는 `react-refresh/only-export-components` 경고 8건이 남아 있었다. 원인은 컴포넌트 파일에서 UI helper나 formatter를 함께 export하고 있는 패턴이었다.
- What:
  - `g5-admin/src/components/ui/tabs.tsx`에서 외부 사용이 없는 `tabsListVariants` export를 제거했다.
  - `g5-admin/src/features/config/admin-config-choice-utils.ts`를 추가해 `buildSelectOptions`, `isChoiceField`, `resolveInputTypeForTextControl`를 컴포넌트 파일 밖으로 분리했다.
  - `g5-admin/src/features/overview/overview-formatters.ts`를 추가해 overview formatter를 presentation 컴포넌트 파일과 분리하고, 관련 import를 정리했다.
- Verification:
  - `bun x tsc --noEmit`
  - `bun run lint`

### `T2-221` config 저장 스모크 registry 정합성 복구

- Why: `config` page save/validation smoke는 이미 `AdminConfigPage.validation.test.tsx`에 존재했지만, `FORM_SAVE_SMOKE_COVERAGE` registry가 `AdminConfigPage.test.tsx` 한 파일만 page evidence로 읽고 있어 구조 감사가 `unsupported_only`로 잘못 판정하고 있었다.
- What:
  - `specs/domains/FORM_SAVE_SMOKE_COVERAGE.toml`의 `config` entry가 `g5-admin/src/features/config/AdminConfigPage.validation.test.tsx`도 page smoke 근거로 읽도록 보정했다.
  - 그 결과 `diff-only save`, validation guard, 기존 `resource.not_found` 404 evidence가 한 feature registry 아래서 함께 집계되도록 맞췄다.
- Verification:
  - `python3 scripts/check_form_save_smoke_coverage.py`
  - `bun run audit:structure`

### `T2-220` error 루트 모듈 경량화 및 구조 경고 0건 달성

- Why: `core::ports`까지 정리한 뒤에도 마지막 구조 경고는 `g5-admin/src-tauri/src/error/mod.rs`의 root-orchestrator growth 하나였다. 실제 원인은 에러 분류 로직보다 inline test와 `ApiClientError` 변환 impl이 루트 파일에 같이 눌러앉아 line budget을 넘긴 것이었다.
- What:
  - `g5-admin/src-tauri/src/error/tests.rs`로 inline error payload 테스트를 옮기고, `g5-admin/src-tauri/src/error/api_client.rs`로 `ApiClientError -> AppError` 변환 impl을 분리했다.
  - `g5-admin/src-tauri/src/error/mod.rs`는 `184 LOC`까지 내려가 enum/into_payload/status_code 중심 루트만 남도록 정리했다.
  - 구조 경고가 사라졌으므로 `specs/audits/WARNING_BUDGETS.toml`에서 마지막 active budget `WB-2026-001`을 제거했다.
- Verification:
  - `cargo fmt --all`
  - `bash scripts/with_optional_sccache.sh cargo check --manifest-path Cargo.toml --workspace --quiet`
  - `bash scripts/with_optional_sccache.sh cargo test --manifest-path Cargo.toml --workspace --lib --quiet -- --test-threads=1`
  - `bun run audit:structure`

### `T2-219` core::ports 계약/adapter 분리 및 DB 타입 누수 제거

- Why: `app_state` 서비스 분해를 끝낸 뒤 남은 구조 경고의 대부분은 `core/ports.rs`가 trait 계약, concrete adapter impl, 그리고 `db` 입력/결과 타입까지 한 파일에 같이 품고 있는 점에서 나왔다. 이 상태로는 core split boundary가 trait-only contract라는 원칙과도 맞지 않았다.
- What:
  - `g5-admin/src-tauri/src/core/port_adapters.rs`를 추가해 `TransportClient`, `TokenStore`, `SiteRepository`의 concrete adapter impl을 `core::ports` 밖으로 옮겼다.
  - `g5-admin/src-tauri/src/core/ports.rs`에는 trait 계약과 core-local DTO(`SiteCatalogInsertInput`, `SiteCatalogUpdateInput`, `AppLockState`, `BackupImportReport`)만 남기고, `db::SiteInsert/SiteUpdateRecord/AppLockRecord/BackupImportSummary` 의존을 제거했다.
  - `g5-admin/src-tauri/src/app_state/mod.rs`, `app_state/site_catalog_service.rs`, `app_state/security_settings_service.rs`, `app_state/security/backup.rs`가 새 core DTO를 쓰도록 맞췄다.
  - 구조 경고가 사라졌으므로 `specs/audits/WARNING_BUDGETS.toml`에서 `WB-2026-004`, `WB-2026-010`을 제거했다.
- Verification:
  - `cargo fmt --all`
  - `bash scripts/with_optional_sccache.sh cargo check --manifest-path Cargo.toml --workspace --quiet`
  - `bash scripts/with_optional_sccache.sh cargo test --manifest-path Cargo.toml --workspace --lib --quiet -- --test-threads=1`
  - `bun run audit:structure`

### `T2-218` MasterLockService wrapper 제거 및 unlock runtime seam 분리

- Why: `security_settings_service`를 정리한 뒤 마지막 `app_state` split 후보는 `app_state/master_lock_service.rs`였다. 이 서비스는 unlock flag, pending TOTP flag, site runtime, TOTP helper, lockout 시간/메시지 helper를 `&AppState` 하나로 끌고 있어 구조 감사의 마지막 extract 단계와 warning budget 2개를 계속 막고 있었다.
- What:
  - `g5-admin/src-tauri/src/app_state/master_lock_service.rs`에 `MasterLockRuntime`, `MasterLockTotpGuard`, `MasterLockSiteSync`를 도입해 unlock phase state, TOTP 검증, site runtime 동기화를 explicit collaborator로 분리했다.
  - `MasterLockService`는 이제 `SecurityStorePort`, `SiteCatalogStorePort`, runtime collaborator만 직접 받고, lockout 시간/메시지 helper도 서비스 내부 local helper로 독립시켰다.
  - `g5-admin/src-tauri/src/app_state/master_lock/{mod,status,unlock,totp}.rs`와 `g5-admin/src-tauri/src/app_state/mod.rs`를 새 builder 구조로 맞췄고, 고아 helper였던 `ensure_sites_loaded`, `apply_active_site`, `format_unlock_retry_after_message`, `current_epoch_seconds`도 루트에서 제거했다.
  - 구조 경고가 사라졌으므로 `specs/audits/WARNING_BUDGETS.toml`에서 `WB-2026-005`, `WB-2026-013`를 제거했다.
- Verification:
  - `cargo fmt --all`
  - `bash scripts/with_optional_sccache.sh cargo check --manifest-path Cargo.toml --workspace --quiet`
  - `bash scripts/with_optional_sccache.sh cargo test --manifest-path Cargo.toml --workspace --lib --quiet -- --test-threads=1`
  - `bun run audit:structure`

### `T2-217` SecuritySettingsService wrapper 제거 및 backup/TOTP seam 분리

- Why: `site_catalog_service`를 정리한 뒤 다음 core split 후보는 `app_state/security_settings_service.rs`였다. 이 서비스는 `&AppState` wrapper, unlock gate, TOTP 검증, backup restore 뒤 site runtime 재동기화, pending-TOTP runtime flag를 한 파일에서 직접 잡고 있어서 `third-extract` blocker 6개와 구조 warning budget 3개를 동시에 만들고 있었다.
- What:
  - `g5-admin/src-tauri/src/app_state/security_settings_service.rs`에 `SecurityUnlockGate`, `SecurityTotpGuard`, `SecurityRestoreSiteSync`, `SecuritySettingsRuntime`를 도입해 unlock/TOTP/restore runtime seam을 explicit collaborator로 분리했다.
  - `SecuritySettingsService`는 이제 `SecurityStorePort`, `SiteCatalogStorePort`, `BackupStorePort`, runtime collaborator만 직접 받아 동작하고, `import_backup` 후처리와 pending TOTP flag 정리도 collaborator 경계로 넘겼다.
  - `g5-admin/src-tauri/src/app_state/security/mod.rs`가 새 builder와 adapter impl을 소유하도록 옮기고, `g5-admin/src-tauri/src/app_state/mod.rs`, `g5-admin/src-tauri/src/app_state/security/{settings,backup,fast_unlock,totp}.rs` 호출부를 builder 기준으로 정리했다.
  - 구조 경고가 사라졌으므로 `specs/audits/WARNING_BUDGETS.toml`에서 `WB-2026-006`, `WB-2026-008`, `WB-2026-012`를 제거했다.
- Verification:
  - `cargo fmt --all`
  - `bash scripts/with_optional_sccache.sh cargo check --manifest-path Cargo.toml --workspace --quiet`
  - `bash scripts/with_optional_sccache.sh cargo test --manifest-path Cargo.toml --workspace --lib --quiet -- --test-threads=1`
  - `bun run audit:structure`

### `T2-216` SiteCatalogService runtime seam 명시화

- Why: `session_service`를 분리한 뒤 다음 병목은 `app_state/site_catalog_service.rs`였다. 이 서비스는 `AppState` wrapper, site manager runtime, 초기화 플래그, unlock gate, 민감작업 검증, active-site 적용을 한 파일에서 모두 끌고 있어 core split readiness의 두 번째 후보를 계속 막고 있었다.
- What:
  - `g5-admin/src-tauri/src/app_state/site_catalog_service.rs`에 `SiteCatalogAccessGate`, `SiteCatalogRuntime`를 도입해 unlock/민감작업 gate와 runtime state를 명시적 collaborator로 분리했다.
  - `SiteCatalogService`는 이제 `AdminApiPort`, `SessionStorePort`, `SiteCatalogStorePort`, runtime collaborator를 직접 받아 `AppState` field 없이 동작한다.
  - `g5-admin/src-tauri/src/app_state/mod.rs`, `g5-admin/src-tauri/src/app_state/sites.rs` 호출부를 새 builder 구조로 맞췄고, 구조 경고가 사라진 `WB-2026-007`, `WB-2026-009`, `WB-2026-011` budget을 제거했다.
- Verification:
  - `cargo fmt --all`
  - `bash scripts/with_optional_sccache.sh cargo check --manifest-path Cargo.toml --workspace --quiet`
  - `bash scripts/with_optional_sccache.sh cargo test --manifest-path Cargo.toml --workspace --lib --quiet -- --test-threads=1`
  - `bun run audit:structure`

### `T2-215` SessionService `AppState` wrapper 의존 제거

- Why: `T2-214` 뒤 구조 감사의 첫 추출 후보는 `app_state/session_service.rs`였고, 실제로 이 서비스는 `&AppState` 전체가 아니라 세션 저장소와 사이트 세션 힌트 쓰기만 필요했다. 작은 seam인데도 wrapper 전체를 들고 있으면 core split readiness가 불필요하게 막히고, 다음 분리 후보 선정 신호도 흐려졌다.
- What:
  - `g5-admin/src-tauri/src/app_state/session_service.rs`를 `SessionStorePort`와 `SiteCatalogStorePort` 직접 주입 구조로 바꿔 `state` field와 `new(&AppState)` 생성자를 제거했다.
  - `g5-admin/src-tauri/src/app_state/mod.rs`의 `session_service()`는 explicit collaborator 두 개를 넘기도록 갱신했다.
  - 구조 경고가 사라졌으므로 `specs/audits/WARNING_BUDGETS.toml`에서 `WB-2026-014`를 제거했다.
- Verification:
  - `cargo fmt --all`
  - `bash scripts/with_optional_sccache.sh cargo check --manifest-path Cargo.toml --workspace --quiet`
  - `bash scripts/with_optional_sccache.sh cargo test --manifest-path Cargo.toml --workspace --lib --quiet -- --test-threads=1`
  - `bun run audit:structure`

### `T2-214` structure audit owner 정합성 복구

- Why: `T2-213` 뒤 구조 감사는 transport 분리 자체가 아니라, grouped `api-target` registry를 ownership watch가 예전 단일 파일 구조로만 읽는 점, `navigation` endpoint owner가 실제 코드와 감사 규칙 사이에서 어긋난 점, `registry_groups.rs`가 정식 registry 보조 파일인데도 legacy quarantine 예외에 포함되지 않은 점 때문에 막혔다.
- What:
  - `scripts/ownership_watch.py`가 `api-target-registry-groups/*.ts`까지 읽어 command/path 정렬을 계산하도록 보정했다.
  - `g5-admin/src/features/layout/navigation-manifest.ts`로 메뉴별 `apiTargets` source-of-truth를 끌어올리고, 각 `navigation-groups/*.ts`는 route/label/legacy metadata만 남기도록 정리했다.
  - `scripts/check_active_crate_boundaries.py`의 legacy quarantine 예외에 `commands/registry_groups.rs`를 추가해 정식 registry 보조 매크로 파일을 허용했다.
  - stale 경고 예산 `WB-2026-002`, `WB-2026-003`를 제거해 구조 감사 출력이 현재 상태와 일치하도록 맞췄다.
- Verification:
  - `bun x tsc --noEmit`
  - `bun run lint`
  - `bun run audit:structure`

### `T2-212` 인증 및 프로필 endpoint transport 소유권 이전

- Why: `T2-211`로 transport core를 분리했지만, `src-tauri` 안에는 여전히 인증 토큰 발급/갱신/로그아웃과 `/members/me` 조회 같은 가장 기본 endpoint 구현이 남아 있었다. 이 표면은 앱 상태나 Tauri 런타임보다 `reqwest + DTO`에 더 가깝기 때문에, 여기까지 transport crate로 넘겨야 desktop crate가 갖는 API 구현 결합을 실제로 더 줄일 수 있었다.
- What:
  - `g5-admin-transport/src/auth.rs`, `g5-admin-transport/src/member_profile.rs`를 추가해 `login`, `refresh`, `logout`, `get_my_profile`를 `TransportClient` 소유로 옮겼다.
  - `g5-admin/src-tauri/src/api_client/auth.rs`, `g5-admin/src-tauri/src/api_client/member/profile.rs`는 새 transport 메서드를 호출하는 얇은 위임층만 남기도록 정리했다.
  - 결과적으로 초기 인증 동선에서 가장 자주 쓰는 endpoint 구현은 이제 `src-tauri`가 아니라 transport crate에서 컴파일된다.
- Verification:
  - `cargo fmt --all`
  - `cargo check --workspace --quiet`
  - `bash scripts/with_optional_sccache.sh cargo build --manifest-path g5-admin/src-tauri/Cargo.toml --profile desktop-fast --features tauri/custom-protocol --quiet`
  - `bun run audit:implementation`

### `T2-213` auth/session 포트를 `TransportClient` 경계에 직접 고정

- Why: `T2-212` 이후에도 `core/ports.rs`와 `AppState::admin_api()`는 여전히 전체 `ApiClient` wrapper 타입에 붙어 있어서, auth/session/site activation 계층이 넓은 endpoint wrapper를 간접 의존하고 있었다. 또 감사 러너에서는 `token_store`의 env/file 기반 테스트가 간헐적으로 흔들려 구조 감사가 비결정적으로 실패했다.
- What:
  - `core/ports.rs`의 `AdminApiPort` 구현을 `ApiClient`에서 `TransportClient`로 옮기고, `AppState::admin_api()`는 `api_client.transport()`를 반환하도록 바꿨다.
  - `src-tauri`의 중복 auth/profile wrapper 파일 `api_client/auth.rs`, `api_client/member/profile.rs`를 제거해 좁은 auth/profile 포트와 넓은 endpoint wrapper를 코드 레벨에서도 분리했다.
  - `app_state/tests/master_lock.rs`는 현재 base URL 확인을 `state.admin_api()` 기준으로 보게 정리했다.
  - `scripts/run_standard_audit.sh`의 Rust workspace unit 단계에는 `--test-threads=1`을 추가해 env/file 상태를 공유하는 `token_store` 테스트가 감사 러너에서 흔들리지 않게 고정했다.
- Verification:
  - `cargo fmt --all`
  - `cargo check --workspace --quiet`
  - `bash scripts/with_optional_sccache.sh cargo test --manifest-path Cargo.toml --workspace --lib --quiet -- --test-threads=1`
  - `bun run audit:structure`

### `T2-211` Tauri API transport core crate 분리

- Why: `g5-admin/src-tauri`의 `api_client`는 endpoint 표면뿐 아니라 `reqwest` client bootstrap, 문제 응답 파싱, 재시도 정책, multipart/header 처리까지 한 크레이트에 붙어 있었다. 이 구조는 앱 상태나 명령 레지스트리를 건드리지 않아도 transport 코어가 항상 `g5-admin-desktop`과 같이 다시 컴파일되는 방향으로 결합을 키웠고, 형님이 지적하신 “끈적한 의존성”을 줄일 첫 절단면이 필요했다.
- What:
  - 새 workspace crate `g5-admin-transport`를 추가해 `reqwest` bootstrap, base URL 상태, API problem parsing, retry/backoff, multipart/header I/O를 transport 전용 경계로 옮겼다.
  - `g5-admin/src-tauri/src/api_client/mod.rs`는 endpoint 메서드 표면만 유지하고, 내부 helper는 새 `TransportClient`에 위임하도록 바꿨다.
  - `g5-admin/src-tauri/src/error/mod.rs`에는 `ApiClientError -> AppError` 변환만 남겨, 명령 계층과 payload 분류 규칙은 기존 앱 에러 체계를 유지하게 했다.
  - 기존 `src-tauri` 내부의 `api_client/problem.rs`, `request_headers.rs`, `request_io.rs`는 제거해 transport 핵심 로직의 컴파일 ownership을 새 crate로 명시했다.
- Verification:
  - `cargo fmt --all`
  - `cargo check --workspace --quiet`
  - `bash scripts/with_optional_sccache.sh cargo build --manifest-path g5-admin/src-tauri/Cargo.toml --profile desktop-fast --features tauri/custom-protocol --quiet`

## 2026-03-07

## 2026-03-08

## 2026-03-09

## 2026-03-10

## 2026-03-11

## 2026-03-13

## 2026-03-14

## 2026-03-19

### `T2-210` 탭 회귀 동선과 TDD 게이트 보강

- Why: 형님이 실제로 밟으신 `사이트 작업면 -> 앱설정/사이트관리 -> 사이트 탭 복귀` 동선은 기존 `AppShellHeader.test.tsx`에서 한 경로만 부분적으로 고정돼 있었고, `AppShellWorkspaceTabs.tsx`와 `AppShell.tsx`는 critical coverage gate include에도 빠져 있었다. 여기에 Rust secure-storage 회귀는 구현 감사가 `cargo check`만 돌고 Rust lib/unit test를 기본 게이트로 강제하지 않아, keychain/session 회귀가 감사 기본 루프를 통과할 수 있는 상태였다.
- What:
  - `g5-admin/src/features/layout/AppShellHeader.test.tsx`에 `overview -> 앱설정 -> 사이트 탭`, `overview -> 사이트관리 -> 사이트 탭`, 전역 `/app/sites -> 사이트 탭`, 고정 작업면에서 다른 사이트 탭 활성화까지 실제 사용자 동선 회귀 테스트를 추가했다.
  - `g5-admin/vitest.critical.config.ts`는 `AppShell.tsx`, `AppShellWorkspaceTabs.tsx`를 critical coverage include에 편입해 layout regression gate와 실제 회귀 표면을 다시 맞췄다.
  - `scripts/run_standard_audit.sh`는 `cargo test --manifest-path Cargo.toml --workspace --lib --quiet`를 구현 감사 기본 단계로 추가했고, `specs/AUDIT_SYSTEM.md`도 구현 감사 산출물에 `critical frontend coverage gate`와 `Rust workspace unit/lib 테스트`를 명시하도록 갱신했다.
- Verification:
  - `cd g5-admin && bun run test -- src/features/layout/AppShellHeader.test.tsx`
  - `cd g5-admin && bun run test:coverage:critical`
  - `cargo test --manifest-path Cargo.toml --workspace --lib --quiet`
  - `cd g5-admin && bun run audit:implementation`

## 2026-03-15

### `T2-209` 통합 감사 active consumer scope registry 도입

- Why: 도메인 경계 강제 규율을 넣은 뒤 deep audit을 다시 돌리자, Rust 활성 소비 범위 밖의 PHP `shop-catalog` surface가 `php_openapi_paths_missing_in_rust`, `php_schema_domains_missing_in_rust`, `php_operations_missing_in_rust` failure/warning으로 다시 잡혔다. 이건 실제 미구현이라기보다 provider-only backlog인데, registry 없는 예외 상수로만 누르면 통합 감사와 계약 체크가 다시 드리프트할 위험이 컸다.
- What:
  - `specs/integration/ACTIVE_CONSUMER_SCOPE.json`를 추가해 Rust 활성 소비 범위 밖의 provider-only allowance(`shop-catalog`)를 machine-readable registry로 고정했다.
  - `scripts/run_integrated_audit.py`는 위 registry를 읽어 provider-only path/schema domain/operation gap을 parity failure/warning에서 제외하고, 대신 note/evidence 및 `Active Consumer Scope Handoff` section으로 보고하도록 정리했다.
  - `scripts/check_openapi_contract.mjs`도 같은 registry를 읽게 바꿔 snapshot/codegen sync 단계와 integrated audit 단계가 같은 활성 소비 범위 기준을 사용하도록 맞췄다.
  - `specs/integration/INTEGRATED_AUDIT_STANDARD.md`, `specs/AUDIT_SYSTEM.md`, `specs/AUDIT_STRATEGY.md`, `specs/README.md`, `specs/TODO.md`를 새 registry 기준에 맞게 갱신했다.
- Verification:
  - `bash scripts/run_deep_audit.sh`
  - `python3 scripts/run_integrated_audit.py --rust-root /Users/neojins/workspace/gnuboard5/rust --php-root /Users/neojins/workspace/gnuboard5/php`
  - `python3 scripts/doc-index.py`
  - `bash scripts/check-doc-governance.sh`

### `T2-208` 도메인 경계 강제 규율 1차 도입

- Why: 기존 Rust 구조 감사는 ownership, registry drift, core split readiness는 잘 잡았지만, 형님이 요구하신 수준의 “도메인 feature 직접 import 금지”, “support namespace의 business drift 금지”, “service의 `&AppState` wrapper coupling 감시”는 원칙 문구만 부분적으로 있고 machine-readable 규칙과 처리 수단은 없었다. 이 상태에서는 bounded context 철학은 있어도 위반을 지속적으로 강제하기 어렵고, 다음 구현에서 다시 shared/common 하수구화나 cross-feature 직접 결합이 재유입될 여지가 있었다.
- What:
  - `specs/audits/DOMAIN_BOUNDARY_RULES.toml`를 추가해 monitored frontend feature(`mails`, `sms-contacts`, `points`, `security`, `sites`), support root(`features/shared`, `components`, `lib`, `api`), `app_state/*service.rs` wrapper service를 machine-readable registry로 고정했다.
  - `scripts/domain_boundary_watch.py`를 추가해 위 registry를 읽고 `frontend_domain_direct_import`, `support_namespace_business_dependency`, `app_state_service_wrapper_coupling` finding을 생성하도록 만들었다.
  - `scripts/check_active_crate_boundaries.py`, `scripts/collect_architecture_metrics.py`는 새 helper를 소비해 구조 감사와 메트릭에 도메인 경계 강제 결과를 같이 싣도록 확장했다.
  - `.agent/Constitution.md`, `specs/AUDIT_SYSTEM.md`, `.agent/workflows/architecture-audit.md`, `specs/foundation/DOMAIN_BOUNDARY_ENFORCEMENT.md`, `specs/README.md`, `specs/foundation/README.md`, `specs/TODO.md`를 현재 규칙과 처리 수단에 맞게 동기화했다.
  - `specs/audits/WARNING_BUDGETS.toml`에는 `app_state_service_wrapper_coupling` 4건(`site_catalog_service`, `security_settings_service`, `master_lock_service`, `session_service`)을 새 active warning budget으로 등록했다.
- Verification:
  - `python3 scripts/check_active_crate_boundaries.py`
  - `python3 scripts/collect_architecture_metrics.py`
  - `bash scripts/run_deep_audit.sh`
  - `python3 scripts/doc-index.py`
  - `bash scripts/check-doc-governance.sh`

### 문서 검색 인덱스 기준선 재동기화

- Why: 최근 `schema_live` 승격과 overview/dashboard 반영 이후 문서 감사는 녹색이었지만 `specs/docs.db`가 저장소 기준선과 어긋나 있었다. Rust 쪽은 문서 검색 인덱스도 운영 산출물로 추적하므로, 구현 변경 없이도 현재 active spec 집합을 다시 인덱싱해 저장소 상태를 깨끗하게 유지하는 것이 맞았다.
- What:
  - `bash scripts/run_document_audit.sh`를 재실행해 `specs/docs.db`를 현재 active 문서 집합 기준으로 다시 생성했다.
- Verification:
  - `bash scripts/run_document_audit.sh`

### `T2-100` Rust consumer rollout 완료

- Why: PHP provider backlog 5개(`mails`, `points`, `sms-contacts`, `sms-messages`, `sms-templates`)가 모두 해소된 뒤에도 Rust 쪽 `FORM_METADATA_COVERAGE.toml`은 이 작업면들을 `schema_planned`로 남겨 두고 있었다. 실제 UI는 `/admin/schema`를 이미 소비하는데 registry와 감사 문서가 이를 따라가지 못하면 deep audit은 통과해도 TODO/coverage/history가 stale 상태로 남는다.
- What:
  - `g5-admin/src/features/mails/*`, `points/*`, `sms-contacts/*`, `sms-messages/AdminSmsMessagesPage.tsx`, `sms-templates/*`에 `useAdminFieldSchema`와 schema gate를 실제 작업면에 연결하고, label/description/options/default 소비를 폼 입력까지 닫았다.
  - 각 도메인 page test(`AdminMailsPage.test.tsx`, `AdminPointsPage.test.tsx`, `AdminSmsContactsPage.test.tsx`, `AdminSmsMessagesPage.test.tsx`, `AdminSmsTemplatesPage.test.tsx`)는 schema query 호출, 실제 schema label 사용, 대표 동작 회귀를 현재 wiring 기준으로 고정했다.
  - `specs/domains/FORM_METADATA_COVERAGE.toml`에서 위 5개 feature를 `schema_planned -> schema_live`로 승격했고, `specs/foundation/FORM_METADATA_ROLLOUT_PLAN.md`, `specs/audits/2026-03-13-FORM_METADATA_COVERAGE_AUDIT.md`, `specs/audits/2026-03-13-FORM_METADATA_PROVIDER_BLOCKERS.md`, `specs/TODO.md`를 최종 baseline(`schema_live=16`, `schema_planned=0`, `schema_full=12`, `schema_labels=4`, `local_canonical=1`, `warnings=0`)에 맞춰 갱신했다.
- Verification:
  - `cd g5-admin && bun x vitest run src/features/mails/AdminMailsPage.test.tsx src/features/points/AdminPointsPage.test.tsx src/features/sms-contacts/AdminSmsContactsPage.test.tsx src/features/sms-messages/AdminSmsMessagesPage.test.tsx src/features/sms-templates/AdminSmsTemplatesPage.test.tsx`
  - `cd g5-admin && bun x tsc --noEmit`
  - `cd g5-admin && bun run lint`
  - `python3 scripts/check_form_metadata_coverage.py`
  - `bash scripts/run_deep_audit.sh`
  - `python3 scripts/run_integrated_audit.py --rust-root /Users/neojins/workspace/gnuboard5/rust --php-root /Users/neojins/workspace/gnuboard5/php`
  - `python3 scripts/doc-index.py`
  - `bash scripts/check-doc-governance.sh`

### `T2-100` provider blocker 해소와 consumer backlog 재분류

- Why: PHP `/admin/schema` provider rollout 2차로 `sms-contacts`, `sms-messages`, `sms-templates`, `mails`, `points` domain이 모두 추가됐는데, Rust 쪽 registry와 통합 감사는 여전히 이 5개를 `php_schema_missing` blocker로 보고 있었다. 이 상태를 그대로 두면 integrated audit이 stale failure를 계속 내고, 실제 책임이 provider에서 consumer rollout로 넘어간 시점을 TODO/문서/감사가 따라가지 못한다.
- What:
  - `g5-admin/src/features/schema/useAdminFieldSchema.ts`에 새 domain 5개를 추가해 통합 감사의 schema domain 집합을 provider catalog와 다시 맞췄다.
  - `specs/domains/FORM_METADATA_COVERAGE.toml`에서 `mails`, `points`, `sms-contacts`, `sms-messages`, `sms-templates`의 `provider_blocker`를 제거하고 `schema_domains`를 연결해, 이제 이 5개가 provider blocker가 아니라 consumer rollout backlog임을 명시했다.
  - `specs/audits/BLOCKERS.toml`에서 `T2-100` blocker entry를 제거하고, `specs/TODO.md`도 `Blocked -> Next`로 재분류했다.
  - `specs/foundation/FORM_METADATA_ROLLOUT_PLAN.md`, `specs/audits/2026-03-13-FORM_METADATA_COVERAGE_AUDIT.md`, `specs/audits/2026-03-13-FORM_METADATA_PROVIDER_BLOCKERS.md`, `specs/integration/INTEGRATED_AUDIT_STANDARD.md`를 현재 기준선(`provider_schema_domains=17`, `provider_blocked_features=0`)에 맞게 갱신했다.
  - `scripts/run_integrated_audit.py`는 `FIXME_` schema label을 더 이상 failure로 보지 않고 추적 warning으로 분류해, “제목을 창작하지 말고 `FIXME_필드명`으로 남긴다”는 extractor 정책과 통합 감사 판정 기준을 일치시켰다.
- Verification:
  - `python3 scripts/check_form_metadata_coverage.py`
  - `python3 scripts/generate_form_metadata_blocker_report.py`
  - `python3 scripts/check_blocker_registry.py`
  - `bash scripts/run_deep_audit.sh`
  - `python3 scripts/run_integrated_audit.py --rust-root . --php-root ../php`

### `T2-100` `system`·`theme` 메타데이터 소비를 `/admin/schema`로 승격

- Why: PHP provider가 `system`, `theme` domain을 추가한 뒤에도 Rust는 여전히 local metadata만 써서 integrated audit에 `php_schema_domains_missing_in_rust=system, theme` failure가 남아 있었다. 이 상태를 그대로 두면 공급자는 준비됐는데 소비자 감사와 blocker handoff가 stale한 채로 남아 책임 소재가 다시 흐려진다.
- What:
  - `g5-admin/src/features/schema/useAdminFieldSchema.ts`에 `system`, `theme` domain을 추가했다.
  - `g5-admin/src/features/system/AdminSmsConfigWorkspace.tsx`, `AdminSmsConfigSections.tsx`는 `useAdminFieldSchema("system")`와 schema gate를 연결하고, 공급자 연결 폼의 label/description/options를 `/admin/schema/system` 기준으로 소비하도록 정리했다.
  - `g5-admin/src/features/theme/AdminThemePage.tsx`, `ThemeWorkspace.tsx`는 `useAdminFieldSchema("theme")`와 schema gate를 연결하고, 테마 selector label/description/options를 `/admin/schema/theme` 기준으로 소비하도록 정리했다.
  - `specs/domains/FORM_METADATA_COVERAGE.toml`에서 `system`, `theme`를 `schema_live`로 승격했고, `specs/audits/BLOCKERS.toml`와 `output/form-metadata-blockers/latest.{md,json}`는 provider blocker 수를 `7 -> 5`로 줄이도록 동기화했다.
  - `specs/TODO.md`, `specs/README.md`, `specs/foundation/FORM_METADATA_ROLLOUT_PLAN.md`, `specs/audits/2026-03-13-FORM_METADATA_COVERAGE_AUDIT.md`, `specs/audits/2026-03-13-FORM_METADATA_PROVIDER_BLOCKERS.md`도 현재 기준선으로 정리했다.
- 검증:
  - `cd g5-admin && bun x vitest run src/features/system/AdminSmsConfigPage.test.tsx src/features/theme/AdminThemePage.test.tsx`
  - `cd g5-admin && bun x tsc --noEmit`
  - `cd g5-admin && bun run lint`
  - `python3 scripts/check_form_metadata_coverage.py`
  - `python3 scripts/generate_form_metadata_blocker_report.py`
  - `python3 scripts/check_blocker_registry.py`
  - `bash scripts/run_deep_audit.sh`
  - `python3 scripts/run_integrated_audit.py --rust-root /Users/neojins/workspace/gnuboard5/rust --php-root /Users/neojins/workspace/gnuboard5/php`
  - `python3 scripts/doc-index.py`
  - `bash scripts/check-doc-governance.sh`

### `T2-207` 활성 사이트 작업 홈에 PHP `/admin/dashboard` 소비 연결

- Why: Rust 통합 감사는 `php_operations_missing_in_rust=0`까지 맞췄지만 `/admin/dashboard`만 실제 React 작업면에서 소비하지 않아 warning 1건이 남아 있었다. 현재 제품 IA에서 이 endpoint는 로컬 사이트 목록이 아니라 활성 사이트 작업 홈(`/sites/:siteId/overview`)에 붙는 것이 맞으므로, command만 있는 상태를 끝내고 실제 overview surface에 연결할 필요가 있었다.
- What:
  - `g5-admin-models/src/models/dashboard.rs`에 `visits`, `po_mb_point` parity를 보강하고 ts-rs export를 추가해 `AdminDashboard*` 타입과 `ApiTraceMeta`를 `g5-admin/src/types`로 생성했다.
  - `g5-admin/src/api/client/dashboard.ts`, `features/overview/use-admin-dashboard.ts`를 추가하고 `api-target-registry`, command context registry에 `cmd_admin_dashboard_get`를 정식 등록해 diagnostics/integrated audit가 overview 작업면의 원격 대시보드 조회를 canonical command로 인식하게 만들었다.
  - `features/overview/AdminOverviewPage.tsx`는 로컬 활동 카드 아래에 원격 관리자 대시보드 섹션을 추가해 회원/게시물/포인트/방문 요약과 최근 회원/게시물/포인트 목록을 함께 보여주도록 확장했고, 로그인 필요/로딩/오류 상태도 작업 홈 안에서 설명하도록 보강했다.
  - `features/overview/AdminOverviewPage.test.tsx`, `api/client/core/command-context.test.ts`를 보강해 overview render와 diagnostics registry 회귀를 고정했다.
- 검증:
  - `cargo test -p g5-admin-models models::tests::export_ts_bindings -- --exact --nocapture`
  - `cd g5-admin && bun x vitest run src/api/client/core/command-context.test.ts src/features/overview/AdminOverviewPage.test.tsx`
  - `cd g5-admin && bun x tsc --noEmit`
  - `cd g5-admin && bun run audit:consumer`
  - `cd g5-admin && bun run audit:implementation`
  - `python3 scripts/run_integrated_audit.py --rust-root /Users/neojins/workspace/gnuboard5/rust --php-root /Users/neojins/workspace/gnuboard5/php`
  - `python3 scripts/doc-index.py`
  - `bash scripts/run_document_audit.sh`

### `T2-206` 통합 감사에 PHP schema provider readiness handoff 노출

- Why: 통합 감사는 이미 PHP blocker와 PHP 구조 감사 handoff는 싣고 있었지만, `/admin/schema` provider rollout 상태는 여전히 PHP deep audit artifact를 별도로 열어야만 볼 수 있었다. 이 상태에서는 Rust 쪽 `T2-100` blocker와 PHP provider backlog의 연결이 통합 보고서에서 끊겨 보여 handoff 효율이 떨어진다.
- What:
  - `scripts/run_integrated_audit.py`에 `collect_php_schema_provider_readiness_metrics()`를 추가해 `php/output/admin-schema-provider-readiness/latest.{md,json}`를 읽고 provider status, implemented/blocked feature 수, blocked backlog, registry path를 메트릭으로 수집하도록 확장했다.
  - generated integrated report는 `php_schema_provider_status`, `php_schema_provider_blocked_features` note와 `php_schema_provider_*` evidence를 출력하고, `PHP Schema Provider Readiness Handoff` section을 별도로 추가해 provider rollout 상태를 handoff artifact 수준으로 재사용할 수 있게 만들었다.
  - `specs/integration/INTEGRATED_AUDIT_STANDARD.md`와 `specs/TODO.md`도 새 handoff 규칙에 맞게 갱신했다.
- 검증:
  - `python3 scripts/run_integrated_audit.py --rust-root /Users/neojins/workspace/gnuboard5/rust --php-root /Users/neojins/workspace/gnuboard5/php`
  - `python3 scripts/doc-index.py`
  - `bash scripts/check-doc-governance.sh`

### `T2-205` 통합 감사 operation 추출 기준을 현재 Rust 구조로 정렬

- Why: integrated audit는 `php_operations_missing_in_rust=69` warning을 계속 보고했지만, 실제 누락이 아니라 `src-tauri/src/api_client`의 nested 모듈(`member`, `board_group`, `faq`, `sms_contact`, `sms_template`)을 읽지 못해 이미 구현된 command surface를 빠뜨리는 계산 오류였다. 이 상태를 그대로 두면 parity backlog 판단이 오염되고, 실제 남은 구현과 감사 도구 부채를 구분할 수 없다.
- What:
  - `scripts/run_integrated_audit.py`의 `extract_rust_admin_operations()`가 `api_client` 최상위 `*.rs`만 보던 로직을 `rglob("*.rs")` 기준으로 바꿔 nested provider 모듈까지 재귀로 읽도록 정리했다.
  - 함수 주석에도 현재 활성 도메인이 nested `api_client` 폴더에 있다는 점과, 재귀 스캔이 false parity warning 방지 목적이라는 점을 명시했다.
  - `specs/TODO.md`도 이번 조정이 “실제 기능 구현”이 아니라 integrated audit source-of-truth 복구라는 점이 드러나도록 갱신했다.
- 검증:
  - `cd g5-admin && bun run audit:consumer`
  - `python3 scripts/run_integrated_audit.py --rust-root /Users/neojins/workspace/gnuboard5/rust --php-root /Users/neojins/workspace/gnuboard5/php`
  - `python3 scripts/doc-index.py`
  - `bash scripts/run_document_audit.sh`

### `T2-204` 관리자 schema `default_value` 소비 정합성 복구

- Why: PHP provider가 `/admin/schema` field에 create-time `default_value`를 추가한 뒤, Rust integrated audit에는 `field_parity_mismatches=1`이 남아 있었다. 이 drift를 그대로 두면 route-native form이 생성 기본값을 타입 안전하게 소비할 수 없고, consumer audit도 provider 의미 변경을 늦게 따라가는 상태가 된다. 동시에 `vitest --coverage`는 일부 실행에서 `coverage-critical/.tmp`를 만들지 못해 implementation/integrated audit가 환경 차이로 실패하고 있었다.
- What:
  - `g5-admin-models/src/models/schema.rs`에 `AdminFieldDefaultValue` union과 `AdminFieldSchema.default_value`를 추가하고, ts-rs export 대상에 포함했다.
  - `g5-admin/src/features/schema/useAdminFieldSchema.ts`에 `getFieldDefaultValue()` helper를 추가하고, `useAdminFieldSchema.test.ts`로 string/number/boolean/null default value 회귀를 고정했다.
  - `MemberDetailCard`/`AdminMembersPage` 테스트 fixture를 새 `default_value` 필드에 맞춰 보정했고, 생성된 `src/types/AdminFieldSchema.ts`, `src/types/AdminFieldDefaultValue.ts`도 동기화했다.
  - `g5-admin/vitest.critical.config.ts`는 `coverage-critical/.tmp`를 선제 생성해 critical coverage 실행이 temp directory 부재로 흔들리지 않도록 보강했다.
- 검증:
  - `cargo test -p g5-admin-models models::tests::export_ts_bindings -- --exact --nocapture`
  - `cd g5-admin && bun x vitest run src/features/schema/useAdminFieldSchema.test.ts src/features/members/MemberDetailCard.test.tsx src/features/members/AdminMembersPage.test.tsx`
  - `cd g5-admin && bun run audit:consumer`
  - `cd g5-admin && bun run audit:implementation`

### `T2-203` 통합 감사에 PHP 구조 감사 handoff 노출

- Why: 통합 감사는 이미 PHP blocker handoff는 싣고 있었지만, provider 구조 warning과 warning budget 상태는 각자 PHP deep audit 로그를 다시 열어야만 확인할 수 있었다. 이렇게 되면 세션 루트의 integrated report가 계약/운영 blocker만 보이고 구조 debt는 별도 로그에 흩어져 있어 handoff 효율이 떨어진다.
- What:
  - `scripts/run_integrated_audit.py`가 `php/output/php-structure-audit/latest.{md,json}`를 읽어 `php_structure_audit_status`, `php_structure_audit_warnings` note와 `php_structure_report_{json,md}` evidence를 같이 싣도록 확장했다.
  - generated integrated report에는 `PHP Structure Audit Handoff` section을 추가해 provider 구조 warning, warning budget, blocker 수를 같은 형식으로 바로 재사용할 수 있게 만들었다.
  - `specs/integration/INTEGRATED_AUDIT_STANDARD.md`, `specs/TODO.md`도 새 handoff 규칙에 맞게 갱신했다.
- 검증:
  - `python3 scripts/run_integrated_audit.py --rust-root /Users/neojins/workspace/gnuboard5/rust --php-root /Users/neojins/workspace/gnuboard5/php`
  - `python3 scripts/doc-index.py`
  - `bash scripts/check-doc-governance.sh`

### `T2-202` 로컬 보안 작업면을 provider blocker queue에서 분리

- Why: `security`는 `transport=local`인 `/app/security` 작업면인데도, 메타데이터 blocker 분류 초기에는 원격 관리자 폼과 같이 `php_schema_missing` backlog로 묶여 있었다. 이 상태를 그대로 두면 PHP provider에게 잘못된 책임을 넘기고, Rust 감사도 로컬 앱 보안 surface를 `/admin/schema` queue로 오인하게 된다.
- What:
  - `specs/domains/FORM_METADATA_COVERAGE.toml`에서 `security`를 `schema_planned + provider_blocker`가 아니라 `local_canonical`로 재분류했다.
  - `scripts/check_form_metadata_coverage.py`는 `local_canonical_features`와 `local_canonical` note를 같이 보고하도록 확장했고, blocker registry/handoff 문서/rollout plan/TODO도 `provider_blocked_features 8 -> 7` 기준으로 바로잡았다.
  - `specs/foundation/ADMIN_FORM_REGRESSION_STRATEGY.md`와 `FORM_METADATA_ROLLOUT_PLAN.md`에는 `security`가 PHP `/admin/schema` backlog가 아니라 로컬 메타데이터 canonical surface라는 점을 명시했다.
- 검증:
  - `python3 scripts/check_form_metadata_coverage.py`
  - `python3 scripts/generate_form_metadata_blocker_report.py`
  - `python3 scripts/check_blocker_registry.py`
  - `bash scripts/run_deep_audit.sh`
  - `python3 scripts/run_integrated_audit.py --rust-root /Users/neojins/workspace/gnuboard5/rust --php-root /Users/neojins/workspace/gnuboard5/php`
  - `python3 scripts/doc-index.py`
  - `bash scripts/check-doc-governance.sh`

### `T2-201` `specs/codex` 문서를 기록 영역으로 편입

- Why: `specs/codex`에 남아 있던 과거 AI prompt/report 문서들은 active-scope 바깥에 있어 메타데이터도 없고, 그렇다고 archive도 아니어서 “살아 있지만 관리되지 않는 문서” 상태였다. 특히 일부는 Flutter까지 포함한 과거 전환 지시서라서, AI가 잘못 집으면 현재 설계를 오염시킬 위험이 있었다.
- What:
  - `specs/codex/README.md`를 추가해 이 디렉터리를 현재 설계 정본이 아닌 기록 영역으로 못 박았다.
  - 기존 Codex prompt/report 5개에 `archived + ai_default_include:false` 메타데이터를 붙여 AI 기본 참조에서 제외했다.
  - `scripts/check_document_metadata.py`, `specs/DOCUMENT_SYSTEM.md`, `specs/foundation/DOCUMENT_METADATA_SCHEMA.md`, `specs/README.md`도 `specs/codex/*.md`를 관리 범위로 포함하도록 갱신했다.
- 검증:
  - `python3 scripts/check_document_metadata.py`
  - `python3 scripts/check_document_hygiene.py`
  - `bash scripts/run_document_audit.sh`

### `T2-200` 문서 위생 감사 상설화

- Why: 메타데이터 감사 2차로 문서의 신분과 상태는 강해졌지만, 형님이 지적하신 `오래된 감사문서`, `안 쓰는 active 문서`, `폐기된 문서 재참조`, `지원 문서가 스스로 SSOT라고 우기는 문제`는 여전히 남아 있었다. 문서 운영 체계가 진짜 운영 자산이 되려면 신분 검사뿐 아니라 위생 검사까지 상설 루프에 있어야 한다.
- What:
  - `scripts/check_document_hygiene.py`를 추가해 expired dated audit, active entrypoint coverage drift, inactive 문서 재참조, `source_of_truth:false` 문서의 self-claimed SSOT를 자동으로 검출하게 만들었다.
  - `scripts/run_document_audit.sh`는 메타데이터 검사 뒤에 문서 위생 검사를 상설 단계로 편입했다.
  - `specs/foundation/FORM_METADATA_ROLLOUT_PLAN.md`, `specs/foundation/FORM_SAVE_SMOKE_ROLLOUT_PLAN.md`의 잘못된 SSOT 표현을 정리했고, `specs/foundation/README.md`에 빠져 있던 active 지원 문서를 read order에 다시 연결했다.
  - `specs/AUDIT_SYSTEM.md`, `specs/DOCUMENT_SYSTEM.md`, `specs/README.md`, `.agent/workflows/document-management.md`, `specs/TODO.md`를 문서 위생 감사 기준에 맞게 갱신했다.
- 검증:
  - `python3 scripts/check_document_hygiene.py`
  - `bash scripts/run_document_audit.sh`
  - `python3 scripts/doc-index.py`
  - `bash scripts/check-doc-governance.sh`

### `T2-199` 문서 감사 2차 자동화 확대

- Why: 문서 운영 체계 1차는 핵심 정본 문서 몇 개에 메타데이터를 강제하는 수준이었고, foundation/domain/integration/workflow 문서는 여전히 사람의 관성에 기대고 있었다. 이 상태로는 AI가 active support 문서와 workflow 문서를 읽을 때도 stale review, duplicate canonical, archive/status drift를 자동으로 걸러내지 못하므로, 문서 감사가 운영 루프에 들어갔다고 해도 실질 범위는 좁았다.
- What:
  - `scripts/check_document_metadata.py`를 active-scope 전수 검사기로 확장해 `.agent/sub-constitutions/*.md`, `.agent/workflows/*.md`, `specs/*.md`, `specs/foundation/*.md`, `specs/domains/*.md`, `specs/integration/*.md`, `specs/audits/README.md`를 함께 읽고 메타데이터 누락, `source_of_truth`의 `canonical_for` 누락, review cycle stale, duplicate canonical, archive/status drift를 failure로 판정하게 만들었다.
  - foundation/domain/integration/support 문서와 누락돼 있던 workflow/sub-constitution 문서까지 active-scope 48개에 frontmatter 메타데이터를 rollout했다.
  - `specs/DOCUMENT_SYSTEM.md`, `specs/foundation/DOCUMENT_METADATA_SCHEMA.md`, `specs/AUDIT_SYSTEM.md`, `specs/AUDIT_STRATEGY.md`, `specs/README.md`, `.agent/sub-constitutions/document-governance.md`, `specs/TODO.md`를 현재 2차 자동화 범위와 실패 기준에 맞게 갱신했다.
- 검증:
  - `python3 scripts/check_document_metadata.py`
  - `bash scripts/run_document_audit.sh`
  - `python3 scripts/doc-index.py`
  - `bash scripts/check-doc-governance.sh`

### `T2-198` 정기 문서/정합성 감사 운영 절차 고정

- Why: 문서 감사가 정식 루프로 올라와도, 운영 절차에 `정기 구조 감사 / 정기 문서 감사 / 정기 코드-문서 정합성 감사`가 명시되지 않으면 릴리즈 전이나 월간 점검에서 무엇을 반드시 봐야 하는지 다시 사람 머리에 의존하게 된다. AI 주도 개발에서는 이 운영 루프 자체가 문서로 고정돼 있어야 drift를 줄일 수 있다.
- What:
  - `specs/AUDIT_SYSTEM.md`에 `코드-문서 정합성 감사` 분류와 `정기 운영 루프` 섹션을 추가해 architecture/domain/dependency audit, active 문서 메타데이터/status/drift/정본 중복/archive 정리, 코드-문서 드리프트 탐지 절차를 상설 운영 기준으로 명시했다.
  - `specs/foundation/CODE_DOC_CONSISTENCY_AUDIT.md`를 추가해 코드가 먼저 갔는데 문서가 안 바뀐 경우, 문서는 완료인데 코드가 아직 안 된 경우, 폐기된 전략이 active 문서에 남은 경우를 정기 점검 항목으로 고정했다.
  - `specs/DOCUMENT_SYSTEM.md`, `specs/README.md`, `specs/foundation/README.md`, `specs/TODO.md`도 같은 운영 절차를 참조하도록 갱신했다.
- 검증:
  - `bash scripts/run_document_audit.sh`
  - `python3 scripts/doc-index.py`
  - `bash scripts/check-doc-governance.sh`
### `T2-197` 문서 감사를 정식 감사 루프로 승격

- Why: 문서 운영 체계를 만들었어도 감사 루프가 여전히 `구현 감사 내부 문서 체크` 수준에 머물면, 문서 정책 변경이 독립된 merge gate로 보이지 않는다. 형님 프로젝트처럼 AI가 문서와 코드를 같이 참조하는 구조에서는 문서도 구현과 동급의 정식 감사 루프를 가져야 한다.
- What:
  - `scripts/run_document_audit.sh`를 추가해 메타데이터 검사, docs index rebuild, 문서 거버넌스 검사를 독립 명령으로 묶었다.
  - `g5-admin/package.json`에 `audit:docs`를 추가했고, `.github/workflows/docs.yml`로 PR/푸시에서 문서 감사가 별도 CI로 실행되게 했다.
  - `scripts/run_standard_audit.sh`는 문서 baseline 단계를 새 문서 감사 스크립트 호출로 정리했고, `specs/AUDIT_SYSTEM.md`, `specs/AUDIT_STRATEGY.md`, `specs/README.md`, `specs/TODO.md`도 문서 감사를 정식 루프로 승격한 상태에 맞춰 갱신했다.
- 검증:
  - `bash scripts/run_document_audit.sh`
  - `bash scripts/run_standard_audit.sh`
  - `python3 scripts/doc-index.py`
  - `bash scripts/check-doc-governance.sh`
### `T2-196` 문서 운영 체계 1차 도입

- Why: 감사 체계는 올라왔지만 문서는 아직 “무엇이 정본인지”를 기계적으로 강제하지 못했다. 이 상태에서는 AI가 오래된 메모, 지원 문서, superseded 정책을 현재 기준처럼 끌고 와 구조를 오염시킬 수 있으므로, 문서도 타입·상태·소유자·정본 여부를 가진 운영 객체로 승격할 필요가 있었다.
- What:
  - `specs/DOCUMENT_SYSTEM.md`를 추가해 문서 계층, 한 사실 한 정본, AI 기본 참조 규칙, TTL, 컨텍스트 entrypoint 운영을 문서 운영 SSOT로 고정했다.
  - `specs/foundation/DOCUMENT_METADATA_SCHEMA.md`, `specs/foundation/DOCUMENT_LIFECYCLE_POLICY.md`를 추가해 핵심 active 문서의 frontmatter 스키마와 상태 전이 규칙을 정리했다.
  - `.agent/Constitution.md`, `.agent/sub-constitutions/document-governance.md`, `.agent/workflows/document-management.md`, `specs/README.md`, `specs/IMPLEMENTATION_ROADMAP.md`, `specs/TODO.md`, `specs/HISTORY.md`, `specs/AUDIT_SYSTEM.md`, `specs/AUDIT_STRATEGY.md`, `specs/foundation/README.md`, `specs/domains/README.md`에 메타데이터와 문서 운영 규칙을 반영했다.
  - `scripts/check_document_metadata.py`, `scripts/doc-index.py`, `scripts/check-doc-governance.sh`를 확장해 핵심 active 문서의 메타데이터와 AI 기본 참조 규칙을 상설 검증하도록 만들었다.
- 검증:
  - `python3 scripts/check_document_metadata.py`
  - `python3 scripts/doc-index.py`
  - `bash scripts/check-doc-governance.sh`

### `T2-195` 구조 감사 warning budget registry 도입

- Why: waiver와 blocked backlog는 이미 machine-readable registry로 승격됐지만, 정작 active structure warning은 “경고 13개”처럼 뜨기만 하고 owner/기한 없이 남을 수 있었다. 이 상태에서는 warning이 실제 운영 객체가 아니라 장식 메시지로 취급돼, 시간이 지나도 fail로 승격되지 않고 구조 부채가 그냥 눌어붙는다.
- What:
  - `specs/audits/WARNING_BUDGETS.toml`를 추가해 현재 active structure warning 10개를 `id / audit / rule / path / owner / reason / introduced_on / expires_on / removal_criteria` 기준으로 등록했다.
  - `scripts/check_warning_budgets.py`를 추가해 active warning과 budget registry를 대조하고, missing budget은 failure, stale budget은 warning, expired budget은 failure로 판정하도록 만들었다.
  - `scripts/run_deep_audit.sh`는 이제 waiver registry 뒤에 warning budget registry를 상설 실행하고, `.agent/Constitution.md`, `specs/AUDIT_SYSTEM.md`, `specs/AUDIT_STRATEGY.md`, `specs/TODO.md`도 같은 규칙을 참조하도록 갱신했다.
- 검증:
  - `python3 scripts/check_warning_budgets.py`
  - `bash scripts/run_deep_audit.sh`
  - `python3 scripts/doc-index.py`
  - `bash scripts/check-doc-governance.sh`

### `T2-194` 통합 감사가 blocked backlog handoff를 함께 싣도록 정렬

- Why: blocker registry와 generated handoff artifact가 생겼어도, PHP-Rust 교차 감사 결과에는 아직 그 상태가 드러나지 않았다. 이러면 통합 보고서만 읽는 사람은 메타데이터 warning 8개를 다시 Rust 미구현으로 오해할 수 있으므로, integrated report 자체가 provider blocker handoff를 같이 보여줘야 했다.
- What:
  - `scripts/run_integrated_audit.py`는 이제 `specs/audits/BLOCKERS.toml`와 `output/form-metadata-blockers/latest.json`을 읽어 Rust blocked backlog 메트릭을 수집하고, `latest.md/json`의 `Note`, `Evidence`, `Rust Blocked Backlog Handoff` section에 함께 출력한다.
  - `specs/integration/INTEGRATED_AUDIT_STANDARD.md`는 통합 감사가 provider blocker handoff까지 증적으로 싣는다는 규칙을 반영하도록 갱신했다.
- 검증:
  - `python3 scripts/run_integrated_audit.py --rust-root /Users/neojins/workspace/gnuboard5/rust --php-root /Users/neojins/workspace/gnuboard5/php`
  - `python3 scripts/doc-index.py`
  - `bash scripts/check-doc-governance.sh`

### `T2-193` blocked backlog를 registry로 승격

- Why: `T2-100`을 `Blocked`로 옮긴 뒤에도 그 상태는 여전히 `TODO.md` 문장, handoff 문서, generated artifact 세 곳에 흩어져 있었다. 이 셋이 어긋나면 deep audit은 통과해도 실제 handoff 상태는 stale 될 수 있으므로, blocked backlog 자체를 machine-readable registry로 끌어올릴 필요가 있었다.
- What:
  - `specs/audits/BLOCKERS.toml`를 추가해 rust-only 범위의 active provider blocker를 `id/audit/owner/reason/source_registry/handoff/generated artifact/features` 기준으로 고정했다.
  - `scripts/check_blocker_registry.py`를 추가해 `TODO.md`의 `Blocked` 항목과 `BLOCKERS.toml`, `output/form-metadata-blockers/latest.{md,json}`가 서로 맞는지 상설 검증하도록 만들었다.
  - `scripts/run_deep_audit.sh`에 blocker registry step을 편입했고, `specs/AUDIT_SYSTEM.md`, `specs/AUDIT_STRATEGY.md`, `specs/README.md`, `README.md`, `AGENTS.md`도 blocked backlog 운영 규칙을 반영하도록 갱신했다.
- 검증:
  - `python3 scripts/check_blocker_registry.py`
  - `bash scripts/run_deep_audit.sh`
  - `python3 scripts/doc-index.py`
  - `bash scripts/check-doc-governance.sh`

### `T2-192` 메타데이터 provider blocker handoff 산출물을 자동 생성으로 승격

- Why: blocker handoff 문서를 수기로만 유지하면 다음 감사 때 stale 될 수 있고, deep audit을 돌려도 최신 provider blocker 상태가 artifact로 남지 않는다. 메타데이터 잔량 8개가 실제로는 PHP provider blocker라는 점을 계속 강제하려면 generated output이 필요하다.
- What:
  - `scripts/generate_form_metadata_blocker_report.py`를 추가해 `check_form_metadata_coverage.py` 결과와 PHP `schema-domains.json`을 바탕으로 `output/form-metadata-blockers/latest.md`, `latest.json`을 생성하도록 만들었다.
  - `scripts/run_deep_audit.sh`에 blocker handoff step을 편입해 deep audit만 실행해도 최신 provider blocker artifact가 같이 생성되게 했다.
  - `specs/AUDIT_SYSTEM.md`, `specs/AUDIT_STRATEGY.md`, `specs/README.md`는 generated blocker artifact와 handoff 문서의 역할을 분리해 설명하도록 갱신했다.
- 검증:
  - `python3 scripts/generate_form_metadata_blocker_report.py`
  - `bash scripts/run_deep_audit.sh`
  - `python3 scripts/doc-index.py`
  - `bash scripts/check-doc-governance.sh`

### `T2-191` 메타데이터 감사에 provider blocker 분류를 추가

- Why: `T2-100` warning 8개는 모두 Rust 소비자 미구현처럼 보였지만, 실제로는 PHP `schema-domains.json`에 대응 domain이 없어 rust-only 범위에서 진행할 수 없는 항목이었다. 이걸 분리하지 않으면 감사가 잘못된 책임 소재를 계속 내놓고, TODO도 `Next`와 `Blocked`를 구분하지 못한 채 남는다.
- What:
  - `specs/domains/FORM_METADATA_COVERAGE.toml`의 `schema_planned` 8개 feature에 `provider_blocker = "php_schema_missing"`를 추가해 blocker SSOT를 registry에 고정했다.
  - `scripts/check_form_metadata_coverage.py`는 이제 PHP `api/v1/Admin/Schema/schema-domains.json`을 함께 읽어 `provider_schema_domains=10`, `provider_blocked_features=8`를 note로 보고하고, `schema_live` domain drift를 교차 검증하며, `schema_planned` warning은 `blocked_by=php_schema_missing`로 출력하고 `[blocked]` 섹션도 같이 내보낸다.
  - `specs/TODO.md`, `specs/audits/2026-03-13-FORM_METADATA_COVERAGE_AUDIT.md`, `specs/foundation/FORM_METADATA_ROLLOUT_PLAN.md`는 `T2-100`을 rust-only 범위의 `Blocked`로 재분류하고, 메타데이터 잔량이 provider unblock 없이는 줄지 않는다는 점을 반영하도록 갱신했다.
  - handoff 문서 [`specs/audits/2026-03-13-FORM_METADATA_PROVIDER_BLOCKERS.md`](/Users/neojins/workspace/gnuboard5/rust/specs/audits/2026-03-13-FORM_METADATA_PROVIDER_BLOCKERS.md)를 추가해 8개 blocked feature와 PHP 쪽 최소 작업을 별도 감사 산출물로 고정했다.
- 검증:
  - `python3 scripts/check_form_metadata_coverage.py`
  - `python3 scripts/doc-index.py`
  - `bash scripts/check-doc-governance.sh`

### `T2-101` representative save smoke를 `boards`·`board-groups`·`polls`·`popups`까지 확장해 완료

- Why: `contents`까지 닫은 뒤 남은 저장 스모크 잔량은 `boards`, `board-groups`, `polls`, `popups` 네 개뿐이었다. 이 네 surface를 닫으면 `FORM_SAVE_SMOKE_COVERAGE.toml`에 등록된 18개 route-native 저장 폼이 모두 `save_ready`로 올라가고, 감사가 더 이상 “대표 저장 경로 부재”를 warning으로 남기지 않게 된다.
- What:
  - `g5-admin/src/features/boards/AdminBoardsPage.test.tsx`, `g5-admin/src/features/board-groups/AdminBoardGroupsPage.test.tsx`에 생성 폼 validation/save smoke와 `/admin/boards`, `/admin/board-groups` 404 안내를 추가해 `createAdminBoard`, `createAdminBoardGroup` 호출을 page level에서 고정했다.
  - `g5-admin/src/features/polls/AdminPollsPage.test.tsx`, `g5-admin/src/features/popups/AdminPopupsPage.test.tsx`를 추가해 생성 폼 범위 submit 기반 validation/save smoke와 `/admin/system/polls`, `/admin/system/popups` 404 안내를 page level에서 고정했다.
  - `check_form_save_smoke_coverage.py` 기준 최종 baseline은 `warnings=0`, `page_save_features=18`, `validation_guard_features=18`, `unsupported_404_features=17`, `save_ready_features=18`로 갱신됐고, `T2-101`은 완료됐다.
  - `specs/audits/2026-03-13-FORM_SAVE_SMOKE_AUDIT.md`, `specs/audits/2026-03-12-RUST_ARCHITECTURE_AUDIT.md`, `specs/foundation/FORM_SAVE_SMOKE_ROLLOUT_PLAN.md`, `specs/TODO.md`는 최종 baseline과 완료 상태를 반영하도록 갱신했다.
- 검증:
  - `cd g5-admin && bun x vitest run src/features/boards/AdminBoardsPage.test.tsx src/features/board-groups/AdminBoardGroupsPage.test.tsx src/features/polls/AdminPollsPage.test.tsx src/features/popups/AdminPopupsPage.test.tsx`
  - `python3 scripts/check_form_save_smoke_coverage.py`
  - `cd g5-admin && bun x tsc --noEmit`
  - `cd g5-admin && bun run lint`

### `T2-101` representative save smoke를 `contents`까지 확장

- Why: `faqs`를 닫은 뒤 남은 `P2` 중 `contents`는 이미 route-native page smoke와 serializer test를 모두 갖고 있었고, 생성 폼도 한 화면에 고정돼 있어 validation/save/404를 한 번에 묶기 쉬웠다. 추가 비용 대비 warning 1건과 validation/404 coverage 1건씩을 같이 줄일 수 있는 가장 값 좋은 후보였다.
- What:
  - `g5-admin/src/features/contents/AdminContentsPage.test.tsx`에 `내용 생성` validation smoke, content create save smoke, `/admin/contents` 404 안내를 추가해 `createAdminContent` 호출을 page level에서 고정했다.
  - `check_form_save_smoke_coverage.py` 기준 baseline은 `warnings=4`, `page_save_features=14`, `validation_guard_features=17`, `unsupported_404_features=13`, `save_ready_features=14`로 갱신됐고, 남은 `T2-101` 잔량은 `boards`, `board-groups`, `polls`, `popups` 네 개다.
  - `specs/audits/2026-03-13-FORM_SAVE_SMOKE_AUDIT.md`, `specs/audits/2026-03-12-RUST_ARCHITECTURE_AUDIT.md`, `specs/TODO.md`는 새 baseline과 남은 `P2` 기준으로 갱신했다.
- 검증:
  - `cd g5-admin && bun x vitest run src/features/contents/AdminContentsPage.test.tsx`
  - `python3 scripts/check_form_save_smoke_coverage.py`
  - `cd g5-admin && bun x tsc --noEmit`
  - `cd g5-admin && bun run lint`

### `T2-101` representative save smoke를 `faqs`까지 확장

- Why: `boards`, `board-groups`, `contents`, `faqs`, `polls`, `popups`만 남은 시점에서 `faqs`는 이미 route-native page smoke와 serializer test를 모두 갖고 있었다. 마스터 생성 경로 하나만 page level로 고정하면 validation, save success, unsupported 404를 한 번에 닫을 수 있는 가장 값싼 `P2` 후보였다.
- What:
  - `g5-admin/src/features/faqs/AdminFaqsPage.test.tsx`에 `마스터 생성` validation smoke, FAQ 마스터 생성 save smoke, `/admin/faq-masters` 404 안내를 추가해 `createAdminFaqMaster` 호출을 page level에서 고정했다.
  - `check_form_save_smoke_coverage.py` 기준 baseline은 `warnings=5`, `page_save_features=13`, `validation_guard_features=16`, `unsupported_404_features=12`, `save_ready_features=13`로 갱신됐고, 남은 `T2-101` 잔량은 `boards`, `board-groups`, `contents`, `polls`, `popups` 다섯 개다.
  - `specs/audits/2026-03-13-FORM_SAVE_SMOKE_AUDIT.md`, `specs/audits/2026-03-12-RUST_ARCHITECTURE_AUDIT.md`, `specs/TODO.md`는 새 baseline과 남은 `P2` 기준으로 갱신했다.
- 검증:
  - `cd g5-admin && bun x vitest run src/features/faqs/AdminFaqsPage.test.tsx`
  - `python3 scripts/check_form_save_smoke_coverage.py`
  - `cd g5-admin && bun x tsc --noEmit`
  - `cd g5-admin && bun run lint`

### `T2-101` representative save smoke를 `menus`까지 확장

- Why: `members`까지 닫은 뒤에도 `menus`는 supporting zod evidence는 있지만 page save와 404 방어가 없는 전형적인 `P2` 잔량이었다. 메뉴 CRUD는 작업면 구조가 단순하고 create form도 이미 route-native로 살아 있어서, 추가 비용 대비 warning 1건을 가장 싸게 줄일 수 있는 후보였다.
- What:
  - `g5-admin/src/features/menus/AdminMenusPage.test.tsx`에 create form 비활성화 guard, 메뉴 생성 save smoke, `/admin/menus` 404 안내를 추가해 `createAdminMenu` 호출을 page level에서 고정했다.
  - `check_form_save_smoke_coverage.py` 기준 baseline은 `warnings=6`, `page_save_features=12`, `validation_guard_features=16`, `unsupported_404_features=11`, `save_ready_features=12`로 갱신됐고, 남은 `T2-101` 잔량은 `boards`, `board-groups`, `contents`, `faqs`, `polls`, `popups` 여섯 개다.
  - `specs/audits/2026-03-13-FORM_SAVE_SMOKE_AUDIT.md`, `specs/audits/2026-03-12-RUST_ARCHITECTURE_AUDIT.md`, `specs/TODO.md`는 새 baseline과 남은 P2 기준으로 갱신했다.
- 검증:
  - `cd g5-admin && bun x vitest run src/features/menus/AdminMenusPage.test.tsx`
  - `python3 scripts/check_form_save_smoke_coverage.py`

### `T2-101` representative save smoke를 `members`까지 확장

- Why: `sms-contacts`, `sms-templates`를 닫은 뒤 저장 스모크 `P1` 잔량은 `members` 하나만 남았다. 그런데 `members`는 supporting test는 있었지만 route-native page test가 아예 없어 `page_evidence_missing`까지 같이 뜨고 있었고, 이 상태를 두면 운영상 가장 민감한 프로필/레벨 변경 도메인이 representative save smoke 체계 밖에 남게 된다.
- What:
  - `g5-admin/src/features/members/AdminMembersPage.test.tsx`를 추가해 `회원 상세를 선택하세요` empty state, `/admin/members/:mbId` 기반 프로필 저장 smoke, `/admin/members` 404 안내를 page level에서 고정했다.
  - `check_form_save_smoke_coverage.py` 기준 baseline은 `warnings=7`, `page_save_features=11`, `validation_guard_features=16`, `unsupported_404_features=10`, `save_ready_features=11`로 갱신됐고, 이로써 `T2-101`의 `P1` feature는 모두 `save_ready`로 올라갔다.
  - `specs/audits/2026-03-13-FORM_SAVE_SMOKE_AUDIT.md`, `specs/audits/2026-03-12-RUST_ARCHITECTURE_AUDIT.md`, `specs/TODO.md`는 새 baseline과 남은 `P2` 잔량 기준으로 갱신했다.
- 검증:
  - `cd g5-admin && bun x vitest run src/features/members/AdminMembersPage.test.tsx src/features/members/MemberDetailCard.test.tsx`
  - `python3 scripts/check_form_save_smoke_coverage.py`
  - `cd g5-admin && bun x tsc --noEmit`
  - `cd g5-admin && bun run lint`

### `T2-101` representative save smoke를 `sms-contacts`·`sms-templates`까지 확장

- Why: save smoke 감사의 `P1` 잔량이 `members`, `sms-contacts`, `sms-templates` 셋으로 줄어든 뒤에도 SMS 작업면 둘은 아직 `render_only`에 머물러 있었다. 둘 다 route-native page와 serializer test는 이미 갖고 있어 representative page save/validation/404 evidence만 추가하면 곧바로 `save_ready`로 승격될 수 있는 값싼 잔량이었다.
- What:
  - `g5-admin/src/features/sms-templates/AdminSmsTemplatesPage.test.tsx`에 `템플릿 생성` validation smoke, template create save smoke, `/admin/sms/templates` 404 안내를 추가해 `createAdminSmsTemplate` 호출을 page level에서 고정했다.
  - `g5-admin/src/features/sms-contacts/AdminSmsContactsPage.test.tsx`에 `연락처 생성` validation smoke, contact create save smoke, `/admin/sms/contacts` 404 안내를 추가해 `createAdminSmsContact` 호출을 page level에서 고정했다.
  - `check_form_save_smoke_coverage.py` 기준 baseline은 `warnings=8`, `page_save_features=10`, `validation_guard_features=15`, `unsupported_404_features=9`, `save_ready_features=10`으로 갱신됐고, `save_ready`는 `security/config/system/points/mails/theme/layouts/sms-messages/sms-contacts/sms-templates` 10개가 됐다.
  - `specs/audits/2026-03-13-FORM_SAVE_SMOKE_AUDIT.md`, `specs/audits/2026-03-12-RUST_ARCHITECTURE_AUDIT.md`, `specs/TODO.md`는 새 baseline과 남은 유일한 `P1` warning(`members`) 기준으로 갱신했다.
- 검증:
  - `cd g5-admin && bun x vitest run src/features/sms-templates/AdminSmsTemplatesPage.test.tsx src/features/sms-contacts/AdminSmsContactsPage.test.tsx`
  - `python3 scripts/check_form_save_smoke_coverage.py`
  - `cd g5-admin && bun x tsc --noEmit`
  - `cd g5-admin && bun run lint`

### `T2-101` representative save smoke를 `mails`·`theme`·`layouts`·`sms-messages`까지 확장

- Why: `security/config/system/points`만 닫힌 상태에서는 save smoke 감사가 일부 대표 폼에만 머물러 있었고, 메일 템플릿 저장·테마 적용·레이아웃 저장·문자 발송 같은 실제 운영 작업면이 여전히 warning으로 남아 있었다. 특히 `mails`는 정적 감사가 save-ready로 오판할 수 있는 상태여서 먼저 실제 page test를 통과시키는 게 필요했다.
- What:
  - `g5-admin/src/features/mails/AdminMailsPage.test.tsx`의 템플릿 생성 smoke를 실제 편집 폼 범위로 좁혀 `createAdminMailTemplate` 호출과 `/admin/mails` 404 안내를 page level에서 고정했다.
  - `g5-admin/src/features/theme/AdminThemePage.test.tsx`, `g5-admin/src/features/theme/admin-theme-form.test.ts`에 `PC 적용` quick action save smoke, `/admin/system/theme` 404 안내, `빈 변경` guard를 추가해 `theme`를 `save_ready`로 승격했다.
  - `g5-admin/src/features/layouts/AdminLayoutsPage.test.tsx`에 `신규 레이아웃 저장` 버튼 비활성화 guard, 선택 레이아웃 저장 smoke, `/admin/layouts` 404 안내를 추가해 `layouts`를 `save_ready`로 승격했다.
  - `g5-admin/src/features/sms-messages/AdminSmsMessagesPage.test.tsx`에 provider-ready 비활성화 guard, 문자 발송 save smoke, `/admin/sms/messages` 404 안내를 추가해 `sms-messages`를 `save_ready`로 승격했다.
  - `check_form_save_smoke_coverage.py` 기준 baseline은 `warnings=10`, `page_save_features=8`, `validation_guard_features=13`, `unsupported_404_features=7`, `save_ready_features=8`로 갱신됐고, `save_ready`는 `security/config/system/points/mails/theme/layouts/sms-messages` 8개가 됐다.
  - `specs/audits/2026-03-13-FORM_SAVE_SMOKE_AUDIT.md`, `specs/audits/2026-03-12-RUST_ARCHITECTURE_AUDIT.md`, `specs/TODO.md`는 새 baseline과 잔여 P1(`members`, `sms-contacts`, `sms-templates`) 기준으로 갱신했다.
- 검증:
  - `cd g5-admin && bun x vitest run src/features/layouts/AdminLayoutsPage.test.tsx src/features/mails/AdminMailsPage.test.tsx src/features/theme/AdminThemePage.test.tsx src/features/theme/admin-theme-form.test.ts src/features/config/AdminConfigPage.test.tsx src/features/system/AdminSmsConfigPage.test.tsx src/features/security/SecuritySettingsPage.test.tsx src/features/points/AdminPointsPage.test.tsx src/features/sms-messages/AdminSmsMessagesPage.test.tsx`
  - `cd g5-admin && bun x tsc --noEmit`
  - `cd g5-admin && bun run lint`
  - `python3 scripts/check_form_save_smoke_coverage.py`

### `T2-101` representative save smoke를 `points` 작업면까지 확장

- Why: `points`는 supporting validation evidence가 이미 있고, route-native 작업면도 지급/차감 액션과 list query 404를 한 페이지에서 같이 검증할 수 있어 P1 후보 중 ROI가 높았다. 이 경로가 닫히면 운영 액션형 remote form도 save smoke 체계 안에서 다뤄진다는 근거가 생긴다.
- What:
  - `g5-admin/src/features/points/AdminPointsPage.test.tsx`에 `포인트 지급` page save smoke와 `resource.not_found` list 404 smoke를 추가해 `grantAdminPoint` 호출과 remote unsupported evidence를 고정했다.
  - `check_form_save_smoke_coverage.py` 기준으로 `points`가 `save_ready`로 승격됐고, baseline은 `warnings=14`, `page_save_features=4`, `validation_guard_features=10`, `unsupported_404_features=3`, `save_ready_features=4`로 갱신됐다.
  - `specs/audits/2026-03-13-FORM_SAVE_SMOKE_AUDIT.md`, `specs/audits/2026-03-12-RUST_ARCHITECTURE_AUDIT.md`, `specs/TODO.md`는 `security + config + system + points` 4개 representative save-ready feature를 반영하도록 갱신했다.
- 검증:
  - `cd g5-admin && bun x vitest run src/features/points/AdminPointsPage.test.tsx`
  - `python3 scripts/check_form_save_smoke_coverage.py`

### `T2-101` representative save smoke를 remote `system`까지 확장

- Why: `system(AdminSmsConfigPage)`은 이미 validation/404 evidence를 갖고 있어서, page save success만 붙이면 바로 `save_ready`로 승격되는 가장 값싼 P1 후보였다. 이 경로가 닫히면 save smoke 감사가 local form 하나와 general config에만 머물지 않고 운영 설정형 remote form까지 커버하게 된다.
- What:
  - `g5-admin/src/features/system/AdminSmsConfigPage.test.tsx`에 회신번호 diff-only 저장 smoke를 추가해 `updateAdminSmsConfig` page mutation 호출을 고정했다.
  - `check_form_save_smoke_coverage.py` 기준으로 `system`이 `validation_only -> save_ready`로 승격됐고, baseline은 `warnings=15`, `page_save_features=3`, `validation_guard_features=10`, `unsupported_404_features=2`, `save_ready_features=3`으로 갱신됐다.
  - `specs/audits/2026-03-13-FORM_SAVE_SMOKE_AUDIT.md`, `specs/audits/2026-03-12-RUST_ARCHITECTURE_AUDIT.md`, `specs/TODO.md`는 `security + config + system` 세 개의 representative save-ready feature를 반영하도록 갱신했다.
- 검증:
  - `cd g5-admin && bun x vitest run src/features/system/AdminSmsConfigPage.test.tsx src/features/config/AdminConfigPage.test.tsx src/features/security/SecuritySettingsPage.test.tsx`
  - `python3 scripts/check_form_save_smoke_coverage.py`

### `T2-101` representative save smoke를 remote `config`까지 확장

- Why: `security`만 `save_ready`인 상태에서는 save smoke 감사 체계가 local form 하나에만 고정돼 있었고, remote route-native admin form이 같은 방식으로 닫히는지 아직 증명되지 않았다. 특히 `config`는 diff-only 저장과 zod validation, 404 contract 오류를 한 페이지에서 함께 검증할 수 있는 P1 후보였다.
- What:
  - `g5-admin/src/features/config/AdminConfigPage.test.tsx`에 `diff-only save`, `invalid email validation`, `resource.not_found 404` page smoke를 추가해 `updateAdminConfig` 호출, zod validation, remote unsupported evidence를 한 파일에서 함께 고정했다.
  - `check_form_save_smoke_coverage.py` 기준으로 `config`가 `save_ready`로 승격됐고, baseline은 `warnings=16`, `page_save_features=2`, `validation_guard_features=10`, `unsupported_404_features=2`, `save_ready_features=2`로 갱신됐다.
  - `specs/audits/2026-03-13-FORM_SAVE_SMOKE_AUDIT.md`, `specs/audits/2026-03-12-RUST_ARCHITECTURE_AUDIT.md`, `specs/TODO.md`는 `security + config` 두 개의 representative save-ready feature를 반영하도록 갱신했다.
- 검증:
  - `cd g5-admin && bun x vitest run src/features/config/AdminConfigPage.test.tsx src/features/security/SecuritySettingsPage.test.tsx src/features/system/AdminSmsConfigPage.test.tsx`
  - `python3 scripts/check_form_save_smoke_coverage.py`
  - `cd g5-admin && bun x tsc --noEmit`
  - `cd g5-admin && bun run lint`

### `T2-101` 첫 representative save smoke로 local security 저장 경로를 닫음

- Why: save smoke 감사 체계를 세운 직후 baseline은 `page_save_features=0`, `save_ready_features=0`이었고, 모든 feature가 warning으로 남아 있었다. 이 상태에서는 감사 구조는 맞아도 실제로 warning이 줄어드는지 검증할 대표 사례가 없었다.
- What:
  - `g5-admin/src/features/security/SecuritySettingsPage.test.tsx`에 idle-timeout step-up dialog 저장 smoke를 추가해 `updateIdleTimeout` mutation 호출과 현재 비밀번호 요구를 page level에서 고정했다.
  - `check_form_save_smoke_coverage.py` 기준으로 `security`가 `save_ready`로 승격되었고, baseline은 `warnings=17`, `page_save_features=1`, `validation_guard_features=9`, `save_ready_features=1`로 갱신됐다.
  - `specs/audits/2026-03-13-FORM_SAVE_SMOKE_AUDIT.md`, `specs/audits/2026-03-12-RUST_ARCHITECTURE_AUDIT.md`는 이 숫자와 첫 representative evidence를 반영하도록 갱신했다.
- 검증:
  - `cd g5-admin && bun x vitest run src/features/system/AdminSmsConfigPage.test.tsx src/features/security/SecuritySettingsPage.test.tsx`
  - `python3 scripts/check_form_save_smoke_coverage.py`
  - `cd g5-admin && bun x tsc --noEmit`
  - `cd g5-admin && bun run lint`

### 관리자 폼 save smoke 감사를 registry 기반 상설 점검으로 승격

- Why: `T2-101`이 남아 있었지만, 실제로 어느 route-native 폼이 page-level save success를 검증하고 있고 어느 폼이 아직 render smoke + form unit test에만 머무는지는 사람이 파일명을 기억하며 대조해야 했다. 이 상태에서는 저장 회귀가 줄었는지, unsupported 404 방어가 추가됐는지, validation evidence가 page smoke 없이 방치되는지를 자동으로 드러낼 방법이 없었다.
- What:
  - `specs/domains/FORM_SAVE_SMOKE_COVERAGE.toml`를 추가해 `boards`, `config`, `contents`, `faqs`, `layouts`, `mails`, `members`, `menus`, `points`, `polls`, `popups`, `security`, `system`, `theme`, `sms-contacts`, `sms-messages`, `sms-templates`, `board-groups` 18개 저장 surface를 machine-readable registry로 고정했다.
  - `scripts/check_form_save_smoke_coverage.py`를 추가해 feature별 `page_tests`, `supporting_tests`, `save_symbols`, `transport`, `target_level`을 읽고 `page_save / validation / unsupported_404` 증적 수준을 `save_ready / save_without_404 / validation_only / render_only / no_page_smoke`로 보고하게 만들었다.
  - `scripts/run_deep_audit.sh`, `specs/AUDIT_SYSTEM.md`, `specs/AUDIT_STRATEGY.md`, `specs/domains/README.md`, `specs/foundation/ADMIN_FORM_REGRESSION_STRATEGY.md`, `specs/TODO.md`는 새 registry와 audit command를 기준으로 정렬했고, rollout SSOT로 `specs/foundation/FORM_SAVE_SMOKE_ROLLOUT_PLAN.md`를 추가했다.
  - 감사 보고서는 `specs/audits/2026-03-13-FORM_SAVE_SMOKE_AUDIT.md`에 남기고, 이후 `T2-101`은 이 registry의 `P1/P2` gap를 실제 save smoke evidence로 줄이는 작업으로 좁혔다.
- 검증:
  - `python3 scripts/check_form_save_smoke_coverage.py`
  - `bash scripts/run_deep_audit.sh`
  - `python3 scripts/doc-index.py`
  - `bash scripts/check-doc-governance.sh`

### 관리자 폼 metadata coverage 감사를 registry 기반 상설 점검으로 승격

- Why: `/admin/schema` 소비 확대가 다음 핵심 과제였지만, 그 전까지는 “어느 작업면이 이미 schema를 쓰는지, 어느 작업면이 아직 local metadata에 머무는지”를 사람 눈으로만 판단해야 했다. 이 상태에서는 `T2-100`이 실제로 줄었는지, 같은 도메인이 다시 raw/hardcoded widget으로 회귀했는지 자동으로 드러나지 않았다.
- What:
  - `specs/domains/FORM_METADATA_COVERAGE.toml`를 추가해 `schema_live` 9개와 `schema_planned` 8개 route-native admin form을 machine-readable registry로 고정했다.
  - `scripts/check_form_metadata_coverage.py`를 추가해 feature 디렉터리별 `useAdminFieldSchema`, schema gate, `getFieldLabel`, `getFieldDescription`, `getFieldOptions`, `input_type` 흔적을 읽고 `schema_full / schema_labels / local_only` 수준으로 보고하도록 만들었다.
  - `scripts/run_deep_audit.sh`, `specs/AUDIT_SYSTEM.md`, `specs/foundation/ADMIN_FORM_REGRESSION_STRATEGY.md`, `specs/domains/README.md`, `specs/TODO.md`는 이 registry와 audit command를 기준으로 정렬했고, 보고서는 `specs/audits/2026-03-13-FORM_METADATA_COVERAGE_AUDIT.md`에 남겼다.
  - 현재 baseline은 `schema_live=9`, `schema_planned=8`, `schema_full=5`, `schema_labels=4`, `local_only=8`이며, `schema_planned` 8개가 곧 `T2-100`의 실제 확장 대상이다.
- Follow-up:
  - `specs/foundation/FORM_METADATA_ROLLOUT_PLAN.md`를 추가해 `security/system/theme/sms-*`를 `P1`, `mails/points`를 `P2`로 고정했고, `check_form_metadata_coverage.py`가 priority와 next_action까지 출력하도록 보강했다.
- 검증:
  - `python3 scripts/check_form_metadata_coverage.py`
  - `bash scripts/run_deep_audit.sh`
  - `python3 scripts/doc-index.py`
  - `bash scripts/check-doc-governance.sh`

### route-native page smoke evidence를 17개 target 전체로 확장

- Why: domain coverage registry와 SDD는 이미 갖춰졌지만 `menus`, `theme`, `reports`, `visits`, `system-tools`, `sms-messages`는 여전히 `manual-only` 또는 `form-only` evidence에 머물러 있었다. 이 상태에서는 감사 체계가 “폼 변환 함수는 맞다” 정도만 확인할 뿐, 실제 route-native 작업면이 흰 화면 없이 뜨고 핵심 query를 호출하는지까지는 자동으로 보장하지 못했다.
- What:
  - `g5-admin/src/features/{menus,theme,reports,visits,system-tools,sms-messages}` 아래에 `AdminMenusPage.test.tsx`, `AdminThemePage.test.tsx`, `AdminReportsPage.test.tsx`, `AdminVisitStatsPage.test.tsx`, `AdminPhpInfoPage.test.tsx`, `AdminSmsMessagesPage.test.tsx` smoke evidence를 추가해 intro/render/query wiring을 직접 고정했다.
  - `specs/domains/DOMAIN_COVERAGE.toml`는 위 6개 도메인의 새 `*Page.test.tsx`를 automated evidence에 등록해 machine-readable registry와 실제 smoke 증적이 일치하도록 맞췄다.
  - `specs/audits/2026-03-13-DOMAIN_COVERAGE_AUDIT.md`, `specs/audits/2026-03-12-RUST_ARCHITECTURE_AUDIT.md`, `specs/TODO.md`는 더 이상 residual coverage warning이 남지 않는 현재 상태로 갱신했다.
- 검증:
  - `cd g5-admin && bun x vitest run src/features/menus/AdminMenusPage.test.tsx src/features/theme/AdminThemePage.test.tsx src/features/reports/AdminReportsPage.test.tsx src/features/visits/AdminVisitStatsPage.test.tsx src/features/system-tools/AdminPhpInfoPage.test.tsx src/features/sms-messages/AdminSmsMessagesPage.test.tsx`
  - `python3 scripts/check_domain_coverage.py`
  - `bash scripts/run_deep_audit.sh`
  - `python3 scripts/doc-index.py`
  - `bash scripts/check-doc-governance.sh`

### route-native domain coverage registry와 SDD/smoke 감사를 상설화

- Why: 구조 감사와 contract 감사는 계속 강해졌지만, route-native domain이 실제로 SDD와 최소 smoke checklist를 갖는지는 여전히 사람이 `specs/domains`와 `*.test.ts(x)`를 눈으로 대조해야 했다. 이 상태에서는 새 작업면이 추가되거나 기존 문서가 낡아도 감사가 바로 드러내지 못하고, `reports`처럼 문서는 없고 구현만 있는 도메인이 계속 생길 수 있었다.
- What:
  - `specs/domains/DOMAIN_COVERAGE.toml`를 추가해 `contents`, `faqs`, `menus`, `mails`, `points`, `reports`, `visits`, `theme`, `security`, `system-tools`, `board-groups`, `layouts`, `system`, `sms-*` 17개 target의 SDD와 automated smoke evidence를 machine-readable registry로 고정했다.
  - `scripts/check_domain_coverage.py`를 추가해 required feature 누락, SDD 문서 누락, `## 최소 smoke checklist` 섹션 누락, automated evidence 파일 누락을 failure로 검사하고, `manual-only` 또는 `form-only` smoke evidence는 warning으로 표면화하도록 만들었다.
  - `scripts/run_deep_audit.sh`에 domain coverage audit를 편입했고, `specs/domains/README.md`, `specs/AUDIT_SYSTEM.md`, `specs/AUDIT_STRATEGY.md`, `specs/TODO.md`를 coverage registry 기준으로 정렬했다.
  - 누락된 route-native domain용 SDD로 `ADMIN_CONTENT_FAQ_SDD.md`, `ADMIN_MENU_LAYOUT_THEME_SDD.md`, `ADMIN_BOARD_GROUPS_POINTS_SDD.md`, `ADMIN_MAIL_REPORT_VISIT_SYSTEM_TOOLS_SDD.md`, `ADMIN_SECURITY_SDD.md`, `ADMIN_SMS_WORKSPACE_SDD.md`를 추가했고, 기존 `ADMIN_SMS_SDD.md`에도 최소 smoke checklist를 보강했다.
  - 감사 보고서는 `specs/audits/2026-03-13-DOMAIN_COVERAGE_AUDIT.md`에 남겼고, 이후 `T2-188`에서 `menus`, `theme`, `reports`, `visits`, `system-tools`, `sms-messages`의 page smoke까지 메워 coverage warning을 0으로 만들었다.
- 검증:
  - `python3 scripts/check_domain_coverage.py`
  - `python3 -m py_compile scripts/check_domain_coverage.py`
  - `bash scripts/run_deep_audit.sh`
  - `python3 scripts/doc-index.py`
  - `bash scripts/check-doc-governance.sh`

### `g5-admin-core` 첫 split 준비선을 감사 체계와 문서 SSOT로 고정

- Why: `g5-admin-models`를 분리한 뒤에도 다음 단계인 `g5-admin-core`는 “언제부터 옮겨도 되는가”가 감으로만 남아 있었다. `core/ports.rs`는 여전히 concrete adapter import/impl을 품고 있고, `SiteCatalogService`/`SecuritySettingsService`/`MasterLockService`는 각자 `AppState` runtime state에 깊게 붙어 있어, 준비선 없이 core crate를 바로 만들면 또 이름만 분리된 crate가 생길 위험이 컸다.
- What:
  - `scripts/core_split_readiness.py`를 추가해 `SessionService`, `SiteCatalogService`, `SecuritySettingsService`, `MasterLockService`의 blocker를 `AppState wrapper`, runtime flag, `SiteManager`, helper coupling 기준으로 자동 보고하게 만들었다.
  - `scripts/collect_architecture_metrics.py`는 `core_split_readiness` 섹션을 추가해 첫 외부 core 경계와 서비스별 blocker 수를 메트릭 출력에 포함시켰고, `scripts/check_active_crate_boundaries.py`도 `core_split_first_candidate` note를 남기게 정리했다.
  - `specs/foundation/APP_CORE_BOUNDARY_PLAN.md`는 첫 외부 core 경계를 `trait-only ports + SessionService`로 고정하고, `SiteCatalogService -> SecuritySettingsService -> MasterLockService` 순의 후속 준비 작업과 `core/ports.rs`의 trait/impl 분리 규칙을 SSOT로 기록했다.
- 검증:
  - `python3 scripts/collect_architecture_metrics.py`
  - `python3 scripts/check_active_crate_boundaries.py`
  - `python3 -m py_compile scripts/check_active_crate_boundaries.py scripts/collect_architecture_metrics.py scripts/ownership_watch.py scripts/core_split_readiness.py`
  - `bash scripts/run_deep_audit.sh`
  - `python3 scripts/doc-index.py`
  - `bash scripts/check-doc-governance.sh`

### 활성 크레이트 내부 경계 감사 5차로 ownership/source-of-truth drift를 상설 감시

- Why: 4차 감사까지는 `commands -> concrete infra`, transaction boundary, service ownership hotspot, `core::ports` concrete coupling 같은 구조 냄새는 잡고 있었지만, 여전히 “같은 사실을 누가 소유하느냐”와 “frontend registry끼리 서로 맞물리는가”는 수동 확인에 의존했다. 이 상태에서는 `navigation-manifest`, `api-target-registry`, `command-context` builder map, IPC registry가 다시 따로 진화해도 구조 감사가 놓칠 수 있었다.
- What:
  - `scripts/ownership_watch.py`를 추가해 `navigation apiTargets`, `AdminFieldSchemaDomain`, `commandContextBuilders`, `apiTargetsByCommand`, `app_invoke_handler!`의 source-of-truth owner를 공통 파서로 읽도록 만들었다.
  - 같은 helper는 `command-context builders ↔ api-target-registry ↔ IPC registry` command set 정합성과 `navigation-manifest apiTargets ↔ api-target-registry` path 정합성도 함께 계산하며, 승인된 IPC-only command(`cmd_admin_dashboard_get`, `cmd_auth_refresh`, debug capture 2건, `cmd_system_health`)는 note로만 남기게 했다.
  - `scripts/check_active_crate_boundaries.py`는 이제 source-of-truth 충돌과 registry alignment drift를 failure로, `navigation-manifest`/`core::ports` 같은 giant registry-orchestrator 우선순위와 `core::ports` concrete impl budget을 warning으로 출력한다.
  - `scripts/collect_architecture_metrics.py`도 같은 helper를 읽어 `source_of_truth_watch`, `registry_alignment_watch`, `giant_registry_orchestrator_priority` 섹션을 추가했고, `specs/AUDIT_SYSTEM.md`, `specs/TODO.md`, `specs/audits/2026-03-12-RUST_ARCHITECTURE_AUDIT.md`는 5차 감사 범위를 현재 구조 기준으로 반영했다.
- 검증:
  - `python3 scripts/check_active_crate_boundaries.py`
  - `python3 scripts/collect_architecture_metrics.py`
  - `python3 -m py_compile scripts/check_active_crate_boundaries.py scripts/collect_architecture_metrics.py scripts/ownership_watch.py`
  - `bash scripts/run_deep_audit.sh`
  - `python3 scripts/doc-index.py`
  - `bash scripts/check-doc-governance.sh`

### 구조/통합 감사 summary naming을 `Failure / Warning / Note / Evidence`로 통일

- Why: waiver registry와 수기 보고 템플릿을 도입한 뒤에도 generated integrated report와 structure CI summary는 여전히 제각각 제목과 순서를 쓰고 있었다. 이 상태에서는 사람이 감사 결과를 읽을 때 문서 템플릿, CI 요약, generated report를 서로 다른 언어로 해석해야 했고, AI도 어떤 섹션 이름을 기준으로 결과를 인용해야 하는지 흔들릴 수 있었다.
- What:
  - `scripts/check_active_crate_boundaries.py`와 `scripts/check_audit_waivers.py`가 GitHub step summary에 `Failure / Warning / Note / Evidence / Waived` 형식의 Markdown 요약을 남기도록 확장했다.
  - `scripts/run_integrated_audit.py`는 JSON summary에 `notes`, `evidence`, `waived`를 추가하고 generated Markdown 보고서도 같은 summary naming을 상단 섹션으로 사용하도록 재구성했다.
  - `specs/AUDIT_SYSTEM.md`, `specs/integration/INTEGRATED_AUDIT_STANDARD.md`, `specs/TODO.md`는 구조/통합/수기 감사가 동일한 summary 제목 체계를 사용한다는 기준을 문서 SSOT로 고정했다.
- 검증:
  - `python3 scripts/run_integrated_audit.py --rust-root /Users/neojins/workspace/gnuboard5/rust --php-root /Users/neojins/workspace/gnuboard5/php`
  - `python3 scripts/check_active_crate_boundaries.py`
  - `python3 scripts/check_audit_waivers.py`
  - `bash scripts/check-doc-governance.sh`
  - `python3 scripts/doc-index.py`

### 감사 예외 registry와 수기 보고 템플릿을 운영 체계에 편입

- Why: 감사 운영 SSOT를 분리한 뒤에도 warning/failure 예외는 여전히 채팅이나 수기 메모에 의존할 위험이 있었다. 이 상태에서는 허용된 구조 부채가 언제 끝나야 하는지, 누가 소유하는지, 실제 finding이 아직 살아 있는지 자동으로 추적할 수 없어 감사 체계가 다시 임시 승인 문화로 미끄러질 수 있었다.
- What:
  - `specs/audits/WAIVERS.toml`를 active waiver registry로 추가하고, `scripts/check_audit_waivers.py`가 만료, 중복 target, orphan waiver를 구조 감사와 같은 실행 경로에서 검증하도록 연결했다.
  - `scripts/check_active_crate_boundaries.py`는 waiver를 적용하되 `waived` 섹션을 별도로 출력해 허용된 구조 부채가 결과에서 사라지지 않도록 바꿨다.
  - `specs/foundation/AUDIT_REPORT_TEMPLATE.md`를 추가하고, `specs/AUDIT_SYSTEM.md`, `AGENTS.md`, `README.md`, `specs/README.md`, `.agent/workflows/{architecture-audit,codex-audit}.md`에 waiver/report 운영 규칙을 반영했다.
- 검증:
  - `python3 scripts/check_audit_waivers.py`
  - `python3 scripts/check_active_crate_boundaries.py`
  - `bash scripts/run_deep_audit.sh`
  - `python3 scripts/doc-index.py`
  - `bash scripts/check-doc-governance.sh`

### 감사 운영 SSOT를 분리하고 헌법/전략/워크플로를 재정렬

- Why: 기존에는 감사 운영 규칙이 `.agent/Constitution.md`, `specs/AUDIT_STRATEGY.md`, `.agent/workflows/*.md`, `AGENTS.md`에 동시에 퍼져 있어, 헌법이 비대해지고 워크플로 설명서가 운영 규칙과 섞이는 문제가 있었다. 이 상태에서는 “무엇이 최고 규범인지”, “무엇이 실행 SSOT인지”, “무엇이 설명서인지”가 흐려져 문서와 스크립트의 괴리가 다시 생기기 쉬웠다.
- What:
  - `specs/AUDIT_SYSTEM.md`를 추가해 감사 분류, 실행 매트릭스, failure/warning/note 의미, 필수 산출물, 문서 계층, 실행 진입점을 한 문서에 고정했다.
  - `specs/AUDIT_STRATEGY.md`는 운영 절차를 걷어내고, Rust 감사의 목표·책임 경계·원칙을 설명하는 전략 문서로 축소했다.
  - `.agent/Constitution.md`는 활성 크레이트 구조 감사의 최고 규범만 남기고, 운영 세부는 `specs/AUDIT_SYSTEM.md`를 참조하도록 정리했다.
  - `AGENTS.md`, `README.md`, `specs/README.md`, `.agent/workflows/{codex-audit,architecture-audit,rust-php-parity-audit,integrated-three-way-audit}.md`는 모두 새 감사 운영 SSOT를 참조하도록 갱신했다.
- 검증:
  - `python3 scripts/doc-index.py`
  - `bash scripts/check-doc-governance.sh`

### 활성 크레이트 내부 경계 감사 4차: method/transaction/ports drift를 자동 표면화

- Why: 3차 감사까지는 `파일이 큰가`, `service가 backend seam을 몇 개 잡는가` 정도만 보였다. 그런데 실제 구조 부채는 `함수 하나가 어떤 backend를 동시에 건드리는지`, `transaction boundary가 db 밖으로 새는지`, `core::ports`가 여전히 concrete adapter를 품고 있는지`에서 먼저 터진다. 이걸 자동으로 못 잡으면 AI가 “service 한 함수에 조금 더 붙이기”, “ports.rs에 impl 하나 더 추가하기” 같은 글루코딩을 계속 쌓게 된다.
- What:
  - `scripts/check_active_crate_boundaries.py`에 `service_method_ownership_hotspot`, `transaction_boundary_violation`, `core_ports_concrete_coupling` 규칙을 추가했다.
  - `scripts/collect_architecture_metrics.py`는 `app_state_service_hotspots`, `transaction_boundary_watch`, `core_ports_watch` 섹션을 추가해 구조 감사 결과가 file-level 메트릭을 넘어 실제 ownership/transaction drift를 읽을 수 있게 확장했다.
  - `.agent/Constitution.md`, `specs/AUDIT_STRATEGY.md`, `specs/TODO.md`는 이 4차 규칙을 상설 감사 범위로 승격했고, 다음 단계는 `ownership map/source-of-truth 충돌` 자동 판정으로 넘겼다.
- 검증:
  - `python3 scripts/check_active_crate_boundaries.py`
  - `python3 scripts/collect_architecture_metrics.py`
  - `python3 -m py_compile scripts/check_active_crate_boundaries.py scripts/collect_architecture_metrics.py`

### `g5-admin-models` purity 감사를 구조 감사에 추가

- Why: `g5-admin-models`를 실제 workspace member로 분리한 직후 가장 큰 리스크는 이 crate가 다시 `reqwest`, `tauri`, `rusqlite`, `keyring` 같은 runtime/infra 의존을 흡수해 “이름만 models crate”가 되는 것이다. 계약 crate가 한 번 오염되면 이후 core/infra 분리의 기준선이 무너진다.
- What:
  - `scripts/check_active_crate_boundaries.py`가 이제 `g5-admin-models/src/**`를 직접 검사해 `reqwest`, `rusqlite`, `tauri`, `tokio`, `keyring`, shell/infra module import를 `models_crate_purity_violation` 실패로 잡는다.
  - `.agent/Constitution.md`, `specs/AUDIT_STRATEGY.md`, `specs/TODO.md`는 `g5-admin-models`를 활성 models crate로 명시하고, purity 규칙을 active crate boundary audit의 상설 범위로 승격했다.
- 검증:
  - `python3 scripts/check_active_crate_boundaries.py`
  - `python3 -m py_compile scripts/check_active_crate_boundaries.py`

### `g5-admin-models`를 실제 workspace member로 분리하고 `src-tauri`는 re-export만 남김

- Why: `models <-> error` 순환을 끊은 뒤에도 실제 코드는 여전히 `g5-admin/src-tauri/src/models/**` 아래에 남아 있었고, 이 상태에서는 crate split 준비가 아니라 문서상 후보에 머물렀다. 다음 단계로 가려면 `DTO/ts-rs 계약 surface`를 진짜 외부 crate로 옮기고도 기존 `crate::models::*` 호출부가 깨지지 않는다는 것을 먼저 증명해야 했다.
- What:
  - workspace member `g5-admin-models`를 추가하고, 기존 `g5-admin/src-tauri/src/models/**` 전체를 `g5-admin-models/src/models/**`로 이동했다.
  - `g5-admin/src-tauri/src/lib.rs`는 `mod models;`를 제거하고 `pub use g5_admin_models::models;`만 남겨, 기존 `crate::models::*` import를 대량 수정하지 않고도 유지하게 만들었다.
  - 새 crate에는 `serde`, `serde_json`, `ts-rs`만 남기고, `ts-rs export_to` 경로와 export harness를 새 `bindings -> ../../g5-admin/src/types` 기준으로 보정했다.
  - `scripts/check_active_crate_boundaries.py`, `.agent/Constitution.md`, `specs/AUDIT_STRATEGY.md`, `specs/TODO.md`, `specs/foundation/APP_CORE_BOUNDARY_PLAN.md`는 활성 구현 크레이트가 `g5-admin-models + g5-admin/src-tauri` 2개라는 현재 구조와 다음 단계 `g5-admin-core` 준비 기준으로 갱신했다.
- 검증:
  - `cargo check --manifest-path Cargo.toml --quiet`
  - `cargo test --manifest-path Cargo.toml -p g5-admin-models --quiet`
  - `cargo test --manifest-path g5-admin/src-tauri/Cargo.toml --lib --quiet`

### 활성 크레이트 내부 경계 감사 3차로 service ownership hotspot을 표면화

- Why: `commands -> concrete infra`와 `AppState wrapper bypass`를 막아도, 실제 ownership drift는 여전히 `app_state/*service.rs` 안에 여러 backend seam이 한 service에 몰리는 방식으로 남는다. 이건 당장 실패로 볼 문제는 아니지만, crate split과 transaction boundary 정리 우선순위를 정할 때 반드시 보이는 숫자로 드러나야 한다.
- What:
  - `scripts/check_active_crate_boundaries.py`가 이제 `app_state/*service.rs`에서 `session_store`, `site_catalog_store`, `security_store`, `backup_store`, `admin_api`, `site_manager` 중 3개 이상을 동시에 잡는 service를 `service_ownership_hotspot` 경고로 표면화한다.
  - 현재 기준으로 `master_lock_service`, `security_settings_service`, `site_catalog_service`가 ownership hotspot으로 구조 감사에 나타나며, 이 결과는 crate split / service 분해 우선순위 판단의 근거로 사용한다.
  - `.agent/Constitution.md`, `specs/AUDIT_STRATEGY.md`, `specs/TODO.md`는 3차 자동화 범위와 남은 4차 과제(`method-level ownership drift`, `transaction boundary`, `service/core::ports ownership`)를 현재 상태에 맞게 갱신했다.
- 검증:
  - `python3 scripts/check_active_crate_boundaries.py`
  - `python3 -m py_compile scripts/check_active_crate_boundaries.py`

### 활성 크레이트 내부 경계 감사 2차로 AppState wrapper bypass와 root orchestrator 경고를 추가

- Why: 1차 자동화만으로는 `commands -> concrete infra` 같은 직접 결합은 잡아도, 다시 `AppState` wrapper 메서드로 우회하거나 `commands/registry.rs`, `error/mod.rs` 같은 root module이 서서히 비대해지는 흐름을 막지 못한다. 이 둘은 AI가 구조를 어기지 않고도 글루코딩을 계속 누적시키는 전형적인 경로다.
- What:
  - `scripts/check_active_crate_boundaries.py`가 이제 `commands -> AppState` 직접 wrapper 호출을 `admin_api`, `database_path`, service accessor 이외에는 실패로 간주한다.
  - 같은 스크립트는 `g5-admin/src-tauri/src/error/mod.rs`, `g5-admin/src-tauri/src/commands/registry.rs` 등 root orchestrator/module 후보의 LOC 허용치도 읽어 warning/failure로 표면화한다.
  - `specs/AUDIT_STRATEGY.md`, `.agent/Constitution.md`, `specs/TODO.md`는 2차 자동화 범위와 남은 3차 과제(`ownership drift`, `transaction boundary`, `service/core::ports ownership`)를 현재 기준으로 갱신했다.
- 검증:
  - `python3 scripts/check_active_crate_boundaries.py`
  - `python3 -m py_compile scripts/check_active_crate_boundaries.py`

### `g5-admin-models` 첫 split 착수 가능 상태를 판정하고 `models <-> error` 순환을 제거

- Why: `AdminApiPort`, `SessionStorePort`, `SiteCatalogStorePort`, `SecurityStorePort`, `BackupStorePort`와 service direct-call 정리까지 끝난 뒤 다음 자연스러운 단계는 `g5-admin-models` 분리 가능성 판정이었다. 그런데 실제 코드 기준 첫 blocker는 `models/auth.rs`가 `error::ErrorGuide`를 참조해 `models <-> error` 순환을 만들고 있던 점이었다.
- What:
  - `g5-admin/src-tauri/src/models/problem.rs`를 추가해 `ErrorGuide`, `ProblemMeta`, `ProblemDetails`, `AppErrorPayload`를 모델 계약으로 승격했다.
  - `models/auth.rs`에서 `ProblemMeta`/`ProblemDetails`를 제거했고, `error/payload.rs`와 `api_client/problem.rs`는 새 모델 계약을 소비하도록 정리했다.
  - 이 배치로 첫 split 후보는 문서상 가정이 아니라 실제 코드 기준으로도 `g5-admin-models`가 맞는 상태가 됐고, 다음 작업은 workspace member 추가와 `ts-rs` export 경로 조정으로 좁혀졌다.
- 검증:
  - `cargo fmt --manifest-path g5-admin/src-tauri/Cargo.toml`
  - `cargo check --manifest-path g5-admin/src-tauri/Cargo.toml --quiet`
  - `cargo test --manifest-path g5-admin/src-tauri/Cargo.toml --lib --quiet`

### 활성 크레이트 내부 경계 감사를 실제 구조 감사 스크립트/CI로 승격

- Why: 경계 감사가 헌법/문서에만 있으면 AI 주도 개발에서 금방 잊히고, 다시 `commands -> concrete infra`, `legacy` 누수, `shared/common` 하수구화가 누적된다. 현재 Rust workspace는 이름상 workspace여도 구조 리스크 대부분이 `g5-admin/src-tauri` 단일 활성 크레이트에 몰려 있으므로, active crate 내부 경계를 로컬/CI에서 실제로 강제할 필요가 있었다.
- What:
  - `scripts/check_active_crate_boundaries.py`를 추가해 `commands -> db/token_store/runtime_config/api_client/site_manager` concrete import, `legacy.rs` quarantine 위반, `shared/common` 최상위 namespace의 concrete IO leak, placeholder crate 분리를 자동 검사하도록 만들었다.
  - `scripts/run_deep_audit.sh`는 이제 implementation baseline + consumer baseline + architecture metrics 뒤에 active crate boundary audit을 상설 실행한다.
  - `.github/workflows/structure.yml`을 추가해 `bun run audit:structure`가 PR/push마다 CI에서 강제되도록 했다.
  - `.agent/Constitution.md`, `specs/AUDIT_STRATEGY.md`, `specs/TODO.md`는 1차 자동화 범위와 남은 2차 과제(`ownership drift`, `giant orchestrator`, `transaction boundary`)를 현재 상태에 맞게 갱신했다.
- 검증:
  - `python3 scripts/check_active_crate_boundaries.py`
  - `python3 scripts/doc-index.py`
  - `bash scripts/check-doc-governance.sh`

### `site/security/master_lock/session` command를 service direct-call 구조로 정리

- Why: `AdminApiPort`, `SessionStorePort`, `SiteCatalogStorePort`, `SecurityStorePort`, `BackupStorePort`까지 세운 뒤에도 일부 Tauri command와 shared helper는 여전히 `AppState` wrapper 메서드를 경유하고 있었다. 이 상태에서는 port는 생겼지만 `command -> service -> port -> infra` 경계가 코드에서 완전히 드러나지 않아, 다음 crate split에서 다시 wrapper 정리 비용이 남을 수 있었다.
- What:
  - `g5-admin/src-tauri/src/app_state/mod.rs`에 `site_catalog_service()`, `security_settings_service()`, `master_lock_service()`, `session_service()` factory accessor를 두고, `commands/site/{shared/catalog,mutations}.rs`, `commands/activity.rs`, `commands/debug.rs`, `commands/security/{settings,fast_unlock,totp}.rs`, `commands/master_lock.rs`, `commands/auth/{shared,session}.rs`, `commands/common.rs`가 더 이상 `AppState` wrapper 메서드 대신 service direct-call을 사용하도록 정리했다.
  - `SiteCatalogService`는 `delete_site`에 `SiteDeleteInput` 전체를 받아 민감 작업 검증과 session 정리까지 소유하도록 바꿨고, `activity_list`도 service 책임으로 승격했다.
  - 예전 `AppState` entry wrapper 중 production에서 더 이상 쓰지 않는 session helper는 제거했고, tests만 사용하는 master-lock/security/sites wrapper는 `#[cfg(test)]` 경계 안의 호환 API로 한정해 런타임 노이즈를 줄였다.
- 검증:
  - `cargo fmt --manifest-path g5-admin/src-tauri/Cargo.toml`
  - `cargo check --manifest-path g5-admin/src-tauri/Cargo.toml --quiet`
  - `cargo test --manifest-path g5-admin/src-tauri/Cargo.toml --lib --quiet`

### 활성 크레이트 내부 경계 감사를 헌법/감사 전략에 승격

- Why: 현재 Rust workspace는 이름상 workspace지만, 실질 구조 리스크는 여러 크레이트 사이보다 `g5-admin/src-tauri` 단일 활성 크레이트 내부에 몰려 있다. 기존 `audit:structure`는 implementation/consumer baseline과 메트릭은 잡지만, `commands -> db/token_store concrete 결합`, `legacy quarantine 위반`, `shared/common 하수구화` 같은 active crate 내부 경계 위반을 강하게 설명하지 못했다. AI 주도 개발이 길어질수록 이 빈틈이 곧 글루코딩과 구조 드리프트로 이어질 가능성이 높다.
- What:
  - `.agent/Constitution.md`에 `§12.1 활성 크레이트 구조/경계 감사`를 추가해 placeholder crate 취급, active crate(`g5-admin/src-tauri`) 우선 감사, `commands -> app/service/core::ports -> infra` 의존 방향, `shared/common` 제한, `legacy.rs` quarantine, 구조 변경 시 `audit:structure` 필수 실행을 헌법 규칙으로 승격했다.
  - `specs/AUDIT_STRATEGY.md`는 workspace 층과 active crate 층을 분리해 설명하고, 현재 `audit:structure` 자동화가 메트릭 중심이며 내부 경계 위반 강제는 아직 불완전하다는 사실을 명시했다.
  - `specs/TODO.md`에 `T2-175 활성 크레이트 내부 경계 감사 자동화`를 추가해 후속 스크립트화 범위를 등록했다.
- 검증:
  - `python3 scripts/doc-index.py`
  - `bash scripts/check-doc-governance.sh`

### `AdminApiPort`를 도입해 auth/session과 active-site base URL 적용도 포트 경유로 정리

- Why: `SessionStorePort`, `SiteCatalogStorePort`, `SecurityStorePort`, `BackupStorePort`를 세운 뒤에도 `auth/session` 흐름과 active-site 전환의 base URL 적용은 여전히 concrete `ApiClient`를 직접 보고 있었다. 이 상태에서는 저장소 쪽만 포트화되고 HTTP 경계는 그대로 남아 있어, command/service가 infra 추상 경계로 정렬되지 못한 상태였다.
- What:
  - `g5-admin/src-tauri/src/core/ports.rs`에 `AdminApiPort`를 추가하고 `ApiClient`가 이를 구현하도록 정리했다.
  - `g5-admin/src-tauri/src/app_state/mod.rs`에는 `admin_api()` accessor를 추가했다.
  - `g5-admin/src-tauri/src/app_state/site_catalog_service.rs`는 active-site 변경 시 base URL 적용을 `admin_api().set_base_url()` 경유로 바꿨다.
  - `g5-admin/src-tauri/src/commands/auth/{session,shared}.rs`, `commands/common.rs`, `commands/member/queries.rs`, `commands/debug.rs`는 login/refresh/logout/my-profile/current-base-url 조회를 concrete `ApiClient` 대신 `AppState.admin_api()` 경유로 정리했다.
  - 이 배치로 app-core에서 계획한 최소 포트(`AdminApiPort`, `SessionStorePort`, `SiteCatalogStorePort`, `SecurityStorePort`, `BackupStorePort`)가 모두 실제 코드에 존재하게 됐고, 남은 일은 service/command direct-call 경계 정리와 crate split 착수 가능성 판정 수준으로 좁혀졌다.
- 검증:
  - `cargo fmt --manifest-path g5-admin/src-tauri/Cargo.toml`
  - `cargo check --manifest-path g5-admin/src-tauri/Cargo.toml --quiet`
  - `cargo test --manifest-path g5-admin/src-tauri/Cargo.toml --lib --quiet`

### `SecurityStorePort`·`BackupStorePort`를 도입해 보안 서비스의 concrete 저장소 의존을 더 줄임

- Why: `SessionStorePort`, `SiteCatalogStorePort`를 세운 뒤에도 `SecuritySettingsService`, `MasterLockService`, 그리고 `build_totp` helper는 여전히 concrete `SiteRepository`를 직접 보고 있었다. 이 상태에서는 app-core 서비스 경계가 있어도 로컬 보안/백업 축은 아직 repository 구현에 묶여 있어, 다음 crate split 직전에 다시 큰 정리가 필요했다.
- What:
  - `g5-admin/src-tauri/src/core/ports.rs`에 `SecurityStorePort`, `BackupStorePort`를 추가하고 `SiteRepository`가 이를 구현하도록 정리했다.
  - `g5-admin/src-tauri/src/app_state/mod.rs`에는 `security_store()`, `backup_store()` accessor를 추가했다.
  - `g5-admin/src-tauri/src/app_state/security_settings_service.rs`는 앱 잠금 비밀번호 검증, idle timeout/TOTP/fast unlock 설정, 백업 export/import를 concrete repository 대신 새 port 경유로 바꿨고, activity 기록은 기존 `SiteCatalogStorePort`를 계속 사용하도록 유지했다.
  - `g5-admin/src-tauri/src/app_state/master_lock_service.rs`와 `app_state/master_lock/totp.rs`도 앱 잠금 상태, unlock rate-limit, TOTP secret 조회를 `SecurityStorePort` 경유로 바꿨다.
  - 이 배치로 app-core service 경계는 `site/session/security/master_lock` 네 축 모두 최소 port 경유를 갖게 됐고, 다음 단계는 `AdminApiPort` 또는 command의 service direct-call 정리처럼 더 바깥 경계로 넘어갈 수 있게 됐다.
- 검증:
  - `cargo fmt --manifest-path g5-admin/src-tauri/Cargo.toml`
  - `cargo check --manifest-path g5-admin/src-tauri/Cargo.toml --quiet`
  - `cargo test --manifest-path g5-admin/src-tauri/Cargo.toml --lib --quiet`

### 최소 `port`를 도입해 service가 concrete infra 대신 추상 경계를 통하도록 정리

- Why: `SessionService`, `SiteCatalogService`, `SecuritySettingsService`, `MasterLockService`를 세운 뒤에도 실제 구현은 여전히 `TokenStore`, `SiteRepository` concrete 타입을 직접 보고 있었다. 이 상태에서는 service가 생겨도 crate split 직전에 다시 concrete 의존을 걷어내야 하므로, 문서상 계획과 실코드 사이에 마지막 큰 간극이 남아 있었다.
- What:
  - `g5-admin/src-tauri/src/core/ports.rs`와 `core/mod.rs`를 추가해 `SessionStorePort`, `SiteCatalogStorePort`를 도입했다.
  - `TokenStore`는 active-site 세션 load/save/clear, per-site session clear, active-site id 변경/조회에 대한 `SessionStorePort` 구현을 가졌고, `SiteRepository`는 site catalog CRUD, session hint, activity 기록에 대한 `SiteCatalogStorePort` 구현을 갖도록 정리했다.
  - `g5-admin/src-tauri/src/app_state/mod.rs`에는 `session_store()`, `site_catalog_store()` accessor를 추가했고, `SessionService`, `SiteCatalogService`는 더 이상 concrete field에 직접 붙지 않고 port 경유로 동작하도록 바꿨다.
  - 이 배치로 `service -> AppState accessor -> port trait -> concrete impl` 경로가 실제 코드에 생겼고, 다음 단계인 `SecurityStorePort` 최소 도입과 crate split 준비선이 더 명확해졌다.
- 검증:
  - `cargo fmt --manifest-path g5-admin/src-tauri/Cargo.toml`
  - `cargo check --manifest-path g5-admin/src-tauri/Cargo.toml --quiet`
  - `cargo test --manifest-path g5-admin/src-tauri/Cargo.toml --lib --quiet`

### `SessionService`를 도입해 active-site 세션 수명주기를 command helper에서 분리

- Why: `MasterLockService`까지 세운 뒤에도 active-site 세션 load/save/clear와 session hint 갱신은 여전히 `commands/common.rs`와 `commands/auth/shared.rs`가 직접 `token_store + local-site-db`를 조합하고 있었다. 이 상태에서는 app-core service boundary가 있어도 실제 인증/세션 흐름은 command helper에 묶여 있어 다음 포트 분리의 병목으로 남는다.
- What:
  - `g5-admin/src-tauri/src/app_state/session_service.rs`를 추가해 active-site 세션 load/save/clear와 session hint 갱신을 `SessionService`로 모았다.
  - `g5-admin/src-tauri/src/app_state/mod.rs`에는 `load_active_site_session`, `save_active_site_session`, `clear_active_site_session`, `set_active_site_session_hint` service entry를 추가했다.
  - `g5-admin/src-tauri/src/commands/common.rs`, `commands/auth/shared.rs`, `commands/auth/session.rs`는 더 이상 `token_store.save/load/clear_session`과 local-site-db hint 갱신을 직접 엮지 않고 `AppState` service entry를 경유하도록 정리했다.
  - 이 배치로 `SessionService`가 계획 문서의 추상 개념이 아니라 실제 인증/refresh/logout flow에 연결됐고, 다음 단계는 service entry를 뒷받침할 최소 `port` trait 도입으로 좁혀졌다.
- 검증:
  - `cargo fmt --manifest-path g5-admin/src-tauri/Cargo.toml`
  - `cargo check --manifest-path g5-admin/src-tauri/Cargo.toml --quiet`
  - `cargo test --manifest-path g5-admin/src-tauri/Cargo.toml --lib --quiet`

### `MasterLockService`를 도입해 앱 잠금 상태 전이와 unlock rate-limit을 AppState에서 분리

- Why: `SecuritySettingsService`까지 세운 뒤에도 앱 잠금 상태 조회, setup/lock, 비밀번호 unlock, 빠른 잠금 해제, OTP challenge 완료, unlock 실패 누적과 lockout 계산은 여전히 `app_state/master_lock/*`에 흩어져 있었다. 이 축은 로컬 보안 설정과 별도 책임인데도 `AppState`가 직접 상태 전이를 들고 있어 다음 DI/crate split 단계의 병목으로 남아 있었다.
- What:
  - `g5-admin/src-tauri/src/app_state/master_lock_service.rs`를 추가해 앱 잠금 상태 조회, setup/lock, 비밀번호 unlock, 빠른 잠금 해제 unlock, OTP unlock 완료, unlock 실패 누적/lockout 계산을 `MasterLockService`로 모았다.
  - `g5-admin/src-tauri/src/app_state/master_lock/{status,unlock,totp}.rs`는 새 service로 위임하는 public entry wrapper로 정리했고, 더 이상 독립 책임이 없어진 `master_lock/lockout.rs`는 제거했다.
  - 이 배치로 로컬 앱 잠금 흐름은 `AppState -> MasterLockService -> concrete infra` 경계를 갖게 됐고, 다음 service seam 후보는 세션 수명과 active-site session hint를 다루는 `SessionService` 수준으로 좁혀졌다.
- 검증:
  - `cargo fmt --manifest-path g5-admin/src-tauri/Cargo.toml`
  - `cargo check --manifest-path g5-admin/src-tauri/Cargo.toml --quiet`
  - `cargo test --manifest-path g5-admin/src-tauri/Cargo.toml --lib --quiet`

### `SecuritySettingsService`를 도입해 로컬 보안 흐름을 AppState에서 분리

- Why: `SiteCatalogService`를 먼저 세운 뒤에도 로컬 보안 축은 여전히 `AppState`가 직접 들고 있었다. 보안 설정 조회/변경, 빠른 잠금 해제, 백업 import/export, TOTP 등록/활성화/비활성화가 `app_state/security/*` wrapper에 흩어져 있었고, 실제 로직 경계는 문서에만 있는 상태였다.
- What:
  - `g5-admin/src-tauri/src/app_state/security_settings_service.rs`를 추가해 보안 설정 조회/변경, 현재 비밀번호/TOTP 기반 민감 작업 검증, 빠른 잠금 해제 on/off, 백업 export/import, TOTP enrollment/verify/disable 흐름을 `SecuritySettingsService`로 모았다.
  - `g5-admin/src-tauri/src/app_state/security/{mod,settings,fast_unlock,backup,totp}.rs`는 새 service로 위임하는 wrapper로 정리해, `AppState -> SecuritySettingsService -> concrete infra` 경계를 실제 코드에 세웠다.
  - 이 배치로 `site` 축 다음 우선 대상이던 `security` 축도 `AppState` 직접 구현에서 분리되기 시작했고, 이후 `MasterLockService`/`SessionService` seam으로 이어질 준비선을 확보했다.
- 검증:
  - `cargo fmt --manifest-path g5-admin/src-tauri/Cargo.toml`
  - `cargo check --manifest-path g5-admin/src-tauri/Cargo.toml --quiet`
  - `cargo test --manifest-path g5-admin/src-tauri/Cargo.toml --lib --quiet`

### `SiteCatalogService`를 도입해 AppState의 첫 service seam을 실제 코드로 고정

- Why: `T2-113`으로 포트/서비스 계획 문서를 만든 뒤에도 실제 코드는 여전히 `AppState`가 site catalog 조회, active site 전환, site CRUD, reload/load orchestration을 직접 들고 있었다. 계획 문서만 있고 첫 seam이 코드에 없으면 다음 단계가 다시 설명으로만 머물 가능성이 높았다.
- What:
  - `g5-admin/src-tauri/src/app_state/site_catalog_service.rs`를 추가해 site catalog 조회, active site 조회/전환, site add/update/delete, `reload_sites`, `ensure_sites_loaded`, `apply_active_site` 책임을 `SiteCatalogService`로 모았다.
  - `g5-admin/src-tauri/src/app_state/mod.rs`의 `reload_sites`, `ensure_sites_loaded`, `apply_active_site`는 새 service에 위임하도록 바꿨고, `g5-admin/src-tauri/src/app_state/sites.rs`는 마스터 잠금/민감 작업 검증 후 service entry만 호출하는 wrapper로 정리했다.
  - 이 배치로 `site` 축은 `AppState` 직접 구현에서 `AppState -> SiteCatalogService -> concrete infra` 형태의 첫 service seam을 갖게 됐다.
- 검증:
  - `cargo fmt --manifest-path g5-admin/src-tauri/Cargo.toml`
  - `cargo check --manifest-path g5-admin/src-tauri/Cargo.toml --quiet`
  - `cargo test --manifest-path g5-admin/src-tauri/Cargo.toml --lib --quiet`

### app-core 경계/DI/crate split 착수 순서를 지원 문서로 고정

- Why: 구조 리팩터링 1차가 끝난 뒤에도 다음 단계는 “어디를 trait로 세우고 어떤 순서로 crate를 자를지”가 문서로 확정돼 있지 않았다. 이 상태로 바로 crate split에 들어가면 `concrete 타입 이동`만 일어나고 결합은 그대로 남을 위험이 있었다.
- What:
  - `specs/foundation/APP_CORE_BOUNDARY_PLAN.md`를 추가해 현재 seam인 `AppStateDependencies -> AppState::from_dependencies`를 시작점으로 `ApiClient`, `TokenStore`, `SiteRepository`, `SiteManager`의 목표 포트 경계를 명시했다.
  - 같은 문서에 `SiteCatalogService`, `MasterLockService`, `SecuritySettingsService`, `SessionService`의 책임과 입력 포트를 적고, `g5-admin-models -> g5-admin-core -> g5-admin-infra -> g5-admin-command` crate split 순서를 고정했다.
  - `specs/foundation/README.md`, `specs/README.md`, `specs/TODO.md`를 함께 갱신해 이 문서가 foundation 읽기 순서와 작업 레지스터에 반영되도록 맞췄다.

### `navigation` giant mixed file을 route/type/manifest/helper 구조로 재편

- Why: `g5-admin/src/features/layout/navigation.ts 912`는 route 상수, nav manifest 데이터, `flatNavigationItems` 파생, route resolve/build helper를 한 파일에 함께 두고 있었다. 이건 line budget보다 mixed concern이 문제였고, 무작정 더 자르기보다 단일 manifest 구조를 유지한 채 혼합 책임만 분리하는 편이 맞았다.
- What:
  - `g5-admin/src/features/layout/navigation-types.ts`, `navigation-routes.ts`, `navigation-manifest.ts`, `navigation-helpers.ts`를 추가해 타입, route 상수, nav 데이터, 파생 helper를 분리했다.
  - `g5-admin/src/features/layout/navigation.ts`는 `4 LOC` 공개 barrel로 바꿔 기존 import 경로를 유지했고, `adminRouteRegistry.tsx`, `AppShellHeader.tsx`, 테스트 코드는 그대로 `./navigation`을 소비하도록 두었다.
  - 최종 길이는 `navigation.ts 4`, `navigation-routes.ts 58`, `navigation-helpers.ts 107`, `navigation-types.ts 24`, `navigation-manifest.ts 779 LOC`다. 남은 큰 파일은 mixed hotspot이 아니라 의도된 data manifest 하나로 정리됐다.
- 검증:
  - `cd g5-admin && bun x tsc --noEmit`
  - `cd g5-admin && bun run lint`
  - `cd g5-admin && bun x vitest run src/features/layout/navigation.test.ts src/app/adminRouteRegistry.test.tsx src/features/layout/AppShell.test.tsx`

### Rust 감사 체계를 소비자 기준 `구조 / 구현 / 소비 계약`으로 재분류

- Why: 형님이 요구한 기준은 PHP 공급자 감사와 Rust 소비단 감사를 한데 섞지 않고, Rust가 실제로 무엇을 읽고 적용하는지에 대한 책임을 Rust 저장소 안에서 직접 판단하게 만드는 것이었다. 기존 `standard / contract / deep / integrated` 실행 자산은 있었지만, 왜 `contract`가 소비자 감사이고 PHP의 DB parity는 Rust 책임이 아닌지 문서상 충분히 분리되어 있지 않았다.
- What:
  - `specs/AUDIT_STRATEGY.md`, `AGENTS.md`, `README.md`, `specs/README.md`를 갱신해 Rust 감사 책임을 `구현 감사`, `소비 계약 감사`, `구조 감사`, `통합 감사`로 재분류하고, PHP 공급자 감사와의 경계를 명문화했다.
  - `g5-admin/package.json`에 `audit:implementation`, `audit:consumer`, `audit:structure` alias를 추가하고, `scripts/run_{standard,contract,deep}_audit.sh` 출력도 역할 이름 기준으로 맞췄다.
  - `.agent/workflows/{codex-audit,architecture-audit,rust-php-parity-audit,integrated-three-way-audit}.md`를 현재 역할 체계에 맞게 다시 정리해, `codex-audit`는 구현 감사, `rust-php-parity-audit`는 소비 계약 감사, `integrated-three-way-audit`는 공급자-소비자 교차 감사 설명서로 바꿨다.
- 검증:
  - `cd g5-admin && bun run audit:implementation`
  - `cd g5-admin && bun run audit:consumer`
  - `cd g5-admin && bun run audit:structure`

### `SMS Contacts` 작업면을 목록/편집 ownership으로 한 번 더 분리

- Why: `g5-admin/src/features/sms-contacts/AdminSmsContactsSection.tsx 315`는 `검색/일괄 처리/페이징 목록`과 `개별 연락처 편집 폼`을 한 파일에 함께 담고 있었다. 이건 wrapper를 추가하는 문제가 아니라 수정 이유가 다른 두 작업면을 직접 분리하는 케이스였다.
- What:
  - `g5-admin/src/features/sms-contacts/AdminSmsContactsListSection.tsx`, `AdminSmsContactEditorSection.tsx`를 추가해 연락처 검색·필터·일괄 액션·목록·페이징과 개별 연락처 생성/수정/삭제 폼을 각각 직접 소유하도록 나눴다.
  - `g5-admin/src/features/sms-contacts/AdminSmsContactsWorkspace.tsx`는 새 목록/편집 섹션을 직접 import하도록 바꿨고, 기존 `AdminSmsContactsSection.tsx`는 제거했다.
  - 최종 길이는 `List 225`, `Editor 102`, `Workspace 168 LOC`이며, 이 배치 이후 프론트 300줄 초과 section/manifest 파일은 `navigation.ts 912`만 남았다.
- 검증:
  - `cd g5-admin && bun x tsc --noEmit`
  - `cd g5-admin && bun run lint`
  - `cd g5-admin && bun x vitest run src/features/sms-contacts/AdminSmsContactsPage.test.tsx src/features/sms-templates/AdminSmsTemplatesPage.test.tsx src/features/faqs/AdminFaqsPage.test.tsx src/features/config/AdminConfigPage.test.tsx`

### `Admin Config`·`SMS Templates`·`FAQs` 섹션 파일을 실제 작업면 ownership으로 재편

- Why: `g5-admin/src/features/config/AdminConfigSections.tsx 598`, `sms-templates/AdminSmsTemplatesSections.tsx 484`, `faqs/AdminFaqsSections.tsx 479`는 각각 진단 패널, 공용 field control, 그룹/목록/편집/다이얼로그, 마스터/문항/다이얼로그처럼 독립 수정 이유가 뚜렷한 UI 묶음을 한 파일에 함께 두고 있었다. 이건 억지 wrapper 분리가 아니라 실제 section ownership 기준으로 분리 가능한 케이스였다.
- What:
  - `g5-admin/src/features/config/AdminConfigDiagnosticsCard.tsx`, `admin-config-field-controls.tsx`, `admin-config-schema-label.ts`를 추가해 개발 진단 카드, 공용 입력 control, schema fallback label helper를 분리했고 `AdminConfigSections.tsx`는 편집 레이아웃 조합만 남겨 `292 LOC`로 줄였다.
  - `g5-admin/src/features/sms-templates/AdminSmsTemplatesSections.tsx`를 제거하고 `SmsTemplateGroupsSection.tsx`, `SmsTemplateListSection.tsx`, `SmsTemplateEditorSection.tsx`로 재편해 그룹 CRUD·이동/비우기, 템플릿 검색·일괄 처리, 편집 폼·삭제 dialog ownership을 분리했다. 최종 길이는 `215 / 191 / 98 LOC`다.
  - `g5-admin/src/features/faqs/AdminFaqsSections.tsx`를 제거하고 `FaqMasterSection.tsx`, `FaqItemsSection.tsx`, `FaqDialogs.tsx`로 재편해 FAQ 마스터+이미지, 문항 목록/편집, 삭제 dialog ownership을 분리했다. 최종 길이는 `285 / 173 / 38 LOC`다.
  - 이 배치 이후 프론트 잔여 300줄 초과 section/manifest 파일은 `navigation.ts 912`, `AdminSmsContactsSection.tsx 315` 수준으로 축소됐다.
- 검증:
  - `cd g5-admin && bun x tsc --noEmit`
  - `cd g5-admin && bun run lint`
  - `cd g5-admin && bun x vitest run src/features/sms-templates/AdminSmsTemplatesPage.test.tsx src/features/faqs/AdminFaqsPage.test.tsx src/features/config/AdminConfigPage.test.tsx`

### Rust Codex wrapper와 고정 감사 진입점 추가

- Why: 형님이 `php`와 같은 방식으로 Rust도 Codex 앱이 바로 따를 수 있는 래퍼를 요구하셨다. 기존 Rust 저장소는 integrated audit만 `bun run audit:integrated`로 고정돼 있었고, routine local gate와 구조 감사는 헌법/워크플로 문서를 직접 해석해야 했다. 이 상태에서는 Codex가 매번 `어떤 명령을 어디서 실행할지`를 다시 추론해야 해서 감사 루프가 일관되지 않았다.
- What:
  - `AGENTS.md`를 추가해 Rust 저장소를 `그누보드5 REST API 소비자`로 정의하고, `audit:standard`, `audit:contract`, `audit:deep`, `audit:integrated` 실행 조건을 Codex 1차 진입점으로 고정했다.
  - `scripts/run_standard_audit.sh`, `run_contract_audit.sh`, `run_deep_audit.sh`, `collect_architecture_metrics.py`를 추가해 document governance, TypeScript/lint/test, Rust workspace check, ts-rs export sync, PHP-Rust integrated audit, 구조 metric 수집 흐름을 재사용 가능한 고정 래퍼로 정리했다.
  - `g5-admin/package.json`에 `bun run audit:standard|contract|deep` 진입점을 추가하고, `README.md`, `specs/README.md`에 새 래퍼와 권장 실행 순서를 문서화했다.
  - 기존 감사 스크립트도 현재 구조 기준으로 보정했다. `check_openapi_contract.mjs`는 `api-target-registry.ts`를 읽도록 바꿔 contract drift 검사를 되살렸고, `run_integrated_audit.py`는 `commands/registry.rs`와 `api-target-registry.ts`를 기준으로 command/path를 집계하며 known gap `/admin/dashboard`는 warning으로만 남기도록 정리했다.
  - wrapper 검증을 막던 현재 코드 기준의 회귀도 같이 해소했다. `AdminConfigPage.tsx`는 새 `AdminConfigDiagnosticsCard.tsx`를 직접 import하도록 맞췄고, `tests/e2e/smoke.test.ts`는 `generate_handler!`를 `lib.rs`뿐 아니라 `commands/registry.rs`에서도 읽을 수 있게 보정했다.
- 검증:
  - `python3 scripts/doc-index.py`
  - `bash scripts/check-doc-governance.sh`
  - `cd g5-admin && bun run audit:standard`
  - `cd g5-admin && bun run audit:contract`
  - `cd g5-admin && bun run audit:deep`

### `SMS Contacts` 섹션 파일을 그룹/연락처/파일 작업면 ownership으로 분리

- Why: `g5-admin/src/features/sms-contacts/AdminSmsContactsSections.tsx 586`는 이미 `그룹 작업면`, `연락처 목록/편집`, `가져오기·내보내기`라는 독립된 세 컴포넌트를 품고 있었지만 한 파일에 묶여 있어 수정 범위가 넓었다. 이건 줄 수 기준이 아니라 실제 UI ownership 기준으로 분리 가능한 케이스였다.
- What:
  - `g5-admin/src/features/sms-contacts/AdminSmsContactGroupsSection.tsx`, `AdminSmsContactsSection.tsx`, `AdminSmsContactImportExportCard.tsx`를 추가해 그룹 CRUD/이동, 연락처 검색·일괄 작업·편집, 파일 import/export preview를 각각 직접 소유하는 파일로 분리했다.
  - `g5-admin/src/features/sms-contacts/AdminSmsContactsWorkspace.tsx`는 새 섹션 파일을 직접 import하도록 바꿨고, 기존 `AdminSmsContactsSections.tsx`는 제거했다.
  - 최종 길이는 `Groups 170`, `Contacts 315`, `ImportExport 146`, `Workspace 164 LOC`다.
- 검증:
  - `cd g5-admin && bun x tsc --noEmit`
  - `cd g5-admin && bun run lint`
  - `cd g5-admin && bun x vitest run src/features/sms-contacts/AdminSmsContactsPage.test.tsx`

### `db/sites`와 `site health-check`를 catalog/state, probe/test 축으로 분리

- Why: `g5-admin/src-tauri/src/db/sites.rs 254`와 `commands/site/shared/health_check.rs 279`는 backend 잔여 hotspot 중 남은 helper 레벨 집중 파일이었다. 전자는 사이트 CRUD, activity 로그, session hint 저장소가 한 파일에 섞여 있었고, 후자는 health-check policy entry, probe retry loop, transport 진단, inline 테스트가 한 모듈에 몰려 있었다.
- What:
  - `g5-admin/src-tauri/src/db/sites/{mod,catalog,activity,runtime_state}.rs` 구조로 바꿔 사이트 CRUD와 기본 사이트 승격, activity 로그 기록/조회, runtime session hint 저장을 각각 분리했다. 최종 길이는 `mod 16`, `catalog 134`, `activity 69`, `runtime_state 41 LOC`다.
  - `g5-admin/src-tauri/src/commands/site/shared/health_check/{mod,probe,tests}.rs` 구조로 바꿔 health-check policy entry와 client builder, probe retry/state machine, 테스트 harness를 분리했다. 최종 길이는 `mod 122`, `probe 77`, `tests 86 LOC`다.
  - 이 배치 이후 backend 잔여 hotspot은 `commands/menu/mutations.rs`, `commands/sms_history/queries.rs`, `commands/permission/auth.rs`, `commands/security/fast_unlock.rs` 같은 세부 모듈 수준으로 내려왔다.
- 검증:
  - `cargo fmt --manifest-path g5-admin/src-tauri/Cargo.toml`
  - `cargo check --manifest-path g5-admin/src-tauri/Cargo.toml --quiet`
  - `cargo test --manifest-path g5-admin/src-tauri/Cargo.toml --lib --quiet`

### `menu`·`sms_history` command를 조회/변경, 조회/재전송 축으로 분리

- Why: `g5-admin/src-tauri/src/commands/menu.rs 272`와 `commands/sms_history.rs 256`은 backend 잔여 command 중 기능 경계가 명확한 마지막 묶음이었다. 메뉴 파일은 목록/상세 조회와 생성·수정·삭제·재정렬이 함께 있었고, SMS 이력 파일은 배치/전송내역 조회와 재전송 액션이 한곳에 섞여 있었다.
- What:
  - `g5-admin/src-tauri/src/commands/menu/{queries,mutations}.rs` 구조로 바꿔 메뉴 조회와 변경/재정렬 흐름을 분리했고, root `menu.rs`는 component 상수와 공통 삭제 응답만 남겨 `16 LOC`로 줄였다. 최종 길이는 `queries 68`, `mutations 205 LOC`다.
  - `g5-admin/src-tauri/src/commands/sms_history/{queries,actions}.rs` 구조로 바꿔 SMS 배치/전송내역 조회와 재전송 액션을 분리했고, root `sms_history.rs`는 `4 LOC` entry만 남겼다. 최종 길이는 `queries 173`, `actions 98 LOC`다.
  - `g5-admin/src-tauri/src/commands/registry.rs`는 `menu::{queries,mutations}`와 `sms_history::{queries,actions}` 실제 정의 경로를 가리키도록 갱신해 Tauri handler registry와 모듈 구조 정합성을 유지했다.
  - 이 배치 이후 backend 잔여 hotspot은 `commands/site/shared/health_check.rs`, `db/sites.rs` 중심으로 수렴했다.
- 검증:
  - `cargo fmt --manifest-path g5-admin/src-tauri/Cargo.toml`
  - `cargo check --manifest-path g5-admin/src-tauri/Cargo.toml --quiet`
  - `cargo test --manifest-path g5-admin/src-tauri/Cargo.toml --lib --quiet`

### `permission`·`security`·`sms_contact shared` command ownership 분해

- Why: `g5-admin/src-tauri/src/commands/permission.rs 291`, `commands/security.rs 285`, `commands/sms_contact/shared.rs 290`은 backend 잔여 hotspot 중 역할 축이 가장 뚜렷한 command/helper였다. 권한 파일은 `admin/system/auths` CRUD와 `admin/auth` upsert/delete가 함께 있었고, 보안 파일은 settings, fast unlock, TOTP, error mapping이 한곳에 섞여 있었으며, SMS 연락처 shared는 응답 조립과 입력 normalize가 한 모듈에 같이 있어 변경 이유가 달랐다.
- What:
  - `g5-admin/src-tauri/src/commands/permission/{auth,permissions}.rs` 구조로 바꿔 `admin/auth` 계열과 권한 목록/저장/삭제를 각각 분리했고, root `permission.rs`는 component 상수와 공통 삭제 응답만 남겨 `16 LOC`로 축소했다. 최종 길이는 `auth 159`, `permissions 131 LOC`다.
  - `g5-admin/src-tauri/src/commands/security/{settings,fast_unlock,totp,shared}.rs` 구조로 바꿔 로컬 보안 설정 변경, 빠른 잠금 해제 등록/폐기/상태 조회, TOTP 등록/활성화/비활성화를 각각 분리했다. root `security.rs`는 `6 LOC`, `settings 61`, `fast_unlock 156`, `totp 66 LOC`다.
  - `g5-admin/src-tauri/src/commands/sms_contact/shared.rs`는 `shared/{normalize,responses}.rs`를 소비하는 entry로 줄여 SMS 연락처/그룹/파일 command가 입력 정규화와 응답 생성 helper를 독립 ownership으로 공유하도록 정리했다. 최종 길이는 `shared.rs 17`, `normalize 149`, `responses 140 LOC`다.
  - `g5-admin/src-tauri/src/commands/registry.rs`도 실제 command 정의 모듈 경로(`permission::{auth,permissions}`, `security::{settings,fast_unlock,totp}`) 기준으로 갱신해 Tauri handler registry와 모듈 구조의 정합성을 맞췄다.
  - 이 배치 이후 backend 잔여 hotspot은 `commands/site/shared/health_check.rs`, `commands/menu.rs`, `commands/sms_history.rs`, `db/sites.rs` 같은 단일 도메인 command/helper 축으로 더 좁혀졌다.
- 검증:
  - `cargo fmt --manifest-path g5-admin/src-tauri/Cargo.toml`
  - `cargo check --manifest-path g5-admin/src-tauri/Cargo.toml --quiet`
  - `cargo test --manifest-path g5-admin/src-tauri/Cargo.toml --lib --quiet`

### `point` model과 `site shared`를 query/action, catalog/health-check 축으로 분리

- Why: `g5-admin/src-tauri/src/models/point.rs 270`와 `commands/site/shared.rs 300`은 backend 잔여 hotspot 중 실제 책임 축이 보이는 마지막 파일들이었다. 포인트 모델은 조회/요약 계약과 액션·삭제·만료 payload가 한 파일에 섞여 있었고, 사이트 shared는 local-site-db catalog/error helper와 API health-check probe가 한 모듈에 같이 있어 수정 이유가 달랐다.
- What:
  - `g5-admin/src-tauri/src/models/point/{mod,queries,actions}.rs` 구조로 바꿔 목록/요약/response envelope과 액션·삭제·만료 payload/result를 분리했다. 최종 길이는 `mod 5`, `queries 94`, `actions 179 LOC`다.
  - `g5-admin/src-tauri/src/commands/site/shared/{mod,catalog,health_check}.rs` 구조로 바꿔 `load_site_catalog`/`site_command_error`와 health-check client/probe/retry/test를 분리했다. 최종 길이는 `mod 5`, `catalog 26`, `health_check 279 LOC`다.
  - 이 배치 이후 backend 잔여 hotspot은 `commands/permission.rs`, `commands/sms_contact/shared.rs`, `commands/security.rs`, `commands/menu.rs` 같은 command/shared 축 위주로 정리됐다.
- 검증:
  - `cargo fmt --manifest-path g5-admin/src-tauri/Cargo.toml`
  - `cargo check --manifest-path g5-admin/src-tauri/Cargo.toml --quiet`
  - `cargo test --manifest-path g5-admin/src-tauri/Cargo.toml --lib --quiet`

### `api_client/member`와 `db/tests`를 endpoint/시나리오 축으로 분리

- Why: `g5-admin/src-tauri/src/api_client/member.rs 285`와 `db/tests.rs 453`는 dense model 정리 이후 남은 backend hotspot 중 가장 분해 근거가 뚜렷했다. 전자는 내 프로필, 관리자 목록/상세, 회원 미디어 upload-delete가 한 파일에 섞여 있었고, 후자는 마스터키, 사이트/보안, 백업 시나리오가 한 테스트 모듈에 몰려 있어 변경 영향 범위를 넓히고 있었다.
- What:
  - `g5-admin/src-tauri/src/api_client/member/{mod,profile,admin,media}.rs` 구조로 바꿔 내 프로필, 관리자 CRUD, 회원 아이콘/이미지 업로드·삭제 흐름을 endpoint 축으로 나눴다. 최종 길이는 `mod 3`, `profile 29`, `admin 151`, `media 120 LOC`다.
  - `g5-admin/src-tauri/src/db/tests/{mod,support,master_key,sites_security,backup}.rs` 구조로 바꿔 env/keyring harness, 마스터키 저장소 테스트, 앱 잠금·세션 힌트 테스트, 백업 export/import 테스트를 시나리오별로 분리했다. 최종 길이는 `support 64`, `master_key 135`, `sites_security 58`, `backup 204 LOC`다.
  - 이 배치 이후 backend 잔여 hotspot은 `commands/site/shared.rs`, `commands/permission.rs`, `commands/sms_contact/shared.rs`, `commands/security.rs`, `models/point.rs`처럼 shared command/helper 축 위주로 이동했다.
- 검증:
  - `cargo fmt --manifest-path g5-admin/src-tauri/Cargo.toml`
  - `cargo check --manifest-path g5-admin/src-tauri/Cargo.toml --quiet`
  - `cargo test --manifest-path g5-admin/src-tauri/Cargo.toml --lib --quiet`

### `mail / member` model을 endpoint 계약 축 기준으로 재분해

- Why: `g5-admin/src-tauri/src/models/mail.rs 331`과 `models/member.rs 304`는 fresh scan 이후 남은 dense model 파일 중 분해 근거가 가장 명확했다. 메일은 템플릿 CRUD, 수신자 조회, 발송 결과가 다른 endpoint 군인데도 한 파일에 있었고, 회원도 목록/상세 수정/미디어/프로필 계약이 한곳에 묶여 있어 변경 이유가 달랐다.
- What:
  - `g5-admin/src-tauri/src/models/mail/{mod,templates,recipients,send}.rs` 구조로 바꿔 메일 템플릿/상세, 수신자 조회, 발송 payload/result를 분리했다. 최종 길이는 `mod 21`, `templates 157`, `recipients 72`, `send 99 LOC`다.
  - `g5-admin/src-tauri/src/models/member/{mod,list,detail,profile}.rs` 구조로 바꿔 공용 `Pagination`은 root에 남기고, 목록 query/response, 상세 수정/미디어, 프로필 계약을 ownership 기준으로 나눴다. 최종 길이는 `mod 34`, `list 63`, `detail 190`, `profile 36 LOC`다.
  - 이 배치 이후 backend 잔여 hotspot은 dense model보다 `db/tests.rs`, 일부 `commands/* shared`, `api_client/member.rs`, `models/point.rs` 같은 test/shared/adapter 축으로 이동했다.
- 검증:
  - `cargo fmt --manifest-path g5-admin/src-tauri/Cargo.toml`
  - `cargo check --manifest-path g5-admin/src-tauri/Cargo.toml --quiet`
  - `cargo test --manifest-path g5-admin/src-tauri/Cargo.toml --lib --quiet`

### `sms_template / faq` model을 command/client 경계와 같은 축으로 재정렬

- Why: fresh scan 기준으로 `g5-admin/src-tauri/src/models/sms_template.rs 368`, `models/faq.rs 357`는 backend에서 남은 대표 dense model 파일이었다. 둘 다 command/api_client 계층은 이미 `groups/templates`, `masters/images/faqs`로 나뉘어 있었는데 model만 한 파일에 남아 있어 계약 수정 범위와 AI 추론 범위를 다시 넓히고 있었다.
- What:
  - `g5-admin/src-tauri/src/models/sms_template/{mod,groups,templates}.rs` 구조로 바꿔 그룹 CRUD/이동/비우기 계약과 템플릿 목록/상세/배치 계약을 분리했다. 최종 길이는 `mod 5`, `groups 177`, `templates 195 LOC`다.
  - `g5-admin/src-tauri/src/models/faq/{mod,masters,images,faqs}.rs` 구조로 바꿔 FAQ 마스터/이미지/문항 계약과 payload builder를 ownership 기준으로 나눴다. 최종 길이는 `mod 15`, `masters 184`, `images 36`, `faqs 142 LOC`다.
  - 이 배치 이후 backend dense model 후보는 `models/mail.rs`, `models/member.rs`, `models/point.rs` 위주로 더 좁혀졌다.
- 검증:
  - `cargo fmt --manifest-path g5-admin/src-tauri/Cargo.toml`
  - `cargo check --manifest-path g5-admin/src-tauri/Cargo.toml --quiet`
  - `cargo test --manifest-path g5-admin/src-tauri/Cargo.toml --lib --quiet`

### `models/board`와 `models/app_state tests`를 도메인/시나리오 모듈로 재편

- Why: `g5-admin/src-tauri/src/models/board.rs 391`, `models/tests.rs 493`, `app_state/tests.rs 648`은 이번 구조 안정화 마지막에 남은 backend 집중 파일이었다. `board`는 계약 타입, payload builder, scalar parity deserializer가 한 파일에 섞여 있었고, 두 test 파일은 giant import/export registry와 로컬 앱 상태 시나리오가 한곳에 뭉쳐 있어 이후 감사와 AI 수정 범위를 넓히고 있었다.
- What:
  - `g5-admin/src-tauri/src/models/board/{mod,contract,payload,serde_impl}.rs` 구조로 재편해 public 경로 `crate::models::board::*`는 유지한 채 계약 타입/response envelope, payload builder, custom deserializer를 분리했다. 최종 길이는 `mod 118`, `contract 120`, `payload 146`, `serde_impl 32 LOC`다.
  - `g5-admin/src-tauri/src/models/tests.rs`는 `models/tests/{mod,core,board_content,members_access,messaging,operations,system}.rs`로 바꿔 TS binding export를 도메인 묶음 helper로 나눴다. export coverage는 유지하면서 가장 큰 helper도 `141 LOC`에 머물도록 정리했다.
  - `g5-admin/src-tauri/src/app_state/tests.rs`는 `app_state/tests/{mod,support,sites,master_lock,security}.rs`로 바꿔 공통 temp/session/state harness와 `sites`, `master_lock`, `security` 시나리오를 분리했다. 가장 큰 시나리오 모듈은 `247 LOC`다.
  - 이 배치 이후 backend 잔여 집중점은 `db/tests.rs`, 일부 대형 `models/*`, 그리고 프론트의 `navigation.ts`/dense sections 쪽으로 더 좁혀졌다.
- 검증:
  - `cargo fmt --manifest-path g5-admin/src-tauri/Cargo.toml`
  - `cargo check --manifest-path g5-admin/src-tauri/Cargo.toml --quiet`
  - `cargo test --manifest-path g5-admin/src-tauri/Cargo.toml --lib --quiet`

### `models/config.rs`를 계약/파서/페이로드/테스트 경계로 분해

- Why: [models/config.rs](/Users/neojins/workspace/gnuboard5/rust/g5-admin/src-tauri/src/models/config.rs)는 admin config 계약 타입, scalar parity deserializer, update payload builder, envelope, 전용 테스트가 한 파일에 같이 있어 `379 LOC`였다. 이 파일은 줄 수보다도 “서로 다른 변경 이유가 한 파일에 묶여 있다”는 점이 더 문제였다.
- What:
  - `g5-admin/src-tauri/src/models/config/{mod,contract,payload,serde_impl,tests}.rs` 구조로 재편해 계약 타입, payload builder, scalar parity deserializer, 테스트를 분리했다.
  - public 경로는 그대로 `crate::models::config::*`를 유지해 command/api_client import 범위는 넓히지 않았다.
  - 이 배치 이후 남은 backend model 집중점은 `models/board.rs`와 대형 export/test 파일 위주로 좁혀졌다.
- 검증:
  - `cargo check --manifest-path g5-admin/src-tauri/Cargo.toml --quiet`
  - `cargo test --manifest-path g5-admin/src-tauri/Cargo.toml --lib --quiet`

### `SecuritySettingsSections / AdminMailsSections`를 실제 도메인 섹션 ownership 기준으로 재분해

- Why: 직전 배치 이후 프론트 잔여 집중점은 `SecuritySettingsSections.tsx 560`와 `AdminMailsSections.tsx 645`였다. 둘 다 단순히 “섹션 파일”이라서 큰 것이 아니라, 보안 카드/OTP 다이얼로그/공용 입력과 메일 목록/수신자/발송/삭제 대화상자가 한 파일에 함께 묶여 있어 수정 이유가 달랐다.
- What:
  - `g5-admin/src/features/security/SecuritySettingsSections.tsx`는 export entry만 남기고, 실제 구현을 `SecuritySettingsCoreCards.tsx`, `SecuritySettingsTotpCards.tsx`, `SecuritySettingsDialogs.tsx`, `SecuritySettingsFields.tsx`, `SecuritySettingsCards.tsx`로 나눴다. 그 결과 core 보안 카드 묶음은 `243 LOC`, TOTP/저장소 요약은 `133 LOC`, 다이얼로그는 `110 LOC`가 됐다.
  - `g5-admin/src/features/mails/AdminMailsSections.tsx`는 export entry로 줄이고, 구현을 `AdminMailTemplateSections.tsx`, `AdminMailRecipientsSection.tsx`, `AdminMailSendSection.tsx`, `AdminMailComposeSections.tsx`, `admin-mails-section-shared.tsx`로 나눴다. 그 결과 템플릿 편집/목록은 `214 LOC`, 수신자 미리보기는 `276 LOC`, 발송/삭제는 `140 LOC`가 됐다.
  - 이 배치 이후 프론트 잔여 집중점은 사실상 `navigation.ts` 하나와 backend의 대형 test/model 파일들로 좁혀졌다.
- 검증:
  - `cd g5-admin && bun x tsc --noEmit`
  - `cd g5-admin && bun run lint`
  - `cd g5-admin && bun x vitest run src/features/security/SecuritySettingsPage.test.tsx src/features/mails/AdminMailsPage.test.tsx`

### `MemberDetailCard / AppShell` 상호작용 집중 파일을 sections/hook/helper로 분해

- Why: `g5-admin/src/features/members/MemberDetailCard.tsx 796`와 `g5-admin/src/features/layout/AppShell.tsx 614`는 이번 구조 감사 이후에도 프론트에서 남아 있던 대표 상호작용 집중 파일이었다. 전자는 회원 상세 요약/이미지 업로드/레벨 조정/프로필 폼/삭제 액션을 한 카드에서 다 그리고 있었고, 후자는 캡처와 편집형 컨텍스트 메뉴의 상태/사이드이펙트/DOM 조작을 한 파일에 같이 품고 있었다.
- What:
  - `g5-admin/src/features/members/MemberDetailSections.tsx`를 `overview / level / danger zone` 소비자 파일로 줄이고, `MemberDetailMediaSection.tsx`, `MemberDetailProfileSection.tsx`, `MemberDetailControls.tsx`, `member-detail-shared.ts`를 추가해 회원 상세 렌더링과 공용 RHF 컨트롤을 별도 ownership으로 나눴다. `MemberDetailCard.tsx`는 schema gate와 상위 상태만 남기는 `234 LOC`, `MemberDetailSections.tsx`는 `181 LOC`, `MemberDetailProfileSection.tsx`는 `263 LOC`까지 축소됐다.
  - `g5-admin/src/features/layout/useAppShellCapture.tsx`, `useAppShellContextMenu.ts`, `app-shell-context-menu-actions.ts`를 추가해 `AppShell.tsx`에서 캡처 생성/저장, 저장 위치 reveal, 컨텍스트 메뉴 state/effect, 편집기 cut-copy-paste-select-all 동작을 분리했다. `AppShell.tsx`는 레이아웃 오케스트레이션과 메뉴 렌더링만 남겨 `168 LOC`가 됐다.
  - 라우트 변경 시 컨텍스트 메뉴를 닫는 처리는 effect 안의 `setState` 대신 `routeKey` ownership 방식으로 바꿔 React lint 기준도 맞췄다.
  - 이 배치 이후 프론트 잔여 집중점은 `navigation.ts`, `AdminMailsSections.tsx`, `SecuritySettingsSections.tsx`처럼 실제 데이터/섹션 밀도가 높은 파일로 더 좁혀졌다.
- 검증:
  - `cd g5-admin && bun x tsc --noEmit`
  - `cd g5-admin && bun run lint`
  - `cd g5-admin && bun x vitest run src/features/layout/app-shell-context-menu.test.ts src/features/layout/AppShell.test.tsx src/features/members/MemberDetailCard.test.tsx`

## 2026-03-12

### `faq / sms_template` API client도 command와 같은 하위 모듈 경계로 정렬

- Why: `g5-admin/src-tauri/src/api_client/faq.rs 340`, `api_client/sms_template.rs 309`는 이미 command 쪽에서 `masters/faqs/media`, `groups/templates`로 갈라진 흐름을 다시 한 파일에 모으고 있었다. client 계층이 이렇게 남아 있으면 command에서 경계를 나눠도 transport 수정 범위는 여전히 넓었다.
- What:
  - `g5-admin/src-tauri/src/api_client/faq.rs`를 `api_client/faq/{masters,media,faqs}.rs`로 나눠 FAQ 마스터 CRUD, 헤더/푸터 이미지 upload-delete, FAQ CRUD를 분리했다. root `mod.rs`는 `3 LOC`, 하위 길이는 `120 / 118 / 119 LOC`다.
  - `g5-admin/src-tauri/src/api_client/sms_template.rs`를 `api_client/sms_template/{groups,templates}.rs`로 나눠 템플릿 그룹 CRUD/이동/비우기와 템플릿 CRUD/배치를 분리했다. root `mod.rs`는 `2 LOC`, 하위 길이는 `170 / 147 LOC`다.
  - 이로써 backend 잔여 집중점은 `api_client` 도메인 파일보다 `models/tests.rs`, `app_state/tests.rs`, 일부 대형 model 파일과 프론트 layout/sections 쪽으로 더 이동했다.
- 검증:
  - `cargo fmt --manifest-path g5-admin/src-tauri/Cargo.toml`
  - `cargo check --manifest-path g5-admin/src-tauri/Cargo.toml --quiet`
  - `cargo test --manifest-path g5-admin/src-tauri/Cargo.toml --lib --quiet`

### `sms_contact model / app_state security / model export test / operations builder` 집중 파일을 한 배치로 분해

- Why: 이전 배치까지 `api_client`와 registry root는 많이 가벼워졌지만, `models/sms_contact.rs 558`, `models/mod.rs 532`, `app_state/security.rs 312`, `command-context-builders/operations.ts 308`이 각각 모델 도메인, 로컬 보안 흐름, TS 바인딩 export registry, 운영 builder map을 한 파일에 모아두고 있었다. 이 네 파일은 다음 crate split과 감사 관점에서 서로 다른 축인데도 한곳에 묶여 있어 ownership이 흐렸다.
- What:
  - `g5-admin/src-tauri/src/models/sms_contact.rs`를 `models/sms_contact/{groups,contacts,files}.rs`로 나눠 연락처 그룹, 연락처 CRUD/배치, import/export 계약과 envelope을 분리했다. root `mod.rs`는 `7 LOC`, 하위 길이는 `170 / 246 / 150 LOC`다.
  - `g5-admin/src-tauri/src/app_state/security.rs`를 `app_state/security/{settings,backup,totp,fast_unlock}.rs`로 나눠 보안 설정 조회/수정, backup import-export, TOTP enrollment/enable/disable, fast unlock 흐름을 분리했다. root `mod.rs`는 공통 helper만 남겨 `64 LOC`가 됐다.
  - `g5-admin/src-tauri/src/models/mod.rs`는 대형 inline `export_ts_bindings` 테스트를 `models/tests.rs`로 이동해 root module을 `41 LOC`로 줄였다.
  - `g5-admin/src/api/client/core/command-context-builders/operations.ts`는 `operations/{report-push,access,points,engagement}.ts` 조합으로 바꿔 root builder 합성 파일을 `11 LOC`로 축소했다.
  - 이 배치 이후 이전 hotspot 4건은 해소됐고, 남은 구조 집중점은 `navigation.ts`, `MemberDetailCard.tsx`, `AppShell.tsx`, 여러 `*Sections.tsx`, 그리고 `models/tests.rs`/`app_state/tests.rs` 같은 레이아웃·섹션·테스트 export 계열로 이동했다.
- 검증:
  - `cd g5-admin && bun x tsc --noEmit`
  - `cd g5-admin && bun x vitest run src/api/client/core/command-context.test.ts`
  - `cd g5-admin && bun run lint`
  - `cargo fmt --manifest-path g5-admin/src-tauri/Cargo.toml`
  - `cargo check --manifest-path g5-admin/src-tauri/Cargo.toml --quiet`
  - `cargo test --manifest-path g5-admin/src-tauri/Cargo.toml --lib --quiet`

### `board_group / sms_contact` API client를 하위 모듈로 갈라 command 경계와 같은 책임 축으로 맞춤

- Why: `g5-admin/src-tauri/src/api_client/board_group.rs 395`와 `api_client/sms_contact.rs 405`는 각각 그룹/멤버/레거시, 그룹/연락처/파일 import-export 흐름을 한 파일에 몰아두고 있었다. command 쪽은 이미 같은 기준으로 분해돼 있었기 때문에, client만 단일 파일로 남겨두면 API 호출 경로 추적과 수정 범위가 다시 넓어졌다.
- What:
  - `g5-admin/src-tauri/src/api_client/board_group.rs`를 `api_client/board_group/{groups,members,legacy}.rs`로 나눠 게시판 그룹 CRUD, 그룹 회원 관리, 레거시 `/admin/groups` 경계를 분리했다. root `mod.rs`는 `3 LOC`이고 하위 길이는 `148 / 77 / 192 LOC`다.
  - `g5-admin/src-tauri/src/api_client/sms_contact.rs`를 `api_client/sms_contact/{groups,contacts,files}.rs`로 나눠 연락처 그룹 CRUD/이동/비우기, 연락처 CRUD/배치, import/export 흐름을 분리했다. root `mod.rs`는 `3 LOC`이고 하위 길이는 `169 / 159 / 93 LOC`다.
  - 이로써 남은 backend 집중 파일은 `api_client` 세부 도메인 파일보다 `models/*`, `app_state/security.rs` 같은 모델/보안 계층으로 더 좁혀졌다.
- 검증:
  - `cargo fmt --manifest-path g5-admin/src-tauri/Cargo.toml`
  - `cargo check --manifest-path g5-admin/src-tauri/Cargo.toml --quiet`
  - `cargo test --manifest-path g5-admin/src-tauri/Cargo.toml --lib --quiet`

### `command-context` giant registry를 도메인별 builder map으로 나눠 프론트 진단 SSOT를 가볍게 정리

- Why: `g5-admin/src/api/client/core/command-context-registry.ts`는 `1421 LOC`짜리 giant registry로 212개 command 진단 metadata를 한 파일에 몰아두고 있었다. 이미 `router`, `api-targets`, `commands/registry.rs`는 얇은 진입점 + registry 구조로 옮겨졌는데, 이 파일만 남아 있어 도메인 추가 시 drift와 AI 수정 범위가 계속 커졌다.
- What:
  - `g5-admin/src/api/client/core/command-context-builders/{local,content-faq-system,mail-menu-theme,members-boards,operations,sms-debug,shared}.ts`를 추가해 로컬 앱, 컨텐츠/FAQ/시스템, 메일/메뉴/테마, 회원/게시판, 운영, SMS/디버그 영역별로 builder map을 분리했다.
  - 공용 payload reader와 `CommandContextBuilder` 타입은 `shared.ts`로 옮기고, `command-context-registry.ts`는 도메인 builder map을 합치는 `26 LOC`짜리 root registry로 축소했다.
  - command entry 수는 그대로 `212`를 유지하면서 giant switch/registry 1건을 도메인별 소유권 구조로 바꿨다. 이제 남은 프론트 진단 집중점은 단일 파일이 아니라 일부 builder map(`operations.ts 308`, `members-boards.ts 281`, `sms-debug.ts 253`) 수준이다.
- 검증:
  - `cd g5-admin && bun x tsc --noEmit`
  - `cd g5-admin && bun x vitest run src/api/client/core/command-context.test.ts`

### `ApiClient` transport와 `master_lock` 상태 기계를 세부 모듈로 나눠 남은 backend 집중 파일을 더 줄임

- Why: root orchestrator 정리 후에도 `api_client/request.rs 472`와 `app_state/master_lock.rs 348`는 각각 transport retry/응답 판독/raw HTTP I/O, 그리고 잠금 상태/락아웃/TOTP/해제 흐름을 한 파일에 몰아둔 상태였다. 이 둘은 단순히 line budget 문제를 넘어서 이후 포트화와 보안 회귀 점검에서 직접 병목이 되는 파일이었다.
- What:
  - `g5-admin/src-tauri/src/api_client/request.rs`에서 공개 transport API만 남기고, raw HTTP I/O는 `api_client/request_io.rs`, 응답 header 추출은 `api_client/request_headers.rs`로 분리했다. 그 결과 `request.rs`는 `213 LOC`로 내려왔다.
  - `g5-admin/src-tauri/src/app_state/master_lock.rs`는 `app_state/master_lock/{status,unlock,lockout,totp}.rs` 폴더 모듈로 전환해 상태 조회/설정·잠금, 기본 해제 흐름, 실패 누적·lockout, TOTP 검증 책임을 각각 독립시켰다.
  - 최종 길이는 `master_lock/status 96`, `unlock 107`, `lockout 68`, `totp 86 LOC`이며, 남은 backend 집중점은 이제 `request.rs`, `master_lock.rs`가 아니라 대형 `models/*`, 일부 `api_client/*`, 그리고 프론트 `command-context-registry.ts`다.
- 검증:
  - `cargo fmt --manifest-path g5-admin/src-tauri/Cargo.toml`
  - `cargo check --manifest-path g5-admin/src-tauri/Cargo.toml --quiet`
  - `cargo test --manifest-path g5-admin/src-tauri/Cargo.toml --lib --quiet`

### `token_store / runtime_config`를 backend·resolve 모듈로 갈라 local infra 경계를 더 명확히 함

- Why: `token_store.rs 362`, `runtime_config.rs 351`는 root orchestrator 1차 정리 이후에도 남아 있던 로컬 인프라 집중 파일이었다. 전자는 active-site 비동기 orchestration과 keychain/file backend I/O가 한 파일에 섞여 있었고, 후자는 런타임 계약 타입과 env/file/path 해석, 테스트가 한 파일에 섞여 있어 이후 DI/infra crate split의 경계가 흐렸다.
- What:
  - `g5-admin/src-tauri/src/token_store.rs`를 `token_store/mod.rs`, `token_store/backend.rs`로 나눠 root module은 active-site 상태와 async session orchestration만 남기고, keychain/file 저장 backend와 경로/권한 helper는 backend 모듈로 이동했다.
  - `g5-admin/src-tauri/src/runtime_config.rs`를 `runtime_config/mod.rs`, `runtime_config/resolve.rs`, `runtime_config/tests.rs`로 나눠 계약 타입/`RuntimeConfig::load()`와 env/file/path 해석, 테스트를 분리했다.
  - 최종 길이는 `token_store/mod.rs 181`, `token_store/backend.rs 195`, `runtime_config/mod.rs 166`, `runtime_config/resolve.rs 137 LOC`이며, local infra root 파일 2건도 300줄 기준 아래로 내려왔다.
  - 이 배치 이후 남은 구조 집중점은 root orchestrator가 아니라 `api_client/request.rs`, `command-context-registry.ts`, 일부 대형 `models/*`와 `app_state/*` 세부 모듈이다.
- 검증:
  - `cargo fmt --manifest-path g5-admin/src-tauri/Cargo.toml`
  - `cargo check --manifest-path g5-admin/src-tauri/Cargo.toml --quiet`
  - `cargo test --manifest-path g5-admin/src-tauri/Cargo.toml --lib --quiet`

### `api_client / db / app_state` root orchestrator를 2차로 분해해 app-core 진입점을 가볍게 정리

- Why: `error` 분해 이후에도 구조 감사의 후속 core focus는 `db/mod.rs 1056`, `app_state/mod.rs 833`, `api_client.rs 797` 3개였다. 이 셋은 실제로 composition root에 가까운 조립 파일이어야 하는데, transport retry, problem parsing, SQLCipher/keyring master key, portable backup 포맷, 대형 inline test까지 모두 품고 있어 Phase 3의 DI/crate split 준비를 가로막고 있었다.
- What:
  - `g5-admin/src-tauri/src/api_client.rs`를 `api_client/mod.rs`, `api_client/request.rs`, `api_client/problem.rs`로 분해해 root module은 계약/생성자만 남기고, HTTP request dispatch와 RFC 7807 problem parsing을 별도 모듈로 이동했다.
  - `g5-admin/src-tauri/src/app_state/mod.rs`의 대형 inline test를 `app_state/tests.rs`로 추출해 root orchestrator는 state 조립과 공통 helper만 남기고 `186 LOC`로 축소했다.
  - `g5-admin/src-tauri/src/db/mod.rs`는 `db/{connection,master_key,secret_store,portable_backup,backup}.rs` 조합으로 재정리했다. 그 결과 SQLCipher 연결/마이그레이션, master key/file-keychain 전환, keyring secret hash, portable backup envelope, backup merge 책임이 서로 다른 모듈로 분리됐다.
  - 최종 길이는 `api_client/mod.rs 119`, `app_state/mod.rs 186`, `db/mod.rs 111 LOC`이며, 기존 oversized root orchestrator 3건은 모두 해소됐다.
  - 후속 focus는 root orchestrator가 아니라 `api_client/request.rs 472`, `command-context-registry.ts 1421`, `token_store.rs 362`, `runtime_config.rs 351`처럼 실제 남은 transport/registry 집중 지점으로 이동했다.
- 검증:
  - `cargo fmt --manifest-path g5-admin/src-tauri/Cargo.toml`
  - `cargo check --manifest-path g5-admin/src-tauri/Cargo.toml --quiet`
  - `cargo test --manifest-path g5-admin/src-tauri/Cargo.toml --lib --quiet`

### `error` 코어 모듈을 enum/payload/classification 경계로 분해

- Why: `g5-admin/src-tauri/src/error.rs`는 Tauri command 공통 payload export, 에러 분류 fallback, `AppError::into_payload` 변환, API status mapping까지 한 파일에 몰려 있어 `416 LOC`였다. 이 파일은 외부 계약인 `crate::error::{AppError, AppErrorPayload, CommandResult, ErrorGuide}`는 유지한 채 내부 책임만 분리할 수 있어서, `db/app_state/api_client`보다 먼저 자르기 좋은 코어 진입점이었다.
- What:
  - `g5-admin/src-tauri/src/error/mod.rs`로 `AppError` enum과 공용 re-export, `into_payload` 변환만 남겼다.
  - `g5-admin/src-tauri/src/error/payload.rs`에 `ErrorGuide`, `AppErrorPayload`, `CommandResult`를 모아 프론트 TS export 계약을 고정했다.
  - `g5-admin/src-tauri/src/error/classification.rs`에 local/API fallback classification과 payload builder를 옮겨 status 분류 규칙을 독립 모듈로 분리했다.
  - 최종 길이는 `error/mod.rs 235`, `error/classification.rs 186`, `error/payload.rs 41 LOC`이며, 후속 core oversized focus는 `db/mod.rs`, `app_state/mod.rs`, `api_client.rs` 3개만 남았다.
- 검증:
  - `cargo fmt --manifest-path g5-admin/src-tauri/Cargo.toml`
  - `cargo check --manifest-path g5-admin/src-tauri/Cargo.toml --quiet`
  - `cargo test --manifest-path g5-admin/src-tauri/Cargo.toml --lib --quiet`

### 마지막 `5개 Workspace`를 hook/sections 소비자 구조로 정리하고 workspace 기준선을 종료

- Why: `AdminMailsWorkspace`, `AdminMembersWorkspace`, `AdminBoardGroupsWorkspace`, `AdminLayoutsWorkspace`, `BoardWorkspace`는 이미 route page 분해와 일부 section 분리가 끝났지만, query/mutation/form reset, selection state, confirm dialog, widget action orchestration이 여전히 작업면 파일에 남아 있었다. 이 단계는 새 wrapper를 늘리는 작업이 아니라, 실제 상태/핸들러를 hook으로 옮기고 `BoardWorkspace`처럼 독립 카드가 분명한 곳은 `Sections`로 분리해 남은 `300줄 초과 *Workspace.tsx 5개`를 모두 닫는 것이 목적이었다.
- What:
  - `g5-admin/src/features/mails/use-admin-mails-workspace.ts`, `g5-admin/src/features/members/use-admin-members-workspace.ts`, `g5-admin/src/features/board-groups/use-admin-board-groups-workspace.ts`, `g5-admin/src/features/layouts/use-admin-layouts-workspace.ts`를 기준 오케스트레이션 훅으로 정착시켜 `AdminMailsWorkspace.tsx`, `AdminMembersWorkspace.tsx`, `AdminBoardGroupsWorkspace.tsx`, `AdminLayoutsWorkspace.tsx`를 화면 소비자 파일로 축소했다.
  - `g5-admin/src/features/boards/BoardWorkspaceSections.tsx`를 추가해 생성/편집/복사/새글 캐시 삭제/삭제 확인 다이얼로그를 분리했고, `BoardWorkspace.tsx`는 해당 섹션을 조립하는 파일로 축소했다.
  - 최종 길이는 `AdminMailsWorkspace 134`, `AdminMembersWorkspace 94`, `AdminBoardGroupsWorkspace 110`, `AdminLayoutsWorkspace 155`, `BoardWorkspace 103 LOC`이며, `300줄 초과 *Workspace.tsx`는 `0개`가 됐다.
  - 문서 SSOT는 `specs/TODO.md`, `specs/audits/2026-03-12-RUST_ARCHITECTURE_AUDIT.md` 기준으로 후속 focus를 `db/mod.rs`, `app_state/mod.rs`, `api_client.rs`, `error.rs` 코어 축으로 이동시켰다.
- 검증:
  - `cd g5-admin && bun x tsc --noEmit`
  - `cd g5-admin && bun run lint`
  - `cd g5-admin && bun x vitest run src/features/mails/AdminMailsPage.test.tsx src/features/board-groups/AdminBoardGroupsPage.test.tsx src/features/layouts/AdminLayoutsPage.test.tsx src/features/boards/AdminBoardsPage.test.tsx src/features/members/MemberDetailCard.test.tsx src/features/members/admin-members-form.test.ts`
  - `python3 scripts/doc-index.py`
  - `bash scripts/check-doc-governance.sh`

### `contents / sms-contacts / sms-templates / faqs`를 화면 소비자 + hook/model 구조로 전환

- Why: 이 네 도메인은 이미 route page/section 일부는 나뉘어 있었지만, 실제 `Workspace`에는 query, mutation, form reset 동기화, dialog open/close, selection state가 그대로 뭉쳐 있어 `469 / 554 / 467 / 458 LOC`였다. 특히 `sms-contacts`, `sms-templates`, `faqs`는 렌더링 파트가 이미 `Sections`로 나뉘어 있었으므로, 다음 정리는 wrapper 추가가 아니라 `Workspace`를 화면 소비자로 축소하고 도메인 오케스트레이션을 hook/model로 분리하는 방식이 맞았다.
- What:
  - `g5-admin/src/features/contents/AdminContentsSections.tsx`, `use-admin-contents-workspace.ts`를 추가해 목록 카드와 편집 카드를 화면 레이어로 옮기고, `AdminContentsWorkspace.tsx`는 `103 LOC` 소비자 파일로 축소했다.
  - `g5-admin/src/features/sms-contacts/use-admin-sms-contacts-workspace.ts`를 추가해 그룹/연락처/import-export query와 mutation, 선택 상태, reset 로직을 hook으로 이동했고, `AdminSmsContactsWorkspace.tsx`는 `187 LOC`로 줄였다.
  - `g5-admin/src/features/sms-templates/use-admin-sms-templates-workspace.ts`를 추가해 그룹/템플릿 이동, 삭제, batch 처리 orchestration을 hook으로 옮기고, `AdminSmsTemplatesWorkspace.tsx`는 `136 LOC`로 줄였다.
  - `g5-admin/src/features/faqs/use-admin-faqs-workspace.ts`를 추가해 FAQ 마스터/문항 CRUD와 이미지 업로드 흐름을 hook으로 옮기고, `AdminFaqsWorkspace.tsx`는 `123 LOC`로 줄였다.
  - 문서 SSOT는 `specs/TODO.md`, `specs/audits/2026-03-12-RUST_ARCHITECTURE_AUDIT.md` 기준으로 남은 `300줄 초과 *Workspace.tsx`를 `5개`로 갱신했다.
- 검증:
  - `cd g5-admin && bun x tsc --noEmit`
  - `cd g5-admin && bun run lint`
  - `cd g5-admin && bun x vitest run src/features/contents/AdminContentsPage.test.tsx src/features/sms-contacts/AdminSmsContactsPage.test.tsx src/features/sms-templates/AdminSmsTemplatesPage.test.tsx src/features/faqs/AdminFaqsPage.test.tsx`
  - `python3 scripts/doc-index.py`
  - `bash scripts/check-doc-governance.sh`

### `reports/popular/browscap` workspace를 실제 UI 책임 단위로 분해하고 wrapper-only 분해 금지 기준을 문서화

- Why: 직전 배치에서 일부 route page를 얇은 entry로 만드는 작업은 기준선 정리에 의미가 있었지만, 모든 분해가 같은 수준의 ROI를 내는 것은 아니었다. 특히 `AdminReportsWorkspace`, `AdminPopularWorkspace`, `AdminBrowscapWorkspace`는 아직 카드/리스트/결과 패널 렌더링이 orchestration 파일 안에 그대로 남아 있어, 이 파일들은 실제로 `Sections` 분리 이득이 있는 반면 단순 wrapper 추가는 오히려 결합점만 늘릴 위험이 있었다.
- What:
  - `g5-admin/src/features/reports/AdminReportsSections.tsx`를 추가해 신고 목록/통계/상세 처리 카드를 분리하고, `AdminReportsWorkspace.tsx`는 query/mutation state와 draft orchestration만 남겨 `210 LOC`로 줄였다.
  - `g5-admin/src/features/popular/AdminPopularSections.tsx`를 추가해 조회 조건/목록/랭킹 카드를 분리하고, `AdminPopularWorkspace.tsx`는 query/filter/reset dialog orchestration만 남겨 `181 LOC`로 줄였다.
  - `g5-admin/src/features/system-tools/AdminBrowscapSections.tsx`를 추가해 상태 카드/변환 카드/최근 결과 패널을 분리하고, `AdminBrowscapWorkspace.tsx`는 query/mutation/form orchestration만 남겨 `157 LOC`로 줄였다.
  - `specs/TODO.md`, `specs/audits/2026-03-12-RUST_ARCHITECTURE_AUDIT.md`에는 후속 `Workspace` 정리 대상을 `10개`로 갱신하고, `wrapper-only 분해 금지` 규칙을 명시해 이후 리팩터링이 숫자 맞추기용으로 흐르지 않도록 고정했다.
- 검증:
  - `cd g5-admin && bun x tsc --noEmit`
  - `cd g5-admin && bun run lint`
  - `cd g5-admin && bun x vitest run src/features/security/SecuritySettingsPage.test.tsx`
  - `python3 scripts/doc-index.py`
  - `bash scripts/check-doc-governance.sh`

### `SecuritySettingsWorkspace`의 상태/핸들러 orchestration을 전용 hook으로 분리

- Why: `g5-admin/src/features/security/SecuritySettingsWorkspace.tsx`는 TOTP, 비밀번호 변경, 자동 잠금 step-up, 빠른 잠금 해제 등록/폐기 흐름의 state와 dialog handler를 한 파일에서 모두 들고 있어 `403 LOC`였다. 이 화면은 이미 `SecuritySettingsSections.tsx`로 카드 렌더링이 분리돼 있었기 때문에, 다음 단계는 wrapper 추가가 아니라 상태 orchestration을 전용 hook으로 빼는 것이 맞았다.
- What:
  - `g5-admin/src/features/security/use-security-settings-workspace.ts`를 추가해 비밀번호/TOTP/자동 잠금/빠른 잠금 해제 상태와 성공 토스트, step-up dialog open/close/confirm 흐름을 hook으로 이동했다.
  - `g5-admin/src/features/security/SecuritySettingsWorkspace.tsx`는 `useSecuritySettingsWorkspace()`가 반환하는 상태와 핸들러를 소비하는 화면 조립 파일로 축소했고, 최종 길이는 `229 LOC`가 됐다.
  - 문서 SSOT는 `specs/TODO.md`, `specs/audits/2026-03-12-RUST_ARCHITECTURE_AUDIT.md` 기준으로 `300줄 초과 *Workspace.tsx` 잔량을 `9개`로 갱신했다.
- 검증:
  - `cd g5-admin && bun x tsc --noEmit`
  - `cd g5-admin && bun run lint`
  - `cd g5-admin && bun x vitest run src/features/security/SecuritySettingsPage.test.tsx`

### 남은 route-native oversized page 5개를 thin entry + workspace 구조로 정리

- Why: `AdminContentsPage`, `SecuritySettingsPage`, `AdminReportsPage`, `AdminPopularPage`, `AdminBrowscapPage`가 각각 `469 / 403 / 374 / 356 / 306 LOC`로 남아 있어, 구조 감사 기준선인 `300줄 초과 route-native page 0개`를 끝내지 못한 상태였다. 이 다섯 화면은 이미 내부 하위 컴포넌트나 훅이 어느 정도 분리되어 있어, 우선 route entry를 얇게 만들고 구현을 `Workspace`로 옮기는 것이 가장 빠른 수습 경로였다.
- What:
  - `g5-admin/src/features/contents/AdminContentsPage.tsx`, `g5-admin/src/features/security/SecuritySettingsPage.tsx`, `g5-admin/src/features/reports/AdminReportsPage.tsx`, `g5-admin/src/features/popular/AdminPopularPage.tsx`, `g5-admin/src/features/system-tools/AdminBrowscapPage.tsx`를 모두 5줄짜리 route entry로 축소했다.
  - 실제 구현은 각각 `AdminContentsWorkspace.tsx`, `SecuritySettingsWorkspace.tsx`, `AdminReportsWorkspace.tsx`, `AdminPopularWorkspace.tsx`, `AdminBrowscapWorkspace.tsx`로 이동시켜 route page 기준 oversized 목록을 비웠다.
  - 문서 SSOT는 `specs/TODO.md`, `specs/audits/2026-03-12-RUST_ARCHITECTURE_AUDIT.md` 기준으로 `300줄 초과 route-native page 0개`, `300줄 초과 top-level command 0개`로 갱신하고, 다음 우선순위를 `300줄 초과 workspace 13개`와 `app-core` 큰 파일로 이동시켰다.
- 검증:
  - `cd g5-admin && bun x tsc --noEmit`
  - `cd g5-admin && bun x vitest run src/features/contents/AdminContentsPage.test.tsx src/features/security/SecuritySettingsPage.test.tsx`

### `AdminSmsConfigPage`를 route entry + workspace/sections/helper/test 구조로 분해

- Why: `g5-admin/src/features/system/AdminSmsConfigPage.tsx`는 query, mutation, RHF submit validation, 동기화 상태 배지, 개발용 trace 패널, 필드 렌더링 컴포넌트를 한 파일에서 모두 관리해 `523 LOC`였다. SMS 설정은 이미 `admin-sms-config-form.ts`로 입력 규칙이 분리돼 있었기 때문에 route page를 얇게 만들고 작업면/섹션으로 옮기는 것이 가장 저비용 정리였다.
- What:
  - `g5-admin/src/features/system/AdminSmsConfigPage.tsx`는 얇은 route entry로 바꾸고, 실제 orchestration은 `AdminSmsConfigWorkspace.tsx`로 이동했다.
  - `g5-admin/src/features/system/AdminSmsConfigSections.tsx`에 unsupported 404 카드, 공급자 연결/회원 동기화 섹션, 개발 진단 패널, 공용 form field/action bar 렌더링을 옮겼다.
  - `g5-admin/src/features/system/admin-sms-config-page-helpers.ts`에 `smsConfigKey`, `smsConfigSchema`, reset/submit payload helper를 분리했고, `AdminSmsConfigPage.test.tsx`를 추가해 정상 작업면과 unsupported 404 회귀를 고정했다.
- 검증:
  - `cd g5-admin && bun x tsc --noEmit`
  - `cd g5-admin && bun run lint`
  - `cd g5-admin && bun x vitest run src/features/system/AdminSmsConfigPage.test.tsx src/features/system/admin-sms-config-form.test.ts`

### `auth` command를 session/health/shared 하위 모듈로 분해

- Why: `g5-admin/src-tauri/src/commands/auth.rs`는 로그인, 세션 복구/갱신, 로그아웃, 시스템 health probe, refresh helper를 한 파일에 함께 두고 있어 `353 LOC`였다. 인증 세션 흐름과 로컬 health probe는 변경 주기가 다르므로 마지막 oversized command를 여기서 끊어야 Phase 2 command 잔량을 0으로 만들 수 있었다.
- What:
  - `g5-admin/src-tauri/src/commands/auth/{session.rs,health.rs,shared.rs}`를 추가해 로그인/세션 복구/로그아웃 명령, 로컬 health 명령, refresh/local-session helper를 분리했다.
  - `g5-admin/src-tauri/src/commands/auth.rs`는 submodule 선언만 남기는 얇은 진입점으로 축소했다.
  - `g5-admin/src-tauri/src/commands/registry.rs`는 Tauri IPC 등록이 `auth::session`, `auth::health` 경로를 직접 보도록 정리했다.
- 검증:
  - `cargo fmt --manifest-path g5-admin/src-tauri/Cargo.toml`
  - `cargo check --manifest-path g5-admin/src-tauri/Cargo.toml --quiet`
  - `cargo test --manifest-path g5-admin/src-tauri/Cargo.toml --lib --quiet`

### `AdminSmsHistoryPage`를 route entry + workspace/sections/helper/test 구조로 분해

- Why: `g5-admin/src/features/sms-history/AdminSmsHistoryPage.tsx`는 배치 목록, 배치 상세, 번호별 이력 조회, 재전송 mutation, 검색/페이징 state를 한 파일에서 모두 처리해 `531 LOC`였다. SMS history는 `batches`와 `deliveries` 두 route mode를 한 작업면에서 공유하므로 route page를 얇게 만들지 않으면 조회/재전송 회귀를 좁히기 어렵다.
- What:
  - `g5-admin/src/features/sms-history/AdminSmsHistoryPage.tsx`는 얇은 route entry로 바꾸고, 실제 orchestration은 `AdminSmsHistoryWorkspace.tsx`로 이동했다.
  - `g5-admin/src/features/sms-history/AdminSmsHistorySections.tsx`에 번호별 이력 카드, 배치 목록 카드, 배치 상세/재전송 카드를 옮기고, `admin-sms-history-page-helpers.ts`에 intro copy, selected batch label, query invalidation helper를 분리했다.
  - `g5-admin/src/features/sms-history/AdminSmsHistoryPage.test.tsx`를 추가해 `batches` route와 `deliveries` route의 smoke 회귀를 고정했다.
- 검증:
  - `cd g5-admin && bun x tsc --noEmit`
  - `cd g5-admin && bun run lint`
  - `cd g5-admin && bun x vitest run src/features/sms-history/AdminSmsHistoryPage.test.tsx src/features/sms-history/admin-sms-history-form.test.ts`

### `board` command를 queries/mutations/shared 하위 모듈로 분해

- Why: `g5-admin/src-tauri/src/commands/board.rs`는 목록/상세 조회, 생성/수정/삭제, 복사, 최신글 삭제, 입력 정규화 helper를 한 파일에 함께 두고 있어 `317 LOC`였다. board는 조회와 mutation 경계가 명확해서 이 파일을 분리하면 남은 oversized command가 `auth.rs` 하나로 줄어든다.
- What:
  - `g5-admin/src-tauri/src/commands/board/{queries.rs,mutations.rs,shared.rs}`를 추가해 목록/상세 조회 명령, 생성/수정/삭제/복사/새글삭제 명령, 공용 response/normalization helper를 분리했다.
  - `g5-admin/src-tauri/src/commands/board.rs`는 submodule 선언만 남기는 얇은 진입점으로 축소했다.
  - `g5-admin/src-tauri/src/commands/registry.rs`는 Tauri IPC 등록이 `board::queries`, `board::mutations` 경로를 직접 보도록 정리했다.
- 검증:
  - `cargo fmt --manifest-path g5-admin/src-tauri/Cargo.toml`
  - `cargo check --manifest-path g5-admin/src-tauri/Cargo.toml --quiet`
  - `cargo test --manifest-path g5-admin/src-tauri/Cargo.toml --lib --quiet`

### `AdminSmsContactsPage`를 route entry + workspace/helper 구조로 분해

- Why: `g5-admin/src/features/sms-contacts/AdminSmsContactsPage.tsx`는 이전에 sections 분리는 돼 있었지만, 여전히 query/mutation orchestration과 route-mode 판정, import/export 흐름을 한 파일에 같이 두고 있어 `590 LOC`였다. SMS 연락처 화면은 그룹/연락처/import-export 3축이 같이 움직여 route page를 얇게 만들지 않으면 다음 분해 기준이 계속 밀린다.
- What:
  - `g5-admin/src/features/sms-contacts/AdminSmsContactsPage.tsx`는 얇은 route entry로 바꾸고, 실제 orchestration은 `AdminSmsContactsWorkspace.tsx`로 이동했다.
  - `g5-admin/src/features/sms-contacts/admin-sms-contacts-page-helpers.ts`를 추가해 page intro copy, query invalidation, 연락처 reset 값, 선택 토글 helper를 공용화했다.
  - 기존 `AdminSmsContactsSections.tsx`, `admin-sms-contacts-form.ts`, `AdminSmsContactsPage.test.tsx`는 그대로 재사용해 화면 구조와 회귀 기준을 유지했다.
- 검증:
  - `cd g5-admin && bun x tsc --noEmit`
  - `cd g5-admin && bun run lint`
  - `cd g5-admin && bun x vitest run src/features/sms-contacts/AdminSmsContactsPage.test.tsx`

### `mail` command를 queries/mutations/shared 하위 모듈로 분해

- Why: `g5-admin/src-tauri/src/commands/mail.rs`는 목록/상세 조회, 템플릿 생성/수정/삭제, 수신자 조회, 실제 발송, 입력 정규화 helper를 한 파일에 같이 두고 있어 `322 LOC`였다. 메일은 조회 계열과 mutation/send 계열이 분명히 다르므로 command ownership을 나눠야 다음 감사에서 발송 경로를 별도로 추적할 수 있다.
- What:
  - `g5-admin/src-tauri/src/commands/mail/{queries.rs,mutations.rs,shared.rs}`를 추가해 목록/상세/수신자 조회 명령, 템플릿 변경/삭제/발송 명령, 공용 response/normalization helper를 분리했다.
  - `g5-admin/src-tauri/src/commands/mail.rs`는 submodule 선언만 남기는 얇은 진입점으로 축소했다.
  - `g5-admin/src-tauri/src/commands/registry.rs`는 Tauri IPC 등록이 `mail::queries`, `mail::mutations` 경로를 직접 보도록 정리했다.
- 검증:
  - `cargo fmt --manifest-path g5-admin/src-tauri/Cargo.toml`
  - `cargo check --manifest-path g5-admin/src-tauri/Cargo.toml --quiet`
  - `cargo test --manifest-path g5-admin/src-tauri/Cargo.toml --lib --quiet`

### `AdminMembersPage`를 route entry + workspace/sections/helper 구조로 분해

- Why: `g5-admin/src/features/members/AdminMembersPage.tsx`는 목록 query, 상세 query, 프로필/레벨/미디어 mutation, URL query string navigation, 상세 카드 렌더링을 한 파일에서 함께 관리해 `618 LOC`였다. 회원 도메인은 레벨 권한 판단과 미디어 업로드가 같이 얽혀 있어 route page를 얇게 만들지 않으면 다음 구조 분해 때 영향 범위를 줄이기 어렵다.
- What:
  - `g5-admin/src/features/members/AdminMembersPage.tsx`는 얇은 route entry로 바꾸고, 실제 orchestration은 `AdminMembersWorkspace.tsx`로 이동했다.
  - `g5-admin/src/features/members/AdminMembersSections.tsx`에 intro/목록/search/pagination UI를 옮기고, `admin-members-page-helpers.ts`에 route navigation, query key sync, zod schema, query string normalize helper를 분리했다.
  - 기존 `MemberDetailCard.tsx`, `MembersDataTable.tsx`, `admin-members-form.ts`는 그대로 유지해 상세 카드와 폼 규칙을 재사용했다.
- 검증:
  - `cd g5-admin && bun x tsc --noEmit`
  - `cd g5-admin && bun run lint`
  - `cd g5-admin && bun x vitest run src/features/members/admin-members-form.test.ts src/features/members/MemberDetailCard.test.tsx`

### `popup` command를 queries/mutations/legacy/shared 하위 모듈로 분해

- Why: `g5-admin/src-tauri/src/commands/popup.rs`는 목록/상세 조회, 생성/수정/삭제, legacy alias endpoint, 입력 정규화 helper를 한 파일에서 함께 관리해 `393 LOC`였다. `/admin/system/popups*`와 `/admin/popups*` alias를 같이 운용하는 도메인이라 조회/변경/legacy 경계를 명시적으로 나눌 필요가 있었다.
- What:
  - `g5-admin/src-tauri/src/commands/popup/{queries.rs,mutations.rs,legacy.rs,shared.rs}`를 추가해 modern query, modern mutation, legacy alias mutation, 공용 response/normalization helper를 분리했다.
  - `g5-admin/src-tauri/src/commands/popup.rs`는 submodule 선언만 남기는 얇은 진입점으로 축소했다.
  - `g5-admin/src-tauri/src/commands/registry.rs`는 Tauri IPC 등록이 `popup::queries`, `popup::mutations`, `popup::legacy` 경로를 직접 보도록 정리했다.
- 검증:
  - `cargo fmt --manifest-path g5-admin/src-tauri/Cargo.toml`
  - `cargo check --manifest-path g5-admin/src-tauri/Cargo.toml --quiet`
  - `cargo test --manifest-path g5-admin/src-tauri/Cargo.toml --lib --quiet`

### `poll` command를 queries/mutations/legacy/shared 하위 모듈로 분해

- Why: `g5-admin/src-tauri/src/commands/poll.rs`는 목록/상세 조회, 생성/수정/삭제, legacy alias endpoint, 항목 문자열 normalize helper를 한 파일에 함께 두고 있어 `386 LOC`였다. `poll`은 `popup`과 같은 운영 도구 CRUD 패턴이므로 command ownership도 같은 수준으로 맞춰야 registry와 감사 기준이 일관된다.
- What:
  - `g5-admin/src-tauri/src/commands/poll/{queries.rs,mutations.rs,legacy.rs,shared.rs}`를 추가해 modern query, modern mutation, legacy alias mutation, 공용 response/normalization helper를 분리했다.
  - `g5-admin/src-tauri/src/commands/poll.rs`는 submodule 선언만 남기는 얇은 진입점으로 축소했다.
  - `g5-admin/src-tauri/src/commands/registry.rs`는 Tauri IPC 등록이 `poll::queries`, `poll::mutations`, `poll::legacy` 경로를 직접 보도록 정리했다.
- 검증:
  - `cargo fmt --manifest-path g5-admin/src-tauri/Cargo.toml`
  - `cargo check --manifest-path g5-admin/src-tauri/Cargo.toml --quiet`
  - `cargo test --manifest-path g5-admin/src-tauri/Cargo.toml --lib --quiet`

### `AdminPointsPage`를 route entry + workspace/sections/helper/test 구조로 분해

- Why: `g5-admin/src/features/points/AdminPointsPage.tsx`는 조회 조건, 포인트 내역 선택 삭제, 지급/차감, 만료 처리, 요약 패널을 한 파일에서 모두 처리해 `544 LOC`였다. 포인트 관리 화면은 단일 작업면이 넓더라도 route page가 폼/목록/요약/삭제 dialog까지 다 들고 있으면 회귀 범위가 불필요하게 넓어진다.
- What:
  - `g5-admin/src/features/points/AdminPointsPage.tsx`는 얇은 route entry로 바꾸고, 실제 orchestration은 `AdminPointsWorkspace.tsx`로 이동했다.
  - `g5-admin/src/features/points/AdminPointsSections.tsx`에 조회 조건, 내역 목록, 지급/차감, 만료 처리, 요약, 삭제 dialog를 옮기고, `admin-points-page-helpers.ts`에 query invalidation과 선택 토글 helper를 분리했다.
  - `g5-admin/src/features/points/AdminPointsPage.test.tsx`를 추가해 포인트 작업면 smoke 회귀를 고정했다.
- 검증:
  - `cd g5-admin && bun x tsc --noEmit`
  - `cd g5-admin && bun x vitest run src/features/points/AdminPointsPage.test.tsx src/features/points/admin-points-form.test.ts`

### `point` command를 queries/actions/legacy/shared 하위 모듈로 분해

- Why: `g5-admin/src-tauri/src/commands/point.rs`는 목록/요약 조회, 지급/차감, 삭제, 만료, legacy endpoint helper를 한 파일에서 같이 관리해 `381 LOC`였다. 포인트는 조회와 액션, 그리고 `/grant` `/deduct` `/expire` 레거시 엔드포인트를 분리해야 감사 기준이 선다.
- What:
  - `g5-admin/src-tauri/src/commands/point/{queries.rs,actions.rs,legacy.rs,shared.rs}`를 추가해 조회 명령, 현대 액션 명령, 레거시 액션 명령, 공용 response/normalization helper를 분리했다.
  - `g5-admin/src-tauri/src/commands/point.rs`는 submodule 선언만 남기는 얇은 진입점으로 축소했다.
  - `g5-admin/src-tauri/src/commands/registry.rs`는 Tauri IPC 등록이 `point::queries`, `point::actions`, `point::legacy` 경로를 직접 보도록 정리했다.
- 검증:
  - `cargo check --manifest-path g5-admin/src-tauri/Cargo.toml --quiet`
  - `cargo test --manifest-path g5-admin/src-tauri/Cargo.toml --lib --quiet`

### `AdminLayoutsPage`를 route entry + workspace/sections/helper/test 구조로 분해

- Why: `g5-admin/src/features/layouts/AdminLayoutsPage.tsx`는 목록/신규 저장, 선택 레이아웃 draft 편집, 위젯 추가/수정/삭제/재배치, JSON helper를 한 파일에서 처리해 `597 LOC`였다. 레이아웃 화면은 JSON 편집과 위젯 조작 때문에 복잡도가 높아 page 분해가 늦어질수록 god file 위험이 커진다.
- What:
  - `g5-admin/src/features/layouts/AdminLayoutsPage.tsx`는 얇은 route entry로 바꾸고, 실제 orchestration은 `AdminLayoutsWorkspace.tsx`로 이동했다.
  - `g5-admin/src/features/layouts/AdminLayoutsSections.tsx`에 목록/신규 저장/선택 편집 패널을 옮기고, `admin-layouts-page-helpers.ts`에 draft, widget parse, query invalidation, detail sync helper를 분리했다.
  - `g5-admin/src/features/layouts/AdminLayoutsPage.test.tsx`를 추가해 레이아웃 작업면 smoke 회귀를 고정했다.
- 검증:
  - `cd g5-admin && bun x tsc --noEmit`
  - `cd g5-admin && bun x vitest run src/features/layouts/AdminLayoutsPage.test.tsx`

### `layout` command를 queries/mutations/legacy/shared 하위 모듈로 분해

- Why: `g5-admin/src-tauri/src/commands/layout.rs`는 목록/상세 조회, 저장, 위젯 CRUD, reorder, legacy reorder, generic action helper를 한 파일에 같이 두고 있었다. 레이아웃은 조회와 변경, legacy reorder 경계를 분리해야 registry와 command ownership이 명확해진다.
- What:
  - `g5-admin/src-tauri/src/commands/layout/{queries.rs,mutations.rs,legacy.rs,shared.rs}`를 추가해 조회 명령, 변경 명령, legacy reorder 명령, 공용 response/normalization/action helper를 분리했다.
  - `g5-admin/src-tauri/src/commands/layout.rs`는 submodule 선언만 남기는 얇은 진입점으로 축소했다.
  - `g5-admin/src-tauri/src/commands/registry.rs`는 Tauri IPC 등록이 `layout::queries`, `layout::mutations`, `layout::legacy` 경로를 직접 보도록 정리했다.
- 검증:
  - `cargo check --manifest-path g5-admin/src-tauri/Cargo.toml --quiet`
  - `cargo test --manifest-path g5-admin/src-tauri/Cargo.toml --lib --quiet`

### `AdminBoardGroupsPage`를 route entry + workspace/sections/helper 구조로 분해

- Why: `g5-admin/src/features/board-groups/AdminBoardGroupsPage.tsx`는 그룹 목록, 멤버 검색/추가/삭제, schema gate, 편집 폼, 삭제 dialog를 한 파일에서 모두 처리해 `675 LOC`까지 커져 있었다. 이미 `board_group` backend command는 분리된 상태라, 프론트 route page도 같은 수준으로 얇게 만들어야 도메인 경계가 맞는다.
- What:
  - `g5-admin/src/features/board-groups/AdminBoardGroupsPage.tsx`는 얇은 route entry로 바꾸고, 실제 orchestration은 `AdminBoardGroupsWorkspace.tsx`로 이동했다.
  - `g5-admin/src/features/board-groups/AdminBoardGroupsSections.tsx`에 그룹 목록, 그룹 회원 작업면, 그룹 편집 카드, 삭제 dialog를 옮기고, `admin-board-groups-page-helpers.ts`에 query invalidation과 delete target 타입을 분리했다.
  - 기존 `AdminBoardGroupsPage.test.tsx`는 route entry를 통해 새 workspace 구조가 그대로 동작하는지 회귀 기준으로 유지했다.
- 검증:
  - `cd g5-admin && bun x tsc --noEmit`
  - `cd g5-admin && bun x vitest run src/features/board-groups/AdminBoardGroupsPage.test.tsx src/features/board-groups/admin-board-groups-form.test.ts`

### `faq` command를 masters/faqs/media/shared 하위 모듈로 분해

- Why: `g5-admin/src-tauri/src/commands/faq.rs`는 FAQ 마스터 조회/수정/삭제, 헤더/푸터 이미지 업로드/삭제, FAQ 문항 CRUD, normalization helper를 한 파일에서 관리해 `586 LOC`였다. 프론트 `AdminFaqsPage`는 이미 분해돼 있었기 때문에, command를 계속 한 파일에 두면 감사와 유지보수 기준이 반쪽만 맞는 상태였다.
- What:
  - `g5-admin/src-tauri/src/commands/faq/{masters.rs,faqs.rs,media.rs,shared.rs}`를 추가해 FAQ 마스터 명령, FAQ 문항 명령, 이미지 업로드/삭제 명령, 공용 response/normalization helper를 분리했다.
  - `g5-admin/src-tauri/src/commands/faq.rs`는 submodule 선언만 남기는 얇은 진입점으로 축소했다.
  - `g5-admin/src-tauri/src/commands/registry.rs`는 Tauri IPC 등록이 `faq::masters`, `faq::faqs`, `faq::media` 경로를 직접 보도록 정리했다.
- 검증:
  - `cargo check --manifest-path g5-admin/src-tauri/Cargo.toml --quiet`
  - `cargo test --manifest-path g5-admin/src-tauri/Cargo.toml --lib --quiet`

### `AdminSmsTemplatesPage`를 route entry + workspace/sections/helper/test 구조로 분해

- Why: `g5-admin/src/features/sms-templates/AdminSmsTemplatesPage.tsx`는 그룹 CRUD, 템플릿 목록/검색/일괄 처리, 편집 폼, 삭제 dialog까지 한 파일에서 처리해 `793 LOC`까지 커져 있었다. SMS 템플릿은 `template-groups`와 `templates`를 하나의 작업면에 묶고 있어 route page가 상태와 렌더링을 모두 들고 있으면 다음 구조 분해 우선순위를 계속 밀어낸다.
- What:
  - `g5-admin/src/features/sms-templates/AdminSmsTemplatesPage.tsx`는 얇은 route entry로 바꾸고, 실제 orchestration은 `AdminSmsTemplatesWorkspace.tsx`로 이동했다.
  - `g5-admin/src/features/sms-templates/AdminSmsTemplatesSections.tsx`에 그룹 목록/편집, 템플릿 목록/검색/일괄 처리, 템플릿 편집, 삭제 dialog를 옮기고, `admin-sms-templates-page-helpers.ts`에 query invalidation, 기본 폼값, 선택 토글 helper를 분리했다.
  - `g5-admin/src/features/sms-templates/AdminSmsTemplatesPage.test.tsx`를 추가해 templates route와 template-groups route의 smoke 회귀를 고정했다.
- 검증:
  - `cd g5-admin && bun x tsc --noEmit`
  - `cd g5-admin && bun x vitest run src/features/sms-templates/AdminSmsTemplatesPage.test.tsx src/features/sms-templates/admin-sms-templates-form.test.ts`

### `sms_template` command를 groups/templates/shared 하위 모듈로 분해

- Why: `g5-admin/src-tauri/src/commands/sms_template.rs`는 그룹 조회/수정/이동/비우기와 템플릿 CRUD/일괄 처리, 입력 정규화 helper를 한 파일에서 같이 관리해 `569 LOC`였다. 이 상태는 그룹 변경과 템플릿 변경이 같은 수정 단위로 묶여 command 경계 감사가 어렵고, IPC registry도 선언 위치와 어긋나 있었다.
- What:
  - `g5-admin/src-tauri/src/commands/sms_template/{groups.rs,templates.rs,shared.rs}`를 추가해 그룹 command, 템플릿 command, 공용 response/normalization helper를 분리했다.
  - `g5-admin/src-tauri/src/commands/sms_template.rs`는 submodule 선언만 남기는 얇은 진입점으로 축소했다.
  - `g5-admin/src-tauri/src/commands/registry.rs`는 Tauri IPC 등록이 `sms_template::groups`, `sms_template::templates` 경로를 직접 보도록 정리했다.
- 검증:
  - `cargo check --manifest-path g5-admin/src-tauri/Cargo.toml --quiet`
  - `cargo test --manifest-path g5-admin/src-tauri/Cargo.toml --lib --quiet`

### `AdminFaqsPage`를 route entry + workspace/sections/helper/test 구조로 분해

- Why: `g5-admin/src/features/faqs/AdminFaqsPage.tsx`는 FAQ 마스터/문항 목록, schema gate, 이미지 업로드, 삭제 dialog, query invalidation까지 한 파일에서 처리해 `797 LOC`까지 커져 있었다. 이 화면은 schema 소비와 이미지 아티팩트까지 함께 다루기 때문에 route page가 상태/폼/렌더링을 다 떠안는 구조를 계속 두면 회귀 범위를 좁히기 어렵다.
- What:
  - `g5-admin/src/features/faqs/AdminFaqsPage.tsx`는 얇은 route entry로 바꾸고, 실제 orchestration은 `AdminFaqsWorkspace.tsx`로 이동했다.
  - `g5-admin/src/features/faqs/AdminFaqsSections.tsx`에 FAQ 마스터/문항 섹션과 이미지 카드, 삭제 dialog를 옮기고, `admin-faqs-page-helpers.ts`에 query invalidation helper를 분리했다.
  - `g5-admin/src/features/faqs/AdminFaqsPage.test.tsx`를 추가해 FAQ 작업면 smoke와 schema/query wiring 기준을 고정했다.
- 검증:
  - `cd g5-admin && bun x tsc --noEmit`
  - `cd g5-admin && bun x vitest run src/features/faqs/AdminFaqsPage.test.tsx src/features/faqs/admin-faqs-form.test.ts`

### `sms_contact` command를 groups/contacts/files/shared 하위 모듈로 분해

- Why: `g5-admin/src-tauri/src/commands/sms_contact.rs`는 그룹 CRUD/이동/비우기, 연락처 CRUD/batch, import/export, 입력 정규화 helper를 한 파일에 함께 넣어 `675 LOC`였다. 이 상태는 그룹 관리와 연락처 일괄 작업, 파일 입출력 경계를 한 번에 바꾸게 만들어 command 책임 분리가 잘 안 보였다.
- What:
  - `g5-admin/src-tauri/src/commands/sms_contact/{groups.rs,contacts.rs,files.rs,shared.rs}`를 추가해 그룹 command, 연락처 command, import/export command, 공용 normalization/response helper를 분리했다.
  - `g5-admin/src-tauri/src/commands/sms_contact.rs`는 submodule 선언만 남기는 얇은 진입점으로 축소했다.
  - `g5-admin/src-tauri/src/commands/registry.rs`는 Tauri IPC 등록이 `sms_contact::groups`, `sms_contact::contacts`, `sms_contact::files` 경로를 직접 보도록 정리했다.
- 검증:
  - `cargo check --manifest-path g5-admin/src-tauri/Cargo.toml --quiet`
  - `cargo test --manifest-path g5-admin/src-tauri/Cargo.toml --lib --quiet`

### `AdminMailsPage`를 page/workspace/sections/helper/test 구조로 나눠 route page를 비대 목록에서 제거

- Why: `g5-admin/src/features/mails/AdminMailsPage.tsx`는 템플릿 CRUD, 수신자 미리보기, 발송 폼, 삭제 dialog, 요약 helper까지 한 파일에 몰려 `922 LOC`였다. 메일 발송은 작업면 자체가 넓어도 route page가 모든 책임을 가져서는 안 되고, 특히 이 도메인은 page 단위 smoke test도 비어 있어 구조 분해와 회귀 기준을 같이 세울 필요가 있었다.
- What:
  - `g5-admin/src/features/mails/AdminMailsPage.tsx`는 얇은 route entry로 바꾸고, 실제 orchestration은 `AdminMailsWorkspace.tsx`로 이동했다.
  - `g5-admin/src/features/mails/AdminMailsSections.tsx`에 템플릿/수신자/발송/삭제 dialog 섹션을 옮기고, `admin-mails-page-helpers.ts`에 target type/summary/query invalidation helper를 분리했다.
  - `g5-admin/src/features/mails/AdminMailsPage.test.tsx`를 추가해 메일 작업면 smoke와 query wiring 회귀를 고정했다.
- 검증:
  - `cd g5-admin && bun x tsc --noEmit`
  - `cd g5-admin && bun x vitest run src/features/mails/AdminMailsPage.test.tsx src/features/mails/admin-mails-form.test.ts`

### `board_group` command를 queries/mutations/legacy/shared 하위 모듈로 분해

- Why: `g5-admin/src-tauri/src/commands/board_group.rs`는 modern board-group API와 legacy groups API, member list/add/delete, 입력 정규화 helper를 한 파일에서 같이 들고 있어 `684 LOC`까지 커져 있었다. 이 상태는 modern/legacy 경계를 감사하기 어렵고, 한쪽 엔드포인트 변경이 다른 쪽을 건드리는 강결합을 계속 만들었다.
- What:
  - `g5-admin/src-tauri/src/commands/board_group/{queries.rs,mutations.rs,legacy.rs,shared.rs}`를 추가해 modern query, modern mutation, legacy alias command, 공용 normalization/response helper를 분리했다.
  - `g5-admin/src-tauri/src/commands/board_group.rs`는 submodule 선언만 남기는 얇은 진입점으로 축소했다.
  - `g5-admin/src-tauri/src/commands/registry.rs`는 Tauri IPC 등록이 `board_group::queries`, `board_group::mutations`, `board_group::legacy` 경로를 직접 보도록 정리했다.
- 검증:
  - `cargo check --manifest-path g5-admin/src-tauri/Cargo.toml --quiet`
  - `cargo test --manifest-path g5-admin/src-tauri/Cargo.toml --lib --quiet`

### `SiteDashboardPage`를 sections/dialogs/helpers로 나눠 route page를 300줄 기준 아래로 되돌림

- Why: `g5-admin/src/features/sites/SiteDashboardPage.tsx`는 검색/health query, 백업 picker, 민감 작업 state, 카드 렌더링, dialog wiring이 한 파일에 몰려 `768 LOC`까지 커져 있었다. 사이트 대시보드는 멀티사이트 진입의 핵심 작업면이라 분해 기준을 여기서 회복하지 못하면 이후 page audit 숫자만 유지될 뿐 실제 구조 개선으로 보기 어려웠다.
- What:
  - `g5-admin/src/features/sites/SiteDashboardSections.tsx`를 추가해 intro/header, 검색 카드, 사이트 목록 카드, action button, health badge 렌더링을 page 밖으로 분리했다.
  - `g5-admin/src/features/sites/SiteDashboardDialogs.tsx`를 추가해 사이트 등록 dialog와 step-up auth dialog wiring을 분리했다.
  - `g5-admin/src/features/sites/site-dashboard-helpers.ts`를 추가해 민감 작업 copy/backup picker/포맷 helper를 공용화했고, `SiteDashboardPage.tsx`는 상태와 오케스트레이션만 담당하는 `288 LOC` page로 축소했다.
- 검증:
  - `cd g5-admin && bun x tsc --noEmit`
  - `cd g5-admin && bun run lint`
  - `cd g5-admin && bun x vitest run src/features/sites/SiteDashboardPage.test.tsx`

### `site` command를 catalog/health/mutations/shared 하위 모듈로 분해

- Why: `g5-admin/src-tauri/src/commands/site.rs`는 site catalog 조회, add/update/delete/switch mutation, health probe retry 정책, transport message builder, 테스트까지 한 파일에 몰려 `445 LOC`였다. 이 상태는 로컬 site DB 작업과 health probe 정책을 별도 책임으로 감사하기 어렵게 만들었다.
- What:
  - `g5-admin/src-tauri/src/commands/site/{catalog.rs,health.rs,mutations.rs,shared.rs}`를 추가해 catalog 응답, health check entrypoint, mutation command, 공용 health/site helper를 분리했다.
  - `g5-admin/src-tauri/src/commands/site.rs`는 submodule 선언만 남기는 얇은 진입점으로 축소했다.
  - `g5-admin/src-tauri/src/commands/registry.rs`는 Tauri IPC 등록이 실제 선언 모듈인 `site::catalog`, `site::health`, `site::mutations`를 직접 보도록 정리했다.
- 검증:
  - `cargo fmt --manifest-path g5-admin/src-tauri/Cargo.toml`
  - `cargo check --manifest-path g5-admin/src-tauri/Cargo.toml --quiet`
  - `cargo test --manifest-path g5-admin/src-tauri/Cargo.toml --lib --quiet`

### `AdminConfigPage`를 sections/static meta로 나눠 300줄 기준 아래로 되돌림

- Why: `g5-admin/src/features/config/AdminConfigPage.tsx`는 form/query orchestration 위에 카드 렌더링, 필드 제어기, zod schema까지 한 파일에 몰려 `1037 LOC`까지 비대해져 있었다. 이 상태는 환경설정 자체보다 화면 구조를 바꾸는 비용이 커서, Phase 2의 첫 컷으로 `page + sections + static meta` 분리를 적용할 대상이었다.
- What:
  - `g5-admin/src/features/config/AdminConfigSections.tsx`를 추가해 카드 섹션, 공용 필드 제어기, 진단 카드 렌더링을 밖으로 분리했다.
  - `g5-admin/src/features/config/admin-config-page-meta.ts`를 추가해 query key와 zod schema 같은 정적 메타를 밖으로 옮겼다.
  - `g5-admin/src/features/config/AdminConfigPage.tsx`는 query/form orchestration, schema gate, 저장 mutation 조합만 담당하도록 축소했고 최종 크기를 `279 LOC`까지 낮췄다.
- 검증:
  - `cd g5-admin && bun x tsc --noEmit`
  - `cd g5-admin && bun run lint`
  - `cd g5-admin && bun x vitest run src/features/config/AdminConfigPage.test.tsx`

### `member` command를 queries/mutations/media/shared 하위 모듈로 분해

- Why: `g5-admin/src-tauri/src/commands/member.rs`는 조회, 수정, 삭제, 미디어 업로드/삭제, 입력 정규화 helper를 한 파일에 들고 있어 `450 LOC`로 구조 감사의 oversized command 목록에 들어 있었다. 이 command는 도메인별 책임 경계가 명확해 하위 모듈로 나누기 쉬운 케이스였다.
- What:
  - `g5-admin/src-tauri/src/commands/member/{queries.rs,mutations.rs,media.rs,shared.rs}`를 추가해 조회, 변경, 미디어, 공용 응답/정규화 helper를 분리했다.
  - `g5-admin/src-tauri/src/commands/member.rs`는 submodule 선언만 남기는 얇은 진입점으로 바꿨다.
  - `g5-admin/src-tauri/src/commands/registry.rs`는 Tauri command 매크로가 실제 선언 모듈을 보도록 `member::queries`, `member::mutations`, `member::media` 경로를 직접 참조하게 조정했다.
- 검증:
  - `cargo check --manifest-path g5-admin/src-tauri/Cargo.toml --quiet`
  - `cargo test --manifest-path g5-admin/src-tauri/Cargo.toml --lib --quiet`

### `AppStateDependencies` seam을 도입해 AppState 조립과 런타임 상태를 분리 시작

- Why: Phase 3의 핵심은 `AppState`가 concrete dependency를 직접 조립하는 결합을 약하게 만드는 것이다. 한 번에 crate split까지 가기는 이르지만, 최소한 composition input을 별도 구조체로 빼야 이후 포트/서비스 경계 작업이 안전해진다.
- What:
  - `g5-admin/src-tauri/src/app_state/mod.rs`에 `AppStateDependencies`를 추가해 `RuntimeConfig`, `TokenStore`, `ApiClient`, `SiteRepository`, `SiteManager` 조립을 분리했다.
  - `AppState::from_dependencies`를 도입해 실제 런타임 상태 초기화와 dependency 생성 단계를 나눴다.
  - `g5-admin/src-tauri/src/lib.rs`는 계속 `AppState::from_env()`만 호출하지만, 내부적으로는 dependency seam을 경유하도록 바꿨다.
- 검증:
  - `cargo check --manifest-path g5-admin/src-tauri/Cargo.toml --quiet`
  - `cargo test --manifest-path g5-admin/src-tauri/Cargo.toml --lib --quiet`

### Tauri IPC registry를 `commands/registry.rs` 매크로로 분리해 `lib.rs` 집중도를 낮춤

- Why: `g5-admin/src-tauri/src/lib.rs`는 실제 부트스트랩 로직보다 `217개` IPC command import와 `generate_handler!` 등록 목록이 대부분을 차지하고 있었다. 이 구조는 새 command를 추가할 때 `lib.rs`를 계속 비대하게 만들고, 구조 감사에서 지적한 `single manifest/generated registry` 기준과도 어긋났다.
- What:
  - `g5-admin/src-tauri/src/commands/registry.rs`를 추가해 `tauri::generate_handler![...]` 전체를 반환하는 `app_invoke_handler!` 매크로로 IPC 등록 목록을 분리했다.
  - `g5-admin/src-tauri/src/commands/mod.rs`는 `registry` 모듈을 노출하고, `g5-admin/src-tauri/src/lib.rs`는 `AppState`/plugin bootstrap과 `invoke_handler(app_invoke_handler!())`만 남기도록 축소했다.
  - 결과적으로 `lib.rs`는 `412 -> 53 LOC`로 줄었고, IPC registry는 data-like macro file로 분리돼 다음 단계 command/module 분해와 함께 다루기 쉬운 상태가 됐다.
- 검증:
  - `rustfmt --edition 2024 g5-admin/src-tauri/src/lib.rs g5-admin/src-tauri/src/commands/mod.rs g5-admin/src-tauri/src/commands/registry.rs`
  - `cargo test --manifest-path g5-admin/src-tauri/Cargo.toml --lib --quiet`
  - `cargo check --manifest-path g5-admin/src-tauri/Cargo.toml --quiet`

### `command-context`와 `api-targets` giant switch를 export registry로 옮겨 프론트 command registry 1차를 정리

- Why: `g5-admin/src/api/client/core/command-context.ts`와 `api-targets.ts`는 같은 212개 command 집합을 giant switch 두 개로 따로 들고 있었다. 이 상태는 command 추가/변경 시 drift를 만들기 쉽고, 다음 단계인 `src-tauri/src/lib.rs` IPC registry 정리에 앞서 프론트 command metadata를 export registry 기준으로 먼저 정리할 필요가 있었다.
- What:
  - `g5-admin/src/api/client/core/command-context-registry.ts`를 추가해 기존 `buildCommandContext` switch의 `area / operation / localTarget resolver`를 export registry로 분리했다.
  - `g5-admin/src/api/client/core/api-target-registry.ts`를 추가해 기존 `resolveApiTarget` switch의 API/local pseudo target을 export registry로 분리했다.
  - `g5-admin/src/api/client/core/{command-context.ts,api-targets.ts}`는 각각 registry lookup만 담당하도록 축소했다.
  - `g5-admin/src/api/client/core/command-context.test.ts`는 더 이상 소스 파일의 `case` 텍스트를 파싱하지 않고, export된 `commandContextCommands`와 `apiTargetCommands` 집합을 양방향으로 비교하도록 바꿨다.
- 검증:
  - `cd g5-admin && bun x vitest run src/api/client/core/command-context.test.ts`
  - `cd g5-admin && bun x tsc --noEmit`
  - `cd g5-admin && bun run lint`

### 프론트 router registry 1차를 `navigation` metadata 파생 구조로 정리

- Why: `router.tsx`는 canonical route element map, scoped legacy redirect, top-level redirect를 각각 따로 들고 있었고, alias 정보는 이미 `navigation.ts`에 있는데도 다시 수기로 적고 있었다. 이 상태는 새 route를 추가할 때 `navigation.ts`와 `router.tsx`를 동시에 만져야 하는 중복 registry였고, 구조 감사에서 가장 먼저 손대야 할 drift 지점이었다.
- What:
  - `g5-admin/src/app/adminRouteRegistry.tsx`를 추가해 canonical admin route element, top-level redirect, legacy alias redirect, member detail 예외 라우트를 한곳에서 파생하도록 정리했다.
  - `g5-admin/src/app/router.tsx`는 수기 `canonicalRouteElements`, `scopedLegacyRedirectRoutes`, `topLevelCanonicalRedirectRoutes`, `topLevelLegacyRedirectRoutes`를 제거하고 새 registry를 소비하도록 단순화했다.
  - `g5-admin/src/app/adminRouteRegistry.test.tsx`를 추가해 canonical route count, alias redirect 파생, member detail redirect 예외를 회귀 테스트로 고정했다.
- 검증:
  - `cd g5-admin && bun x vitest run src/app/adminRouteRegistry.test.tsx src/features/layout/navigation.test.ts`
  - `cd g5-admin && bun x tsc --noEmit`
  - `cd g5-admin && bun run lint`

### Rust 구조 감사 기준선과 문서/워크플로 정합성을 다시 고정

- Why: 형님이 지금 단계에서 “왜 벌써 이렇게 무겁냐, 이제 구현 시작인데 구조 감사 시점이 맞지 않느냐”를 정확히 짚으셨다. 실제로 Rust 총량은 Tauri 라이브러리 때문이 아니라 `문서 + 생성물 + 설정 + 수기 registry + 대형 page/command`가 함께 누적된 결과였고, 헌법의 `page + hook + workspace`, `문서 SSOT`, `php + rust routine 감사` 기준과도 일부 drift가 생겨 있었다. 지금 이 기준을 문서로 못 박지 않으면 다음 도메인 확장부터는 코드보다 문서와 registry drift를 쫓는 비용이 더 커진다.
- What:
  - `specs/audits/2026-03-12-RUST_ARCHITECTURE_AUDIT.md`를 추가해 LOC를 `코드 / 문서·스펙 / 생성물 / 설정·락파일`로 분리하고, workspace/crate 경계, SRP, DI, strong coupling, hardcoding, AI auditability, TDD/SDD, 문서-코드 정합성 기준의 구조 진단과 단계별 개선 순서를 정리했다.
  - `specs/{README.md,IMPLEMENTATION_ROADMAP.md,TODO.md}`를 갱신해 구조 안정화를 immediate priority로 승격하고, registry 단일화, oversized page/command 분리, DI seam 확보, SDD/TDD coverage 확대를 다음 단계 작업으로 고정했다.
  - `.agent/workflows/architecture-audit.md`를 새로 추가하고, `.agent/workflows/codex-audit.md`와 `.agent/workflows/integrated-three-way-audit.md`를 현재 헌법과 routine 범위(`php + rust`)에 맞게 보정했다.
- 검증:
  - `python3 scripts/doc-index.py`
  - `bash scripts/check-doc-governance.sh`

### 사이트 대시보드 카드 클릭과 표시 설정 툴바 테마 토글 UX를 바로잡음

- Why: 형님이 직접 확인한 최신 빌드에서 `등록된 사이트` 카드는 시각적으로는 선택 가능해 보이지만 실제로는 아무 동작이 없었고, 표시 설정 툴바는 라이트/다크를 분리 버튼으로 노출해 기대한 `한 번에 전환되는 토글` UX와 어긋나 있었다. 둘 다 작은 차이처럼 보여도, 사이트 전환과 표시 설정은 자주 쓰는 기본 동작이라 회귀를 그대로 두면 제품 신뢰를 깎는다.
- What:
  - `g5-admin/src/features/sites/SiteDashboardPage.tsx`에서 사이트 카드 전체를 `사이트 접속` 액션에 연결하고, `접속/삭제` 내부 버튼은 `stopPropagation()`으로 분리해 카드 클릭과 액션 버튼 충돌을 막았다.
  - `g5-admin/src/features/layout/DisplayToolbar.tsx`는 3분할 테마 버튼을 제거하고, 현재 해석된 라이트/다크 상태를 기준으로 다음 상태로 전환하는 단일 `테마 전환` 토글 버튼으로 단순화했다. 내부 테마 모델은 계속 `light / dark / system`을 유지한다.
  - `g5-admin/src/features/sites/SiteDashboardPage.test.tsx`, `g5-admin/src/features/layout/DisplayToolbar.test.tsx`, `specs/{README.md,foundation/ADMIN_UI_STYLE_GUIDE.md}`를 갱신해 카드 클릭 회귀와 테마 토글 UX를 SSOT까지 맞췄다.
- 검증:
  - `cd g5-admin && bunx vitest run src/features/sites/SiteDashboardPage.test.tsx src/features/layout/DisplayToolbar.test.tsx`
  - `cd g5-admin && bun run lint`
  - `cd g5-admin && bun run test`
  - `cd g5-admin && bun run build:web:fast`

### 로그인 전 절차 화면을 단일 컬럼 entry screen으로 다시 정리하고 같은 세션 새로고침 회귀를 고정

- Why: 형님이 직접 본 최신 절차 화면은 여전히 pre-auth 단계에 툴바/정보 패널/장황한 copy가 남아 있었고, `새로고침 시 첫 화면으로 다시 빠지는가`도 사용자 입장에서 매우 거슬리는 회귀 포인트였다. 로그인 전 단계는 앱 소개와 다음 액션만 보여야 하고, 같은 세션 안에서 refresh 했다고 다시 secure storage gate로 튕기면 제품 신뢰가 떨어진다.
- What:
  - `g5-admin/src/features/layout/EntryScreen.tsx`, `src/App.tsx`, `src/features/{master/MasterSetupPage.tsx,master/MasterUnlockPage.tsx,onboarding/SiteOnboardingPage.tsx,auth/LoginPage.tsx,sites/SiteActivationPage.tsx}`를 기준으로 pre-auth 절차 화면을 단일 컬럼 entry screen으로 정리하고, 툴바/2컬럼 정보 패널/장황한 설명을 제거했다.
  - `g5-admin/src/App.tsx`는 secure storage gate 수락 상태를 sessionStorage로 기억하고, 같은 세션 새로고침에서는 gate를 다시 요구하지 않도록 유지했다.
  - `g5-admin/src/App.first-run.e2e.test.tsx`에 `같은 세션 reload 시 secure storage gate를 건너뛰고 바로 작업면으로 복귀하는지` 회귀 시나리오를 추가했다.
- 검증:
  - `cd g5-admin && bunx vitest run src/App.first-run.e2e.test.tsx`
  - `cd g5-admin && bun run test`

### 관리자 셸/작업면 정합성을 다시 맞추고 환경설정·SMS 회귀를 정리

- Why: 형님이 한 번에 지적한 이슈는 단순 디자인 취향이 아니라 정보구조와 운영 회귀가 섞인 문제였다. `사이트관리`가 셸 밖 standalone처럼 보이고, `보안 설정` top-level 위치가 어색하고, `관리자` 헤더 표기가 과하고, `cmd_admin_config_update extra 누락`, `SMS 404 raw trace`처럼 실제 운영 회귀도 함께 있었다.
- What:
  - `g5-admin/src/features/layout/{AppShellHeader.tsx,AppShellSidebar.tsx,AppShellWorkspaceTabs.tsx,navigation.ts}`, `src/app/router.tsx`, `src-tauri/tauri.conf.json`, `src/index.css`를 갱신해 `앱설정` gear top tab, in-shell `사이트관리`, 관리자 ID-only 헤더, 좌측 서브메뉴 middle alignment, `#efefef + white surface`, 최소 viewport `300px`, shadow 제거 기준을 정리했다.
  - `g5-admin/src/features/config/{AdminConfigPage.tsx,admin-config-form.ts}`와 `src-tauri/src/models/config.rs`에서 `extra` 누락 회귀를 차단하고, config 저장 작업면을 상하 save bar + info callout + dev-only diagnostics 구조로 정리했다.
  - `g5-admin/src/features/system/AdminSmsConfigPage.tsx`는 `404 resource.not_found`를 `서버에서 SMS 기능이 비활성/미제공` 메시지로 치환하고, raw trace는 개발모드에서만 보이게 바꿨다.
  - `g5-admin/src/features/security/{SecuritySettingsPage.tsx,SecuritySettingsSections.tsx}`는 지원되지 않는 장치의 빠른 잠금 해제를 일반 모드에서 숨기고, dev-only diagnostics와 분리했다.
  - `g5-admin/src/features/config/admin-config-form.test.ts`, `src/features/security/SecuritySettingsPage.test.tsx`, `src/features/layout/{AppShellHeader.test.tsx,AppShellSidebar.test.tsx}`에 회귀 테스트를 추가/갱신했다.
- 검증:
  - `cd g5-admin && bunx vitest run src/features/layout/AppShellHeader.test.tsx src/features/layout/AppShellSidebar.test.tsx src/features/security/SecuritySettingsPage.test.tsx src/features/config/admin-config-form.test.ts`
  - `cd g5-admin && bun run test`
  - `cargo test --manifest-path g5-admin/src-tauri/Cargo.toml`

### 관리자 폼 메타데이터 원천과 자동 검증 전략을 SSOT로 고정

- Why: 형님이 정확히 짚은 질문은 `select냐 checkbox냐, 필수냐 아니냐, 기본값은 무엇이냐`를 Rust 화면이 임의 판단하면 안 된다는 점이었다. 이건 UX 일관성 문제이자 회귀 문제라서, 원천과 테스트 전략을 문서 SSOT로 못 박아야 다음 AI/작업 세션도 흔들리지 않는다.
- What:
  - `specs/foundation/ADMIN_FORM_REGRESSION_STRATEGY.md`를 추가해 관리자 폼의 canonical metadata source를 PHP REST `/admin/schema/*`로 고정했다.
  - 같은 문서에 `serializer diff test -> schema loading component test -> page save smoke -> route workflow smoke -> app-level e2e` 5단 회귀망을 정의했다.
  - `specs/{README.md,TODO.md}`, `specs/foundation/ADMIN_UI_STYLE_GUIDE.md`를 갱신해 field metadata source, 설명/info callout 분리, unsupported feature 숨김, sticky submenu + top/bottom save 원칙을 반영했다.
- 검증:
  - `python3 scripts/doc-index.py`
  - `bash scripts/check-doc-governance.sh`

### startup gate를 단일 히어로 + 보안 저장소 안내 카드로 단순화하고 휴대용 암호화 백업 구조를 도입

- Why: 형님이 직접 본 첫 화면은 보안 저장소 설명이 두 컬럼으로 중복되고, 상단 툴바까지 살아 있어 제품 첫 인상으로는 과했다. 동시에 기존 백업은 현재 SQLCipher DB 파일을 그대로 복사하는 수준이라 `새 장치 복구`, `장치 결합 비밀 제외`, `별도 백업 암호` 기준을 충족하지 못했다. 멀티OS 제품으로 가려면 런타임 비밀은 각 OS 보안 저장소에 맡기고, 이관 가능한 설정 백업만 앱이 직접 암호화하는 구조가 맞다.
- What:
  - `g5-admin/src/App.tsx`, `src/App.first-run.e2e.test.tsx`를 갱신해 첫 화면을 `짧은 앱 소개 히어로 + 보안 저장소 안내 카드 + 계속 버튼` 단일 컬럼 구조로 단순화하고, 상단 툴바/부가 카드/장황한 설명을 제거했다.
  - `g5-admin/src-tauri/src/db/backup.rs`, `src-tauri/src/models/backup.rs`, `src-tauri/src/commands/backup.rs`, `src-tauri/src/app_state/security.rs`에 `portable encrypted backup(.g5bak)` 포맷을 도입했다. 백업 파일은 사용자가 지정한 백업 암호에서 Argon2id로 키를 파생하고 XChaCha20-Poly1305로 암호화하며, `sites + site_settings`만 포함한다.
  - `g5-admin/src/features/{security/StepUpAuthDialog.tsx,sites/SiteDashboardPage.tsx}`를 갱신해 백업 export/import 시 마스터 비밀번호 step-up auth와 별도로 `백업 암호` 입력을 요구하고, 기존 `.db` SQLCipher 스냅샷 import는 레거시 동일 장치/동일 로컬 키 호환 경로로만 유지했다.
  - `g5-admin/src-tauri/src/db/mod.rs`, `src/features/sites/SiteDashboardPage.test.tsx`에 `백업 암호 없는 export 거부`, `틀린 백업 암호 import 거부`, `export dialog가 백업 암호 필드를 표시하는지` 회귀 테스트를 추가했다.
  - `specs/{README.md,TODO.md,HISTORY.md,domains/MULTI_SITE_FIRST_SCREEN_DRAFT.md,domains/MULTI_SITE_SDD.md}`와 `specs/codex/2026-03-10-SECURITY_IMPLEMENTATION_PROMPT.md`를 현재 구조에 맞게 동기화했다.
- 검증:
  - `cargo test --manifest-path g5-admin/src-tauri/Cargo.toml`
  - `cargo test --manifest-path g5-admin/src-tauri/Cargo.toml export_ts_bindings -- --nocapture`
  - `cd g5-admin && bun run lint`
  - `cd g5-admin && bun run test`
  - `cd g5-admin && bun run build:web:fast`
  - `python3 scripts/doc-index.py`
  - `bash scripts/check-doc-governance.sh`

### 표시 설정 툴바를 `자동 / 라이트 / 다크` 3모드 테마로 확장

- Why: 형님이 명확히 요구한 기준은 `light / dark / OS auto` 3모드 내장이었는데, 실제 런타임은 여전히 수동 라이트/다크 토글 전제로 남아 있었다. 이 상태는 SSOT, 디자인 방향, DisplayToolbar UX가 서로 어긋난 것이고, OS 자동 모드가 없는 만큼 실제 제품 상태를 정확히 반영하지 못했다.
- What:
  - `g5-admin/src/features/layout/theme.tsx`에서 theme 상태를 `light | dark | system`으로 확장하고, 현재 OS 선호도를 반영한 `resolvedTheme`를 별도로 계산하도록 바꿨다.
  - `DisplayToolbar.tsx`, `DisplayToolbar.test.tsx`를 갱신해 `자동 / 라이트 / 다크` 3버튼 segmented control과 로컬 저장 회귀를 고정했다.
  - 루트 dataset(`themeMode`, `resolvedTheme`)과 `color-scheme`를 함께 갱신해 테스트/실기/스크린샷 모두 같은 해석 상태를 읽을 수 있게 했다.
  - `specs/{README.md,TODO.md}`, `specs/foundation/ADMIN_UI_STYLE_GUIDE.md`를 현재 구현 기준으로 동기화했다.
- 검증:
  - `cd g5-admin && bunx vitest run src/features/layout/DisplayToolbar.test.tsx`
  - `cd g5-admin && bun run lint`
  - `cd g5-admin && bun run test`
  - `cd g5-admin && bun run build:web:fast`

### 주요 route-native 작업면 1차 densify로 셸과 같은 admin template 밀도를 적용

- Why: 상단 셸만 더 각지고 조밀해져도 내부 작업면이 기존 큰 글자/큰 radius/느슨한 표 간격을 유지하면 한 제품처럼 보이지 않는다. 형님이 준 레퍼런스와 기준은 메뉴 구조뿐 아니라 `더 작은 기본 글자`, `짧은 설명`, `과하지 않은 여백`, `앱 같은 정렬감`까지 포함하므로, 실제 업무 화면도 같은 밀도로 눌러야 했다.
- What:
  - 공용 primitives인 `src/components/ui/card.tsx`, `src/features/layout/PageIntro.tsx`, `src/features/admin/shared/AdminDataTable.tsx`, `src/features/members/MembersDataTable.tsx`, `src/features/members/MemberDetailCard.tsx`를 compact admin template rhythm으로 줄였다.
  - `환경설정`, `회원관리`, `게시판관리`, `SMS 연락처 관리` 페이지에 compact action tile, 더 작은 검색/표/카드 간격, 더 좁은 grid 비율을 적용해 작업면 밀도를 셸과 맞췄다.
  - `src/features/layout/theme.tsx`의 font scale을 `13 / 14 / 15px` 기준으로 낮춰 기본 글자 크기 자체를 한 단계 줄였다.
  - `specs/TODO.md`, `specs/README.md`, `specs/foundation/ADMIN_UI_STYLE_GUIDE.md`에 densify 완료 범위와 현재 밀도 기준을 반영했다.
- 검증:
  - `cd g5-admin && bunx vitest run src/features/config/AdminConfigPage.test.tsx src/features/boards/AdminBoardsPage.test.tsx src/features/sms-contacts/AdminSmsContactsPage.test.tsx src/features/members/MemberDetailCard.test.tsx`
  - `cd g5-admin && bun run lint`
  - `cd g5-admin && bun run test`
  - `cd g5-admin && bun run build:web:fast`

### 멀티사이트 canonical IA를 상단 작업 탭 + overflow + 좌측 서브메뉴 구조로 재정렬

- Why: 형님이 직접 지적한 대로 현재 셸은 상단과 좌측에 최상위 정보가 중복돼 있었고, `현재 사이트` 버튼까지 겹치면서 사이트 전환 정보구조가 흐려졌다. 동시에 등록 사이트 전체를 좌측에 고정 노출하는 방식은 탭형 admin template 레퍼런스와도 어긋났고, 사이트가 많아질수록 스캔성과 일관성이 떨어졌다.
- What:
  - `g5-admin/src/features/layout/AppShellWorkspaceTabs.tsx`를 추가해 고정 최상위 탭(`사이트관리` + 주요 관리자 그룹), 열린 사이트 탭, overflow `더보기` 메뉴를 상단 작업 탭으로 통합했다.
  - `AppShellHeader.tsx`, `AppShellSidebar.tsx`, `AppShellHeader.test.tsx`, `AppShellSidebar.test.tsx`, `App.first-run.e2e.test.tsx`를 갱신해 좌측 사이트 목록과 우측 `현재 사이트` 중복 표시를 제거하고, 좌측은 현재 상단 탭의 서브메뉴만 남기도록 재정렬했다.
  - `src/index.css` 기준 기본 폰트와 radius를 한 단계 더 줄여 conventional admin template의 더 작고 각진 밀도로 맞췄다.
  - `specs/{README.md,TODO.md}`, `specs/foundation/ADMIN_UI_STYLE_GUIDE.md`, `specs/domains/{MULTI_SITE_SDD.md,MULTI_SITE_FIRST_SCREEN_DRAFT.md}`를 현재 canonical 구조로 동기화했다.
- 검증:
  - `cd g5-admin && bun run lint`
  - `cd g5-admin && bun run test`
  - `cd g5-admin && bun run build:web:fast`
  - `python3 scripts/doc-index.py`
  - `bash scripts/check-doc-governance.sh`

### 공용 admin primitives를 눌러 메뉴 전반에 같은 앱 톤을 퍼지게 정리

- Why: 셸과 오버뷰만 admin app 톤으로 바꾸면 나머지 route-native 메뉴들은 여전히 둥근 badge, 느슨한 input, 웹형 table rhythm이 남아 있어서 화면 전체가 한 제품처럼 보이지 않는다. 형님이 메뉴마다 스샷을 줄 수 없는 만큼, 공용 primitives를 먼저 눌러야 이후 관리자 화면 전반이 같은 방향으로 자연스럽게 따라온다.
- What:
  - `g5-admin/src/components/ui/{badge,button,input,input-group,textarea}.tsx`를 조정해 radius를 줄이고, admin toolbar/control bar에 맞는 compact control rhythm으로 정리했다.
  - `g5-admin/src/features/admin/shared/{AdminDataTable,AdminFormFields}.tsx`를 갱신해 table header, form field shell, readonly/info/toggle 블록을 conventional admin template 톤으로 눌렀다.
  - `g5-admin/src/features/{layout/PageIntro.tsx,shared/ErrorBanner.tsx}`도 같은 기준으로 평평한 alert/section language를 쓰도록 맞췄다.
  - `specs/foundation/ADMIN_UI_STYLE_GUIDE.md`에 `작업 도구형 control bar`, `compact table header` 기준을 추가했다.
- 검증:
  - `cd g5-admin && bun run lint`
  - `cd g5-admin && bun run test`
  - `cd g5-admin && bun run build:web:fast`
  - `python3 scripts/doc-index.py`
  - `bash scripts/check-doc-governance.sh`

### 관리자 셸 시각 언어를 conventional admin app 톤으로 재정렬

- Why: 형님이 주신 레퍼런스와 디자인 기준은 `웹사이트 같은 관리자`가 아니라 `구조화된 메뉴와 촘촘한 작업면을 가진 conventional admin app`이었다. 기존 셸은 기능은 맞아도 radius, spacing, shadow, overview 카드 리듬이 다소 부드럽고 소개형 톤이 남아 있어, 실무 운영자 기준의 도구감이 부족했다.
- What:
  - `g5-admin/src/index.css`, `src/components/ui/card.tsx`, `src/features/layout/{AppShell,AppShellHeader,AppShellSidebar,PageIntro,shell.ts}`를 조정해 표면 톤, radius, spacing, shadow를 더 평평하고 촘촘한 admin template 기준으로 재정렬했다.
  - `g5-admin/src/features/overview/AdminOverviewPage.tsx`를 dense KPI 카드, 사이트 운영 요약, 최근 작업, 빠른 링크 중심의 작업 홈으로 재구성했다.
  - 형님이 준 사용자/구조/금지사항을 `specs/foundation/ADMIN_UI_STYLE_GUIDE.md`에 문서화하고, `specs/README.md`에 canonical 관리자 디자인 기준으로 연결했다.
  - 제품 방향으로 요청된 `light / dark / OS auto` 3모드 테마는 미구현 항목으로 `specs/TODO.md` Inbox에 등록했다.
- 검증:
  - `cd g5-admin && bun run lint`
  - `cd g5-admin && bun run test`
  - `cd g5-admin && bun run build:web:fast`
  - `python3 scripts/doc-index.py`
  - `bash scripts/check-doc-governance.sh`

### `api/client/core.ts`를 command context registry와 api target resolver로 분리

- Why: `g5-admin/src/api/client/core.ts`는 실제 호출/에러 정규화와 별개로 2,000줄이 넘는 `buildCommandContext`/`resolveApiTarget` switch를 함께 품고 있어, 새 command를 추가할 때 진단 컨텍스트와 target 매핑 drift를 동시에 만들기 쉬운 상태였다. 실제로 local `master/security/site` 명령 14개는 `resolveApiTarget`에서 빠져 있어 debug summary 기준 `apiTarget=unknown`으로 떨어지는 누락이 존재했다.
- What:
  - `g5-admin/src/api/client/core/command-context.ts`를 추가해 command context registry와 payload selector helper를 분리했다.
  - `g5-admin/src/api/client/core/api-targets.ts`를 추가해 API/local pseudo target 해석기를 분리했다.
  - `g5-admin/src/api/client/core.ts`는 `invoke/error/diagnostic` spine만 남기고 `buildCommandContext`를 외부 모듈에서 가져오도록 경량화했다.
  - 누락돼 있던 local `master lock / security / site catalog` 명령 14개의 `apiTarget`을 보강했다.
  - `g5-admin/src/api/client/core/command-context.test.ts`를 추가해 대표 명령 컨텍스트 회귀와 `command-context.ts` ↔ `api-targets.ts` case parity를 고정했다.
- 검증:
  - `cd g5-admin && bunx vitest run src/api/client/core/command-context.test.ts`
  - `cd g5-admin && bun run lint`
  - `cd g5-admin && bun run test`
  - `cd g5-admin && bun run build:web:fast`

### `AdminSmsContactsPage`를 그룹/연락처/가져오기·내보내기 작업면으로 분리

- Why: `g5-admin/src/features/sms-contacts/AdminSmsContactsPage.tsx`는 그룹 목록과 편집, 연락처 검색·batch 작업·편집, 파일 가져오기/내보내기를 한 파일에 모두 넣고 있어 프런트 god page 감사에서 가장 큰 화면 중 하나였다. 특히 이 화면은 query 4개와 mutation 10개를 같이 품고 있어서, 렌더링 경계를 먼저 정리하지 않으면 다음 회귀 때 영향 범위를 좁히기 어려웠다.
- What:
  - `g5-admin/src/features/sms-contacts/AdminSmsContactsSections.tsx`를 추가해 `그룹 작업면`, `연락처 작업면`, `가져오기·내보내기` 렌더링 섹션을 밖으로 분리했다.
  - `g5-admin/src/features/sms-contacts/AdminSmsContactsPage.tsx`는 route/title 판정, query/mutation orchestration, form state, dialog state만 담당하도록 정리했다.
  - `g5-admin/src/features/sms-contacts/AdminSmsContactsPage.test.tsx`를 추가해 기본 `/admin/sms/contacts` 화면과 `/admin/sms/contact-files` 라우트 회귀를 고정했다.
- 검증:
  - `cd g5-admin && bunx vitest run src/features/sms-contacts/AdminSmsContactsPage.test.tsx`
  - `cd g5-admin && bun run lint`
  - `cd g5-admin && bun run test`

### `SecuritySettingsPage`를 상태 컨테이너와 렌더링 섹션으로 분리

- Why: `g5-admin/src/features/security/SecuritySettingsPage.tsx`는 마스터 비밀번호 변경, idle timeout step-up, Google OTP 등록/해제, fast unlock 등록/폐기, 보안 저장소 요약, OTP enrollment dialog를 한 파일에 모두 품고 있었다. 이 상태는 보안 UX 회귀가 나도 어느 영역이 깨졌는지 좁히기 어렵고, 페이지 크기도 헌법 권장선을 크게 넘기고 있었다.
- What:
  - `g5-admin/src/features/security/SecuritySettingsSections.tsx`를 추가해 상태 없는 렌더링 섹션(`status / fast unlock / password change / idle timeout / totp / storage summary / totp dialog`)을 밖으로 분리했다.
  - `g5-admin/src/features/security/SecuritySettingsPage.tsx`는 state, mutation handler, step-up dialog orchestration만 담당하도록 정리했다.
  - `g5-admin/src/features/security/SecuritySettingsPage.test.tsx`를 추가해 정상 렌더, 오류 fallback, idle-timeout step-up dialog 노출을 회귀 테스트로 고정했다.
- 검증:
  - `cd g5-admin && bunx vitest run src/features/security/SecuritySettingsPage.test.tsx`
  - `cd g5-admin && bun run lint`
  - `cd g5-admin && bun run build:web:fast`

### `db`를 사이트 저장소/보안 설정/백업 기능 모듈로 분리

- Why: `g5-admin/src-tauri/src/db.rs`는 사이트 CRUD, activity 로그, 앱 잠금 verifier, fast unlock, app settings, TOTP keyring, session hint, SQLCipher backup import/export와 bootstrap helper까지 한 파일에 몰려 있었다. `app_state`만 나눠서는 보안/저장소 회귀를 충분히 줄이기 어렵기 때문에, 저장소 레이어도 실제 기능 경계 기준으로 다시 세울 필요가 있었다.
- What:
  - `g5-admin/src-tauri/src/db.rs`를 `g5-admin/src-tauri/src/db/mod.rs`로 승격하고 SQLCipher/keyring/bootstrap/migration/helper/test만 공통부에 남겼다.
  - 사이트 CRUD, activity 로그, session hint는 `g5-admin/src-tauri/src/db/sites.rs`로 이동했다.
  - 앱 잠금 verifier, fast unlock verifier, app settings, TOTP keyring 접근은 `g5-admin/src-tauri/src/db/security.rs`로 이동했다.
  - backup export/import와 site_settings merge는 `g5-admin/src-tauri/src/db/backup.rs`로 이동했다.
  - 기존 `db::tests`가 계속 같은 경로를 검증하도록 helper visibility만 `pub(super)` 수준으로 조정하고 동작은 유지했다.
- 검증:
  - `cargo check --manifest-path g5-admin/src-tauri/Cargo.toml`
  - `cargo test --manifest-path g5-admin/src-tauri/Cargo.toml db::tests -- --nocapture`
  - `cargo test --manifest-path g5-admin/src-tauri/Cargo.toml`

### `app_state`를 로컬 잠금/보안 설정/사이트 카탈로그 기능 모듈로 분리

- Why: `g5-admin/src-tauri/src/app_state.rs`는 마스터 잠금, TOTP, backup, idle timeout, fast unlock, 사이트 카탈로그와 CRUD를 한 파일에 모두 품고 있어 god file 감사에서 가장 먼저 쪼개야 할 대상으로 잡혔다. 형님이 요청한 대로 억지 분할이 아니라 실제 기능 경계 기준으로 정리하고, 기존 회귀 테스트를 그대로 유지한 채 구조만 분리할 필요가 있었다.
- What:
  - `g5-admin/src-tauri/src/app_state.rs`를 `g5-admin/src-tauri/src/app_state/mod.rs`로 승격하고 공통 state/초기화/helper만 남겼다.
  - 마스터 잠금/TOTP/unlock failure backoff는 `g5-admin/src-tauri/src/app_state/master_lock.rs`로 이동했다.
  - 보안 설정/backup/TOTP enrollment/fast unlock은 `g5-admin/src-tauri/src/app_state/security.rs`로 이동했다.
  - 사이트 카탈로그/활성 사이트/CRUD/activity는 `g5-admin/src-tauri/src/app_state/sites.rs`로 이동했다.
  - 기존 `app_state::tests`가 같은 행위를 계속 검증하도록 helper visibility만 `pub(super)`로 조정하고 테스트 시나리오는 그대로 유지했다.
- 검증:
  - `cargo check --manifest-path g5-admin/src-tauri/Cargo.toml`
  - `cargo test --manifest-path g5-admin/src-tauri/Cargo.toml app_state::tests -- --nocapture`
  - `cargo test --manifest-path g5-admin/src-tauri/Cargo.toml`

### critical coverage 안전마진을 다시 벌리기 위해 form helper 회귀 테스트를 보강

- Why: 통합 감사와 critical coverage 게이트는 모두 녹색이었지만, 함수 커버리지가 `81.17%`까지 내려와 threshold `80%`에 너무 붙어 있었다. 이 상태는 작은 회귀 하나에도 게이트가 바로 흔들릴 수 있어, 제품 로직이 얇게 모여 있는 form helper 레이어에 negative/default/normalization 테스트를 더 넣어 여유폭을 확보할 필요가 있었다.
- What:
  - `g5-admin/src/features/mails/admin-mails-form.test.ts`에 template update, direct send validation, group/member/preview normalization 케이스를 추가
  - `g5-admin/src/features/permissions/admin-permissions-form.test.ts`에 null/default hydration, key composition, invalid save payload 케이스를 추가
  - `g5-admin/src/features/points/admin-points-form.test.ts`에 default values, invalid action payload, invalid expire date 회귀를 추가
  - critical coverage를 `statements 86.46 / branches 77.98 / functions 82.42 / lines 86.51`로 상향
- 검증:
  - `cd g5-admin && bunx vitest run src/features/mails/admin-mails-form.test.ts src/features/permissions/admin-permissions-form.test.ts src/features/points/admin-points-form.test.ts`
  - `cd g5-admin && bun run test:coverage:critical`

### local fast deploy의 session/db master storage를 file override로 고정해 keychain prompt를 제거

- Why: 형님이 local manual test 중 반복해서 본 `Keychain 두 번` prompt는 기능상 불가항력이라기보다, ad-hoc fast deploy에서도 `desktop-session`과 `db-key`를 계속 keychain에 남겨둔 운영 선택의 문제였다. 이 상태는 local secure storage UX를 계속 오염시키고, 제품 플로우 검증보다 macOS keychain prompt 노이즈를 더 크게 만든다.
- What:
  - `runtime_config`에 `dbMasterStorage=keychain|file`을 추가하고, `db.rs`가 DB master key 저장 백엔드를 설정 기반으로 분기하도록 보강
  - `scripts/deploy-rust-admin-desktop.mjs`가 `--fast`일 때 OS 사용자 설정 파일 `app-config.json`을 생성해 `sessionStorage=file`, `dbMasterStorage=file` override를 적용하고, non-fast 배포에서는 Codex가 관리한 동일 override만 자동 제거하도록 보강
  - startup 안내 문구와 SSOT 문서를 `fast deploy는 DB key와 site session 모두 file` 기준으로 수정
  - file DB master storage fresh-open 회귀 테스트를 추가
- 검증:
  - `cd g5-admin && bun run test`
  - `cd g5-admin && bun run build:web:fast`
  - `bun run deploy:desktop:fast`
  - 생성된 OS 사용자 설정 파일이 `sessionStorage=file`, `dbMasterStorage=file`을 포함하는지 확인

### 통합 세션과 감사 기준을 `php + rust` 현재 제품 범위로 축소하고 보관 상태 Flutter/Web를 routine 범위에서 제외

- Why: 형님이 `web`, `flutter` 폐기를 확정한 시점에도 루트 헌법, Rust/PHP 감사 진입점, GitHub Actions workflow, 통합 감사 표준 문서는 계속 3자 기준을 기본값처럼 가정하고 있었다. 이 상태를 두면 generated audit와 실제 제품 범위가 다시 어긋나고, 불필요한 archived drift가 routine 판단을 계속 오염시킨다.
- What:
  - 루트 `AGENTS.md`를 `php + rust` 활성 세션 기준으로 재작성하고, `flutter`, `web`는 기본 구현/감사 범위에서 제외되는 보관 상태라고 명시
  - `g5-admin/package.json`, `php/composer.json`, `scripts/run_integrated_audit.py`, GitHub Actions workflow를 `php + rust` 기본 진입점 기준으로 정리하고, archived Flutter 비교는 명시적 `--flutter-root`가 있을 때만 동작하게 축소
  - `rust/{README.md,specs/README.md,specs/integration/INTEGRATED_AUDIT_STANDARD.md}`와 `php/docs/{HISTORY.md,testing/EXTERNAL_PROVIDER_TESTING_REVIEW.md}`를 현재 활성 소비자/감사 경계 기준으로 갱신
- 검증:
  - `cd g5-admin && bun run audit:integrated`
  - `composer --working-dir /Users/neojins/workspace/gnuboard5/php run audit:integrated`

### 첫 실행 전체 흐름을 App 수준 E2E 회귀 테스트로 고정

- Why: 지금까지는 route-level과 hook-level 회귀망이 많았지만, 형님이 실제 설치본에서 계속 발견한 문제들은 `보안 저장소 gate -> 마스터 잠금 -> 사이트 등록/활성화 -> 로그인 -> overview`가 한 번에 이어질 때 터졌다. 조각 테스트만으로는 이 제품 흐름을 충분히 잠그기 어렵기 때문에, App 전체를 실제 라우터로 띄우는 end-to-end 회귀망이 필요했다.
- What:
  - `g5-admin/src/App.first-run.e2e.test.tsx`를 추가해 secure storage 안내 화면, 마스터 잠금 설정, 첫 사이트 등록, 사이트 활성화, 사이트 로그인, overview 진입까지를 단일 시나리오로 검증
  - 테스트 안에서 `@tauri-apps/api/core` `invoke`를 command 단위 상태 기계로 mock해 첫 실행 흐름의 주요 IPC를 실제 순서대로 재현
  - canonical 멀티사이트 내비게이션이 `좌측 사이트 목록` 기준이라는 점을 E2E 결과물에도 같이 표시
- 검증:
  - `cd g5-admin && bunx vitest run src/App.first-run.e2e.test.tsx`

### 배포 직후 현재 OS 기준 서명/신뢰 상태를 자동으로 출력해 수동 검증 시 신뢰 단서를 먼저 보이게 조정

- Why: 형님이 계속 수동 검증하는 단계에서는 앱이 실제로 어느 수준으로 서명·신뢰된 번들인지 배포 직후 바로 읽혀야 한다. 지금까지는 `deploy:desktop*`이 설치까지만 하고 끝나서, ad-hoc/local trust 상태인지도 따로 시스템 명령으로 다시 확인해야 했다.
- What:
  - `scripts/deploy-rust-admin-desktop.mjs`에 macOS `codesign/spctl`, Windows `Get-AuthenticodeSignature`, Linux 안내 로그 기반의 post-deploy trust report를 추가
  - `scripts/deploy-rust-admin-macos-fast.sh`는 바이너리 교체 뒤 `.app` 번들을 ad-hoc 재서명해 fast deploy가 깨진 서명 상태를 남기지 않도록 보정
  - `specs/README.md`에 `deploy:desktop*`는 배포 직후 trust/signature 상태를 자동 보고해야 하고, fast deploy는 ad-hoc/local trust일 수 있으므로 보고와 정식 서명 구성을 함께 봐야 한다는 기준을 고정
- 검증:
  - `cd g5-admin && bun run deploy:desktop:fast`

### 테스트/빌드 출력 잡음을 정리해 회귀 신호를 더 선명하게 만들고 웹 번들 청크 경고를 제거

- Why: 형님이 계속 수동 검증을 하는 단계에서는 테스트/빌드 출력 잡음이 적어야 실제 회귀를 빨리 읽을 수 있다. 그런데 Vitest는 Node 25 `--localstorage-file` 경고를 매 테스트 worker마다 뿜고 있었고, 웹 빌드는 `index` 청크 500kB 초과 경고가 반복돼서 중요한 실패 신호를 흐리고 있었다.
- What:
  - `src/test/setup.ts`에서 `window.localStorage` getter를 먼저 건드리던 검사를 제거하고, 테스트용 storage mock을 바로 주입해 Node 25 webstorage 경고를 차단
  - `vite.config.ts`의 manual chunk 규칙을 로컬 route page 기준으로 재조정해 `feature-environment`, `feature-admin-content`, `feature-sms`, `feature-tools`, `feature-popups` 청크로 분리하고, 순환 청크 경고 없이 `index` 크기를 122kB 수준으로 낮춤
- 검증:
  - `cd g5-admin && bunx vitest run src/features/auth/LoginPage.test.tsx`
  - `cd g5-admin && bun run test`
  - `cd g5-admin && bun run build:web:fast`

### 첫 실행 멀티사이트 흐름을 route-level 회귀 스모크로 고정

- Why: 형님이 실제 설치본에서 `초기 사이트 등록 -> 로그인 -> 흰 화면`을 발견한 뒤 auth/session cache와 site catalog cache가 엇갈리면 redirect loop가 생길 수 있다는 점이 드러났다. 조각 테스트만으로는 첫 실행 흐름 전체를 충분히 잠그지 못했으므로, 첫 등록과 로그인 후 진입 경로를 route-level 스모크로 묶을 필요가 있었다.
- What:
  - `src/features/onboarding/SiteOnboardingPage.test.tsx`를 추가해 첫 사이트 등록 완료 시 `/sites/:siteId/activate`로 이동하는 흐름을 고정
  - `src/features/auth/LoginPage.test.tsx`에 이미 인증된 사이트 세션은 로그인 화면에 머무르지 않고 `/sites/:siteId/overview`로 빠지는 회귀 테스트를 추가
  - `src/features/auth/use-auth-session.test.tsx`와 함께 첫 실행 route 흐름, cache 동기화, 로그인 후 진입 경로를 한 묶음으로 고정
- 검증:
  - `cd g5-admin && bunx vitest run src/features/auth/LoginPage.test.tsx src/features/onboarding/SiteOnboardingPage.test.tsx src/features/auth/use-auth-session.test.tsx src/features/layout/ProtectedLayout.test.tsx`
  - `cd g5-admin && bun run lint`

### TDD / 회귀 방지 규칙을 헌법 본문으로 승격

- Why: 형님이 직접 지적한 대로 기존 문서는 `테스트 없는 구현은 미완성`과 일부 감사 보고서는 있었지만, 어떤 AI 모델이라도 오해 없이 따를 만큼 `버그 수정 시 회귀 테스트 필수`, `실패 테스트 우선`, `보안/부트스트랩 경로 전용 회귀망 필수`가 헌법 수준으로 명시되어 있지 않았다. 감사 문서에만 남겨두면 강제력이 약하고, startup/keychain 같은 민감 회귀가 다시 반복될 수 있었다.
- What:
  - `.agent/Constitution.md`의 `§13.7 테스트 필수 사항`을 보강해 bugfix=회귀 테스트 필수, TDD 우선 원칙, secure storage/첫 실행/마이그레이션 전용 회귀망 의무, 테스트 실행 명령 보고 의무를 강제 규칙으로 명문화
  - `specs/foundation/DEV_BOOTSTRAP_CHECKLIST.md`에 `3.1 버그 수정 / 회귀 방지 게이트`를 추가해 개발 착수와 마감 시 재현 테스트, 민감 경로 테스트, 실행 명령 기록 여부를 바로 점검할 수 있게 정리
- 검증:
  - 문서 규칙 보강이라 별도 코드 테스트는 생략
  - 후속으로 `python3 scripts/doc-index.py`
  - 후속으로 `bash scripts/check-doc-governance.sh`

### 멀티OS 보안 저장소 접근을 사용자 가시 UI 뒤로 늦추고 마스터 BF 방어 UX를 제품 기준으로 보강

- Why: 형님이 직접 짚은 대로 앱 창이 뜨기도 전에 macOS Keychain prompt가 먼저 뜨면 악성 프로그램처럼 보일 수 있고, 같은 startup 구간에 보안 저장소 비밀번호를 두 번 묻는 UX도 제품 기준으로 정당화할 수 없었다. 여기에 기존 unlock temporary lockout이 `60초` 단위라 BF 방어 강도가 약했고, 차단 중에도 입력창과 버튼이 계속 살아 있어 UX와 보안 모두 애매했다.
- What:
  - `g5-admin/src/App.tsx`에 secure storage gate를 추가해 앱이 먼저 이유를 설명하고, 형님이 `계속`을 눌렀을 때만 macOS Keychain / Windows Credential Manager / Linux Secret Service 접근이 발생하도록 부트 순서를 재구성
  - `g5-admin/src-tauri/src/{app_state.rs,db.rs}`를 lazy DB key 로딩 기준으로 재구성해 startup 시 DB와 사이트 catalog를 미리 열지 않도록 바꾸고, secure storage가 실제로 필요한 시점까지 SQLCipher 키 조회를 지연
  - `g5-admin/src-tauri/src/commands/security.rs`, `src/features/master/MasterUnlockPage.tsx`, `src/features/master/use-master-lock.ts`를 갱신해 startup passive status check가 OS biometry secure storage를 건드리지 않게 하고, unlock rate limit은 `5회 실패 -> 5분`, 이후 실패마다 `+5분` 가산, 잠금 중 입력/버튼 전면 비활성화 기준으로 상향
  - `specs/{README.md,TODO.md,domains/MULTI_SITE_SDD.md,domains/MULTI_SITE_FIRST_SCREEN_DRAFT.md}`와 `.agent/Constitution.md`를 갱신해 멀티OS secure storage pre-prompt 금지와 BF 방어 UX 기준을 SSOT로 고정
- 검증:
  - `cargo test --manifest-path g5-admin/src-tauri/Cargo.toml`
  - `cd g5-admin && bun run lint`
  - `cd g5-admin && bun run build:web:fast`
  - `cargo check --manifest-path g5-admin/src-tauri/Cargo.toml`
  - `python3 scripts/doc-index.py`
  - `bash scripts/check-doc-governance.sh`

### 사이트 카탈로그와 auth probe를 분리해 startup keychain 2회 접근 회귀를 축소

- Why: secure storage gate와 lazy DB key 적용 뒤에도 startup에서 `site_catalog -> desktop-session keychain 확인`과 `cmd_auth_status`가 겹치면 형님이 본 것처럼 키체인 비밀번호를 두 번 물을 수 있었다. 사이트 대시보드/로그인 진입 판정은 비밀 값이 아니라 로컬 세션 존재 힌트만으로도 충분하므로, startup에서 keychain 세션을 미리 검증하는 구조 자체를 줄일 필요가 있었다.
- What:
  - `g5-admin/src-tauri/src/db.rs`에 `site_runtime_state` 세션 힌트 저장을 추가하고, `app_state.rs`의 `site_catalog()`는 keychain을 조회하지 않고 로컬 힌트만으로 `authenticated/signed_out` 상태를 만든다.
  - `g5-admin/src-tauri/src/commands/{auth,common}.rs`에서 로그인/로그아웃/refresh/no-session 경로마다 힌트를 동기화해 stale 상태를 정리한다.
  - `src/features/{auth/LoginPage.tsx,layout/ProtectedLayout.tsx}`는 사이트 카탈로그가 `authenticated`로 표시한 경우에만 `useAuthSession()`을 켜도록 바꿔 startup 자동 세션 probe를 한 번 더 줄였다.
  - 회귀 테스트로 `app_state.rs`, `LoginPage.test.tsx`, `ProtectedLayout.test.tsx`를 보강해 로컬 세션 힌트와 지연 auth probe 규칙을 고정했다.
- 검증:
  - `cargo test --manifest-path g5-admin/src-tauri/Cargo.toml`
  - `cd g5-admin && bun run test`
  - `cd g5-admin && bun run lint`

### legacy `apiBaseUrl` 추천 노출을 폐기하고 첫 사이트를 완전 수동 입력으로 고정

- Why: 형님이 직접 확인한 것처럼 온보딩에서 `레거시 설정에서 추천 URL을 찾았습니다` 문구가 다시 뜨면 현재 기획인 `첫 사이트는 사용자가 직접 입력`과 충돌한다. 자동 주입만 막고 추천값 노출을 남겨두면 bundled `app-config.json`이나 사용자 로컬 설정이 다시 UX를 오염시킬 수 있다.
- What:
  - `g5-admin/src/features/{onboarding/sites}/**`에서 추천 URL 배너와 적용 버튼을 제거해 첫 사이트 등록 화면이 항상 빈 입력 상태에서 시작하도록 정리
  - `g5-admin/src-tauri/src/{app_state.rs,models/master_lock.rs}`와 `src/types/MasterLockStatus.ts`에서 `suggested_api_base_url` payload를 제거해 legacy 설정값이 프런트로 전달되지 않게 차단
  - 번들 [app-config.json](/Users/neojins/workspace/gnuboard5/rust/g5-admin/src-tauri/app-config.json) 에서 `apiBaseUrl` 기본값을 제거하고, 멀티사이트 SSOT 문서를 `자동 주입 금지`에서 `자동 주입 + 추천 노출 모두 금지` 기준으로 갱신
- 검증:
  - `cargo test --manifest-path g5-admin/src-tauri/Cargo.toml`
  - `cd g5-admin && bun run lint`
  - `cd g5-admin && bun run build:web:fast`

### startup secure storage prompt를 단일 DB key 경로로 축소하고 사이트 연결 테스트에 OS 네트워크 허용 대기 창을 추가

- Why: 형님이 직접 본 것처럼 startup 구간에서 보안 저장소 비밀번호를 두 번 묻거나, 첫 사이트 등록의 `연결 테스트`가 macOS 네트워크/방화벽 허용 알림을 처리하기도 전에 바로 실패하면 제품 UX로 보기 어렵다. 앱은 창이 먼저 뜬 뒤 필요한 이유를 설명해야 하고, 연결 테스트는 OS 권한 허용 대기 시간을 흡수해야 한다.
- What:
  - `g5-admin/src-tauri/src/{db,app_state}.rs`, `commands/{auth,common}.rs`, `token_store.rs`를 조정해 fresh 첫 실행은 `db-key`를 바로 생성/저장하고, 사이트 카탈로그/로그인 진입 판정은 로컬 `site_runtime_state` 힌트만 사용하도록 바꿔 startup에서 `desktop-session` keychain probe가 먼저 일어나지 않게 정리
  - `src/features/{auth/LoginPage.tsx,layout/ProtectedLayout.tsx}`는 사이트가 로컬 힌트상 `authenticated`일 때만 실제 세션 조회를 켜도록 바꿔 startup 중복 prompt 경로를 더 줄임
  - `g5-admin/src-tauri/src/commands/site.rs`의 health check는 transport error를 즉시 실패로 끝내지 않고 최대 15초 동안 750ms 간격으로 재시도하며, `src/features/sites/SiteRegistrationForm.tsx`는 그동안 `운영체제가 네트워크 접근이나 방화벽 허용을 묻는 경우 먼저 승인` 문구와 spinner를 유지
  - 멀티사이트 SSOT 문서를 갱신해 `startup secure storage prompt는 0회 또는 1회일 수 있으나, 창이 뜨기 전 선접근과 같은 startup action에서의 중복 prompt는 허용하지 않음` 기준과 `연결 테스트 재시도 창`을 명문화
- 검증:
  - `cargo test --manifest-path g5-admin/src-tauri/Cargo.toml`
  - `cd g5-admin && bun run test`
  - `cd g5-admin && bun run lint`
  - `cd g5-admin && bun run build:web:fast`
  - `python3 scripts/doc-index.py`
  - `bash scripts/check-doc-governance.sh`

### 로그인 직후 site catalog/auth cache를 즉시 동기화해 `/login ↔ /overview` 흰 화면 회귀를 차단

- Why: 형님이 fresh 첫 사이트 등록 뒤 `로그인 -> 흰 화면`을 확인했고, 원인은 로그인 성공 후 `auth status` 캐시는 즉시 인증됨으로 바뀌는데 `site_catalog` 캐시가 아직 `signed_out`으로 남아 `/sites/:siteId/login`과 `/sites/:siteId/overview`가 서로 다른 상태를 보고 redirect loop를 만들 수 있는 점이었다.
- What:
  - `g5-admin/src/features/sites/use-site-catalog.ts`에 현재 사이트의 `authenticated/signed_out` 상태만 안전하게 패치하는 helper를 추가
  - `g5-admin/src/features/auth/use-auth-session.ts`에서 로그인 성공, 로그아웃 성공, `auth status` query 성공 시 현재 사이트의 `site_catalog` 캐시 상태를 즉시 동기화
  - 회귀 테스트로 `src/features/auth/use-auth-session.test.tsx`를 추가해 로그인/로그아웃/auth status가 site catalog cache를 바로 갱신하는 동작을 잠금
- 검증:
  - `cd g5-admin && bunx vitest run src/features/auth/use-auth-session.test.tsx src/features/auth/LoginPage.test.tsx src/features/layout/ProtectedLayout.test.tsx`
  - `cd g5-admin && bun run lint`

### 통합 감사의 field parity/legacy coverage 판정을 현재 Rust 설계와 실제 PHP 이관 범위에 맞게 정규화

- Why: `php-rust` 전용 감사까지 도입한 뒤에도 warning이 2개 남아 있었는데, 내용을 까보면 실제 계약 누락이 아니라 감사 스크립트의 과잉 비교가 원인이었다. 응답 필드 감사는 OpenAPI envelope(`data/meta/pagination`)와 Rust flattened DTO(`items|board|boards|catalog|schema + trace ids`)를 그대로 충돌로 보고 있었고, legacy coverage는 `schema-domains.json`이 원래 커버하지 않는 update/delete/helper 스크립트와 이미 API로 대체된 entrypoint까지 전부 `unmapped`로 세고 있었다.
- What:
  - `scripts/run_integrated_audit.py`의 field parity 비교에 response flattening alias와 `AdminBoard.extra` 확장 버킷 예외를 추가해 실제 설계 차이와 거짓 경고를 분리
  - legacy coverage에 `API로 이미 대체된 legacy entrypoint`, `보조 update/delete/helper 스크립트`, `웹 전용/명시적 제외 파일` 분류를 추가하고, 그 뒤에도 남는 파일만 `unmapped` warning으로 집계
  - 같은 파일에서 `missing_declared_files`를 warning builder가 잘못 참조하던 버그를 `build_failures()` 쪽으로 옮겨, 선언된 legacy form 누락은 정상적으로 hard failure가 되도록 보정
  - `specs/integration/INTEGRATED_AUDIT_STANDARD.md`를 갱신해 response flattening 정규화와 legacy coverage 4분류 규칙을 SSOT로 명시
- 검증:
  - `python3 scripts/run_integrated_audit.py --skip-flutter --rust-root /Users/neojins/workspace/gnuboard5/rust --php-root /Users/neojins/workspace/gnuboard5/php`
  - 결과: `output/integrated-audit/latest.json` / `latest.md` 기준 `status=passed`, `failures=[]`, `warnings=[]`

### 통합 감사에 PHP/Rust 전용 실행 경로를 추가하고 `/admin/dashboard` parity hard-fail을 해소

- Why: 형님이 이 시점에 `php, rust`만 감사하자고 지시했는데, 기존 `run_integrated_audit.py`는 항상 Flutter snapshot check까지 강제해서 Flutter drift가 PHP/Rust 감사 결과를 계속 오염시키고 있었다. 게다가 Rust가 아직 `/admin/dashboard`를 노출하지 않아 하드 실패가 남아 있었고, 문서상 warning으로 취급하기로 한 operation/field/legacy coverage 항목도 실제 스크립트에서는 실패로 처리되고 있었다.
- What:
  - `scripts/run_integrated_audit.py`에 `--skip-flutter` 옵션을 추가해 Flutter contract check와 snapshot metric 수집을 선택적으로 건너뛸 수 있게 정리
  - `g5-admin/package.json`에 `bun run audit:integrated:php-rust` 스크립트를 추가하고, `README.md`, `specs/README.md`, `specs/integration/INTEGRATED_AUDIT_STANDARD.md`에 PHP/Rust 전용 감사 경로와 warning 판정 규칙을 문서화
  - `g5-admin/src-tauri/src/{api_client,commands,models}/dashboard.rs`와 `lib.rs`를 추가/갱신해 PHP OpenAPI의 `/admin/dashboard` GET을 Rust command layer에 연결하고, 통합 감사의 admin path hard fail을 제거
  - `scripts/check_openapi_contract.mjs`는 snapshot/codegen 갱신을 막지 않도록 known unmapped path 예외를 임시 허용한 뒤, `contract:sync`로 Rust snapshot과 generated Zod artifact를 최신 PHP 계약과 다시 동기화
  - `tests/e2e/smoke.test.ts`의 IPC command count 기대값을 `217`로 갱신해 새 dashboard command 추가에 따른 회귀를 닫음
- 검증:
  - `python3 scripts/run_integrated_audit.py --help`
  - `cd g5-admin && bun run contract:sync`
  - `cd g5-admin && bun run contract:check`
  - `cargo check --manifest-path g5-admin/src-tauri/Cargo.toml`
  - `cd g5-admin && bun run test:coverage:critical`
  - `cd g5-admin && bun run audit:integrated:php-rust`

### PHP live trace E2E의 마지막 authenticated success path까지 마감

- Why: `T2-038`은 이미 `/health`, `/admin/members` 401, `/auth/login` 실패까지는 확인됐지만, 마지막 success path(`/auth/login -> /members/me`)가 스테이징 smoke credential mismatch 때문에 막혀 있었다. 이 blocker를 끝까지 닫지 않으면 Rust 쪽 trace/owner/fault_domain 계약 검증도 "거의 완료" 상태로 계속 남게 된다.
- What:
  - 스테이징 `.tmp_schemathesis_auth.env`가 가리키는 `mb_id`가 실제 `g5_member`에 존재하지 않는 상태임을 확인
  - 누락된 smoke 회원을 `create_hash` 호환 해시 + 인증 완료 상태로 복구한 뒤 `POST /api/v1/auth/login -> GET /api/v1/members/me` 성공 경로를 실서버에서 다시 검증
  - `specs/TODO.md`를 `Blocked -> Done` 상태로 승격하고, blocker 원인이 해시 호환성이 아니라 stale smoke 계정이었음을 문서에 명시
- 검증:
  - `curl -sS -D - https://gnurestapi.cc/api/v1/auth/login`
  - `curl -sS -D - https://gnurestapi.cc/api/v1/members/me`
  - `ssh neojins@192.168.0.127 '... g5_member smoke account reseed + login/me verification ...'`

### command helper로 Rust Tauri command boilerplate를 축소

- Why: deep audit 이후 `T2-052`로 남겨둔 `next_request_id + state.inner().clone() + closure clone` 반복은 기능 버그는 아니지만, command를 추가하거나 수정할 때마다 같은 실수를 다시 복제하게 만드는 구조 부채였다. 특히 access-token retry helper 안쪽에서 `request_id`와 `AppState`를 다시 캡처하는 패턴이 command 수만큼 퍼져 있어, 이번에 공용 계층으로 흡수하지 않으면 후속 도메인 구현에서도 같은 중복이 계속 누적될 상태였다.
- What:
  - `g5-admin/src-tauri/src/commands/common.rs`에 `command_context(&State<AppState>) -> (request_id, AppState)` helper를 추가해 command 시작부의 공통 setup을 한 줄로 축소
  - `g5-admin/src-tauri/src/commands/session.rs`의 `execute_with_access_token`을 확장해 access token뿐 아니라 cloned `AppState`와 `request_id`까지 callback 인자로 전달하고, 401 refresh 재시도 때도 동일 helper 경로를 재사용하도록 정리
  - `g5-admin/src-tauri/src/commands/{board,board_group,config,content,faq,layout,mail,mail_test,maintenance,member,menu,permission,point,poll,popup,popular,push,qa,qa_config,report,schema,sms,sms_contact,sms_history,sms_message,sms_template,system_tools,theme,visit,write_count}.rs`에서 command별 boilerplate clone 코드를 걷어내고 공통 helper를 사용하도록 정리
- 검증:
  - `cargo test --manifest-path g5-admin/src-tauri/Cargo.toml`
  - `cargo test --manifest-path g5-admin/src-tauri/Cargo.toml export_ts_bindings -- --nocapture`
  - `cd g5-admin && bun run lint`
  - `cd g5-admin && bun run test`
  - `cd g5-admin && bun run build:web:fast`

### 스테이징 create_hash drift와 live trace 불일치의 현재 상태를 재확인

- Why: `T2-015A`와 `T2-038`은 오랫동안 "PHP 쪽 운영 이슈"로 묶여 있었지만, 실제로 무엇이 아직 깨져 있는지 확인하지 않으면 Rust TODO가 계속 낡은 blocker를 가리키게 된다. 이번에는 스테이징 서버 원격 audit와 실제 `curl` 응답을 다시 찍어, 해시 호환성 문제와 trace 일관성 문제를 분리해서 정리할 필요가 있었다.
- What:
  - 스테이징 원격 `php scripts/check_password_hash_compat.php --json` 결과를 다시 확인해 `encrypt_func=create_hash`, `total=1`, `incompatible_count=0` 상태임을 확인하고 `T2-015A`의 기존 bcrypt drift blocker를 종료 처리
  - live `curl` 실측으로 `/api/v1/health`, `/api/v1/admin/members` 401, `/api/v1/auth/login` 실패 응답에서 header/body/meta의 trace가 서로 다른 문제를 재현했고, 원인이 PHP `ResponseTraceMiddleware`의 재생성 로직임을 식별
  - Rust TODO는 `create_hash 호환성 완료`와 `authenticated success path smoke credential 불일치로 보류`를 분리하도록 갱신
- 검증:
  - `curl -sS -D - https://gnurestapi.cc/api/v1/health`
  - `curl -sS -D - https://gnurestapi.cc/api/v1/admin/members`
  - `ssh neojins@192.168.0.127 'cd /home/neojins/public_html && php scripts/check_password_hash_compat.php --json'`

### SQLCipher DB 마스터키를 세션 저장 모드와 분리해 keyring-only를 복구

- Why: fresh UX 점검을 준비하면서 실제 설치본의 [app-config.json](/Users/neojins/workspace/gnuboard5/rust/g5-admin/src-tauri/app-config.json) 이 `sessionStorage: "file"`로 남아 있는 것을 확인했고, 현 코드에서는 이 값이 JWT 세션뿐 아니라 SQLCipher DB 마스터키 저장 백엔드까지 같이 file fallback으로 내리고 있었다. 이 상태는 `T2-079`에서 문서화한 keyring-only DB key 정책과 정면으로 충돌하고, 실제 사용자 디스크에 `.db-master-key`를 계속 남기는 보안 회귀였다.
- What:
  - `g5-admin/src-tauri/src/{db.rs,app_state.rs}`에서 DB 마스터키 로더를 `sessionStorage`와 분리해 항상 keyring을 우선 사용하고, 기존 `.db-master-key`는 1회 migration 후 삭제하도록 보정
  - `g5-admin/src-tauri/app-config.json` 기본 `sessionStorage`를 `keychain`으로 상향해 설치본 기본 동작을 보안 기준에 맞춤
  - `specs/foundation/{FOUNDATION_SDD.md,DEV_BOOTSTRAP_CHECKLIST.md}`와 `specs/{TODO.md,HISTORY.md}`를 갱신해 `sessionStorage=file`이 JWT 세션에만 영향을 주고 DB 키에는 영향을 주지 않음을 명시
  - `db.rs` 테스트를 `legacy master key migration` 기준으로 교체해 `.db-master-key`가 다시 신규 생성되는 회귀를 막음
- 검증:
  - `cargo test --manifest-path g5-admin/src-tauri/Cargo.toml`
  - `cargo test --manifest-path g5-admin/src-tauri/Cargo.toml export_ts_bindings -- --nocapture`
  - `cd g5-admin && bun run lint`
  - `cd g5-admin && bun run test`
  - `cd g5-admin && bun run build:web:fast`
  - `cd g5-admin && bun run build:desktop:fast`
  - `python3 scripts/doc-index.py`
  - `bash scripts/check-doc-governance.sh`

### 데스크톱 빠른 잠금 해제(Touch ID / Windows Hello)를 실제 구현으로 닫음

- Why: 멀티사이트 P0 보안 잔여는 사실상 `T2-077` 하나였는데, 문서와 코드는 한동안 `빠른 잠금 해제 placeholder` 상태를 유지하고 있었다. 형님이 더 진행하라고 지시한 이후에는 더 이상 "언젠가 붙일 기능"로 남겨둘 근거가 없었고, 공식 `tauri-plugin-biometric`이 모바일 전용인 문제를 우회할 현실적인 데스크톱 provider를 실제 코드에 닫아야 했다.
- What:
  - `g5-admin/src-tauri/src/{fast_unlock.rs,app_state.rs}`와 `src-tauri/src/commands/{master_lock.rs,security.rs}`에 `tauri-plugin-biometry v0.2.6` 기반 빠른 잠금 해제 경로를 추가해 Touch ID / Windows Hello 등록, 해제, 잠금 해제를 연결
  - OS biometry secure storage에는 랜덤 fast-unlock secret만 저장하고, 로컬 SQLCipher DB에는 그 Argon2 verifier만 저장하도록 정리해 마스터 비밀번호 평문 저장 없이 1차 인증 대체 경로를 구현
  - `g5-admin/src/features/{master,security}/**`, `src/api/client/{master-lock.ts,security.ts,core.ts}`를 갱신해 `/app/security` 등록/폐기 UI와 잠금 해제 화면 버튼을 실제 동작으로 전환
  - `tests/e2e/smoke.test.ts`, `specs/{README.md,TODO.md,HISTORY.md,domains/MULTI_SITE_FIRST_SCREEN_DRAFT.md,domains/MULTI_SITE_SDD.md}`, `.agent/Constitution.md`, `specs/codex/2026-03-10-SECURITY_IMPLEMENTATION_PROMPT.md`를 현재 구현 SSOT에 맞게 동기화
- 검증:
  - `cargo test --manifest-path g5-admin/src-tauri/Cargo.toml`
  - `cargo test --manifest-path g5-admin/src-tauri/Cargo.toml export_ts_bindings -- --nocapture`
  - `cd g5-admin && bun run lint`
  - `cd g5-admin && bun run test`
  - `cd g5-admin && bun run build:web:fast`
  - `cd g5-admin && bun run build:desktop:fast`

### 로컬 민감 작업 step-up auth를 백업/사이트 삭제/보안 정책 변경까지 확장

- Why: 보안 설정 화면과 선택형 Google OTP는 이미 연결됐지만, 실제로 더 위험한 작업인 `백업 export/import`, `전체 사이트 삭제`, `자동 잠금 시간 변경`은 마스터 잠금이 열린 뒤 별도 재확인 없이 실행되고 있었다. 형님이 요구한 기준은 "앱이 열린 상태"와 "민감 작업을 허용하는 상태"를 분리하는 것이므로, 현재 비밀번호와 선택형 OTP 재확인 계층을 공용으로 묶어야 했다.
- What:
  - `g5-admin/src-tauri/src/{app_state.rs,models/{backup,security,site}.rs}`에 공용 step-up auth 입력 모델과 검증기를 추가하고, `백업 export/import`, `전체 사이트 삭제`, `마스터 비밀번호 변경`, `자동 잠금 시간 변경`, `Google OTP 비활성화` 경로에 재인증을 강제
  - `g5-admin/src-tauri/src/commands/backup.rs`, `src/api/client/{backup.ts,core.ts}`를 갱신해 백업 command payload를 `path + step-up auth` 구조로 승격
  - `g5-admin/src/features/security/{SecuritySettingsPage.tsx,StepUpAuthDialog.tsx}`와 `src/features/sites/SiteDashboardPage.tsx`에 공용 재인증 모달을 연결해 백업/사이트 삭제/보안 정책 변경 UI가 현재 비밀번호와 선택형 OTP를 다시 요구하도록 정리
  - `g5-admin/src-tauri/src/app_state.rs` 테스트를 보강해 `백업 export step-up 비밀번호`, `보안 정책 변경 시 OTP 필수` 회귀를 고정
- 검증:
  - `cargo test --manifest-path g5-admin/src-tauri/Cargo.toml`
  - `cargo test --manifest-path g5-admin/src-tauri/Cargo.toml export_ts_bindings -- --nocapture`
  - `cd g5-admin && bun run lint`
  - `cd g5-admin && bun run test`
  - `cd g5-admin && bun run build:web:fast`

### 로컬 보안 설정 화면과 선택형 Google OTP 2차 인증을 연결

- Why: 멀티사이트 P0의 로컬 보호 계층은 마스터 잠금, idle auto-lock, 백업까지 들어갔지만, 형님이 요구한 `보안 설정 메뉴`, `마스터 비밀번호 변경`, `선택형 Google OTP`, `unlock rate limit`은 아직 실제 코드 경로로 닫히지 않았다. 또한 자동 테스트가 macOS Keychain을 건드리면서 OS prompt를 띄우는 문제도 있어, 제품 보안과 개발자 경험을 같이 바로잡을 필요가 있었다.
- What:
  - `g5-admin/src-tauri/src/{app_state.rs,db.rs}`에 선택형 TOTP challenge/verify, unlock failure backoff/temporary lockout, idle timeout 설정, 마스터 비밀번호 변경, DB key keyring migration을 추가
  - `g5-admin/src-tauri/src/commands/{master_lock.rs,security.rs}`, `src-tauri/src/lib.rs`, `src/api/client/{master-lock.ts,security.ts,core.ts}`로 보안 설정 IPC와 프런트 클라이언트를 연결
  - `g5-admin/src/features/{master,security,layout}/**`에 OTP 2단계 unlock, `/app/security` 화면, 상단 `보안 설정` 진입, configurable idle timeout UI를 추가
  - `g5-admin/src-tauri/src/db.rs` 테스트 경로는 in-memory keyring stub으로 분리해 `cargo test`가 실제 macOS Keychain prompt를 띄우지 않도록 격리
  - `specs/{README.md,TODO.md,HISTORY.md,domains/MULTI_SITE_FIRST_SCREEN_DRAFT.md,domains/MULTI_SITE_SDD.md}`를 현재 구현 상태에 맞게 정정
- 검증:
  - `cargo test --manifest-path g5-admin/src-tauri/Cargo.toml`
  - `cargo test --manifest-path g5-admin/src-tauri/Cargo.toml export_ts_bindings -- --nocapture`
  - `cd g5-admin && bun run lint`
  - `cd g5-admin && bun run test`
  - `cd g5-admin && bun run build:web:fast`
  - `cd g5-admin && bun run build:desktop:fast`

### 멀티사이트 생체인증 문서를 데스크톱 현실에 맞게 보정

- Why: 형님 기준으로 남은 멀티사이트 P0 실질 미구현은 패스키/생체인증 경로 하나였는데, 문서는 `tauri-plugin-biometric`이 데스크톱 Touch ID / Windows Hello를 바로 지원하는 것처럼 적혀 있었다. 그런데 2026-03-10 기준 공식 Rust crate `tauri-plugin-biometric 2.3.2` 소스를 확인해보니 `#![cfg(mobile)]`로 배포되고 있어, 문서가 실제 구현 근거보다 앞서 있었다.
- What:
  - `.agent/Constitution.md`의 생체 인증 절을 수정해 목표 UX와 현재 구현 가능 범위를 분리
  - `specs/{README.md,TODO.md}`에 데스크톱 생체인증이 아직 `구현 방식 확정 필요` 상태임을 명시
  - `specs/domains/{MULTI_SITE_SDD.md,MULTI_SITE_FIRST_SCREEN_DRAFT.md}`에서 `tauri-plugin-biometric`을 확정 구현처럼 적은 문장을 제거하고, 현재 canonical 폴백이 마스터 비밀번호 수동 입력임을 고정
- 검증:
  - 공식 Tauri biometric 플러그인 문서 확인
  - `~/.cargo/registry/src/index.crates.io-1949cf8c6b5b557f/tauri-plugin-biometric-2.3.2/src/lib.rs` 확인 (`#![cfg(mobile)]`)

### 멀티사이트 로컬 보호 계층에 idle auto-lock과 백업 export/import를 추가

- Why: 멀티사이트 P0 코어는 마스터 잠금 gate와 수동 첫 사이트 등록까지 정리됐지만, `MULTI_SITE_SDD.md`가 요구한 `15분 idle 자동 잠금`, `수동 앱 잠금`, `로컬 백업 export/import`는 코드와 문서 모두 미완료였다. 이 상태로는 로컬 보호 계층이 반쪽이고, SDD와 실제 구현 정합성도 계속 깨질 수밖에 없었다.
- What:
  - `g5-admin/src-tauri/src/{db.rs,app_state.rs}`에 SQLCipher DB 백업 export/import와 머지 로직(`sites + site_settings`), 마스터 잠금 재설정, 잠금 해제 시 활성 사이트 컨텍스트 복구를 추가
  - `g5-admin/src-tauri/src/commands/{backup.rs,master_lock.rs}`, `src-tauri/src/lib.rs`, `src/api/client/{backup.ts,master-lock.ts,core.ts}`로 Tauri command/프런트 클라이언트를 연결
  - `g5-admin/src/features/master/{MasterIdleGuard.tsx,use-master-lock.ts}`와 `src/App.tsx`에 15분 idle auto-lock guard를 추가하고, `features/{layout,sites}/**`에 수동 `앱 잠금`, `백업 내보내기`, `백업 가져오기` 액션을 연결
  - `specs/{README.md,TODO.md,HISTORY.md,domains/MULTI_SITE_FIRST_SCREEN_DRAFT.md,domains/MULTI_SITE_SDD.md}`를 갱신해 현재 구현 상태와 남은 패스키 과제를 분리 정리
- 검증:
  - `cargo test --manifest-path g5-admin/src-tauri/Cargo.toml models::tests::export_ts_bindings -- --exact --nocapture`
  - `cargo test --manifest-path g5-admin/src-tauri/Cargo.toml backup_`
  - `cargo test --manifest-path g5-admin/src-tauri/Cargo.toml app_state::tests::lock_master_drops_unlock_state_until_next_unlock -- --exact`
  - `cd g5-admin && bun run lint`
  - `cd g5-admin && bun run test -- MasterIdleGuard.test.tsx SiteDashboardPage.test.tsx AppShellHeader.test.tsx AppShell.test.tsx LoginPage.test.tsx master-flow.test.ts`

### 멀티사이트 루트 진입을 `/master/*` gate 기준으로 마감

- Why: 멀티사이트 P0 구현이 사이트 온보딩/대시보드 중심으로 먼저 굴러가면서, 형님이 고정한 실제 기준인 `로컬 마스터 잠금 설정/해제 -> 첫 사이트 수동 등록 -> 사이트 로그인 -> 사이트 작업 홈` 순서가 코드에서 강제되지 않았다. 동시에 bundled `app-config.json`과 legacy `apiBaseUrl`이 빈 DB에서 `기본 사이트`로 자동 승격될 수 있어 첫 사이트 수동 입력 원칙도 깨지고 있었다.
- What:
  - `g5-admin/src-tauri/src/{db.rs,app_state.rs}`에 `app_lock` 테이블, Argon2 기반 verifier 저장/검증, `master_lock_status/setup/unlock` 상태를 추가하고 legacy `apiBaseUrl -> 기본 사이트` 자동 주입과 legacy 세션 마이그레이션을 제거
  - `g5-admin/src-tauri/src/commands/master_lock.rs`, `src-tauri/src/lib.rs`, `src/api/client/{core.ts,master-lock.ts}`로 로컬 마스터 잠금 IPC와 프런트 클라이언트를 연결
  - `g5-admin/src/app/router.tsx`, `ActiveSiteRedirect.tsx`, `features/master/*`, `features/{auth,onboarding,sites,layout}/**`를 갱신해 `/master/setup`, `/master/unlock`을 루트 gate로 승격하고, 잠금 해제 후에만 사이트 catalog/auth 흐름이 열리도록 재배치
  - `features/sites/site-flow.ts`를 수정해 다중 사이트에서도 활성 사이트 세션이 살아 있으면 바로 해당 작업 홈으로 들어가고, 세션이 없을 때만 대시보드/로그인으로 분기하도록 보정
  - `SiteRegistrationForm.tsx`와 멀티사이트 문서를 갱신해 legacy `apiBaseUrl`은 추천 URL로만 노출하고 자동 등록은 금지하도록 고정
- 검증:
  - `cd g5-admin && bun run test`
  - `cd g5-admin && bun run lint`
  - `cd g5-admin && bun run build:web:fast`
  - `cd g5-admin && bun run build:desktop:fast`
  - `cargo test --manifest-path g5-admin/src-tauri/Cargo.toml`

### `g5-admin` JS 툴체인을 `bun` 표준으로 전환

- Why: `g5-admin`은 이미 `Vite + Vitest + Tauri` 기반의 Node 호환 툴체인 위에 올라와 있었고, 앞으로 별도 웹 클라이언트까지 같은 생태계로 확장할 계획이 있다. 이 상태에서 `pnpm + Node`와 `bun`을 혼용하면 설치/실행 명령, CI, 문서, 개발 환경이 이중화된다. 프로젝트 표준을 `bun`으로 고정해 설치/스크립트 실행 속도와 운영 일관성을 먼저 확보할 필요가 있었다.
- What:
  - `g5-admin/package.json`, `src-tauri/tauri.conf.json`을 갱신해 계약 검사, 빌드, 빠른 배포, Tauri prebuild를 모두 `bun run` 기준으로 전환
  - `scripts/check_openapi_contract.mjs`, `scripts/run_integrated_audit.py`, `scripts/deploy-rust-admin-{desktop,macos-fast}.sh`를 수정해 OpenAPI 생성기, 통합 감사, 로컬 배포 안내 문구까지 `bun` 기준으로 통일
  - `.github/workflows/{contract,desktop-cross-platform,integrated-three-way-audit}.yml`에서 `pnpm/action-setup` 대신 `oven-sh/setup-bun`을 사용하고, frontend install/test/build/check를 `bun install --frozen-lockfile`, `bun run *`으로 교체
  - `AppShellSidebar.test.tsx`, `DebugDock.test.tsx`를 보강해 사이트 전환/등록 다이얼로그/Debug Dock 닫기 흐름을 회귀 테스트에 편입하고 `test:coverage:critical` 함수 커버리지를 다시 `80%` 이상으로 회복
  - `.agent/Constitution.md`, `README.md`, `CONTRIBUTING.md`, `g5-admin/README.md`, `specs/README.md`, `IMPLEMENTATION_ROADMAP.md`, foundation/integration/domain SDD의 개발 명령을 `bun` 기준으로 다시 고정
- 검증:
  - `cd g5-admin && bun install`
  - `cd g5-admin && bun run lint`
  - `cd g5-admin && bun run test`
  - `cd g5-admin && bun run test:coverage:critical`
  - `cd g5-admin && bun run build`
  - `python3 scripts/doc-index.py`
  - `bash scripts/check-doc-governance.sh`

### SQLite 멀티사이트 코어와 사이트 탭/온보딩/로컬 대시보드 전환

- Why: 단일 `apiBaseUrl + 단일 JWT 세션` 구조로는 여러 G5 운영 사이트를 같은 앱에서 안전하게 전환할 수 없었다. 사이트별 URL, 세션, 활동 로그, 라우팅이 분리되지 않으면 관리 대상이 늘수록 로그인 상태와 디버깅 정보가 뒤섞여 운영 리스크가 커진다. 동시에 명세서 `MULTI_SITE_SDD.md` 기준으로는 온보딩, 탭 전환, SQLite 영구 저장, 로컬 대시보드가 한 묶음으로 필요했다.
- What:
  - `g5-admin/src-tauri/src/{db.rs,site_manager.rs,app_state.rs,token_store.rs,api_client.rs}`에 SQLCipher SQLite 저장소, legacy `app-config.json/session` 마이그레이션, 사이트별 JWT/keyring 분리, 활성 사이트별 API base URL 적용을 추가
  - `g5-admin/src-tauri/src/commands/{site.rs,activity.rs}`와 `models/site.rs`로 사이트 catalog/add/update/delete/switch/health-check/activity IPC를 신설하고 `DebugRuntimeInfo`를 active site 기준으로 확장
  - `g5-admin/src/{app/router.tsx,features/layout/{SiteTabBar.tsx,ProtectedLayout.tsx,AppShell.tsx,AppShellHeader.tsx,AppShellSidebar.tsx},features/auth/LoginPage.tsx,features/onboarding/SiteOnboardingPage.tsx}`를 사이트 scope 라우팅(`/sites/:siteId/*`), 탭 바, 첫 사이트 온보딩, 사이트 전환형 로그인 흐름으로 전환
  - `g5-admin/src/features/overview/AdminOverviewPage.tsx`를 소개 랜딩에서 멀티사이트 대시보드로 재작성해 활성 사이트 요약, 등록 사이트 현황, 로컬 활동 로그, 사이트 scope 빠른 진입 링크를 표시
  - `g5-admin/src/api/client/sites.ts`, `features/sites/use-site-activity.ts`, `src-tauri/Cargo.toml`, `src-tauri/src/lib.rs`를 갱신해 사이트 활동 조회와 `tauri-plugin-updater` 로드를 추가
  - `g5-admin/src/features/overview/AdminOverviewPage.test.tsx`를 추가하고 기존 Login/AppShell/navigation 테스트를 멀티사이트 기준으로 유지
- 검증:
  - `cargo check --manifest-path g5-admin/src-tauri/Cargo.toml`
  - `cargo test -p g5-admin-desktop export_ts_bindings -- --nocapture`
  - `cargo test -p g5-admin-desktop`
  - `pnpm --dir g5-admin exec tsc --noEmit`
  - `pnpm --dir g5-admin lint`
  - `pnpm --dir g5-admin test`
  - `pnpm --dir g5-admin test:coverage:critical`
  - `pnpm --dir g5-admin build`

### `codex-audit` 종합 3자 대면감사 기준 보정과 회귀 수정

- Why: 사후 감사 워크플로가 단순 grep 기준이라 path parameter, 시스템 alias 경로, generated schema의 `sections[].fields` 구조를 제대로 반영하지 못했다. 이 상태로는 엔드포인트/필드 누락이 실제보다 과하게 잡혀 다음 전수 감사도 신뢰할 수 없었다. 동시에 프런트 smoke 테스트도 IPC command 수 상수가 뒤처져 회귀처럼 실패하고 있었다.
- What:
  - `.agent/workflows/codex-audit.md`의 Phase 2를 admin path alias 정규화 기준으로 다시 작성해 `/admin/system/mails*` 중복을 canonical path로 접고, Rust command path ↔ PHP OpenAPI path 비교가 1:1로 나오도록 보정
  - 같은 워크플로의 Phase 3을 generated schema `sections[].fields` 구조와 도메인별 실제 화면 field-label helper 패턴 기준으로 수정해 “현재 Rust 화면이 schema-backed인지”와 “Legacy DB → PHP schema 미노출 필드”를 분리해서 보게 정리
  - `g5-admin/src/components/ui/button.tsx`, `src/features/schema/{FieldSchemaStatePanel.tsx,field-schema-state.ts}`를 정리해 fast-refresh lint warning 2건을 제거
  - `g5-admin/tests/e2e/smoke.test.ts`의 등록 command 기대값을 현재 192개 기준으로 갱신해 IPC registry 회귀 테스트를 복구
  - `specs/audits/2026-03-09-CODEX_POST_AUDIT.md`에 실제 감사 결과와 남은 parity 갭을 기록
- 검증:
  - `cargo check --workspace`
  - `pnpm --dir g5-admin exec tsc --noEmit`
  - `pnpm --dir g5-admin lint`
  - `cargo test -p g5-admin-desktop export_ts_bindings -- --exact --nocapture`
  - `git diff --exit-code -- g5-admin/src/types`
  - `cargo test -p g5-admin-desktop`
  - `pnpm --dir g5-admin test`
  - `pnpm --dir g5-admin build`

### 화면 캡처 기본 범위를 전체 페이지로 확장

- Why: 형님 확인 기준으로 현재 캡처는 "보이는 화면만" 저장되고, 화면 아래의 숨은 영역은 빠졌다. UI 리뷰/디자인 디버깅용 캡처는 viewport보다 전체 페이지가 기준이라 저장/클립보드 모두 같은 full-page 캡처가 필요했다.
- What:
  - `g5-admin/src/features/layout/AppShell.tsx`에서 캡처 범위를 `window.inner*` 기준에서 `documentElement/body scrollWidth/scrollHeight` 최대값 기준으로 바꾸고, `x/y/scrollX/scrollY`를 0으로 고정
  - 저장과 클립보드가 같은 `createScreenshot()` 스냅샷을 공유하므로 두 동작 모두 전체 페이지 캡처를 기본으로 사용하도록 정리
  - `AppShell.test.tsx`에 `html2canvas`가 full-page width/height 옵션으로 호출되는지 회귀 테스트를 추가
- 검증:
  - `pnpm --dir g5-admin test src/features/layout/AppShell.test.tsx`
  - `pnpm --dir g5-admin build`
  - `cargo build --manifest-path g5-admin/src-tauri/Cargo.toml --release --features tauri/custom-protocol`

### 화면 캡처 클립보드를 direct RGBA IPC로 전환하고 저장 위치 열기를 네이티브 reveal command로 고정

- Why: `Image.fromBytes(pngBytes) -> writeImage(image)` 경로를 넣었는데도 실제 런타임에서는 clipboard plugin이 여전히 `JsImage::Bytes`로 받아 `expected RGBA image data, found raw bytes`가 재발했다. 동시에 저장 완료 토스트 액션의 OS 위치 열기도 JS opener만으로는 실기에서 신뢰성이 부족했다.
- What:
  - `g5-admin/src/features/layout/AppShell.tsx`에서 Tauri 클립보드 캡처를 `canvas.getImageData()` 기반 `rgba/width/height` payload로 바꾸고 `plugin:clipboard-manager|write_image`를 direct invoke 하도록 교체
  - 저장 위치 열기는 `cmd_debug_reveal_capture_path` 커맨드를 신설해 macOS는 `open -R`, Windows는 `explorer /select,`, 그 외는 부모 폴더 열기 fallback을 타도록 정리
  - `AppShell.test.tsx`를 direct clipboard IPC payload, native reveal command 호출, reveal 실패 토스트 기준으로 재작성
- 검증:
  - `pnpm --dir g5-admin test src/features/layout/AppShell.test.tsx`
  - `pnpm --dir g5-admin build`
  - `pnpm --dir g5-admin tauri build --bundles app`
  - `pnpm --dir g5-admin deploy:mac`

### 전역 링크/버튼 손가락 커서와 브랜드 홈 버튼 affordance 정리

- Why: 관리자 셸에서 링크와 버튼의 hover 커서가 제각각이라 클릭 가능한 요소인데도 기본 화살표가 보였고, 특히 좌측 상단 브랜드 버튼은 홈 라우트로 이동하면서도 클릭 affordance가 약했다.
- What:
  - `g5-admin/src/index.css`에 `a[href]`, 활성 `button`, 활성 `[role="button"]` 전역 커서를 `pointer`로 통일하고 disabled 상태는 `not-allowed`로 분리
  - `g5-admin/src/components/ui/button.tsx` 공용 Button variant에 `cursor-pointer` / `disabled:cursor-not-allowed`를 명시해 컴포넌트 수준에서도 affordance가 유지되게 정리
  - `g5-admin/src/features/layout/AppShellHeader.tsx` 브랜드 홈 버튼에 `cursor-pointer`를 명시하고 `AppShellHeader.test.tsx`에서 회귀 테스트를 추가
- 검증:
  - `pnpm --dir g5-admin test src/features/layout/AppShellHeader.test.tsx`
  - `pnpm --dir g5-admin build`

### Tauri PNG 클립보드 캡처와 저장 후 Finder/탐색기 reveal 흐름 보정

- Why: 저장은 되는데 클립보드 복사에서 `expected RGBA image data, found raw bytes`가 반복됐다. 원인은 PNG bytes를 그대로 `writeImage()`에 넘겨 Tauri가 RGBA raw buffer로 해석한 것이었다. 동시에 저장 성공 후에는 경로 문자열만 보여 주고, 사용자가 저장 위치를 OS 탐색기에서 바로 열 수 없었다.
- What:
  - `g5-admin/src/features/layout/AppShell.tsx`에서 Tauri 캡처 클립보드 경로를 `Uint8Array -> Image.fromBytes(pngBytes) -> writeImage(image)`로 교체
  - `g5-admin/src-tauri/Cargo.toml`에 `tauri` `image-png` feature를 활성화해 PNG bytes 기반 `Image.fromBytes()`를 런타임에서 사용할 수 있게 정리
  - 저장 완료 토스트를 `캡처 저장 완료` + `description(savedPath)` + `action(label=fileName)` 구조로 바꾸고, action 클릭 시 `@tauri-apps/plugin-opener`의 `revealItemInDir()`로 Finder/탐색기 reveal 동작을 연결
  - `AppShell.test.tsx`에 Tauri 이미지 클립보드 성공, 저장 후 reveal, reveal 실패 error toast 회귀 테스트를 추가
- 검증:
  - `pnpm --dir g5-admin test src/features/layout/AppShell.test.tsx`
  - `pnpm --dir g5-admin test:coverage:critical` → `47 files`, `348 tests`
  - `pnpm --dir g5-admin build`
  - `pnpm --dir g5-admin deploy:mac`

### 화면 캡처 `oklch` 색 파서 회귀 차단

- Why: 실제 앱에서 `화면 클립보드로 캡처`와 `화면 캡처 저장`이 다시 `Attempting to parse an unsupported color function "oklch"`로 터졌다. WebView의 `getComputedStyle()`와 캔버스 `fillStyle`이 `oklch(...)`를 그대로 유지해 `html2canvas`에 직접 넘기면 반복적으로 같은 회귀가 발생하는 구조였다.
- What:
  - `g5-admin/src/features/layout/capture-style-sanitizer.ts`를 추가해 clone 문서의 computed style/custom property 중 `oklch/oklab/lch/lab`가 섞인 값을 `rgb/rgba`로 정규화한 뒤 inline override 하도록 구현
  - `AppShell.tsx`의 캡처 경로에서 `html2canvas` `onclone` 훅으로 sanitizer를 강제 적용해 저장/클립보드 캡처가 동일한 정규화 경로를 타도록 통일
  - `culori`와 로컬 타입 선언 `src/types/culori.d.ts`를 추가하고, `capture-style-sanitizer.test.ts`로 단일 색, compound shadow, style entry 추출 회귀 테스트를 고정
- 검증:
  - `pnpm --dir g5-admin test` → `44 files`, `302 tests`
  - `pnpm --dir g5-admin build`

### `shadcn` init/InputGroup 도입과 관리자 편집 UX 경계 재정렬

- Why: 각 관리자 페이지가 동일한 강도의 큰 히어로 헤더를 쓰고 있었고, 수정 workspace 안에는 편집 폼 바로 아래에 읽기 전용 요약 grid가 다시 붙어 있어 "수정하는 곳"과 "보여주는 곳"의 경계가 흐려져 있었다. 동시에 텍스트 입력은 페이지마다 제각각이라 상단 검색과 폼 입력의 시각 리듬도 맞지 않았다.
- What:
  - `g5-admin/components.json`, `tsconfig.json`, `vite.config.ts`, `vitest{,.critical}.config.ts`를 정리해 `pnpm dlx shadcn@latest init --template vite --base radix --preset nova --yes` 기준의 registry/alias/test 해석 경계를 고정
  - `src/components/ui/{input,input-group,textarea}.tsx`, `src/features/admin/shared/AdminFormFields.tsx`, `BoardFormFields.tsx`를 갱신해 텍스트 입력을 `InputGroup` 기반 공용 wrapper로 통일하고, 수정 불가 값은 `ReadOnlyField`로만 노출되도록 정리
  - `PageIntro.tsx`, `AdminOverviewPage.tsx`를 갱신해 `/overview`만 `hero` 헤더를 유지하고, 나머지 관리자 페이지는 compact 헤더를 기본으로 사용하게 변경
  - `BoardWorkspace.tsx`, `MenuWorkspace.tsx`, `PollWorkspace.tsx`, `PopupWorkspace.tsx`, `PermissionsWorkspace.tsx`에서 폼 하단 중복 요약 grid를 제거하고 편집/삭제 액션 중심 작업면으로 단순화
  - `AdminBoardsPage.tsx`, `AppShellHeader.tsx`에 `InputGroup` 기반 검색 입력을 적용해 전역 검색과 도메인 검색의 입력 리듬을 통일
  - `specs/{README,TODO}.md`를 갱신해 `shadcn` UI 기준, `skills/mcp/llms.txt` 참조, compact header/readonly field 원칙을 SSOT 문서에 반영
- 검증:
  - `pnpm --dir g5-admin lint`
  - `pnpm --dir g5-admin test` → `43 files`, `298 tests`
  - `pnpm --dir g5-admin build`

### 우클릭 컨텍스트 메뉴, 개발모드 게이트, 화면 캡처 저장/클립보드 흐름 정비

- Why: 기존 우클릭은 스크린샷 전용 임시 메뉴라서 일반 입력창 편집 작업을 지원하지 못했고, 화면 캡처는 `html-to-image + Tauri Image.new(rgba)` 조합 때문에 `oklch` 색 파싱과 `invalid args rgba` 오류로 깨졌다. 동시에 Debug Dock, 구현 상태 배지, route 설명, `request_id` 계열 진단 정보가 일반 모드에도 그대로 노출돼 운영 화면과 디버그 화면의 경계가 흐려져 있었다.
- What:
  - `g5-admin/src/features/layout/AppShell.tsx`를 재작성해 브라우저형 우클릭 메뉴(`잘라내기/복사/붙여넣기/전체 선택/새로고침`)를 추가하고, 개발모드에서만 `화면 클립보드로 캡처`, `화면 캡처 저장`을 노출
  - 캡처 엔진을 `html2canvas`로 교체하고, 저장은 `@tauri-apps/plugin-dialog` + Rust `cmd_debug_save_capture_png`로 저장 위치 선택 후 기록하도록 전환했으며, 클립보드 이미지는 `writeImage(Uint8Array)`로 직접 써서 `rgba` 브리지 오류를 제거
  - `theme.tsx`, `DisplayToolbar.tsx`, `DebugDock.tsx`, `ErrorBanner.tsx`, `AdminFormFields.tsx`, `AppShell{Header,Sidebar}.tsx`, `AdminOverviewPage.tsx`, `AdminMenuStatusPage.tsx`, `LoginPage.tsx`를 갱신해 개발모드 토글을 로컬에 기억하고, Debug Dock/감사 뱃지/설명/추적 필드를 개발모드에서만 노출하도록 정리
  - `src-tauri/capabilities/default.json`, `src-tauri/src/{error.rs,commands/debug.rs,lib.rs}`를 갱신해 클립보드 텍스트 읽기/쓰기, 이미지 쓰기, 저장 다이얼로그, 로컬 PNG 저장 command를 번들 권한과 함께 등록
  - `DisplayToolbar.test.tsx`, `PageIntro.test.tsx`, `DebugDock.test.tsx`, `AdminBoardsPage.test.tsx`, `AdminBoardGroupsPage.test.tsx`, `AdminContentsPage.test.tsx`, `SharedComponents.test.tsx`, `AppShellSidebar.test.tsx`, `tests/e2e/smoke.test.ts`를 갱신해 개발모드 게이트와 신규 IPC command 회귀를 고정
- 검증:
  - `pnpm --dir g5-admin lint`
  - `pnpm --dir g5-admin test` → `43 files`, `297 tests`
  - `pnpm --dir g5-admin build`
  - `pnpm --dir g5-admin tauri build --bundles app`
  - `pnpm --dir g5-admin deploy:mac`

### 앱 사용자 노출 이름을 `그누5어드민`으로 재고정하고 보드 필드 메타데이터 누락을 보강

- Why: 사용자 노출 이름이 `g5-admin`에서 `러스트 어드민`으로 흔들리면서 설치 번들, 창 제목, 셸 문구, 문서가 서로 다른 이름을 말하고 있었다. 동시에 `boards` 화면은 `/admin/schema/boards`가 실패하거나 일부 라벨이 비면 원시 키를 그대로 노출했고, generated registry에도 `bo_sort_field` 같은 누락 라벨이 남아 있었다.
- What:
  - `g5-admin/src/features/layout/branding.ts`, `src-tauri/tauri.conf.json`, `index.html`, `scripts/deploy-rust-admin-macos.sh`, `features/{layout,overview,auth}/*`, `specs/{README,TODO}.md`를 갱신해 사용자 노출 브랜드명을 `그누5어드민`으로 단일화
  - `BoardWorkspace.tsx`, `BoardFormFields.tsx`, `board-field-meta.ts`, `AdminBoardsPage.tsx`를 갱신해 게시판 스키마가 준비되기 전에는 폼을 숨기고, 스키마 실패를 `ErrorBanner`로 드러내며, 보드 핵심 필드 fallback 라벨도 한국어로 정리
  - `php/api/v1/Admin/Schema/schema-domains.json`에 `boards/config/polls` raw-label override를 추가하고 `tests/Admin/Schema/AdminSchemaServiceTest.php`, `g5-admin/src/features/boards/AdminBoardsPage.test.tsx`로 회귀 테스트를 보강
- 검증:
  - `composer run schema:extract`
  - `composer run schema:check`
  - `vendor/bin/phpunit tests/Admin/Schema/AdminSchemaServiceTest.php`
  - `pnpm --dir g5-admin lint`
  - `pnpm --dir g5-admin test`
  - `pnpm --dir g5-admin build`
  - `pnpm --dir g5-admin deploy:mac`

### 관리자 필드 메타데이터 registry와 `/admin/schema` 소비 계층 도입

- Why: 지금까지 Rust route-native 화면의 라벨/설명은 레거시 SSR 화면을 보고 다시 하드코딩한 복제본이어서, PHP REST API와 클라이언트가 필드 의미를 함께 유지할 구조가 없었다. 이 상태로는 Flutter나 후속 화면이 붙을 때마다 같은 라벨을 다시 손으로 옮겨 적어야 하고, 필드 추가 시 drift가 반복된다.
- What:
  - PHP에 `/admin/schema`, `/admin/schema/{domain}`를 추가하고 `boards/config/members`의 generated field registry를 제공
  - `g5-admin/src-tauri/src/{models,api_client,commands}/schema.rs`, `src/api/client/schema.ts`, `src/features/schema/useAdminFieldSchema.ts`를 추가해 Tauri/React 소비 경계를 연결
  - `BoardFormFields.tsx`, `BoardWorkspace.tsx`, `AdminConfigPage.tsx`, `MemberDetailCard.tsx`가 API 메타데이터의 라벨/설명/선택지/입력 타입을 우선 사용하도록 전환
  - `tests/e2e/smoke.test.ts` 기준선을 `190` registered commands로 상향
- 검증:
  - `cargo test export_ts_bindings -- --nocapture`
  - `cargo test -p g5-admin-desktop`
  - `pnpm --dir g5-admin contract:generate`
  - `pnpm --dir g5-admin lint`
  - `pnpm --dir g5-admin test` → `41 files`, `292 tests`
  - `pnpm --dir g5-admin build`

### Rust↔PHP parity audit exact alias gap 일괄 폐쇄

- Why: 앞선 parity remediation 이후에도 감사 문서는 `/admin/groups*`, `/admin/polls*`, `/admin/popups*`, `/admin/mails/test`, `/admin/mail-tests`, `/admin/points/{grant,deduct,expire}`, `/admin/menus/reorder`, `/admin/layouts/{page_id}/reorder`, `PATCH /admin/board-groups/{gr_id}` 같은 exact alias/method literal gap을 남은 항목으로 지적하고 있었다. 이 상태로는 기능이 같아도 blackbox 감사와 운영 로그가 서로 다른 말을 하게 된다.
- What:
  - `g5-admin/src-tauri/src/api_client/{board_group,mail_test,menu,point,poll,popup,layout}.rs`와 `commands/*`, `lib.rs`를 확장해 exact alias 전용 IPC 26개를 추가 등록
  - `g5-admin/src/api/client/core.ts`의 command context와 `apiTarget` 매핑을 alias 경로 기준으로 보강하고, standard `cmd_admin_layout_reorder` target도 실제 `/admin/layouts/{page_id}/widgets`로 바로잡음
  - `tests/e2e/smoke.test.ts` 기준선을 `188` registered commands로 상향해 alias command도 자동 스모크 게이트에 편입
- 검증:
  - `cargo check -p g5-admin-desktop`
  - `cargo test export_ts_bindings -- --nocapture`
  - `cargo test -p g5-admin-desktop` → `283 passed`
  - `pnpm --dir g5-admin lint`
  - `pnpm --dir g5-admin test` → `41 files`, `290 tests`
  - `pnpm --dir g5-admin build`

### Rust↔PHP parity audit 누락분 일괄 구현

- Why: `specs/audits/2026-03-08-RUST_PHP_PARITY_AUDIT.md` 기준으로 Layout/Report/Push, 게시판 복사/신규글 삭제, 회원 아이콘/이미지, `admin/auth` 묶음형 권한, `admin/qa` 일괄삭제, Board/Config 대량 필드 parity가 Rust 앱에 빠져 있었다. 이 상태로는 관리자 메뉴 구조만 맞고 실제 REST 계약은 곳곳이 비어 있어 다시 drift가 발생한다.
- What:
  - `g5-admin/src-tauri/src/models/{layout,report,push,qa,permission}.rs`, `api_client/{layout,report,push,qa,permission}.rs`, `commands/{layout,report,push,qa,permission}.rs`, `lib.rs`를 확장해 Layout 8종, Report 3종, Push 2종(표준+레거시 alias), `admin/auth` 3종, `admin/qa` bulk delete를 모두 command 경계에 등록
  - `g5-admin/src/features/{layouts,reports,push}/*`, `src/app/router.tsx`, `src/features/layout/navigation.ts`를 갱신해 Layout/Report/Push를 hidden route-native 작업면으로 추가하고 검색/직접진입으로 접근 가능하게 정리
  - `g5-admin/src/features/boards/*`, `src/api/client/boards.ts`, `src-tauri/src/models/board.rs`를 확장해 게시판 복사와 신규글 일괄삭제를 실제 작업면에 연결
  - `g5-admin/src/features/members/*`, `src/api/client/members.ts`, `src-tauri/src/models/member.rs`를 확장해 회원 아이콘/프로필 이미지 업로드/삭제를 상세 작업면에 연결
  - Board/Config는 개별 `bo_*`, `cf_*`를 무작정 타입 파일에 늘어놓는 대신 `extra` map + 동적 섹션 렌더링(`board-field-meta.ts`, `config-field-meta.ts`)으로 44개/105개 누락 필드를 PHP 키 그대로 편집/저장 가능하게 반영
  - `tests/e2e/smoke.test.ts`를 갱신해 등록 IPC 수 기준선을 `162`로 올리고, 새 command가 스모크 게이트에 자동 편입되게 정리
- 검증:
  - `cargo check -p g5-admin-desktop`
  - `cargo test export_ts_bindings -- --nocapture`
  - `cargo test -p g5-admin-desktop` → `283 passed`
  - `pnpm --dir g5-admin lint`
  - `pnpm --dir g5-admin test` → `41 files`, `264 tests`
  - `pnpm --dir g5-admin build`

### 로그인 첫 시도 401 회귀 수정

- Why: macOS/Tauri 웹뷰에서 자동완성 또는 조합 입력 타이밍이 React state 반영보다 늦을 때, 첫 로그인 submit이 stale state로 전송되어 한 번 실패한 뒤 두 번째에만 성공하는 패턴이 발생할 수 있었다. 로그인은 첫 submit부터 현재 폼 값으로 바로 요청되어야 한다.
- What:
  - `g5-admin/src/features/auth/LoginPage.tsx`에서 로그인 payload를 React state가 아니라 submit 시점의 `FormData`에서 읽도록 수정
  - `mb_id`, `mb_password` input에 `name`, `autoCapitalize="none"`, `spellCheck={false}`를 추가해 입력 전달 경계를 명확히 정리
  - `g5-admin/src/features/auth/LoginPage.test.tsx`에 DOM 값과 state가 어긋난 상태에서도 현재 form 값이 전송되는 회귀 테스트를 추가
  - 검증: `pnpm --dir g5-admin exec vitest run src/features/auth/LoginPage.test.tsx`, `pnpm --dir g5-admin lint`, `pnpm --dir g5-admin build`

### 오픈소스 신뢰 인프라와 루트 문서 세트 적용

- Why: 형님이 지정한 `/Users/neojins/workspace/gnuboard5/rust/specs/codex/2026-03-08-TRUST_INFRA_CODEX_PROMPT.md`를 실제 워크스페이스 운영 규칙으로 굳히려면, `rust`, `g5-admin`, `flutter` 세 루트 모두에서 라이선스/보안/기여/CLA 문서를 즉시 확인할 수 있어야 하고, IPC 등록 상태를 자동 검증하는 스모크 테스트까지 함께 있어야 이후 회귀를 줄일 수 있다.
- What:
  - `rust/LICENSE`, `rust/CHANGELOG.md`, `rust/SECURITY.md`, `rust/CONTRIBUTING.md`, `rust/CLA.md`, `rust/README.md`를 추가하고 `Cargo.toml`, `g5-api/Cargo.toml`, `g5-admin/package.json`, `g5-admin/src-tauri/Cargo.toml`에 AGPL 메타데이터를 반영
  - `rust/g5-admin/LICENSE`, `rust/g5-admin/{CHANGELOG,SECURITY,CONTRIBUTING,CLA}.md`, `rust/g5-admin/README.md`를 정리해 패키지 루트에서도 신뢰 문서를 바로 읽을 수 있게 보강
  - `flutter/LICENSE`, `flutter/{README,CHANGELOG,SECURITY,CONTRIBUTING,CLA}.md`, `flutter/.agent/Constitution.md`를 추가해 아직 앱 스캐폴드 전인 Flutter 저장소에도 최소 운영 규칙을 고정
  - `g5-admin/tests/e2e/smoke.test.ts`, `vitest.config.ts`, `vitest.critical.config.ts`를 갱신해 Tauri `generate_handler!`에 등록된 IPC 140개를 자동 파싱/검증하는 스모크 테스트를 추가
  - 검증:
    - `composer test -- --filter=Contract` → `90 tests`, `301 assertions`, `14 skipped`
    - `composer test` → `475 tests`, `1988 assertions`, `8 deprecations`, `14 skipped`
    - `pnpm --dir g5-admin exec vitest run tests/e2e/smoke.test.ts` → `142 tests`
    - `pnpm --dir g5-admin test` → `41 files`, `241 tests`
    - `pnpm --dir g5-admin lint`, `pnpm --dir g5-admin build`, `cargo check --workspace` 통과

### Admin field parity remediation과 회귀 TDD/coverage 게이트 정비

- Why: `2026-03-08-FIELD_PARITY_AUDIT.md` 기준으로 Board/Config/Member/Content/Group에서 레거시 `adm/` 폼 필드와 REST API `UPDATABLE_FIELDS`가 크게 벌어져 있었고, 상단 검색/주메뉴/좌측 서브메뉴/디버그 독처럼 실제로 자주 회귀한 UX 지점은 테스트 게이트 밖에 있었다. 이 상태로는 계약 드리프트와 UI 회귀가 다시 반복된다.
- What:
  - PHP `AdminBoardRepository`, `AdminConfigRepository`, `AdminMemberRepository`, `AdminMemberMutationService`, `AdminContentRepository`, `AdminGroupRepository`, `AdminGroupService`를 확장해 레거시 parity 필드와 `SELECT *` 조회를 반영
  - Rust `src-tauri/src/models/{board_group,content,member}.rs`, `src/features/{board-groups,contents,members}/*`를 확장해 parity 필드 hydrate/edit/save 경계를 맞춤
  - PHP 회귀 테스트 `tests/Admin/{Board,Config,Content,Group,Member}/*`와 Rust 페이지 테스트 `AdminBoardGroupsPage.test.tsx`, `AdminContentsPage.test.tsx`, `MemberDetailCard.test.tsx`를 추가
  - `AppShellHeader`, `AppShellSidebar`, `useHeaderVisibility`, `navigation`, `DebugDock`, `DebugDockCompact`, `DebugDockPanel` 테스트를 추가해 상단 검색, sticky 헤더, 좌측 서브메뉴, 디버그 독 compact/panel 동작을 회귀 게이트 안으로 편입
  - `vitest.critical.config.ts`에 해당 영역을 편입하고 threshold를 `79 / 69 / 76 / 79`로 상향
  - `AdminOverviewPage.tsx`, `specs/README.md`, `specs/audits/2026-03-08-TDD_COVERAGE_AUDIT.md`, `specs/audits/2026-03-08-FIELD_PARITY_AUDIT.md`를 갱신해 최신 감사/테스트 수치를 SSOT에 반영
  - 검증:
    - `pnpm --dir g5-admin test` → `40 files`, `99 tests`
    - `pnpm --dir g5-admin test:coverage` → overall `29.59 / 24.83 / 23.63 / 29.71`
    - `pnpm --dir g5-admin test:coverage:critical` → `80.06 / 69.55 / 76.58 / 80.33`
    - `pnpm --dir g5-admin lint`, `cargo check`, `vendor/bin/phpunit` 통과
    - PHP coverage는 `phpunit --coverage-text`와 `php -d xdebug.mode=coverage vendor/bin/phpunit --coverage-text` 모두 `No code coverage driver available`로 막혀 별도 이슈로 기록

### 게시판관리 > 게시판그룹관리 route-native 구현

- Why: 형님이 지정한 canonical `게시판관리` 축에서 `게시판그룹관리`는 단순 상태 페이지가 아니라 `/admin/board-groups` CRUD와 그룹 회원 추가/삭제를 함께 다루는 운영 작업면이어야 했다. PHP REST API는 이미 board-groups namespace와 group member 하위 endpoint를 제공하고 있었지만, Rust/Tauri는 아직 이 메뉴를 비워 둔 상태였다.
- What:
  - `g5-admin/src-tauri/src/models/board_group.rs`, `api_client/board_group.rs`, `commands/board_group.rs`, `lib.rs`에 게시판 그룹 목록/상세/생성/수정/삭제, 그룹 회원 목록/추가/삭제 command 경계를 추가
  - `g5-admin/src/api/client/board-groups.ts`, `src/features/board-groups/*`, `src/app/router.tsx`, `src/features/layout/navigation.ts`, `src/api/client/core.ts`를 추가/갱신해 `/boards/groups` route-native 작업면을 구현
  - 그룹 편집 카드와 그룹 회원 검색/추가/삭제 작업면을 한 페이지에 통합하고, 그룹 삭제와 회원 제거 모두 `ConfirmActionDialog`로 고정
  - `admin-board-groups-form.ts`와 Vitest를 추가해 group/member payload trim을 회귀 테스트로 고정
  - 검증: `vendor/bin/phpunit tests/Admin/AdminValidationServiceTest.php`, `cargo test export_ts_bindings`, `cargo check`, `pnpm lint`, `pnpm test`, `pnpm build`

### 게시판관리 > 인기검색어관리/인기검색어순위 route-native 구현

- Why: `인기검색어관리`와 `인기검색어순위`는 같은 popular 집계 축을 다른 관점에서 보여주는 메뉴인데, Rust/Tauri에는 아직 두 메뉴 모두 작업면이 없었다. PHP 런타임은 `/admin/popular`, `/admin/popular/rank`와 기간 조건 reset을 이미 제공하고 있어 read-heavy 운영 화면으로 빠르게 연결할 수 있었다.
- What:
  - `g5-admin/src-tauri/src/models/popular.rs`, `api_client/popular.rs`, `commands/popular.rs`, `lib.rs`에 popular 목록/초기화/rank command 경계를 추가
  - `g5-admin/src/api/client/popular.ts`, `src/features/popular/*`, `src/app/router.tsx`, `src/features/layout/navigation.ts`, `src/api/client/core.ts`를 추가/갱신해 `/boards/popular`, `/boards/popular/rank` 공용 작업면을 구현
  - 날짜 범위 필터, 일자별 목록 조회, 기간 랭킹 조회, 조건부 초기화를 한 페이지에서 처리하고 `인기검색어순위` route에서는 랭킹 카드가 먼저 보이도록 재배치
  - `php/api/docs/openapi.yaml`에서 runtime과 어긋나 있던 popular `date_from/date_to` query/body 필드를 실제 PHP 서비스 기준으로 정정
  - `admin-popular-form.ts`와 Vitest를 추가해 list/rank/reset query 정규화를 회귀 테스트로 고정
  - 검증: `cargo test export_ts_bindings`, `pnpm lint`, `pnpm test`, `pnpm build`, `ruby -e 'require "yaml"; YAML.load_file(...); puts "OPENAPI_OK"'`

### 회원관리 > 회원메일발송 route-native 구현

- Why: 형님이 지정한 canonical `회원관리` 축에서 `회원메일발송`은 단순 상태 페이지가 아니라 실제 템플릿 CRUD, 수신자 미리보기, 드라이런/실발송 작업면이어야 했다. PHP REST API는 `/admin/mails`, `/admin/mails/recipients`, `/admin/mails/templates`를 이미 제공하고 있었지만, Rust/Tauri는 이 핵심 운영 메뉴를 아직 연결하지 못한 상태였다.
- What:
  - `g5-admin/src-tauri/src/models/mail.rs`, `api_client/mail.rs`, `commands/mail.rs`, `lib.rs`에 메일 템플릿 목록/상세/생성/수정/삭제, 수신자 미리보기, 회원 메일 발송 command 경계를 추가
  - `g5-admin/src/api/client/mails.ts`, `src/features/mails/*`, `src/app/router.tsx`, `src/features/layout/navigation.ts`, `src/api/client/core.ts`를 추가/갱신해 `/members/mails` route-native 작업면을 구현
  - 템플릿 목록/편집, `/admin/mails/recipients` 기반 후보 미리보기, 직접선택 회원 전용 선택 UX, 기본 `dry_run=true` 안전장치를 한 화면에 통합
  - `admin-mails-form.ts`와 Vitest를 추가해 템플릿 payload trim, 직접선택 회원 payload 생성, preview query 정규화를 회귀 테스트로 고정
  - 검증: `vendor/bin/phpunit tests/Admin/Mail/AdminMailServiceTest.php`, `cargo test export_ts_bindings`, `cargo check`, `pnpm lint`, `pnpm test`, `pnpm build`

### 환경설정 > phpinfo/Browscap/접속로그 변환 route-native 구현

- Why: `phpinfo()`, `Browscap 업데이트`, `접속로그 변환`은 canonical 환경설정 축에 이미 들어가 있었지만, Rust/Tauri에서는 여전히 상태 페이지만 남아 있어 실제 관리자 도구 흐름이 끊겨 있었다. 특히 Browscap 계열은 상태 조회, 캐시 업데이트, 접속로그 변환이 따로 흩어지면 운영자가 어느 단계에서 막혔는지 바로 판단하기 어려웠다.
- What:
  - `php/tests/Admin/System/AdminSystemMaintenanceServiceTest.php`에 `phpInfo`, `convertBrowscap` 동작 고정 테스트를 추가
  - `g5-admin/src-tauri/src/models/system_tools.rs`, `api_client/system_tools.rs`, `commands/system_tools.rs`, `lib.rs`에 `/admin/system/phpinfo`, `/admin/system/browscap`, `/admin/system/browscap/update`, `/admin/system/browscap/convert` command 경계를 추가
  - `g5-admin/src/api/client/system-tools.ts`, `src/features/system-tools/*`, `src/app/router.tsx`, `src/features/layout/navigation.ts`를 추가/갱신해 `/environment/phpinfo`, `/environment/browscap`, `/environment/visit-log-convert` route-native 작업면 구현
  - `admin-browscap-form.ts`와 Vitest를 추가해 변환 rows 입력을 `1 이상 정수`로 고정하고, `접속로그 변환`은 브라우즈캡 cache/plugin 상태가 준비됐을 때만 실행하도록 클라이언트 가드 추가
  - 검증: `vendor/bin/phpunit tests/Admin/System/AdminSystemMaintenanceServiceTest.php`, `cargo test export_ts_bindings`, `pnpm lint`, `pnpm test`, `cargo check`, `pnpm build`

### 회원관리 > 회원관리파일/접속자 3종 route-native 구현

- Why: 형님이 지정한 `회원관리` canonical 메뉴에서 `회원관리파일`, `접속자집계`, `접속자검색`, `접속자로그삭제`는 모두 API가 존재하는데 Rust/Tauri에는 구현이 없었다. 이 상태에서는 메뉴 구조만 맞춰놓고 실제 운영 기능은 비어 있어 canonical IA와 앱 구현이 다시 벌어졌다.
- What:
  - `g5-admin/src-tauri/src/models/visit.rs`, `api_client/visit.rs`, `commands/visit.rs`, `lib.rs`에 `/admin/visits/stats`, `/admin/visits/search`, `DELETE /admin/visits` command 경계를 추가
  - `g5-admin/src/features/visits/*`, `src/api/client/visits.ts`, `src/app/router.tsx`, `navigation.ts`를 추가/갱신해 접속자 집계/검색/삭제를 각각 별도 route-native 작업면으로 분리
  - 삭제 화면은 `ConfirmActionDialog` 기반 destructive UX로 고정하고, 실수로 전체 삭제하지 않도록 `before/date/ip` 중 하나 이상 입력해야만 실행되게 클라이언트 검증을 추가
  - `g5-admin/src-tauri/src/models/member.rs`, `api_client/member.rs`, `commands/member.rs`, `src/api/client/members.ts`를 확장해 `/admin/members/excel` command 경계를 추가하고 `search_field` query를 계약에 반영
  - `g5-admin/src/features/members/AdminMemberFilesPage.tsx`를 추가해 `/members/files`에서 엑셀 export 대상 회원 목록을 검색 필드와 함께 점검할 수 있게 구현
  - `admin-visits-form.test.ts`를 추가해 stats/search/delete payload 정규화와 삭제 조건 필수 검증을 회귀 테스트로 고정
  - 검증: `cargo test export_ts_bindings`, `pnpm lint`, `pnpm test`, `cargo check`, `pnpm build`

### 환경설정 > 파일 일괄삭제 5종 route-native 통합 구현

- Why: `세션파일 일괄삭제`, `캐시파일 일괄삭제`, `캡챠파일 일괄삭제`, `썸네일파일 일괄삭제`, `회원관리파일 일괄삭제`는 메뉴는 분리돼 있지만 실제 REST 계약은 `/admin/system/maintenance/*/purge` namespace 아래 한 묶음의 maintenance 작업이었다. Rust/Tauri에서 이를 각각 빈 상태 페이지로 남겨두면 메뉴 구조만 늘어나고 구현은 흩어져 유지보수가 어려워진다.
- What:
  - `g5-admin/src-tauri/src/models/maintenance.rs`, `api_client/maintenance.rs`, `commands/maintenance.rs`, `lib.rs`에 maintenance purge 5종 command 경계를 추가
  - `g5-admin/src/api/client/maintenance.ts`, `src/features/maintenance/AdminMaintenancePage.tsx`를 추가해 다섯 purge 작업을 한 maintenance 작업면에서 실행하되, 각 서브메뉴 route는 해당 액션을 강조하는 진입점으로 유지
  - `navigation.ts`, `router.tsx`에서 maintenance 5개 서브메뉴를 모두 implemented로 승격하고, 각 route를 공통 `AdminMaintenancePage`로 연결
  - 검증: `vendor/bin/phpunit tests/Admin/System/AdminSystemMaintenanceServiceTest.php`, `cargo test export_ts_bindings`, `pnpm lint`, `pnpm test`, `cargo check`, `pnpm build`, `pnpm tauri build`, `pnpm deploy:mac`

### 환경설정 > 메일 테스트 route-native 구현

- Why: 형님이 지정한 canonical 관리자 구조에서 `환경설정 > 메일 테스트`는 상태 페이지가 아니라 실제 발송 확인 작업면이어야 했다. PHP 쪽에는 deprecated `POST /admin/mails/test`, `POST /admin/mail-tests`와 비deprecated `POST /admin/system/mails/test`가 함께 존재했지만, Rust/Tauri는 아직 어느 경로도 관리자 작업면으로 연결하지 못하고 있었다.
- What:
  - `php/tests/Admin/System/AdminSystemMailDispatchServiceTest.php`를 추가해 시스템 테스트 메일 발송의 잘못된 이메일 검증과 로그 생성 응답을 고정
  - `g5-admin/src-tauri/src/models/mail_test.rs`, `api_client/mail_test.rs`, `commands/mail_test.rs`, `lib.rs`에 `cmd_admin_mail_test_send` 경계를 추가하고, Rust 작업면은 비deprecated `/admin/system/mails/test`만 사용하도록 고정
  - `g5-admin/src/features/mail-test/*`, `src/api/client/mail-test.ts`, `src/app/router.tsx`, `navigation.ts`를 추가/갱신해 `/environment/mail-test` route-native 발송 화면과 최근 결과 카드 구현
  - `admin-mail-test-form.ts`와 Vitest를 추가해 이메일/제목/본문 입력 검증과 payload 생성을 회귀 테스트로 고정
  - 검증: `vendor/bin/phpunit tests/Admin/System/AdminSystemMailDispatchServiceTest.php`, `cargo test export_ts_bindings`, `pnpm lint`, `pnpm test`, `cargo check`, `pnpm build`, `pnpm tauri build`, `pnpm deploy:mac`

### 환경설정 > 메뉴설정 route-native 구현

- Why: 형님이 지정한 canonical 관리자 구조에서 `환경설정 > 메뉴설정`은 상태 페이지가 아니라 실제 CRUD 작업면이어야 했다. PHP REST API는 `/admin/menus`, `/admin/menus/{me_id}`, `PATCH /admin/menus`를 이미 제공하고 있었지만, Rust/Tauri는 이 축이 비어 있어 레거시 메뉴 구조와 구현 상태가 다시 벌어지고 있었다.
- What:
  - `php/api/docs/openapi.yaml`에서 `POST /admin/menus` 생성 스키마에 빠져 있던 `me_code` required와 `me_target`, `me_mobile_use` 필드를 반영하고, `tests/Admin/AdminValidationServiceTest.php`에 `me_code` 필수 검증을 추가
  - `g5-admin/src-tauri/src/models/menu.rs`, `api_client/menu.rs`, `commands/menu.rs`, `lib.rs`에 메뉴 목록/상세/생성/수정/삭제/순서 재정렬 command 경계를 추가
  - `g5-admin/src/features/menus/*`, `src/api/client/menu.ts`, `src/app/router.tsx`, `navigation.ts`를 추가/갱신해 `/environment/menus` route-native 작업면을 구현
  - 목록에서 순서 초안을 바로 수정하고 `정렬 저장` 시에만 `/admin/menus` `PATCH`를 호출하도록 분리해, 조회/상세 CRUD와 정렬 작업의 책임을 분명히 나눔
  - 검증: `vendor/bin/phpunit tests/Admin/AdminValidationServiceTest.php`, `cargo test export_ts_bindings`, `pnpm lint`, `pnpm test`, `cargo check`, `pnpm build`, `pnpm tauri build`, `pnpm deploy:mac`

### 환경설정 > 테마설정 route-native 구현

- Why: 형님이 지정한 실제 관리자 메뉴 구조 기준으로 `환경설정 > 테마설정`이 상태 페이지가 아니라 작업 가능한 화면이어야 했다. PHP REST API는 이미 `/admin/system/theme`, `/admin/system/themes`, `/admin/system/themes/{theme}`를 제공하고 있었는데, Rust/Tauri는 이 축을 아직 연결하지 않아 메뉴 구조와 구현 상태가 어긋나 있었다.
- What:
  - `g5-admin/src-tauri/src/models/theme.rs`, `api_client/theme.rs`, `commands/theme.rs`, `lib.rs`에 테마 config/list/detail command 경계를 추가
  - `g5-admin/src/api/client/theme.ts`, `src/features/theme/*`, `src/app/router.tsx`를 추가해 `환경설정 > 테마설정`을 route-native 작업면으로 연결
  - 현재 적용 테마 저장, 설치된 테마 목록 조회, 개별 테마 상세 조회, PC/모바일/동시 빠른 적용 액션을 한 작업면에 통합
  - `navigation.ts`, `specs/README.md`를 갱신해 canonical 메뉴 구조와 현재 구현 route를 문서에 반영
  - 검증: `cargo test export_ts_bindings`, `pnpm lint`, `pnpm test`, `pnpm build`, `cargo check`, `pnpm tauri build`, `pnpm deploy:mac`

### 관리자 엔드포인트 감사 지적 후속 조치

- Why: `2026-03-08-ADMIN_ENDPOINT_CONTRACT_AUDIT.md`에서 OpenAPI YAML 파싱 불가, 게시판 `gr_id` 필터 미구현, 회원 `search_field` 문서/런타임 드리프트, SMS 설정 프런트 검증 불일치, `member-sync` summary 타입 드리프트가 확인됐다. 이 상태로는 PHP 런타임, OpenAPI, Rust/Tauri 클라이언트가 서로 다른 계약을 말하게 된다.
- What:
  - `php/api/docs/openapi.yaml`의 backtick description과 잘못 붙은 FAQ footer-image 중복 `delete` block을 정리해 기계 파싱 가능한 OpenAPI로 복구
  - `php/api/v1/Admin/Board/{Service,Repository}.php`에 `gr_id` query 필터를 실제 SQL까지 반영하고, `POST /admin/boards`의 `gr_id` required를 OpenAPI에 반영
  - `php/api/v1/Admin/Member/{Service,Repository}.php`에 `search_field` 검증과 `mb_id/mb_name/mb_nick/mb_email/all` 검색 경로를 추가하고 export excel도 동일 규칙으로 맞춤
  - `g5-admin/src/features/system/AdminSmsConfigPage.tsx`, `admin-sms-config-form.ts`에 PHP callback phone/port 규칙과 동일한 submit 직전 검증을 추가
  - `g5-admin/src-tauri/src/models/sms.rs`, `src/types/AdminSmsMemberSyncSummary.ts`, `src-tauri/src/models/mod.rs`를 정리해 `member-sync` summary를 실제 JS 런타임과 일치하는 `number` 타입으로 export
  - `php/tests/Admin/Board/AdminBoardRepositoryTest.php`, `tests/Admin/Member/AdminMemberServiceTest.php`, `tests/Admin/Sms/AdminSmsServiceTest.php`, `g5-admin/src/features/system/admin-sms-config-form.test.ts`를 추가/보강해 회귀 테스트 고정
  - 후속 보고서를 `specs/audits/2026-03-08-ADMIN_ENDPOINT_REMEDIATION.md`로 추가

### API 커버리지 감사 재계산과 namespace 오인 교정

- Why: `2026-03-07-API_COVERAGE_AUDIT.md` 초안은 `Polls`, `Popups`, `SMS`를 현행 코드와 다르게 집계하고 있었고, 분모도 이전 OpenAPI 기준 `170 ops`로 남아 있어 현재 관리자 앱의 실제 커버리지를 판단하기 어려웠다.
- What:
  - `php/api/docs/openapi.yaml`의 현행 `/admin*` path+method를 기준으로 관리자 오퍼레이션을 다시 세어 분모를 `184 ops`로 교정
  - `g5-admin/src-tauri/src/lib.rs`와 `g5-admin/src/api/client/core.ts` 기준으로 현재 관리자 command 집합 `30 ops`를 다시 매핑
  - `Polls`, `Popups`는 `/admin/polls*`, `/admin/popups*`가 아니라 `/admin/system/polls*`, `/admin/system/popups*` 구현이라는 점을 감사 문서에 명시
  - `SMS` 도메인은 설정/회원 동기화만 구현된 `3 / 37`로 다시 정리하고, 현재 route-native 작업면과 API 커버리지 표를 현행 기준으로 갱신

### route-native 관리자 2차 정규화와 번들 청크 분할

- Why: 1차 route-native 전환 뒤에도 `Permissions`, `QA Config`, `Boards`, `Polls`, `Popups`는 여전히 local state 기반 폼과 400줄대 페이지 파일이 남아 있었다. 감사 문서의 핵심 위반은 단순히 legacy 제거가 아니라, 새 도메인도 결국 같은 부채로 다시 커지는 것을 막는 기준선을 박는 것이었다.
- What:
  - `g5-admin/src/features/admin/shared/AdminFormFields.tsx`에 `react-hook-form`용 `TextInput/Select/TextArea/Toggle` control wrapper를 추가하고, 각 도메인 helper에 `zod` schema를 도입
  - `g5-admin/src/features/permissions/*`, `features/qa-config/*`, `features/boards/*`, `features/polls/*`, `features/popups/*`를 `page + hook + workspace/form fields` 구조로 재분해해 모든 페이지/훅/워크스페이스 파일을 300줄 이하로 재정렬
  - `Permissions`, `QA Config`, `Boards`, `Polls`, `Popups` 도메인을 모두 `react-hook-form + zod + TanStack Query + ConfirmActionDialog + AdminDataTable` 공통 패턴으로 통일
  - `g5-admin/src/features/shared/ListPagination.tsx`, `SelectionPlaceholder.tsx`를 추가해 페이지네이션/빈 상태 블록도 공통화
  - `g5-admin/vite.config.ts`에 `manualChunks`를 추가해 `react-core`, `tanstack`, `ui-vendor`, `vendor` 청크로 분리하고 기존 대형 단일 청크 경고를 제거
  - `g5-admin/src/features/{permissions,qa-config,boards,polls,popups}/*.test.ts`를 추가해 생성 payload, diff-only update, zod validation을 회귀 테스트로 고정
  - 검증: `pnpm --dir g5-admin lint`, `pnpm --dir g5-admin test`, `pnpm --dir g5-admin build`

### 감사 지적 기반 route-native 관리자 전면 전환과 레거시 대시보드 제거

- Why: `2026-03-07-AUDIT_REPORT.md` 기준으로 `LegacyDomainBridge`, `Sections.tsx`, `model.ts`, `useDashboardController.ts`, `App.css` 중심의 구 대시보드 구조가 관리자 앱의 핵심 위반 지점이었다. 래핑만 유지한 bridge를 계속 끌고 가면 이후 도메인 추가 때마다 동일한 복잡도가 누적되므로, 실제 동작 라우트를 전부 native 페이지로 전환해야 했다.
- What:
  - `g5-admin/src/app/router.tsx`에서 `LegacyDomainBridge` 라우트를 제거하고 `/settings/qa`, `/permissions`, `/boards`, `/operations/polls`, `/operations/popups`를 실제 page 컴포넌트로 교체
  - `g5-admin/src/features/qa-config/AdminQaConfigPage.tsx`, `features/permissions/AdminPermissionsPage.tsx`, `features/boards/AdminBoardsPage.tsx`, `features/polls/AdminPollsPage.tsx`, `features/popups/AdminPopupsPage.tsx`를 추가해 각 도메인의 목록/상세/생성/수정/삭제를 route-native 작업면으로 재구성
  - `g5-admin/src/features/admin/shared/AdminDataTable.tsx`를 공통 CRUD 리스트 primitive로 추가하고 `@tanstack/react-table` 기반으로 통일
  - 더 이상 사용하지 않는 `g5-admin/src/features/dashboard/*`, `features/legacy/LegacyDomainBridge.tsx`, `g5-admin/src/App.css`를 제거

### 프론트 구조 리팩터링 3차: API client, AppShell, DebugDock 분해

- Why: 기존 감사 문서의 `client.ts 931줄`, `AppShell.tsx 360줄`, `DebugDock.tsx 434줄`은 설계 위반이자 이후 수정 난이도를 높이는 구조였다. 라우트-native 전환 이후에도 공통 경계가 큰 파일에 남아 있으면 다시 같은 문제로 돌아간다.
- What:
  - `g5-admin/src/api/client.ts`를 barrel로 축소하고 `src/api/client/{core,auth,boards,members,permissions,polls,popups,qa-config,sms,debug}.ts`로 분할
  - `g5-admin/src/features/layout/AppShell.tsx`를 `AppShellHeader.tsx`, `AppShellSidebar.tsx`, `useHeaderVisibility.ts`, `shell.ts`로 분리
  - `g5-admin/src/debug/DebugDock.tsx`를 `DebugDockCompact.tsx`, `DebugDockPanel.tsx`, `DebugDockComponents.tsx`로 분해해 compact tray와 전폭 상세 패널을 분리
  - 회원 삭제 흐름은 `window.confirm()` 대신 `ConfirmActionDialog`로 교체하고, 새 route-native 도메인 삭제 액션도 동일 패턴을 사용

### ts-rs 프론트 타입 export 경로 단일화

- Why: `src/types`와 `src-tauri/src/types`에 동일한 generated 파일이 공존해 타입 드리프트와 잘못된 import 경로를 부를 수 있었다. 프론트가 실제 소비하는 경로는 `src/types`뿐이므로 이중 생성 경로를 없애야 했다.
- What:
  - `g5-admin/src-tauri/src/error.rs`와 `src-tauri/src/models/*.rs`의 `#[ts(export_to = ...)]` 경로를 `../../../src/types/`로 조정
  - `cargo test --manifest-path g5-admin/src-tauri/Cargo.toml` 기준 `models::tests::export_ts_bindings`를 다시 통과시켜 프론트 타입 생성 경로를 검증
  - 기존 중복 생성물 `g5-admin/src-tauri/src/types`는 백업 후 제거하고, 현재 프론트 타입 경로를 `g5-admin/src/types` 단일 디렉터리로 유지

### Debug Dock compact tray 축소와 수동 테마 고정, 인트로 톤 재정렬

- Why: 좌측 하단으로 옮긴 Debug Dock도 접힘 상태 높이와 폭이 아직 커서 콘텐츠를 가렸고, 인트로/셸의 혼합 그라디언트 때문에 라이트/다크 모두 중간톤처럼 보여 테마가 자동 전환되는 듯한 인상을 줬다. 관리자 셸은 접힘 상태에서 더 작은 아이콘 트레이여야 하고, 라이트/다크는 시간 기반이 아니라 수동 토글만 허용한다는 인상이 시각적으로도 분명해야 했다.
- What:
  - `g5-admin/src/debug/DebugDock.tsx`에서 접힘 상태를 `h-8` 기준의 좌측 아이콘 트레이로 더 줄이고, 요약 칩은 아이콘+숫자만 남기며 클릭 시 하단 전폭 패널로 확장되는 흐름을 유지
  - `g5-admin/src/features/layout/theme.tsx`에 기본 테마/폰트 스케일 상수를 분리하고 루트 `data-theme-mode=manual`을 고정해 수동 토글 정책을 명시
  - `g5-admin/src/features/layout/PageIntro.tsx`, `features/layout/AppShell.tsx`, `features/auth/LoginPage.tsx`, `features/overview/AdminOverviewPage.tsx`의 배경/카드 톤을 다시 정리해 라이트는 명확한 밝은 표면, 다크는 명확한 어두운 표면으로 재구성
  - 로그인/소개 화면은 기존의 큰 빈 여백 구조를 버리고, 구조 설명용 인포그래픽 블록과 메뉴/콘텐츠 모형을 포함한 히어로 레이아웃으로 재작성
  - 이후 재정렬에서 들어간 임의 hex 배경색을 제거하고 `background/card/sidebar/muted/primary` 디자인 토큰 중심으로 다시 맞췄으며, Debug Dock은 저장된 이전 상태와 무관하게 기본 축소 상태에서만 시작하도록 고정

### 상단 메뉴를 hide/show sticky 네비게이션으로 전환하고 Debug Dock 전폭 확장 추가

- Why: 단일 스크롤로 바꾼 뒤에도 상단 메뉴가 긴 페이지에서 너무 빨리 시야를 차지하고 있었고, Debug Dock도 접힘 상태 글자가 커서 기본 컨텐츠를 가리며 펼쳤을 때는 우측 하단 좁은 박스 안에 갇혀 있었다. 관리자 셸은 상단 메뉴를 `sticky`로 유지하되, 아래로 충분히 내리면 슬라이드 업으로 숨고 위로 다시 올리면 즉시 복귀하는 패턴이 작업면 확보에 더 낫다.
- What:
  - `g5-admin/src/features/layout/AppShell.tsx`에 window scroll 추적을 추가해 `down 100px -> hide`, `up 20px -> show` 기준의 sticky header transform을 구현
  - 상단 헤더에 sticky elevation shadow와 route 변경 시 상태 reset을 추가해 페이지 이동 후에도 숨김 상태가 남지 않도록 정리
  - `g5-admin/src/debug/DebugDock.tsx`에서 펼침 상태일 때 `left/right`를 모두 열어 하단 전폭 패널로 확장하고, 접힘 상태는 좌측 하단 아이콘 미니 독으로 축소
  - `pnpm --dir g5-admin lint`, `pnpm --dir g5-admin test`, `pnpm --dir g5-admin build`를 다시 통과

### 관리자 셸을 단일 세로 스크롤 구조로 전환

- Why: 현재 셸은 카드형 프레임 안에 `main overflow-auto`를 두고 있어 앱 바깥 스크롤과 컨텐츠 내부 스크롤이 분리됐다. 관리자 작업면처럼 긴 폼과 긴 설명을 다루는 화면에서 이중 스크롤은 사용감이 거칠고, 특히 트랙패드/휠 사용 시 어디가 움직이는지 직관이 떨어졌다.
- What:
  - `g5-admin/src/features/layout/AppShell.tsx`에서 셸 컨테이너의 `overflow-hidden`과 메인 작업면 `overflow-auto`를 제거해 body 기준 단일 스크롤로 전환
  - viewport 기준 높이 계산을 `100vh`에서 `100dvh`로 옮겨 데스크톱/모바일 환경에서 주소창/창 프레임 변화에도 전체 레이아웃이 덜 흔들리도록 정리
  - 문서 SSOT(`specs/TODO.md`, `specs/README.md`, `specs/HISTORY.md`)에 `단일 세로 스크롤`을 셸 UX 기준으로 반영
  - `pnpm --dir g5-admin lint`, `pnpm --dir g5-admin test`, `pnpm --dir g5-admin build`를 다시 통과

### 상단 우측 컨트롤 스트립을 단일 툴바 언어로 재정렬

- Why: 검색, 새로고침, 표시 설정, 프로필, 로그아웃이 서로 다른 높이와 보더/라운드 규칙으로 섞여 있어 상단 우측이 한 화면 안에서 각자 노는 느낌이 강했다. 관리자 셸의 상단 컨트롤은 같은 표면 언어와 높이 리듬으로 묶여야 덜 산만하고 유지보수도 쉬워진다.
- What:
  - `g5-admin/src/features/layout/DisplayToolbar.tsx`에 `onRefresh` 확장 포인트를 추가하고, `새로고침 + 글자 크기 + 테마`를 하나의 표시/동작 툴바로 통합
  - `g5-admin/src/features/layout/AppShell.tsx`에서 상단 우측 검색 박스, 표시 툴바, 사용자 카드, 로그아웃 버튼을 모두 `h-11`, 동일 보더, 동일 그림자, 동일 배경 톤 기준으로 재정렬
  - 독립 `새로고침` 아이콘 버튼을 제거하고 툴바 내부 액션으로 이동해 상단 액션 수를 줄이고 정보 밀도를 정리
  - `pnpm --dir g5-admin lint`, `pnpm --dir g5-admin test`, `pnpm --dir g5-admin build`를 다시 통과

### 표시 설정 툴바에 글자 크기 단계 조절 추가

- Why: 관리자 작업면을 오래 쓰면 화면 밀도와 시력 환경에 따라 글자가 조금만 작거나 커도 피로감이 생긴다. 테마 버튼 옆에 `작은 T / 큰 T` 방식의 표시 설정 툴바를 두고, 앱 전체 글자 크기를 한 단계씩 조절하며 기억하는 구조가 필요했다.
- What:
  - `g5-admin/src/features/layout/theme.tsx`에 `fontScale(sm/md/lg)` 상태, 증가/감소 액션, `localStorage` 저장을 추가하고 `document.documentElement.style.fontSize`로 전체 앱 폰트 스케일을 적용
  - `g5-admin/src/features/layout/DisplayToolbar.tsx`를 추가해 `T- / T+ / 테마 토글`을 하나의 툴바로 묶고, 상단 셸과 로그인 화면에서 공통 사용하도록 정리
  - `g5-admin/src/features/layout/AppShell.tsx`, `features/auth/LoginPage.tsx`에서 기존 단일 테마 버튼을 표시 설정 툴바로 교체
  - `pnpm --dir g5-admin lint`, `pnpm --dir g5-admin test`, `pnpm --dir g5-admin build`를 다시 통과

### 앱 번들 이름을 `러스트 어드민`으로 교체하고 G5 전용 아이콘 적용

- Why: 번들 이름이 여전히 `g5-admin`으로 남아 있었고, 기본 아이콘도 Tauri 샘플 감성이 강해 Gnuboard5 관리자 앱 정체성과 맞지 않았다. 데스크톱 앱은 설치 이름, 창 제목, 아이콘이 처음부터 일관돼야 운영 도구처럼 보인다.
- What:
  - `g5-admin/src-tauri/tauri.conf.json`의 `productName`, 창 `title`을 `러스트 어드민`으로 변경
  - `g5-admin/src-tauri/icons/rust-admin-icon.svg`를 추가하고 `tauri icon`으로 `png/icns/ico/appx/android/ios` 아이콘 세트를 다시 생성
  - `g5-admin/src/features/layout/AppShell.tsx`, `features/auth/LoginPage.tsx`, `features/overview/AdminOverviewPage.tsx`의 사용자 노출 브랜드명을 `Rust Admin` 기준으로 정리
  - `pnpm --dir g5-admin lint`, `pnpm --dir g5-admin test`, `pnpm --dir g5-admin build`, `pnpm --dir g5-admin tauri build --bundles app`를 다시 통과

### 관리자 셸 IA/디버그 독/첫 화면을 실사용 기준으로 재정렬

- Why: 관리자 앱은 이미 route 기반 셸로 전환됐지만, 실제 정보구조는 `상단 주메뉴 + 좌측 서브메뉴 + 첫 화면 소개 페이지` 요구와 어긋나 있었다. 디버그 독도 하단 상태바라고 보기엔 커서 작업면을 가렸고, 일부 페이지는 새 셸과 구 대시보드 톤이 섞여 있어 디자인 일관성이 떨어졌다.
- What:
  - `g5-admin/src/app/router.tsx`, `features/layout/navigation.ts`, `features/layout/AppShell.tsx`를 갱신해 기본 진입점을 `/overview`로 바꾸고, 상단 주메뉴와 좌측 서브메뉴가 역할별로 분리된 셸로 재구성
  - `g5-admin/src/features/overview/AdminOverviewPage.tsx`, `features/layout/PageIntro.tsx`를 추가해 로그인 후 첫 화면을 Rust Admin 소개용 히어로 페이지와 메뉴 인포그래픽 그리드로 교체
  - `g5-admin/src/debug/DebugDock.tsx`를 우하단 미니 아이콘/상태 박스 구조로 재작성하고, 접힘 상태에는 `pending/error/total/ON-OFF/열기`만 노출하도록 정리
  - `g5-admin/src/features/config/AdminConfigPage.tsx`, `features/members/AdminMembersPage.tsx`, `features/system/AdminSmsConfigPage.tsx`, `features/legacy/LegacyDomainBridge.tsx`, `src/App.css`, `src/index.css`를 정리해 페이지 헤더 톤, 레거시 bridge 화면, 긴 문자열 워드랩 규칙을 한 세트로 통일
  - `pnpm --dir g5-admin lint`, `pnpm --dir g5-admin test`, `pnpm --dir g5-admin build`를 다시 통과했고, Playwright mock preview로 `/overview`, `/settings/general`, `/settings/qa` 레이아웃을 시각 점검

### PHP-Rust 책임 귀속 추적 구조 전면 정비

- Why: 기존 관리자 앱은 `request_id`와 에러 배너만으로는 장애 책임이 `Rust UI`, `Tauri`, `네트워크`, `PHP API`, `DB/스토리지` 중 어디에 있는지 즉시 판단하기 어려웠다. 서버가 이미 내려주는 분류 정보도 Rust 경계에서 버리고 있어 디버깅이 사람 추론에 의존하고 있었다.
- What:
  - `g5-admin/src-tauri/src/models/trace.rs`에 `ResponseTrace`, `Traced<T>`, `HasApiTraceMeta`를 추가해 성공 응답도 `request_id/correlation_id/server_request_id`가 타입 수준에서 보존되도록 고정
  - `g5-admin/src-tauri/src/error.rs`, `api_client.rs`, `commands/*.rs`를 정비해 RFC 7807의 `error_code`, `error_category`, `fault_domain`, `owner`, `retryable`, `user_actionable`를 프론트까지 그대로 전달
  - `g5-admin/src/api/client.ts`, `src/debug/diagnostics.ts`, `src/debug/DebugDock.tsx`, `src/features/dashboard/FormFields.tsx`를 갱신해 Debug Dock과 에러 배너에서 `correlation_id`, `server_request_id`, `owner`, `fault_domain`, `retryable`를 즉시 확인 가능하게 정리
  - `cargo test --manifest-path g5-admin/src-tauri/Cargo.toml`, `pnpm --dir g5-admin test`, `pnpm --dir g5-admin build`, `pnpm --dir g5-admin lint`를 다시 통과

### Admin Config 응답의 scalar 혼합 타입을 앱 DTO에서 허용

- Why: `/admin/config`는 일부 필드가 OpenAPI/SDD 상 문자열처럼 보이더라도 실제 PHP/DBAL 경로에서는 `1`, `0`, `true`, `false` 같은 scalar로 반환될 수 있었다. 앱 DTO가 `Option<String>`만 고집하면 설정 조회 자체가 `serialization_error`로 끊겼다.
- What:
  - `g5-admin/src-tauri/src/models/config.rs`에 커스텀 역직렬화를 추가해 `string|number|bool|null` scalar를 모두 받아 내부 문자열로 정규화
  - 같은 파일에 숫자/불린 허용 테스트와 객체 shape 거부 테스트를 추가
  - `specs/domains/ADMIN_CONFIG_SDD.md`에 `/admin/config` 실제 응답 shape의 scalar 혼합 허용 규칙을 반영

### 상단 액션/주메뉴 아이콘 체계를 Lucide 한 세트로 통일

- Why: 라운드를 걷어낸 뒤에도 상단 액션 아이콘과 주메뉴 표기가 텍스트/아이콘/죽은 버튼 상태로 섞여 있어 시각 언어가 통일되지 않았다. 관리자 셸은 상단 액션과 주메뉴가 같은 outline icon 규칙을 써야 덜 산만하다.
- What:
  - `g5-admin/src/features/layout/navigation.ts`에 main menu group icon을 추가하고 `설정=SlidersHorizontal`, `회원=Users`, `콘텐츠=PanelsTopLeft`, `운영 도구=Wrench` 기준으로 통일
  - `g5-admin/src/features/layout/AppShell.tsx`에서 상단 주메뉴와 좌측 main menu 모두 같은 Lucide stroke 스타일로 렌더링하고, 상단 액션 버튼도 동일한 아이콘 규칙으로 정리
  - 상단 설정 아이콘은 죽은 버튼이 아니라 `/settings/general`로 이동하도록 연결

### 전역 라운드 제거와 외부 API 설정 파일 우선순위 정렬

- Why: 현재 관리자 UI는 route 셸이 들어간 뒤에도 `rounded-*` 유틸과 레거시 CSS radius가 곳곳에 남아 있어 형님이 원하는 직각형 작업면 톤과 맞지 않았다. 또한 API endpoint는 전용 설정 파일 경계는 있었지만, 번들 파일이 먼저 잡혀 외부 사용자 설정 파일을 별도로 두기 어려웠다.
- What:
  - `g5-admin/src/index.css`, `g5-admin/src/App.css`에 전역 radius override를 추가해 Tailwind `rounded-*` 유틸과 레거시 카드/버튼/input/debug-dock radius를 거의 직각형으로 통일
  - `g5-admin/src-tauri/src/runtime_config.rs`에서 OS 사용자 설정 파일(`~/Library/Application Support/g5-admin/app-config.json`)을 번들 `app-config.json`보다 먼저 찾도록 런타임 설정 우선순위를 조정
  - `g5-admin/src-tauri/app-config.example.json`을 추가하고, `specs/README.md`, `specs/foundation/FOUNDATION_SDD.md`, `DEV_BOOTSTRAP_CHECKLIST.md`, `REST_API_CLIENT_STANDARD.md`에 외부 설정 파일 사용 규칙을 반영

### 기본 실행 창 크기를 관리자 작업면 기준으로 확대

- Why: Tauri 기본 창 설정이 `800x600`이라 관리자 셸, 데이터 테이블, 상세 패널을 동시에 보기에는 지나치게 작았다. 데스크톱 관리자 앱은 첫 실행부터 넓은 작업면이 열려야 했다.
- What:
  - `g5-admin/src-tauri/tauri.conf.json`의 기본 창 크기를 `1600x1040`으로 올리고, 최소 크기를 `1360x860`으로 고정
  - 창 시작 위치를 `center: true`로 설정해 첫 실행 시 화면 중앙에 열리도록 정리
  - 최신 `.app` 번들을 다시 빌드하고 `/Applications/g5-admin.app` 설치본으로 교체

### Debug Dock을 PHP Debugbar 스타일 하단 화이트 상태바로 재정렬

- Why: 기존 Debug Dock은 접힘 상태여도 다크 글래스 패널 감성이 강했고, 메인 라이트 관리자 셸 위에 지나치게 튀었다. 개발 중 상시 노출되는 도구는 화면 하단에 얇게 붙어 있다가 필요할 때만 위로 펼쳐지는 `white status bar` 패턴이 더 적합했다.
- What:
  - `g5-admin/src/debug/DebugDock.tsx`에서 최근 실패/진행 요청 요약을 하단 상태바 한 줄에 압축하고, 상세 추적/로그는 펼쳤을 때만 보이도록 조정
  - `g5-admin/src/App.css`의 Debug Dock 스타일을 다크 패널에서 `하단 고정 화이트 바 + 위로 뜨는 상세 패널` 구조로 재작성하고, 버튼/카운터/로그 배경도 라이트 톤으로 통일
  - `g5-admin/src/features/layout/theme.tsx`에서 저장값이 없을 때 기본 테마를 `light`로 고정해 첫 실행 기본값을 라이트 셸에 맞춤
  - `pnpm --dir g5-admin lint`, `pnpm --dir g5-admin test`, `pnpm --dir g5-admin build`, `cargo check --workspace`, `pnpm --dir g5-admin tauri build --bundles app`를 다시 통과

### Debug Dock 접힘/슬라이드 업 UX로 전환

- Why: 하단 Debug Dock이 기본 펼침 상태로 작업면을 가리고 있어 실제 관리자 작업 흐름을 방해했다. 개발 디버깅 도구는 항상 보이되 기본은 얇은 상태바만 노출되고, 필요할 때만 위로 펼쳐지는 구조가 더 맞았다.
- What:
  - `g5-admin/src/debug/DebugDock.tsx`를 기본 접힘 상태와 토글형 헤더 구조로 바꾸고, 펼칠 때만 상세 패널과 로그 tail이 보이도록 조정
  - `g5-admin/src/App.css`에 `debug-dock-collapsed`, `debug-dock-expanded`, `debug-dock-body` 슬라이드 업 전환 스타일을 추가
  - `pnpm --dir g5-admin lint`, `pnpm --dir g5-admin test`, `pnpm --dir g5-admin build`를 다시 통과

### 관리자 셸 UX 재구성과 라이트/다크 테마 추가

- Why: 기존 셸은 좌측 통짜 사이드바와 어두운 전역 스타일이 섞여 있어 형님이 요구한 `상단 주메뉴 + 좌측 하위메뉴 + 중앙 콘텐츠` 패턴과 맞지 않았고, `App.css`의 전역 dark override 때문에 라이트 토큰도 제대로 반영되지 않았다.
- What:
  - `g5-admin/src/features/layout/AppShell.tsx`, `navigation.ts`, `theme.tsx`를 갱신해 상단 주메뉴, 좌측 하위메뉴, 중앙 콘텐츠, 새로고침 버튼, 라이트/다크 토글을 추가
  - `g5-admin/src/features/auth/LoginPage.tsx`, `LoginPage.test.tsx`를 수정해 로그인 화면도 동일한 테마 정책과 새 셸 톤에 맞춤
  - `g5-admin/src/index.css`, `g5-admin/src/App.css`, `g5-admin/src/main.tsx`를 정리해 전역 색 토큰은 `index.css`로 통합하고, `App.css`는 레거시 bridge 화면용 클래스만 유지
  - `pnpm --dir g5-admin lint`, `pnpm --dir g5-admin test`, `pnpm --dir g5-admin build`, `cargo check --workspace`를 다시 통과

### Admin Members route 기반 페이지 마이그레이션

- Why: `members`는 아직 `LegacyDomainBridge` 위에 걸린 예전 대시보드 섹션이라 route 기반 관리자 셸 안에서 가장 자주 쓰는 운영 도메인이 정식 페이지가 아니었다. 검색/페이지 이동/상세/레벨/프로필/삭제를 `/members` 작업면으로 끌어올려야 다음 `Boards` 마이그레이션도 같은 패턴으로 반복할 수 있었다.
- What:
  - `g5-admin/src/features/members/AdminMembersPage.tsx`, `MembersDataTable.tsx`, `MemberDetailCard.tsx`, `admin-members-form.ts`, `admin-members-form.test.ts`를 추가해 `/members`, `/members/:mbId` route와 RHF + Zod + TanStack Table 기반 회원 관리 페이지를 구현
  - `g5-admin/src/app/router.tsx`, `g5-admin/src/features/layout/navigation.ts`, `AppShell.tsx`를 갱신해 동적 detail route에서도 올바른 헤더/사이드바 메타가 유지되도록 정리
  - `specs/domains/ADMIN_MEMBERS_SDD.md`, `specs/TODO.md`를 현재 route 기반 동작과 query string 규칙에 맞게 갱신
  - `pnpm --dir g5-admin lint`, `pnpm --dir g5-admin test`, `pnpm --dir g5-admin build`, `cargo check --workspace`, `cargo test -p g5-admin-desktop models::tests::export_ts_bindings -- --exact --nocapture`를 다시 통과
  - 최신 `.app` 번들을 다시 빌드하고 `/Applications/g5-admin.app` 설치본으로 교체

## 2026-03-06

### 헌법/SDD/프론트 품질 게이트 정합성 수정

- Why: 헌법 감사에서 실제 저장소는 route 기반 `app/ + features/ + components/ui/` 구조와 `Vitest/ESLint` 게이트로 움직이는데, 헌법과 foundation 문서는 예전 `pages/`, `hooks/`, `services/api_client.rs`, `Admin Members first` 기준을 그대로 적고 있었다. 이 상태에서는 문서 거버넌스는 통과해도 헌법이 리뷰 기준으로 신뢰되지 않았다.
- What:
  - `.agent/Constitution.md`를 `v1.4.0`으로 올리고 실제 워크스페이스 구조, `Admin Config` route, `api_client/*.rs`, `runtime_config.rs`, `token_store.rs`, `pnpm --dir g5-admin lint`, `pnpm --dir g5-admin test` 품질 게이트를 반영
  - `specs/foundation/FOUNDATION_SDD.md`, `DEV_BOOTSTRAP_CHECKLIST.md`, `REST_API_CLIENT_STANDARD.md`, `specs/README.md`, `specs/IMPLEMENTATION_ROADMAP.md`를 현재 구조와 일치하도록 갱신
  - `g5-admin`에 `eslint.config.js`, `vitest.config.ts`, `src/test/setup.ts`, 로그인/설정 폼 테스트를 추가해 문서에 적힌 프론트 품질 게이트를 실제로 실행 가능하게 만들고, `AdminConfigPage`, `DashboardSidebar`, `useDashboardController`, `DashboardView`를 lint/test 기준에 맞게 정리

### Admin SMS 설정 도메인 bootstrap 추가

- Why: `settings/sms`는 route 셸 안에 자리만 있었고 실제 구현은 placeholder 카드뿐이었다. 설정 도메인 흐름을 완성하려면 `/admin/sms/config`와 `/admin/sms/member-sync`를 먼저 정식 page로 올려서 설정형 단일 리소스 + 운영 액션 패턴을 고정할 필요가 있었다.
- What:
  - `g5-admin/src-tauri/src/models/sms.rs`, `api_client/sms.rs`, `commands/sms.rs`를 추가해 SMS 설정 조회/저장과 회원 연락처 동기화 command 경계를 구현
  - `g5-admin/src/api/client.ts`에 `cmd_admin_sms_config_get`, `cmd_admin_sms_config_update`, `cmd_admin_sms_member_sync` invoke adapter와 진단 컨텍스트를 추가
  - `g5-admin/src/features/system/AdminSmsConfigPage.tsx`, `admin-sms-config-form.ts`, `admin-sms-config-form.test.ts`를 추가해 RHF + Zod 기반 SMS 설정 페이지와 동기화 요약 UI를 구현하고 placeholder route를 대체
  - `specs/domains/ADMIN_SMS_SDD.md`, `specs/domains/README.md`, `specs/README.md`, `specs/TODO.md`를 갱신해 SMS 도메인 기준선을 문서 SSOT에 반영

### REST API client 구현 표준 문서 추가

- Why: foundation 문서에는 공통 아키텍처 원칙이 있었지만, 실제 `api_client`, `cmd_*`, 프론트 invoke adapter, diagnostics, request_id, DTO export drift를 한 번에 보는 REST client 전용 기준 문서가 없었다. 이 상태로는 도메인 추가 때마다 같은 규칙을 다시 구두로 설명해야 해서 드리프트 위험이 컸다.
- What:
  - `specs/foundation/REST_API_CLIENT_STANDARD.md`를 추가해 OpenAPI 원본 우선순위, Rust/Tauri command 경계, timeout/retry, RFC 7807 에러 매핑, diagnostics, local log, DTO export, route-based query 규칙을 정리
  - `specs/foundation/README.md`, `specs/README.md`, `specs/TODO.md`에 해당 문서를 개발 착수용 필독 자료와 진행 이력로 연결

### Route 기반 관리자 셸과 Admin Config 정식 페이지 추가

- Why: 기존 구현은 route 없이 한 화면 토글에 의존해 관리자 앱 표준 정보구조와 맞지 않았다. 먼저 `기본 설정(Admin Config)`을 정식 route 페이지로 올리고, 나머지 도메인은 route 기반 bridge로 전환해야 이후 Members/Boards/SMS 마이그레이션도 일관되게 진행할 수 있었다.
- What:
  - `g5-admin/src/app/router.tsx`, `g5-admin/src/features/layout/AppShell.tsx`, `ProtectedLayout.tsx`, `features/auth/LoginPage.tsx`, `features/auth/use-auth-session.ts`를 추가해 `React Router` 기반 로그인/보호 route/사이드바 셸을 도입
  - `g5-admin/src-tauri/src/models/config.rs`, `api_client/config.rs`, `commands/config.rs`와 `g5-admin/src/api/client.ts`를 통해 `/admin/config` Rust command 경계를 추가
  - `g5-admin/src/features/config/AdminConfigPage.tsx`를 추가해 `React Hook Form + Zod + shadcn 기반` 기본 설정 페이지를 구현하고 `/settings/general` route로 연결
  - `g5-admin/src/features/legacy/LegacyDomainBridge.tsx`를 추가해 기존 Members/Boards/Permissions/QA/Polls/Popups 구현을 route 기반 셸에 bridge 방식으로 연결
  - `specs/domains/ADMIN_CONFIG_SDD.md`, `specs/IMPLEMENTATION_ROADMAP.md`, `specs/TODO.md`를 현재 구조 기준으로 갱신

### `next-shadcn-dashboard-starter` 스타일 앱 셸 이식

- Why: 상단 드롭다운만으로는 관리 도메인 간 전환 구조가 여전히 약했고, 실제 관리자 앱답게 좌측 사이드바, 상단 헤더, 페이지 컨테이너가 분리된 셸이 필요했다. Next.js starter를 그대로 쓰는 대신 정보구조와 레이아웃 언어만 현재 Tauri/Vite 앱에 맞게 가져오는 편이 현실적이었다.
- What:
  - `g5-admin/src/features/dashboard/DashboardSidebar.tsx`, `DashboardHeader.tsx`, `domains.ts`를 기준으로 좌측 네비게이션과 상단 헤더를 추가
  - `g5-admin/src/features/dashboard/DashboardView.tsx`를 starter-inspired 앱 셸 구조로 재작성하고, 활성 도메인만 컨텐츠 컨테이너에 렌더링하도록 정리
  - `g5-admin/src/App.css`에 사이드바, 상단 헤더, 사용자 카드, 페이지 컨테이너용 스타일을 추가하고 기존 도메인 카드들과 결합

### 관리자 화면을 상단 도메인 워크스페이스로 전환

- Why: 기존 화면은 Members, Boards, Permissions, QA Config, Polls, Popups를 한 페이지에 세로로 전부 늘어놓아 정보 밀도가 과도했고, 로그인 직후 모든 도메인 query가 동시에 실행돼 UX와 디버깅 모두 불리했다.
- What:
  - `g5-admin/src/features/dashboard/DashboardView.tsx`, `DashboardNavigation.tsx`, `domains.ts`를 정리해 상단 드롭다운 메뉴 기반 도메인 워크스페이스를 추가
  - `g5-admin/src/features/dashboard/useDashboardController.ts`를 활성 도메인 기반 query enable 방식으로 변경해 현재 선택된 도메인만 목록/상세를 실제 호출하도록 수정
  - `g5-admin/src/App.css`에 워크스페이스 헤더, 세션 칩, 드롭다운 네비게이션, 단일 도메인 stage 레이아웃 스타일 추가

### 개발용 세션 저장소를 file 모드로 분리

- Why: macOS에서 ad-hoc 서명된 개발용 앱을 재빌드/재설치할 때마다 Keychain 접근 허용/비밀번호 대화상자가 반복되어 세션 복원과 도메인 조회가 `token_store_error`로 자주 중단됐다. 개발 단계에서는 디버깅 속도가 더 중요하므로 키체인 의존성을 분리할 필요가 있었다.
- What:
  - `g5-admin/src-tauri/src/runtime_config.rs`, `g5-admin/src-tauri/app-config.json`에 `sessionStorage`와 `G5_SESSION_STORAGE`, `G5_SESSION_STORE_PATH` 규칙을 추가하고 현재 개발 기본값을 `file`로 설정
  - `g5-admin/src-tauri/src/token_store.rs`를 `keychain|file` 백엔드 분기 구조로 바꾸고 파일 저장 시 `session.json`을 앱 데이터 경로에 `0600` 권한으로 기록하도록 조정
  - `g5-admin/src-tauri/src/commands/debug.rs`, `g5-admin/src-tauri/src/models/debug.rs`, `g5-admin/src/debug/DebugDock.tsx`에 현재 세션 저장 백엔드와 경로를 노출
  - `.agent/Constitution.md`, `specs/foundation/FOUNDATION_SDD.md`, `specs/foundation/AUTH_CORE_SDD.md`, `specs/foundation/DEV_BOOTSTRAP_CHECKLIST.md`에 개발/운영 저장소 정책을 반영

### 개발 모드 디버그 독과 로컬 로그 추적 추가

- Why: 현재 앱은 `request_id`와 에러 배너만으로는 "지금 어떤 endpoint가 호출 중인지", "어느 command가 실패했는지", "로컬에서 어떤 Rust 로그가 쌓였는지"를 즉시 파악하기 어려웠다. 개발 단계에서는 서버 로그 접근 전에도 앱 내부에서 원인 추적이 가능해야 했다.
- What:
  - `g5-admin/src/api/client.ts`, `g5-admin/src/debug/diagnostics.ts`, `g5-admin/src/debug/DebugDock.tsx`를 추가/수정해 모든 `invoke(cmd_*)` 요청의 `command`, `operation`, `api_target`, `local_target`, `status`, `request_id`, `duration`을 하단 디버그 독에서 실시간으로 노출
  - `g5-admin/src-tauri/src/debug_support.rs`, `g5-admin/src-tauri/src/commands/debug.rs`, `g5-admin/src-tauri/src/models/debug.rs`를 추가해 Rust `tracing` 로그를 로컬 파일에 남기고 앱 내부에서 tail 조회 가능하도록 정렬
  - `g5-admin/src-tauri/src/runtime_config.rs`, `g5-admin/src-tauri/app-config.json`에 `debugOverlay` 및 `G5_DEBUG_OVERLAY`, `G5_LOG_DIR` 규칙을 반영
  - 헌법과 foundation 문서에 개발 모드 디버그 독/로컬 로그 정책을 명시

### 프론트 에러 진단 컨텍스트 보강

- Why: 운영 중 `500 Internal Server Error`가 발생했을 때 `request_id`만으로는 현재 어떤 화면 작업과 어떤 Tauri command에서 실패했는지 즉시 식별하기 어려웠다.
- What:
  - `g5-admin/src/api/client.ts`에 command별 `operation`, `area`, `local_target` 컨텍스트 매핑과 구조화 콘솔 에러 로그 추가
  - `g5-admin/src/features/dashboard/FormFields.tsx`의 에러 배너에 `operation`, `area`, `command`, `local_target`, `api_target`, `detail`, `occurred_at`, `debug_summary` 노출 추가
  - 이제 서버 `request_id`와 함께 프론트 화면 작업 단위의 실패 위치를 즉시 확인 가능하도록 정렬

### 문서 관리 SSOT 체계 도입

- Why: 초기 Tauri 2 프로젝트에서 로드맵, 작업 상태, 이력, 감사 문서의 기준점을 먼저 고정하지 않으면 문서가 빠르게 분산될 가능성이 높았다.
- What:
  - `specs/README.md`, `specs/IMPLEMENTATION_ROADMAP.md`, `specs/TODO.md`, `specs/HISTORY.md`를 canonical 문서로 생성
  - `.agent/sub-constitutions/document-governance.md`와 `.agent/workflows/document-management.md` 추가
  - `scripts/doc-index.py`, `scripts/check-doc-governance.sh`, `scripts/archive_old_audits.py` 추가

### 헌법 v1.3 공통 Rust 기준 정렬

- Why: 스택과 Tauri 2 실행 규칙은 정리됐지만, 같은 Rust 프로젝트인 `rest-middleware`에서 이미 검증된
  공통 규율을 재사용하지 않으면 에러 컨텍스트, 설정 강제, 비동기 경계, 로그 추적성 기준이 다시 흩어질 위험이 있었다.
- What:
  - `.agent/Constitution.md`에 `rest-middleware`의 서버 비종속 Rust 기준 채택 원칙 추가
  - `.with_context` 계열 에러 컨텍스트, Zero Hardcoding, Fail-Fast 설정, `spawn_blocking`,
    `tokio::sync`, 명시적 타임아웃/재시도 제한 규칙 반영
  - 구조화 에러 로그 정책을 `component`, `operation`, `target`, `error`, `request_id` 중심으로 보강

### 헌법 v1.3.1 OpenAPI 계약 경로 명문화

- Why: 구현 기준이 Swagger 화면이 아니라 실제 `openapi.yaml` 원본 파일이라는 점을 문서에서 더 명확히 고정할 필요가 있었다.
- What:
  - `.agent/Constitution.md`에 canonical OpenAPI 로컬 경로와 참조 우선순위 추가
  - `specs/README.md`에 `G5_OPENAPI_PATH`와 실제 파일 경로 기반의 계약 SSOT 섹션 추가
  - `scripts/check-doc-governance.sh`에 OpenAPI 참조 문서화 검증 추가

### 개발 착수용 foundation 문서 세트 작성

- Why: 프로젝트 초기화와 헌법 정비만으로는 바로 구현에 들어갈 때 입력 문서가 부족했다. 개발 착수 전에는 전역 SDD, 부트스트랩 체크리스트, 작업 순서, 첫 도메인(Auth Core) 설계가 필요했다.
- What:
  - `specs/foundation/README.md`, `specs/foundation/FOUNDATION_SDD.md`, `specs/foundation/DEV_BOOTSTRAP_CHECKLIST.md`, `specs/foundation/TASK_ORDER_EXECUTION.md`, `specs/foundation/AUTH_CORE_SDD.md` 추가
  - `specs/IMPLEMENTATION_ROADMAP.md`, `specs/TODO.md`, `specs/README.md`를 개발 시작 시점 기준으로 정렬
  - `scripts/check-doc-governance.sh`에 foundation 지원 문서 존재 검증 추가

### Auth Core skeleton 및 공통 런타임 spine 구현

- Why: 개발을 본격적으로 진행하려면 인증 흐름, keyring 세션 보관, request_id 전달, 공통 에러 페이로드, Rust API 클라이언트라는 최소 실행 뼈대가 먼저 작동해야 했다.
- What:
  - `g5-admin/src-tauri/src/api_client.rs`, `g5-admin/src-tauri/src/token_store.rs`, `g5-admin/src-tauri/src/request_id.rs`, `g5-admin/src-tauri/src/error.rs`, `g5-admin/src-tauri/src/app_state.rs` 추가 및 정렬
  - `cmd_auth_login`, `cmd_auth_refresh`, `cmd_auth_status`, `cmd_auth_logout`, `cmd_member_me_get`, `cmd_system_health` 구현과 keyring 기반 세션 흐름 연결
  - `ts-rs` 기반 타입 export 테스트를 `g5-admin/src/types/*.ts` 생성 경로에 맞게 수정하고 React Query 기반 Auth Core 화면으로 프론트 초기 뼈대 교체
  - command 경계의 구조화 에러 로그와 refresh 401/403 시 로컬 세션 정리 정책 반영

### Admin Members 조회 bootstrap 구현

- Why: Auth Core 다음 단계에서는 실제 관리자 업무 흐름에 가까운 첫 도메인 조회 화면이 필요했고, OpenAPI만으로는 응답 shape가 느슨해서 PHP 구현 기준의 보강 문서와 함께 Rust/React 타입 연결을 확정해야 했다.
- What:
  - `specs/domains/README.md`, `specs/domains/ADMIN_MEMBERS_SDD.md` 추가로 OpenAPI 해석, 실제 응답 shape, DTO/command 매핑, UI 정보구조를 문서화
  - `g5-admin/src-tauri/src/commands/member.rs` 추가와 `cmd_admin_member_get_list`, `cmd_admin_member_get`, `cmd_member_me_get` 분리
  - `g5-admin/src-tauri/src/models/member.rs`, `g5-admin/src-tauri/src/api_client.rs`에 Admin Members DTO, pagination, query, detail/list API 처리 추가
  - React 화면을 Auth 전용 상태에서 Members 목록/상세/검색/페이지 이동이 가능한 관리자 bootstrap 화면으로 확장

### Admin Members 레벨 수정 flow 구현

- Why: 첫 관리자 도메인을 조회 전용으로만 두면 실제 운영 액션 경로 검증이 부족했다. 가장 범위가 좁고 권한 규칙이 명확한 `mb_level` 변경부터 붙여서 mutation 경계와 UI 잠금 규칙을 확인할 필요가 있었다.
- What:
  - `PATCH /admin/members/{mb_id}/level` 계약을 기준으로 `AdminMemberLevelUpdateInput` DTO와 `cmd_admin_member_update_level` command 추가
  - React 상세 패널에 레벨 선택과 저장 버튼을 추가하고, 저장 중 disabled 처리 및 자기 자신/최고관리자 레벨 변경 프론트 차단 반영
  - 저장 성공 시 상세 캐시를 즉시 갱신하고 회원 목록을 재조회하도록 연결

### Admin Members 수정/삭제 flow 구현

- Why: 레벨 수정만으로는 mutation 경계가 충분하지 않았다. 일반 프로필 수정과 soft delete까지 붙여야 `PATCH`, `DELETE`, 위험 작업 확인, 변경 필드만 전송 규칙, 목록/상세 재동기화 패턴이 완성된다.
- What:
  - `AdminMemberUpdateInput`, `AdminMemberDeleteInput`, `cmd_admin_member_update`, `cmd_admin_member_delete` 추가
  - `PATCH /admin/members/{mb_id}`는 변경된 필드만 payload에 포함하고, `DELETE /admin/members/{mb_id}`는 `CommandMessage`로 정규화
  - React 상세 패널에 프로필 수정 폼, 동의 체크박스, 삭제 버튼, 삭제 확인 dialog, 저장/삭제 후 목록/상세 재동기화 추가

### Admin Boards bootstrap 구현

- Why: Members만 구현된 상태에서는 다음 도메인으로 확장할 때 재사용 가능한 패턴이 충분히 검증되지 않았다. Board를 두 번째 도메인으로 붙여서 목록/상세/pagination/search 패턴이 Members 외 도메인에서도 그대로 먹히는지 확인할 필요가 있었다.
- What:
  - `specs/domains/ADMIN_BOARDS_SDD.md` 추가와 `Board` 도메인 목록/상세 계약, 실제 응답 shape, DTO/command/UI 규칙 문서화
  - `g5-admin/src-tauri/src/models/board.rs`, `g5-admin/src-tauri/src/commands/board.rs` 추가와 `cmd_admin_board_get_list`, `cmd_admin_board_get` 구현
  - `g5-admin/src-tauri/src/api_client.rs`, `g5-admin/src/api/client.ts`, `g5-admin/src/App.tsx`에 Board 목록/상세 bootstrap 연결 및 관리자 대시보드 하단 섹션 추가

### Admin Boards mutation flow 구현

- Why: Board 도메인이 조회 전용이면 실제 관리자 운영 흐름을 검증하기 어렵다. 생성/수정/삭제까지 붙여야 `POST`, `PUT`, `DELETE`, 위험 작업 확인, 변경 필드만 전송, 목록/상세 재동기화 패턴이 Members와 같은 수준으로 고정된다.
- What:
  - `AdminBoardCreateInput`, `AdminBoardUpdateInput`, `AdminBoardDeleteInput`, `cmd_admin_board_create`, `cmd_admin_board_update`, `cmd_admin_board_delete` 추가
  - `POST /admin/boards`, `PUT /admin/boards/{bo_table}`, `DELETE /admin/boards/{bo_table}`를 Rust API client와 프론트 invoke client에 연결
  - React Board 섹션에 생성 폼, 수정 폼, 삭제 버튼, 숫자 필드 검증, mutation 중 disabled 처리, 성공 후 목록/상세 재동기화 추가

### 런타임 API 기본 주소를 스테이징으로 전환

- Why: macOS 번들을 Finder 또는 터미널에서 바로 실행할 때 `G5_API_BASE_URL`이 없으면 `localhost`를 수동으로 붙이는 방식이 반복됐고, 실제 운영 테스트와 맞지 않아 로그인 단계에서 즉시 실패했다.
- What:
  - `g5-admin/src-tauri/src/api_client.rs`의 기본 API base URL을 `https://gnurestapi.cc/api/v1`로 변경
  - 환경변수 `G5_API_BASE_URL`이 있으면 override, 없으면 스테이징 기본값을 사용하도록 수정
  - foundation 문서와 체크리스트에 기본 런타임 API 주소를 명시

### 스테이징 로그인 TLS 신뢰 저장소 정렬

- Why: `gnurestapi.cc`는 macOS 시스템 키체인에 신뢰된 자체서명 인증서를 사용하고 있었는데, 앱은 `rustls` 백엔드를 사용해 시스템 trust store를 보지 않아 `/auth/login` 호출이 transport error로 실패했다.
- What:
  - `g5-admin/src-tauri/Cargo.toml`의 `reqwest` TLS 백엔드를 `rustls-tls`에서 `native-tls`로 변경
  - `g5-admin/src-tauri/src/api_client.rs`에서 `use_rustls_tls()` 강제 설정을 제거해 OS trust store를 사용하도록 조정
  - foundation 문서에 시스템 trust store 기반 TLS 사용 정책을 반영

### G5 `create_hash` 비밀번호 호환성 서버측 결함 수정

- Why: 앱의 transport/TLS 문제를 정리한 뒤에도 스테이징 로그인은 `401 Unauthorized`를 반환했다. 원인을 추적한 결과, REST API의 `PasswordCompat`가 G5 `config.php`의 `G5_STRING_ENCRYPT_FUNCTION=create_hash` 규칙을 따르지 않고 `password_verify/password_hash` 위주로 동작해 기존 G5 회원 비밀번호를 잘못 판정하고 있었다.
- What:
  - `php/api/v1/Core/Security/PasswordCompat.php`를 G5 PBKDF2(`create_hash`/`validate_password`) 형식과 레거시 MySQL `PASSWORD()` 해시 검증을 지원하도록 수정
  - `php/api/v1/Auth/Repository/AuthMemberQueryRepository.php`의 로그인 후 재해시 조건을 `password_needs_rehash()` 중심에서 호환성-aware `needsRehash()` 기준으로 교체
  - `php/tests/Security/PasswordCompatTest.php`를 추가하고 `AuthSessionServiceTest`, `AuthServiceTest`, `MemberServiceTest`, `AdminMemberServiceTest`까지 통과시켜 회귀를 점검

### Admin Permissions bootstrap 구현

- Why: Members와 Boards 기준선만으로는 실제 관리자 운영 화면의 공통 패턴이 충분히 고정되지 않았다. 다음 우선순위 도메인인 권한 관리를 붙여서 목록/검색/페이지 이동/저장/삭제 패턴이 시스템 도메인에서도 그대로 재사용되는지 확인할 필요가 있었다.
- What:
  - `specs/domains/ADMIN_PERMISSIONS_SDD.md`를 추가하고 `/admin/system/auths` 기반 계약, 실제 응답 shape, DTO/command/UI 규칙을 문서화
  - `g5-admin/src-tauri/src/models/permission.rs`, `g5-admin/src-tauri/src/commands/permission.rs`를 추가하고 `cmd_admin_permission_get_list`, `cmd_admin_permission_save`, `cmd_admin_permission_delete` 구현
  - `g5-admin/src-tauri/src/api_client.rs`, `g5-admin/src/api/client.ts`, `g5-admin/src/App.tsx`, `g5-admin/src/App.css`에 권한 목록/필터/선택/저장/삭제 UI와 React Query 흐름을 연결

### Admin Popups bootstrap 구현

- Why: 시스템 도메인을 권한까지만 붙여두면 운영 도구 쪽 CRUD 패턴이 비어 있었다. `/admin/system/popups`를 붙여서 목록/상세/생성/수정/삭제 흐름이 Boards 패턴을 그대로 재사용하는지 확인할 필요가 있었다.
- What:
  - `specs/domains/ADMIN_POPUPS_SDD.md`를 추가하고 `/admin/system/popups` 기반 계약, 실제 응답 shape, DTO/command/UI 규칙을 문서화
  - `g5-admin/src-tauri/src/models/popup.rs`, `g5-admin/src-tauri/src/commands/popup.rs`를 추가하고 `cmd_admin_popup_get_list`, `cmd_admin_popup_get`, `cmd_admin_popup_create`, `cmd_admin_popup_update`, `cmd_admin_popup_delete` 구현
  - `g5-admin/src-tauri/src/api_client.rs`, `g5-admin/src/api/client.ts`, `g5-admin/src/App.tsx`, `g5-admin/src/App.css`에 팝업 목록/상세/생성/수정/삭제 UI와 React Query 흐름을 연결

### Admin Polls bootstrap 구현

- Why: 운영 도구 도메인이 팝업만 있는 상태에서는 `/admin/system/polls`와 같은 다른 CRUD 계열 시스템 도메인에 패턴이 재사용되는지 확인하기 어려웠다. Poll을 붙여서 목록/상세/생성/수정/삭제 패턴이 Popup 구조를 그대로 확장할 수 있는지 검증할 필요가 있었다.
- What:
  - `specs/domains/ADMIN_POLLS_SDD.md`를 추가하고 `/admin/system/polls` 기반 계약, 실제 응답 shape, DTO/command/UI 규칙을 문서화
  - `g5-admin/src-tauri/src/models/poll.rs`, `g5-admin/src-tauri/src/commands/poll.rs`를 추가하고 `cmd_admin_poll_get_list`, `cmd_admin_poll_get`, `cmd_admin_poll_create`, `cmd_admin_poll_update`, `cmd_admin_poll_delete` 구현
  - `g5-admin/src-tauri/src/api_client.rs`, `g5-admin/src/api/client.ts`, `g5-admin/src/App.tsx`, `g5-admin/src/App.css`에 투표 목록/상세/생성/수정/삭제 UI와 React Query 흐름을 연결

### Admin QA Config 조회/수정 구현

- Why: 운영 도구가 CRUD 계열 도메인만 있으면 설정형 단일 리소스 패턴이 비어 있었다. `/admin/system/qa-config`를 먼저 붙여서 `GET/PUT` 기반의 설정 도메인도 같은 Rust command 경계와 React Query 패턴으로 소화되는지 검증할 필요가 있었다.
- What:
  - `specs/domains/ADMIN_QA_CONFIG_SDD.md`를 추가하고 `/admin/system/qa-config` 기반 계약, 실제 응답 shape, DTO/command/UI 규칙을 문서화
  - `g5-admin/src-tauri/src/models/qa_config.rs`, `g5-admin/src-tauri/src/commands/qa_config.rs`를 추가하고 `cmd_admin_qa_config_get`, `cmd_admin_qa_config_update` 구현
  - `g5-admin/src-tauri/src/api_client.rs`, `g5-admin/src/api/client.ts`, `g5-admin/src/App.tsx`, `g5-admin/src/App.css`에 QA 설정 조회/수정 UI와 React Query 흐름을 연결

### 에러 리포팅 가시성 보강

- Why: 실제 서버 500이 발생했을 때 앱이 `Internal Server Error`와 `request_id`만 노출해 어떤 경로에서 어떤 종류의 실패가 났는지 즉시 이해하기 어려웠다. 헌법의 `guide.action + request_id` 원칙을 UI와 API 양쪽에서 더 강하게 반영할 필요가 있었다.
- What:
  - `g5-admin/src-tauri/src/error.rs`, `g5-admin/src-tauri/src/api_client.rs`, `g5-admin/src/App.tsx`를 수정해 에러 payload에 `status`, `target`, `detail`을 포함하고 UI에 `guide.action`, `status`, `target`, `code`를 표시
  - `g5-admin/src-tauri/src/models/auth.rs`에서 RFC 7807 `meta.request_id`도 파싱하도록 보강
  - `php/api/v1/Core/Middleware/ErrorMiddleware.php`를 수정해 generic 500에도 기본 `guide`와 top-level `request_id`를 포함하도록 정렬

### 헌법 리팩터링 1차: 런타임 설정 주입과 Rust 구조 정리

- Why: 감사 결과 기준으로 가장 큰 위반은 운영 endpoint 하드코딩, `api_client.rs`/command 파일 크기 초과였다. 프론트 전체 리팩터링 전에 먼저 런타임 설정과 Rust 경계를 헌법 상한 안으로 넣을 필요가 있었다.
- What:
  - `g5-admin/src-tauri/app-config.json`과 `g5-admin/src-tauri/src/runtime_config.rs`를 추가해 런타임 API 주소를 코드 상수 대신 전용 설정 파일 또는 `G5_API_BASE_URL` override로 주입하도록 변경
  - `g5-admin/src-tauri/tauri.conf.json`에 `app-config.json` 리소스 번들을 추가하고 `g5-admin/src-tauri/src/app_state.rs`를 `RuntimeConfig` 기반 초기화로 정렬
  - `g5-admin/src-tauri/src/api_client.rs`를 공통 transport 계층만 남기고 `api_client/auth.rs`, `board.rs`, `member.rs`, `permission.rs`, `poll.rs`, `popup.rs`, `qa_config.rs`로 분할
  - `g5-admin/src-tauri/src/commands/common.rs`, `session.rs`를 도입해 `401 -> refresh -> 재시도` 패턴을 공통화하고 `board/member/permission/poll/popup/qa_config` command 파일을 300줄 이하로 축소

### 멀티OS 헌법 개정 반영: 배포 명령, WebView2, 경로 문서화, 크로스플랫폼 CI

- Why: 헌법 §13 기준으로는 주 개발이 macOS여도 판매/릴리스 타겟은 Windows이며, 경로/배포/CI 모두 멀티OS를 전제로 움직여야 한다. 그런데 실제 작업 레이어는 `deploy:mac`, `deploy:mac:fast`, macOS 전용 설정 경로 안내처럼 mac 편향 표면이 남아 있어 다음 구현과 운영 절차가 헌법과 어긋날 수 있었다.
- What:
  - `g5-admin/package.json`에 `deploy:desktop`, `deploy:desktop:fast`, `check:windows-target`를 추가하고 기존 `deploy:mac*`는 호환 alias로만 유지
  - `scripts/deploy-rust-admin-desktop.mjs`를 추가해 현재 OS를 감지한 뒤 macOS는 기존 `.app` 설치 스크립트를 사용하고, Linux/Windows는 사용자 로컬 설치 경로에 native artifact를 배치하도록 정리
  - `g5-admin/src-tauri/build.rs`를 보강해 macOS/Linux에서 Windows target check 시 `llvm-rc`가 필요한 리소스 컴파일은 건너뛰고, 정식 Windows 리소스/번들 생성은 Windows 호스트/CI에서만 수행되도록 기준을 코드로 고정
  - `g5-admin/src-tauri/tauri.conf.json`에 Windows `webviewInstallMode.embedBootstrapper`를 추가해 WebView2 미설치 환경에서도 부트스트래퍼를 기준으로 번들 설정이 유지되도록 반영
  - `.github/workflows/desktop-cross-platform.yml`을 추가해 `macos-latest`, `windows-latest` 매트릭스에서 `cargo check`, `export_ts_bindings`, `pnpm lint/test/build:web:fast`를 강제하고, macOS에서는 `x86_64-pc-windows-msvc` target type check도 함께 수행
  - `specs/README.md`, `specs/foundation/{FOUNDATION_SDD,REST_API_CLIENT_STANDARD,DEV_BOOTSTRAP_CHECKLIST}.md`의 런타임 설정/배포 기준을 macOS 단일 문구에서 macOS/Windows/Linux 예시와 `deploy:desktop*` 기준으로 갱신

### 크리티컬 커버리지 게이트 여유분 확보

- Why: 화면 캡처 `oklch` 회귀를 막는 테스트를 넣었더라도 크리티컬 분기 커버리지가 임계치 바로 위면 다음 사소한 변경에서 다시 게이트가 무너질 수 있다. 회귀 방지라는 목적에 맞게 캡처/사이드바 핵심 흐름을 한 단계 더 고정할 필요가 있었다.
- What:
  - `g5-admin/vitest.critical.config.ts`에 `capture-style-sanitizer.ts`를 크리티컬 커버리지 집합으로 편입
  - `g5-admin/src/features/layout/capture-style-sanitizer.test.ts`에 malformed input, compound CSS value, clone inline override 시나리오를 추가
  - `g5-admin/src/features/layout/AppShellSidebar.test.tsx`, `AppShellHeader.test.tsx`, `src/features/admin/shared/AdminFormFields.test.tsx`에 개발모드 off compact UI, overview fallback, 검색 실패/닫힘, 읽기 전용/디버그 필드 가드 시나리오를 추가
  - 크리티컬 coverage threshold를 `80 / 71 / 77 / 80`으로 상향하고 실제 수치를 `82.27 / 72.42 / 78.74 / 82.37`까지 끌어올림

### AppShell 직접 회귀 테스트와 PageIntro 분기 보강

- Why: 크리티컬 게이트가 올라가도 `AppShell`의 실제 캡처 실패 경로와 개발모드 컨텍스트 메뉴 가드, `PageIntro`의 compact/hero 변형 분기가 테스트 밖에 남아 있으면 실사용 회귀를 놓칠 수 있다.
- What:
  - `g5-admin/src/features/layout/AppShell.test.tsx`를 추가해 개발모드 off 시 캡처 메뉴 숨김, 브라우저 이미지 클립보드 API 미지원 오류, Tauri PNG 저장 command 실패 경로를 직접 검증
  - `g5-admin/src/features/layout/PageIntro.test.tsx`에 compact dev-mode off / hero no-aside 시나리오를 추가해 `PageIntro.tsx` 분기 커버리지를 `82.22%`까지 상향
  - 전체 Rust 관리자 테스트 수를 `45 files / 319 tests`로 확장하고, 크리티컬 branch coverage를 `72.90%`까지 추가 상향

### 컨텍스트 메뉴 helper 분리와 navigation 100% 고정

- Why: `AppShell.tsx` 본체는 Tauri/Web API와 섞여 있어 coverage gate에 그대로 넣기 부담이 컸다. 대신 컨텍스트 메뉴/selection 핵심 로직을 별도 helper로 분리하면 회귀 지점을 더 직접적으로 테스트하고, `navigation.ts`의 route/alias/delivery switch도 완전 고정할 수 있다.
- What:
  - `g5-admin/src/features/layout/app-shell-context-menu.ts`를 추가해 컨텍스트 메뉴 item 구성, editable target 판별, selection/replace helper를 분리
  - `g5-admin/src/features/layout/app-shell-context-menu.test.ts`, `navigation.test.ts`를 확장해 plain selection copy-only, inert contenteditable, null selection, hidden tool route, delivery label/description 전 케이스를 검증
  - `vitest.critical.config.ts`에 helper 모듈을 편입하고 threshold를 `82 / 73 / 79 / 82`로 다시 상향, 실제 수치를 `83.52 / 73.90 / 79.82 / 83.65`까지 끌어올림

## 2026-03-10

### 멀티사이트 P0 흐름을 `온보딩 -> 사이트 목록 -> 활성화 -> 로그인 -> 작업 홈`으로 재구성

- Why: 기존 멀티사이트는 사이트 카탈로그와 세션 기능은 있었지만, 첫 진입 라우팅과 첫 화면 책임이 흐릿해서 소개형 화면, 상단 사이트 탭, 첫 번째 사이트 강제 진입이 뒤섞여 있었다. 형님이 고정한 1~7 화면 플로우대로라면 루트 진입은 사이트 개수 기준으로 갈리고, 여러 사이트일 때는 반드시 사이트 목록 대시보드가 첫 작업면이 되어야 한다.
- What:
  - `g5-admin/src/features/sites/site-flow.ts`와 테스트를 추가해 `onboarding / dashboard / single-site scoped route / activation 후 landing` 판정 로직을 순수 함수로 고정
  - `g5-admin/src/app/router.tsx`, `ActiveSiteRedirect.tsx`, `ProtectedLayout.tsx`에서 `/sites/onboarding`, `/sites/dashboard`, `/sites/:siteId/activate` 흐름을 추가하고, 여러 사이트일 때는 더 이상 첫 번째 사이트나 활성 사이트로 즉시 빨려 들어가지 않도록 수정
  - `g5-admin/src/features/sites/SiteDashboardPage.tsx`, `SiteActivationPage.tsx`를 추가해 사이트 목록 대시보드, API 건강 상태 확인, 삭제 확인, 사이트 세션 활성화 로딩을 구현
  - `SiteOnboardingPage.tsx`, `auth/LoginPage.tsx`, `overview/AdminOverviewPage.tsx`를 소개형 랜딩에서 작업형 화면으로 재작성하고, `AppShellSidebar.tsx`는 상단 사이트 탭 대신 `좌측 사이트 목록 + 사이트별 메뉴` 2층 구조로 재편
  - 회귀 방지: `site-flow.test.ts`, `SiteDashboardPage.test.tsx`, `LoginPage.test.tsx`, `AdminOverviewPage.test.tsx`, `AppShellSidebar.test.tsx`, `AppShellHeader.test.tsx`, `AppShell.test.tsx`

### AppShellHeader 키보드/refresh 회귀와 게이트 84 단계 상향

- Why: 이전 단계까지도 크리티컬 branch가 임계값 바로 위라 여유가 얇았다. 특히 상단 검색 no-result 키보드 입력, 같은 경로 재이동, unknown route fallback, refresh 버튼은 회귀 빈도가 높은데도 직접 테스트 여지가 남아 있었다.
- What:
  - `g5-admin/src/features/layout/AppShellHeader.test.tsx`에 no-result `ArrowDown/ArrowUp` early return, 같은 경로 submit reset, unknown route 기본 설명, busy logout fallback, refresh toolbar reload 시나리오를 추가
  - `renderHeader()` 테스트 헬퍼를 정리해 `currentMember: null` fallback과 route 별 상태를 직접 주입 가능하게 수정
  - 전체 Rust 관리자 테스트 수를 `46 files / 341 tests`로 확장하고, 크리티컬 coverage threshold를 `84 / 75 / 80 / 84`로 상향한 뒤 실제 수치를 `84.50 / 75.19 / 80.48 / 84.58`로 통과시킴

### 화면 캡처 `oklch` 회귀 원인 제거

- Why: 이전 캡처 수정은 clone된 DOM의 inline/computed style 일부만 `rgb/rgba`로 정규화했고, 실제 runtime stylesheet rule에 남아 있던 `oklch` 테마 토큰과 Tailwind가 생성한 rule 경로는 그대로 남아 있었다. 그래서 `html2canvas`가 stylesheet/변수 경로를 타면 같은 `Attempting to parse an unsupported color function "oklch"` 에러가 반복됐다.
- What:
  - `g5-admin/src/index.css`의 runtime theme token을 전부 `rgb/rgba`로 변환해 앱 기본 테마 경로에서 `oklch`를 제거
  - `g5-admin/src/features/layout/capture-style-sanitizer.ts`에 clone document stylesheet rule 순회 정규화를 추가해 accessible `cssRules`까지 재귀적으로 `rgb/rgba`로 치환
  - `g5-admin/src/features/layout/theme-color-regression.test.ts`, `capture-style-sanitizer.test.ts`를 확장해 runtime stylesheet에 `oklch`가 남지 않는지와 clone stylesheet sanitizer가 실제로 rule-level 값을 정규화하는지 고정
  - 전체 Rust 관리자 테스트 수를 `47 files / 345 tests`로 확장했고, 크리티컬 coverage는 `84.67 / 75.30 / 80.61 / 84.76`로 다시 통과시킴

### SSH 터미널 반응성과 SFTP 데스크톱 작업면 보강

- Why: 실기 피드백에서 SSH 전체화면이 제대로 먹지 않고, xterm 입력이 한 박자 느리며, SFTP 좌측 트리 글자 대비와 우측 목록 스크롤이 데스크톱 클라이언트 수준에 못 미쳤다. 또 업로드는 단일 파일만 가능하고, 디렉터리 삭제는 비어 있을 때만 지워져 실제 운영에 답답함이 있었다.
- What:
  - `g5-admin/src/features/server-ssh/SiteSshShellCard.tsx`, `SiteSshXtermSurface.tsx`에서 SSH 입력 버퍼를 `12ms` 수준으로 낮추고 출력 polling을 `80ms`로 줄여, 강제 줄바꿈 없이 raw PTY 입력과 더 빠른 echo를 맞췄다.
  - SSH 전체화면은 portal 기반 오버레이 패널로 바꿔 실제 앱 작업면을 덮도록 정리했고, xterm에는 `@xterm/addon-webgl`을 붙여 렌더링 성능을 보강했다.
  - `g5-admin/src/features/server-files/SiteSftpWorkspaceSurface.tsx`, `SiteSftpBrowserControlsCard.tsx`, `SiteSftpDirectoryTree.tsx`, `SiteSftpBrowserList.tsx`를 데스크톱 SFTP 레이아웃 기준으로 다시 다듬어 좌측 다크 트리 대비를 올리고, 우측 파일 목록이 내부 스크롤을 갖는 고정 작업면으로 바꿨다.
  - `use-site-sftp-drop-upload.ts`, `use-site-sftp-transfer-workspace.ts`를 추가/보강해 여러 파일 선택 업로드와 Tauri drag-drop 업로드를 지원하게 했고, 업로드는 현재 원격 디렉터리에 순차 반영되도록 정리했다.
  - `g5-admin-ssh/src/sftp.rs`, `g5-admin-models/src/models/ssh.rs`, `src-tauri/src/app_state/sftp_delete_service.rs`에서 재귀 삭제를 추가하고, 프런트 `SiteSftpDeleteDialog.tsx`는 디렉터리 삭제 시 `delete` 입력 확인을 요구하게 바꿨다.
- Verify:
  - `cargo test -p g5-admin-models export_ts_bindings --quiet`
  - `cargo test --workspace --lib --quiet -- --test-threads=1`
  - `bun x tsc --noEmit`
  - `bun run test -- src/features/server-ssh/SiteSshShellCard.test.tsx src/features/server-files/SiteSftpBrowserPage.test.tsx`

### 로컬 Tauri 반복 빌드 가속 경로 추가

- Why: `pnpm tauri build --bundles app`는 `contract:check -> tsc -> vite build -> Rust release compile -> app packaging`를 매번 전부 다시 타므로, UI 회귀 확인용 로컬 반복 설치까지 정식 번들 경로로 처리하면 개발 루프가 과하게 느려졌다.
- What:
  - `g5-admin/package.json`에 `build:web`, `build:web:fast`, `build:desktop:fast`, `deploy:mac:fast` 스크립트를 추가해 정식 배포 경로와 로컬 반복 경로를 분리
  - `g5-admin/src-tauri/Cargo.toml`에 `desktop-fast` 커스텀 프로파일을 추가해 `release`를 건드리지 않고 로컬 반복 빌드만 incremental/codegen-units 최적화
  - `scripts/deploy-rust-admin-macos-fast.sh`를 추가해 기존 정식 `.app` 번들을 베이스로 새 `desktop-fast` 바이너리만 교체한 뒤 `/Applications/그누5어드민.app`에 재설치
  - `specs/README.md`에 어떤 경우에 `deploy:mac:fast`를 쓰고, 언제 정식 `tauri build --bundles app`를 다시 써야 하는지 기준을 명시

### viewport 캡처 복귀와 config extra field schema 정합성 보강

- Why: 전체 페이지 캡처는 UI 평가용으로는 해상도와 레이아웃 왜곡이 커서 실사용 가치가 낮았다. 또 `config` 도메인의 extra 필드 중 메일/알림 계열 checkbox가 Rust 쪽에서 text로 분류돼 raw key 입력창으로 잘못 그려지는 문제가 있었다.
- What:
  - `g5-admin/src/features/layout/AppShell.tsx`의 캡처 범위를 현재 viewport로 되돌리고, 저장 완료 토스트는 별도 액션 버튼 대신 파일명 자체를 클릭 가능한 링크형 description으로 변경
  - `g5-admin/src/features/layout/AppShell.test.tsx`를 viewport scroll offset 기준 회귀와 저장 토스트 reveal 동작 기준으로 갱신
  - `g5-admin/src/features/config/config-field-meta.ts`에서 `cf_email_*`, `cf_copy_log`, `cf_formmail_is_member`, `cf_use_profile` 등 schema상 checkbox인 extra 필드를 전부 boolean 집합으로 재분류
  - `g5-admin/src/features/config/AdminConfigPage.tsx`에서 `config` schema가 준비되기 전 raw key fallback 폼이 새지 않도록 확장 설정 영역을 schema gate 뒤로 이동
  - `g5-admin/src/features/config/admin-config-form.test.ts`에 메일 알림 boolean 필드 hydrate/diff 회귀를 추가

### xterm SSH 입력/출력 hot path 성능 안정화

- Why: 형님 실기 기준으로 SSH 터미널이 느리고, 빠른 타이핑에서 마지막 글자가 밀리거나 누락된 것처럼 보였으며, 많은 출력에서 xterm 렌더링이 네이티브 터미널보다 무거웠다.
- What:
  - `g5-admin/src-tauri/src/app_state/ssh_session_service.rs`, `g5-admin/src-tauri/src/commands/site/ssh_session.rs`, `g5-admin/src/api/client/ssh-shell.ts`에서 `cmd_ssh_shell_write`와 `cmd_ssh_shell_resize`가 더 이상 전체 `SshSessionStatusResponse`를 반환하지 않도록 줄여, 입력/resize hot path의 직렬화 비용을 제거했다.
  - `g5-admin/src/features/server-ssh/SiteSshXtermSurface.tsx`에 requestAnimationFrame 기반 output batching queue, WebGL 우선 렌더러, fit/resize dedupe, 명시적 xterm 성능 옵션을 넣었다.
  - `g5-admin/src/features/server-ssh/SiteSshShellCard.tsx`에서 write 완료 후 pending input chain flush를 보강하고 debounce를 4ms로 낮춰, 빠른 타이핑/붙여넣기 입력이 더 즉시 전달되도록 맞췄다.
  - `specs/foundation/xterm_ssh_performance_audit.md`, `specs/foundation/performance_test_checklist.md`를 추가해 병목, 적용 내용, 남은 리스크, 실기 검증 항목을 문서화했다.
  - 추가로 `SiteSshProfileDialog`에는 SSH 개인키 파일 picker를 넣고, SFTP 작업면은 좌측 가독성/`..` 이동/중앙 오류 모달 쪽으로 앱형 UX를 보강했다.
- 검증:
  - `cargo test --workspace --lib --quiet -- --test-threads=1`
  - `bun x tsc --noEmit`
  - `bun run test -- src/features/server-ssh/SiteSshShellCard.test.tsx src/features/server-profiles/SiteSshProfileDialog.test.tsx src/api/client/ssh-shell.test.ts`

### SSH xterm 입력 체감 병목 2차 완화

- Why: backend event push로 polling은 제거했지만, 빠른 타이핑에서는 `clear`가 `cle`만 보인 채 Enter가 먼저 들어가는 식의 체감 랙이 남아 있었다. 원인은 `invoke-per-write` 구조와 원격 echo 의존, 그리고 transcript 복구용 상태가 live output 중에도 React re-render를 일으키는 데 있었다.
- What:
  - `g5-admin/src/features/server-ssh/use-site-ssh-terminal-workspace.ts`에서 transcript를 React Query/live state hot path에서 빼고, 복구용 snapshot + ref 누적으로 분리했다. 이제 live 출력은 localStorage debounce만 타고, SSH chunk마다 컴포넌트 전체가 다시 렌더되지 않는다.
  - `g5-admin/src/features/server-ssh/SiteSshShellCard.tsx`, `SiteSshTerminalSurface.tsx`, `SiteSshXtermSurface.tsx`에 짧은 printable 입력의 로컬 즉시 에코와 원격 echo prefix 정합을 넣어, 화면 반영이 엔터보다 늦는 체감을 줄였다.
  - `SiteSshShellCard.test.tsx`, `use-site-ssh-terminal-workspace.test.tsx`를 갱신해 빠른 연속 입력과 transcript 복구 회귀를 고정했고, `specs/foundation/xterm_ssh_performance_audit.md`에 원인/적용 내용을 정리했다.
- 검증:
  - `bun x tsc --noEmit`
  - `bun run lint`
  - `bun run test -- src/api/client/ssh-shell.test.ts src/features/server-ssh/SiteSshShellCard.test.tsx src/features/server-ssh/SiteSshSessionPage.test.tsx src/features/server-ssh/use-site-ssh-terminal-workspace.test.tsx`
  - `bun run audit:docs`
  - `bun run audit:implementation`
  - `bun run audit:structure`

### 스키마 소비 도메인 전수 점검과 raw field fallback 차단

- Why: `/admin/schema`를 도입했더라도 화면이 schema query 완료 전에 먼저 렌더되면 일부 도메인에서 fallback label 또는 raw field key가 그대로 노출됐다. 특히 `config`, `contents`, `groups`, `members`, `faqs`, `polls`, `popups`, `menus`는 스키마 실패 시 폼이 열리면서 schema parity 원칙이 깨질 수 있었다.
- What:
  - `g5-admin/src/features/schema/FieldSchemaStatePanel.tsx` 공통 가드를 기준으로 `MenuWorkspace`, `PollWorkspace`, `PopupWorkspace`, `AdminContentsPage`, `AdminFaqsPage`, `MemberDetailCard`, `AdminBoardGroupsPage`, `AdminConfigPage`를 schema gate 뒤로 이동
  - 각 페이지의 top-level error 집계에서 schema query 오류를 분리해, schema 문제는 해당 작업면에서만 책임 있게 설명하고 일반 CRUD 오류 배너와 중복 노출되지 않도록 정리
  - `AdminBoardGroupsPage` summary 라벨의 raw fallback(`gr_id`, `gr_subject` 등)을 한국어 fallback으로 교체하고, `AdminConfigPage` extra field fallback도 generic label helper로 바꿔 코드상 raw key second-arg 패턴을 제거
  - `FieldSchemaStatePanel.test.tsx`, `MemberDetailCard.test.tsx`, `AdminConfigPage.test.tsx`를 추가/보강해 schema pending/error 시 폼 숨김 회귀를 고정
  - 검증: `pnpm test src/features/schema/FieldSchemaStatePanel.test.tsx src/features/contents/AdminContentsPage.test.tsx src/features/board-groups/AdminBoardGroupsPage.test.tsx src/features/members/MemberDetailCard.test.tsx src/features/config/AdminConfigPage.test.tsx`, `pnpm build:web:fast`
### file 모드에서 DB 마스터키 키체인 프롬프트 회귀 차단

- 변경
  - `g5-admin/src-tauri/src/app_state.rs`, `g5-admin/src-tauri/src/db.rs`에서 `sessionStorage=file`일 때 SQLCipher DB 마스터키 로딩도 파일 백엔드만 사용하도록 바꿨다.
  - 개발용 파일 모드에서 더 이상 macOS Keychain을 먼저 조회하지 않으므로, 앱 시작 시 반복 비밀번호 프롬프트가 뜨지 않아야 한다.
  - `g5-admin/src-tauri/src/db.rs`에 file backend 회귀 테스트 2건을 추가했다.
- 검증
  - `cargo test --manifest-path g5-admin/src-tauri/Cargo.toml file_mode_creates_and_reuses_master_key_file`
  - `cargo test --manifest-path g5-admin/src-tauri/Cargo.toml env_master_key_overrides_storage_backend`

### 멀티사이트 삭제 후 activity FK 회귀 수정

- Why: 실기 재배포 후 사이트 대시보드에서 삭제를 시도하자 `cmd_site_delete`가 `FOREIGN KEY constraint failed`로 떨어졌다. 원인은 `AppState::delete_site()`가 `sites` row를 지운 뒤에도 같은 `site_id`로 `activity_logs`에 `site.delete`를 기록하려고 했기 때문이다.
- What:
  - `g5-admin/src-tauri/src/app_state.rs`에서 삭제 대상 사이트 메타데이터를 먼저 확보한 뒤, 실제 삭제 후에는 `site_id = NULL`인 전역 activity 로그로 `site.delete`를 남기도록 순서를 수정했다.
  - 같은 파일에 회귀 테스트를 추가해 사이트 삭제가 onboarding 상태로 정상 전환되고, 삭제 activity가 전역 로그에 남는지 고정했다.
- 검증
  - `pnpm lint`
  - `pnpm test`
  - `pnpm build:web:fast`
  - `cargo test --manifest-path g5-admin/src-tauri/Cargo.toml delete_site_records_global_activity_after_site_row_is_removed`
  - `pnpm deploy:desktop:fast`

### SFTP 트리-목록 selection sync polish

- Why: SFTP 작업면은 목록 선택과 좌측 디렉터리 트리가 동시에 보이는데, 기존 구현은 `현재 열려 있는 경로`와 `선택된 디렉터리`를 같은 값으로 취급해서 탐색기형 포커스 감각이 약했다. 목록에서 디렉터리를 선택해도 트리 강조가 바로 따라오지 않아 앱형 파일 매니저처럼 느껴지지 않았다.
- What:
  - `g5-admin/src/features/server-files/use-site-sftp-workspace.ts`에서 `selectedDirectoryPath`를 따로 계산해, 현재 디렉터리와 선택 디렉터리의 책임을 분리했다.
  - `g5-admin/src/features/server-files/SiteSftpDirectoryTree.tsx`에서 트리 open-state는 `selectedPath ?? currentPath`를 기준으로 열고, 강조는 `selectedPath`, 현재 위치 표시는 `aria-current="location"`으로 따로 표현하도록 바꿨다.
  - `g5-admin/src/features/server-files/SiteSftpWorkspaceSurface.tsx`에서 디렉터리 트리에 `selectedDirectoryPath`를 전달하도록 연결했다.
  - `g5-admin/src/features/server-files/SiteSftpBrowserPage.test.tsx`에 목록에서 `logs`를 선택하면 트리의 `logs`도 선택 강조되는 회귀 테스트를 추가했다.
- 검증
  - `bun run test -- src/features/server-files/SiteSftpBrowserPage.test.tsx src/features/server-files/SiteSftpTransferQueuePanel.test.tsx`
  - `bun x tsc --noEmit`
  - `bun run lint`
  - `bun run audit:docs`
  - `bun run audit:implementation`
  - `bun run audit:structure`

### SFTP 목록/전송 패널 visual density polish

- Why: 작업면 구조와 기능은 앱형으로 올라왔지만, 파일 목록과 하단 큐의 행 높이와 열 폭이 여전히 느슨해서 FileZilla/Finder류 파일 클라이언트처럼 촘촘한 밀도가 부족했다.
- What:
  - `g5-admin/src/features/server-files/SiteSftpBrowserList.tsx`에서 목록 그리드 열 폭과 최소 폭을 줄이고, header/row padding과 virtualized row estimate를 낮춰 한 화면에 더 많은 항목이 보이도록 조정했다.
  - `g5-admin/src/features/server-files/SiteSftpSelectionToolbar.tsx`에서 배치 선택 툴바의 여백과 버튼 높이를 줄여 목록 상단 차지 면적을 낮췄다.
  - `g5-admin/src/features/server-files/SiteSftpTransferQueuePanel.tsx`에서 요약 pill, 실패 상세, concurrency control, 작업 행 밀도를 줄여 하단 작업센터가 로그 카드처럼 퍼져 보이지 않도록 정리했다.
  - 후속 조정으로 파일 목록 최소 폭과 열 비율을 한 번 더 줄이고, 작업 큐 header/status/row density를 추가로 압축해 기본 레이아웃에서도 horizontal scroll과 vertical footprint가 덜 거슬리게 다듬었다.
  - 추가로 `g5-admin/src/features/server-files/SiteSftpBrowserControlsCard.tsx`, `SiteSftpDirectoryTree.tsx`, `SiteSftpWorkspaceSurface.tsx`, `use-site-sftp-workspace-layout.ts`를 정리해, 외곽 카드/그림자 느낌을 줄이고 기본 split 비율과 트리/컨트롤 밀도를 더 FileZilla류 작업면에 가깝게 평탄화했다.
- 검증
  - `bun run test -- src/features/server-files/SiteSftpBrowserPage.test.tsx src/features/server-files/SiteSftpTransferQueuePanel.test.tsx`
  - `bun x tsc --noEmit`
  - `bun run lint`
  - `bun run audit:docs`
  - `bun run audit:implementation`
  - `bun run audit:structure`

### SFTP row click multi-selection polish

- Why: 목록 다중선택은 체크박스 기반으로는 이미 가능했지만, 탐색기형 파일 클라이언트 감각으로는 부족했다. `Ctrl/Cmd 클릭`과 `Shift 클릭`이 안 되면 실제 앱처럼 느껴지지 않고, 체크박스에만 의존하게 된다.
- What:
  - `g5-admin/src/features/server-files/use-site-sftp-workspace.ts`에서 selection anchor를 도입하고, replace/toggle/range selection 모드를 지원하도록 확장했다.
  - `g5-admin/src/features/server-files/SiteSftpBrowserList.tsx`에서 row click이 `Ctrl/Cmd`면 toggle, `Shift`면 range selection을 수행하게 바꿨다.
  - `g5-admin/src/features/server-files/SiteSftpBrowserPage.test.tsx`에 row click 기반 multi-select와 shift range selection 회귀 테스트를 추가했다.
- 검증
  - `bun run test -- src/features/server-files/SiteSftpBrowserPage.test.tsx`
  - `bun x tsc --noEmit`
  - `bun run lint`
  - `bun run audit:implementation`
  - `bun run audit:structure`

### 멀티사이트 마스터 잠금 SSOT 보정

- Why: 기존 멀티사이트 문서는 `최종 목표 플로우`에서는 `마스터 잠금 -> 사이트 선택/등록 -> 사이트 작업`을 말하면서도, 다른 구간에서는 `SiteCatalog` 선조회와 `기본 사이트` 자동 주입을 허용해 실제 구현이 우회 플로우로 흘렀다. 형님 요구는 `앱 진입 잠금이 먼저`, `첫 사이트는 사용자가 직접 입력`, `패스키 지원 포함`인데 문서가 이 기준을 일관되게 강제하지 못했다.
- What:
  - `specs/README.md`, `specs/IMPLEMENTATION_ROADMAP.md`, `specs/TODO.md`를 갱신해 멀티사이트 루트 흐름의 canonical 기준을 `로컬 마스터 잠금 설정/해제 -> 사이트 수동 등록/선택 -> 사이트 로그인 -> 사이트 작업 홈`으로 고정했다.
  - `specs/domains/MULTI_SITE_FIRST_SCREEN_DRAFT.md`에서 `마스터 계정/ID` 표현을 `로컬 마스터 잠금`으로 바꾸고, `마스터 잠금 없는 SiteCatalog 선조회`와 `기본 사이트 자동 주입`을 폐기된 우회 플로우로 명시했다.
  - `specs/domains/MULTI_SITE_SDD.md`에서 민감 정보 저장 정책과 온보딩 플로우를 수정해, 첫 실행 시 마스터 잠금을 먼저 만들고 legacy `apiBaseUrl`은 추천값으로만 제안하며 자동 사이트 삽입은 금지하도록 정리했다.
  - 후속 정정으로 `사이트 관리자 비밀번호`는 계속 PHP의 G5 레거시 호환 계층이 책임지고, `로컬 마스터 비밀번호`는 앱 잠금 전용으로 SQLite verifier에만 저장한다는 분리 기준도 문서에 명시했다.
- Why: 형님이 로컬 개발에서 `마스터 비밀번호 + 사이트 1개 + SSH 접속정보`를 매번 다시 입력하는 비용이 크다고 지적했고, dev mode에서는 보안보다 재현 가능한 빠른 부팅이 우선이었다. 기존 `첫 사이트는 수동 입력` 원칙은 운영 기본값으로는 유지하되, `debugOverlay + devMode` 조합에서만 명시적 dev bootstrap 경로를 별도로 열 필요가 있었다.
- What:
  - `runtime_config`에 `devBootstrap`을 추가하고, `masterPassword/site/sshProfiles[]`를 정규화하는 로더를 넣었다.
  - `AppState`에 `DevBootstrapService`를 추가해 마스터 잠금, 사이트, SSH 프로필을 idempotent upsert 하는 debug/local command를 만들었다.
  - 프런트 entry screen, 마스터 잠금 설정/해제, 사이트 온보딩 화면에 `개발 기본값 한 번에 채우기` 카드를 추가했다.
  - `app-config.example.json`, `specs/README.md`, `FOUNDATION_SDD.md`를 dev bootstrap 기준으로 갱신했다.
- Verify:
  - `cargo check --manifest-path g5-admin/src-tauri/Cargo.toml --quiet`
  - `cargo test --manifest-path g5-admin/src-tauri/Cargo.toml dev_bootstrap --quiet`
  - `cargo test -p g5-admin-models export_ts_bindings --quiet`
  - `bun x tsc --noEmit`
  - `bun run lint`
  - `bun run test -- src/features/dev/DevBootstrapCard.test.tsx src/features/onboarding/SiteOnboardingPage.test.tsx`
  - `bun run audit:docs`
  - `bun run audit:implementation`
  - `bun run audit:structure`
