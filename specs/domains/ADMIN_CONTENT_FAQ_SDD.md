---
doc_type: support
status: active
owner: rust-admin
source_of_truth: false
ai_default_include: true
last_reviewed: 2026-03-13
review_cycle_days: 30
bounded_context: content-faq
---
# ADMIN_CONTENT_FAQ_SDD

이 문서는 `contents`, `faqs` route-native 관리자 작업면의 지원 설계 문서입니다.
작업 상태는 `specs/TODO.md`, 감사 운영은 `specs/AUDIT_SYSTEM.md`를 따릅니다.

## 1. 목표

- `/boards/contents`에서 콘텐츠 목록/상세/저장/삭제를 안정적으로 수행합니다.
- `/boards/faqs`에서 FAQ 마스터, FAQ 항목, 헤더/푸터 이미지 작업을 한 작업면에서 관리합니다.

## 2. 계약 표면

Canonical OpenAPI:
- `/Users/neojins/workspace/gnuboard5/php/api/docs/openapi.yaml`

주요 엔드포인트:
- `GET/POST/PUT/DELETE /admin/contents`
- `GET/POST/PUT/DELETE /admin/faq-masters`
- `POST/DELETE /admin/faq-masters/{fm_id}/header-image`
- `POST/DELETE /admin/faq-masters/{fm_id}/footer-image`
- `GET/POST/PUT/DELETE /admin/faqs`

## 3. Rust 작업면 경계

관련 feature:
- `g5-admin/src/features/contents`
- `g5-admin/src/features/faqs`

관련 command:
- `g5-admin/src-tauri/src/commands/content.rs`
- `g5-admin/src-tauri/src/commands/faq/*`

UI 책임:
- contents: 목록/상세/저장/삭제
- faqs: 마스터 CRUD, 문항 CRUD, 이미지 업로드/삭제, 삭제 dialog

## 4. 상태/오류 원칙

- 모든 mutation은 성공 후 목록 query를 invalidate 합니다.
- 상세 편집은 선택된 리소스 기준으로만 hydrate 합니다.
- 이미지 작업 실패는 일반 저장 실패와 분리된 사용자 메시지로 노출합니다.
- schema/계약 drift가 생기면 raw field fallback이 아니라 감사와 문서에서 먼저 잡아야 합니다.

## 최소 smoke checklist

- `contents` 목록 진입 시 기본 목록이 hydrate 됩니다.
- `contents` 저장 시 생성/수정 후 목록이 다시 조회됩니다.
- `contents` 삭제 시 선택 상태와 목록이 함께 갱신됩니다.
- `faqs` 마스터 목록과 항목 목록이 같은 작업면에서 전환됩니다.
- `faqs` 마스터 저장/삭제 후 목록이 다시 hydrate 됩니다.
- `faqs` 이미지 업로드/삭제가 개별 mutation으로 분리 동작합니다.
- `faqs` 항목 저장/삭제 후 목록과 편집 상태가 일관되게 갱신됩니다.
