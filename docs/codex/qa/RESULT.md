# QA(1:1문의) 도메인 구현 결과

## 완료 항목
| WS | 항목 | 수정 파일 | 테스트 |
|---|---|---|---|
| WS-1 | QA 신규 스캐폴딩 (`Gateway/Repository/Service/Controller`) | `api/v1/Integration/Contracts/QaGateway.php`, `api/v1/Qa/Repository/QaRepository.php`, `api/v1/Qa/Service/QaService.php`, `api/v1/Qa/Controller/QaController.php` | `tests/Qa/QaServiceTest.php` |
| WS-1 | DI 및 라우트 연결 (`/v1/qa*`, `/v1/admin/qa`) | `api/container.php`, `api/routes.php` | `tests/contract/g5-repository/GatewayImplementationContractTest.php` |
| WS-2A | 질문 등록(카테고리/이메일/길이/XSS/파일업로드/qa_num) | `api/v1/Qa/Service/QaService.php`, `api/v1/Qa/Repository/QaRepository.php` | `tests/Qa/QaServiceTest.php` |
| WS-2B | 답변 등록(관리자 전용, 답변 상태 반영) | `api/v1/Qa/Service/QaService.php`, `api/v1/Qa/Repository/QaRepository.php` | `tests/Qa/QaServiceTest.php` |
| WS-2C | 수정(권한/답변완료 질문 수정 제한/파일 삭제·교체) | `api/v1/Qa/Service/QaService.php`, `api/v1/Qa/Repository/QaRepository.php` | `tests/Qa/QaServiceTest.php` |
| WS-2D | 삭제(권한/답변 연쇄삭제/답변 삭제 시 상태복원) | `api/v1/Qa/Service/QaService.php`, `api/v1/Qa/Repository/QaRepository.php` | `tests/Qa/QaServiceTest.php` |
| WS-2E/F | 목록/상세(답변+관련질문+첨부 메타) + 다운로드 | `api/v1/Qa/Service/QaService.php`, `api/v1/Qa/Repository/QaRepository.php`, `api/v1/Qa/Controller/QaController.php` | `tests/Qa/QaServiceTest.php` |
| 문서화 | OpenAPI QA 태그 및 엔드포인트 명세 추가 | `api/docs/openapi.yaml` | YAML 파싱 검증 |

## 구현 요약
- QA 엔드포인트:
  - `GET /v1/qa`
  - `GET /v1/qa/{qa_id}`
  - `POST /v1/qa`
  - `POST /v1/qa/{qa_id}/answer`
  - `POST /v1/qa/{qa_id}/related`
  - `PATCH /v1/qa/{qa_id}`
  - `DELETE /v1/qa/{qa_id}`
  - `GET /v1/qa/{qa_id}/files/{no}/download`
  - `DELETE /v1/admin/qa`
- `QaGateway` 메서드 수: `11`
- 파일 정책:
  - 저장 경로: `data/qa`
  - 최대 2개 업로드
  - 관리자 외 `qa_upload_size` 제한 적용
  - 악성 확장자 `-x` 치환
  - 이미지/플래시 `getimagesize()` 유효성 검사
  - `md5(sha1(ip)) + random + safe filename` 형식 저장명 사용

## 검증
- `vendor/bin/phpstan analyse api/ --level=6 --memory-limit=1G`
- `vendor/bin/phpunit tests/`
