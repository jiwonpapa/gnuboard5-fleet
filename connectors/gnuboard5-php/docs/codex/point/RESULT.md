# 포인트 도메인 보강 결과

## 완료 항목
| WS | 항목 | 수정 파일 | 테스트 |
|---|---|---|---|
| WS-1A | `PointGateway` 확장 (`grant/revoke/exists/syncTotal/deleteById/getSummary/expirePoints`) | `api/v1/Integration/Contracts/PointGateway.php` | `tests/contract/g5-repository/GatewayImplementationContractTest.php` |
| WS-1B | 포인트 엔진 통합 구현 (`PointRepository` 단일 엔진화) | `api/v1/Point/Repository/PointRepository.php` | `tests/Point/PointRepositoryTest.php` |
| WS-1C | Post/Auth/AdminPoint 호출자 포인트 SQL 제거 및 `PointGateway` 전환 | `api/v1/Post/Service/PostService.php`, `api/v1/Post/Repository/PostRepository.php`, `api/v1/Auth/Service/AuthService.php`, `api/v1/Auth/Repository/AuthRepository.php`, `api/v1/Admin/Point/Service/AdminPointService.php`, `api/v1/Admin/Point/Repository/AdminPointRepository.php`, `api/v1/Integration/Contracts/AuthGateway.php`, `api/v1/Integration/Contracts/PostGateway.php` | `tests/Post/PostServicePointTest.php`, `tests/Auth/AuthServicePointTest.php`, 기존 테스트 |
| WS-2A | 관리자 포인트 선택 삭제 API (`DELETE /v1/admin/points`) | `api/v1/Admin/Point/Controller/AdminPointController.php`, `api/v1/Admin/Point/Service/AdminPointService.php`, `api/routes.php` | 수동 라우트 검증 + PHPUnit 통과 |
| WS-2B | 관리자 포인트 검색 보강 (`search_field=mb_id/po_content`) | `api/v1/Admin/Point/Repository/AdminPointRepository.php`, `api/v1/Admin/Point/Service/AdminPointService.php` | 기존/신규 테스트 통과 |
| WS-2C | 포인트 합계 API (`GET /v1/admin/points/summary`) | `api/v1/Admin/Point/Controller/AdminPointController.php`, `api/v1/Admin/Point/Service/AdminPointService.php`, `api/routes.php` | 수동 라우트 검증 + PHPUnit 통과 |
| WS-2D | 포인트 만료 배치 API (`POST /v1/admin/points/expire`) | `api/v1/Point/Repository/PointRepository.php`, `api/v1/Admin/Point/Controller/AdminPointController.php`, `api/v1/Admin/Point/Service/AdminPointService.php`, `api/routes.php` | 수동 라우트 검증 + PHPUnit 통과 |
| 문서 반영 | Swagger(OpenAPI) 관리자 포인트 경로 추가 | `api/docs/openapi.yaml` | `tests/hurl/02-swagger-ui.hurl`, `tests/hurl/03-openapi.hurl` 기반 회귀 통과 |

## 구조 정합성
- `PointGateway` 메서드 수: `8`
- `PointRepository` 공개 메서드 수: `9`
- `PostRepository` 포인트 직접 SQL/메서드 제거 확인: `0`
- `AuthRepository` 포인트 직접 SQL/구 구현(`grantRegisterPoint`, `grantRecommendPoint`) 제거 확인: `0`

## 테스트 결과
- PHPStan: `vendor/bin/phpstan analyse api/ --level=6 --memory-limit=1G` 통과
- PHPUnit: `vendor/bin/phpunit tests/` 통과 (`OK (105 tests, 401 assertions)`)

## 비고
- `QueryBuilder`는 단위 테스트 가능성을 위해 `final` 제거(`api/v1/Core/Database/QueryBuilder.php`).
