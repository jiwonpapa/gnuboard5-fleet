# 아키텍처 안티패턴 감사 보고서 — 2026-03-06

> **기준**: `.agent/Constitution.md` + `.agent/sub-constitutions/document-governance.md`
> **감사 범위**: `api/v1/` 전체 (32,372줄, PHP 파일)
> **감사일시**: 2026-03-06 12:41 KST
> **Revision**: 1

---

## 결론 요약: ⚠️ 구조적 개선 필요

> 핵심 아키텍처(3계층 분리, DBAL, DI, RFC7807)는 건실하나, 5개 영역에서 기술 부채가 축적 중.
> error_log 우회는 이미 제거(0건)되어 양호. 커서 페이징 부재와 DTO 미확산이 가장 시급.

---

## 1. N+1 쿼리 패턴

### 판정: ✅ 양호 (false positive 확인)

| 의심 파일 | 실제 구현 | 판정 |
|-----------|----------|------|
| `PostScrapRepository` | `groupedWrIds` + `WHERE IN (:wr_id_0, ...)` 배치 쿼리 | ✅ 안전 |
| `PostNewPostRepository` | 단일 JOIN 쿼리로 목록 조회 | ✅ 안전 |
| `PostQueryRepository` | `fetchAllAssociative()` 일괄 조회 | ✅ 안전 |
| `MemberQueryRepository` | 단건 조회만(목록에서 N+1 아님) | ✅ 안전 |

> **결론**: foreach 내부에 단건 DB 쿼리를 호출하는 전형적 N+1 패턴은 **발견되지 않음**.
> PostScrapRepository가 동적 테이블(bo_table별)을 그룹핑 후 WHERE IN으로 배치 조회하는 설계는 우수.

---

## 2. God Class (300줄 초과)

### 판정: 🟡 경고 — 10건

| # | 파일 | 줄수 | 개선 방안 |
|---|------|------|----------|
| 1 | `Core/Plugin/PluginLoader.php` | 462 | 플러그인 디스커버리/로더/레지스트리 3분할 |
| 2 | `File/Repository/FileRepository.php` | 421 | Query/Mutation 분리 |
| 3 | `Post/Repository/PostWriteRepository.php` | 419 | 답변스레딩 로직 별도 추출 |
| 4 | `File/Service/FileService.php` | 409 | 업로드/다운로드/삭제 서비스 분리 |
| 5 | `Admin/Member/Service/AdminMemberService.php` | 381 | Query/Mutation 분리 |
| 6 | `Admin/Mail/Service/AdminMailService.php` | 378 | 메일 발송/이력 분리 |
| 7 | `Post/Service/PostPermissionService.php` | 369 | 권한 체크 룰별 분리 |
| 8 | `Post/Repository/PostQueryRepository.php` | 369 | 검색 쿼리 빌더 추출 |
| 9 | `Post/Service/PostMutationService.php` | 341 | 파일 처리 로직 FileService 위임 |
| 10 | `Admin/Visit/Repository/AdminVisitRepository.php` | 328 | 통계 타입별 전략 패턴 |

> **권고**: P1으로 분류. 코덱스 신규 구현 완료 후 리팩토링 Phase에서 일괄 처리.

---

## 3. 원시 Array 반환 (타입 안전성)

### 판정: 🟡 경고

| 항목 | 수치 |
|------|------|
| `: array` 반환 타입 선언 | **483건** |
| DTO 클래스 존재 | **7개** (`PostDTO`, `CommentDTO`, `MemberDTO`, `MenuDTO`, `PaginationDTO`, `PointDTO`, `BoardDTO`) |
| DTO 미적용 도메인 | Memo, QA, Admin 전체, Auth, File, Like, Notification, Layout |

> **권고**: DTO 7개는 이미 `api/v1/Core/DTO/`에 존재. 나머지 도메인에 확산 적용 필요.
> 우선순위: P2 (기능 영향 없음, 타입 안전성 개선)

---

## 4. OFFSET 페이징

### 판정: 🔴 개선 필요

| 항목 | 수치 |
|------|------|
| OFFSET 기반 페이징 | **20건** (전 도메인) |
| 커서 기반 페이징 | **0건** |

**OFFSET 사용 파일 목록:**
- `PostScrapRepository`, `PostNewPostRepository`, `PostQueryRepository`
- `PointQueryRepository`, `NotificationRepository`
- Admin: `Board`, `Auth`, `Group`, `Mail`, `Faq`, `Layout`, `Point`, `Member`, `Content`, `Visit`, `Popup`, `Poll`, `SystemPopup`, `SystemPoll`, `SystemMail`

> **권고**: P1. 사용자향 목록(Post, Scrap, NewPost, Point, Notification)부터 커서 페이징 도입.
> Admin 목록은 데이터량이 적어 OFFSET 유지 가능.

---

## 5. 에러 로깅 일관성

### 판정: ✅ error_log 제거됨, ⚠️ Logger 미주입 5파일

| 항목 | 수치 |
|------|------|
| `error_log()` 직접 호출 | **0건** ✅ |
| `LoggerInterface` 주입 파일 | **7파일** |
| Logger 미주입 Service | **5파일** |

**Logger 미주입 Service 목록:**
| # | 파일 | 조치 |
|---|------|------|
| 1 | `Auth/Service/AuthService.php` | `?LoggerInterface` nullable — 표준 주입으로 변경 필요 |
| 2 | `Auth/Service/AuthSessionService.php` | 동일 |
| 3 | `Auth/Service/AuthMailService.php` | Logger 미주입 |
| 4 | `Member/Service/MemberService.php` | Logger 미주입 |
| 5 | `Member/Service/MemberProfileUpdateService.php` | Logger 미주입 |

> **권고**: P0. 모든 Service에 `LoggerInterface` 필수 주입 규칙 헌법에 명시.

---

## 6. 문자열 보간 SQL

### 판정: ✅ 안전 (동적 테이블명 전용)

| 항목 | 수치 |
|------|------|
| 문자열 보간 SQL | **20건** |
| 사용자 입력 보간 | **0건** |

> 모든 보간은 `$writeTable`, `$goodTable`, `$scrapTable` 등 **`TableRegistry` 또는 `safeWriteTable()`을 통해 검증된 테이블명** 전용.
> 그누보드5의 `g5_write_{bo_table}` 동적 테이블 구조상 불가피한 패턴. SQL Injection 위험 없음.

---

## 종합 개선 로드맵

| 우선순위 | 항목 | 영향도 | 예상 공수 |
|----------|------|--------|----------|
| **P0** | Logger 미주입 Service 5파일 교정 | 운영 가시성 | 0.5일 |
| **P0** | 헌법에 로깅 표준 조항 추가 | 거버넌스 | 즉시 |
| **P1** | 사용자향 커서 페이징 도입 (5개 Repository) | 성능 | 2일 |
| **P1** | God Class 10건 리팩토링 | 유지보수성 | 3일 |
| **P2** | DTO 전 도메인 확산 | 타입 안전성 | 2일 |

---

## 감사 체크리스트

| # | 항목 | 판정 |
|---|------|------|
| 1 | N+1 쿼리 패턴 | ✅ 미발견 |
| 2 | God Class (300줄+) | ⚠️ 10건 |
| 3 | 원시 array 반환 | ⚠️ 483건 (DTO 7개) |
| 4 | OFFSET 페이징 | 🔴 20건 (커서 0건) |
| 5 | error_log 우회 | ✅ 0건 |
| 6 | Logger 미주입 Service | ⚠️ 5건 |
| 7 | 문자열 보간 SQL | ✅ 안전 (테이블명 전용) |
| 8 | PHPStan Level 6 | ✅ 0 errors (기존 감사 기준) |
| 9 | PHPUnit | ✅ 131 tests 100% (기존 기준) |
