# TDD / Coverage Audit — 2026-03-08

Date: 2026-03-08

## Scope

- `/Users/neojins/workspace/gnuboard5/php/api/v1/Admin/**`
- `/Users/neojins/workspace/gnuboard5/php/tests/Admin/**`
- `/Users/neojins/workspace/gnuboard5/rust/g5-admin/src/features/**`
- `/Users/neojins/workspace/gnuboard5/rust/g5-admin/src/debug/**`
- `/Users/neojins/workspace/gnuboard5/rust/g5-admin/vitest.critical.config.ts`

## Summary

- Rust 전체 관리자 테스트: `47 files`, `345 tests`, 전부 통과
- Rust 전체 커버리지: `statements 29.59%`, `branches 24.83%`, `functions 23.63%`, `lines 29.71%`
- Rust 크리티컬 회귀 게이트: `statements 84.67%`, `branches 75.30%`, `functions 80.61%`, `lines 84.76%`
- Rust 크리티컬 threshold: `84 / 75 / 80 / 84`
- PHP 전체 테스트: `418 tests`, `1782 assertions`, 전부 통과
- Admin OpenAPI 대비 Rust 메뉴 연결 endpoint: `130 / 180 = 72.2%`

## What Was Locked Down

### 1. Field parity regression tests

- PHP
  - `tests/Admin/Board/AdminBoardRepositoryTest.php`
  - `tests/Admin/Config/AdminConfigRepositoryTest.php`
  - `tests/Admin/Content/AdminContentRepositoryTest.php`
  - `tests/Admin/Group/AdminGroupServiceTest.php`
  - `tests/Admin/Member/AdminMemberServiceTest.php`
- Rust
  - `src/features/board-groups/AdminBoardGroupsPage.test.tsx`
  - `src/features/contents/AdminContentsPage.test.tsx`
  - `src/features/members/MemberDetailCard.test.tsx`

### 2. UX regression tests

- 상단 검색 / 주메뉴 sticky 진입
  - `src/features/layout/AppShellHeader.test.tsx`
  - `src/features/layout/useHeaderVisibility.test.tsx`
  - 검색 실패 toast, no-result `ArrowDown/ArrowUp`, 같은 경로 submit reset, `Escape`/outside click 닫힘, unknown route fallback, refresh toolbar reload, 개발모드 설명 숨김까지 포함
- AppShell 직접 컨텍스트 메뉴 / 캡처 실패 경로
  - `src/features/layout/AppShell.test.tsx`
- 캡처 theme token / stylesheet rule 회귀
  - `src/features/layout/theme-color-regression.test.ts`
  - `src/features/layout/capture-style-sanitizer.test.ts`
- AppShell context menu helper / selection 로직
  - `src/features/layout/app-shell-context-menu.test.ts`
- 레거시 메뉴 구조 고정
  - `src/features/layout/navigation.test.ts`
  - alias, hidden route, delivery label/description 전 케이스 포함
- 좌측 서브메뉴 / 현재 페이지 카드
  - `src/features/layout/AppShellSidebar.test.tsx`
- 디버그 독 compact / panel / full dock state
  - `src/debug/DebugDock.test.tsx`
  - `src/debug/DebugDockCompact.test.tsx`
  - `src/debug/DebugDockPanel.test.tsx`

### 3. Shared admin primitives

- `src/features/admin/shared/AdminDataTable.test.tsx`
- `src/features/admin/shared/AdminFormFields.test.tsx`
- `src/features/admin/shared/ConfirmActionDialog.test.tsx`
- `src/features/shared/SharedComponents.test.tsx`
- `AdminFormFields`는 읽기 전용 badge, debug info guard, controlled field validation message까지 포함
- `PageIntro.test.tsx`는 compact dev-mode off, hero no-aside 분기까지 포함

## Coverage Interpretation

### Rust overall coverage

- 수치가 `29%`대인 이유는 route-native 페이지, Tauri client wrapper, `AppShell.tsx`, `router.tsx`, 각 API client barrel이 아직 전수 테스트 범위에 들어가 있지 않기 때문입니다.
- 즉, 전체 커버리지는 현재 코드베이스 전수 계량값으로는 의미가 있지만, 회귀 방지 지표로 그대로 쓰기에는 너무 넓습니다.

### Rust critical gate

- 회귀가 실제로 자주 났던 영역만 따로 묶었습니다.
  - 관리자 공통 폼/테이블/확인 다이얼로그
  - 상단 헤더 검색 / 주메뉴 / sticky visibility
  - 좌측 서브메뉴
  - 디버그 독 compact/panel
  - parity가 중요했던 board-group / content / member edit surface
- 이 범위는 지금부터 PR/수정 때 깨지면 바로 막히도록 threshold를 `84 / 75 / 80 / 84`로 올려뒀습니다.

## PHP Coverage Status

- `vendor/bin/phpunit`는 정상 통과합니다.
- 그러나 `vendor/bin/phpunit --coverage-text`와 `php -d xdebug.mode=coverage vendor/bin/phpunit --coverage-text` 모두 `No code coverage driver available` 경고로 종료했습니다.
- `php -m` 기준으로 `xdebug` 확장은 보이지만, 현 CLI/PHPUnit 조합에서는 coverage driver가 실제 attach되지 않고 있습니다.
- 그래서 PHP는 현재 line coverage 수치를 신뢰할 수 없고, 테스트 통과 + admin parity 회귀 테스트로만 방어하고 있습니다.

## Commands Run

```bash
pnpm --dir /Users/neojins/workspace/gnuboard5/rust/g5-admin test
pnpm --dir /Users/neojins/workspace/gnuboard5/rust/g5-admin test:coverage
pnpm --dir /Users/neojins/workspace/gnuboard5/rust/g5-admin test:coverage:critical
pnpm --dir /Users/neojins/workspace/gnuboard5/rust/g5-admin lint
cargo check --manifest-path /Users/neojins/workspace/gnuboard5/rust/g5-admin/src-tauri/Cargo.toml
vendor/bin/phpunit
vendor/bin/phpunit --coverage-text --colors=never
php -d xdebug.mode=coverage vendor/bin/phpunit --coverage-text --colors=never
```

## Remaining Risks

1. Rust 전체 커버리지는 아직 낮습니다. route page와 API client wrapper까지 포함한 전수 테스트는 추가 작업이 필요합니다.
2. PHP coverage driver 문제를 해결하지 않으면 backend line coverage gate는 아직 걸 수 없습니다.
3. `AppShell.tsx` 자체의 Tauri bridge, 클립보드 권한 실패, 스크롤 복귀 루틴은 아직 direct unit coverage가 없습니다. 대신 색 파서 회귀는 `capture-style-sanitizer.test.ts`로 차단했습니다.
