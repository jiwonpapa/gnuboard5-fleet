# Migration Status

## 현재 판정

2026-07-27 R04 마감 후 전체 이관 동등성 하네스 결과는
`MIGRATION_STATIC FAIL`입니다.

- legacy inventory 510개 중 유효 매핑 236, 미매핑 274
  - Tauri command 66/253
  - React page 11/43
  - Rust workspace member 21/21
  - frontend regression test 48/100
  - Rust regression test 90/93
- 서버 전환 필수 capability 9/13 구현 증명
- 활성 server route 57개와 Core registry 189개는 존재하지만 전체 이관
  증거로 승격하지 않음

아래 구현 목록은 현재 소스에 존재하는 기반 기능 inventory입니다. 전체
legacy 기능·UI·테스트가 이관됐다는 완료 목록이 아닙니다. B02부터 B10은
[`MIGRATION_PARITY_HARNESS.md`](audits/MIGRATION_PARITY_HARNESS.md)에 따라
재감사 중입니다.

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
- 관리 대상 public·private IP DNS pin·재검증과 strict host key를 강제하는 OpenSSH adapter 구현
- hash-only 60초 일회성 ticket 기반 terminal WebSocket 중계 구현
- 구조화된 SFTP 명령, bounded upload/download stream과 SQLite 전송 상태 구현
- 실행 중 OpenSSH 전송 process 중단, 동시 전송 제한과 브라우저 재전송 구현
- 관측 host key, terminal 중단·재접속, SFTP readback·전송 중단·cleanup 스테이징 VM PASS
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
- OTP 없는 추가 관리자 생성을 정책 차단하고 별도 OTP 등록 흐름 전까지 UI 미노출
- 최초 설치 상태, 관리자·OTP·복구 코드 원자 저장과 비밀번호+OTP 로그인 구현
- 로그인 5회 실패 15분 lockout과 일회성 복구 코드 사용·재발급 구현
- mutation append-only 감사 기록, principal·site 범위 조회 API와 필터·상세 웹 UI 구현
- 소유 사이트 등록·조회·수정·삭제와 명시적 `site_id` URL 선택 구현
- 소유 사이트·주의 상태·작업·최근 활동 통합 dashboard 구현
- Argon2id+AES-256-GCM 휴대용 사이트 backup 내보내기·병합 구현
- backup 가져오기 전 SHA-256 snapshot과 실제 restore·integrity·readback 강제
- Tauri DevTools·개발 bootstrap을 제거한 인증 서버 진단 화면 구현
- test-only local-certification feature와 공식 G5 v5.6.32 기동 harness 구현
- local·browser·package·staging 증거 evaluator와 stale revision 차단 구현
- 공식 G5 v5.6.32+Shop에서 Connector 로그인·설정 수정·재조회·원복 PASS
- Chromium 2사용자×2사이트 가시성 격리와 동일 출처 Fleet transport PASS
- OCI clean install·데이터 보존 upgrade·검증 backup·master key 복원·실패 rollback PASS

현재 migration profile은 기존 Tauri snapshot의 provenance와 source closure만 이관 증거로 검증합니다. routine `make prepare/check`는 해당 snapshot의 Bun·Cargo·Tauri·네이티브 패키징 의존성을 준비하거나 빌드하지 않습니다. 이는 데스크톱 제품 지원 또는 서버판 구현 완료를 뜻하지 않습니다.

## 아직 인증하지 않는 것

- 실제 G5 runtime 대상 Core 189개 route 실행·실데이터 field readback
- R04에서 인증한 사설 스테이징 VM 외 production SSH/SFTP 대상
- Telegram/Web Push 실제 발송

현재 revision은 routine `SERVER_STATIC_PASS`와 별도로 공식 G5·Chromium
`LOCAL_RUNTIME_PASS`, OCI 설치·upgrade·backup·restore·rollback
`PACKAGE_PASS`를 확보했습니다. 이 두 등급은 외부 staging이나 실제 알림
발송 증거를 대신하지 않습니다.

B10 staging target은 기존 PHP staging과 분리된 libvirt VM입니다.
provider ID는 VM identity에 고정하고, 사설 HTTPS origin은 IP SAN과 내부
CA로 검증합니다. 기본 server release는 `linux/amd64`이며 release
manifest의 image ID·platform·version·revision을 실행 중 container와
대조합니다. `make staging-rehearsal`은 실패 upgrade, 검증 backup 복원과
핵심 row readback을 확인해 배포·rollback receipt를 생성합니다.
CA private key와 receipt, `staging.json`은 Git에 넣지 않으며 동일
revision의 `make audit-staging`이 전부 PASS일 때만 B10 완료를 주장합니다.

## 현재 배치

R00~R10은 tracked 증거로 닫혔습니다. R10은 legacy 14개와 Core operation
5개를 닫아 전역 finding을 467개에서 448개로 줄였습니다.

- 구현 commit: `e92bf23111f30967940b778f9e55a74171d33dee`
- 증거: `docs/audits/evidence/R10_BATCH_GATE_PASS.json`
- runtime 증거: `docs/audits/evidence/R04_REMOTE_RUNTIME_CERTIFICATION.json`
- R10 scoped finding: 0
- `SERVER_STATIC_PASS`: 35/35
- typed Core 소비: 5/189
- 웹 테스트: 50 PASS
- `LOCAL_RUNTIME_PASS`: SSH/SFTP 8개 실제 검증
- staging `fac6a92` 배포·TLS·ready/meta와 실패 upgrade backup rollback
  receipt PASS. 다만 과거 B10 local/browser/package 증거가 현재 SHA와 달라
  전체 `audit-staging` PASS로 승격하지 않음
- 다음 활성 배치: R11 auth·member self·system auth
- R11 사전 probe: FAIL 19

```bash
make check-batch BATCH=R11
```

전체 완료는 아닙니다. 전역 감사 448개가 남아 있으며 R36 전까지
`MIGRATION_STATIC FAIL`을 유지합니다.
