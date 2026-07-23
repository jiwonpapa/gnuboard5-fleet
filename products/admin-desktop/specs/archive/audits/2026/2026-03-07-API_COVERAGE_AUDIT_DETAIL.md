# API 커버리지 감사 — 2026-03-07

> 기준: `php/api/docs/openapi.yaml` (OpenAPI `paths` 섹션)
>
> 범위: `/admin` prefix API 기준 + Tauri 명령(`cmd_*`) 매핑

## 1) 전체 요약

- 기준 admin 오퍼레이션: **181건**
- Rust/Tauri 실제 커버: **30건**
- 구현률: **16.57%** (`30 / 181`)
- 미구현: **151건**

## 2) 구현된 Admin API (30건)

| 커맨드 | Method | Path |
|---|---|---|
| `cmd_admin_board_get_list` | `GET` | `/admin/boards` |
| `cmd_admin_board_create` | `POST` | `/admin/boards` |
| `cmd_admin_board_get` | `GET` | `/admin/boards/{id}` |
| `cmd_admin_board_delete` | `DELETE` | `/admin/boards/{id}` |
| `cmd_admin_board_update` | `PUT` | `/admin/boards/{id}` |
| `cmd_admin_config_get` | `GET` | `/admin/config` |
| `cmd_admin_config_update` | `PUT` | `/admin/config` |
| `cmd_admin_member_get_list` | `GET` | `/admin/members` |
| `cmd_admin_member_get` | `GET` | `/admin/members/{id}` |
| `cmd_admin_member_update_level` | `PATCH` | `/admin/members/{id}/level` |
| `cmd_admin_member_update` | `PATCH` | `/admin/members/{id}` |
| `cmd_admin_member_delete` | `DELETE` | `/admin/members/{id}` |
| `cmd_admin_permission_get_list` | `GET` | `/admin/system/auths` |
| `cmd_admin_permission_save` | `POST` | `/admin/system/auths` |
| `cmd_admin_permission_delete` | `DELETE` | `/admin/system/auths/{id}/{id}` |
| `cmd_admin_poll_get_list` | `GET` | `/admin/system/polls` |
| `cmd_admin_poll_create` | `POST` | `/admin/system/polls` |
| `cmd_admin_poll_get` | `GET` | `/admin/system/polls/{id}` |
| `cmd_admin_poll_update` | `PUT` | `/admin/system/polls/{id}` |
| `cmd_admin_poll_delete` | `DELETE` | `/admin/system/polls/{id}` |
| `cmd_admin_popup_get_list` | `GET` | `/admin/system/popups` |
| `cmd_admin_popup_create` | `POST` | `/admin/system/popups` |
| `cmd_admin_popup_get` | `GET` | `/admin/system/popups/{id}` |
| `cmd_admin_popup_update` | `PUT` | `/admin/system/popups/{id}` |
| `cmd_admin_popup_delete` | `DELETE` | `/admin/system/popups/{id}` |
| `cmd_admin_qa_config_get` | `GET` | `/admin/system/qa-config` |
| `cmd_admin_qa_config_update` | `PUT` | `/admin/system/qa-config` |
| `cmd_admin_sms_config_get` | `GET` | `/admin/sms/config` |
| `cmd_admin_sms_config_update` | `PUT` | `/admin/sms/config` |
| `cmd_admin_sms_member_sync` | `POST` | `/admin/sms/member-sync` |

## 3) 오구현(범위 이탈) 점검

> `오구현` 정의: 현재 커맨드가 사용 중인 네트워크 경로가 OpenAPI에 정의되지 않은 경우

- 오구현(미정의 API 호출): **0건**
- 단, `/admin` 범위를 벗어난 호출은 존재함(기능상 사용 중):

| 커맨드 | 오퍼레이션 |
|---|---|
| `cmd_auth_login` | `POST /auth/login`, `GET /members/me` |
| `cmd_auth_status` | `GET /members/me` |
| `cmd_member_me_get` | `GET /members/me` |
| `cmd_auth_refresh` | `POST /auth/refresh` |
| `cmd_auth_logout` | `POST /auth/logout` |

해당 5개 경로는 OpenAPI 전체( `/admin` 제외)에는 정의돼 있으며, 인증 플로우용 보조 호출임.

## 4) 미구현 리스트 (151건)

- `/admin` 영역에서 현재 151건 미구현
- 항목 수 정렬: 그룹별 합산

| 그룹 | 미구현 수 |
|---|---:|
| `auth` | 3 |
| `board-groups` | 9 |
| `boards` | 2 |
| `contents` | 5 |
| `faq-masters` | 9 |
| `faqs` | 5 |
| `groups` | 8 |
| `layouts` | 8 |
| `mail-tests` | 1 |
| `mails` | 8 |
| `members` | 5 |
| `menus` | 7 |
| `points` | 7 |
| `polls` | 5 |
| `popular` | 3 |
| `popups` | 5 |
| `push` | 2 |
| `qa` | 1 |
| `reports` | 3 |
| `sms` | 34 |
| `system` | 17 |
| `visits` | 3 |
| `write-count` | 1 |

### 누락 상세 (Method + Path)

- GET /admin/auth
- DELETE /admin/auth/{id}
- PUT /admin/auth/{id}
- GET /admin/board-groups
- POST /admin/board-groups
- DELETE /admin/board-groups/{id}
- GET /admin/board-groups/{id}
- PATCH /admin/board-groups/{id}
- PUT /admin/board-groups/{id}
- GET /admin/board-groups/{id}/members
- POST /admin/board-groups/{id}/members
- DELETE /admin/board-groups/{id}/members/{id}
- DELETE /admin/boards/new-posts
- POST /admin/boards/{id}/copy
- GET /admin/contents
- POST /admin/contents
- DELETE /admin/contents/{id}
- GET /admin/contents/{id}
- PUT /admin/contents/{id}
- GET /admin/faq-masters
- POST /admin/faq-masters
- DELETE /admin/faq-masters/{id}
- GET /admin/faq-masters/{id}
- PUT /admin/faq-masters/{id}
- DELETE /admin/faq-masters/{id}/footer-image
- POST /admin/faq-masters/{id}/footer-image
- DELETE /admin/faq-masters/{id}/header-image
- POST /admin/faq-masters/{id}/header-image
- GET /admin/faqs
- POST /admin/faqs
- DELETE /admin/faqs/{id}
- GET /admin/faqs/{id}
- PUT /admin/faqs/{id}
- GET /admin/groups
- POST /admin/groups
- DELETE /admin/groups/{id}
- GET /admin/groups/{id}
- PUT /admin/groups/{id}
- GET /admin/groups/{id}/members
- POST /admin/groups/{id}/members
- DELETE /admin/groups/{id}/members/{id}
- GET /admin/layouts
- GET /admin/layouts/{id}
- PUT /admin/layouts/{id}
- PATCH /admin/layouts/{id}/reorder
- PATCH /admin/layouts/{id}/widgets
- POST /admin/layouts/{id}/widgets
- DELETE /admin/layouts/{id}/widgets/{id}
- PATCH /admin/layouts/{id}/widgets/{id}
- POST /admin/mail-tests
- GET /admin/mails
- POST /admin/mails
- GET /admin/mails/recipients
- POST /admin/mails/templates
- POST /admin/mails/test
- DELETE /admin/mails/{id}
- GET /admin/mails/{id}
- PUT /admin/mails/{id}
- GET /admin/members/excel
- DELETE /admin/members/{id}/icon
- POST /admin/members/{id}/icon
- DELETE /admin/members/{id}/image
- POST /admin/members/{id}/image
- GET /admin/menus
- PATCH /admin/menus
- POST /admin/menus
- PATCH /admin/menus/reorder
- DELETE /admin/menus/{id}
- GET /admin/menus/{id}
- PUT /admin/menus/{id}
- DELETE /admin/points
- GET /admin/points
- POST /admin/points
- POST /admin/points/deduct
- POST /admin/points/expire
- POST /admin/points/grant
- GET /admin/points/summary
- GET /admin/polls
- POST /admin/polls
- DELETE /admin/polls/{id}
- GET /admin/polls/{id}
- PATCH /admin/polls/{id}
- DELETE /admin/popups
- GET /admin/popular
- GET /admin/popular/rank
- GET /admin/popups
- POST /admin/popups
- DELETE /admin/popups/{id}
- GET /admin/popups/{id}
- PATCH /admin/popups/{id}
- POST /admin/push/messages
- POST /admin/push/send
- DELETE /admin/qa
- GET /admin/reports
- GET /admin/reports/stats
- PATCH /admin/reports/{id}
- GET /admin/sms/contact-groups
- POST /admin/sms/contact-groups
- DELETE /admin/sms/contact-groups/{id}
- GET /admin/sms/contact-groups/{id}
- PUT /admin/sms/contact-groups/{id}
- DELETE /admin/sms/contact-groups/{id}/contacts
- POST /admin/sms/contact-groups/{id}/move
- GET /admin/sms/contacts
- POST /admin/sms/contacts
- POST /admin/sms/contacts/batch
- GET /admin/sms/contacts/export
- POST /admin/sms/contacts/import
- DELETE /admin/sms/contacts/{id}
- GET /admin/sms/contacts/{id}
- PUT /admin/sms/contacts/{id}
- GET /admin/sms/history/batches
- GET /admin/sms/history/batches/{id}
- POST /admin/sms/history/batches/{id}/resend-all
- POST /admin/sms/history/batches/{id}/resend-failures
- GET /admin/sms/history/deliveries
- POST /admin/sms/messages
- GET /admin/sms/template-groups
- POST /admin/sms/template-groups
- DELETE /admin/sms/template-groups/{id}
- GET /admin/sms/template-groups/{id}
- PUT /admin/sms/template-groups/{id}
- POST /admin/sms/template-groups/{id}/move
- DELETE /admin/sms/template-groups/{id}/templates
- GET /admin/sms/templates
- POST /admin/sms/templates
- POST /admin/sms/templates/batch
- DELETE /admin/sms/templates/{id}
- GET /admin/sms/templates/{id}
- PUT /admin/sms/templates/{id}
- GET /admin/system/browscap
- POST /admin/system/browscap/convert
- POST /admin/system/browscap/update
- GET /admin/system/mail-recipients
- GET /admin/system/mails
- POST /admin/system/mails/send
- POST /admin/system/mails/test
- POST /admin/system/maintenance/cache-files/purge
- POST /admin/system/maintenance/captcha-files/purge
- POST /admin/system/maintenance/member-list-files/purge
- POST /admin/system/maintenance/session-files/purge
- POST /admin/system/maintenance/thumbnail-files/purge
- GET /admin/system/phpinfo
- GET /admin/system/theme
- PUT /admin/system/theme
- GET /admin/system/themes
- GET /admin/system/themes/{id}
- DELETE /admin/visits
- GET /admin/visits/search
- GET /admin/visits/stats
- GET /admin/write-count/stats

## 5) 권고

1. 미구현 151건 중 우선순위를 두어 치환해야 할 영역(예: `polls`, `members`, `groups`, `sms`, `system`)부터 순차 구현.
2. 커맨드/엔드포인트 매핑은 `/admin` 기준과 인증/기타 공용 API를 분리해 문서화해 오해를 막을 것.
3. `cmd_*`별로 실제 호출하는 OpenAPI `operationId`를 같이 관리해 오구현(정의 없는 경로) 자동 점검이 가능하도록 CI 게이트화.
