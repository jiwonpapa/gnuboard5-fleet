# Migration Status

## 현재 판정

2026-09-01 구현 기준선
`7dce00afeb3ee7a54980fbcc193708686d53021a`에서 서버 전환 감사와
배포 전 인증을 마감했습니다.

- legacy 510/510 실행 증거 연결
  - Tauri command 253/253
  - React page 43/43
  - Rust workspace member 21/21
  - frontend regression test 100/100
  - Rust regression test 93/93
- typed Core operation 189/189 실행 증거 연결
- legacy + Core 실행 감사 699/699, finding 0
- 서버 전환 필수 capability 13/13
- 전체 거버넌스 항목 712/712, finding 0
- 등록된 32개 배치 R00~R36 전부 `batch_pass`

`SERVER_STATIC_PASS`, `LOCAL_RUNTIME_PASS`, `PACKAGE_PASS`, `STAGING_PASS`를
각각 확보했습니다. 이는 운영 배포 또는 실제 외부 알림 발송 인증이 아닙니다.

## 실행 증거

| 등급 | 결과 | 핵심 증거 |
|---|---|---|
| 정본 검사 | PASS | `make check`, 서버 정적 35/35, 웹 207/207 |
| 이관 runtime | PASS | 699/699, finding 0 |
| 공식 G5 local | PASS | G5 5.6.32, composed source 8,525파일 hash 대조 |
| 회귀 | PASS | 실행 case 329개, skip·모호한 매핑 fail-closed |
| SSH/SFTP | PASS | 승인된 `192.168.0.127` 대상 실제 roundtrip 4개 |
| 내장 브라우저 | PASS | workflow 41개, React page subject 43/43 |
| package | PASS | 47/47, 원컨테이너 앱+SQLite 영구저장·upgrade·restore·rollback |
| staging | PASS | 50/50, `https://g5-fleet.test`, HTTPS·receipt·readback |

종결 정본은
[`R36_BATCH_GATE_PASS.json`](audits/evidence/R36_BATCH_GATE_PASS.json)입니다.
원본 실행 산출물은 Git에서 제외한 `output/`과 `.cache/evidence/`에 두며,
정본 증거가 경로·SHA-256으로 결속합니다.

## 제품 구조

- `connectors/gnuboard5-php`: 각 G5 사이트에 설치하는 PHP REST 공급자
- `apps/admin-server`: Axum 서버, 인증·사이트 격리·비밀·SQLite 소유
- `apps/admin-web`: 서버와 같은 origin만 사용하는 React SPA/PWA
- `crates`: Tauri 없는 DTO·client·ports·application service
- `products/admin-desktop`: 신규 기능을 받지 않는 이관 참조 snapshot
- `plugins/commerce-sdk`: Shop 26개 유료 구현의 독립 계약 경계

Canonical OpenAPI 312개는 보존합니다. Fleet Core 소비는 비쇼핑 관리자
184개와 bootstrap 5개, 합계 189개입니다. 일반 게시판 26개와 Shop 26개
공급 계약은 축소하지 않으며 Shop 소비 구현은 공개 Core에 포함하지 않습니다.

## 저장·설치 판정

배포 기본형은 별도 DB·Redis 없이 `app + Caddy` Compose입니다. `app` image
하나가 Rust 서버, React 정적 자산, SQLite schema 4를 포함합니다.

- SQLite WAL, `synchronous=FULL`, foreign key 강제
- DB 누락·손상 시 빈 DB 자동 생성 금지
- upgrade 전 검증 snapshot과 checksum 생성
- 기존 핵심 row 보존 비교 후 upgrade 확정
- 암호화 master-key와 DB backup의 실제 restore·integrity·readback
- 실패 upgrade의 이전 image·DB 자동 rollback
- `linux/amd64` package image와 SBOM·Connector·checksum manifest 검증

Staging은 `192.168.0.127` 호스트의 전용 VM `192.168.0.144`이며 provider ID는
`b78f57a04b604a49812c8e20e376cdf5`입니다. Mac의 신뢰된 로컬 CA로
`https://g5-fleet.test`를 검증합니다. staging private config, CA private key,
receipt와 자격정보는 Git에 넣지 않습니다.

## 보안·검증 경계

- 브라우저에는 G5 JWT·refresh token·SSH private key를 전달하지 않습니다.
- 모든 요청은 사용자 세션과 명시적 `site_id`에 귀속합니다.
- 최초 설치에서 관리자 비밀번호와 OTP 등록을 원자적으로 완료합니다.
- 2사용자×2사이트 격리, CSRF, recent step-up, SSRF·DNS rebinding 차단을
  실제 HTTP와 내장 브라우저에서 확인했습니다.
- 원격 검증은 승인된 SSH key와 staging 대상에서만 실행했습니다.
- routine 인증 중 Telegram·Web Push·메일·SMS 외부 발송은 0건입니다.

## 완료로 승격하지 않는 범위

- 실제 Telegram·Web Push·메일·SMS 외부 수신 성공
- 인터넷 공개 운영 배포와 공개 DNS cutover
- 유료 Commerce 플러그인의 구현·라이선스·동작
- 모든 OpenAPI schema field 값 조합의 전수 저장·readback
- 승인된 staging 외 임의 운영 서버의 SSH/SFTP 동작

위 항목은 제품 전환 누락이 아니라 별도 LIVE 또는 플러그인 범위입니다.
릴리스는 확정 changelog·SemVer·tag·GitHub Release 절차를 별도로 따릅니다.

## 배치

R00~R36은 모두 tracked 증거로 닫혔습니다. B00~B10 서버 전환 기반과
인증도 완료 판정이며, 이후 기능은 새 승인 범위와 새 배치에서 진행합니다.

```bash
make check
make check-batch BATCH=R36
make audit-migration-runtime
G5_FLEET_AUDIT_BASE_URL=https://g5-fleet.test \
G5_FLEET_AUDIT_CA_FILE=<trusted-root-ca.pem> \
make audit-migration-staging
```

정적 검사만으로 runtime·package·staging 완료를 대신할 수 없으며, 새 commit이
생기면 revision-bound 실행 증거는 해당 commit에서 다시 수집합니다.
