# 감사 보고서 — 2026-03-05 (재감사)

> **감사 시각**: 2026-03-05 KST  
> **대상**: `api/v1`, `api/routes`, `docs/ddls`  
> **기준**: 헌법(.agent/Constitution.md), 최신 리팩토링 반영 상태

---

## 결론

**조건부 통과 (PASS with warnings)**  
- 정적분석/단위테스트는 통과했습니다.  
- SRP/타입안전성/라우트 분할은 의미 있는 진전이 확인되었습니다.  
- 다만, 커버리지 측정 드라이버 부재와 일부 대형 클래스 잔존은 다음 우선 과제입니다.

---

## 실행 검증

### 1) 정적분석
- 명령: `composer run analyse`
- 결과: **PASS (level 8, 0 errors)**

### 2) 단위테스트
- 명령: `composer run test`
- 결과: **PASS (`168 tests`, `698 assertions`)**

### 3) 라우트 무결성(분할 후 엔드포인트 보존)
- 비교: `HEAD:api/routes/v1.php` vs `api/routes/v1.php + api/routes/v1/*.php`
- 결과: **동일 (`134` method+path 시그니처, missing/added 없음)**

### 4) 커버리지 실행성
- 명령: `composer run test:coverage`
- 결과: **실패**
  - `No code coverage driver available`

---

## 핵심 개선 확인

### 1) SRP 분리
- Auth 저장소 분리 완료:
  - `AuthRepository` facade + `AuthMember/AuthSecurity/AuthRecovery`
- Post 저장소 분리 완료:
  - `PostRepository` facade + `PostQuery/PostMutation/PostScrap/PostNewPost`

### 2) 라우트 분할
- 메인 파일 축소:
  - `api/routes/v1.php`: **1051 → 467 lines**
- 분리 파일:
  - `api/routes/v1/auth.php`
  - `api/routes/v1/boards.php`
  - `api/routes/v1/admin.php`

### 3) 타입 안전성 확장
- Enum 적용 확대:
  - `VoteType`, `SearchField`, `MemberLevel`
- DTO 적용 확대:
  - `CommentDTO`, `PostDTO` (Query/Scrap/NewPost 경로)

### 4) DDL 문서 보강
- 추가:
  - `docs/ddls/poll.md`
  - `docs/ddls/new_win.md`
  - `docs/ddls/mail.md`

---

## 감사 Findings (심각도 순)

### [P1] 코드 커버리지 계측 불가
- 증상: `test:coverage` 실행 시 `No code coverage driver available`
- 영향: 헌법의 TDD/품질게이트 운영 시 커버리지 지표를 CI에서 활용 불가
- 조치 권고:
  - CI 또는 로컬에 `Xdebug` 또는 `pcov` 드라이버 설치
  - 커버리지 리포트(`coverage-report`) 생성 파이프라인 고정

### [P2] 300줄 초과 대형 클래스 다수 잔존
- 대표 파일:
  - `api/v1/Qa/Service/QaService.php` (943)
  - `api/v1/Qa/Repository/QaRepository.php` (748)
  - `api/v1/Comment/Repository/CommentRepository.php` (715)
  - `api/v1/Admin/System/Service/AdminSystemService.php` (693)
  - `api/v1/Member/Service/MemberService.php` (681)
  - `api/v1/Post/Repository/PostMutationRepository.php` (675)
- 영향: 변경 충돌/회귀 위험 증가, 테스트 격리 난이도 상승
- 조치 권고:
  - 도메인별 서브서비스/서브리포지토리 추가 분리(권한/검증/조회/변경/파일처리 단위)

### [P3] 라우트 분할은 진행 중(완료 전)
- 현황: `auth`, `boards`, `admin` 분리 완료
- 잔여: `members/files/devices/memos/qa/report/layouts` 그룹 분리 필요
- 영향: 메인 라우트 파일의 가독성/충돌 리스크가 아직 일부 남아 있음

---

## 최종 판정

이번 재감사 기준으로 **기능 안정성은 확보**되었습니다.  
다음 사이클의 최우선은 다음 2가지입니다.
1. 커버리지 드라이버 설치 및 CI 계측 활성화
2. QA/Comment/System/Member 대형 클래스 분할

---

## Commercial Viability 리포트 재검증 (2026-03-05 KST)

외부 상용성 평가 문서(`commercial_viability_report.md.resolved`)의 Blocker 항목을 현재 코드로 재검증했습니다.

### 재검증 결과
- **WS-1 댓글 ASCII 체인/넘버링**: 해소
  - `CommentRepository::resolveCommentThread()`에서 `wr_comment` 최대값+1 산정 및 `wr_comment_reply` ASCII 체인(`A..Z`) 생성/깊이 제한 적용.
- **WS-2 삭제 시 댓글 포인트 롤백**: 해소
  - `PostService::deletePost()`에서 게시글 삭제 전 댓글 목록 조회 후 `PostPointService::revokeCommentPointsForPost()`로 댓글별 회수 루프 실행.
- **WS-1 하드코딩/환경변수 의존성 정리**: 해소
  - `EnvConfig` 도입 및 다수 도메인에서 `$_ENV ?? getenv()` 직접 참조를 헬퍼/설정 객체로 일원화.

### 품질 게이트 재실행
- `./scripts/check_hardcoding.sh` → **PASS**
- `composer run analyse` → **PASS (level 8, 0 errors)**
- `composer run test` → **PASS (168 tests, 698 assertions)**

### 판단
- 상용성 리포트의 핵심 Blocker 3건은 **현재 코드 기준으로 처리 완료**입니다.
- 잔여 과제는 Blocker가 아닌 개선 과제(커버리지 드라이버, 대형 클래스 분할)입니다.
