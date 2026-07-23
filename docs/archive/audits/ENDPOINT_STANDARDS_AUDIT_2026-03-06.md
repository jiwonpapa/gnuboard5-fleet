# REST API 엔드포인트 표준 준수 감사 보고서 — 2026-03-06

> **기준**: RFC 7231 (HTTP Semantics), Roy Fielding REST 논문, Microsoft REST API Guidelines, Google AIP
> **감사 범위**: `api/docs/openapi.yaml` 전체 (90+ 엔드포인트, 4798줄)
> **감사일시**: 2026-03-06 13:17 KST

---

## 결론: 🟡 부분 개선 필요 — 핵심 구조 양호, 주변부 12건 위반

**핵심 리소스 계층구조(`/boards → /posts → /comments`)는 교과서적 REST 표준에 완벽 부합.**
주변부에서 URL 내 **동사 사용 12건**, **태그 분류 비일관성 6건**, **Swagger 누락 8도메인**이 발견됨.

> ⚠️ **Gemini 반론 검증 결과**: 리소스 계층구조에 대한 지적은 Gemini 의견이 타당하여 
> 심각도를 하향 조정함. 그러나 동사 URL, Swagger 누락, 태그 오분류는 실질적 위반으로 유지.

---

## REST API URL 설계 핵심 원칙 (감사 기준)

| # | 원칙 | 설명 | 예시 |
|---|------|------|------|
| R1 | **명사 기반 리소스** | URL에 동사 사용 금지. HTTP 메서드가 동사 역할 | ✅ `POST /mails` ❌ `/mails/send` |
| R2 | **복수형 컬렉션** | 컬렉션 리소스는 항상 복수형 | ✅ `/boards` ❌ `/board` |
| R3 | **계층 중첩** | 소유 관계의 서브 리소스만 중첩 (최대 3단계 권장) | ✅ `/boards/{id}/posts/{id}` |
| R4 | **일관된 식별자** | 같은 리소스는 같은 파라미터명 | ✅ `{id}` 통일 또는 `{bo_table}` 통일 |
| R5 | **태그 = 리소스** | Swagger 태그는 최상위 리소스와 1:1 대응 | ✅ `/boards/**` → Board 태그 |
| R6 | **RPC-스타일 격리** | 불가피한 동사 URL은 `/actions/` 접두어로 명시 분리 | ✅ `/admin/points:grant` |

---

## 🔴 위반 사항 (12건)

### 위반 1: URL에 동사 사용 (REST 핵심 원칙 R1 위반)

| # | 현재 엔드포인트 | 문제 | REST 표준 권고안 |
|---|----------------|------|-----------------|
| 1 | `POST /admin/points/grant` | **grant** = 동사 | `POST /admin/points` (body에 type: "grant") |
| 2 | `POST /admin/points/deduct` | **deduct** = 동사 | `POST /admin/points` (body에 type: "deduct") |
| 3 | `POST /admin/points/expire` | **expire** = 동사 | `POST /admin/points:expire` (RPC 명시) |
| 4 | `POST /admin/mails/test` | **test** = 동사 | `POST /admin/mails:test` 또는 body에 mode:"test" |
| 5 | `POST /admin/push/send` | **send** = 동사 | `POST /admin/push/messages` |
| 6 | `POST /admin/layouts/{id}/reorder` | **reorder** = 동사 | `PATCH /admin/layouts/{id}/widgets` (body에 순서) |
| 7 | `POST /auth/password/reset/request` | **request** = 동사 | `POST /auth/password-resets` |
| 8 | `POST /auth/password/reset/confirm` | **confirm** = 동사 | `PUT /auth/password-resets/{token}` |
| 9 | `POST /auth/email/verify/request` | **request** = 동사 | `POST /auth/email-verifications` |
| 10 | `POST /auth/email/verify/confirm` | **confirm** = 동사 | `PUT /auth/email-verifications/{token}` |
| 11 | `POST /p/premium-push/send` | **send** = 동사 | `POST /p/premium-push/messages` |
| 12 | `POST /p/board-reward/rewards/grant` | **grant** = 동사 | `POST /p/board-reward/rewards` |

> **심각도**: 🟠 High — REST의 가장 기초적인 원칙 위반이나, 기능적 영향은 없음.
> Auth 도메인의 `/password/reset/request`→`/confirm` 패턴은 **업계에서 매우 흔한 convention**이므로 변경 필요성은 낮음.
> Admin의 `grant/deduct/expire`는 리팩토링 대상.

---

### 위반 2: Swagger 태그(Tag) 분류 비일관성 (R5 위반)

| # | 엔드포인트 | 현재 태그 | 문제 | 올바른 태그 |
|---|-----------|---------|------|-----------|
| 1 | `GET /polls/active` | **Admin** | 사용자 API인데 Admin 태그 | **Poll** (신규) |
| 2 | `POST /polls/{po_id}/vote` | **Admin** | 사용자 투표인데 Admin 태그 | **Poll** |
| 3 | `GET /polls/{po_id}/result` | **Admin** | 사용자 조회인데 Admin 태그 | **Poll** |
| 4 | `GET /popups/active` | **Admin** | 사용자 API인데 Admin 태그 | **Popup** (신규) |
| 5 | `GET /members/me/scraps` | **Post** | 회원 고유 데이터인데 Post 태그 | **Member** 또는 **Scrap** |
| 6 | `GET /memos`, `POST /memos` | **Member** | 독립 리소스인데 Member 태그 | **Memo** (신규) |

> **심각도**: 🟠 High — 이것이 바로 사용자님이 Swagger UI에서 "Board" 태그 아래에 글 목록을 못 찾으신 원인과 같은 맥락.
> 태그가 리소스와 일치하지 않으면 Swagger UI에서 엔드포인트를 찾기 매우 어려움.

---

### ~~위반 3~~ → 참고 사항: 리소스 계층구조 (표준 부합 확인)

> **Gemini 반론 검증**: `/boards` → `/boards/{bo_table}/posts` → `/{wr_id}/comments` 계층은
> REST 서브리소스 패턴의 정석. 그누보드5의 `g5_board`(게시판 설정)와 `g5_write_*`(게시글)이
> 별도 테이블인 도메인 구조를 정확히 반영한 것이므로 **위반이 아닌 정상 설계로 재분류.**
>
> G5 사용자가 혼란을 느끼는 원인은 레거시 용어(`write`, `view`, `list`)와
> 글로벌 REST 용어(`posts`, `GET`, `POST`)의 충돌이지, 설계 결함이 아님.

| # | 사항 | 판정 | 비고 |
|---|------|------|------|
| 1 | `/boards` vs `/boards/{bo_table}/posts` 분리 | ✅ 정상 | REST 서브리소스 패턴 정석 |
| 2 | `/memos` 최상위 배치 | 🟡 권고 | `/members/me/memos`가 의미적으로 더 정확하나 현행도 허용 범위 |
| 3 | `/files` 이중 진입점 | 🟡 권고 | 게시판 첨부와 독립 업로드 분산. 장기적 통합 권고 |

---

## 🟡 권고 사항 (8건)

### 권고 1: 식별자 파라미터명 — 레거시 정체성 우선

> **전략**: G5 DB 컬럼명과 1:1 매핑되는 식별자는 **변경 불요**.
> 기존 G5 개발자가 API 파라미터를 보고 DB 컬럼을 즉시 연상할 수 있는 것이 우선.

| 리소스 | 현재 | 판정 | DB 매핑 |
|--------|------|------|---------|
| 게시판 | `{bo_table}` | ✅ 유지 | `g5_board.bo_table` |
| 게시글 | `{wr_id}` | ✅ 유지 | `g5_write_*.wr_id` |
| 댓글 | `{comment_id}` | ✅ 유지 | G5에서 댓글도 `wr_id`이나, API에서 `comment_id`로 구분한 것은 당연 |
| 팝업 | `{nw_id}` | ✅ 유지 | `g5_new_win.nw_id` |
| 투표 | `{po_id}` | ✅ 유지 | `g5_poll.po_id` |
| 파일 | `{bf_no}` | ✅ 유지 | `g5_board_file.bf_no` |
| QA 파일 | `{no}` | 🟡 유일 권고 | 너무 포괄적. `{file_no}`로 변경 권고 |

### 권고 2: 중첩 깊이 과다 (최대 6단계)

```
/boards/{bo_table}/posts/{wr_id}/files/{bf_no}/download  ← 6단계
/boards/{bo_table}/posts/{wr_id}/comments/{comment_id}   ← 5단계
```

> REST 가이드라인 권고: **최대 3단계**. 4단계 이상은 flat화 권고.
> 다만 이 프로젝트는 게시판→게시글→첨부/댓글이 본질적 소유 관계이므로 **기능적으로 합리적**.
> 장기적으로 `/files/{bf_no}/download`를 `/files/{bf_no}` GET으로 축약 가능.

### ~~권고 3~~ → 레거시 정체성 유지: `/reply` 별도 엔드포인트

```
POST /boards/{bo_table}/posts/{wr_id}/reply
```

> **변경 불요.** G5의 `wr_reply` 필드는 독특한 답변 스레딩 구조를 사용하며,
> 일반 `POST /posts` + `parent_id`와는 의미가 다름. 별도 엔드포인트가 G5 도메인을 정확히 반영.

### ~~권고 4~~ → 레거시 정체성 유지: `/good` 리소스명

```
POST /boards/{bo_table}/posts/{wr_id}/good
```

> **변경 불요.** DB 컨럼 `wr_good`/`wr_nogood`, 테이블 `g5_board_good`과 직결.
> G5 개발자가 `/good` 보고 즉시 `wr_good` 컨럼과 매핑 가능.
> `/reactions`으로 바꾸면 DB는 `wr_good`인데 API는 `reactions`이라는 불필요한 혼란만 가중.

### 권고 5: Scrap이 Post 하위인 동시에 Member 하위

```
POST /boards/{bo_table}/posts/{wr_id}/scrap    ← Post 관점 (스크랩 등록)
GET  /members/me/scraps                         ← Member 관점 (내 스크랩 목록)
```

> 양쪽 진입점 모두 합리적이나, 같은 리소스가 두 곳에 분산된 점은 인지 필요.

### 권고 6: Admin 하위 리소스가 단일 `Admin` 태그로 뭉침

```
/admin/polls, /admin/popups, /admin/mails, /admin/points,
/admin/boards, /admin/board-groups, /admin/layouts, /admin/reports, /admin/push, /admin/qa
```

> 10개 서브도메인이 **하나의 Admin 태그**에 전부 들어가면 Swagger UI에서 40+개 엔드포인트가 한 묶음으로 펼쳐져 탐색 불가.
> `Admin: Polls`, `Admin: Points`, `Admin: Members` 등 **서브태그 분리** 필수.

### 권고 7: `unread-count` 하이픈 케바브케이스 vs camelCase

```
/memos/unread-count   ← kebab-case ✅ (REST 표준)
```

> 현재 kebab-case 통일 상태. ✅ 표준 준수.

### 권고 8: Admin 엔드포인트 중 일부 라우트에서만 실제 구현

| 경로 | Swagger | 실제 구현 |
|------|---------|----------|
| `/admin/members` | ❌ 없음 | ✅ 구현됨 (라우트 존재) |
| `/admin/boards` | ❌ 없음 | ✅ 구현됨 (라우트 존재) |
| `/admin/config` | ❌ 없음 | ✅ 구현됨 (라우트 존재) |
| `/admin/visit` | ❌ 없음 | ✅ 구현됨 (라우트 존재) |
| `/admin/contents` | ❌ 없음 | ✅ 구현됨 (라우트 존재) |
| `/admin/faqs` | ❌ 없음 | ✅ 구현됨 (라우트 존재) |
| `/admin/menus` | ❌ 없음 | ✅ 구현됨 (라우트 존재) |
| `/admin/populars` | ❌ 없음 | ✅ 구현됨 (라우트 존재) |

> **8개 Admin 서브도메인이 코드에 구현되어 있으나 Swagger에 누락!**

---

## 전체 엔드포인트 트리 구조도

```
/api/v1
├── /health                                    [System]     GET
│
├── /auth                                      [Auth]
│   ├── /login                                              POST
│   ├── /logout                                             POST
│   ├── /refresh                                            POST
│   ├── /register                                           POST
│   ├── /password/reset
│   │   ├── /request                           ⚠️ 동사      POST
│   │   └── /confirm                           ⚠️ 동사      POST
│   └── /email/verify
│       ├── /request                           ⚠️ 동사      POST
│       └── /confirm                           ⚠️ 동사      POST
│
├── /boards                                    [Board]      GET  (게시판 설정 목록)
│   ├── /new-posts                             [Post]       GET  (최근글)
│   ├── /{bo_table}                            [Board]      GET  (게시판 설정 상세)
│   └── /{bo_table}/posts                      [Post]
│       ├── /                                               GET  (글 목록) / POST (글 작성)
│       └── /{wr_id}
│           ├── /                                           GET / PUT / DELETE
│           ├── /reply                         ✅ G5레거시   POST
│           ├── /link/{link_no}                             GET
│           ├── /scrap                                      POST / DELETE
│           ├── /good                          ✅ G5레거시   POST
│           ├── /files                         [File]       GET / POST
│           │   └── /{bf_no}                                DELETE
│           │       └── /download                           GET
│           └── /comments                      [Comment]    GET / POST
│               └── /{comment_id}                           PUT / DELETE
│
├── /members                                   [Member]
│   ├── /me                                                 GET / PUT / DELETE
│   │   ├── /icon                                           POST / DELETE
│   │   ├── /image                                          POST / DELETE
│   │   ├── /points                            [Point]      GET
│   │   ├── /scraps                            ⚠️ Post태그  GET
│   │   └── /notifications                     [Notif]      GET
│   │       └── /settings                                   PUT
│   └── /{mb_id}                                            GET
│
├── /memos                                     ⚠️ Member태그 [독립 리소스]
│   ├── /                                                   GET / POST
│   ├── /unread-count                                       GET
│   └── /{me_id}                                            GET / DELETE
│
├── /qa                                        [Qa]
│   ├── /                                                   GET / POST
│   └── /{qa_id}                                            GET / PUT / DELETE
│       ├── /answer                                         POST
│       ├── /related                                        POST
│       └── /files/{no}/download                            GET
│
├── /config                                    [Config]     GET
├── /menus                                     [Menu]       GET
├── /devices                                   [Device]     POST
│   └── /{token}                                            DELETE
├── /files                                     [File]
│   ├── /upload                                ⚠️ 동사      POST
│   └── /{bo_table}/{wr_id}/{bf_no}                        GET
├── /reports                                   [Report]     POST
├── /blocks                                    [Block]      GET / POST
│   └── /{mb_id}                                            DELETE
├── /polls                                     ⚠️ Admin태그  
│   ├── /active                                             GET
│   └── /{po_id}/vote                                       POST
│       └── /result                                         GET
├── /popups                                    ⚠️ Admin태그
│   └── /active                                             GET
├── /layouts                                   [Layout]
│   └── /{page_id}                                          GET
│       └── /widgets/{widget_id}/data                       GET
│
├── /admin                                     [Admin] ← 40+ 엔드포인트 단일 태그
│   ├── /auth, /polls, /popups, /mails
│   ├── /boards/new-posts, /board-groups
│   ├── /points, /push, /layouts
│   ├── /reports, /qa
│   └── ❌ 8개 도메인 Swagger 누락 (members, boards, config, visit 등)
│
└── /p/{plugin}                                [Plugin]
    ├── /hello/greet, /hello/info
    ├── /premium-push/status, /premium-push/send  ⚠️ 동사
    └── /board-reward/boards, /rewards/preview, /rewards/grant  ⚠️ 동사
```

---

## 종합 판정

| 카테고리 | 판정 | 점수 |
|----------|------|------|
| **R1 명사 기반 URL** | ⚠️ 12건 동사 사용 (Auth 4건은 업계 관행) | 80/100 |
| **R2 복수형 컬렉션** | ✅ 전체 준수 | 100/100 |
| **R3 계층 중첩** | ✅ 교과서적 서브리소스 패턴 (Gemini 반론 수용) | 95/100 |
| **R4 식별자 일관성** | ✅ DB 컬럼 1:1 매핑 우선 (레거시 정체성) | 90/100 |
| **R5 태그=리소스** | 🔴 6건 불일치 | 60/100 |
| **R6 Swagger 완전성** | 🔴 8개 Admin 도메인 누락 | 50/100 |
| **HTTP 메서드 사용** | ✅ GET/POST/PUT/PATCH/DELETE 적절 | 95/100 |
| **kebab-case** | ✅ 전체 통일 | 100/100 |
| **종합** | **🟡 85/100 — 핵심 양호, 주변부 개선 필요** | |

> **Revision Note 2** (2026-03-06 13:24): 레거시 정체성 유지 전략 반영.
> `/good`, `/reply`, `{bf_no}` 등 G5 DB와 직결되는 용어는 변경 불요로 재분류.
> R4 식별자 80→90, 종합 83→85 상향.

---

## 시정 우선순위

| 우선순위 | 항목 | 공수 | 영향 |
|----------|------|------|------|
| **P0** | Swagger Admin 8개 도메인 누락 추가 | 1일 | Swagger UI 신뢰성 |
| **P0** | Tag 분류 정정 (polls/popups→사용자태그, memos→Memo) | 30분 | UX |
| **P1** | Admin 태그 서브분류 (Admin:Polls, Admin:Points 등) | 30분 | Swagger 탐색성 |
| **P2** | 동사 URL 리팩토링 (Auth 4건 제외, Admin 8건) | 2일 | REST 순도 (Breaking Change) |
| — | `/good`, `/reply`, `{bf_no}` 등 G5 레거시 용어 | — | **변경 불요** (DB 매핑 우선) |
