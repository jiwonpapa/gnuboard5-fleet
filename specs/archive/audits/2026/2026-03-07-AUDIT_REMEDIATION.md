# AUDIT_REMEDIATION_2026-03-07

이 문서는 [2026-03-07-AUDIT_REPORT.md](/Users/neojins/workspace/gnuboard5/rust/specs/audits/2026-03-07-AUDIT_REPORT.md)의 후속 조치 기록이다. 원 감사 문서는 증적으로 유지하고, 이 문서는 실제 코드 반영 결과만 기록한다.

## 해결된 항목

- `C-1 God File 4건`
  - `Sections.tsx`, `model.ts`, `useDashboardController.ts` 제거
  - `src/api/client.ts`는 barrel로 축소하고 `src/api/client/*` 모듈로 분할
- `C-2 shadcn/ui + @tanstack/react-table 미활용`
  - route-native 리스트는 공통 `AdminDataTable`로 정리했고 내부 구현을 `@tanstack/react-table` 기반으로 전환
- `C-3 이원 스타일링 시스템`
  - `App.css` 제거
  - 관리자 셸/도메인 화면은 Tailwind + 공통 UI 컴포넌트 기준만 유지
- `C-4 LegacyDomainBridge 의존도`
  - `LegacyDomainBridge` 제거
  - `/settings/qa`, `/permissions`, `/boards`, `/operations/polls`, `/operations/popups`는 실제 route-native 페이지로 교체
- `H-1 window.confirm()`
  - active 관리자 페이지 기준 삭제 액션을 `ConfirmActionDialog`로 교체
- `H-4 DebugDock 434줄`
  - compact tray, panel, shared components로 분리
- `H-5 AppShell.tsx 360줄`
  - header/sidebar/hook/shell util로 분리
- `M-1 App.css 390줄`
  - 삭제
- `M-2 ts-rs 타입 파일 이중 배치`
  - export 경로를 `g5-admin/src/types` 단일 경로로 조정
  - `g5-admin/src-tauri/src/types`는 제거하고 임시 백업으로 이동
- `H-2 react-hook-form + zod 미적용 도메인`
  - `Permissions`, `QA Config`, `Boards`, `Polls`, `Popups`를 모두 `react-hook-form + zod` 기준으로 재정렬
  - 공통 RHF field wrapper를 `features/admin/shared/AdminFormFields.tsx`에 추가
- `페이지 파일 300줄 엄수`
  - `Permissions`, `QA Config`, `Boards`, `Polls`, `Popups` 도메인을 `page + hook + workspace` 구조로 분리
  - 현재 route-native 페이지/훅/워크스페이스 파일은 모두 300줄 이하로 재정렬
- `프론트 번들 크기`
  - `vite.config.ts`에 `manualChunks`를 도입해 `react-core / tanstack / ui-vendor / vendor`로 청크를 분리
  - 기존 대형 단일 청크 경고를 제거

## 부분 해결 / 후속 과제

- `Rust command clone boilerplate`
  - deep audit가 지적한 `next_request_id + state.inner().clone() + closure clone` 반복은 아직 남아 있다.
  - 후속 TODO: `T2-052`

## 검증

- `pnpm --dir g5-admin lint`
- `pnpm --dir g5-admin test`
- `pnpm --dir g5-admin build`
- `cargo check --manifest-path g5-admin/src-tauri/Cargo.toml`
- `cargo test --manifest-path g5-admin/src-tauri/Cargo.toml`
