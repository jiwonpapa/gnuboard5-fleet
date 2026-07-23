# G5 Fleet 제품 헌법 v1.0

## 1. 제품 정체성

G5 Fleet는 여러 그누보드5 사이트를 관리하는 self-hosted 서버 제품입니다. Fleet Core는 무료 사용 정책이며, Commerce는 선택형 유료 플러그인입니다. Telegram과 Web Push는 Fleet Core 기본 알림 채널이지만 자격 증명이 없는 상태도 정상 설치 상태입니다.

PHP REST API와 관리자 서버는 같은 Git 저장소에서 개발하되 별도 산출물로 배포합니다. PHP Connector는 사이트 소유자의 명시적 승인 없이 설치·수정하지 않습니다.

## 2. 계약과 공급 범위

1. Canonical OpenAPI는 `connectors/gnuboard5-php/api/docs/openapi.yaml`입니다.
2. 현재 기준선 312 operations를 서버 전환이나 상품 분리를 이유로 삭제하지 않습니다.
3. 비쇼핑몰 관리자 184개와 bootstrap 5개는 Fleet Core 활성 소비 기준선입니다.
4. 일반 게시판 26개는 공급자에 완전 보존하고 소비 시점은 별도 결정합니다.
5. 관리자 Shop 26개는 공급자에 보존하고 Commerce 플러그인만 소비합니다.
6. G5 최신 안정판 변경은 tag·commit·tree·version·license fingerprint를 고정하고 전체 파이프라인 감사 후 반영합니다.

## 3. 상품·의존성 경계

- Fleet Core는 Commerce 구현을 import하거나 Commerce 라이선스가 있어야 부팅되도록 만들지 않습니다.
- Commerce 미설치는 지원되는 정상 상태입니다.
- Commerce SDK/계약은 공개할 수 있지만 상용 구현은 별도 비공개 저장소에 둡니다.
- 기능 잠금은 브라우저 UI가 아니라 PHP Connector, 서버 route·권한, application service, 계약 overlay 전체에서 강제합니다.
- 결제 취소·환불·회원 삭제 등 고위험 작업은 step-up 인증과 감사 로그 없이 제공하지 않습니다.

## 4. 서버 보안 경계

모든 요청은 다음 컨텍스트를 명시적으로 가집니다.

```text
RequestContext(principal_id, web_session_id, site_id, request_id)
```

- 서버 전역 `active_site_id`와 공유 base URL 변경을 금지합니다.
- G5 토큰은 `(principal_id, site_id)`, SSH/SFTP는 `(principal_id, site_id, connection_id)`로 격리합니다.
- 브라우저에 G5 JWT, refresh token, SSH private key, 서버 로컬 경로를 전달하지 않습니다.
- 사이트 URL과 SSH host는 SSRF, redirect 재검사, DNS rebinding, link-local·metadata 주소 차단을 적용합니다.
- WebSocket은 세션·Origin·일회성 ticket을 검증합니다.
- 세션 쿠키는 Secure, HttpOnly, SameSite를 사용하고 mutation은 CSRF를 검증합니다.

## 5. 알림 경계

- Connector event는 idempotent event ID와 서명으로 서버 outbox에 전달합니다.
- 서버 notification outbox는 retry, dedupe, dead-letter, 민감정보 마스킹을 갖춥니다.
- routine 테스트는 Telegram, Web Push, 메일, SMS를 실제 외부로 발송하지 않습니다.
- Telegram v1은 알림과 단기 서명 deep link만 제공하며 파괴적 명령은 실행하지 않습니다.

## 6. 배포·업그레이드

- 서버는 OCI/Docker Compose, PHP Connector는 별도 checksum·SBOM 포함 패키지입니다.
- Connector 배포는 preflight, 백업, 임시 release 업로드, checksum, lint, health, login smoke, 원자적 전환, rollback을 거칩니다.
- G5 코어와 root Composer/vendor를 덮어쓰지 않습니다.
- 기본 배포 명령에 운영 host를 하드코딩하거나 `rsync --delete`, `777/666` 권한을 사용하지 않습니다.

## 7. 감사와 증거

감사 파이프라인은 다음 체인을 전부 추적합니다.

```text
G5 legacy source
→ PHP runtime route/handler/field
→ canonical OpenAPI
→ Rust wire/application
→ Tauri + Axum adapter
→ React transport/UI field
→ live 저장/readback/cleanup
```

증명 단계는 `SCAFFOLD_PASS`, `MIGRATION_STATIC_PASS`, `SERVER_STATIC_PASS`, `LOCAL_RUNTIME_PASS`, `PACKAGE_PASS`, `STAGING_PASS`, `LIVE_CERTIFIED`로 구분합니다. blocked, skipped, stale, scanner-zero를 PASS로 승격하지 않습니다. 모든 child artifact는 부모 run ID에 귀속하고 자체 run ID와 hash를 기록하며, 같은 Git SHA, OpenAPI SHA, upstream G5 commit, image digest를 사용합니다.

감사 결과는 `output/audit/runs/<run_id>/result.json`에 불변 증적으로 저장하고 `output/audit/latest.json`은 탐색용 포인터로만 사용합니다.

Python이 정책·JSON·증적 orchestration을 소유하고 PHP는 PHP 의미 분석, Rust는 소비 구현, Shell은 얇은 실행 연결만 담당합니다.

## 8. 로컬 우선 개발

`make check`가 정본입니다. GitHub Actions는 수동 fallback만 허용하며 hosted CI 결과가 로컬·staging·live 증거를 대체하지 않습니다. 기존 저장소의 PASS는 이관된 새 저장소를 자동 인증하지 않습니다.
