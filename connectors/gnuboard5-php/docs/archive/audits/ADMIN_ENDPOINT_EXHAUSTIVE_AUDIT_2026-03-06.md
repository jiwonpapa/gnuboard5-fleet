# 관리자 도메인 엔드포인트 전수 감사 — 2026-03-06

## 1. 범위

- 대상 라우트: `api/routes/v1/admin.php`
- 총 관리자 메서드: `142`
  - `GET 65`
  - `POST 37`
  - `PUT 20`
  - `PATCH 10`
  - `DELETE 30`
- 실호출 범위: 스테이징 `https://gnurestapi.cc/api/v1/admin/**`의 `GET` 전부
- 제외: 상태 변경이 발생하는 `POST/PUT/PATCH/DELETE`는 실데이터 변형을 막기 위해 이번 감사에서 live 호출 제외

## 2. 방법

1. `api/routes/v1/admin.php`에서 관리자 `GET` 라우트 `65`개를 추출
2. 스테이징 관리자 계정(`mb_level=10`) JWT로 인증
3. 목록 응답에서 fixture를 자동 수집하고, 데이터가 없는 상세 경로는 대표값(`1`, `home`)으로 대체 호출
4. 실패 응답은 `request_id`와 서버 로그를 대조해 원인을 확정

## 3. 결과 요약

### 3.1 실배포 GET 결과

- `200 OK`: `50`
- `404 Not Found`: `3`
- `503 Service Unavailable`: `12`
- `500 Internal Server Error`: `0`
- `blocked`: `0`

즉, **관리자 GET 전수 기준으로 500은 모두 제거**됐습니다.

### 3.2 404 경로

아래 3건은 엔드포인트 장애가 아니라 **스테이징 데이터 부재**로 인한 정상 `404`입니다.

- `GET /admin/mails/{ma_id}` -> 메일 템플릿 데이터 없음
- `GET /admin/faqs/{fa_id}` -> FAQ 항목 데이터 없음
- `GET /admin/layouts/{page_id}` -> 레이아웃 데이터 없음

### 3.3 503 경로

아래 12건은 **코드 미구현이 아니라 스테이징 SMS 확장 스키마 미설치**로 인한 정상 `503`입니다.

- `GET /admin/sms/template-groups`
- `GET /admin/sms/template-groups/{fg_no}`
- `GET /admin/sms/templates`
- `GET /admin/sms/templates/{fo_no}`
- `GET /admin/sms/contact-groups`
- `GET /admin/sms/contact-groups/{bg_no}`
- `GET /admin/sms/contacts`
- `GET /admin/sms/contacts/export`
- `GET /admin/sms/contacts/{bk_no}`
- `GET /admin/sms/history/batches`
- `GET /admin/sms/history/batches/{wr_no}`
- `GET /admin/sms/history/deliveries`

실제 응답은 `500`이 아니라 `503 + request_id + error_code=server.service_unavailable + 누락 테이블명`까지 전달합니다.

## 4. 핵심 발견

### 4.1 해결된 장애

- `GET /admin/system/themes`의 `500` 제거
  - 원인: `g5_config.cf_mobile_theme`가 없는 레거시 스키마에서 컬럼을 직접 조회
  - 조치: 컬럼 존재 여부를 검사하고, 없으면 `cf_theme`만 읽고 `cf_mobile_theme=''`로 fallback

- SMS 관리자 list/detail 계열의 `500` 제거
  - 원인: `g5_sms5_form`, `g5_sms5_form_group`, `g5_sms5_book`, `g5_sms5_book_group`, `g5_sms5_write`, `g5_sms5_history` 부재
  - 조치: repository에서 필수 테이블 존재 여부를 먼저 검사하고, 누락 시 `503 Service Unavailable`로 명시 실패

### 4.2 현재 운영 상태 해석

- **구현 진행도 관점**: 관리자 메뉴 이행 자체는 완료 상태
- **스테이징 운영 가능성 관점**: SMS 확장 스키마가 없어서 SMS 관리자 기능은 현재 사용 불가

즉, **“코드는 있다”와 “현재 스테이징에서 바로 쓸 수 있다”를 분리해서 봐야 합니다.**

## 5. 비-GET 메서드 판정

`POST/PUT/PATCH/DELETE` `77`개는 이번 감사에서 실호출하지 않았습니다. 대신 아래 기준으로 정합성을 확인했습니다.

- `tests/Admin/**` 통과: `67 tests / 220 assertions`
- `phpstan` (`api/v1/Admin`, 관련 테스트/스크립트) 통과
- `OpenAPI`와 라우트 정합성 통과
- `scripts/run_schemathesis.sh`에 `SCHEMATHESIS_INCLUDE_ADMIN=true` 플래그를 추가해 이후 관리자 read-only 계약 감사를 재현 가능하게 보강

따라서 이번 문서는 **관리자 GET 런타임 전수 감사 + non-GET 정적/계약 감사**로 해석해야 합니다.

## 6. 권고

1. 스테이징에서 SMS 관리자 기능을 유지할지 먼저 결정한다.
   - 유지: `g5_sms5_*` 테이블 설치
   - 비대상: 관리자 UI/클라이언트에서 SMS 메뉴와 호출 차단

2. happy-path 상세 검증용 fixture를 최소한 3종 준비한다.
   - 메일 템플릿 1건
   - FAQ 항목 1건
   - 레이아웃 1건

3. 관리자 read-only 계약 감사를 정기화한다.
   - `SCHEMATHESIS_INCLUDE_ADMIN=true`
   - `SCHEMATHESIS_INCLUDE_PATH_REGEX='^/admin/'`
   - 관리자 토큰 또는 자동 로그인 fixture 사용

## 7. 결론

- 관리자 `GET` `65`개 전수 기준 **`500 = 0`**
- 남은 비정상은 전부 `404(데이터 부재)` 또는 `503(SMS 스키마 부재)`로 분류 가능
- 따라서 현재 관리자 도메인의 핵심 이슈는 **구현 누락보다 스테이징 운영 데이터/옵션 스키마 상태**입니다.
