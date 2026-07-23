# 🔬 딥 다이브 감사 보고서

> **대상**: `gnuboard5/php` REST API 전체 (`api/v1/`)
> **감사 일시**: 2026-03-05 18:01 KST
> **방법론**: `/deep-audit` 워크플로우 7단계, 가설 기반 탐색적 분석
> **감사관**: Anti-Gravity

---

## 📊 발견사항 요약 스코어보드

| 등급 | 건수 | 핵심 항목 |
|------|:---:|----------|
| 🔴 Critical | **2** | N+1 쿼리, JWT clock skew 부재 |
| 🟠 High | **4** | God Class 20개, `error_log()` Monolog 우회, 타입 사각지대 375건, 중복 정규식 |
| 🟡 Medium | **3** | 빈 레거시 디렉토리 6개, 명명 불일치, Mass Assignment 위험 표면 |
| 🟢 Low | **2** | 페이지네이션 OFFSET 성능, CI/CD 미구축 |

---

## 🔴 Critical (보안/데이터 위험)

### C-1. N+1 쿼리 — PostRepository 스크랩 목록

| 항목 | 값 |
|------|---|
| **파일** | [PostRepository.php:838-845](${PROJECT_ROOT}/api/v1/Post/Repository/PostRepository.php#L838-L845) |
| **증상** | `getScrapList()` 에서 스크랩 목록을 먼저 조회한 뒤, `foreach` 루프 안에서 각 게시글을 **개별 쿼리**(`fetchAssociative`)로 조회 |
| **영향** | 스크랩 100건 → DB 쿼리 101회. 트래픽 증가 시 DB 부하 급증 |
| **근본 원인** | 동적 테이블 (`g5_write_{bo_table}`)이라 JOIN 불가 — 그누보드 구조적 한계 |
| **시정 제안** | `bo_table` 별 그룹핑 후 `IN()` 배치 쿼리로 전환. 100개 스크랩이 3개 게시판에 분산 시 쿼리 3+1=4회로 단축 |

### C-2. JWT Clock Skew 미처리

| 항목 | 값 |
|------|---|
| **파일** | [JwtService.php](${PROJECT_ROOT}/api/v1/Security/JwtService.php) |
| **증상** | `leeway`, `clock skew` 관련 설정 코드 **0건**. `decode()`는 `JWT::decode()`를 직접 호출하며 `JWT::$leeway` 설정이 없음 |
| **영향** | 서버 시간이 1-2초 차이 나는 분산 환경에서 유효한 토큰이 거부될 수 있음 |
| **시정 제안** | `firebase/php-jwt`의 `JWT::$leeway = 30;` (30초) 설정 추가 |

---

## 🟠 High (아키텍처 부채)

### H-1. God Class: 300줄 초과 파일 20개

> 헌법 §2.1 위반. **가장 큰 기술 부채.**

| 줄 수 | 파일 | 초과 배율 |
|---:|------|:---:|
| **1,407** | [PostRepository.php](${PROJECT_ROOT}/api/v1/Post/Repository/PostRepository.php) | 4.7x |
| **1,070** | [AuthRepository.php](${PROJECT_ROOT}/api/v1/Auth/Repository/AuthRepository.php) | 3.6x |
| **943** | [QaService.php](${PROJECT_ROOT}/api/v1/Qa/Service/QaService.php) | 3.1x |
| **748** | [QaRepository.php](${PROJECT_ROOT}/api/v1/Qa/Repository/QaRepository.php) | 2.5x |
| **693** | [AdminSystemService.php](${PROJECT_ROOT}/api/v1/Admin/System/Service/AdminSystemService.php) | 2.3x |
| **670** | [MemberService.php](${PROJECT_ROOT}/api/v1/Member/Service/MemberService.php) | 2.2x |
| 592 | CommentRepository.php | 2x |
| 512 | AdminSystemRepository.php | 1.7x |
| 505 | PointRepository.php | 1.7x |
| 499 | PostService.php | 1.7x |
| 493 | MemberRepository.php | 1.6x |
| 493 | AuthService.php | 1.6x |
| 476 | AdminPollService.php | 1.6x |
| 466 | MemoRepository.php | 1.6x |
| 427 | FileService.php | 1.4x |
| 409 | FileRepository.php | 1.4x |
| 380 | AdminMemberService.php | 1.3x |
| 352 | AdminMailService.php | 1.2x |
| 342 | PostPermissionService.php | 1.1x |
| 328 | AdminVisitRepository.php | 1.1x |

> [!CAUTION]
> 이전 통합 감사에서 PostService를 875줄로 보고했으나, PostPermissionService(342줄)가 이미 분리된 상태.
> 그런데 **PostPermissionService 자체가 342줄로 여전히 300줄 초과**. 분리가 불완전하다.

### H-2. `error_log()` 직접 사용 — Monolog 우회

| 파일 | 줄 | 내용 |
|------|---:|------|
| [AuthService.php](${PROJECT_ROOT}/api/v1/Auth/Service/AuthService.php#L71) | 71, 77, 461 | `error_log('[auth] ...')` |
| [MemberService.php](${PROJECT_ROOT}/api/v1/Member/Service/MemberService.php#L534) | 534, 576 | `error_log('[member] ...')` |
| [RequestLogger.php](${PROJECT_ROOT}/api/v1/Support/Logging/RequestLogger.php#L103) | 103 | `error_log(... , 3, $path)` |

**문제**: 헌법 §3에서 Monolog 기반 구조화 로깅을 강제하는데, `error_log()`는 PHP 기본 로그에 비구조화 문자열로 기록. 로그 수집·검색·알림이 불가.

**시정**: `$this->logger->warning(...)` 으로 교체. `RequestLogger`는 의도적 파일 기록이므로 별도 판단.

### H-3. 타입 사각지대 375건

| 지표 | 값 |
|------|---|
| `: array` 반환 잔존 | **375건** |
| PHPDoc 제네릭 `@return array<` | 106건 (29%) |
| `['mb_id']` 문자열 키 접근 (Service/Controller) | **109건** |

PHPStan Level 8이 `array` 내부를 추적 못하므로, **실질적 정적 분석 커버리지는 Level 5 수준**.

### H-4. 중복 정규식 패턴

| 정규식 | 반복 횟수 |
|--------|:---:|
| `/^[a-zA-Z0-9_]{3,20}$/` | **8회** |
| `/^[a-zA-Z0-9_]{1,20}$/` | 5회 |
| `/^[a-zA-Z0-9_\-]{1,80}$/` | 3회 |
| `/^Bearer\s+(.+)$/i` | 3회 |
| `/^(0\|[1-9][0-9]*)$/` | 3회 |

**시정**: `Core/Util/ValidationPatterns.php` 상수 클래스로 추출.

---

## 🟡 Medium (점진적 부채)

### M-1. 빈 레거시 디렉토리 6개

```
api/v1/Integration/Core/
api/v1/Repositories/
api/v1/Models/
api/v1/Controllers/
api/v1/Helpers/
api/v1/Services/
```

초기 마이그레이션 잔재. 새 개발자에게 혼란 유발. 즉시 삭제 권장.

### M-2. 명명 불일치

| 패턴 | 사용 횟수 |
|------|:---:|
| `function get*` | 84 |
| `function list*` | 97 |
| `function find*` | 32 |
| `function fetch*` | 22 |

**컨벤션 미강제**. "단건 조회"를 `find`, `get`, `fetch` 혼용. 헌법에 명명 컨벤션 추가 권장:
- 단건 nullable: `findXxx()`
- 단건 필수 (없으면 throw): `getXxx()`
- 목록: `listXxx()`
- private DB 접근: `fetchXxx()`

### M-3. Mass Assignment 표면

[AdminBoardRepository.php:122-141](${PROJECT_ROOT}/api/v1/Admin/Board/Repository/AdminBoardRepository.php#L122-L141): `$payload` 배열에서 루프로 `$data[$field] = $payload[$field]`를 적용.
화이트리스트 필드 목록(`$allowedFields`)은 메서드 내부에 존재하므로 **직접적 Mass Assignment는 아니지만**, Service에서의 출입 필터링이 확인되지 않으면 리스크 표면 존재.

---

## 🟢 Low (기회 영역)

### L-1. OFFSET 기반 페이지네이션

전 도메인이 `OFFSET` 기반. 수십만 건 이상 데이터에서 `page=1000`은 성능 저하. 현 트래픽에서는 문제없으나, 커서 기반 페이지네이션(keyset) 전환을 **로드맵에 등록** 권장.

### L-2. CI/CD 미구축

`.github/workflows/` 없음. PHPStan + PHPUnit + CS-Fixer를 수동 실행 중. PR 기반 자동 게이트가 없으면 회귀 방지 불가.

---

## ✅ 양호 확인 항목

| 항목 | 결과 |
|------|------|
| Controller → Repository 직접 호출 | **0건** — 계층 분리 완벽 |
| `global $` 사용 | **0건** — 글로벌 격리 완료 |
| admin 라우트 미들웨어 체인 | **누락 0건** |
| 동적 테이블(`write_`) BoTable 검증 | **누락 0건** |
| 트랜잭션 사용 | File, Comment, Point, Memo, Admin 적절 사용 (6개 Repository) |
| `displayErrorDetails` 제어 | `APP_ENV === 'local'`일 때만 true — **안전** |
| `RateLimitMiddleware` | **파일 존재 확인** — 이전 감사의 "미확인" 우려 해소 |
| PostPermissionService 분리 | **이미 착수됨** (342줄, 추가 분리 필요) |

---

## 🏁 Next Action 우선순위

| # | 등급 | 작업 | 담당 |
|---|------|------|------|
| 1 | 🔴 | PostRepository `getScrapList()` N+1 → 배치 쿼리 | 즉시 |
| 2 | 🔴 | JWT leeway 30초 설정 | 즉시 |
| 3 | 🟠 | `error_log()` 6건 → Monolog `$logger->warning()` 교체 | type-safety Codex |
| 4 | 🟠 | God Class 상위 6개 SRP 분리 (PostRepo, AuthRepo, QaService, QaRepo, AdminSysService, MemberService) | audit-remediation Codex |
| 5 | 🟠 | 중복 정규식 → `ValidationPatterns` 상수 추출 | audit-remediation Codex |
| 6 | 🟡 | 빈 디렉토리 6개 삭제 | audit-remediation Codex |
| 7 | 🟡 | 헌법 §2.2에 명명 컨벤션 추가 (`find`/`get`/`list`/`fetch`) | 수동 |
| 8 | 🟢 | CI/CD GitHub Actions 구축 | 별도 태스크 |
| 9 | 🟢 | 커서 기반 페이지네이션 로드맵 등록 | 장기 |
