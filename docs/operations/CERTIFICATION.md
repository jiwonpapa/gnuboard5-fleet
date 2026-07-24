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

[`staging.example.json`](../../tools/certification/staging.example.json)을
ignored 경로에 복사하고 실제 HTTPS origin, provider ID, 배포 receipt와
rollback receipt의 절대경로를 입력합니다.

```bash
make staging-smoke CONFIG=/absolute/staging.json
make audit-staging
```

배포 receipt는 현재 revision·release image ID·version을 포함해야 합니다.
rollback receipt는 검증 snapshot SHA-256과 backup/restore 핵심 row
readback 결과를 포함해야 합니다. target이나 receipt가 없으면
`STAGING_PASS`를 주장하지 않습니다.
