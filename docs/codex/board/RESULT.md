# 게시판 도메인 보강 결과

## 완료 항목
| WS | 항목 | 수정 파일 | 테스트 |
|---|---|---|---|
| WS-1A | 게시글 하위 파일 API 추가 (`/v1/boards/{bo_table}/posts/{wr_id}/files` 계열) | `api/v1/File/Service/FileService.php`, `api/v1/File/Repository/FileRepository.php`, `api/v1/File/Controller/FileController.php`, `api/v1/Integration/Contracts/FileGateway.php`, `api/routes.php`, `api/docs/openapi.yaml` | `tests/File/FileServiceBoardRuleTest.php` |
| WS-1B | 답변(Reply) 스레딩 API 추가 (`POST /v1/boards/{bo_table}/posts/{wr_id}/reply`) | `api/v1/Post/Service/PostService.php`, `api/v1/Post/Repository/PostRepository.php`, `api/v1/Post/Controller/PostController.php`, `api/routes.php` | `tests/Post/PostServiceBoardRuleTest.php` |
| WS-1C | 글 삭제 보호(답변 존재/댓글 임계치) + 스크랩/첨부파일 정리 | `api/v1/Post/Service/PostService.php`, `api/v1/Post/Repository/PostRepository.php` | `tests/Post/PostServiceBoardRuleTest.php` |
| WS-1D | 댓글 포인트/최근글/카운트/삭제보호 보강 | `api/v1/Comment/Service/CommentService.php`, `api/v1/Comment/Repository/CommentRepository.php`, `api/v1/Integration/Contracts/CommentGateway.php` | `tests/Comment/CommentServiceBoardRuleTest.php` |
| WS-2A | 3단계 관리자 권한(super/group/board) 서비스 적용 | `api/v1/Board/Service/BoardService.php`, `api/v1/Post/Service/PostService.php`, `api/v1/Comment/Service/CommentService.php` | `tests/Post/PostServiceBoardRuleTest.php`, `tests/Comment/CommentServiceBoardRuleTest.php` |
| WS-2B | 연속 글쓰기/댓글쓰기 제한(`cf_delay_sec`) 적용 | `api/v1/Board/Repository/BoardRepository.php`, `api/v1/Board/Service/BoardService.php`, `api/v1/Post/Service/PostService.php`, `api/v1/Comment/Service/CommentService.php`, `api/v1/Support/Exception/ApiException.php` | 기존/신규 단위테스트 통과 |
| WS-2C | 읽기 포인트 차감 적용 | `api/v1/Post/Service/PostService.php`, `api/v1/Post/Repository/PostRepository.php` | `tests/Post/PostServiceBoardRuleTest.php` |
| WS-2D | 그룹 접근 제한(`gr_use_access`) 적용 | `api/v1/Board/Repository/BoardRepository.php`, `api/v1/Board/Service/BoardService.php`, `api/v1/Post/Service/PostService.php`, `api/v1/Comment/Service/CommentService.php` | 기존/신규 단위테스트 통과 |
| WS-2E | 게시판 그룹 CRUD API 제공 (`/v1/admin/board-groups`) | `api/routes.php` (기존 `AdminGroupController` 재사용) | 라우트 수동 검증 |
| WS-2F | `wr_link1/wr_link2` 저장 + 링크 hit/리다이렉트(`GET /v1/boards/{bo_table}/posts/{wr_id}/link/{link_no}`) | `api/v1/Post/Service/PostService.php`, `api/v1/Post/Repository/PostRepository.php`, `api/v1/Post/Controller/PostController.php`, `api/routes.php`, `api/v1/Integration/Contracts/PostGateway.php` | `tests/Post/PostServiceBoardRuleTest.php` |
| WS-2G | 스크랩 CRUD (`POST/DELETE /v1/boards/{bo_table}/posts/{wr_id}/scrap`, `GET /v1/members/me/scraps`) | `api/v1/Post/Service/PostService.php`, `api/v1/Post/Repository/PostRepository.php`, `api/v1/Post/Controller/PostController.php`, `api/v1/Integration/Contracts/PostGateway.php`, `api/routes.php`, `api/docs/openapi.yaml` | `tests/Post/ScrapTest.php` |
| WS-2H | 최근글 조회/관리 (`GET /v1/boards/new-posts`, `DELETE /v1/admin/boards/new-posts`) + 새글 삭제 시 실제 글/댓글 삭제 프로세서 위임 | `api/v1/Post/Service/PostService.php`, `api/v1/Post/Repository/PostRepository.php`, `api/v1/Post/Controller/PostController.php`, `api/v1/Integration/Contracts/PostGateway.php`, `api/routes.php`, `api/docs/openapi.yaml` | `tests/Post/NewPostsTest.php` |

## 정합성 보완
- Gateway 인터페이스 확장분 구현 누락 해소
  - `BoardGateway`: `isGroupMember`, `getConfig`
  - `PostGateway`: reply/delete/read-point/link/scrap/new-posts 관련 메서드
  - `CommentGateway`: point/board_new/count/delay 관련 메서드
- 계약 테스트 보정
  - `tests/contract/g5-repository/FailureScenarioContractTest.php`

## PHPStan 결과
- 명령: `vendor/bin/phpstan analyse api/ --level=6 --memory-limit=1G`
- 결과: 통과(에러 0)

## PHPUnit 결과
- 명령: `vendor/bin/phpunit tests/`
- 결과: 통과 (`OK (123 tests, 535 assertions)`)

## 미완료 항목
- 없음 (P0/P1 범위 내 반영 완료)
