# B10 제품 인증 실행

## 1. local runtime

```bash
make certification-clean
make certification-up
make certification-local-smoke
```

`certification-up`은 clean Git revision과 prepared runtime을 요구합니다.
공식 G5 v5.6.32+PHP Connector image, 임시 MariaDB와 test-only
`local-certification` Fleet binary를 loopback에 기동합니다. 임시
자격정보는 ignored `.cache/certification/local/session.env`에 `0600`으로
저장합니다.

HTTP E2E는 G5 provider 직접 수정·원복과 Fleet 2사용자×2사이트 격리를
실행하고 `.cache/evidence/local-runtime.json`을 만듭니다.

## 2. Chromium browser

`playwright-cli` named session을 `fleet-admin`, `fleet-peer`로 분리합니다.
두 session에서 각각 자신의 site 하나만 표시되고 다른 사용자의 site가
표시되지 않는지 확인합니다. 관리자 session은 Connector login,
`cf_10` 수정·재조회·원복까지 수행합니다.

스크린샷과 trace는 `output/playwright/`에 둔 뒤 다음 명령으로
부모 local evidence에 결속합니다.

```bash
tools/certification/write_browser_evidence.py \
  --admin-screenshot /absolute/output/playwright/admin.png \
  --peer-screenshot /absolute/output/playwright/peer.png \
  --trace /absolute/output/playwright/local-e2e-trace.zip
make audit-local
```

종료:

```bash
make certification-down
make certification-clean
```

## 3. package

```bash
make package-build VERSION=b10-local
make package-smoke
make audit-package
```

`package-build`는 clean Git과 Docker BuildKit, Docker Scout를 요구합니다.
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

```bash
make staging-smoke CONFIG=/absolute/staging.json
make audit-staging
```

배포 receipt는 현재 revision·release image ID·version을 포함해야 합니다.
rollback receipt는 검증 snapshot SHA-256과 backup/restore 핵심 row
readback 및 실패 upgrade 자동 복원 결과를 포함해야 합니다. target이나 receipt가 없으면
`STAGING_PASS`를 주장하지 않습니다.
