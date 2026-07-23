# API 문서/구현 감사 리포트 (2026-03-04, 조치 완료본)

## 1) 감사 범위
- `docs/API_SPEC.md`
- `.agent/Constitution.md`
- `.agent/workflows/*.md`
- `api/routes.php`, `api/v1/*`
- 품질 게이트 (`./scripts/check_hardcoding.sh`, `./vendor/bin/phpunit`)

## 2) 결론 요약
- **판정: 이슈 조치 완료**
- 직전 감사에서 남아 있던 4건(스크립트 추적, 공개프로필 라우트 인증 맥락, Config 예시 필드, 헌법 DB 규칙 충돌)을 모두 반영 완료.
- 현재 기준으로 문서-구현-테스트 게이트가 동일한 기준으로 동작함.
- 2026-03-04 15:10 기준으로 api 진입점 파일(`api/index.php`, `api/routes.php`)의 `@package` 표기 오기를 정정함.

## 3) 이슈별 조치 결과

### 3.1 하드코딩 검사 스크립트 추적 누락
- 조치: `.gitignore`에 `!scripts/check_hardcoding.sh` 예외 추가
- 결과: 스크립트를 Git 추적 대상으로 회복할 수 있는 상태로 정리

### 3.2 `/members/{mb_id}` 문서 정책 vs 라우팅 불일치
- 조치: `api/routes.php`의 `/members/{mb_id}`에 `OptionalJwtAuthMiddleware` 적용
- 결과: JWT가 있으면 관리자 레벨 컨텍스트 전달, 없으면 공개 조회 정책으로 처리 가능

### 3.3 Config 예시 필드 오기재
- 조치: `docs/API_SPEC.md` 예시의 `cf_member_point`를 `cf_register_point`로 정정
- 결과: 실제 `ConfigRepository` 화이트리스트와 문서 예시 일치

### 3.4 헌법 DB 규칙과 레거시 연동 충돌
- 조치: `.agent/Constitution.md` §4.3 문구를 레거시 그누보드 DB API 연동 규칙(escape + 화이트리스트 + 정규식 검증) 기준으로 현실화
- 결과: 코드리뷰 기준과 실제 구현 방식의 충돌 해소

### 3.5 도메인별 연동계층 확장 (Board/Comment/Post/Like/Point)
- 조치: Service 계층을 Repository 인터페이스(`*Gateway`)로 전환하고, Repository 구현체는 공통 `GnuboardDependencyGuard`로 핵심 함수 존재를 fail-fast 검증하도록 정합화
- 결과: 
  - `Board`, `Post`, `Comment`, `Like`, `Point` 도메인에서 직접 구현체 결합 제거(서비스 주입 타입 기반)
  - 관련 미들웨어(`JwtAuthMiddleware`, `OptionalJwtAuthMiddleware`)도 AuthGateway 기반으로 정합
  - `MenuRepository`도 직접 의존성 검사 예외 경고 해소를 위한 가드 적용
  - 문서(`.agent/Constitution.md`, `docs/API_SPEC.md`) 반영

### 3.6 API 진입점 헤더 정합성
- 조치: `api/index.php`, `api/routes.php`의 `@package` 표기에서 trailing backslash(`Gnuboard5\Api\`) 오기입을 `Gnuboard5\Api`로 정정
- 결과: 헌법 헤더 규약 및 내부 정적 점검 기준 정합

## 4) 실행 검증 결과
- `./scripts/check_hardcoding.sh`: 통과
- `./vendor/bin/phpunit -c phpunit.xml --colors=never`: **23 tests, 46 assertions, 100% 통과**
- (추가 재검증) `./vendor/bin/phpunit -c phpunit.xml --colors=never --testdox`: **OK(23 tests, 46 assertions)**

## 5) 최종 판정
- **현재 문서/코드 상태에서 도메인별 API 개발 및 스테이징 배포 진행 가능.**

---

## 6) 추가 자기감사 (2026-03-04 CODEX_MASTER_PROMPT 페이즈)

### 6.1 반영 항목
- `api/v1/Admin/*` 10개 도메인(Board/Group/Member/Config/Point/Content/Faq/Menu/Popular/Visit) 구현
- `api/routes.php`에 `/api/v1/admin/*` 라우트 등록 + `JwtAuthMiddleware` + `AdminGuardMiddleware` 체인 적용
- Core 정적분석 잔여 이슈(`LegacySqlExecutor`, `PostRepository`, `CommentRepository`) 해소
- Admin 신규 검증 테스트 `tests/Admin/AdminValidationServiceTest.php` 추가
- DDL 문서 추가: `group.md`, `content.md`, `faq.md`, `popular.md`, `visit.md`
- `docs/API_SPEC.md` 구현 범위 섹션을 Admin API 포함 상태로 갱신

### 6.2 품질 게이트 결과
- `composer run analyse`: **통과 (PHPStan Level 8, 0 errors)**
- `composer run test`: **통과 (26 tests, 49 assertions)**
- G5 잔존 의존 grep(`common.php|sql_query|sql_fetch|get_member|insert_point|G5_TIME_YMDHIS|G5_DATA_PATH`, Core/Setup 제외): **0건**

### 6.3 런타임 점검 메모
- 내장 서버 기반 `/api/index.php/v1/health` 확인 시, 현재 로컬 DB 소켓 미연결로 bootstrap 503이 발생함.
- 코드 레벨 health payload(`g5_independent`) 구현은 완료되었으며, 실제 200 확인은 DB 연결 가능한 런타임에서 재검증 필요.

### 6.4 후속 구현 반영 (Push/SDUI/UGC)
- 신규 구현 도메인:
  - 사용자: `/devices`, `/members/me/notifications`, `/layouts`, `/reports`, `/blocks`
  - 관리자: `/admin/push/send`, `/admin/layouts/*`, `/admin/reports*`
- 반영 파일:
  - 코드: `api/v1/Device`, `api/v1/Notification`, `api/v1/Layout`, `api/v1/Report`, `api/v1/Block`, `api/v1/Admin/{Push,Layout,Report}`, `api/routes.php`
  - 문서: `docs/API_SPEC.md`, `api/docs/openapi.yaml`, `docs/ddls/push_notification.md`, `docs/ddls/sdui_layout.md`, `docs/ddls/report_block.md`
- 품질 게이트 재실행:
  - `composer run test`: **63 tests, 139 assertions, 100% 통과**
  - `composer run analyse`: **통과 (PHPStan Level 8, 0 errors)**
  - `./scripts/check_hardcoding.sh`: **통과**
