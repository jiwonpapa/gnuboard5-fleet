# ADR-0010: 첫 사이트 수직 흐름과 증거 경계

- 상태: 채택
- 날짜: 2026-07-24

## 결정

첫 활성 소비는 canonical OpenAPI의 `getHealth`, `login`, `adminGetConfig`,
`adminUpdateConfig` 네 연산으로 제한합니다.

- 브라우저는 Fleet Axum 서버에만 same-origin 요청합니다.
- 모든 Connector 요청은 인증된 사용자와 명시적 `site_id`에 귀속합니다.
- G5 관리자 비밀번호는 요청 처리 중 메모리에만 두고 저장하지 않습니다.
- G5 access·refresh token은 서버의 site-bound AES-256-GCM secret으로만 저장합니다.
- 변경 연산은 Fleet CSRF와 최근 step-up 인증을 모두 요구합니다.
- 최초 가역 검증 필드는 `cf_10` 하나이며 기준값 저장, 수정, 재조회, 원복,
  원복 재조회까지 한 테스트로 닫습니다.
- Connector는 redirect를 따르지 않고 최초 DNS 고정과 연결 직전 DNS 재검증을
  수행합니다.

## 증거 경계

B05의 자동 게이트는 Rust mock Connector를 사용해
`browser contract → Axum → Connector client → 저장·재조회·원복`을 재현합니다.
실제 GnuBoard5 v5.6.32·PHP Connector·DB 런타임 증거는 B09의 재현 가능한
Compose 입력이 생긴 뒤 B10 `LOCAL_RUNTIME_PASS`에서 같은 시나리오로 다시
확인합니다. 자동 게이트 결과를 실제 PHP·G5 런타임 PASS로 표현하지 않습니다.

## 결과

이 경계를 템플릿으로 B06 Core 연산을 확대할 수 있습니다. React에는 G5 JWT,
SSH secret, 전역 활성 사이트 또는 Tauri `invoke()`가 생기지 않습니다.
