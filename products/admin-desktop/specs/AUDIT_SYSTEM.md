---
doc_type: governance
status: active
owner: rust-admin
source_of_truth: true
canonical_for: audit operating system
ai_default_include: true
last_reviewed: 2026-07-23
review_cycle_days: 30
bounded_context: global
---
# 감사 운영 체계

이 문서는 `rust` 프로젝트의 **감사 운영 SSOT**입니다.

프로젝트의 성공은 단순한 구현 속도가 아니라, bounded context·계약·데이터 소유권·레거시 오염 방지 규칙을 지속적으로 강제하는 체계적 감사 프로세스 구축에 달려 있습니다.

## 1. 목적

- 감사는 구현 뒤에 붙는 부가 절차가 아니라, 구현을 통제하는 상설 운영 체계입니다.
- 완료 기준은 “기능이 동작한다”가 아니라 “정의된 감사가 통과하고, 드리프트가 보고되며, 문서와 코드가 정합하다”입니다.
- Rust 저장소는 PHP 공급자 계약을 **소비하는 쪽**이므로, 감사도 소비자 관점에서 설계합니다.

### 1.1 `API_PIPELINE_AUDIT_V1` 소비자 계약

`API_PIPELINE_AUDIT_V1`은 다음 연결을 한 번의 fail-closed 감사로 증명합니다.

`PHP runtime route/handler -> OpenAPI operation/request/response -> Rust wire DTO/client -> Tauri command edge -> IPC registry -> frontend wrapper/apiTarget -> UI field -> 실제 API 저장/재조회`

기계 판독 범위 SSOT는 `specs/integration/ACTIVE_CONSUMER_SCOPE.json`입니다.

- 서로 다른 OpenAPI path는 alias로 합치지 않습니다. non-shop 관리자 exact operation은 `184`개입니다.
- bootstrap은 `POST /auth/login`, `POST /auth/logout`, `POST /auth/refresh`, `GET /health`, `GET /members/me`의 `5`개입니다.
- 최종 활성 소비 기준은 `189`개입니다.
- 일반 게시판용 REST API는 멀티사이트 관리자 앱의 소비 대상이 아닙니다.
- 쇼핑몰 API, 보관 상태인 Flutter/Web는 routine 범위에서 제외합니다.
- PHP 레거시 inventory의 `adm/shop_admin` 분류는 공급자 책임으로 계속 포함합니다.

operation별 필수 증명은 아래와 같습니다.

1. PHP 선언 graph와 실제 Slim runtime route table 모두에 method/path/handler가 등록돼 있습니다.
2. OpenAPI에 operationId, security, parameter 위치와 required, body media/schema, status별 response/error schema가 정확히 있습니다.
3. Rust wire client가 같은 method/path와 request/response field의 이름·타입·format·nullable·default·enum 의미를 사용합니다.
4. 원격 operation을 소유한 Tauri command가 실제 `generate_handler!` registry에 등록돼 있습니다.
5. frontend `apiTarget`과 IPC command가 양방향으로 일치합니다.
6. `/admin/schema`의 모든 활성 field가 이름, control kind, required, default, option/option_source 의미를 보존해 렌더되고 저장 payload와 재조회에 반영됩니다.
7. 멀티사이트 실행에서는 `site_id + base_url + token`이 같은 요청 컨텍스트로 고정되고 다른 사이트 세션과 섞이지 않습니다.
8. live 서버의 site identity, provider revision, OpenAPI SHA가 로컬 PHP 입력과 일치합니다.

현재 1차 하네스의 기계 판정 상태는 다음과 같습니다. `partial`/`missing`은 설명용 warning이 아니라 감사 전체 Failure입니다.
여기서 `implemented`는 해당 **감사 판별기**가 구현됐다는 뜻이며, 현재 앱 소비가 완성됐다는 뜻이 아닙니다. 예를 들어 exact operation 판별기는 구현됐지만 현재 Rust 소비는 `185/189`라 실제 감사 결과는 Failure입니다.

| Capability | 상태 | 현재 증명 / 미증명 경계 |
|---|---|---|
| PHP declared route graph | implemented | 도달 가능한 include 선언 graph, module 제거·include 종류·method drift mutation |
| PHP runtime route table | implemented | DB 없이 실제 Slim RouteCollector를 부팅해 active 189 + protected board 26의 handler/middleware/security/status를 검증, 8개 mutation test |
| exact OpenAPI operation | implemented | 전체 312, admin 210, shop provider-only 26, active 189 고정; alias 축약 금지 |
| PHP handler contract binding | implemented | active 189 + protected 26의 request read, Controller/Service/Repository, response write를 current-run field-flow로 추적하며 215/215·finding 0, 17개 mutation test |
| OpenAPI request/response semantic closure | implemented | 활성 189개 operationId/security, 230개 parameter, 1186개 status별 response, 997개 RFC7807 error fingerprint 및 request/error/success runtime 검증 |
| Rust wire client | implemented | 371개 serde/ts-rs wire DTO, 활성 189-operation manifest, 210개 object/1682개 field 정합 및 transport 사전 request/raw-response 검증 |
| Tauri command -> client -> operation edge | implemented | same-file helper 재귀 해석 포함 186개 client-command edge, 미해결·불일치 0, swap mutation hard fail |
| IPC/frontend wrapper registry | implemented | import-reachable `generate_handler!` 253개 실함수/속성과 활성 191개 operation의 exported wrapper/invoke/apiTarget method/path edge 1:1 검증, comment·orphan·swap mutation hard fail |
| static field consumer | implemented | 17-domain reachable production source graph, 414개 contract-scoped field의 render/save/read-only ownership, 전체 metadata runtime guard, option_source presentation 보존, field-delete mutation |
| live-fixture DOM + mocked rehydrate | partial | 2개 domain만 존재하며 실제 서버 write/readback 증거가 아님 |
| real API write/readback/rollback | partial | production Rust wire client의 17-domain 실행 하네스와 실제 요청 operationId/unavailable accounting 검증은 구현됐다. 2026-07-22 Apache 결과는 JSON 미보존 `historical_observation`이며 destination certification이 아니다. 전 writable domain의 실제 Tauri invoke 증적과 새 대상 current-run artifact가 남음 |
| multisite atomic request context | implemented | 단일 async read/write context gate로 site_id/base_url/token 선택을 고정하고 2-site 동시 switch 차단·전후 token pair를 실테스트 |
| live provider identity binding | implemented | live health·site identity·배포 runtime revision·OpenAPI SHA를 current-run local PHP HEAD/계약과 결합하고 원문 site 값은 hash로만 증적 |

위 상태는 `check_api_pipeline_scope.py`의 v1 측정값으로도 고정됩니다. manifest의 `status`와 임의 evidence 문자열만 바꿔 `implemented`로 승격하면 하네스가 실패해야 합니다.
각 capability의 `required_check_ids`는 aggregate의 고정 binding과 정확히 일치해야 합니다. partial/missing capability에는 독립 blocked probe가 있으므로 scope status와 검사 상수만 수동 변경해도 인증할 수 없습니다. static/full 필수 check ID 집합의 누락·추가·중복도 모두 Failure입니다.

다음은 모두 Failure입니다.

- 누락, 초과, method/path/field/type/required/default/enum/response mismatch
- scanner 결과 0건, command/IPC 한쪽 방향만 비교, 등록 wrapper만 읽고 실제 grouped registry를 놓친 상태
- adapter 부재, 검증 `blocked`/`skipped`, child return code 무시
- 현재 실행보다 오래된 `latest.*` 재사용 또는 provider 없이 stale snapshot만 검사한 상태
- 생성 파일 존재만으로 runtime 소비를 증명했다고 판정한 상태

`g5-admin/contracts/generated/openapi-zod-client.ts`는 **계약 재생성·드리프트 검사용 산출물**이며 runtime 소비 SSOT가 아닙니다. Runtime wire SSOT는 `g5-admin-models/src/openapi_wire/generated.rs`와 같은 모듈의 validator입니다. 이 산출물은 Rust 빌드에 포함되고 `ApiClient -> TransportClient` 생성 시 주입되어 모든 활성 요청과 원문 성공 응답을 기존 화면 DTO 변환 전에 검사해야 합니다. 생성 파일의 존재만으로는 통과하지 않으며, generator freshness·189 operation graph·serde/ts-rs field parity·transport 호출 도달성을 함께 hard gate로 검증합니다.

실행 모드는 둘로 구분합니다.

- `bun run audit:api-pipeline:static`: 두 저장소의 현재 source/hash를 사용해 route/OpenAPI/DTO/client/IPC/static field parity를 검사합니다. 통과해도 `static_passed_not_certified`이며 최종 인증이 아닙니다.
- `bun run audit:api-pipeline`: 위 정적 감사에 legacy browser, live API/schema, live-fixture DOM, provider identity, Rust wire client 17-domain 실제 저장·재조회·정리 검증을 더합니다. `ADMIN_LEGACY_BASE_URL`, `G5_LIVE_API_BASE_URL`, `ADMIN_SCHEMA_INSPECT_SECRET`, `G5_LIVE_ACCESS_TOKEN`이 필요하며 민감값은 환경변수로만 전달합니다. live roundtrip은 mutation 전 무해한 404 요청으로 공개 경로의 PUT·PATCH·DELETE 허용 여부를 검사하고, 하나라도 WAF에 차단되면 fixture 생성 전에 실패합니다. 현재 DOM 저장/재수화는 2-domain mock이므로 전 writable domain의 실제 Tauri invoke가 끝나기 전에는 full certification이 아닙니다.

정식 증적은 `output/api-pipeline-audit/latest.{json,md}`이며 PHP/Rust revision, dirty 여부, OpenAPI/manifest/scope SHA-256, 고유 `run_id`, 같은 run 디렉터리의 child artifact를 포함해야 합니다. 이전 latest나 축소된 domain manifest는 재사용할 수 없습니다.
dirty worktree에서는 tracked diff와 untracked 파일을 합친 worktree fingerprint도 기록합니다. parent/child `audit_run_id`, domain row별 status/exit/current-run과 top count가 맞지 않으면 artifact 검증 자체가 실패합니다.

## 2. 문서 계층

### 2.1 헌법

- 파일: `.agent/Constitution.md`
- 역할: 최고 규범, 불변식, 금지/허용, 우선순위
- 포함해야 하는 것:
  - bounded context 원칙
  - 계약 SSOT
  - 레거시 quarantine
  - 감사 없이는 완료 아님
- 포함하지 말아야 하는 것:
  - 단계별 실행 절차
  - 세부 명령 조합
  - 보고서 형식 상세

### 2.2 감사 운영 SSOT

- 파일: `specs/AUDIT_SYSTEM.md`
- 역할: 어떤 변경에 어떤 감사를 언제 어떤 기준으로 붙이는지 정의
- 이 문서가 정하는 것:
  - 감사 분류
  - 실행 타이밍
  - 실패/경고 기준
  - 필수 산출물
- CI/스크립트/워크플로의 우선 관계

### 2.2.1 문서 운영 SSOT

- 파일: `specs/DOCUMENT_SYSTEM.md`
- 역할: 문서 타입, 상태, 정본 여부, AI 기본 참조 규칙을 정의
- 감사와 문서 체계가 충돌하면 감사 문서가 아니라 문서 운영 SSOT를 먼저 맞춘다.

### 2.3 감사 전략 문서

- 파일: `specs/AUDIT_STRATEGY.md`
- 역할: 왜 이런 감사를 하는지, Rust가 어떤 책임을 가지는지 설명
- 운영 규칙의 원문이 아니라 감사 철학과 책임 경계를 설명하는 보조 문서입니다.

### 2.4 워크플로 설명서

- 파일:
  - `.agent/workflows/codex-audit.md`
  - `.agent/workflows/architecture-audit.md`
  - `.agent/workflows/rust-php-parity-audit.md`
  - `.agent/workflows/integrated-three-way-audit.md` (파일명은 호환용이며 routine 범위는 PHP + Rust)
- 역할: 사람과 Codex가 따라야 하는 절차 설명
- 제약: 독자 규칙을 만들지 않고 `specs/AUDIT_SYSTEM.md`를 참조해야 합니다.

### 2.5 스크립트와 CI

- 스크립트/CI는 감사 운영 SSOT의 **집행 수단**입니다.
- 문서와 스크립트가 다르면 스크립트가 아니라 문서를 먼저 고쳐야 합니다.
- routine push 진입점은 `cd g5-admin && bun run hooks:install`로 활성화하는 scoped `pre-push`입니다. diff 기준 관련 테스트·변경 crate·계약·구조만 fail-closed로 실행하며 의존성 설치나 전체 workspace 검사를 중첩하지 않습니다.
- 릴리스 전 전체 진입점은 `cd g5-admin && bun run ci:local`입니다. API 파이프라인, frontend coverage/build, Rust workspace lint/test를 각 1회 실행하고 fingerprint가 같은 Bun/Composer/Python 의존성은 재사용합니다. Windows target까지 포함할 때는 `bun run ci:release-local`을 사용합니다.
- GitHub Actions의 contract/docs/structure는 `pull_request`와 main `push`에서 자동 실행합니다. 통합·교차 플랫폼 workflow와 native Windows release proof는 명시적 실행 경계로 유지합니다.

## 3. 감사 분류

### 3.1 문서 감사

- 명령: `bash scripts/run_document_audit.sh`
- 호환 alias: `cd g5-admin && bun run audit:docs`
- 목적: 문서 메타데이터, 문서 상태, 정본 참조 규칙, 문서 인덱스, 거버넌스 규칙이 유지되는지 확인
- 속도 원칙: 문서 감사는 Python/Bash만 사용하며 Bun/Rust toolchain 설치나 frontend dependency install을 요구하지 않습니다.
- 대표 입력:
  - 헌법/서브헌법
  - 워크플로 문서
  - `specs/*.md`
  - 문서 운영 정책
- 대표 산출:
  - active-scope 메타데이터 규칙 통과 여부
  - 문서 위생 규칙 통과 여부
  - review cycle stale 문서 실패 여부
  - docs index 최신성
  - 중복 SSOT/누락 canonical 문서/문서 수명 규칙 위반 여부
  - archive/status drift 여부
  - expired dated audit / entrypoint coverage drift / inactive reference 경고 여부

### 3.2 구현 감사

- 명령: `cd g5-admin && bun run audit:implementation`
- 목적: 현재 변경이 빌드, 타입, lint, 핵심 테스트, ts-rs 동기화까지 닫혔는지 확인
- 대표 입력:
  - 화면 구현
  - 일반 기능 수정
  - 테스트 보강
- 대표 산출:
  - 구현 완료 가능 여부
  - critical frontend coverage gate 통과 여부
  - Rust desktop scoped unit/lib 테스트 통과 여부
  - 소비 계약 감사 승격 필요 여부

### 3.3 소비 계약 감사

- 명령: `cd g5-admin && bun run audit:consumer`
- 목적: Rust가 PHP OpenAPI와 `/admin/schema` 의미를 올바르게 소비하는지 확인
- 대표 입력:
  - `src/api/client/**`
  - `src/types/**`
  - `g5-admin-models/src/models/**`
  - `api-target-registry`
  - `/admin/schema` 소비 의미 변경
- 대표 산출:
  - contract drift
  - DTO drift
  - metadata 적용 drift
  - route-native form metadata coverage (`schema_live` / `schema_planned`) 보고
  - route-native form save smoke coverage (`page_save / validation / unsupported_404`) 보고

### 3.4 구조 감사

- 명령: `cd g5-admin && bun run audit:structure`
- 목적: bounded context, ownership, service/port, registry, legacy quarantine이 유지되는지 확인
- 속도 원칙: 구조 감사는 빠른 거버넌스 gate입니다. TypeScript build, frontend bundle, Cargo workspace check/test를 기본 실행하지 않습니다.
- 대표 입력:
  - `AppState`, `db`, `api_client`, `commands`, `core::ports`
  - route/navigation/shell
  - `specs/audits/DOMAIN_BOUNDARY_RULES.toml`
  - crate 경계
  - 구조 리팩터링
- 대표 산출:
  - failure/warning 목록
  - frontend domain direct import 위반
  - support namespace business drift 위반
  - AppState wrapper-coupled service warning
  - source-of-truth ownership 충돌 보고
  - registry alignment drift 보고
  - core split readiness / extraction order 보고
  - route-native domain SDD/smoke coverage 보고
- 다음 구조 개선 우선순위

### 3.4.2 전체 deep 감사

- 명령: `cd g5-admin && bun run audit:deep`
- 목적: 구조 감사에 구현 감사, 소비 계약 감사, full Rust workspace baseline을 더한 릴리즈/대규모 리팩터링용 확인
- 속도 원칙: full workspace Cargo check/test는 이 명령에만 둡니다. 일반 구조 확인이나 문서 변경에는 사용하지 않습니다.

### 3.4.1 변경분 hotspot 감사

- 명령: `cd g5-admin && bun run audit:hotspots`
- 목적: 현재 diff 기준 LOC hotspot, giant registry, root orchestrator 후보를 빠르게 triage
- 대표 입력:
  - dirty worktree 변경 파일
  - clean worktree일 때는 기본 `HEAD~1..HEAD`
  - 필요 시 `python3 ../scripts/run_hotspot_audit.py --base-ref <ref>`
- 대표 산출:
  - 수동 실행은 `output/hotspot-audit/latest.{md,json}`
  - 구조/CI의 `--check` 실행은 tracked artifact를 다시 쓰지 않고 콘솔 판정만 출력
  - 변경 파일별 LOC, category, warning/failure 여부
  - warning budget 매칭 여부
  - frontend/desktop/models 단위 LOC context

### 3.5 통합 감사

- 명령: `cd g5-admin && bun run audit:integrated`
- 목적: PHP 공급자와 Rust 소비자를 함께 검증
- 대표 입력:
  - OpenAPI path/request/response 변화
  - `/admin/schema` label/default/option/required 의미 변화
  - auth/error/meta envelope 변화
  - `specs/integration/ACTIVE_CONSUMER_SCOPE.json`
- 대표 산출:
  - generated integrated report

### 3.5.1 API 파이프라인 무누락 감사

- 정적 명령: `cd g5-admin && bun run audit:api-pipeline:static`
- 최종 인증 명령: `cd g5-admin && bun run audit:api-pipeline`
- 목적: operation 개수 비교를 넘어 PHP route부터 Tauri UI의 field 저장·재조회까지 모든 활성 소비 연결을 fail-closed로 검증
- 완료 조건: exact `189/189`, 모든 17-domain adapter, command/client/operation 및 frontend invoke edge 완전 해석, 실제 runtime route table, real API save/readback/rollback, multisite concurrency, live provider identity 통과, blocked/skipped/stale/zero 없음
- 실행 공통부는 `scripts/audit_harness`가 소유합니다. aggregate CLI가 subprocess·timeout·blocked·민감값 마스킹·출력 tail 의미를 독자 구현하지 않습니다.
- live provider 동일성은 `scripts/check_live_provider_identity.py`, 실제 mutation은 `g5-admin-api-client/examples/live_config_roundtrip.rs`가 담당합니다. mutation attempt 뒤 응답 검증이 실패해도 baseline 원복을 반드시 시도하고, current-run artifact의 readback/rollback boolean과 run id를 aggregate가 다시 검증합니다.
- `cd g5-admin && bun run audit:harness`는 Python 하네스 전체 회귀와 공통 패키지 Ruff/Mypy를 실행합니다. 전체 로컬 CI는 quality를 먼저 실행하고, API 파이프라인 내부의 mutation 회귀 suite는 중복 호출하지 않습니다.
- Python은 교차 orchestration·산출물·보고를, PHP/Rust/TypeScript는 각 언어의 AST·runtime·UI 의미 검증을 소유합니다. Shell은 짧은 환경·호환 wrapper로 제한합니다.

### 3.6 코드-문서 정합성 감사

- 명령: 현재는 운영 체크리스트 기반 수기 감사
- 목적: 코드와 정본 문서가 서로 앞서가거나 뒤처지는 드리프트를 정기적으로 탐지
- 대표 입력:
  - active 정본 문서
  - 최근 구조/계약/구현 변경
  - blocked/waiver/warning budget registry
- 대표 산출:
  - 코드가 먼저 갔는데 문서가 안 바뀐 항목
  - 문서는 완료인데 코드가 아직 안 된 항목
  - 폐기된 전략이 active 문서에 남은 항목

## 4. 실행 매트릭스

| 변경 유형 | 필수 감사 | 조건부 감사 |
|------|------|------|
| 문서·워크플로·문서 정책 변경 | 문서 감사 | 구조 감사(거버넌스 규칙 자체가 바뀐 경우) |
| 화면/폼 구현 변경 | 구현 감사 | 소비 계약 감사 |
| DTO / 타입 / apiTarget / schema 소비 의미 변경 | 소비 계약 감사 | 통합 감사 |
| AppState / db / api_client / commands / registry / crate 경계 변경 | 구조 감사 | 구현 감사 |
| 변경분에서 god file / giant registry 후보를 먼저 triage할 때 | 변경분 hotspot 감사 | 구조 감사 |
| PHP 계약 의미 변경과 함께 움직이는 작업 | 통합 감사 | 소비 계약 감사 |
| route/OpenAPI/DTO/Tauri/UI 소비 파이프라인 변경 또는 1차 전수 인증 | API 파이프라인 무누락 감사 | deep 감사 |
| route-native domain 문서/스모크 기준 변경 | 구조 감사 | 문서 거버넌스 검사 |
| 문서·워크플로·감사 기준 변경 | 문서 감사 | 구조 감사(빠른 거버넌스 gate) |
| 큰 기능 완료 후 / 릴리즈 전 / 월 1회 운영 점검 | deep 감사 + 문서 감사 + 코드-문서 정합성 감사 | 통합 감사 |

## 5. 실패 의미

### 5.1 Failure

- merge/완료를 막는 위반입니다.
- 예:
  - contract drift
  - `commands -> concrete infra import`
  - transaction boundary 위반
  - models crate purity 위반
  - monitored feature의 direct cross-feature import 위반
  - `shared/components/lib/api`의 business feature import
  - source-of-truth ownership 충돌
  - registry alignment 누락/예상 밖 IPC 노출

### 5.2 Warning

- 지금 당장 차단하지는 않지만, 다음 구조 개선 우선순위가 되는 항목입니다.
- 예:
  - service ownership hotspot
  - root orchestrator growth
  - giant registry/orchestrator 우선순위
  - `core::ports` concrete impl 잔존 budget
  - `app_state/*service.rs` wrapper coupling budget
  - provider blocker가 있는 소비자 warning
- warning은 방치 가능한 메모가 아니라 owner와 만료일이 있는 운영 객체입니다. active warning은 `specs/audits/WARNING_BUDGETS.toml`에 등록돼야 하며, budget이 없는 active warning은 구조 감사 실패로 취급합니다.

### 5.3 Note

- 참고 정보입니다.
- 예:
  - placeholder crate
  - known gap
  - archived surface

## 6. Waiver registry

- 파일: `specs/audits/WAIVERS.toml`
- 목적: 허용된 구조 부채/감사 예외를 **문서와 실행 결과에 같이 남기기 위해서** 사용합니다.
- 규칙:
  - waiver는 자유 텍스트 메모가 아니라 machine-readable registry로만 남깁니다.
  - 필수 필드: `id`, `audit`, `severity`, `rule`, `path`, `owner`, `reason`, `introduced_on`, `expires_on`, `removal_criteria`
  - active waiver만 registry에 둡니다.
  - 만료된 waiver는 failure입니다.
  - 현재 finding과 매칭되지 않는 stale waiver는 warning입니다.
  - waiver가 있어도 finding은 사라지지 않고 `waived` 섹션에 남아야 합니다.
- 구조 감사 기준:
  - `scripts/check_active_crate_boundaries.py`는 waiver를 적용하되 `waived` 섹션을 반드시 출력합니다.
  - `scripts/check_audit_waivers.py`는 registry 형식, 중복, 만료, orphan waiver를 검증합니다.

## 6.1 Warning budget registry

- 파일: `specs/audits/WARNING_BUDGETS.toml`
- 목적: active warning을 `owner / 기한 / 제거 기준`이 있는 운영 객체로 강제합니다.
- 규칙:
  - active structure warning은 budget registry에 등록되거나 즉시 제거돼야 합니다.
  - 필수 필드: `id`, `audit`, `rule`, `path`, `owner`, `reason`, `introduced_on`, `expires_on`, `removal_criteria`
  - 만료된 budget은 failure입니다.
  - 현재 active warning과 매칭되지 않는 stale budget은 warning입니다.
  - waiver가 적용된 warning은 budget 대상에서 제외할 수 있습니다.
- 구조 감사 기준:
  - `scripts/check_warning_budgets.py`는 active warning과 budget registry를 대조해 missing budget / stale budget / expired budget을 검증합니다.
  - `scripts/run_structure_audit.sh`는 waiver registry 뒤에 warning budget registry를 상설 실행합니다.

## 7. 표준 감사 보고 형식

- 수기 감사 보고서는 `specs/foundation/AUDIT_REPORT_TEMPLATE.md`를 기준으로 작성합니다.
- generated report와 CI step summary도 같은 naming을 사용합니다.
- 최소 포함 항목:
  - 메타데이터
  - 입력과 범위
  - 전체 판정
  - `Failure / Warning / Note / Evidence`
  - 적용된 waiver
  - 다음 액션
  - 검증 기록
- generated integrated report가 있는 감사는 generated output을 먼저 인용하고, 수기 보고서는 해석과 후속만 덧붙입니다.
- 구조 감사와 통합 감사의 CI summary도 `Failure / Warning / Note / Evidence`를 같은 제목으로 출력해야 합니다.
- 구조 감사처럼 waiver가 존재할 수 있는 경우에는 `Waived`를 별도 섹션으로 추가합니다.
- 통합 감사의 path/schema/operation parity는 Rust 활성 소비 범위 기준으로 판정해야 하며, provider-only backlog는 `specs/integration/ACTIVE_CONSUMER_SCOPE.json` registry를 통해 failure가 아니라 handoff로 내려야 합니다.

## 7.1 Blocked backlog registry

- 파일: `specs/audits/BLOCKERS.toml`
- 목적: rust-only 범위에서 진행할 수 없는 provider/ownership blocker를 TODO `Blocked`, handoff 문서, generated artifact와 함께 machine-readable 상태로 유지합니다.
- 규칙:
  - `Blocked` 상태는 자유 텍스트 메모만으로 남기지 않습니다.
  - provider blocker가 생기면 `TODO.md`, `BLOCKERS.toml`, handoff 문서, generated artifact가 같이 갱신돼야 합니다.
  - `scripts/check_blocker_registry.py`는 `TODO`의 `Blocked` 항목, registry entry, generated blocker artifact 정합성을 같이 검증합니다.
  - registry에 없는 `Blocked` 항목이나, `TODO`에서 빠졌는데 남아 있는 stale blocker entry는 failure입니다.

## 8. 필수 산출물

### 8.1 항상 남겨야 하는 것

- `specs/TODO.md`: 다음 액션 또는 완료 전이
- `specs/HISTORY.md`: Why 중심 영구 이력
- `.cache/docs/docs.db`: 문서 감사가 재생성하는 Git 제외 로컬 검색 인덱스
- 문서 정책 변경 시 `specs/DOCUMENT_SYSTEM.md`와 관련 foundation 정책 문서

### 8.2 필요할 때 남겨야 하는 것

- `specs/audits/*.md`: 수기 감사 보고서
- `specs/audits/*BLOCKERS*.md`: rust-only 범위에서 진행 불가한 provider blocker handoff가 있을 때
- `specs/audits/BLOCKERS.toml`: active blocked backlog가 있을 때
- `specs/audits/WAIVERS.toml`: 허용된 예외가 있을 때
- `output/integrated-audit/latest.{json,md}`: 통합 감사 결과
- `output/api-pipeline-audit/latest.{json,md}`: API 파이프라인 전 구간 현재 실행 증적
- `output/form-metadata-blockers/latest.{json,md}`: provider blocker handoff generated artifact

## 9. 실행 진입점

### 9.1 사람/Codex 진입점

- 1차 진입점:
  - `AGENTS.md`
  - `specs/AUDIT_SYSTEM.md`

### 9.2 명령 진입점

- `g5-admin/package.json`의 `audit:*`
- `scripts/run_document_audit.sh`
- `scripts/run_structure_audit.sh`
- `scripts/run_*_audit.sh`
- `scripts/run_integrated_audit.py`
- `scripts/run_api_pipeline_audit.py`
- `scripts/check_live_provider_identity.py`
- `g5-admin-api-client/examples/live_config_roundtrip.rs`
- `scripts/check_audit_waivers.py`
- `scripts/check_warning_budgets.py`
- `scripts/check_blocker_registry.py`
- `scripts/check_domain_coverage.py`
- `scripts/check_form_metadata_coverage.py`
- `scripts/generate_form_metadata_blocker_report.py`
- `scripts/check_form_save_smoke_coverage.py`
- `specs/foundation/FORM_METADATA_ROLLOUT_PLAN.md`
- `specs/foundation/FORM_SAVE_SMOKE_ROLLOUT_PLAN.md`

### 9.3 로컬 CI와 hosted 진입점

- routine push: scoped `.githooks/pre-push`
- 전체 정적 검증: `cd g5-admin && bun run ci:local`
- Windows target 포함 릴리스 검증: `cd g5-admin && bun run ci:release-local`
- Git hook 설치: `cd g5-admin && bun run hooks:install`
- 자동 PR/main gate: `.github/workflows/contract.yml`, `docs.yml`, `structure.yml`
- 명시적 full fallback: `.github/workflows/integrated-php-rust-audit.yml`, `desktop-cross-platform.yml`

## 10. 정기 운영 루프

### 10.1 정기 구조 감사

아래를 정기적으로 본다.

- architecture audit
- domain audit
- dependency audit

권장 시점:

- 큰 기능 완료 후
- 릴리즈 전
- 월 1회

### 10.2 정기 문서 감사

아래를 정기적으로 본다.

- active 문서 메타데이터 확인
- status/drift 확인
- 정본 중복 확인
- archive/deprecated 정리

### 10.3 정기 코드-문서 정합성 감사

아래를 정기적으로 본다.

- 코드가 먼저 갔는데 정본 문서가 안 바뀐 것 찾기
- 문서는 완료인데 코드엔 아직 안 된 것 찾기
- 폐기된 전략이 active 문서에 남은 것 찾기

세부 기준은 [CODE_DOC_CONSISTENCY_AUDIT.md](/Users/neojins/workspace/gnuboard5/rust/specs/foundation/CODE_DOC_CONSISTENCY_AUDIT.md)를 따른다.
- 필요 시 계약/통합 감사 명령

## 10. 운영 원칙

1. 감사는 구현 뒤의 옵션이 아니라 완료의 일부입니다.
2. 경고와 실패를 섞지 않습니다.
3. 문서와 스크립트가 어긋나면 문서를 먼저 고칩니다.
4. workflow 문서는 설명서이지 별도 규칙 소스가 아닙니다.
5. 감사만 수행하는 턴에서는 코드를 고치지 않아도 됩니다.
6. 구조 개선은 감사 결과가 우선순위를 정한 범위만 수행합니다.
7. 억지 분리, 숫자 맞추기, 근거 없는 구조 변경은 감사 개선으로 보지 않습니다.
8. 허용된 예외는 회의나 채팅이 아니라 `WAIVERS.toml`로만 기록합니다.
9. 소비자 warning이 provider blocker로 판정되면 `TODO.md`의 `Blocked`와 별도 blocker handoff 보고서에 같이 남깁니다.
10. `Blocked` backlog는 수기 메모가 아니라 `BLOCKERS.toml`과 generated artifact로도 추적돼야 합니다.

## 11. 현재 감사 체계의 핵심 질문

- bounded context가 유지되는가
- Rust가 PHP 계약을 정확히 소비하는가
- 데이터 소유권이 명확한가
- legacy가 quarantine 밖으로 새지 않는가
- 서비스와 포트가 concrete adapter 하수구로 변질되지 않는가
- 문서와 코드, 문서와 스크립트, 문서와 CI가 같은 규칙을 말하는가
