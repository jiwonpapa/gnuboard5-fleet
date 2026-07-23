# 🔬 딥 다이브 감사 보고서 — 2026-03-07

> **프로젝트**: G5 Admin Tauri v2
> **헌법 기준**: v1.4.0
> **전수 범위**: 18,567줄 (src-tauri/ + src/)
> **방법론**: /deep-audit Phase 1~6 적응(PHP→Tauri)

---

## 종합 판정: 🟠 Rust 코어 견고 / React 프론트 구조적 부채 심각

---

## Phase 1. 타입 시스템 딥 다이브

### ✅ ts-rs 타입 브릿지 완벽 동기화

| 항목 | 결과 |
|------|------|
| `src-tauri/src/types/` TS 파일 수 | 57 |
| `src/types/` TS 파일 수 | 57 |
| 파일 diff | **0건** — 완전 일치 |
| `export_to` 경로 통일 | ✅ 전부 `../src/types/` |

### 🟡 `any` / `unknown` 사용: 8건 (전부 `client.ts` 타입가드)

| 패턴 | 건수 | 판정 |
|------|------|------|
| `value: unknown` (타입가드 매개변수) | 7 | ✅ 정상 — 런타임 타입 검증용 |
| `error: unknown` (catch 블록) | 1 | ✅ 정상 — TS strict 패턴 |

→ **타입 사각지대 없음**. 단, `client.ts` 931줄에 타입가드가 8개 밀집 — 리팩토링 시 유틸 분리 권장.

---

## Phase 2. 아키텍처 경계 침범 탐색

### ✅ 계층 분리 완벽

| 검사 항목 | 결과 |
|-----------|------|
| UI 컴포넌트(`components/ui/`)에서 `invoke()` 직접 호출 | **0건** ✅ |
| `fetch()` / `axios` 프론트 직접 사용 | **0건** ✅ |
| Rust `commands/`에서 `reqwest` 직접 사용 (api_client 우회) | **0건** ✅ |
| features 간 순환 의존 | **0건** ✅ |
| Command → api_client 경유 | **100%** (전부 `state.api_client` 경유) |

→ 헌법 §1.3 "React → invoke → Rust reqwest → API" 경로 **완벽 준수**.

### 🔴 발견: `dashboard/` 내부 아키텍처 붕괴

정상 분리된 페이지(`AdminConfigPage`, `AdminMembersPage`, `AdminSmsConfigPage`)와 구 대시보드(`Sections.tsx` + `useDashboardController.ts` + `model.ts`) 간 **아키텍처 단절**이 존재:

| 항목 | 정상 페이지 (Config/Members/SMS) | 구 대시보드 (Board/Poll/Popup/Permission/QA) |
|------|------|------|
| 스타일 | Tailwind 유틸리티 | 자체 CSS (App.css 390줄) |
| 테이블 | @tanstack/react-table | 수동 `<div>` 테이블 |
| 폼 | react-hook-form + zod | 수동 state + onChange |
| 서버 상태 | TanStack Query | 수동 invoke + setState |
| 줄수 | 200~550줄/페이지 | **1,524줄 단일 파일** |

→ **동일 앱 안에 2개의 아키텍처가 공존**. 체크리스트로는 잡히지 않는 **설계 이원화** 문제.

---

## Phase 3. 비즈니스 로직 무결성

### ✅ IPC Command 정합성 100%

| 항목 | 결과 |
|------|------|
| `pub async fn cmd_*` 선언 | **38개** |
| `lib.rs` `invoke_handler` 등록 | **38개** |
| 누락/유령 command | **0건** |

### ✅ Command 명명 일관성

```
cmd_auth_*            — 4개 (login, logout, refresh, status)
cmd_admin_board_*     — 5개 (get_list, get, create, update, delete)
cmd_admin_config_*    — 2개 (get, update)
cmd_admin_member_*    — 6개 (get_list, get, update, update_level, delete + me_get)
cmd_admin_permission_* — 3개 (get_list, save, delete)
cmd_admin_poll_*      — 5개 (get_list, get, create, update, delete)
cmd_admin_popup_*     — 5개 (get_list, get, create, update, delete)
cmd_admin_qa_config_* — 2개 (get, update)
cmd_admin_sms_*       — 3개 (config_get, config_update, member_sync)
cmd_debug_*           — 2개 (runtime_info, log_tail)
cmd_system_*          — 1개 (health)
```

→ `cmd_admin_{domain}_{action}` 패턴 **완벽 통일**. 유일한 예외: `cmd_member_me_get` (admin 접두어 없음 — 의도적 구분, 적절).

### 🟠 boilerplate clone() 과다

모든 command 핸들러에 **동일한 clone 패턴**이 3~4줄 반복:

```rust
// 이 패턴이 38개 command 전부에 반복됨
let app_state = state.inner().clone();
let request_id = request_id.clone();
let app_state = app_state.clone();
```

→ **총 ~150줄의 순수 boilerplate**. 매크로 또는 헬퍼 함수로 추출 가능.

---

## Phase 4. 보안 심층 탐색

### ✅ 토큰 보안 완벽

| 항목 | 결과 |
|------|------|
| `sessionStorage` / `localStorage` 프론트 사용 | **0건** ✅ |
| DebugDock에 `password`, `token`, `jwt`, `authorization` 노출 | **0건** ✅ |
| Rust 로깅에 토큰/비밀번호 기록 | **0건** ✅ |

### ✅ 부트스트랩 panic — 허용 범위

```rust
// lib.rs:45 — 유일한 panic
AppState::from_env().unwrap_or_else(|error| {
    panic!("failed to initialize app state: {}", ...)
})
```

→ 헌법 §5.3: "명시적 부트스트랩 치명 실패 외 런타임 panic 금지" — **적합**.

---

## Phase 5. 성능 & 확장성

### 🟡 `state.inner().clone()` 비용

- `AppState`가 `Clone` derive — 내부에 `reqwest::Client`, `RuntimeConfig` 등 포함
- `reqwest::Client`는 `Arc` 기반이라 clone 저렴하지만, 매 command 호출마다 전체 state clone은 의도가 불명확
- **권장**: `Arc<AppState>` 패턴 도입하거나 `&AppState` 참조 직접 전달

### 🟡 Vite 번들 최적화 미확인

- `vite.config.ts` 커스텀 chunk splitting 미설정
- React 19 + shadcn + TanStack Query + react-router 전부 단일 번들 가능성
- 클라이언트 앱이라 CDN 불필요하지만, 초기 로딩 속도에 영향

---

## Phase 6. 코드 일관성 & 냄새

### 🟡 dashboard → features 이전 잔재

| 파일 | 역할 | 이전 상태 |
|------|------|-----------|
| `features/dashboard/Sections.tsx` | 5개 도메인 UI | ❌ 미이전 |
| `features/dashboard/model.ts` | 5개 도메인 타입/유틸 | ❌ 미이전 |
| `features/dashboard/useDashboardController.ts` | 5개 도메인 컨트롤러 | ❌ 미이전 |
| `features/dashboard/DashboardView.tsx` | 리스트 렌더 | ❌ 미이전 |
| `features/dashboard/DashboardHeader.tsx` | 헤더 | ❌ 미이전 |
| `features/dashboard/DashboardSidebar.tsx` | 사이드바 | ❌ 미이전 |
| `features/dashboard/MembersSection.tsx` | 회원 섹션 | ❌ 미이전 (AdminMembersPage와 중복) |
| `features/dashboard/FormFields.tsx` | 폼 필드 | 공유 util → components/로 이전 가능 |
| `features/dashboard/domains.ts` | 도메인 열거 | 라우터로 흡수 가능 |
| `features/dashboard/renderActiveDomain.tsx` | 도메인 분기 | 라우터로 대체 완료 (LegacyDomainBridge) |

→ `features/dashboard/` 디렉토리 **전체**가 레거시. 개별 도메인 페이지로 이전 후 삭제 대상.

### 🟡 Sonner(Toast) 미사용

`sonner@2.0.7` 설치 → `import` **0건**. RFC 7807 에러 Toast 미구현.

---

## 예상치 못한 발견 (체크리스트 너머)

### 🔴 D-1. 동일 앱 내 2개 아키텍처 공존

정형 감사에서 "God File"로 분류했던 문제의 **근본 원인**은 단순 파일 크기가 아님.
**정상 패턴**(Config/Members/SMS)과 **구 패턴**(Board/Poll/Popup/Permission/QA)이 **완전히 다른 설계**로 공존하는 것 자체가 문제.
→ 신규 도메인 추가 시 어느 패턴을 따를지 혼란. AI에게 시켜도 기존 코드 참조 시 구 패턴을 답습할 위험.

### 🟠 D-2. `MembersSection.tsx` (413줄) — 완전히 죽은 코드?

`features/dashboard/MembersSection.tsx`와 `features/members/AdminMembersPage.tsx`가 **동일 기능 이중 구현**:
- `AdminMembersPage.tsx` = 정상 경로 (TanStack Query + react-hook-form + DataTable)
- `MembersSection.tsx` = 구 대시보드 경로 (수동 state + HTML table)

→ `MembersSection.tsx`는 라우터에서 참조되지 않으면 **죽은 코드** 가능성 높음.

### 🟠 D-3. Error 타입 382줄 — 과도한 세분화?

`error.rs` 382줄에 에러 `enum`이 얼마나 세분화되어 있는지 점검 필요.
각 도메인별 에러를 모두 1개 enum에 넣으면 God Enum이 됨.

---

## 구조적 제언

### 1. `features/dashboard/` 전체 해체 (최우선)

```
features/dashboard/  ← 삭제 대상
  Sections.tsx (1524줄) → features/boards/, features/permissions/, features/polls/, features/popups/, features/qa-config/
  model.ts (1151줄) → 각 도메인별 form.ts
  useDashboardController.ts (1149줄) → 각 도메인별 use-*.ts hook
  MembersSection.tsx (413줄) → 삭제 (AdminMembersPage와 중복)
  DashboardView/Header/Sidebar → 삭제 (AppShell이 대체 완료)
```

### 2. Command 보일러플레이트 매크로화

```rust
// Before (38회 반복)
let app_state = state.inner().clone();
let request_id = crate::request_id::generate();
// ...clone 3줄...

// After (매크로)
cmd_setup!(state => app_state, request_id);
```

### 3. App.css 제거 → Tailwind 통일

`LegacyDomainBridge` 해체 완료 시 `App.css` 390줄 자동 제거 가능.
