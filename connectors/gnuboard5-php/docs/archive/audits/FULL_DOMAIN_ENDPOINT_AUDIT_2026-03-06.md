# FULL DOMAIN ENDPOINT AUDIT 2026-03-06

## 1. 범위

- 대상: 스테이징 `https://gnurestapi.cc`
- 기준 명세: `api/docs/openapi.yaml`
- 기준 집계: 총 125 operations
- 목적: 실제 배포본 기준으로 전체 도메인 엔드포인트의 런타임 안정성과 문서 계약 정합성 검증

## 2. 방법

1. `Hurl full`
2. `Schemathesis read-only`
   - 일반 회원 인증
   - 관리자 인증
3. 수동 실사
   - 게시글 작성
   - 댓글 작성
   - 스크랩
   - QA 작성
   - Memo 발송
   - 신고 생성
   - 디바이스 등록
   - 플러그인 샘플
4. 전체 엔드포인트 매트릭스 감사
   - OpenAPI 125개 전 경로 실제 호출
   - 문서 상태코드와 실제 상태코드 비교

## 3. 초기 상태

초기 1차 감사에서 확인된 핵심 장애:

- `GET /api/v1/admin/reports` -> `500`
- `POST /api/v1/boards/free/posts/{wr_id}/comments` -> `500`
- `POST /api/v1/boards/free/posts/7/scrap` -> `500`
- `POST /api/v1/qa` -> `500`
- `POST /api/v1/memos` -> `500`
- `POST /api/v1/p/premium-push/send` -> 문서 `402`, 실제 `503`
- 매트릭스 결과: `125개 중 22개 실패`

## 4. 수행 사이클

### Cycle 1

- 리포지토리 공용 DB 연결 캐시화
- 레거시 데이터 경로 해석 통합
- 관리자 신고 스키마 편차 흡수
- 댓글 `ca_name` 보정
- 메모 unread zero-date 대응
- 플러그인 라이선스 예외를 RFC 7807로 보정
- 스테이징 `.env` 교정
  - `APP_ENV=staging`
  - `DATA_PATH=/home/neojins/public_html/data`

결과:

- `Admin Report`, `Scrap`, `QA`, `Memo`, `PremiumPush` 정상화
- 댓글은 `500`에서 다른 스키마 제약 문제로 축소
- 매트릭스 결과: `125개 중 20개 실패`

### Cycle 2

- 댓글 insert에 `wr_option` 반영
- OpenAPI 상태코드 누락(`400/401/404`) 대거 보정
- Member datetime 문자열 계약 일부 보정

결과:

- 댓글 정상 플로우 `500` 제거
- 매트릭스 결과: `125개 중 0개 실패`
- 다만 Schemathesis에서 `Post/Point` datetime 문서 오조정 확인

### Cycle 3

- 공통 `ApiResponse`가 생성 응답의 `201`을 `200`으로 덮어쓰던 문제 수정
- `Comment`, `QA` 생성 성공 응답 `201` 확인
- `Post/Point` datetime 스키마를 RFC 3339 기준으로 복구
- 파일 다운로드 경로 `400` 계약 반영

결과:

- 생성 성공 응답 계약 보정 완료
- Schemathesis 실패 0건 달성

## 5. 최종 결과

### 5.1 Hurl

- `4/4` 파일 통과

### 5.2 Schemathesis

- 회원 인증 기준: `49/49 operations passed`
- 관리자 인증 기준: `49/49 operations passed`
- 실패 0건

남은 warning:

- 관리자 엔드포인트를 회원 토큰으로 두드렸을 때의 `403` 경고
- 일부 성공 fixture 부족으로 인한 `404` warning
- `/admin/board-groups/{gr_id}`, `/admin/board-groups/{gr_id}/members`는 문서 파라미터 제약보다 실제 검증이 더 엄격하다는 warning

### 5.3 전체 엔드포인트 매트릭스

- 총 `125/125` 성공
- 태그별 실패 `0`

## 6. 최종 실사 체크

실제 성공 응답 확인:

- `POST /api/v1/boards/free/posts/8/comments` -> `201 Created`
- `POST /api/v1/qa` -> `201 Created`
- `POST /api/v1/memos` -> `201 Created`
- `POST /api/v1/reports` -> `201 Created`
- `POST /api/v1/devices` -> `201 Created`
- `POST /api/v1/boards/free/posts/7/scrap` -> `409 Conflict`(중복 스크랩 정상)
- `GET /api/v1/admin/reports` -> `200 OK`
- `POST /api/v1/p/premium-push/send` -> `402 Payment Required`

## 7. 결론

- 실배포본 기준 주요 런타임 장애는 해소됨
- 전체 125개 엔드포인트 상태코드 계약은 현재 매트릭스 기준 `0 failures`
- Schemathesis 기준도 실패 `0`
- 현재 잔여 항목은 “실패”가 아니라 fixture 보강 및 파라미터 제약 문서 정밀화 수준

## 8. 잔여 권고

1. Schemathesis fixture를 더 넣어 `404 warning`을 줄일 것
2. `/admin/board-groups/{gr_id}` 계열 path parameter pattern을 OpenAPI에 더 엄격히 반영할 것
3. 이 감사 루틴을 야간 배치로 고정해 회귀를 자동 감시할 것
