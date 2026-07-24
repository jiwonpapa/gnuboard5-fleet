# ADR-0007: 활성 Axum·React workspace 골격

- 상태: 승인
- 날짜: 2026-07-24

## 배경

이관된 `products/admin-desktop`은 Tauri runtime, 단일 사용자 로컬 상태와 native packaging 의미를 포함합니다. 서버 제품의 첫 활성 골격이 이를 build member나 UI transport로 재사용하면 B01에서 분리한 경계가 다시 무너집니다.

## 결정

- 루트 `Cargo.toml`은 `apps/admin-server`와 이후 `crates/*`만 활성 member로 가집니다.
- `products/admin-desktop`은 활성 Cargo/Bun build·test에서 제외합니다.
- `apps/admin-server`는 Axum `/healthz`, `/readyz`, `/api/v1/meta`와 React SPA static fallback을 제공합니다.
- API 실패는 `{ "error": { "code", "message", "request_id" } }` envelope를 사용합니다.
- `apps/admin-web`은 React Router와 same-origin typed `HttpTransport`를 사용하며 원격 G5 URL이나 Tauri `invoke()`를 호출하지 않습니다.
- `/readyz`는 `index.html`이 없으면 503으로 fail-closed합니다.
- PWA manifest만 먼저 두고 service worker cache 정책은 B08에서 API·사용자 데이터 제외 테스트와 함께 구현합니다.
- 이 단계의 증거는 `SERVER_SCAFFOLD_PASS`이며 189개 Core 소비·SQLite·인증·사이트 격리를 인증하지 않습니다.

## 결과

- 서버와 웹의 활성 build·audit 경로가 legacy Tauri snapshot과 독립됩니다.
- desktop/mobile과 동일한 React 화면을 복사하는 대신 서버 상태·사이트 귀속을 표현하는 AppShell부터 이관합니다.
- 이후 B03~B08 구현은 동일한 Axum route, JSON envelope와 browser transport 경계를 확장합니다.
