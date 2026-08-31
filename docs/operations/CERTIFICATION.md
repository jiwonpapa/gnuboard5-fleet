# 제품 인증 실행 (R36 종결 기준)

## 1. local runtime

```bash
make certification-up
make certification-local-smoke
```

명령 종료 시 background process를 정리하는 에이전트 터미널에서는
`tools/certification/local_stack.sh up --foreground`를 실행 세션으로 유지한
뒤 다른 세션에서 smoke와 내장 브라우저 검증을 실행합니다.

`certification-up`은 clean Git revision과 prepared runtime을 요구합니다.
공식 G5 v5.6.32+PHP Connector image, 임시 MariaDB와 test-only
`local-certification` Fleet binary를 loopback에 기동합니다. 임시
자격정보는 ignored `.cache/certification/local/session.env`에 `0600`으로
저장합니다.
인증 바이너리는 `target/local-certification`에 별도 빌드합니다. 기본 target을
공유하면 동시에 실행한 Cargo 통합 테스트가 실행 중인 인증 바이너리를
일반 빌드로 교체할 수 있으므로 공유하지 않습니다.

기존 session이 있으면 먼저 소유권과 보존할 DB·키·증거를 확인합니다.
`certification-clean`은 확인 없이 선행하는 준비 명령이 아닙니다.
새 실행은 고유 Compose project와 외부 연결이 차단된 G5 네트워크를 사용합니다.
테스트용 HTTP relay만 loopback에 공개하며 PHP·MariaDB는 내부 네트워크에만
연결됩니다. 이 G5 공급자 fixture는 Fleet의 원컨테이너 제품 배포와 별개입니다.
종료는 PID뿐 아니라 실행 시작 시각과 명령이 일치할 때만 허용합니다.

HTTP E2E는 G5 provider 직접 수정·원복과 Fleet 2사용자×2사이트 격리를
실행하고 `.cache/evidence/local-runtime.json`을 만듭니다.
실제 Rust→PHP 응답은 요청 ID로 도메인 readback checkpoint에 연결됩니다.
`.cache/evidence/r36-provider-execution.json`은 불변 원본 case의 hash와
실제로 관측한/아직 관측하지 못한 Core API 목록을 기록합니다. HTTP 200,
직접 PHP 호출, mock 또는 skip만으로 Fleet 소비 완료를 인증하지 않습니다.

## 2. Codex 내장 브라우저

사용자 지정에 따라 Codex 내장 브라우저만 사용합니다. 별도 headed 브라우저를
시작하지 않습니다. 비밀번호·OTP 입력 직전에 테스트 계정·목적지를 확인받으며
cookie 주입으로 로그인을 우회하지 않습니다.

관리자와 동료 계정에서 자신의 site만 보이는지 검증하고, 실제 Connector 로그인,
도메인 저장·재조회·원복 및 모바일 viewport를 확인합니다. 각 워크플로우는
관측 case, 화면 증거와 현재 revision/부모 실행 ID에 결속되어야 합니다.
기존 `write_browser_evidence.py`의 일반 PASS/스크린샷 파일만으로 항목별
브라우저 검증을 대체하지 않습니다. 내장 브라우저의 항목별 증거 연결은
R36 C단계에서 마감합니다.

종료:

```bash
make certification-down
make certification-clean
```

## 3. package

```bash
make package-build VERSION="$RELEASE_VERSION"
make package-smoke
make audit-package
```

`package-build`는 clean Git과 Docker BuildKit, Docker Scout를 요구합니다.
`RELEASE_VERSION`은 루트 Cargo·웹·Compose와 일치하고 CHANGELOG에 ISO 날짜로
확정된 SemVer이어야 합니다. 임의 `b10-local` 같은 문자열은 릴리스 버전이 아닙니다.
`package-smoke`는 임시 state를 자동 정리하며 외부 알림을 발송하지
않습니다.

## 4. staging

현재 release를 staging host에 설치한 뒤 release manifest를 host의
접근 제한 경로에 복사합니다. 다음 rehearsal은 실행 중인 image의
version/revision을 release manifest와 대조하고, 존재하지 않는 image
upgrade를 의도적으로 실행해 검증 snapshot 자동 복원과 핵심 row
readback을 확인합니다. receipt는 수동으로 작성하지 않습니다.

```bash
make staging-rehearsal \
  PROVIDER_ID=provider-instance-id \
  VERSION=b10-release-version \
  ENV_FILE=/absolute/deploy/compose/.env \
  RELEASE_MANIFEST=/absolute/release-manifest.json \
  OUTPUT_DIR=/absolute/staging-receipts
```

생성된 `deployment-receipt.json`, `rollback-receipt.json`을 인증 실행
호스트의 접근 제한 경로로 가져옵니다. 그 다음
[`staging.example.json`](../../tools/certification/staging.example.json)을
ignored 경로에 복사하고 실제 HTTPS origin, 동일 provider ID, 두 receipt의
절대경로를 입력합니다.

공개 DNS를 사용하지 않는 사설 staging VM은 IP SAN이 들어간 내부 CA
server certificate를 사용할 수 있습니다. CA private key는 VM·Git에
복사하지 않고, 인증 실행 호스트의 CA certificate만 `SSL_CERT_FILE`로
명시합니다.

```bash
SSL_CERT_FILE=/absolute/staging-ca.crt \
  make staging-smoke CONFIG=/absolute/staging.json
make audit-staging
```

배포 receipt는 현재 revision·release image ID·platform·version을
포함해야 합니다.
rollback receipt는 검증 snapshot SHA-256과 backup/restore 핵심 row
readback 및 실패 upgrade 자동 복원 결과를 포함해야 합니다. target이나 receipt가 없으면
`STAGING_PASS`를 주장하지 않습니다.
