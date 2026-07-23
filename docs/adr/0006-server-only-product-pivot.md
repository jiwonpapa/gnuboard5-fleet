# ADR-0006: 데스크톱에서 self-hosted 서버 제품으로 전환

- 상태: 승인
- 날짜: 2026-07-23

## 배경

기존 관리자는 Tauri v2와 React로 구현됐습니다. 그러나 데스크톱 제품을 직접 배포하면 운영체제별 코드 서명, macOS 공증, 설치 패키지, 자동 업데이트 채널과 인증서 수명주기를 제품 운영자가 계속 책임져야 합니다.

G5 Fleet의 핵심 가치는 여러 그누보드5 사이트를 한곳에서 관리하는 것이며, 이 기능은 사용자 장치마다 네이티브 앱을 설치하는 방식보다 한 서버에 설치하고 브라우저로 접속하는 방식이 배포·업그레이드·접근 통제에 적합합니다.

## 결정

G5 Fleet의 유일한 활성 배포 모델은 다음 두 산출물로 구성된 self-hosted 서버 제품입니다.

1. `apps/admin-server`: Rust Axum 서버
2. `apps/admin-web`: 서버가 제공하는 React 반응형 PWA

Tauri 데스크톱 앱과 Tauri mobile wrapper는 제품, 에디션, 선택형 배포물로 제공하지 않습니다. 데스크톱 코드 서명, 공증, 네이티브 설치 패키지와 Tauri updater도 지원 범위에서 제외합니다.

`products/admin-desktop`은 이관 시점의 봉인된 참조 소스입니다. 공개 provenance와 기존 PHP → OpenAPI → Rust → React 소비 구현을 분석하기 위해 보존하지만 신규 기능, 릴리스, 배포, 네이티브 인증서 또는 장기 지원의 대상이 아닙니다.

서버 HTTPS에 필요한 TLS 인증서는 데스크톱 코드 서명 인증서와 별개입니다. 기본 배포는 reverse proxy가 일반적인 ACME/TLS 운영을 담당하도록 합니다.

## 이관 원칙

- React 화면, 폼, 테이블, 타입, 검증 규칙과 UI 테스트는 `apps/admin-web`로 한 번 이관한 뒤 서버판 원본으로 관리합니다.
- Tauri `invoke(cmd_*)`는 복사하지 않고 typed HTTP transport로 교체합니다.
- Tauri event는 WebSocket 또는 필요한 경우 SSE로 교체합니다.
- Tauri dialog·filesystem·clipboard API는 브라우저 File API, 다운로드 응답과 Clipboard API로 교체합니다.
- Rust DTO, G5 API client, SSH/SFTP와 순수 application 로직은 Tauri 타입 의존성을 제거해 루트 `crates/`로 추출합니다.
- `#[tauri::command]`, `tauri::State`, `AppHandle`, OS keychain, biometry, local updater와 데스크톱 전역 활성 사이트 상태는 서버 코드로 이관하지 않습니다.
- 기존 로컬 SQLite/SQLCipher 저장 의미는 서버의 사용자·사이트별 내장 SQLite WAL 저장과 application-level 비밀정보 암호화 모델로 재설계합니다.

## 활성 요청 경계

```text
Browser / Responsive PWA
→ HTTPS / WebSocket
→ Rust Axum admin-server
→ server-side G5 session and SSH/SFTP services
→ site-specific PHP Connector
→ GnuBoard5
```

브라우저는 원격 G5에 직접 요청하지 않으며 G5 JWT, refresh token, SSH private key와 서버 로컬 경로를 받지 않습니다. 모든 사이트 작업은 인증된 사용자 세션과 명시적 `site_id`를 가집니다.

## 결과

- 활성 앱과 공통 crate는 Tauri 패키지에 의존할 수 없습니다.
- `products/admin-desktop`의 통과 결과는 이관 참고 증거이며 서버 제품 인증으로 승격하지 않습니다.
- migration provenance는 참조 snapshot의 hash와 소비 범위를 확인할 수 있지만 활성 서버의 routine check·빌드·패키지는 Tauri CLI, 네이티브 target 또는 Tauri 의존성 설치를 요구하지 않습니다.
- SQLite 손상·누락·migration 실패는 fail-closed로 처리하고 빈 DB 자동 생성으로 기존 상태를 덮어쓰지 않습니다. backup은 checksum과 실제 restore·readback으로 검증합니다.
- 서버·웹 신규 구현은 `SERVER_STATIC_PASS`부터 별도로 증명합니다.
- ADR-0002의 Desktop 제품 배포 문구와 기존 Tauri mobile 전략은 이 결정으로 대체합니다.
