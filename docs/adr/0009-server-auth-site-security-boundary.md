# ADR-0009: 서버 인증·사이트 보안 경계

- 상태: Accepted
- 결정일: 2026-07-24
- 배치: B04

## 결정

Fleet 인증은 서버의 Argon2id password hash와 opaque session으로 처리합니다. 원문 session token은 `Secure; HttpOnly; SameSite=Strict` cookie로만 전달하고 DB에는 SHA-256 hash만 저장합니다. Mutation은 session별 CSRF token을 요구하며 secret 변경 같은 고위험 작업은 최근 10분 이내 password step-up을 추가로 요구합니다.

모든 인증 요청은 `RequestContext(principal_id, web_session_id, site_id, request_id)`에 귀속합니다. 사이트 조회와 암호화 secret은 `principal_id + site_id` 조건으로 접근하며 전역 활성 사이트 상태를 두지 않습니다.

G5 JWT와 SSH/SFTP 자격 증명은 서버 master key의 AES-256-GCM으로 application-level 암호화합니다. AAD에 사용자·사이트·용도를 결속하고 master key는 DB·Git·브라우저 응답에 저장하지 않습니다.

Outbound connector URL은 HTTP(S)만 허용하고 userinfo·fragment, loopback·private·link-local·metadata·multicast 주소를 거부합니다. 최초 DNS 결과를 pin하고 connect 직전 재조회가 달라지면 차단합니다. 자동 redirect는 사용하지 않습니다.

## 결과

두 사용자와 두 사이트의 session·site·secret 교차 접근 차단, CSRF·step-up, metadata URL·redirect·DNS rebinding 차단을 자동 테스트합니다. 실제 G5 로그인과 connector mutation은 B05에서 이 경계 위에 연결합니다.
