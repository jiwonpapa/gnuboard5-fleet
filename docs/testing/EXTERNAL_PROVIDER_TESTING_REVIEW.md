# 외부 서비스 연동 테스트 리뷰

작성일: 2026-03-07
적용 범위: 본인인증, 소셜로그인, 향후 외부 OAuth/OIDC·인증·검증 공급자 전반

관련 공개 정책 매트릭스: `docs/testing/EXTERNAL_PROVIDER_SANDBOX_MATRIX.md`

## 1. 결론

외부 서비스 연동 테스트는 결국 각 공급자 문서와 sandbox 정책을 확인해야 한다.  
다만 개발 구조를 그 확인 작업에 종속시키면 안 된다.

공개 접근 가능한 공식 문서 기준의 현재 공급자별 sandbox 정책은 `docs/testing/EXTERNAL_PROVIDER_SANDBOX_MATRIX.md`에 별도로 고정한다.

이 프로젝트의 권장 원칙은 다음과 같다.

- 활성 클라이언트인 `rust`는 외부 공급자와 직접 통신하지 않는다.
- 외부 서비스 연동 책임은 `php REST API`에 집중한다.
- 내부 개발은 `mock provider`와 `callback replay`로 먼저 진행한다.
- 공급자별 실연동 검증은 그 위에 `sandbox`와 `live checklist`를 추가하는 방식으로 확장한다.

즉, `vendor 확인은 필요`, `내부 테스트 전략은 vendor 비의존 구조로 선행`이 정답이다.

## 2. 현재 평가

- 현재 저장소에는 OpenAPI 기반 API 블랙박스 테스트 문서와 도구가 정리되어 있지만, 외부 공급자 handshake 자체를 검증하는 표준 절차는 아직 고정되어 있지 않다.
- `본인인증`, `소셜로그인`은 정상 응답만 붙이는 것으로 끝나지 않고 `redirect`, `callback`, `webhook`, `signature`, `test account`, `취소/실패/만료` 시나리오까지 다뤄야 한다.
- 이 범위를 클라이언트 앱(`rust`)에서 직접 처리하면 책임 경계가 흐려지고 공급자별 SDK 차이까지 앱에 번진다.
- 따라서 공급자 특화 로직은 `php` 내부 adapter 계층에서 흡수하고, 클라이언트에는 정규화된 내부 API 계약만 보여주는 방향이 맞다.
- 현재 foundation 기준으로는 `/auth/external/providers`, `/auth/external/{provider}/start`, `/auth/external/{provider}/complete`, `/auth/external/{provider}/sessions`, `/auth/external/{provider}/claims`, `/auth/external/{provider}/registrations`, dev runtime 전용 `fake provider`, 그리고 설정 시 노출되는 실제 `google`, `kakao` adapter가 추가되어 내부 개발은 vendor 미확정 상태에서도 계속 진행할 수 있다.

## 3. 권장 아키텍처

### 3.1 책임 경계

`rust -> php REST API -> provider adapter -> external vendor`

`callback/webhook -> php verifier -> internal normalized state -> rust`

핵심은 공급자 특화 응답을 그대로 앱으로 흘리지 않는 것이다.

### 3.2 PHP 내부 구조

- `ProviderAdapterInterface`를 둔다.
- 공급자별 구현체는 `KakaoLoginAdapter`, `NaverLoginAdapter`, `PassIdentityAdapter` 같은 식으로 분리한다.
- 개발/테스트 환경에서는 `FakeProviderAdapter`를 주입 가능하게 만든다.
- callback/webhook 검증은 adapter 내부가 아니라 검증 service + adapter 조합으로 분리한다.
- 공급자 원문 payload는 감사/추적용으로 보존하되, 외부 노출 응답은 내부 표준 DTO로 정규화한다.

### 3.3 클라이언트 노출 계약

클라이언트는 아래 같은 내부 표준 상태만 다루게 한다.

```json
{
  "provider": "kakao",
  "status": "success",
  "internal_request_id": "req_...",
  "provider_tx_id": "tx_...",
  "user_action_required": false,
  "retryable": false,
  "error_code": null,
  "error_message": null
}
```

권장 상태값:

- `success`
- `pending`
- `cancelled`
- `failed`
- `expired`
- `requires_user_action`

권장 공통 필드:

- `provider`
- `internal_request_id`
- `provider_tx_id`
- `status`
- `error_code`
- `retryable`
- `user_action_required`
- `occurred_at`

추가로 현재 foundation 기준에서는 `complete` 응답에 아래가 함께 붙는다.

- `linkage`
  - `linked`
  - `candidate`
  - `ambiguous`
  - `signup_required`
  - `unresolvable`
- `available_actions`
  - `session`
  - `claim`
  - `register`
- `transition_token`
  - 현재 로그인 회원 연결, 기존 회원 claim, 신규 가입 전환에 공통으로 다시 제출하는 서버 서명 토큰
- `link_token`
  - legacy alias. 신규 클라이언트는 `transition_token`을 사용
- 현재 운영 정책
  - TTL은 `AUTH_EXTERNAL_REQUEST_TTL_SECONDS`(기본 600초)와 동일
  - 만료 전 재사용은 기술적으로 가능하지만 canonical client는 terminal action 이후 즉시 폐기

## 4. 테스트 계층

| 계층 | 목적 | 외부 vendor 필요 여부 | 권장 구현 |
|------|------|------------------------|-----------|
| Unit | adapter/service 분기 검증 | 불필요 | fake provider, fixture payload |
| Contract | php 내부 응답 shape 고정 | 불필요 | PHPUnit + OpenAPI + JSON fixture |
| Callback Replay | redirect/webhook payload 재현 | 불필요 | 저장된 샘플 payload 재생 |
| Sandbox Integration | 실제 공급자 규격 적합성 검증 | 필요 | vendor test account, test app, test callback |
| Staging E2E | 앱-API-공급자 흐름 검증 | 필요 | 운영과 유사한 계정/redirect URI |
| Live Smoke | 배포 직후 최소 확인 | 필요 | 제한된 수동 체크리스트 |

핵심은 `Unit/Contract/Replay`를 먼저 완성하고 `Sandbox/Live`를 뒤에 얹는 것이다.

## 5. 서비스별 현실적 방안

### 5.1 소셜로그인

- 대체로 `OAuth 2.0` 또는 `OIDC` 기반이므로 sandbox 구성 가능성이 높다.
- 필요한 것은 `dev app`, `test redirect URI`, `test account`, `state/nonce/PKCE` 검증 절차다.
- 내부적으로는 아래를 먼저 검증할 수 있다.
  - 로그인 시작 URL 생성
  - `state`/`nonce` 저장과 비교
  - callback code 교환 성공/실패
  - 기존 회원 연결/신규 회원 가입 분기
  - 취소/거부/만료 처리

### 5.2 본인인증

- 공급자별 차이가 크고, 테스트 번호·가상 본인정보·콜백 방식도 제각각이다.
- 확인해야 할 것은 `sandbox 제공 여부`, `테스트 전화번호`, `테스트 CI/DI`, `callback 샘플`, `서명 검증용 테스트 키`, `실패 케이스 재현 방법`이다.
- vendor sandbox가 없더라도 내부에서는 callback payload 재생과 fake 승인/실패 adapter로 대부분의 앱 흐름을 먼저 검증할 수 있다.

## 6. 공급자에 반드시 확인할 항목

- sandbox 또는 개발자 테스트 환경이 있는가
- test account 또는 test phone number를 제공하는가
- redirect URI와 callback URL을 테스트용으로 분리 등록할 수 있는가
- webhook/callback payload 샘플을 제공하는가
- 서명 검증용 테스트 키 또는 공개키를 제공하는가
- 실패, 취소, 만료, 중복 요청을 강제로 재현하는 방법이 있는가
- rate limit 정책과 테스트 호출 제한은 무엇인가
- 운영 전환 시 app key 또는 endpoint가 분리되는가
- 테스트 환경과 운영 환경의 응답 차이가 문서화되어 있는가

## 7. vendor sandbox가 없을 때의 차선책

vendor가 sandbox를 제공하지 않더라도 개발을 멈출 필요는 없다.

- `fake provider`를 둔다.
- callback/webhook 원문 샘플을 fixture로 저장한다.
- PHP에서 `replay endpoint` 또는 테스트 helper로 payload를 재생한다.
- 비운영 환경에서만 강제 성공/실패/취소 상태를 주입할 수 있게 한다.
- staging에서는 최소한의 수동 검증 체크리스트를 운영한다.

주의:

- 강제 성공/실패 주입 기능은 반드시 비운영 환경에서만 허용해야 한다.
- 운영 환경에는 fake adapter나 replay endpoint가 노출되면 안 된다.

## 8. 권장 구현 순서

1. 외부 서비스 범위를 확정한다.
2. 공급자별 adapter interface와 내부 표준 DTO를 정의한다.
3. fake provider와 callback fixture 재생 테스트를 먼저 만든다.
4. 외부 인증 완료 결과를 `linkage`, `available_actions`, `transition_token`까지 포함하는 내부 표준 상태로 고정한다.
5. 현재 로그인 회원의 외부 계정 연결 조회/등록/해제 경계를 연다.
6. `linked -> session`, `기존 회원 -> claim`, `신규 회원 -> registration` 전환 경계를 연다.
7. Rust는 그 API만 소비하도록 연결한다.
8. 각 공급자 문서를 확인해 sandbox/test account 정책을 수집한다.
9. sandbox 연동 테스트를 붙인다.
10. staging 수동 점검표를 만든다.
11. 운영 전환 직전 live smoke checklist를 만든다.

## 9. 현재 저장소 기준 권장 작업 항목

- `php`에 추가된 외부 공급자 foundation 위에 실제 vendor adapter를 1종 연결
- provider 원문을 내부 DTO로 정규화하는 계약을 member linkage/가입 정책까지 확장
- callback/webhook fixture 저장 규칙 결정
- 비운영용 fake adapter와 replay 테스트 경로를 실제 CI/스테이징 절차로 연결
- `본인인증`, `소셜로그인` 공급자 후보별 sandbox 정책 조사
- Rust/Tauri 관리자에서 공급자 상태를 확인할 운영/디버그 화면 필요 여부 검토

## 10. 출근 후 바로 확인할 체크리스트

- 지금 당장 붙일 공급자가 무엇인지 확정되었는가
- 이미 계약된 vendor가 있는가, 아니면 후보 비교 단계인가
- 공급자 개발자센터 계정/문서 접근 권한이 확보되어 있는가
- 테스트용 redirect URI, callback URL, webhook URL을 어디에 둘 것인가
- 비운영 환경에서만 열리는 fake/replay 경로를 어떤 방식으로 막을 것인가
- 공급자 장애 시 내부 응답의 `owner`, `fault_domain`, `retryable` 분류를 어떻게 내릴 것인가

## 11. 최종 권고

외부 공급자 테스트는 `실연동 문서 확인`과 `내부 비의존 테스트 구조`를 동시에 가져가야 한다.

실무적으로는 다음 순서가 가장 안전하다.

1. `php` adapter + fake provider + callback replay를 먼저 만든다.
2. 그 위에서 `rust`는 내부 API만 붙인다.
3. 이후 vendor sandbox 정책을 받아 실제 연동 검증을 얹는다.

이 순서를 지키면 업체 응답이 늦어도 내부 개발이 멈추지 않고, 공급자 교체가 생겨도 앱 구조가 덜 흔들린다.
