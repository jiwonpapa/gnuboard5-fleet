# 🤖 Codex 스웨거(OpenAPI) 태그 구조화 + Admin 누락 보충 프롬프트

---

## 🎭 페르소나

```
너는 "IRONDEV"다.
OpenAPI 3.0 명세(openapi.yaml)를 표준 규약에 맞게 구조화한다.
PHPDoc 어노테이션이 아닌 YAML 직접 편집 방식이다.
보고는 한글로. 코드는 영어로.
```

---

## 📋 필수 참조 파일

```
/Users/neojins/workspace/gnuboard5/php/api/docs/openapi.yaml          ← 수정 대상
/Users/neojins/workspace/gnuboard5/php/api/routes/v1.php              ← 실제 라우트 참조
/Users/neojins/workspace/gnuboard5/php/api/routes/v1/admin.php        ← Admin 라우트 전체
/Users/neojins/workspace/gnuboard5/php/api/routes/v1/boards.php       ← Board 라우트
/Users/neojins/workspace/gnuboard5/php/docs/audits/ENDPOINT_STANDARDS_AUDIT_2026-03-06.md  ← 감사 보고서
/Users/neojins/workspace/gnuboard5/php/.agent/Constitution.md         ← 헌법
```

---

## ✅ 작업 목표 (3가지)

### WS-1: Admin 단일 태그 → 도메인별 서브태그 분리

**현재 문제**: `Admin` 태그 하나에 40+ 엔드포인트가 전부 뭉쳐 있음.

**변경 방법**: openapi.yaml의 `tags:` 섹션과 각 path의 `tags:` 를 아래처럼 분리.

```yaml
# Before
tags:
  - name: Admin

# After
tags:
  - name: Admin: Auth
    description: 관리자 권한 관리
  - name: Admin: Boards
    description: 관리자 게시판 관리
  - name: Admin: Members
    description: 관리자 회원 관리
  - name: Admin: Points
    description: 관리자 포인트 관리
  - name: Admin: Groups
    description: 관리자 게시판 그룹 관리
  - name: Admin: Mails
    description: 관리자 메일 발송
  - name: Admin: Polls
    description: 관리자 투표 관리
  - name: Admin: Popups
    description: 관리자 팝업 관리
  - name: Admin: Layouts
    description: 관리자 레이아웃/위젯 관리
  - name: Admin: Reports
    description: 관리자 신고 관리
  - name: Admin: Push
    description: 관리자 푸시 알림
  - name: Admin: QA
    description: 관리자 1:1문의 관리
  - name: Admin: Config
    description: 관리자 사이트 설정
  - name: Admin: Visit
    description: 관리자 방문자 통계
  - name: Admin: Contents
    description: 관리자 콘텐츠(인사말 등) 관리
  - name: Admin: Faqs
    description: 관리자 FAQ 관리
  - name: Admin: Menus
    description: 관리자 메뉴 관리
  - name: Admin: Populars
    description: 관리자 인기검색어 관리
```

각 `/admin/...` path의 `tags: [Admin]`을 해당하는 서브태그로 변경:

```yaml
# Before
/admin/polls:
  get:
    tags: [Admin]

# After
/admin/polls:
  get:
    tags: [Admin: Polls]
```

---

### WS-2: 사용자 API 태그 오분류 수정

| 엔드포인트 | 현재 태그 | 수정 태그 | 이유 |
|-----------|---------|---------|------|
| `GET /polls/active` | Admin | **Poll** | 사용자 투표 조회 |
| `POST /polls/{po_id}/vote` | Admin | **Poll** | 사용자 투표 참여 |
| `GET /polls/{po_id}/result` | Admin | **Poll** | 사용자 투표 결과 |
| `GET /popups/active` | Admin | **Popup** | 사용자 팝업 조회 |
| `GET /members/me/scraps` | Post | **Member** | 회원 고유 데이터 |
| `GET /memos`, `POST /memos` 등 | Member | **Memo** | 독립 리소스 |

tags 섹션에 아래 추가:

```yaml
  - name: Poll
    description: 투표 (사용자)
  - name: Popup
    description: 팝업 (사용자)
  - name: Memo
    description: 쪽지
```

---

### WS-3: Swagger 누락 Admin 8도메인 추가

아래 8개 Admin 서브도메인이 **코드에 구현되어 있으나 openapi.yaml에 누락**됨.
`api/routes/v1/admin.php`에서 실제 라우트를 읽고, 해당 Controller의 메서드 시그니처를 참고하여
openapi.yaml에 path + request/response 스키마를 추가하라.

| # | 경로 prefix | Controller | 서브태그 |
|---|------------|-----------|---------|
| 1 | `/admin/members` | AdminMemberController | Admin: Members |
| 2 | `/admin/boards` | AdminBoardController | Admin: Boards |
| 3 | `/admin/config` | AdminConfigController | Admin: Config |
| 4 | `/admin/visit` | AdminVisitController | Admin: Visit |
| 5 | `/admin/contents` | AdminContentController | Admin: Contents |
| 6 | `/admin/faqs`, `/admin/faq-masters` | AdminFaqController | Admin: Faqs |
| 7 | `/admin/menus` | AdminMenuController | Admin: Menus |
| 8 | `/admin/populars` | AdminPopularController | Admin: Populars |

각 도메인에 대해:
1. Controller의 public 메서드를 전수 확인
2. 각 메서드에 대응하는 path를 openapi.yaml에 추가
3. request body (POST/PUT) 와 response schema를 Controller 코드 기반으로 작성
4. 적절한 parameters (path params, query params) 정의
5. security: bearerAuth 필수 (Admin 전용)

---

## 🚨 절대 위반 금지

```
❌ 기존 path의 URL 경로를 변경하지 말 것 (태그만 변경)
❌ /good, /reply, {bf_no}, {nw_id} 등 G5 레거시 용어를 바꾸지 말 것 (DB 매핑 우선)
❌ 기존 작동하는 스키마를 삭제하지 말 것
❌ openapi.yaml 외 PHP 소스코드를 수정하지 말 것 (이 작업은 문서 전용)
```

---

## 📝 완료 보고 양식

```
## Swagger 태그 구조화 완료 보고

### WS-1: Admin 서브태그 분리
- 분리한 서브태그 수: [N]개
- 재분류한 엔드포인트 수: [N]개

### WS-2: 사용자 API 태그 수정
- 수정한 엔드포인트: [목록]

### WS-3: Admin 누락 보충
- 추가한 도메인: [목록]
- 추가한 path 수: [N]개

### 검증
- openapi.yaml YAML 문법 검증: [통과/실패]
- Swagger UI 렌더링 테스트: [통과/실패]
```

---

> **IRONDEV, openapi.yaml 하나만 수정하면 된다. PHP 코드는 건드리지 마라.**
