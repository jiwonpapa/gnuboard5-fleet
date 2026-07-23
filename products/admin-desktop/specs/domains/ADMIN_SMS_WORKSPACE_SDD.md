---
doc_type: support
status: active
owner: rust-admin
source_of_truth: false
ai_default_include: true
last_reviewed: 2026-03-13
review_cycle_days: 30
bounded_context: sms
---
# ADMIN_SMS_WORKSPACE_SDD

이 문서는 `sms-contacts`, `sms-history`, `sms-messages`, `sms-templates` 작업면의 지원 설계 문서입니다.

## 1. 목표

- SMS 템플릿 그룹/템플릿 CRUD, 주소록 그룹/연락처 CRUD, 발송 이력 조회/재전송, 메시지 발송을 route-native 작업면에서 관리합니다.
- SMS 설정(`system`)은 [ADMIN_SMS_SDD](/Users/neojins/workspace/gnuboard5/rust/specs/domains/ADMIN_SMS_SDD.md)가 담당하고, 이 문서는 실제 운영 작업면을 다룹니다.

## 2. 계약 표면

Canonical OpenAPI:
- `/Users/neojins/workspace/gnuboard5/php/api/docs/openapi.yaml`

주요 엔드포인트:
- `GET/POST/PUT/DELETE /admin/sms/template-groups`
- `POST /admin/sms/template-groups/{fg_no}/move`
- `DELETE /admin/sms/template-groups/{fg_no}/templates`
- `GET/POST/PUT/DELETE /admin/sms/templates`
- `POST /admin/sms/templates/batch`
- `GET/POST/PUT/DELETE /admin/sms/contact-groups`
- `POST /admin/sms/contact-groups/{bg_no}/move`
- `DELETE /admin/sms/contact-groups/{bg_no}/contacts`
- `GET/POST/PUT/DELETE /admin/sms/contacts`
- `POST /admin/sms/contacts/batch`
- `POST /admin/sms/contacts/import`
- `GET /admin/sms/contacts/export`
- `GET /admin/sms/history/batches`
- `GET /admin/sms/history/deliveries`
- `POST /admin/sms/history/batches/{wr_no}/resend-failures`
- `POST /admin/sms/history/batches/{wr_no}/resend-all`
- `POST /admin/sms/messages`

## 3. Rust 작업면 경계

관련 feature:
- `g5-admin/src/features/sms-templates`
- `g5-admin/src/features/sms-contacts`
- `g5-admin/src/features/sms-history`
- `g5-admin/src/features/sms-messages`

관련 command:
- `g5-admin/src-tauri/src/commands/sms_template/*`
- `g5-admin/src-tauri/src/commands/sms_contact/*`
- `g5-admin/src-tauri/src/commands/sms_history/*`
- `g5-admin/src-tauri/src/commands/sms_message.rs`

## 4. 상태/오류 원칙

- 그룹 CRUD와 개별 템플릿/연락처 CRUD는 같은 화면에서도 별도 ownership으로 유지합니다.
- batch, import/export, resend 계열은 일반 CRUD와 다른 action diagnostics를 가집니다.
- history 조회와 resend action은 동일 route 축이지만 다른 command target으로 추적합니다.

## 최소 smoke checklist

- `sms-templates`에서 그룹 목록, 템플릿 목록, 편집기가 한 화면에서 닫힙니다.
- `sms-templates` group move/clear, template batch action이 일반 CRUD와 분리 동작합니다.
- `sms-contacts`에서 그룹 영역, 연락처 목록/편집, import/export 카드가 같이 렌더링됩니다.
- `sms-contacts` batch/import/export가 CRUD와 분리된 action target으로 수행됩니다.
- `sms-history`에서 batch/delivery 조회와 resend action이 분리 동작합니다.
- `sms-messages` 발송 action은 템플릿/주소록 상태와 분리된 command target으로 기록됩니다.
