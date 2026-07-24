# 서버 전환 목표 기반 배치 계획

이 문서는 Tauri 참조 snapshot을 Rust self-hosted 서버와 React PWA로 전환하는 실행 순서의 정본입니다. 제품 경계는 [ADR-0006](../adr/0006-server-only-product-pivot.md), 기술 선택은 [서버·웹 기술 스택](../architecture/SERVER_WEB_TECH_STACK.md)을 따릅니다.

## 1. 배치 운영 원칙

- 한 배치는 하나의 검증 가능한 목표만 가집니다.
- 선행 배치의 완료 게이트가 PASS가 아니면 다음 배치를 시작하지 않습니다.
- `products/admin-desktop` 전체를 활성 경로로 복제하지 않습니다.
- 화면·타입·순수 로직은 추출하고 Tauri adapter·로컬 상태 의미는 교체합니다.
- 각 배치는 코드, 테스트, 문서, 감사 registry와 rollback 기준을 함께 닫습니다.
- Shop 26개는 PHP 공급자 계약만 보존하고 Core 배치에서 소비하지 않습니다.
- routine 테스트에서 Telegram, Web Push, 메일과 SMS를 외부로 발송하지 않습니다.
- 배치 결과는 실제 증거 수준보다 높게 표현하지 않습니다.

배치 완료 시 최소 순서는 다음과 같습니다.

```text
scope 확인
→ 구현
→ scoped test
→ contract/security audit
→ make check
→ 변경 문서와 증거 수준 확인
→ commit
→ push
```

## 2. 전체 순서

| 배치 | 목표 | 선행 | 완료 게이트 |
|---|---|---|---|
| B00 | 서버 전용 방향·스택·SQLite 내구성 확정 | 없음 | 문서·manifest schema PASS |
| B01 | legacy Tauri와 활성 제품 감사 분리 | B00 | routine server check에서 Tauri build/toolchain 불필요 |
| B02 | Rust 서버·React 웹 활성 workspace 골격 | B01 | Axum health + React shell + active build PASS |
| B03 | SQLite 저장·backup·복구 기반 | B02 | 장애·migration·restore readback PASS |
| B04 | 사용자 인증·세션·사이트 보안 경계 | B03 | 2사용자×2사이트 격리, CSRF·SSRF PASS |
| B05 | 최초 end-to-end 수직 흐름 | B04 | 사이트 등록→mock Connector 로그인→조회→수정→재조회·원복 PASS |
| B06 | 관리자 189개 Core 소비 전환 | B05 | 17 schema domain + non-schema 기능 소비 PASS |
| B07 | SSH/SFTP·터미널·파일 전환 | B04, B05 | WebSocket·streaming·격리·중단복구 PASS |
| B08 | 알림 outbox·PWA·Commerce 경계 | B06, B07 | fake delivery·cache safety·Core isolation PASS |
| B09 | OCI/Compose 설치·upgrade·rollback | B08 | package, backup/restore, rollback PASS |
| B10 | 로컬·staging 제품 인증 | B09 | 증거별 LOCAL/PACKAGE/STAGING PASS |

## 3. 배치 상세

### B00 — 제품 방향 문서화

목표:

- 유일한 배포물을 Axum 서버 + React PWA로 고정
- Tauri를 reference-only로 봉인
- 외부 DB 없이 SQLite WAL을 기본 저장소로 고정
- DB 손상 시 fail-closed와 검증 backup 복구를 강제

현재 상태: 완료. `678e424`로 검증·커밋·push했습니다.

### B01 — legacy 감사 분리

작업:

- migration provenance와 활성 제품 검증을 별도 gate로 분리
- legacy snapshot 검증은 hash·source closure 확인으로 제한
- 활성 `make check`에서 Tauri CLI, Tauri package, native target과 데스크톱 icon을 제거
- 감사 layer 이름을 Axum route, HTTP/WebSocket transport, React consumer 기준으로 전환
- 루트 active workspace가 `products/admin-desktop`을 build member로 포함하지 않도록 고정

완료 조건:

- Tauri toolchain이 없는 환경에서 활성 scaffold check가 실행됨
- legacy source가 없어지거나 변조되면 provenance gate는 실패함
- legacy PASS를 `SERVER_STATIC_PASS`로 승격하지 않음

현재 상태: 완료. routine gate는 Tauri snapshot을 provenance·tracked source로만 확인하며 별도 Python 감사 runtime을 사용합니다.

### B02 — 활성 workspace 골격

작업:

- 루트 Cargo workspace와 `apps/admin-server` 생성
- `apps/admin-web`에 React/Vite/Bun 활성 앱 생성
- 기존 UI의 AppShell, route와 공용 component를 한 번 이관
- Axum `/healthz`, `/readyz`와 정적 웹 제공
- typed HTTP transport interface와 공통 error envelope 골격
- active dependency에 `tauri`, `@tauri-apps/*` 금지 gate 추가

완료 조건:

- Rust check/test PASS
- React typecheck/lint/test/build PASS
- 브라우저에서 서버가 제공한 AppShell과 health 상태 확인

현재 상태: 완료. 활성 Cargo/Bun workspace, Axum health·readiness·SPA 제공, same-origin typed transport, 반응형 AppShell과 browser smoke를 닫았습니다. 증거 상한은 `SERVER_SCAFFOLD_PASS`입니다.

### B03 — SQLite 내구성

작업:

- SQLx SQLite migration과 schema version 관리
- WAL, `synchronous=FULL`, foreign key, busy timeout 강제
- 사용자, 세션, 사이트, 암호화 secret, outbox, job, audit 기본 테이블
- 단일 write coordinator와 짧은 transaction
- startup quick check와 손상·누락 fail-closed
- upgrade 전 consistent backup, SHA-256, restore/readback

완료 조건:

- 강제 종료, migration 실패, 디스크 부족과 손상 page 테스트 PASS
- 기존 설치 DB 누락 시 빈 DB 자동 생성 차단
- 별도 경로 backup 복원과 핵심 row readback PASS

현재 상태: 완료. SQLx schema v1, WAL·FULL·FK, 단일 writer, 명시적 초기화와 기존 설치 fail-closed 시작, `VACUUM INTO`+SHA-256 backup·별도 restore를 구현했습니다. 강제종료·migration 실패·용량 부족·page 손상·restore readback 테스트가 PASS했습니다.

### B04 — 인증·사이트 격리

작업:

- 최초 관리자 생성과 로그인
- Secure·HttpOnly·SameSite session cookie
- mutation CSRF와 고위험 step-up 인증 골격
- `RequestContext(principal_id, web_session_id, site_id, request_id)`
- 사이트 registry와 application-level encrypted credentials
- URL·host SSRF, redirect, DNS rebinding, metadata 주소 방어

완료 조건:

- 두 사용자와 두 사이트의 session·token·secret 교차 접근이 모두 차단됨
- 브라우저 응답·로그에 G5 JWT와 SSH secret이 없음
- 전역 `active_site_id`가 활성 코드에 없음

현재 상태: 완료. Argon2id 최초 관리자·로그인, hash-only opaque session, Secure·HttpOnly·SameSite cookie, CSRF·step-up, 명시적 RequestContext, AES-256-GCM site secret과 SSRF·redirect·DNS rebinding 차단을 구현했습니다. 2사용자×2사이트 교차 접근 테스트가 PASS했습니다.

### B05 — 최초 수직 흐름

한 번에 전체 화면을 옮기지 않고 다음 최소 흐름을 먼저 닫습니다.

```text
Fleet 로그인
→ 사이트 등록
→ G5 Connector health
→ G5 로그인
→ 사이트 개요
→ 기본환경 조회
→ 안전한 필드 1개 수정
→ 재조회
→ 원복
```

작업:

- Rust G5 client·DTO·application service의 첫 추출
- Axum site-bound route
- React `HttpTransport`
- 기존 사이트 onboarding, login, overview, config UI 이관
- request ID와 error envelope 전 구간 연결

완료 조건:

- browser contract → Axum → Rust mock Connector 저장·재조회·원복 PASS
- 다른 사용자·사이트에 상태가 섞이지 않음
- Tauri `invoke()` 없이 동작
- 실제 PHP Connector → G5 저장·재조회·원복은 B10 `LOCAL_RUNTIME_PASS`에서 재검증

현재 상태: 완료. canonical health·login·config 4연산을 Rust Connector client,
site-bound Axum route와 React 4단계 UI로 연결했습니다. G5 비밀번호는 저장하지
않고 JWT는 site-bound 암호화 secret으로만 보관합니다. mock Connector 기반
수정·재조회·원복과 브라우저 transport 계약은 PASS했으며 실제 PHP·G5 런타임
PASS로 승격하지 않습니다.

### B06 — 관리자 Core 도메인 전환

모든 도메인은 같은 단위를 반복합니다.

```text
OpenAPI operation 확인
→ Rust wire/client 추출
→ application service
→ Axum route + RequestContext
→ TypeScript transport
→ React UI 이관
→ field parity + 저장/readback
```

#### B06-A 환경·권한

- config, theme, menus, popups
- permissions/auth
- maintenance, mail-test

#### B06-B 회원

- members, mails, points, polls, visits

#### B06-C 게시판 관리

- boards, groups
- contents, faq-masters, faqs
- qa-config, popular, write-count

#### B06-D 운영 도구

- system
- sms-contacts, sms-messages, sms-templates
- layouts, reports, push

각 wave 완료 조건:

- 대상 operation route/client/UI registry 일치
- schema field 누락 0
- writable field 저장·재조회·원복
- irreversible·external-effect operation은 fake 또는 명시적 차단

B06 전체 완료 조건:

- 비쇼핑몰 관리자 184개 + bootstrap 5개 = 활성 189개 소비 확인
- 17개 schema domain field parity 확인
- Shop 26개 Core 소비 0

현재 상태: 완료. canonical OpenAPI와 phase1 scope에서 Core registry를
재현 생성하며 active 189, 비쇼핑 관리자 184, bootstrap 5, Shop 0을 exact
set으로 고정했습니다. Rust allowlist·site-bound Axum proxy와 React domain
console이 동일 registry를 소비하고, 연결 schema 287개와 17-domain field
목록을 보존합니다. DELETE 명시 확인, write step-up, 외부 메일·SMS·Push 9개
routine 차단, mock Connector config 수정·재조회·원복을 검증했습니다.
실제 G5 189개 operation runtime PASS로는 승격하지 않습니다.

### B07 — SSH/SFTP

작업:

- SSH profile과 host key verification
- 일회성 ticket 기반 terminal WebSocket
- SFTP 목록·mkdir·rename·delete
- browser upload/download streaming
- 전송 queue, 진행 이벤트, 취소·재시도
- 사용자·사이트·connection ID 격리

완료 조건:

- 브라우저에 서버 로컬 경로와 SSH private key 미노출
- disconnect, 재접속, 취소와 부분 실패 검증
- 다른 사용자 terminal·transfer event 수신 차단

### B08 — 알림·PWA·플러그인 경계

작업:

- notification outbox worker
- Telegram과 Web Push adapter
- fake delivery, retry, dedupe, dead-letter
- PWA manifest와 정적 asset cache
- API·사용자 데이터 offline cache 금지
- Commerce SDK 연결점과 Core import 금지 gate

완료 조건:

- routine test 외부 발송 0
- fake provider 장애·재시도·중복 제거 PASS
- Commerce 미설치 Core 부팅·전체 무료 기능 PASS

### B09 — 패키지·운영

작업:

- Axum + React OCI image
- Caddy + app + SQLite volume의 최소 Compose
- 별도 DB·Redis container 없음
- install, health, upgrade, backup, restore, rollback 명령
- image checksum, SBOM과 version readback

완료 조건:

- clean host 설치 PASS
- 데이터 보존 upgrade PASS
- 실패 upgrade rollback PASS
- backup·master key 복원과 readback PASS

### B10 — 인증 단계

순서:

1. 공식 G5 v5.6.32 local runtime
2. 다중 사용자·다중 사이트 browser E2E
3. package install/upgrade/rollback
4. staging provider identity와 배포 smoke
5. 요청받은 경우에만 live notification 검증

`LOCAL_RUNTIME_PASS`, `PACKAGE_PASS`, `STAGING_PASS`, `LIVE_CERTIFIED`는 서로 대체하지 않습니다.

## 4. 현재 바로 시작할 배치

현재 시작점은 **B05 최초 수직 흐름**입니다. 인증된 사이트 경계 위에서 browser → Axum → PHP Connector의 로그인·조회·안전한 수정·재조회·원복을 먼저 닫습니다.
