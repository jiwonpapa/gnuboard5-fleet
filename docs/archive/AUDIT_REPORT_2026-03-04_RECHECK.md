# API 문서/구현 재감사 리포트 (2026-03-04)

## 1) 감사 목적

- `docs` 기준으로 미흡/미구현 항목을 재점검
- 문서 요구사항을 코드/테스트/운영 스크립트에 직접 반영
- 스테이징 배포·롤백 리허설 실증

## 2) 핵심 판정

- **판정: 조치 완료**
- 문서상 미완료로 남아 있던 항목(계약 테스트, 호환 매트릭스, 스테이징 리허설)을 모두 구현/실행했다.

## 3) 조치 내역

### 3.1 계약 테스트 및 실패 시나리오 테스트 추가

- 추가 파일:
  - `tests/contract/g5-repository/GatewayImplementationContractTest.php`
  - `tests/contract/g5-repository/FailureScenarioContractTest.php`
- 반영 내용:
  - Repository ↔ Gateway 인터페이스 계약 검증
  - Service/Middleware 생성자 계약 의존성 검증
  - Service/Controller/Middleware 레이어의 레거시 함수 직접 호출 금지 검증
  - setup 비활성(404), `.env` 누락 탐지 등 실패 시나리오 검증

### 3.2 버전 호환 매트릭스 문서화

- 추가 파일:
  - `docs/compatibility/gnuboard-version-matrix.md`
- 반영 내용:
  - 지원 버전 범위(PHP/Gnuboard) 고정
  - 업그레이드 게이트와 배포 차단 기준 문서화

### 3.3 배포/롤백 자동화 스크립트 보강

- 추가 파일:
  - `scripts/build_release_package.sh`
  - `scripts/deploy_staging.sh`
  - `scripts/rollback_staging.sh`
- 반영 내용:
  - 테스트 통과 전 패키징/배포 차단(`php -l`, hardcoding, PHPStan, PHPUnit)
  - 스테이징 백업 생성 후 배포
  - 스모크 실패 시 자동 롤백
  - 리허설 모드(`--rehearsal`) 제공

### 3.4 PDO 기본 경로 강제

- 수정 파일:
  - `api/v1/Core/Database/LegacySqlExecutor.php`
  - `tests/bootstrap.php`
  - `.env.example`
- 반영 내용:
  - `LEGACY_SQL_FALLBACK=false` 기본값으로 런타임 기본 경로를 PDO 중심으로 고정
  - 테스트에서만 명시적으로 레거시 폴백 활성화

### 3.5 문서 정합성 갱신

- 수정 파일:
  - `docs/architecture/G5_INTEGRATION_LAYER_DRAFT.md`
  - `docs/review/04_G5_DECOUPLING_ROADMAP.md`
  - `docs/API_SPEC.md`
  - `docs/HISTORY.md`
- 반영 내용:
  - DoD 체크리스트 상태 갱신
  - 오픈 이슈를 결정 사항으로 정리
  - 배포 게이트/계약 테스트 경로 명시

## 4) 실행 검증

- `composer run test`: **51 tests, 120 assertions, OK**
- `composer run analyse`: **PHPStan Level 8, 0 errors**
- `./scripts/check_hardcoding.sh`: **passed**

## 5) 스테이징 리허설 실증

- 실행 명령:
  - `./scripts/deploy_staging.sh --skip-quality --dry-run`
  - `./scripts/deploy_staging.sh --skip-quality --rehearsal`
- 결과:
  - 원격 백업 생성
  - 배포 후 `/api/v1/health`, `/api/docs/` 스모크 통과
  - 자동 롤백 후 동일 스모크 재통과
  - 배포/롤백 리허설 1회 완료

## 6) 최종 결론

- 문서 기준 미흡/미구현으로 남아 있던 항목은 이번 재감사 범위 내에서 모두 조치 완료.
- `docs/review/01~03`은 문서 자체에 명시된 "계획 단계(vNext)" 항목으로 분류되며, 현행 v1 배포 게이트 대상에서 제외한다.
