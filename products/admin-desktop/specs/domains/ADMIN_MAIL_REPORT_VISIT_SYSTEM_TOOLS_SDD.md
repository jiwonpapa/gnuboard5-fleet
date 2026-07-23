---
doc_type: support
status: active
owner: rust-admin
source_of_truth: false
ai_default_include: true
last_reviewed: 2026-03-13
review_cycle_days: 30
bounded_context: mail-report-visit-system-tools
---
# ADMIN_MAIL_REPORT_VISIT_SYSTEM_TOOLS_SDD

이 문서는 `mails`, `reports`, `visits`, `system-tools` 관리자 작업면의 지원 설계 문서입니다.

## 1. 목표

- `mails` 작업면에서 메일 템플릿/수신자/발송 흐름을 관리합니다.
- `reports` 작업면에서 신고 목록/통계/처리를 수행합니다.
- `visits` 작업면에서 통계, 검색, 삭제 흐름을 분리 관리합니다.
- `system-tools` 작업면에서 PHP info, Browscap 상태/업데이트/변환을 안전하게 호출합니다.

## 2. 계약 표면

Canonical OpenAPI:
- `/Users/neojins/workspace/gnuboard5/php/api/docs/openapi.yaml`

주요 엔드포인트:
- `GET/POST/PUT/DELETE /admin/mails`
- `GET /admin/mails/recipients`
- `POST /admin/mails/test`
- `GET /admin/reports`
- `GET /admin/reports/stats`
- `PUT /admin/reports/{report_id}`
- `GET /admin/visits/stats`
- `GET /admin/visits/search`
- `DELETE /admin/visits`
- `GET /admin/system/phpinfo`
- `GET /admin/system/browscap`
- `POST /admin/system/browscap/update`
- `POST /admin/system/browscap/convert`

## 3. Rust 작업면 경계

관련 feature:
- `g5-admin/src/features/mails`
- `g5-admin/src/features/reports`
- `g5-admin/src/features/visits`
- `g5-admin/src/features/system-tools`

관련 command:
- `g5-admin/src-tauri/src/commands/mail/*`
- `g5-admin/src-tauri/src/commands/report.rs`
- `g5-admin/src-tauri/src/commands/visit.rs`
- `g5-admin/src-tauri/src/commands/system_tools.rs`

## 4. 상태/오류 원칙

- 메일 템플릿 작업과 실제 발송 action은 같은 화면이지만 다른 mutation ownership으로 유지합니다.
- reports, visits는 조회 surface와 destructive action surface를 분리합니다.
- system-tools는 read/maintenance action을 함께 제공하되, 실패 메시지는 일반 CRUD와 다른 운영 도구 문맥으로 구분합니다.

## 최소 smoke checklist

- `mails` 화면에서 템플릿 목록/상세/수신자 조회/발송 action이 한 작업면에서 닫힙니다.
- `mails` mutation 후 목록과 편집 상태가 다시 hydrate 됩니다.
- `reports` 목록과 통계가 같이 조회되고 상태 변경 후 목록이 갱신됩니다.
- `visits` stats/search/delete 세 화면이 각각 route 분리된 상태로 동작합니다.
- `system-tools`에서 PHP info 조회와 Browscap 상태/업데이트/변환 action이 구분 표시됩니다.
- 운영 도구 실패는 diagnostics에서 일반 관리자 CRUD와 다른 target으로 남습니다.
