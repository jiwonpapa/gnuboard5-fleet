---
doc_type: index
status: active
owner: rust-admin
source_of_truth: true
canonical_for: documentation index
ai_default_include: true
last_reviewed: 2026-07-13
review_cycle_days: 30
bounded_context: global
---
# G5 Rust Workspace — 설계 문서

## 프로젝트

| 프로젝트 | 설명 | 상태 |
|----------|------|------|
| `g5-admin` | `그누5어드민` 앱 (Desktop & Mobile) | 🟡 route-native 관리자 도메인 + 멀티사이트 완료 / 구조 안정화 및 도메인 확장 정렬 단계 |

## 문서 구조

- `DOCUMENT_SYSTEM.md` — 문서 운영 SSOT
- `IMPLEMENTATION_ROADMAP.md` — 구현 로드맵
- `TODO.md` — 현재 할 일
- `HISTORY.md` — 변경 이력 (Why 중심)

## Canonical SSOT

- 로드맵 SSOT: `specs/IMPLEMENTATION_ROADMAP.md`
- 작업 상태 SSOT: `specs/TODO.md`
- 완료 이력 SSOT: `specs/HISTORY.md`
- 감사 운영 SSOT: `specs/AUDIT_SYSTEM.md`
- 감사 전략 문서: `specs/AUDIT_STRATEGY.md`
- 문서 운영 SSOT: `specs/DOCUMENT_SYSTEM.md`
- 도메인 경계 규율 지원 문서: `specs/foundation/DOMAIN_BOUNDARY_ENFORCEMENT.md`
- 감사 예외 registry: `specs/audits/WAIVERS.toml`
- blocker registry: `specs/audits/BLOCKERS.toml`
- 도메인 경계 registry: `specs/audits/DOMAIN_BOUNDARY_RULES.toml`
- 감사 보고 템플릿: `specs/foundation/AUDIT_REPORT_TEMPLATE.md`
- 문서 인덱스: `specs/README.md`
- 통합 감사 SSOT: `scripts/run_integrated_audit.py`, `specs/integration/INTEGRATED_AUDIT_STANDARD.md`
- API 파이프라인 감사 SSOT: `specs/AUDIT_SYSTEM.md`, `specs/integration/ACTIVE_CONSUMER_SCOPE.json`, `scripts/run_api_pipeline_audit.py`
- 활성 소비 범위 registry: `specs/integration/ACTIVE_CONSUMER_SCOPE.json`
- provider domain ↔ rust feature mapping: `specs/integration/PROVIDER_DOMAIN_TO_RUST_FEATURE_MAP.md`
- routine 통합 감사 기준은 `php + rust` 2자이며, 보관 상태인 `flutter`, `web`는 기본 감사 범위에서 제외한다.

## 참조

- **Codex wrapper**: `AGENTS.md`
- **감사 운영 SSOT**: `specs/AUDIT_SYSTEM.md`
- **문서 운영 SSOT**: `specs/DOCUMENT_SYSTEM.md`
- **문서 감사 명령**: `bash scripts/run_document_audit.sh`
- **문서 감사 호환 alias**: `cd g5-admin && bun run audit:docs`
- **문서 위생 감사 명령**: `python3 scripts/check_document_hygiene.py`
- **코드-문서 정합성 기준**: `specs/foundation/CODE_DOC_CONSISTENCY_AUDIT.md`
- **감사 예외 registry**: `specs/audits/WAIVERS.toml`
- **blocker registry**: `specs/audits/BLOCKERS.toml`
- **감사 보고 템플릿**: `specs/foundation/AUDIT_REPORT_TEMPLATE.md`
- **감사 전략**: `specs/AUDIT_STRATEGY.md`
- **문서 메타데이터 스키마**: `specs/foundation/DOCUMENT_METADATA_SCHEMA.md`
- **문서 생애주기 정책**: `specs/foundation/DOCUMENT_LIFECYCLE_POLICY.md`
- **문서 감사 2차 범위**: `.agent/sub-constitutions/*.md`, `.agent/workflows/*.md`, `specs/*.md`, `specs/foundation/*.md`, `specs/domains/*.md`, `specs/integration/*.md`, `specs/audits/README.md`
- **Codex 기록 문서 기준**: `specs/codex/*.md`는 메타데이터 관리 대상이지만, 날짜형 prompt/report는 기본적으로 `archived + ai_default_include:false`를 유지한다
- **문서 감사 2차 실패 기준**: active-scope 메타데이터 누락, review cycle stale, `canonical_for` 중복, archive/status drift
- **문서 위생 감사 기준**: expired dated audit, active entrypoint coverage drift, inactive 문서 재참조, `source_of_truth:false` 문서의 self-claimed SSOT
- **헌법**: `.agent/Constitution.md` (v1.5.4)
- **구조 감사 워크플로우**: `.agent/workflows/architecture-audit.md`
- **API 계약 Canonical 통합 레포 원본**: `connectors/gnuboard5-php/api/docs/openapi.yaml`
- **API 계약 환경변수**: `G5_OPENAPI_PATH`
- **런타임 API 설정 파일**: `g5-admin/src-tauri/app-config.json`
- **런타임 API 설정 예시 파일**: `g5-admin/src-tauri/app-config.example.json`
- **개발용 일괄 초기화 설정**: `app-config.json`의 `devBootstrap` 블록은 개발모드에서만 사용하며, 마스터 잠금/첫 사이트/사이트 로그인/SSH 프로필 1개 이상을 한 번에 채우는 로컬 편의 경로다.
- **런타임 API 사용자 설정 파일 우선 경로(OS별 예시)**:
  - macOS: `~/Library/Application Support/g5-admin/app-config.json`
  - Windows: `%APPDATA%\\g5-admin\\app-config.json`, `%LOCALAPPDATA%\\g5-admin\\app-config.json`
  - Linux: `${XDG_CONFIG_HOME:-~/.config}/g5-admin/app-config.json`, `${XDG_DATA_HOME:-~/.local/share}/g5-admin/app-config.json`
- **런타임 API override 환경변수**: `G5_API_BASE_URL`
- **런타임 설정 파일 override 환경변수**: `G5_APP_CONFIG_PATH`
- **디버그 오버레이 환경변수**: `G5_DEBUG_OVERLAY`
- **세션 저장소 환경변수**: `G5_SESSION_STORAGE`, `G5_SESSION_STORE_PATH`
- **로컬 로그 디렉터리 override 환경변수**: `G5_LOG_DIR`
- **응답 추적 기준**: `request_id(=correlation_id)`, `server_request_id`, `owner`, `fault_domain`, `retryable`
- **현재 관리자 IA 기준**: 앱 시작 -> 단일 컬럼 히어로 + 보안 저장소 안내 카드 -> 사용자가 `계속`을 눌렀을 때만 OS secure storage 접근 -> `/master/setup` 또는 `/master/unlock` -> 잠금 해제 후 활성/default 사이트 판정 -> 사이트 0개면 `/sites/onboarding`, 활성 사이트 세션이 있으면 `/sites/:siteId/overview`, 단일 사이트 미로그인이면 `/sites/:siteId/login`, 다중 사이트 미로그인이면 `/sites/dashboard` -> 사이트 세션 활성화 -> 사이트 로그인 -> `/sites/:siteId/overview` 작업 홈 -> 상단 작업 탭(`사이트관리`, 고정 최상위 메뉴, 열린 사이트 탭 + 더보기) -> 좌측 서브메뉴 -> 중앙 작업면
- **로그인 전 절차 화면 기준**: secure storage gate, 마스터 잠금 설정/해제, 첫 사이트 등록, 사이트 로그인 화면은 모두 `단일 컬럼 entry screen`을 사용하며, 로그인 전에는 표시 설정 툴바/상단 작업 탭을 노출하지 않는다.
- **로컬 보호 기준**: 마스터 잠금은 기본 15분 idle 시 자동으로 다시 잠기고, `/app/security`에서 `5/15/30/60분/사용 안 함`으로 조정할 수 있다. `/sites/dashboard` 및 보호된 작업면에서는 수동 `앱 잠금`도 제공한다. 잠금 해제는 5회 연속 실패 시 5분 동안 차단되고, 이후 실패마다 차단 시간이 5분씩 늘어나며 잠금 중에는 비밀번호 입력과 버튼을 모두 비활성화한다.
- **보안 저장소 UX 기준**: 현재 canonical local runtime은 OS keychain을 기본 저장소로 사용하지 않는다. DB 암호화 키는 로컬 `.db-master-key`, JWT 세션은 로컬 `sessions/site-*.json`, SSH 비밀번호·SSH key passphrase·TOTP secret은 SQLCipher DB `app_settings`에 저장한다. OS secure storage prompt는 선택형 빠른 잠금 해제(biometry)처럼 사용자가 명시적으로 켠 기능에서만 허용된다.
- **secure storage prompt 횟수 기준**: startup에서 사이트 카탈로그/로그인 진입 판정을 위해 OS secure storage prompt가 뜨면 SSOT 위반이다. 기본 local runtime에서는 prompt가 0회여야 하며, biometry 같은 선택 기능에서만 사용자 액션 이후 prompt가 발생할 수 있다.
- **세션 조회 지연 기준**: 사이트 목록/온보딩/로그인 진입 판정은 로컬 DB의 `site_runtime_state` 세션 힌트만 사용하고, JWT 세션 파일 조회는 해당 사이트가 `authenticated` 상태로 표시된 뒤 실제 세션 정보나 API 호출이 필요한 시점에만 수행한다. startup에서 세션 파일/secure storage를 중복 조회해 부팅이 흔들리면 SSOT가 아니다.
- **fast deploy 저장소 기준**: local ad-hoc/unsigned `deploy:desktop:fast`는 OS 사용자 설정 파일에 `sessionStorage=file`, `dbMasterStorage=file`을 유지한다. 개발/테스트에서는 재배포 후에도 기존 사이트/SSH 데이터를 다시 입력하게 만들면 안 되며, 별도 지시 없이는 저장된 로컬 데이터를 그대로 이어받아야 한다.
- **dev bootstrap 기준**: `debugOverlay=true`이고 프런트 개발모드가 켜져 있을 때만 entry screen에서 `개발 기본값 한 번에 채우기`를 노출한다. 이 동선은 `app-config.json`의 `devBootstrap.masterPassword`, `devBootstrap.site`, `devBootstrap.siteAuth`, `devBootstrap.sshProfiles[]`를 읽어 로컬 DB에 사이트/세션/SSH 정보를 idempotent upsert 한다.
- **사이트 연결 테스트 기준**: 사이트 등록/수정의 health check는 `/api/v1` 경계를 우선 확인하고, 연결/권한/방화벽 같은 transport error는 최대 15초 동안 750ms 간격으로 재시도한다. 이 동안 UI는 spinner와 `운영체제가 네트워크 접근이나 방화벽 허용을 묻는 경우 먼저 승인` 안내를 유지하고, root 주소만 응답할 때만 `/api/v1` 경계 미확인 오류를 반환한다.
- **백업 기준**: `/sites/dashboard`에서 `sites + site_settings`만 포함한 `휴대용 암호화 백업(.g5bak)` export/import를 지원한다. 이 파일은 사용자가 지정한 `백업 암호`로 암호화되며, JWT 세션·빠른 잠금 해제 secret·장치 결합 보안 저장소 정보는 포함하지 않는다. 기존 `.db` SQLCipher 스냅샷 import는 같은 장치/같은 로컬 키 기반의 레거시 호환 경로로만 유지한다.
- **멀티사이트 기준**: 사이트 이름/API URL/JWT 세션/로컬 활동 로그는 사이트별로 분리 저장하며, 라우트는 `/sites/:siteId/*` scope를 기본으로 사용한다. 첫 사이트는 사용자가 직접 입력해야 하며, bundled/default `apiBaseUrl`은 자동 승격도, 추천 URL 노출도 하지 않는다.
- **멀티사이트 내비게이션 기준**: canonical UX는 `상단 작업 탭(고정 최상위 + 열린 사이트 + 더보기) + 좌측 scoped 서브메뉴 + 중앙 작업면`이다. 등록 사이트 전체를 좌측에 고정 노출하지 않으며, 활성 사이트 전환은 상단 탭과 overflow에서 처리한다.
- **관리자 디자인 기준**: canonical visual language는 `admin template 계열의 앱형 작업면`이다. 상단 작업 탭 + 좌측 서브메뉴 + 중앙 작업면을 기본 구조로 삼고, 큰 radius·과한 shadow·과한 여백·마케팅형 hero는 금지한다. `/overview`만 제한적으로 안내형 hero를 허용하며, 나머지 작업면은 compact header와 dense card rhythm을 유지한다. 세부 기준은 `specs/foundation/ADMIN_UI_STYLE_GUIDE.md`를 따른다.
- **관리자 표면 색 기준**: 전체 앱 배경은 `#efefef` 계열 neutral surface를 유지하고, 카드/폼/작업 박스는 흰색 표면으로 통일한다.
- **관리자 폼 기준**: 필수 여부, widget 종류, 기본값, 옵션 목록, 필드 설명의 canonical source는 PHP REST `/admin/schema/*` 메타데이터다. Rust는 이를 우선 소비하고, fallback/hardcode는 임시 호환일 때만 허용한다. 회귀 전략은 `specs/foundation/ADMIN_FORM_REGRESSION_STRATEGY.md`를 따른다.
- **기능 지원 노출 기준**: 빠른 잠금 해제처럼 OS/장치 의존 기능은 지원되지 않는 기기에서 기본 화면에 비활성 상태로 남발하지 않는다. 일반 모드에서는 숨기고, 개발모드에서만 진단 정보를 노출한다.
- **인증 분리 기준**: 로컬 마스터 비밀번호/빠른 잠금 해제(Touch ID / Windows Hello)는 앱 잠금 해제 전용이며 PHP 사이트 관리자 로그인과 분리한다. 현재 구현된 선택형 2차 인증은 Google OTP(TOTP)이며, 비활성 상태가 기본값이다. 사이트 관리자 비밀번호 검증은 PHP API가 G5 레거시 규칙(`check_password()` 호환, `G5_STRING_ENCRYPT_FUNCTION`)대로 계속 책임진다.
- **민감 작업 재인증 기준**: `백업 export/import`, `전체 사이트 삭제`, `마스터 비밀번호 변경`, `자동 잠금 시간 변경`, `Google OTP 비활성화`는 현재 마스터 비밀번호 재입력을 요구하며, Google OTP가 활성화된 경우 현재 OTP 코드도 함께 확인한다.
- **생체인증 기준**: 현재 데스크톱 앱 내 빠른 잠금 해제는 `tauri-plugin-biometry v0.2.6`으로 구현하며, macOS는 Touch ID, Windows는 Windows Hello(PIN 포함)를 1차 인증 대체 경로로 사용한다. OS biometry secure storage에는 랜덤 fast-unlock secret만 저장하고, 로컬 SQLCipher DB에는 그 Argon2 verifier만 남긴다. 
  - *모바일 확장에 대하여:* 모바일(Android/iOS) 환경에서는 타겟 전용인 공식 `tauri-plugin-biometric` (v2.3.2+) 등의 도입을 상정하며, 데스크톱 관련 코드는 모바일 빌드시 에러가 나지 않도록 `cfg` 조건부 컴파일로 보호한다.
- **레거시 설정 반영 기준**: `config.php`와 각종 G5 상수는 Rust 앱이 직접 읽지 않는다. PHP API가 설치/운영 시 `.env`와 `EnvConfig`에 레거시 값을 반영해 사용하고, Rust는 그 결과 계약만 소비한다.
- **브랜드/번들 기준**: 데스크톱/모바일 관리자 앱의 사용자 노출 이름은 `그누5어드민`으로 고정한다.
- **현재 관리자 canonical route 기준**: `/overview`, `/app/security`, `/environment/basic-config`, `/environment/auth`, `/environment/theme`, `/environment/menus`, `/environment/mail-test`, `/environment/popups`, `/environment/maintenance/session-files`, `/environment/maintenance/cache-files`, `/environment/maintenance/captcha-files`, `/environment/maintenance/thumbnail-files`, `/environment/maintenance/member-list-files`, `/environment/phpinfo`, `/environment/browscap`, `/environment/visit-log-convert`, `/environment/db-upgrade`, `/environment/services`, `/members/manage`, `/members/manage/:mbId`, `/members/files`, `/members/mails`, `/members/points`, `/members/visits/stats`, `/members/visits/search`, `/members/visits/delete`, `/members/polls`, `/boards/manage`, `/boards/groups`, `/boards/popular`, `/boards/popular/rank`, `/boards/qa-config`, `/boards/contents`, `/boards/faqs`, `/boards/write-count`, `/sms/config`, `/sms/member-sync`, `/sms/messages`, `/sms/history/batches`, `/sms/history/deliveries`, `/sms/template-groups`, `/sms/templates`, `/sms/contact-groups`, `/sms/contacts`, `/sms/contact-files`
- **검색/직접진입 전용 hidden route 기준**: `/app/security`, `/tools/layouts`, `/tools/reports`, `/tools/push`
- **레거시 alias route 기준**: `/settings/general`, `/permissions`, `/members`, `/members/:mbId`, `/boards`, `/settings/qa`, `/settings/sms`, `/operations/polls`, `/operations/popups` 는 canonical route로 redirect만 유지한다.
- **로그인/소개 기준**: 로그인 화면과 `/overview` 소개 화면은 큰 빈 히어로가 아니라 메뉴 구조와 작업면 개념을 바로 읽을 수 있는 인포그래픽형 안내 레이아웃을 사용한다.
- **스크롤 기준**: 관리자 셸은 컨텐츠 영역 내부 스크롤을 두지 않고 앱 viewport 기준 단일 세로 스크롤로 동작한다.
- **헤더 기준**: 상단 메뉴는 sticky 네비게이션으로 유지하되 `down 100px` 이상 누적 시 슬라이드 업으로 숨고, `up 20px` 이상 누적 시 다시 슬라이드 다운으로 복귀한다.
- **표시 설정 기준**: 상단 표시 툴바에서 `T- / T+ / 테마 토글`을 제공하고 글자 크기 단계와 테마 모드는 로컬에 기억한다. 툴바에서는 현재 해석된 라이트/다크 상태를 한 개 버튼으로 토글하고, 내부 테마 모델은 계속 `light / dark / system`을 유지한다.
- **개발모드 기준**: 상단 표시 툴바의 `개발` 토글은 로컬에 기억되며, `request_id/correlation_id/server_request_id`, Debug Dock, 구현상태 배지, 감사성 설명/로그 같은 진단 UI는 개발모드가 켜졌을 때만 노출한다.
- **테마 기준**: 테마는 `light / dark / OS auto` 3모드를 제공하고, `system` 선택 시 현재 OS `prefers-color-scheme`를 따라간다. 현재 선택과 해석된 실제 테마(`resolvedTheme`)는 루트 dataset과 로컬 저장소에 함께 반영한다.
- **표면 색 기준**: 셸/로그인/소개/도메인 화면 표면은 `background/card/sidebar/muted/primary` 토큰만 사용하고, 임의 hex 배경색으로 OS/디자인 시스템 톤을 덮어쓰지 않는다.
- **상단 컨트롤 기준**: 우측 검색, 표시 설정, 사용자 카드, 로그아웃은 동일 높이와 표면 톤을 쓰고, `새로고침`은 독립 버튼이 아니라 표시 툴바 내부 액션으로 제공한다.
- **Debug Dock 기준**: 접힘 상태는 항상 `w-fit` 좌측 하단 아이콘 트레이로 시작하고, 사용자가 열었을 때만 하단 전폭 상세 패널로 확장된다.
- **우클릭 메뉴 기준**: 우클릭은 브라우저형 컨텍스트 메뉴를 사용하며, 입력/편집 가능 요소에서는 `잘라내기/복사/붙여넣기/전체 선택`을 제공하고, `화면 클립보드로 캡처`와 `화면 캡처 저장`은 개발모드에서만 노출한다.
- **화면 캡처 기준**: 화면 캡처 저장은 즉시 다운로드가 아니라 저장 위치 선택 다이얼로그를 먼저 띄우고, 클립보드 캡처는 PNG 이미지를 시스템 클립보드에 바로 기록한다. 캡처 clone 단계에서는 `oklch/oklab/lch/lab` 색 함수를 `rgb/rgba`로 정규화한 뒤 `html2canvas`에 넘겨 색 파서 회귀를 막는다.
- **로컬 배포 기준**: UI/로직 확인용 재설치는 `bun run deploy:desktop:fast`를 우선 사용하고, 번들 메타데이터/아이콘/리소스 변경이나 최종 검증 시에만 `bun run tauri build --bundles app` 또는 `bun run deploy:desktop`을 사용한다. macOS 구 명령 `deploy:mac*`는 호환 alias로만 유지한다.
- **배포 신뢰 기준**: `deploy:desktop*`는 배포 직후 현재 OS 기준 서명/신뢰 상태를 자동으로 보고해야 한다. macOS fast deploy는 바이너리 교체 뒤 번들 내부 서명이 깨지지 않도록 ad-hoc 재서명까지 수행하고, 실제 배포 신뢰 판단은 이 보고와 플랫폼별 정식 서명 구성 여부를 함께 본다.
- **테이블 기준**: route-native 관리자 리스트는 공통 `AdminDataTable`를 통해 `@tanstack/react-table` 기반으로 렌더링한다.
- **작업면 밀도 기준**: route-native 관리자 작업면은 compact admin template 톤을 유지한다. 기본 font scale은 이전보다 한 단계 줄이고, 카드/테이블/검색 bar/상태 타일은 `rounded-sm + 낮은 shadow + 촘촘한 행 높이`를 기본으로 사용한다. 현재 1차 densify 대상은 `환경설정`, `회원관리`, `게시판관리`, `SMS 연락처 관리`다.
- **폼 기준**: route-native 관리자 도메인 폼은 `react-hook-form + zod + 공통 RHF field wrapper` 기준으로만 구현하고, 수동 `useState + onChange` 조합으로 회귀하지 않는다.
- **입력 UI 기준**: 텍스트/텍스트에어리어 입력은 `shadcn` `InputGroup` 기반 공용 wrapper를 우선 사용하고, 수정 불가 값은 일반 텍스트 카드가 아니라 `읽기 전용` 표식이 붙은 필드 컴포넌트로만 노출한다.
- **페이지 헤더 기준**: `/overview`만 안내형 `hero` 헤더를 허용하고, 나머지 route-native 관리자 페이지는 compact 헤더를 기본으로 사용한다. 수정 workspace 안에는 같은 정보를 다시 보여주는 요약 grid를 두지 않는다.
- **삭제 UX 기준**: destructive action은 브라우저 기본 confirm이 아니라 `ConfirmActionDialog`를 사용한다.
- **페이지 분할 기준**: route-native 관리자 페이지는 `page + hook + workspace`로 나눠 300줄 기준을 넘기지 않는다.
- **레거시 제거 기준**: `LegacyDomainBridge`, `features/dashboard/*`, `App.css` 같은 구 대시보드 경로는 유지하지 않는다.
- **TS 타입 export 기준**: `ts-rs`가 생성하는 프론트 바인딩은 `g5-admin/src/types` 단일 경로만 사용한다.
- **번들 기준**: Vite output은 `react-core`, `tanstack`, `ui-vendor`, `vendor` 청크 분할을 유지해 대형 단일 청크를 피한다.

## API 계약 SSOT

- 이 프로젝트가 참조하는 G5 REST API 계약 원본은 `openapi.yaml`이다.
- 기본 참조 파일은 통합 레포 `connectors/gnuboard5-php/api/docs/openapi.yaml`이다.
- 자동화, 스크립트, 테스트는 `G5_OPENAPI_PATH`, `G5_PHP_ROOT`, fleet connector, legacy sibling 순서로 해석한다.
- 명시 환경변수가 비었거나 존재하지 않는 파일을 가리키면 legacy 경로로 우회하지 않고 실패한다.
- Swagger UI 페이지는 사람이 보는 탐색 화면일 뿐, 구현/타입 동기화/검증의 권위 원본이 아니다.

## 런타임 API 설정 우선순위

- `G5_API_BASE_URL`
- `G5_APP_CONFIG_PATH`가 가리키는 외부 설정 파일
- OS 사용자 설정 파일
  - macOS 예시: `~/Library/Application Support/g5-admin/app-config.json`
  - Windows 예시: `%APPDATA%\\g5-admin\\app-config.json`, `%LOCALAPPDATA%\\g5-admin\\app-config.json`
  - Linux 예시: `${XDG_CONFIG_HOME:-~/.config}/g5-admin/app-config.json`, `${XDG_DATA_HOME:-~/.local/share}/g5-admin/app-config.json`
- 번들/워크스페이스 기본 설정 파일 `g5-admin/src-tauri/app-config.json`

```bash
export G5_PHP_ROOT="/path/to/gnuboard5-php"
export G5_OPENAPI_PATH="${G5_PHP_ROOT}/api/docs/openapi.yaml"
```

## 개발 시작용 지원 문서

- `specs/foundation/README.md`
- `specs/foundation/FOUNDATION_SDD.md`
- `specs/foundation/DEV_BOOTSTRAP_CHECKLIST.md`
- `specs/foundation/REST_API_CLIENT_STANDARD.md`
- `specs/foundation/TASK_ORDER_EXECUTION.md`
- `specs/foundation/APP_CORE_BOUNDARY_PLAN.md`
- `specs/foundation/DOMAIN_BOUNDARY_ENFORCEMENT.md`
- `specs/foundation/AUTH_CORE_SDD.md`
- `specs/foundation/ADMIN_UI_STYLE_GUIDE.md`
- `specs/foundation/ADMIN_FORM_REGRESSION_STRATEGY.md`

이 문서들은 설계와 착수 게이트를 보조하는 지원 문서다.
실제 상태 변경은 `specs/TODO.md`만 기준으로 삼는다.

## UI 개발 기준

- UI registry 기준 파일: `g5-admin/components.json`
- `shadcn` init 기준 명령: `bunx --bun shadcn@latest init --template vite --base radix --preset nova --yes`
- `InputGroup` 기준 문서: `https://ui.shadcn.com/docs/components/radix/input-group`
- AI UI 작업 참조 1: `https://ui.shadcn.com/docs/skills`
- AI UI 작업 참조 2: `https://ui.shadcn.com/docs/mcp`
- AI UI 작업 참조 3: `https://ui.shadcn.com/llms.txt`

## 로컬 빌드 기준

- 빠른 웹 빌드: `bun run build:web:fast`
- 빠른 데스크톱 재컴파일: `bun run build:desktop:fast`
- 빠른 데스크톱 재설치: `bun run deploy:desktop:fast`
- 정식 번들 검증/배포: `bun run tauri build --bundles app`, `bun run deploy:desktop`
- macOS 호환 alias: `bun run deploy:mac`, `bun run deploy:mac:fast`
- Windows 타입 검증: `bun run check:windows-target`
- routine push 검증: `bun run hooks:install` 후 scoped `pre-push`
- 전체 로컬 검증: `bun run ci:local`
- Windows target 포함 릴리스 검증: `bun run ci:release-local`

`deploy:desktop:fast`는 현재 OS를 감지해 플랫폼별 빠른 설치 경로를 선택한다. macOS는 기존 `.app` 번들을 베이스로 새 `desktop-fast` 바이너리만 교체하고, Linux/Windows는 사용자 로컬 설치 경로에 native artifact를 배치한다.

## 통합 감사 기준

- Rust 구현 감사 진입점: `cd g5-admin && bun run audit:implementation`
- Rust 소비 계약 감사 진입점: `cd g5-admin && bun run audit:consumer`
- Rust 구조 감사 진입점: `cd g5-admin && bun run audit:structure`
- Rust full workspace deep 감사 진입점: `cd g5-admin && bun run audit:deep`
- PHP-Rust 통합 감사 실행: `python3 ./scripts/run_integrated_audit.py --rust-root .`
- Rust 진입점: `cd g5-admin && bun run audit:integrated`
- PHP 진입점: `composer --working-dir ../../connectors/gnuboard5-php run audit:integrated`
- 통합 레포 결과물: `../../output/integrated-audit/latest.json`, `../../output/integrated-audit/latest.md`
- provider-only scope handoff registry: `specs/integration/ACTIVE_CONSUMER_SCOPE.json`
- 수기 감사 문서는 참고용일 뿐이며, 최종 판정은 generated integrated audit report만 신뢰한다.
`check:windows-target`은 macOS에서 `cargo-xwin`과 로컬 OpenSSL 3 header/lib를 사용해 Windows MSVC Rust/Tauri 타입 정합성을 확인하되 Windows 리소스 번들을 만들지는 않는다. 실제 Windows `.exe/.msi` 번들은 반드시 로컬 Windows 호스트에서 생성한다.
아이콘, 번들 메타데이터, 번들 리소스가 바뀌면 반드시 정식 번들 빌드를 다시 실행한다. 공식 Windows 릴리스는 로컬 Windows 호스트에서 `.exe/.msi`를 생성하는 것을 기준으로 한다.

## 도메인 지원 문서

- `specs/domains/README.md`
- `specs/domains/ADMIN_CONFIG_SDD.md`
- `specs/domains/ADMIN_SMS_SDD.md`
- `specs/domains/ADMIN_BOARDS_SDD.md`
- `specs/domains/ADMIN_MEMBERS_SDD.md`
- `specs/domains/ADMIN_PERMISSIONS_SDD.md`
- `specs/domains/ADMIN_QA_CONFIG_SDD.md`
- `specs/domains/ADMIN_POLLS_SDD.md`
- `specs/domains/ADMIN_POPUPS_SDD.md`

도메인 문서는 OpenAPI 계약 해석, DTO/command 매핑, UI 정보구조를 보조한다.

## 감사 문서

- `specs/archive/audits/2026/2026-03-07-API_COVERAGE_AUDIT.md` — 2026-03-07 시점의 초기 Admin API 커버리지 감사 초안 아카이브.
- `specs/audits/2026-03-08-ADMIN_ENDPOINT_CONTRACT_AUDIT.md` — PHP OpenAPI, PHP 런타임, Rust/Tauri 관리자 구현 간 계약 정합성 전수 감사.
- `specs/audits/2026-03-08-ADMIN_ENDPOINT_REMEDIATION.md` — 2026-03-08 감사 지적에 대한 구현/문서/클라이언트 후속 조치와 검증 결과.
- `specs/audits/2026-03-08-FIELD_PARITY_AUDIT.md` — 레거시 `adm/` 폼 필드와 REST API parity 감사 및 2026-03-08 후속 조치 상태.
- `specs/audits/2026-03-08-RUST_PHP_PARITY_AUDIT.md` — Rust Tauri command / route-native 화면과 PHP OpenAPI admin endpoint 정합성 최신 상태.
- `specs/audits/2026-03-08-TDD_COVERAGE_AUDIT.md` — Rust/PHP 테스트 전수 결과, 크리티컬 커버리지 게이트, 회귀 방지 범위 정리.
- `specs/audits/2026-03-09-FIELD_METADATA_AUDIT.md` — 관리자 field metadata API(`/admin/schema`) 도입과 Rust 소비 상태 감사.
- `specs/audits/2026-03-09-MULTI_SITE_SELF_AUDIT.md` — 멀티사이트 SQLite 전환, 사이트 탭/온보딩/대시보드 범위와 남은 보안·PHP 의존 항목 정리.
- `specs/audits/2026-03-12-RUST_ARCHITECTURE_AUDIT.md` — 도메인 분리, SRP, DI, hardcoding, workspace/crate 경계, 문서 정합성 기준의 구조 감사와 단계별 개선 계획.
- `specs/audits/2026-03-13-FORM_METADATA_PROVIDER_BLOCKERS.md` — `/admin/schema` provider blocker 해소 완료와 PHP handoff 종료 증적.
- `specs/audits/BLOCKERS.toml` — active blocked backlog registry. `TODO Blocked`와 handoff/generated artifact 정합성의 machine-readable SSOT.
- `output/form-metadata-blockers/latest.{md,json}` — 최신 provider blocker handoff generated artifact.
