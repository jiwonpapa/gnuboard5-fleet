# API 블랙박스 테스트 (Schemathesis + Hurl)

## 목적
- `Schemathesis`: OpenAPI 명세 기반 자동 생성/퍼징 테스트(자동 폭격)
- `Hurl`: 고정 회귀 시나리오 테스트(빠른 안정성 게이트)

이 문서는 형님 프로젝트의 실전 기본 조합인 `1+2`를 로컬/스테이징에서 반복 실행하기 위한 기준입니다.

참고:
- 이 문서는 내부 REST API 블랙박스 테스트 기준이다.
- 본인인증/소셜로그인 같은 외부 공급자 mock/sandbox/live 전략은 `docs/testing/EXTERNAL_PROVIDER_TESTING_REVIEW.md`와 `docs/testing/EXTERNAL_PROVIDER_SANDBOX_MATRIX.md`를 따른다.
- 실제 provider smoke는 Schemathesis 기본 세트에 자동 편입하지 않는다. 현재 `google`, `kakao` staging smoke는 `docs/testing/EXTERNAL_PROVIDER_SANDBOX_MATRIX.md` 체크리스트를 수동 절차로 따른다.

## 1. 1회 설치

```bash
./scripts/setup_api_test_tools.sh
```

설치 결과:
- `hurl` (Homebrew)
- `.venv-tools/bin/st` (Schemathesis CLI)

## 2. 개별 실행

### Hurl 회귀 테스트
```bash
BASE_URL=https://gnurestapi.cc ./scripts/run_hurl_suite.sh
```

기본 프로파일:
- `HURL_PROFILE=smoke` (health/docs/openapi)
- `HURL_PROFILE=full` (strict 인증 시나리오 포함)

### Schemathesis 자동 폭격
```bash
TARGET_ORIGIN=https://gnurestapi.cc ./scripts/run_schemathesis.sh
```

기본값:
- 프로파일: `read-only` (GET/HEAD/OPTIONS만)
- 모드: `positive`
- 체크: `not_a_server_error,status_code_conformance,content_type_conformance,response_headers_conformance,response_schema_conformance`
- TLS 검증: `SCHEMATHESIS_TLS_VERIFY=false` (사설/자체서명 스테이징 인증서 대응)

## 3. 통합 실행 (권장)

```bash
TARGET_ORIGIN=https://gnurestapi.cc ./scripts/run_api_contract_bombing.sh
```

실행 순서:
1. Hurl 고정 회귀
2. Schemathesis 스펙 폭격

엄격 모드 예시:
```bash
HURL_PROFILE=full TARGET_ORIGIN=https://gnurestapi.cc ./scripts/run_api_contract_bombing.sh
```

## 4. 운영 옵션

### Schemathesis 전체 메서드 테스트
```bash
SCHEMATHESIS_PROFILE=full TARGET_ORIGIN=https://gnurestapi.cc ./scripts/run_schemathesis.sh
```

### 인증 헤더 주입
```bash
SCHEMATHESIS_BEARER_TOKEN=<JWT_ACCESS_TOKEN> TARGET_ORIGIN=https://gnurestapi.cc ./scripts/run_schemathesis.sh
```

### 자동 로그인 + 자동 픽스처 수집 (권장)
```bash
SCHEMATHESIS_AUTH_MB_ID=<ID> \
SCHEMATHESIS_AUTH_MB_PASSWORD=<PASSWORD> \
TARGET_ORIGIN=https://gnurestapi.cc \
./scripts/run_schemathesis.sh
```

동작:
- `SCHEMATHESIS_BEARER_TOKEN`이 없으면 `/auth/login`으로 토큰 자동 발급 시도
- `bo_table`, `wr_id`, `mb_id`, `page_id`, `widget_id`, `bf_no`, `gr_id`, `ma_id`, `me_id`, `po_id`, `qa_id`, `report_id`를 API에서 자동 수집 시도
- 파일/링크/문의첨부 경로는 `file_bo_table/file_wr_id`, `link_bo_table/link_wr_id/link_no`, `qa_file_id/qa_file_no`를 경로별로 별도 주입
- 누락 픽스처가 있으면 해당 경로를 자동 제외해 무의미한 404 경고를 줄임
- `schemathesis_hooks.py`가 자동 로드되어 `page/per_page` 범위와 path 파라미터를 안정화
- `gr_id`는 런타임 검증과 동일하게 `^[A-Za-z0-9_]{1,10}$` 패턴으로 문서와 훅이 함께 고정됨
- 스테이징에서 `.tmp_schemathesis_auth.env`를 운영할 때는, 파일 값만 맞추는 것으로 끝내지 말고 그 `mb_id`가 실제 `g5_member`에 존재하며 `create_hash` 호환 해시와 `mb_email_certify`가 살아 있는지 같이 점검해야 함. DB refresh 이후 이 계정이 누락되면 `/auth/login -> /members/me` 성공 경로 검증이 다시 막힘

주요 토글:
- `SCHEMATHESIS_AUTO_AUTH=true|false`
- `SCHEMATHESIS_AUTO_EXCLUDE_AUTH_REQUIRED_WHEN_NO_TOKEN=true|false`
- `SCHEMATHESIS_AUTO_FIXTURES=true|false`
- `SCHEMATHESIS_AUTO_EXCLUDE_MISSING_FIXTURES=true|false`
- `SCHEMATHESIS_GENERATION_WITH_SECURITY_PARAMETERS=false` (기본값 권장)
- `SCHEMATHESIS_GENERATION_ALLOW_X00=false` (기본값 권장)

### 테스트 강도 조절
```bash
SCHEMATHESIS_MAX_EXAMPLES=50 SCHEMATHESIS_WORKERS=8 TARGET_ORIGIN=https://gnurestapi.cc ./scripts/run_schemathesis.sh
```

### TLS 엄격 검증으로 실행
```bash
SCHEMATHESIS_TLS_VERIFY=true TARGET_ORIGIN=https://gnurestapi.cc ./scripts/run_schemathesis.sh
```

## 5. 결과 리포트 경로
- Hurl JUnit: `dist/reports/hurl/junit.xml`
- Schemathesis 리포트: `dist/reports/schemathesis/`
  - `junit.xml`
  - `events.ndjson`

## 6. Composer 단축 명령

```bash
composer run test:api:hurl
composer run test:api:schemathesis
composer run test:api:blackbox
```
