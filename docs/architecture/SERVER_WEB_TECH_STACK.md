# 서버·웹 기술 스택

이 문서는 G5 Fleet 활성 제품의 구현 기준입니다. 제품 방향은 [ADR-0006](../adr/0006-server-only-product-pivot.md)을 따릅니다.

## 1. 배포 형태

- 단일 제품 형태: self-hosted 서버 + 반응형 웹 PWA
- 활성 서버: `apps/admin-server`
- 활성 웹: `apps/admin-web`
- 공통 Rust 코드: `crates/*`
- 이관 참조만 허용: `products/admin-desktop`
- 제외: Tauri runtime, native wrapper, 데스크톱 설치 패키지, 코드 서명, 공증, Tauri updater

브라우저와 서버는 기본적으로 같은 origin을 사용합니다. 서버 API와 정적 웹 자산은 reverse proxy 뒤에서 HTTPS로 제공합니다.

## 2. Rust 서버

| 영역 | 결정 |
|---|---|
| 언어·런타임 | Rust stable, Tokio |
| HTTP | Axum, Tower, tower-http |
| 직렬화·검증 | Serde와 명시적 application validation |
| G5 호출 | 기존 Reqwest 기반 client와 canonical OpenAPI 계약 |
| DB | 내장 SQLite, WAL mode |
| DB 접근 | SQLx와 migration |
| 세션 | 서버 저장 세션, Secure·HttpOnly·SameSite cookie |
| mutation 보호 | CSRF 검증과 고위험 작업 step-up 인증 |
| 실시간 | Axum WebSocket |
| 로그·추적 | tracing, request ID, 구조화 로그 |
| 배포 | OCI image, Docker Compose |
| 기본 reverse proxy | Caddy, 외부 reverse proxy 사용도 허용 |

v1은 외부 DB 서버, Redis와 별도 queue를 사용하지 않습니다. 사용자, 사이트 registry, 세션, 암호화된 자격 증명, notification outbox, retry·dedupe·dead-letter와 감사 로그를 하나의 SQLite data volume에 저장합니다. G5 게시글·회원·주문 데이터는 각 G5 사이트 DB에 그대로 남고 Fleet DB에 복제하지 않습니다.

SQLite는 WAL, `synchronous=FULL`, foreign key, busy timeout과 짧은 transaction을 기본으로 사용합니다. 백업은 실행 중인 DB 파일을 임의 복사하지 않고 SQLite online backup API 또는 동등하게 일관된 snapshot 방식으로 생성합니다. 기존 설치에서 DB가 없거나 손상되면 빈 DB를 자동 생성하지 않고 fail-closed합니다. 세부 기준은 [`SQLite 내구성·백업 기준`](../operations/SQLITE_DURABILITY.md)을 따릅니다.

외부 DB 도입은 실제 동시성·고가용성 요구와 측정 증거가 생긴 뒤 별도 ADR로 결정합니다.

G5 자격 증명과 SSH/SFTP 비밀은 브라우저에 반환하지 않습니다. DB에 저장하는 비밀은 서버 master key로 application-level 암호화하고 master key는 DB와 분리된 secret file 또는 동등한 secret provider에서 주입합니다.

## 3. React 웹

| 영역 | 결정 |
|---|---|
| 앱 형태 | SPA + responsive PWA |
| 런타임 | Browser |
| 패키지 관리자 | Bun |
| UI | React 19, TypeScript strict |
| 빌드 | Vite |
| 스타일 | Tailwind CSS 4, shadcn, Radix UI |
| 라우팅 | React Router |
| 서버 상태 | TanStack Query |
| 표·가상화 | TanStack Table, TanStack Virtual |
| 폼·검증 | React Hook Form, Zod |
| 터미널 | xterm.js |
| 편집기 | Monaco Editor |
| 테스트 | Vitest, Testing Library |

SSR과 Next.js는 사용하지 않습니다. 관리 UI에는 검색엔진 노출이 필요하지 않고 Axum과 별도 JavaScript 서버를 동시에 운영할 이유가 없기 때문입니다.

PWA service worker는 버전이 고정된 정적 자산만 캐시합니다. API 응답, 사용자 데이터, G5 응답과 SSH/SFTP 결과는 offline cache에 저장하지 않습니다.

## 4. 서버와 웹의 통신

- CRUD와 조회: typed JSON HTTP
- 파일 업로드: multipart 또는 streaming request
- 파일 다운로드: streaming response
- SSH 터미널: 인증된 일회성 ticket을 사용하는 WebSocket
- SFTP 진행 상태와 장기 작업: WebSocket, 단방향 알림만 필요한 경우 SSE
- 사이트 귀속 route: 명시적 `site_id` 포함
- 인증: 브라우저가 읽을 수 없는 서버 세션 cookie

PHP Connector의 `connectors/gnuboard5-php/api/docs/openapi.yaml`은 G5 공급자 계약의 유일한 canonical OpenAPI입니다. 서버는 이 계약을 소비하되 312개 계약을 복제한 별도 OpenAPI 정본을 만들지 않습니다.

서버 ↔ 웹 전용 DTO는 Rust 타입에서 TypeScript로 생성하고 route registry와 함께 감사합니다. 인증·사이트·SSH/SFTP처럼 PHP Connector에 없는 서버 기능도 이 경계에서 관리합니다.

## 5. 기존 소스 이관 경계

### 그대로 이관 가능한 부분

- React route와 화면 구성
- form schema와 Zod 검증
- TanStack Query key와 화면 상태 모델
- OpenAPI 기반 wire type
- UI 컴포넌트와 대부분의 Vitest
- Rust G5 client, DTO, SSH/SFTP 순수 로직

### adapter를 교체해야 하는 부분

- `invokeCommand()` → `HttpTransport`
- Tauri event listener → WebSocket/SSE client
- Tauri dialog/filesystem → Browser File API
- 로컬 경로 기반 SFTP → browser upload/download stream
- Tauri command registry → Axum route registry

### 서버 의미로 재설계해야 하는 부분

- 로컬 master lock과 OS biometry → 사용자 로그인, 세션, TOTP 또는 별도 WebAuthn 정책
- 데스크톱 단일 사용자 상태 → 서버 SQLite의 사용자·사이트 귀속 상태
- 전역 활성 사이트 → 요청별 `RequestContext`
- 로컬 keychain → 서버 secret 관리
- 로컬 updater → OCI image upgrade와 rollback

## 6. 이관 순서

세부 작업 순서와 배치별 완료 게이트는 [`서버 전환 목표 기반 배치 계획`](../roadmap/SERVER_CONVERSION_BATCH_PLAN.md)을 따릅니다. B01에서 root audit의 legacy provenance 확인을 활성 제품 검증과 분리했으며, 다음 실행 배치는 B02 활성 서버·웹 workspace입니다.
