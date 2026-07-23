---
doc_type: support
status: active
owner: rust-admin
source_of_truth: false
ai_default_include: true
last_reviewed: 2026-03-13
review_cycle_days: 30
bounded_context: menu-layout-theme
---
# ADMIN_MENU_LAYOUT_THEME_SDD

이 문서는 `menus`, `layouts`, `theme` 관리자 작업면의 지원 설계 문서입니다.

## 1. 목표

- `/environment/menus`에서 메뉴 CRUD와 재정렬을 안전하게 수행합니다.
- `/tools/layouts`에서 레이아웃과 위젯 구성을 관리합니다.
- `/environment/theme`에서 현재 테마 설정과 설치 테마 조회를 제공합니다.

## 2. 계약 표면

Canonical OpenAPI:
- `/Users/neojins/workspace/gnuboard5/php/api/docs/openapi.yaml`

주요 엔드포인트:
- `GET/POST/PUT/DELETE/PATCH /admin/menus`
- `GET/PUT /admin/system/theme`
- `GET /admin/system/themes`
- `GET /admin/system/themes/{theme}`
- `GET /admin/layouts/{page_id}`
- `PUT /admin/layouts/{page_id}`
- `POST/PUT/DELETE/PATCH /admin/layouts/{page_id}/widgets`

## 3. Rust 작업면 경계

관련 feature:
- `g5-admin/src/features/menus`
- `g5-admin/src/features/layouts`
- `g5-admin/src/features/theme`

관련 command:
- `g5-admin/src-tauri/src/commands/menu/*`
- `g5-admin/src-tauri/src/commands/layout/*`
- `g5-admin/src-tauri/src/commands/theme.rs`

## 4. 상태/오류 원칙

- 메뉴/레이아웃 reorder는 일반 수정과 분리된 action으로 취급합니다.
- 테마 조회와 설정 저장은 같은 route에서 다루되, 설치 테마 상세는 조회 책임으로만 유지합니다.
- 레거시 reorder 호환 경로는 감사에서 별도 target으로 남기고 UI owner는 하나만 둡니다.

## 최소 smoke checklist

- `menus` 목록, 상세, 저장, 삭제, reorder가 한 작업면에서 닫힙니다.
- `menus` mutation 뒤 목록과 선택 상태가 다시 hydrate 됩니다.
- `layouts` 페이지 진입 시 현재 page layout과 widget 목록이 hydrate 됩니다.
- `layouts` 위젯 추가/수정/삭제/reorder가 각각 독립 action으로 동작합니다.
- `theme` 화면에서 현재 설정 조회와 저장이 동작합니다.
- `theme` 화면에서 설치 테마 목록과 개별 테마 조회가 분리 표시됩니다.
