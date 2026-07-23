# Server Applications

서버판 구현 대상입니다.

- `admin-server`: Rust Axum BFF, 사용자 세션, 사이트 격리, SSH/SFTP, notification outbox
- `admin-web`: React 관리 UI와 태블릿 PWA, `HttpTransport` 사용

기존 Tauri 제품은 `products/admin-desktop`에 보존합니다. 공통 application crate를 추출하기 전에는 원본 코드를 복제하지 않습니다.
