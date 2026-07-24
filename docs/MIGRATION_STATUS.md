# Migration Status

## 이번 기준선

- 기존 PHP REST API와 Rust/Tauri의 clean revision을 공개용 sanitized snapshot으로 이관
- 원본 private 전체 이력과 과거 `output/` 증적은 destination 이력·object DB에 포함하지 않음
- canonical OpenAPI 312개 축소 금지
- 활성 관리자 189개, 일반 게시판 26개, 관리자 Shop 26개 기준 고정
- 공식 GnuBoard5 v5.6.32 commit·tree·파일 fingerprint 고정
- Fleet Core·공개 SDK Apache-2.0, 플러그인별 독립 라이선스, Telegram/Web Push 기본 경계 고정
- Python migration audit와 변이 회귀 테스트 구축
- 활성 제품을 Rust Axum 서버 + React 반응형 PWA로 확정
- Tauri desktop/mobile 배포를 폐기하고 `products/admin-desktop`을 이관 참조 snapshot으로 봉인
- 루트 활성 Cargo workspace와 `apps/admin-server`, `apps/admin-web` 생성
- Axum health/readiness/meta, SPA fallback과 JSON error envelope 구현
- React responsive AppShell, same-origin typed HttpTransport와 브라우저 smoke 구현
- SQLx SQLite schema v2와 WAL·FULL·foreign key·단일 writer 구현
- 명시적 최초 초기화, 기존 설치 DB 누락·손상 fail-closed 시작 구현
- `VACUUM INTO`+SHA-256 backup, 별도 restore·integrity·핵심 row readback 구현
- 강제종료, migration 실패, 용량 부족, page 손상 장애 테스트 PASS
- Argon2id 로그인, hash-only session과 Secure·HttpOnly·SameSite cookie 구현
- mutation CSRF, 고위험 step-up과 명시적 사용자·사이트 RequestContext 구현
- AES-256-GCM site secret, SSRF·redirect·DNS rebinding 방어 구현
- 2사용자×2사이트 session·site·secret 교차 접근 차단 테스트 PASS
- canonical Connector health·login·config 조회·수정 4연산 Rust client 구현
- site-bound Axum route와 React 사이트 등록·Connector 로그인·설정 원복 UI 구현
- G5 비밀번호 비저장, G5 JWT의 서버 암호화 저장과 브라우저 비노출 검증
- mock Connector 기반 설정 수정·재조회·원복 통합 테스트 PASS
- canonical OpenAPI 기반 Core registry 189개 exact 생성
- 비쇼핑 관리자 184 + bootstrap 5, Shop Core 소비 0 고정
- Rust site-bound Core proxy와 React lazy-loaded domain console 연결
- 연결 OpenAPI schema 287개와 17-domain generated field parity 고정
- risk-based step-up, DELETE 명시 확인, 외부 메일·SMS·Push 9개 routine 차단
- G5 token refresh·logout의 서버 전용 암호화 수명주기 구현
- SSH 개인키·known_hosts의 사용자·사이트 단위 서버 암호화 저장
- public IP DNS pin·재검증과 strict host key를 강제하는 OpenSSH adapter 구현
- hash-only 60초 일회성 ticket 기반 terminal WebSocket 중계 구현
- 구조화된 SFTP 명령, bounded upload/download stream과 SQLite 전송 상태 구현
- 터미널 ticket 교차 사용자·사이트 차단과 전송 실패·재시도·취소 상태 테스트 PASS
- SQLite notification lease·retry·dedupe·dead-letter worker 구현
- Telegram·Web Push injected adapter와 외부 네트워크 없는 fake delivery PASS
- 알림 payload 기본 민감정보 마스킹과 사용자·사이트 상태 격리 구현
- PWA install manifest·service worker와 API·health·ready cache 금지 구현
- canonical Shop 26개 Commerce SDK 계약과 Core import·소비 0 고정
- Commerce 미설치 plugin slot·서버 부팅 테스트 PASS
- React와 Axum을 하나로 묶는 non-root·read-only OCI image 구현
- app+Caddy만 사용하는 최소 Compose와 별도 DB·Redis service 0 고정
- clean install, health와 image version/revision readback 구현
- deterministic PHP Connector production package와 CycloneDX SBOM 구현
- image archive·SPDX·PHP Connector·checksum release manifest 구현
- SQLite 검증 snapshot과 암호화 master-key recovery archive 구현
- upgrade 전후 핵심 row 보존과 실패 upgrade 자동 rollback harness 구현

현재 migration profile은 기존 Tauri snapshot의 provenance와 source closure만 이관 증거로 검증합니다. routine `make prepare/check`는 해당 snapshot의 Bun·Cargo·Tauri·네이티브 패키징 의존성을 준비하거나 빌드하지 않습니다. 이는 데스크톱 제품 지원 또는 서버판 구현 완료를 뜻하지 않습니다.

## 아직 인증하지 않는 것

- 실제 G5 runtime 대상 Core 189개 route 실행·실데이터 field readback
- 실제 외부 호스트 대상 SSH/SFTP 연결·중단·재접속
- Telegram/Web Push 실제 발송
- 실제 clean host Compose 설치·업그레이드·rollback 실행 증거
- GnuBoard5 v5.6.32 대상 live 저장/readback/cleanup

따라서 이번 완료 등급의 상한은 `SERVER_STATIC_PASS`입니다. 이는 활성
workspace·route·transport·outbox fake·PWA cache·Commerce 격리의
정적/로컬 증거이며 `LOCAL_RUNTIME_PASS`, `PACKAGE_PASS` 또는 실제 외부
발송 인증이 아닙니다.

다음 구현 배치는 `docs/roadmap/SERVER_CONVERSION_BATCH_PLAN.md`의 **B10 인증 단계**입니다. B09는 package와 복구 harness 구현을 `SERVER_STATIC_PASS`로 닫았지만 실제 실행은 아직 `PACKAGE_PASS`로 승격하지 않습니다. 실제 PHP Connector·GnuBoard5 Core 189개와 외부 SSH/SFTP도 B10 runtime 증거 전까지 인증하지 않습니다.
