# Migration Status

## 현재 판정

2026-08-31 기준선 `94c8a1c4e6c932f754b81effae2d558e39d4f770`을 재검사한
전체 이관 정적 동등성 결과는 `MIGRATION_STATIC_PASS`, finding 0개입니다.
이는 구현·회귀 테스트의 **정적 매핑** 판정이며 실사용 검증 완료가 아닙니다.

- legacy inventory 510개 전체의 배치 소유권은 확정됐으며 현재 유효 매핑은
  다음과 같습니다.
  - Tauri command 253/253
  - React page 43/43
  - Rust workspace member 21/21
- frontend regression test 100/100
- Rust regression test 93/93
- 서버 전환 필수 capability 13/13 정적 구현 증명
- typed Core operation 소비 189/189
- 활성 server route 250개와 Core registry 189개는 존재하지만 전체 이관
  증거로 승격하지 않음
- 정적 미완료 finding 0개
- runtime profile은 FAIL: 699개 항목(legacy 510 + Core 189)의 실행 증거
  연결 누락과 R04 원격 증거의 SHA 불일치·기간 만료 2개, 총 701 findings
- 등록된 32개 배치 중 31개 `batch_pass`, R36 `active`

현재 코드의 local G5 실행 기록은 존재하지만 browser, package, staging
기록은 서로 다른 이전 SHA입니다. 기록의 status만 복사하거나 날짜·SHA를
바꿔 갱신하지 않습니다. 항목별 실제 실행 case와 원본 artifact를 연결하고
현재 코드에서 필요한 검증을 재실행해야 합니다.

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
- risk-based step-up, DELETE 명시 확인, 외부 메일·SMS·Push 10개 routine 차단
- G5 token refresh·logout의 서버 전용 암호화 수명주기 구현
- SSH 개인키·known_hosts의 사용자·사이트 단위 서버 암호화 저장
- 관리 대상 public·private IP DNS pin·재검증과 strict host key를 강제하는 OpenSSH adapter 구현
- hash-only 60초 일회성 ticket 기반 terminal WebSocket 중계 구현
- 구조화된 SFTP 명령, bounded upload/download stream과 SQLite 전송 상태 구현
- 실행 중 OpenSSH 전송 process 중단, 동시 전송 제한과 브라우저 재전송 구현
- 관측 host key, terminal 중단·재접속, SFTP readback·전송 중단·cleanup 스테이징 VM PASS
- 터미널 ticket 교차 사용자·사이트 차단과 전송 실패·재시도·취소 상태 테스트 PASS
- SQLite notification lease·retry·dedupe·dead-letter worker 구현
- Telegram Bot API·Web Push VAPID 운영 transport와 외부 네트워크 없는 fake delivery PASS
- 사이트별 Telegram 목적지와 PushSubscription의 AES-256-GCM 암호화 저장·회전·폐기 구현
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
- 회원 목록·export·상세·변경 필드 수정·레벨·아이콘·이미지·소프트 삭제 typed 소비 10개 구현
- 공식 G5 v5.6.32 실런타임에서 R12 10개 operation 저장·readback·미디어 multipart 검증 PASS
- 게시판 그룹 canonical 9개와 legacy alias 8개 typed 소비, 그룹·회원 CRUD 반응형 작업대 구현
- 공식 G5 v5.6.32 실런타임과 390px Chromium에서 R13 17개 operation·저장 readback 검증 PASS
- SMS 설정 3개와 SMS 주소록 15개 operation을 site-scoped typed 서버·웹으로 이관
- 공식 G5 v5.6.32에서 주소록 그룹·연락처 CRUD, 일괄 복사·이동, import preview·확정, export·cleanup readback PASS
- Chromium 1440×1000·375×812에서 OTP·recent step-up, 주소록 workflow와 내부 table scroll, 콘솔 오류·경고 0 PASS
- SMS 템플릿 13개 operation을 site-scoped typed 서버·웹으로 이관하고 공식 G5 5.6.32에서 그룹·템플릿 CRUD, 미분류 이동·일괄 처리·정리 readback PASS
- SMS 메시지 6개 operation을 site-scoped typed 서버·웹으로 이관하고 공식 G5 5.6.32에서 배치 목록·상세·전달 결과 readback과 외부 발송 확인 차단 PASS
- Push 표준·레거시 2개 operation을 site-scoped typed 서버·웹으로 이관하고 공식 G5 5.6.32에서 회원·전체 대상 로컬 큐 readback과 외부 전달 0 PASS
- 시스템 도구·유지보수 10개 operation을 typed 서버·웹으로 이관하고 phpinfo 원문 차단, Browscap 상태, 유지보수 5종 공식 G5 REST readback PASS

현재 migration profile은 기존 Tauri snapshot의 provenance와 source closure만 이관 증거로 검증합니다. routine `make prepare/check`는 해당 snapshot의 Bun·Cargo·Tauri·네이티브 패키징 의존성을 준비하거나 빌드하지 않습니다. 이는 데스크톱 제품 지원 또는 서버판 구현 완료를 뜻하지 않습니다.

## 아직 인증하지 않는 것

- 실제 G5 runtime 대상 Core 189개 route 실행·실데이터 field readback
- R04에서 인증한 사설 스테이징 VM 외 production SSH/SFTP 대상
- Telegram/Web Push 실제 발송

과거 공식 G5·Chromium local 및 OCI 설치·upgrade·backup·restore·rollback
성공 기록은 보존합니다. 그러나 현재 SHA의 browser/package/staging
인증으로 승격하지 않습니다. 2026-08-31 재조회에서 browser는 `27883c6`,
package는 `f23bd1c`, staging은 `fac6a92` 기준이므로 현재 판정은 stale입니다.
외부 Telegram·Web Push 발송은 승인된 LIVE 범위가 아니며 계속 미실행입니다.

B10 staging target은 기존 PHP staging과 분리된 libvirt VM입니다.
provider ID는 VM identity에 고정하고, 사설 HTTPS origin은 IP SAN과 내부
CA로 검증합니다. 기본 server release는 `linux/amd64`이며 release
manifest의 image ID·platform·version·revision을 실행 중 container와
대조합니다. `make staging-rehearsal`은 실패 upgrade, 검증 backup 복원과
핵심 row readback을 확인해 배포·rollback receipt를 생성합니다.
CA private key와 receipt, `staging.json`은 Git에 넣지 않으며 동일
revision의 `make audit-staging`이 전부 PASS일 때만 B10 완료를 주장합니다.

## 현재 배치

R00~R35는 tracked 증거로 닫혔습니다. 9차의 첫 배치 R35 알림·PWA를
독립 gate·commit·push로 마감했고 R36 전체 종결이 활성 배치입니다.
R36 내부 작업 순서와 완료 조건은
[`R36_CLOSEOUT.md`](roadmap/R36_CLOSEOUT.md)를 따릅니다.

아래 R35 수치는 해당 배치 마감 당시의 역사적 증거이며 현재 재실행 결과가
아닙니다.

- R35 구현 commit: `d486dc84cdafbf13369071620b3000da4f399bf6`
- 증거: `docs/audits/evidence/R35_BATCH_GATE_PASS.json`
- R35 scope: legacy 0, Core 0, capability 2
- reuse: 4 reused / 14 adapted / 0 redesigned / 0 deferred
- R35 scoped finding: 0
- `SERVER_STATIC_PASS`: 35/35
- typed Core 소비: 189/189
- Rust workspace test: PASS, 1 remote certification ignored
- 웹 테스트: 87 files, 200 PASS
- PHP Connector: 877 tests, 6735 assertions, 5 skipped
- `LOCAL_RUNTIME_PASS`: 공식 G5 5.6.32에서 Telegram 목적지 암호화
  readback, Web Push 구독 생성·회전·폐기와 비밀 비노출 PASS
- 운영 secret 미설정 알림 `dead_letter`, 실제 외부 전송 시도 0
- 실제 Telegram·Web Push 외부 수신 성공은 `LIVE` 자격증명 미제공으로 미실행
- headed 브라우저는 임시 비밀번호·OTP 입력 승인이 없어 미실행으로 분리 기록
- 다음 활성 배치: R36 전체 종결
- R36 정적 probe: 2026-08-31 PASS, scoped/global finding 0
- R36 실행 증거 probe: FAIL 701, 항목별 실행 증명·최신화가 남음
- 목표 추진 차수:
  - 5차: R27~R28, write-count·mails — 완료
  - 6차: R29~R30, SMS 설정·주소록 — 완료
  - 7차: R31~R32, SMS 템플릿·메시지 — 완료
  - 8차: R33~R34, Push·시스템 도구 — 완료
  - 9차: R35~R36, 알림·PWA·전체 종결

```bash
make check-batch BATCH=R36
```

전체 완료는 아닙니다. 정적 매핑은 닫혔지만 실행 증거·내장 브라우저·동일 SHA
패키지·스테이징 검증을 마감하기 전에는 R36을 `batch_pass`로 바꾸지 않습니다.
