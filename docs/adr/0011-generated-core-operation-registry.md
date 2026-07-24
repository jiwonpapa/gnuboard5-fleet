# ADR-0011: Canonical OpenAPI 기반 Core 189 registry

- 상태: 채택
- 날짜: 2026-07-24

## 결정

Core 소비 경계는 canonical OpenAPI와
`openapi.phase1-consumer-scope.json`에서 기계적으로 생성합니다.

- exact active operation은 비쇼핑 관리자 184개와 bootstrap 5개, 총 189개입니다.
- Shop 26개는 PHP 공급자에 보존하지만 Fleet Core registry에는 0개입니다.
- Rust 서버와 React 웹은 byte-identical
  `g5-fleet.core-operations/v1` registry를 사용합니다.
- registry에는 method, path, operationId, parameter, request·response field,
  연결 schema, risk, transport가 포함됩니다.
- 연결된 OpenAPI schema와 17개 schema domain의 field 목록도 함께 생성합니다.
- 생성 결과가 canonical 입력과 다르면 감사 게이트가 실패합니다.

## 실행 경계

G5 health·login·refresh·logout은 비밀번호와 토큰 수명주기를 감추는 전용
Fleet route가 소유합니다. 나머지 Core 연산은 하나의 site-bound Axum proxy가
operationId allowlist, path·query·body field, CSRF와 risk-based step-up을
검증한 뒤 Rust Connector로 전달합니다.

DELETE는 명시 확인을 요구합니다. 메일·SMS·Push 외부 발송 9개는 registry에
보존하되 routine 실행을 차단하고 B08 fake delivery 경계로 넘깁니다. 응답은
JSON 또는 제한된 Base64 binary로 정규화하며 browser에 G5 JWT를 전달하지
않습니다.

## 증거 경계

자동 테스트는 mock Connector에서 조회와 config 수정·재조회·원복,
token refresh·logout, 외부 효과 차단을 검증합니다. 189개 실제 G5 operation의
실데이터 실행을 뜻하지 않으며 실제 PHP·G5 런타임 인증은 B10에서 수행합니다.
