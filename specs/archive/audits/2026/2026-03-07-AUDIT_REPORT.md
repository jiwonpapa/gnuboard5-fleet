# 🔍 러스트 어드민 프로젝트 감사 보고서 — 2026-03-07

> **헌법 기준**: v1.4.0 | **범위**: src-tauri/ + src/ 전체 (18,567줄)

---

## 📋 결론: 🔴 구조 리팩토링 필요 — Critical 4건, High 5건, Medium 3건

Rust 코어는 양호. **프론트엔드 대시보드 설계가 헌법을 심각하게 위반**하고 있음.

---

## 🔴 Critical (즉시 시정)

### C-1. God File 4건 — 헌법 §6.2 위반 (300줄 제한)

| 파일 | 줄수 | 상한 | 초과율 |
|------|------|------|--------|
| `Sections.tsx` | **1,524줄** | 300줄 | **508%** |
| `model.ts` | **1,151줄** | 300줄 | **384%** |
| `useDashboardController.ts` | **1,149줄** | 300줄 | **383%** |
| `client.ts` (api/) | **931줄** | 500줄 | **186%** |

**근본 원인**: 모든 도메인(Permission, QaConfig, Poll, Popup, Board)의 CRUD 로직이 **단일 대시보드 컨트롤러**에 뭉쳐있음. 개별 도메인 페이지로 분리해야 함.

### C-2. shadcn/ui + @tanstack/react-table 미활용 — 헌법 §4.3 위반

- **설치된 패키지**: `@tanstack/react-table` 8.21, shadcn/ui 컴포넌트 8개
- **실제 사용**: Members 페이지에서만 DataTable 1건. 나머지 **전부 수동 HTML div 테이블**
- `Sections.tsx`의 테이블은 전부 `<div className="member-row">` 수동 구현
- 헌법 §4.3: "모든 CRUD 테이블은 shadcn/ui + @tanstack/react-table 패턴 통일" 위반

### C-3. 이원 스타일링 시스템 — 아키텍처 혼란

| 파일 | 스타일 방식 |
|------|-----------|
| `App.css` (390줄) | **자체 CSS 클래스** (`.card`, `.member-row`, `.dashboard-header`...) |
| `AppShell.tsx` | **Tailwind 유틸리티** (`className="flex flex-col gap-5..."`) |
| `AdminConfigPage.tsx` | **Tailwind + shadcn/ui** 정상 사용 |
| `Sections.tsx` | **자체 CSS만** (Tailwind 0%) |

→ **동일 앱 안에서 스타일링 체계가 2개로 분리**됨. AppShell/Config/Members는 Tailwind, Dashboard 도메인들은 자체 CSS.

### C-4. LegacyDomainBridge 의존도 — 7/9 라우트

`router.tsx`에서 **7개 라우트 중 5개가 `LegacyDomainBridge`** 래핑:
- `/settings/qa` → LegacyDomainBridge (qa-config)
- `/boards` → LegacyDomainBridge (boards)
- `/permissions` → LegacyDomainBridge (permissions)
- `/operations/polls` → LegacyDomainBridge (polls)
- `/operations/popups` → LegacyDomainBridge (popups)

→ 이들은 구 대시보드(Sections.tsx + useDashboardController.ts)를 그대로 wrapping만 한 것. **실제 route 기반 분리가 안 됨**.

---

## 🟠 High (다음 스프린트 시정)

### H-1. `window.confirm()` 6건 — UX 안티패턴

| 위치 | 내용 |
|------|------|
| `Sections.tsx:229` | 권한 삭제 확인 |
| `Sections.tsx:670` | 투표 삭제 확인 |
| `Sections.tsx:1053` | 팝업 삭제 확인 |
| `Sections.tsx:1477` | 게시판 삭제 확인 |
| `MembersSection.tsx:357` | 회원 삭제 확인 |
| `AdminMembersPage.tsx:359` | 회원 삭제 확인 |

→ shadcn/ui `AlertDialog` 컴포넌트로 교체 필요. OS 네이티브 confirm은 Tauri WebView에서 스타일 불일치.

### H-2. react-hook-form + zod 미적용 도메인

- **적용 완료**: Config, SMS, Members (3/8)
- **미적용 (수동 state 관리)**: Permission, QaConfig, Poll, Popup, Board (5/8)
- 헌법 §4.3: "폼 검증은 React Hook Form + Zod로 통일" 위반

### H-3. TanStack Query 미적용 도메인

- **적용 완료**: Config, SMS, Members
- **미적용 (useDashboardController 내 수동 invoke+setState)**: 나머지 5개 도메인
- 헌법 §4.3/§6.3 위반

### H-4. Debug Dock 434줄 — §6.2 근접 초과

- 현재 434줄로 300줄 기준 초과. 패널/리스트/상세를 분리 권장.

### H-5. AppShell.tsx 360줄 — §6.2 경계

- 헤더, 사이드바, 메인 콘텐츠가 한 파일에 결합. 360줄로 기준 초과.
- Header, Sidebar, ContentArea로 분리 권장.

---

## 🟡 Medium (개선 권장)

### M-1. `App.css` 자체 CSS 390줄 — Tailwind 전환 필요

- `legacy-domain-bridge` 전용 CSS 390줄이 `App.css`에 존재
- LegacyDomainBridge 도메인들을 개별 페이지로 분리하면 자연스럽게 제거 가능

### M-2. ts-rs 타입 파일 이중 배치

- **`src-tauri/src/types/`**: ts-rs가 생성한 TS 파일 (표준 위치)
- **`src/types/`**: 프론트에서 사용하는 TS 파일 (동일 내용 복사)
- 두 곳에 같은 파일이 존재 → 동기화 누락 위험. 헌법 §3.3의 `export_to` 경로를 `src/types/`로 통일 필요.

### M-3. Sonner(Toast) 미사용

- `sonner` 2.0 설치되었으나 `import` 0건. RFC 7807 에러 Toast 미구현.

---

## ✅ 양호 항목

| 항목 | 상태 |
|------|------|
| Rust `unwrap()` 금지 | ✅ 0건 |
| 문자열 보간형 에러 로그 금지 | ✅ 0건 |
| `fetch()` 직접 사용 금지 | ✅ 0건 (전부 `invoke()` 경유) |
| `thiserror` 에러 타입 | ✅ error.rs 382줄 |
| `tracing` 로깅 | ✅ 구현 |
| `token_store.rs` 보안 저장 | ✅ keyring/file 분리 |
| `runtime_config.rs` 설정 | ✅ 환경변수 override 지원 |
| `request_id` 추적 | ✅ 구현 |
| Tailwind 디자인 토큰 | ✅ oklch 기반 테마 시스템 |
| 헤더 스크롤 동작 | ✅ 헌법 specs/README 기준 충족 |

---

## 🎯 권장 리팩토링 순서

1. **LegacyDomainBridge 해체** → 각 도메인을 독립 페이지 + TanStack Query + react-hook-form + shadcn DataTable로 재구현
2. **God File 분리** → Sections.tsx → 도메인별 Section 컴포넌트, useDashboardController.ts → 도메인별 hook
3. **App.css 제거** → Tailwind 유틸리티로 전환
4. **window.confirm → AlertDialog**
5. **ts-rs export 경로 통일**
