# Rust Tauri ↔ PHP REST API 정합성 감사 — 2026-03-08

> **Rust cmd**: 188개 (`admin 180 + infra 8`)
> **PHP OpenAPI admin ops**: 181개
> **이번 exact alias pass 결과**: 감사 문서가 지적했던 legacy alias/method literal gaps를 command 경계에서 모두 구현했습니다.

## 1. 이번 턴에서 닫은 누락

| 항목 | 상태 | 비고 |
|------|------|------|
| Layout 8 ops | ✅ | `/admin/layouts*` 전부 command + hidden route-native page 구현 |
| Report 3 ops | ✅ | 목록/통계/상태변경 구현 |
| Push 2 ops | ✅ | `/admin/push/messages`, `/admin/push/send` 둘 다 등록 |
| Board copy/new-posts | ✅ | 게시판 작업면에서 즉시 실행 가능 |
| Member icon/image 4 ops | ✅ | 회원 상세 카드에 업로드/삭제 UI 반영 |
| `GET/PUT/DELETE /admin/auth*` | ✅ | 묶음형 auth alias command 추가 |
| `DELETE /admin/qa` | ✅ | bulk delete command 추가 |
| Board 필드 parity 44개 | ✅ | `extra` map + 동적 섹션 렌더링으로 저장/조회 경계 반영 |
| Config 필드 parity 105개 | ✅ | `extra` map + 동적 섹션 렌더링으로 저장/조회 경계 반영 |
| Exact alias parity 26 cmds | ✅ | `/admin/groups*`, `/admin/polls*`, `/admin/popups*`, `/admin/mails/test`, `/admin/mail-tests`, `/admin/points/{grant,deduct,expire}`, `/admin/menus/reorder`, `/admin/layouts/{page_id}/reorder`, `PATCH /admin/board-groups/{gr_id}` 추가 |

## 2. 현재 구현 상태

| 도메인 | 판정 | 메모 |
|--------|------|------|
| Config | ✅ | 핵심 필드 + 대량 `cf_*` extra parity 반영 |
| Board | ✅ | CRUD + copy + new-posts delete + extra parity 반영 |
| Board Groups | ✅ | canonical `/admin/board-groups*` + legacy `/admin/groups*` + `PATCH /admin/board-groups/{gr_id}` 구현 |
| Content | ✅ | CRUD 구현 |
| FAQ + Masters | ✅ | CRUD + header/footer image 구현 |
| Layout | ✅ | list/detail/save/widget add/update/delete/reorder + legacy reorder alias 구현 |
| Mail + Mail Test | ✅ | 템플릿/발송/수신자/테스트 발송 + `/admin/mails/test`, `/admin/mail-tests` alias 구현 |
| Maintenance | ✅ | purge 5종 구현 |
| Member | ✅ | CRUD + level + excel + icon/image 구현 |
| Menu | ✅ | CRUD + reorder + legacy `/admin/menus/reorder` 구현 |
| Permission/System Auth | ✅ | `/admin/system/auths*` 구현 |
| Auth Alias | ✅ | `/admin/auth*` 구현 |
| Point | ✅ | `GET/POST/DELETE /admin/points`, summary, expire + legacy grant/deduct/expire 구현 |
| Poll | ✅ | canonical `/admin/system/polls*` + legacy `/admin/polls*` 구현 |
| Popular | ✅ | list/reset/rank 구현 |
| Popup | ✅ | canonical `/admin/system/popups*` + legacy `/admin/popups*` 구현 |
| Push | ✅ | 표준/레거시 둘 다 구현 |
| QA Config | ✅ | config 조회/수정 구현 |
| QA Bulk Delete | ✅ | `/admin/qa` delete 구현 |
| Report | ✅ | list/stats/update 구현 |
| SMS | ✅ | config/member-sync/messages/history/templates/contacts 전체 구현 |
| System Tools | ✅ | phpinfo/browscap/update/convert 구현 |
| Theme | ✅ | config/list/detail 구현 |
| Visit | ✅ | stats/search/delete 구현 |
| Write Count | ✅ | stats 구현 |

## 3. 현재 잔여 갭

| 분류 | 잔여 항목 | 판단 |
|------|----------|------|
| exact alias parity | 없음 | 감사 문서가 지적했던 `/admin/groups*`, poll/popup `PATCH`, mail/menu/point/layout legacy path는 모두 command로 등록 완료 |
| 필드 parity | Member 날짜 필드 일부 | 미디어 CRUD는 닫았고, 날짜/표기 정합성은 기존 별도 감사 범위 유지 |
| 지표 재산출 | 필요 | command 수는 `188`로 갱신됐고, OpenAPI op 대비 상세 퍼센트는 다음 전수 감사에서 자동 재산출 권장 |

## 4. 필드 수준 판정

| 도메인 | 기존 감사 | 현재 상태 |
|--------|----------|----------|
| Board | 44필드 누락 🔴 | ✅ `extra` map + 동적 폼 섹션으로 PHP `bo_*` scalar를 end-to-end 반영 |
| Config | 105필드 누락 🔴 | ✅ `extra` map + 동적 폼 섹션으로 PHP `cf_*` scalar를 end-to-end 반영 |
| Member | media 미구현/날짜 차이 🟡 | 🟡 미디어 CRUD는 구현 완료, 날짜 parity는 기존 범위 유지 |

> 설계 메모: Board/Config는 타입 파일에 개별 필드를 149개 더 추가하는 대신, PHP scalar 필드를 `extra: Record<string, string>`으로 수집하고 그대로 UI 섹션에 노출하는 방식으로 구현했습니다. 이렇게 해야 PHP 필드 추가 시 Rust 폼/저장 경계가 다시 대량 회귀하지 않습니다.

## 5. 검증

- `cargo check -p g5-admin-desktop`
- `cargo test export_ts_bindings -- --nocapture`
- `cargo test -p g5-admin-desktop` → `283 passed`
- `pnpm --dir g5-admin lint`
- `pnpm --dir g5-admin test` → `41 files`, `290 tests`
- `pnpm --dir g5-admin build`

## 6. 최종 판정

**이 감사 문서가 지적한 누락은 이번 턴에서 모두 닫았습니다.**

- Layout / Report / Push / Board copy / Member media / Auth alias / QA bulk delete뿐 아니라, `/admin/groups*`, `/admin/polls*`, `/admin/popups*`, `/admin/mails/test`, `/admin/mail-tests`, `/admin/points/{grant,deduct,expire}`, `/admin/menus/reorder`, `/admin/layouts/{page_id}/reorder`, `PATCH /admin/board-groups/{gr_id}`까지 Rust command와 진단 매핑이 모두 존재합니다.
- 따라서 현재 판정은 **“실사용 관리자 기능 구현 완료 + 감사 문서 기준 exact alias parity 구현 완료”**입니다.
- 다음 과제는 이 문서 범위를 넘는 **필드 세부 parity 재감사**와 **OpenAPI op↔command 자동 재산출**입니다.
