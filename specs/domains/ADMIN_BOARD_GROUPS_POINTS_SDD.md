---
doc_type: support
status: active
owner: rust-admin
source_of_truth: false
ai_default_include: true
last_reviewed: 2026-03-13
review_cycle_days: 30
bounded_context: board-groups-points
---
# ADMIN_BOARD_GROUPS_POINTS_SDD

이 문서는 `board-groups`, `points` 관리자 작업면의 지원 설계 문서입니다.

## 1. 목표

- `/boards/groups`에서 게시판 그룹과 멤버 매핑을 안정적으로 관리합니다.
- `/members/points`에서 포인트 목록, 요약, 지급/차감/만료/삭제 작업을 수행합니다.

## 2. 계약 표면

Canonical OpenAPI:
- `/Users/neojins/workspace/gnuboard5/php/api/docs/openapi.yaml`

주요 엔드포인트:
- `GET/POST/PUT/PATCH/DELETE /admin/board-groups`
- `GET/POST/DELETE /admin/board-groups/{gr_id}/members`
- `GET /admin/points`
- `GET /admin/points/summary`
- `POST /admin/points`
- `POST /admin/points/grant`
- `POST /admin/points/deduct`
- `POST /admin/points/expire`
- `DELETE /admin/points`

## 3. Rust 작업면 경계

관련 feature:
- `g5-admin/src/features/board-groups`
- `g5-admin/src/features/points`

관련 command:
- `g5-admin/src-tauri/src/commands/board_group/*`
- `g5-admin/src-tauri/src/commands/point/*`

## 4. 상태/오류 원칙

- board-group legacy 경로와 canonical 경로는 감사에서 모두 추적하되 UI owner는 board-group 작업면 하나로 유지합니다.
- point 지급/차감/만료는 목록 조회와 분리된 action command로 취급합니다.
- destructive mutation은 확인 dialog 또는 명시적 action state를 거쳐야 합니다.

## 최소 smoke checklist

- `board-groups` 목록/상세/생성/수정/삭제가 닫힙니다.
- `board-groups` 멤버 조회/추가/삭제가 그룹 상세 문맥에서만 동작합니다.
- `points` 목록과 summary가 같은 진입에서 hydrate 됩니다.
- `points` 지급/차감/만료/삭제 action 이후 목록과 summary가 다시 갱신됩니다.
- legacy point action target과 canonical target이 diagnostics에서 구분됩니다.
