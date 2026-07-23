---
doc_type: constitution
status: active
owner: rust-admin
source_of_truth: true
canonical_for: project constitution
ai_default_include: true
last_reviewed: 2026-07-18
review_cycle_days: 30
bounded_context: global
---
# PROJECT CONSTITUTION v1.5.5 (G5 Admin Tauri Edition)

👑 **최상위 법** | 제정 2026-03-06 | 개정 2026-07-18 (v1.5.5 — 의존성 기준선 갱신) | **🇰🇷 사용자 보고는 반드시 한글로 작성**

---

## §0 대원칙

0. **언어**: 보고서/대화는 한글. 코드/변수/커밋 제목은 영어.
1. 테스트 없는 구현은 미완성.
2. 🔥 단순함 > 복잡함. 현재 필요한 것만 명확하게.
3. 🔥 안전 > 관습. `Option<T>`, `Result<T, E>` 적극 활용. 런타임 입력 경로에서 `unwrap()` 금지.
4. 계획 → 승인 → 구현 순서. "즉시 실행" 명시 시 승인 생략 가능.
5. `HISTORY.md`에 **Why** 없는 커밋은 Revert 대상.
6. **토큰 절약**: 불필요한 서론/결론 금지. 핵심 원인(Why)과 결과(Code)만.
7. 문서 SSOT는 `specs/README.md`, `specs/IMPLEMENTATION_ROADMAP.md`, `specs/TODO.md`, `specs/HISTORY.md`, `specs/DOCUMENT_SYSTEM.md`를 기준으로 관리하며, 상세 규칙은 `.agent/sub-constitutions/document-governance.md`를 따른다.
8. 문서는 타입·상태·소유자·검토일·정본 여부를 명시해야 하며, `deprecated`, `superseded`, `archived` 문서는 AI 기본 참조 대상에서 제외한다.
9. 한 사실은 한 정본 문서에만 존재해야 하며, 코드·계약·구조 변경은 관련 정본 문서 업데이트 없이는 완료가 아니다.

---

## §1 핵심 개발 철학

### §1.1 SDD (스펙 절대주의)

- 프론트엔드는 G5 REST API의 **`openapi.yaml`을 유일한 계약서**로 섬긴다.
- API 명세에 없는 엔드포인트를 앱에서 임의로 호출하거나 상상해서 구현하지 않는다.
- **Canonical 통합 레포 원본**: `connectors/gnuboard5-php/api/docs/openapi.yaml`
- **Rust 루트 기준 fleet 기본값**: `../../connectors/gnuboard5-php/api/docs/openapi.yaml`
- **레거시 독립 체크아웃 호환값**: `../php/api/docs/openapi.yaml`
- **로컬/CI 해석 규칙**: 스크립트와 테스트는 명시 환경변수, fleet connector, legacy sibling 순서로 해석한다.
  명시 환경변수가 비었거나 존재하지 않는 파일을 가리키면 다른 checkout으로 우회하지 않고 실패한다.
- **참조 우선순위**:
  1. `G5_OPENAPI_PATH`
  2. `G5_PHP_ROOT/api/docs/openapi.yaml`
  3. `../../connectors/gnuboard5-php/api/docs/openapi.yaml`
  4. `../php/api/docs/openapi.yaml`
  5. 명시적으로 지정한 원본 `openapi.yaml`/`openapi.json` URL
- **비권위 소스**: Swagger UI HTML 페이지는 탐색용일 뿐, 계약 원본으로 사용하지 않는다.

### §1.2 분업 원칙 (Rust-Core, React-View)

> **Rust가 중요한 곳(보안·통신·인증)을 독점하고, UI는 React 생태계로 빠르게 생산한다.**

- **Rust 코어 전담**: JWT 관리, API 통신, 에러 매핑, 비즈니스 규칙, 토큰 처리
- **React 전담**: 렌더링, 사용자 입력, 화면 상태, UX 검증
- 최종 진실(Truth)은 항상 **Rust → PHP API** 체인에 있다. 프론트 검증은 UX 용도.

### §1.3 보안 주도 설계 (Rust-Driven Security)

- **JWT 저장**: 브라우저 `LocalStorage`/`SessionStorage`에 **절대 저장 금지**.
  운영/서명 빌드는 **OS 네이티브 키체인(`keyring`)**을 기본으로 사용한다.
  단, **개발용 ad-hoc/unsigned 빌드**는 반복 재설치 시 macOS Keychain 허용 대화상자가 불안정할 수 있으므로
  `sessionStorage=file` 기반 로컬 세션 파일 저장을 허용한다.
- **API 통신 프록시**: `React → invoke(cmd_*) → Rust reqwest → G5 API` 경로 고정.
  프론트에서 직접 `fetch()`로 API 호출 **절대 금지**.

### §1.4 rest-middleware 공통 Rust 기준 채택

이 프로젝트는 `/Users/neojins/workspace/rest-middleware/.agent/Constitution.md`의 규칙 중
**서버 비종속 Rust 기준**을 공통 기반으로 채택한다.

- **채택 대상**: 타입 안전성, 에러 컨텍스트, 구조화 로그 4필드, `request_id` 추적,
  Zero Hardcoding, Fail-Fast 설정 로딩, `tokio::sync` 우선, `spawn_blocking` 경계,
  `clippy --workspace --all-targets --all-features -D warnings`, `unsafe` 제한
- **제외 대상**: Axum 미들웨어 순서, systemd/배포 스크립트, DB 마이그레이션,
  Apache/PHP 운영 제약, 서버 포트/세션 저장소 규칙
- 원칙: **같은 Rust라면 공통 규율은 재사용하고, 플랫폼 특화 규칙만 분기한다.**

---

## §2 기술 스택 (최종 확정)

### §2.1 권장 스택

| 계층 | 기술 | 버전 |
|------|------|------|
| **앱 셸** | Tauri | v2.x |
| **코어 언어** | Rust stable | latest |
| **프론트엔드** | React + TypeScript strict | 19.x |
| **빌드** | Vite | 8.x |
| **UI 컴포넌트** | shadcn/ui + Tailwind CSS | v4.x |
| **서버 상태** | TanStack Query | v5 |
| **폼** | React Hook Form + Zod | latest |
| **타입 브릿지** | ts-rs | 12.x |
| **네트워크** | reqwest | latest |
| **보안 저장** | keyring (prod) / file session store (dev) | latest |
| **직렬화** | serde + serde_json | latest |
| **에러** | thiserror | latest |
| **로깅** | tracing | latest |
| **패키지 매니저 / JS 런타임** | Bun | 1.3.x pinned |
| **Node.js** | optional fallback only | >= 22.12.0 when required by external tooling |

### §2.2 개발/배포 환경

| 환경 | 대상 |
|------|------|
| **주 개발** | macOS Apple Silicon (M4 Pro, 48GB) |
| **배포 — macOS** | `.dmg`, `.app` |
| **배포 — Windows** | 공식 릴리스는 Windows 호스트/CI에서 `.exe` (NSIS), `.msi` 생성 |
| **배포 — 모바일** | Android (`.apk`, `.aab`), iOS (`.ipa` - macOS/Xcode 필수) |

- macOS에서 Windows 크로스빌드는 **비공식 smoke build** 용도로만 허용한다.
- 모바일(Android/iOS) 빌드는 각 타겟 SDK/NDK 및 Xcode 프로비저닝 프로필이 준비된 환경에서 수행한다.
- 릴리스 아티팩트 서명/검증은 Windows 빌드 체인 및 모바일 네이티브 체인에서 수행한다.

### §2.3 Cargo Workspace 구조

```
rust/
├── .agent/
│   ├── Constitution.md            # ← 이 파일
│   └── sub-constitutions/
├── Cargo.toml                      # 활성 Rust 소비자 workspace members
│   ├── Cargo.toml
│   ├── src/
│   │   └── main.rs
│   └── README.md
├── g5-admin-models/                # Rust DTO/ts-rs 계약 크레이트
│   ├── Cargo.toml
│   └── src/
│       ├── lib.rs
│       └── models/
├── g5-admin/                       # Tauri 2 Admin Desktop App
│   ├── src-tauri/                  # Rust 코어 (Tauri 표준 구조)
│   │   ├── Cargo.toml              # [package] name = "g5-admin-desktop"
│   │   ├── src/
│   │   │   ├── main.rs            # Tauri 엔트리포인트
│   │   │   ├── lib.rs             # setup, plugin 등록, command 바인딩
│   │   │   ├── commands/          # IPC Command 핸들러
│   │   │   │   ├── mod.rs
│   │   │   │   ├── auth.rs        # cmd_auth_login, cmd_auth_logout
│   │   │   │   ├── board.rs       # cmd_admin_board_*
│   │   │   │   ├── config.rs      # cmd_admin_config_*
│   │   │   │   ├── member.rs      # cmd_admin_member_*
│   │   │   │   ├── session.rs     # 공통 세션 helper
│   │   │   │   └── ...            # 도메인별 1파일
│   │   │   ├── api_client.rs      # 공통 transport / RFC 7807 파싱
│   │   │   ├── api_client/        # endpoint별 reqwest 함수
│   │   │   ├── runtime_config.rs  # app-config.json / env override
│   │   │   ├── token_store.rs     # keychain/file 세션 저장소
│   │   │   ├── error.rs           # AppError (thiserror)
│   │   │   └── models/            # API DTO (serde + ts-rs)
│   │   │       ├── mod.rs
│   │   │       ├── config.rs
│   │   │       ├── member.rs
│   │   │       ├── board.rs
│   │   │       └── ...
│   │   ├── tauri.conf.json
│   │   ├── app-config.json
│   │   └── build.rs
│   ├── src/                        # React 프론트엔드
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── index.css
│   │   ├── api/                    # Tauri invoke 래퍼
│   │   │   └── client.ts
│   │   ├── app/
│   │   │   └── router.tsx         # React Router route 정의
│   │   ├── components/
│   │   │   └── ui/                # shadcn/ui 기반 공통 컴포넌트
│   │   ├── debug/
│   │   │   ├── diagnostics.ts
│   │   │   └── DebugDock.tsx
│   │   ├── features/
│   │   │   ├── auth/              # 로그인, 세션 상태
│   │   │   ├── config/            # /settings/general
│   │   │   ├── dashboard/         # 기존 도메인 bridge용 구현
│   │   │   ├── layout/            # AppShell, ProtectedLayout
│   │   │   ├── legacy/            # route bridge
│   │   │   └── system/            # SMS 등 설정 도메인
│   │   ├── types/                  # ts-rs 자동 생성 타입
│   │   └── lib/                    # 유틸리티
│   ├── index.html
│   ├── package.json
│   ├── bun.lock
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── README.md
├── specs/
│   ├── README.md
│   ├── IMPLEMENTATION_ROADMAP.md
│   ├── TODO.md
│   └── HISTORY.md
└── tools/
```

---

## §3 IPC 규약 (Inter-Process Communication)

### §3.1 통신 경로 (고정)

```
React (invoke) → Tauri IPC → Rust Command → reqwest → G5 REST API
                                    ↓
                        session store (JWT)
```

### §3.2 Command 명명 규칙

`cmd_[도메인]_[행위]` 패턴 강제:

```
❌ fetchData(), getMembers()
⭕ cmd_auth_login
⭕ cmd_admin_member_get_list
⭕ cmd_admin_member_update
⭕ cmd_admin_board_create
⭕ cmd_admin_permission_save
```

### §3.3 타입 브릿지 (ts-rs)

- Rust `struct` → TypeScript `interface` 자동 생성 (`ts-rs` 12.x).
- 생성된 `.ts` 파일은 `g5-admin/src/types/` 에 배치. **수동 수정 금지**.
- ts-rs export 테스트의 표준 이름은 `export_ts_bindings`로 고정한다.
- 정본 로컬 CI는 `cargo test -p g5-admin-models --features ts-bindings models::tests::export_ts_bindings -- --exact --nocapture` 실행 후
  `git diff --exit-code -- g5-admin/src/types`로 생성 파일 변경 여부를 검사해야 한다.
- 단순 `cargo test`만으로는 타입 drift가 자동 차단되지 않는다.
- 프론트에서 `any`, `Record<string, any>` 사용 **금지**.

```rust
#[derive(Serialize, Deserialize, TS)]
#[ts(export, export_to = "../src/types/")]
pub struct MemberListResponse {
    pub members: Vec<MemberDto>,
    pub total: u64,
}
```

### §3.4 에러 전파 체인

```
PHP API (RFC 7807 JSON)
     ↓
Rust reqwest → ApiError { status, type_, title, detail, guide, request_id }
     ↓
Tauri IPC → Result<T, AppError { code, message, guide, request_id }> (serde 직렬화)
     ↓
React → TanStack Query onError → ErrorToast (guide.action + request_id 표시)
```

---

## §4 에러 통제 및 UX 규약

### §4.1 RFC 7807 원클릭 디버그

- PHP API의 RFC 7807 포맷을 **100% 파싱**.
- "오류가 발생했습니다" 같은 모호한 알럿 **금지**.
- `guide.action` + `guide.reason` + `request_id`를 Toast/상세 패널에 노출한다.

### §4.1.1 개발 모드 디버그 독

- 개발 모드 또는 `debugOverlay=true` 설정에서는 **하단 디버그 독**을 제공한다.
- 디버그 독은 최소한 아래 정보를 실시간으로 보여야 한다.
  - `command`
  - `operation`
  - `api_target`
  - `local_target`
  - `status`
  - `request_id`
  - `duration`
- 디버그 독은 최근 요청 이력과 현재 pending 요청을 구분해 보여야 한다.
- 민감정보(`password`, JWT, refresh token, cookie, authorization)는 디버그 독에 노출 금지.

### §4.2 Mutation 더블 클릭 방어 (글로벌)

- **모든 POST/PUT/DELETE** 시 버튼 즉시 비활성화.
- TanStack Query `useMutation`의 `isPending`을 버튼에 바인딩.
- 이 규칙은 **글로벌 강제**. 개발자 재량 생략 불가.

### §4.3 CRUD 패턴 통일

- 모든 CRUD 테이블: **shadcn/ui + @tanstack/react-table** 패턴.
- 로딩/에러/재시도/캐시: **TanStack Query**로 통일.
- 폼 검증: **React Hook Form + Zod**로 통일.

---

## §5 Rust 코어 품질 기준

### §5.1 코드 크기

| 파일 유형 | 상한 | 초과 시 |
|----------|------|--------|
| IPC Command 핸들러 | 300줄 | 도메인 분할 |
| API 클라이언트 | 500줄 | 모듈 분리 |
| 모델/DTO 모음 | 800줄 | 구조 리팩토링 |
| `#[cfg(test)]` 포함 시 | +200줄 허용 | |

### §5.2 타입 안전성 및 에러 컨텍스트

- **`unwrap()` 금지**: 런타임 입력/네트워크/IPC 경로. `?` 또는 `match`.
- **에러 타입**: `thiserror`로 도메인별 정의. `anyhow`는 main 레벨만.
- **에러 컨텍스트 강제**: 파일 I/O, 네트워크, keyring, 외부 프로세스, 설정 로딩에서
  경로/URL/계정/명령 등 런타임 식별자가 원인 추적에 필요하면
  `.with_context(...)`, `map_err(...)`, 또는 명시적 에러 variant로 컨텍스트를 붙인다.
- **bare `?` 허용 조건**: `thiserror`의 `#[from]` 체인 등으로 하위 에러가 이미 충분한
  원인 정보를 포함하고 있고, 추가 런타임 식별자가 불필요한 경우만 허용한다.
- **`let _ = ...` 금지에 준하는 통제**: 반환값/에러를 명시적으로 버릴 때는 바로 옆에 사유 주석을 남긴다.
- **`Vec::with_capacity` 권장**: 길이를 미리 아는 수집 경로는 선할당을 우선한다.

### §5.2.1 Zero Hardcoding (운영값 한정)

- 비밀값, 운영 endpoint, 호스트, 포트, 자격증명, 환경별 경로 하드코딩은 반려한다.
- 값은 `tauri.conf.json`, 전용 설정 파일, `.env`, OS 환경변수 중 하나로 주입한다.
- 허용 예외: 테스트 리터럴, 표준 명령 리터럴, 컴파일 타임 상수, `serde(default = "...")` 기본값 함수

### §5.3 로깅 및 에러 추적 (2-Tier Span 모델)

- **Logger**: `tracing`. Dev=Pretty, Prod=JSON.
- **장애/경계 경로**(`Tauri command`, `HTTP 입출력`, `keyring`, `filesystem`, `설정 로딩`,
  `권한 판정`, `외부 프로세스`)의 `tracing::warn!`/`tracing::error!`는
  로그 출력 시점에 아래 4필드가 반드시 존재해야 한다.
  - `component`
  - `operation`
  - `target`
  - `error`
- 사용자 액션에서 시작된 경로는 위 4필드에 더해 **`request_id` 필수**다.
- `component`/`operation`은 `#[tracing::instrument(...)]` Span으로 주입해도 되고,
  로그 호출부에 직접 기입해도 된다. 단, 출력 시점에 필드가 실제로 보여야 한다.
- `error` 필드는 가능하면 `error = ?err`로 남겨 체인 전체를 보존한다.
- **금지**: `tracing::error!("login failed: {err}")` 같은 문자열 보간형 단독 에러 로그.
- **민감정보 마스킹**: JWT, Refresh Token, 비밀번호, Cookie, Authorization 헤더는 로그에 남기지 않는다.
- 로그인/로그아웃/권한변경/삭제 같은 감사성 이벤트는 `info!` 이상으로 남기고,
  가능하면 `actor`, `target`, `result`, `request_id`를 함께 기록한다.
- **No Panic**: 테스트와 명시적 부트스트랩 치명 실패 외 런타임 panic 금지. 앱 경계에서는 `Result`로 회수한다.
- 개발 중 원격 서버 로그에 접근할 수 없더라도 원인 추적이 가능하도록 **로컬 파일 로그**를 남긴다.
- 로컬 로그 파일은 최소한 `api_base_url`, HTTP 요청 시작/응답 상태, command 경계 실패를 남겨야 한다.
- 개발 문서에는 로컬 로그 파일 경로와 조회 방법을 명시한다.

```rust
#[tracing::instrument(
    skip_all,
    fields(
        component = "g5_admin::commands::member",
        operation = "cmd_member_get_list",
        request_id = %request_id
    )
)]
pub async fn cmd_member_get_list(...) -> Result<MemberListResponse, AppError> {
    // ...
    tracing::error!(
        component = "g5_admin::commands::member",
        operation = "cmd_member_get_list",
        target = "/admin/members",
        request_id = %request_id,
        error = ?err,
        "member list fetch failed"
    );
    // ...
}
```

### §5.4 런타임 안정성 및 설정

- **Fail-Fast**: 앱 부팅에 필요한 설정, 필수 디렉터리, Tauri plugin setup, keyring 접근성 확인이
  실패하면 조용한 폴백 없이 즉시 실패한다.
- **설정 파싱 엄격화**: Rust 설정 struct는 기본적으로 `serde(deny_unknown_fields)`를 사용해
  오타/불명 키를 바로 차단한다.
- **에러 묵살 금지**: 설정 로딩, 파일 생성, 자산 탐색, reqwest client 생성 실패를 삼키지 않는다.
- **명시적 타임아웃 필수**: 외부 API 호출은 `reqwest::ClientBuilder`와
  `tokio::time::timeout`/request timeout 중 하나로 상한 시간을 둔다.
  기본값은 `connect timeout 5초`, `request timeout 15초`를 권장하며, 긴 작업은 사유와 함께 예외 지정한다.
- **재시도 제한**: `GET` 같은 멱등 요청만 제한적 재시도(예: 1s→2s→4s)를 허용한다.
  `POST/PUT/DELETE`는 idempotency 보장이 없으면 자동 재시도 금지.

### §5.5 비동기/동시성

- `tokio` 런타임. async 경로에서 `std::sync::Mutex`/`RwLock` 기본 금지 → `tokio::sync` 또는 채널 사용.
- `keyring`, 무거운 파일 I/O, 압축/해시 계산, 기타 blocking 작업은 `tokio::task::spawn_blocking` 경유.
- 상태 공유보다 메시지 패싱을 우선 검토한다.

### §5.6 Clippy/Format

- `cargo clippy --manifest-path g5-admin/src-tauri/Cargo.toml --all-targets -- -D warnings` 경고 0개 필수.
- `cargo fmt --all` 자동 적용.
- `unsafe` 기본 금지. 불가피 시 `SAFETY:` 주석 + 테스트.

---

## §6 프론트엔드(React) 품질 기준

### §6.1 TypeScript strict 모드

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

### §6.2 컴포넌트 규칙

- **Smart/Dumb 분리**: 페이지(Smart)만 `useQuery`/`useMutation` 호출. UI 컴포넌트(Dumb)는 props만.
- **파일 크기**: 컴포넌트 300줄 초과 시 분할.
- **직접 API 호출 금지**: `fetch()`, `axios` **절대 금지**. 반드시 `invoke()` 경유.

### §6.3 상태 관리

| 유형 | 도구 | 예시 |
|------|------|------|
| **서버 상태** | TanStack Query | API 데이터, 캐시 |
| **폼 상태** | React Hook Form + Zod | 입력 검증, 제출 |
| **UI 상태** | useState/useReducer | 토글, 모달 |
| **글로벌** | Zustand (극소수만) | 테마, 사이드바 |

---

## §7 테스트 전략

### §7.1 3단 테스트

| 레벨 | 도구 | 범위 |
|------|------|------|
| **Rust Unit** | `#[cfg(test)]` + `#[tokio::test]` | Command, API Client, Auth |
| **React Unit** | Vitest + React Testing Library | 컴포넌트, 훅 |
| **E2E** | Playwright 또는 Tauri Driver | 전체 흐름 (로그인→CRUD) |

### §7.2 테스트 동반

- **신규 기능**: 구현 + 테스트 같은 커밋.
- **버그 픽스**: 재현 테스트 → 픽스 → 통과.
- 현재 필수 프론트 테스트 게이트는 `Vitest + React Testing Library`다.
- Playwright/Tauri Driver는 권장 대상이며, 실제 도입 전까지 필수 커밋 게이트로 간주하지 않는다.

---

## §8 타입 동기화

### §8.1 ts-rs 파이프라인

```
Rust struct (#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))])
     ↓ cargo test -p g5-admin-models --features ts-bindings models::tests::export_ts_bindings -- --exact
g5-admin/src/types/*.ts (자동 생성)
     ↓ git diff --exit-code -- g5-admin/src/types
React 컴포넌트에서 import
```

- 수동 타입 정의 중복 **금지**.
- 정본 로컬 CI는 export 테스트와 `git diff`를 함께 실행해야 한다. 둘 중 하나만으로는 drift 차단이 불완전하다.

### §8.2 openapi.yaml 동기화

- 업스트림 계약 경로는 `G5_OPENAPI_PATH`로 주입한다.
- 통합 레포 canonical 경로는 `connectors/gnuboard5-php/api/docs/openapi.yaml`이다.
- 로컬 기본값은 fleet `../../connectors/gnuboard5-php`이고, 해당 구조가 아닐 때만 legacy `../php`를 사용한다.
- `G5_PHP_ROOT`, `G5_OPENAPI_PATH`, `G5_OPENAPI_MANIFEST_PATH`가 명시되면 유효성을 검사하며 잘못된 값을 다른 provider로 대체하지 않는다.
- Swagger UI URL은 사람 확인용 보조 자료일 뿐이며, DTO 동기화와 구현 참조는 원본 YAML/JSON만 사용한다.
- PHP openapi.yaml 변경 → Rust DTO struct 동기화 → ts-rs 재생성.
- 동기화 누락 → `serde` 역직렬화 에러 또는 타입 mismatch로 즉시 감지.

---

## §9 빌드 및 배포

### §9.1 개발

```bash
# 자동 해석 대신 별도 provider를 명시할 때
export G5_PHP_ROOT="/path/to/gnuboard5-php"
export G5_OPENAPI_PATH="${G5_PHP_ROOT}/api/docs/openapi.yaml"

# Rust 체크
cargo check -p g5-admin-desktop

# React 개발 서버
cd g5-admin && bun run dev

# Tauri 개발 모드 (Rust + React 동시)
cd g5-admin && bun run tauri dev
```

### §9.2 릴리스

```toml
[profile.release]
opt-level = 3
lto = true
codegen-units = 1
strip = true
```

```bash
cd g5-admin && bun run tauri build --bundles app     # macOS (.dmg, .app)
# Windows (.exe/.msi) — Windows 호스트/CI에서 공식 빌드
# macOS 크로스빌드는 smoke build 전용
```

### §9.3 품질 게이트

```bash
# 커밋 전 필수
cargo fmt --all -- --check
cargo clippy --manifest-path g5-admin/src-tauri/Cargo.toml --all-targets -- -D warnings
cargo test -p g5-admin-desktop
cargo test -p g5-admin-models --features ts-bindings models::tests::export_ts_bindings -- --exact --nocapture
git diff --exit-code -- g5-admin/src/types
cd g5-admin && bun x tsc --noEmit
cd g5-admin && bun run lint
cd g5-admin && bun run test
```

---

## §10 PHP 헌법과의 관계

| 공유 | 독립 |
|------|------|
| `openapi.yaml` API 명세 | 구현 언어 |
| RFC 7807 에러 포맷 | 아키텍처 |
| JWT 인증 흐름 | 테스트 전략 |
| G5 레거시 도메인 용어 | 코드 스타일 |

- PHP REST API는 **블랙박스**. DB 직접 접속 **금지**.

---

## §11 보안

- **JWT**: OS Keyring 저장. WebView 저장 금지.
- **HTTPS**: API 통신 필수.
- **의존성 감사**: `cargo audit` + `bun audit` 정기 실행.
- **에러 추적성**: 사용자에게 노출되는 실패에는 `request_id`를 포함해 로그와 상호 추적 가능해야 한다.

---

## §12 문서 거버넌스

- **Why 중심 서술**: 모든 변경의 '왜' 기록.
- 헌법/SDD 무단 삭제 = 탄핵(Revert) 대상.

### §12.1 활성 크레이트 구조/경계 감사 — 상설

- 이 워크스페이스는 `workspace member 수`보다 **활성 구현 크레이트의 내부 경계**가 더 중요하다.
- 구현 없는 placeholder crate는 활성 workspace에 두지 않는다. 이 저장소의 Rust 크레이트는 PHP REST API 소비자 경계만 소유한다.
- placeholder crate는 active bounded context 근거로 사용하지 않는다. placeholder 존재를 이유로 새 직접 의존이나 구조 확장을 정당화할 수 없다.
- 새 코드와 수정된 코드는 `commands -> AppState service/core::ports -> infra adapter(db/token_store/api_client)` 흐름을 우선 사용해야 한다.
- monitored feature domain은 다른 business feature의 내부 구현을 직접 import하지 않는다. cross-feature import는 `specs/audits/DOMAIN_BOUNDARY_RULES.toml`에 등록된 support target만 허용한다.
- `shared` / `components` / `lib` / `api`는 business owner 없는 support namespace로 유지한다. business feature import가 생기면 구조 위반으로 본다.
- `page/workspace/hook`에서 여러 feature를 직접 조정해야 하면 feature 간 직접 결합으로 두지 말고 application/service seam으로 올린다.
- `app_state/*service.rs` 신규 코드는 `&AppState` wrapper field를 constructor로 받지 않는다. 기존 wrapper-coupled service는 budget을 줄이는 방향으로만 수정할 수 있다.
- `commands`가 `db` concrete 구현, `token_store`, `runtime_config`를 직접 조합하는 새 코드는 금지한다. 기존 예외는 줄여야 하며 확대는 금지한다.
- `shared` / `common` / `mod.rs` 집합은 IO, 상태 변경, 비즈니스 규칙의 하수구가 되어서는 안 된다. 공통 모듈은 무상태 정규화/응답 조립/formatting helper로 제한한다.
- `legacy.rs` 또는 `legacy/`는 호환/브리지/번역 로직만 둔다. 신규 정규 흐름이 legacy 구현을 직접 참조하면 경계 위반으로 본다.
- 활성 크레이트 구조 감사의 운영 규칙, 실패 기준, 경고 기준, 실행 타이밍, 산출물은 `specs/AUDIT_SYSTEM.md`를 따른다.
- 도메인 경계 강제 규율과 처리 수단의 운영 설명은 `specs/foundation/DOMAIN_BOUNDARY_ENFORCEMENT.md`를 따른다.
- 구조 경계 warning은 설명으로만 남기지 않는다. active warning은 `specs/audits/WARNING_BUDGETS.toml`에 owner, 만료일, 제거 기준과 함께 등록되거나 즉시 제거돼야 한다. 단, 변경 파일 350줄 이상 LOC는 비차단 관찰값이고 500줄 이상부터 hard failure다.
- `registry.rs`, `app_state/mod.rs`, `db/mod.rs`, `core/ports.rs`, `runtime_config/*`, `token_store/*`, `api_client/mod.rs`, `g5-admin-models/src/models/**`, `lib.rs` 변경은 **구조 변경**으로 간주하고 `audit:structure`를 필수 실행한다.
- routine 구조 변경은 `audit:structure`와 scoped `pre-push`를 통과해야 한다. 릴리스·대규모 리팩터링은 `cd g5-admin && bun run ci:local` 전체 게이트를 추가한다. contract/docs/structure hosted workflow는 PR 자동 게이트로 유지한다.
- 구조 감사의 목적은 “큰 파일 찾기”만이 아니다. active crate 내부의 소유권, 직접 참조, legacy 오염, common/shared 하수구화를 드리프트로 잡는 것이다.

---

## §13 크로스 플랫폼 (Multi-OS) 규약 — 강제

> **주 개발: macOS. 주 판매 타겟: Windows, Android, iOS.** 모든 코드는 데스크톱 및 모바일 양쪽에서 동작 혹은 안전하게 컴파일되어야 한다.

### §13.1 파일 시스템

| 규칙 | 강제 | 위반 시 |
|------|:----:|--------|
| `dirs` 크레이트 사용 (경로 추상화) | ✅ | macOS `~/Library/` ↔ Windows `%APPDATA%` 자동 분기 |
| 하드코딩 경로 금지 (`/Users/`, `C:\`) | ✅ | 즉시 반려 |
| 경로 구분자 `std::path::Path` 사용 | ✅ | 슬래시 문자열 결합 금지 |
| 파일명에 `:`, `<`, `>`, `|`, `?`, `*` 사용 금지 | ✅ | Windows NTFS 무효 문자 |

### §13.2 keyring / 보안 저장소

| OS | 백엔드 | 주의사항 |
|----|--------|---------|
| macOS | Keychain | Safari 동기화 비활성 확인 |
| Windows | **Credential Manager** | 항목당 **2,560 바이트** 제한 → JWT 초과 시 청크 분할 필수 |

```rust
// keyring 항목 크기 확인 로직 강제
const WINDOWS_CRED_LIMIT: usize = 2560;
if cfg!(target_os = "windows") && value.len() > WINDOWS_CRED_LIMIT {
    // 분할 저장 로직 (chunk_0, chunk_1, ...)
}
```

- 운영체제 보안 저장소 prompt는 앱이 먼저 이유를 설명한 뒤, 사용자의 명시적 진행 액션 이후에만 띄운다.
- 앱 창 표시 전 secure storage prompt를 먼저 띄우는 부트스트랩은 금지한다.
- 위 원칙은 macOS Keychain, Windows Credential Manager, Linux Secret Service에 공통 적용한다.

### §13.3 생체 인증

| OS | API | 폴백 |
|----|-----|------|
| macOS | Touch ID (`LAPolicy.biometryCurrentSet`) | 마스터 비밀번호 수동 입력 |
| Windows | **Windows Hello** (PIN 포함) | 카메라/지문 없는 데스크톱 → PIN이 Hello 폴백 |

- 목표 UX는 위 표를 따른다.
- 현재 데스크톱 빠른 잠금 해제 구현은 `tauri-plugin-biometry v0.2.6`을 사용한다.
- OS biometry secure storage에는 랜덤 fast-unlock secret만 저장하고, 로컬 SQLCipher DB에는 그 Argon2 verifier만 저장한다. 마스터 비밀번호 평문은 저장하지 않는다.
- Google OTP가 활성화된 경우 빠른 잠금 해제는 1차 인증만 대체하고, OTP 6자리 검증은 계속 후속 단계로 유지한다.
- 공식 `tauri-plugin-biometric` Rust crate `2.3.2`는 여전히 `#![cfg(mobile)]`라 현재 구현에 사용하지 않는다.
- 데스크톱 로컬 잠금 해제의 canonical 폴백은 계속 마스터 비밀번호 수동 입력이다.

### §13.4 빌드 및 배포

| 항목 | macOS | Windows |
|------|-------|---------|
| 빌드 호스트 | macOS (네이티브) | **로컬 Windows 호스트** (크로스 컴파일 불가) |
| 인스톨러 | `.dmg`, `.app` | `.exe` (NSIS), `.msi` (선택) |
| WebView 엔진 | WKWebView (시스템 내장) | **Edge WebView2** (미설치 시 번들 부트스트랩) |
| 코드 서명 | Apple Developer ID (`codesign`) | EV/OV 코드 서명 (SmartScreen) — MVP 시 생략 가능 |
| 자동 업데이트 | `tauri-plugin-updater` | 동일 (서명 키는 OS별 분리) |

### §13.5 WebView2 번들링 (Windows 필수)

```json
// tauri.conf.json
{
  "bundle": {
    "windows": {
      "webviewInstallMode": {
        "type": "embedBootstrapper"  // WebView2 미설치 시 자동 설치
      }
    }
  }
}
```

- Win10 20H2 미만은 WebView2 미탑재 → 부트스트래퍼 없으면 실행 불가.

### §13.6 플랫폼 조건부 코드

```rust
// 플랫폼 분기 시 반드시 cfg! 매크로 및 #[cfg] 속성 사용
#[cfg(target_os = "macos")]
fn platform_specific() { /* ... */ }

#[cfg(target_os = "windows")]
fn platform_specific() { /* ... */ }

#[cfg(any(target_os = "android", target_os = "ios"))]
fn mobile_specific() { /* ... */ }

// 데스크톱 전용 모듈 보호 (모바일 빌드 통과용)
#[cfg(not(any(target_os = "android", target_os = "ios")))]
fn desktop_only_feature() { /* ... */ }

// ❌ 금지: runtime 문자열 비교
// if std::env::consts::OS == "windows" { ... }  // 컴파일 타임 검증 불가
```

### §13.7 테스트 필수 사항

- routine push는 변경 범위 기반 `pre-push`를 실행한다. 릴리스 전에는 `cd g5-admin && bun run ci:release-local`로 전체 게이트와 Windows target type check를 실행한다.
- `cargo-xwin check --target x86_64-pc-windows-msvc`는 macOS에서 Windows SDK/CRT와 로컬 OpenSSL 3 header/lib를 결합해 실행하며 타입 검사용 증거다.
- 전체 `cargo build` + `cargo tauri build`와 `.exe/.msi` 실행 증명은 로컬 Windows 호스트에서 수행한다. GitHub Actions의 정적 contract/docs/structure 자동 게이트는 native Windows 실행 증명을 대체하지 않는다.
- **버그 수정 = 회귀 테스트 필수**: 버그를 고칠 때는 해당 실패를 재현하는 테스트를 같은 변경 세트에 반드시 포함한다. 테스트 없이 버그만 고친 변경은 미완성으로 간주한다.
- **TDD 우선 원칙**: 가능하면 실패하는 테스트를 먼저 추가하고 수정한다. 구조상 선행 테스트가 불가능한 경우에도, 수정과 함께 동일 증상을 고정하는 테스트를 반드시 추가하고 보고에 이유를 남긴다.
- **보안/부트스트랩 경로는 전용 회귀망 필수**: 첫 실행, secure storage, keychain/credential manager/secret service, 마스터 잠금, 인증, 세션 복구, DB 마이그레이션 같은 경로는 단순 happy path 테스트만으로 닫지 않는다. fresh install, returning user, 거부/취소, lockout, migration 경로 중 영향받는 케이스를 전용 테스트로 고정한다.
- **회귀 테스트 없는 커밋 금지**: 사용자-visible 회귀나 운영/보안 회귀를 수정하는 커밋은 영향받는 테스트 스위트를 실행하고, 최종 보고에 실행 명령을 남겨야 한다.
- **감사 문서는 보조, 강제 규칙은 헌법**: `specs/audits/**`의 TDD/coverage 감사 문서는 참고 자료다. AI 에이전트는 감사 보고서가 아니라 이 헌법 본문을 강제 규칙으로 따라야 한다.

### §13.8 UI/UX

| 항목 | 규칙 |
|------|------|
| 폰트 | `font-family: system-ui` 사용 → macOS: SF Pro, Windows: Segoe UI |
| 단축키 | macOS `Cmd` ↔ Windows `Ctrl` → Tauri accelerator 문법 사용 (`CmdOrCtrl+K`) |
| 파일 경로 표시 | `std::path::display()` 사용 → OS별 슬래시 자동 |
| 파일 선택 다이얼로그 | `tauri-plugin-dialog` 사용 → 네이티브 다이얼로그 자동 |

---

> **이 헌법은 G5 Admin 데스크탑 앱에만 적용된다.**
> **PHP REST API 헌법, rest-middleware 헌법과는 독립 운영.**
> **세 프로젝트가 공유하는 유일한 계약은 `openapi.yaml`이다.**

---

## §14 멀티 에이전트 동시 편집 금지 (강제)

> 🔥 **절대 원칙**: **같은 파일을 여러 AI 에이전트가 동시에 수정하는 것을 금지한다.** 이것이 유일하고 핵심적인 경합 방지 규칙이다.

### §14.1 경합 금지 원칙 (Core Rule)

- **같은 파일 동시 수정 금지**: 하나의 파일을 여러 AI가 동시에 편집하면 충돌이 발생한다. 이것만 막으면 된다.
- **다른 AI가 해당 파일을 건드리지 않고 있으면 수정 가능**: 잠금 유무와 관계없이, 실제 경합이 없으면 작업을 진행할 수 있다.
- **다른 도메인은 자유**: AI-A가 `auth` 작업 중이어도 AI-B는 `board`를 동시에 작업할 수 있다.

### §14.2 도메인 잠금 (관리 도구)

도메인 잠금은 §14.1 원칙을 **효율적으로 운영하기 위한 관리 도구**이다. 잠금 미획득 자체가 위반은 아니며, **실제로 같은 파일이 동시 수정될 때**가 위반이다.

```bash
# 잠금 획득 (권장 — 경합 사전 방지)
../.agent-locks/lock.sh rust <domain> <agent_name> [ttl_seconds]

# 잠금 해제 (작업 완료 시)
../.agent-locks/unlock.sh rust <domain> <agent_name>

# 상태 조회
../.agent-locks/status.sh rust
```

### §14.3 잠금 규칙

| 규칙 | 설명 |
|------|------|
| **도메인 단위 배타적 잠금** | 한 도메인은 한 시점에 한 에이전트만 수정 가능 |
| **TTL 기본 1시간** | 작업 완료 시 즉시 해제. 미해제 시 TTL 만료 후 자동 정리 |
| **다중 도메인 잠금 허용** | 하나의 에이전트가 여러 도메인을 동시에 잠글 수 있음 |
| **Rust + Frontend 동시 잠금** | 같은 도메인의 Rust 코어와 React 프론트를 함께 수정할 때는 해당 도메인 잠금 하나로 커버 |
| **교차 프로젝트 독립** | Rust 잠금과 PHP/Flutter 잠금은 독립적 |
| **소유자만 해제** | 다른 에이전트의 잠금을 강제 해제할 수 없음 (TTL 만료 대기) |

### §14.4 위반 판정 기준

- ✅ **위반**: 같은 파일을 여러 AI가 실제로 동시에 수정한 경우 → 후행 수정 Revert
- ❌ **위반 아님**: 잠금을 안 걸었지만 다른 AI가 해당 파일을 건드리지 않은 경우
- ❌ **위반 아님**: 같은 도메인이지만 서로 다른 파일을 각각 수정한 경우

상세 규칙은 `.agent/sub-constitutions/multi-agent-locking.md` 참조
