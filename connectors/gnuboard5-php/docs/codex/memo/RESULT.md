# 메모 도메인 보강 결과

## 완료 항목
| WS | 항목 | 수정 파일 | 테스트 |
|---|---|---|---|
| WS-1 | 메모 도메인 신규 스캐폴딩 (`Gateway/Repository/Service/Controller`) | `api/v1/Integration/Contracts/MemoGateway.php`, `api/v1/Memo/Repository/MemoRepository.php`, `api/v1/Memo/Service/MemoService.php`, `api/v1/Memo/Controller/MemoController.php` | `tests/Memo/MemoServiceTest.php` |
| WS-1 | DI 및 라우트 연결 (`/v1/memos*`) | `api/container.php`, `api/routes.php` | `tests/contract/g5-repository/GatewayImplementationContractTest.php` |
| WS-2A | 다건 발송, 발신자 공개여부 검증, 수신자 검증, 포인트 차감(관리자 면제) | `api/v1/Memo/Service/MemoService.php`, `api/v1/Memo/Repository/MemoRepository.php` | `tests/Memo/MemoServiceTest.php` |
| WS-2B | 받은/보낸 목록 + 페이징 + 상대방 닉네임 JOIN | `api/v1/Memo/Repository/MemoRepository.php`, `api/v1/Memo/Service/MemoService.php` | `tests/Memo/MemoServiceTest.php` |
| WS-2C | 상세 조회 시 받은 쪽지 자동 읽음 처리 + 미확인 수 갱신 | `api/v1/Memo/Service/MemoService.php`, `api/v1/Memo/Repository/MemoRepository.php` | `tests/Memo/MemoServiceTest.php` |
| WS-2D | 삭제 시 미읽음 알림(`mb_memo_call`) 정리 + 카운트 갱신 | `api/v1/Memo/Service/MemoService.php`, `api/v1/Memo/Repository/MemoRepository.php` | `tests/Memo/MemoServiceTest.php` |
| WS-2E | 안읽은 수 API | `api/v1/Memo/Service/MemoService.php`, `api/v1/Memo/Controller/MemoController.php` | `tests/Memo/MemoServiceTest.php` |
| 문서/스키마 | OpenAPI 메모 엔드포인트 문서화 + `memo` 테이블 레지스트리 추가 | `api/docs/openapi.yaml`, `api/v1/Core/Database/TableRegistry.php` | YAML 파싱 검증 |

## 구현 포인트
- `MemoGateway` 메서드 수: `11`
- 엔드포인트 추가:
  - `GET /v1/memos`
  - `GET /v1/memos/unread-count`
  - `GET /v1/memos/{me_id}`
  - `POST /v1/memos`
  - `DELETE /v1/memos/{me_id}`
- `PointGateway` 연동: 발송 포인트 차감(`@memo`, `rel_id=수신자`, `rel_action=me_id`)

## 검증 결과
- `vendor/bin/phpstan analyse api/ --level=6 --memory-limit=1G` 통과
- `vendor/bin/phpunit tests/` 통과 (`OK (113 tests, 441 assertions)`)
- OpenAPI YAML 파싱 검증(`ruby + YAML.load_file`) 통과
