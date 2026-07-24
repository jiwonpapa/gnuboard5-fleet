# Server Applications

G5 Fleet의 유일한 활성 애플리케이션 구현 대상입니다.

- `admin-server`: Rust Axum, 내장 SQLite WAL/SQLx, 사용자 세션, 사이트 격리, SSH/SFTP, notification outbox
- `admin-web`: React 관리 SPA와 반응형 PWA, typed `HttpTransport`와 WebSocket 사용

기존 Tauri 코드는 `products/admin-desktop`에 참조 snapshot으로만 보존합니다. 데스크톱 또는 native wrapper를 빌드·배포하지 않습니다. React UI는 `admin-web`로 이관하고, Rust 공통 로직은 Tauri 타입을 제거해 루트 `crates/`로 추출합니다. `#[tauri::command]`와 Tauri `State`를 Axum route에 그대로 복제하지 않습니다.

현재 B02 골격은 Axum `/healthz`, `/readyz`, `/api/v1/meta`, 정적 SPA fallback과 React same-origin typed `HttpTransport`를 제공합니다. DB·인증·G5 연결 전이므로 완료 증거는 `SERVER_SCAFFOLD_PASS`를 넘지 않습니다.

세부 결정은 `docs/adr/0006-server-only-product-pivot.md`와 `docs/architecture/SERVER_WEB_TECH_STACK.md`를 따릅니다.
