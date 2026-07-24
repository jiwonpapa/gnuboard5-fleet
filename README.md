# G5 Fleet

그누보드5 여러 사이트를 한 서버에서 관리하기 위한 self-hosted 통합 관리자입니다.

현재 저장소는 기존 PHP REST API와 Rust/Tauri 관리자의 clean revision을 공개용 sanitized snapshot으로 통합한 마이그레이션 기준선입니다. 원본 private 전체 이력, 과거 `output/` 증적, 현재 `api/`와 어긋난 PHP `api.zip`, Markdown에서 재생성되는 Rust `specs/docs.db`는 공개 이력에 포함하지 않습니다.

활성 제품은 Rust Axum 서버와 React PWA로만 배포합니다. 기존 Tauri 코드는 UI와 Rust 소비 구현을 서버 구조로 이관하기 위한 참조 snapshot이며 데스크톱 제품, 네이티브 wrapper, 코드 서명·공증 또는 updater를 제공하지 않습니다. 결정 근거는 [`ADR-0006`](docs/adr/0006-server-only-product-pivot.md), 구현 기준은 [`서버·웹 기술 스택`](docs/architecture/SERVER_WEB_TECH_STACK.md)에 있습니다.

구현은 [`서버 전환 목표 기반 배치 계획`](docs/roadmap/SERVER_CONVERSION_BATCH_PLAN.md)의 B00 → B10 순서로 진행합니다. B00 방향 확정부터 B07 서버 소유 SSH/SFTP·터미널·파일 전송 경계까지 마쳤으며 다음 구현은 B08 알림 outbox·PWA·Commerce 격리입니다.

## 제품 구성

- Fleet Core Server: 무료 사용 정책의 멀티사이트 관리, 비쇼핑몰 관리자 기능, SSH/SFTP, 감사 증적, Telegram/Web Push 알림
- Admin Web: 서버가 제공하는 React 반응형 SPA/PWA
- Commerce: 주문·결제·배송·재고·문의·리뷰·매출을 제공하는 선택형 유료 플러그인
- PHP Connector: 각 G5 사이트에 소유자 승인 후 별도 설치하는 REST API

Fleet Core Server, Admin Web, PHP Connector와 공개 SDK는 Apache License 2.0으로 배포합니다. 공식 Commerce 구현과 제3자 플러그인은 각 플러그인 저장소에서 독립 라이선스를 선택할 수 있으며, `LICENSES.md`가 현재 경계를 설명합니다. `products/admin-desktop`의 참조 snapshot도 Apache-2.0이지만 활성 제품이나 배포물은 아닙니다.

## 검증

```bash
make doctor
make bootstrap  # 최초 1회: upstream + PHP/Composer + Python 감사 의존성 결속
make check
```

이미 upstream checkout이 준비되어 있으면 `make prepare`만 실행합니다. 이 준비 단계는 검증된 G5 원본과 현재 clean destination의 PHP connector를 `.cache/composed/gnuboard5-php`에 새로 합성하고 Composer 잠금 의존성을 설치합니다. 이어서 로컬 Python과 `tools/audit/requirements.txt`에 고정된 PyYAML의 버전·실행 파일·모듈 해시를 기록하고, 활성 Cargo/Bun lock 의존성을 준비합니다. 감사 의존성을 새로 설치하지 않으므로 정확한 PyYAML이 없으면 fail-closed됩니다.

`make check`는 네트워크나 의존성 설치를 수행하지 않습니다. prepared manifest, G5 commit/tree/ref, connector subtree, Composer vendor와 Python/PyYAML fingerprint가 하나라도 누락되거나 달라지면 실패합니다. 그 뒤 합성 runtime의 실제 `adm/`·`install/`·`vendor/`를 입력으로 PHP 계약 검사를 실행하며 OpenAPI 해시는 tracked connector 원본과 동일해야 합니다. PHPUnit과 문서 감사가 만드는 `.phpunit.result.cache`와 `output/`은 소스 overlay fingerprint에서 제외하되 symlink와 위험 권한은 계속 거부합니다.

따라서 `make check`는 외부 서비스나 GitHub Actions 없이 이관 이력, 필수 legacy 소스 폐쇄, OpenAPI 312개, 활성 분류 189개, 일반 게시판 26개, 관리자 Shop 26개를 검증합니다. 활성 workspace에서는 Axum fmt·Clippy·test와 React typecheck·lint·test·build를 오프라인 실행합니다. 참조 Tauri snapshot은 provenance와 추적 source closure만 확인하며 Bun/Cargo/Tauri 설치·빌드·아이콘 검사를 수행하지 않습니다. 현재 `SERVER_SCAFFOLD_PASS`는 활성 골격 증거이며 서버 기능 전체 인증은 아닙니다. 소스 또는 lock이 바뀌면 먼저 commit한 뒤 `make prepare`로 prepared runtime을 갱신해야 합니다.

개발 서버는 최초 한 번 `G5_FLEET_INSTALLATION_ID=local-fleet-01 cargo run -p g5-fleet-admin-server -- init-store`로 저장소를 명시적으로 초기화합니다. 이후 32-byte master key를 Base64로 `G5_FLEET_MASTER_KEY_BASE64`에 주입하고 `cargo run -p g5-fleet-admin-server -- serve`로 실행합니다. 기본 데이터 경로는 `data`, 웹 경로는 `apps/admin-web/dist`입니다. master key는 DB·Git에 넣지 않으며 DB backup과 별도로 보관합니다.

과거 데스크톱 snapshot의 의존성 재현이 특별히 필요할 때만 `make legacy-consumer-prepare`와 `make legacy-consumer-verify`를 수동 실행합니다. 이 명령은 routine 제품 gate가 아닙니다.

`migration.secret_history_hygiene`는 필수 로컬 게이트입니다. 현재 tracked 파일과 모든 reachable Git 이력의 blob을 자격 증명·고위험 개인정보 패턴으로 검사하고, 이력에 `output/`, `connectors/gnuboard5-php/output/`, `products/admin-desktop/output/`가 한 번이라도 등장하면 실패합니다. 예외는 [`governance/SECRET_HISTORY_POLICY.json`](governance/SECRET_HISTORY_POLICY.json)의 값 SHA-256, 패턴 ID, 경로 glob이 모두 일치하는 명시적 범위에서만 허용하며 원문 비밀값은 기록하지 않습니다. 설치된 Gitleaks로 추가 전수검사를 할 때는 `make secret-scan`을 실행합니다.

## 최신 G5 기준

그누보드5 원본은 저장소에 복사하지 않습니다. `UPSTREAMS.lock.json`이 공식 안정 태그 `v5.6.32`의 commit·tree·파일 해시를 고정하며, 로컬 E2E는 `.cache/upstream/`에 검증된 checkout을 준비합니다.

`make upstream-audit`는 origin의 잠금 태그를 다시 fetch해 tag↔commit을 검증합니다. 네트워크 없이 준비된 checkout만 재검증할 때는 `make upstream-verify`를 사용합니다.

G5 원본과 Composer `vendor/`는 Git에 넣지 않습니다. 재현 입력은 `UPSTREAMS.lock.json`, 현재 destination connector subtree, `composer.lock`이며, 준비 결과와 fingerprint manifest는 모두 ignored `.cache/composed/`에만 존재합니다.
