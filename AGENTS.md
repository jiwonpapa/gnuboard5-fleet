# G5 Fleet 통합 개발 규칙

존댓말을 사용하고 사용자를 형님이라 부릅니다.

이 저장소는 그누보드5 멀티사이트 통합 관리자 제품의 단일 정본입니다. 세부 최고 규범은 `governance/CONSTITUTION.md`입니다.

서버 전환 작업 순서는 `docs/roadmap/SERVER_CONVERSION_BATCH_PLAN.md`를 따릅니다. 선행 배치의 완료 게이트가 PASS가 아니면 다음 배치를 시작하지 않습니다.

## 제품 경계

- `connectors/gnuboard5-php`: 각 G5 사이트에 별도 배포하는 PHP REST API 제공자
- `products/admin-desktop`: 이관 분석만 허용하는 봉인된 Tauri/Rust/React 참조 snapshot
- `apps/admin-server`: 활성 self-hosted Rust Axum 서버
- `apps/admin-web`: 활성 React 반응형 SPA/PWA
- `crates`: Tauri 의존성이 제거된 서버 공통 Rust DTO·client·ports·application service
- `plugins/commerce-sdk`: 유료 Commerce 구현이 연결되는 공개 계약 경계
- `tools/audit`: PHP → OpenAPI → Rust → 서버 → UI 소비를 검증하는 Python 하네스

## 절대 규칙

- Canonical OpenAPI는 `connectors/gnuboard5-php/api/docs/openapi.yaml` 하나만 둡니다.
- REST API 312개와 일반 게시판 26개, 관리자 Shop 26개 공급자 계약을 임의로 축소하지 않습니다.
- Shop 공급자 계약은 보존하되 소비·서버·반응형 웹 기능은 유료 Commerce 플러그인이 소유합니다.
- Fleet Core는 Commerce 구현을 import하지 않습니다.
- 활성 제품과 공통 crate는 Tauri package, Tauri command, native wrapper에 의존하지 않습니다.
- `products/admin-desktop`에는 신규 제품 기능을 구현하지 않으며 이관 대상 코드는 서버·웹 경계에 맞게 추출합니다.
- migration 감사는 참조 snapshot의 hash·소비 폐쇄를 확인할 수 있지만 활성 서버 check에서 Tauri CLI·패키징·컴파일을 요구하지 않습니다.
- React는 원격 G5에 직접 요청하지 않으며 브라우저에 G5 JWT·SSH 비밀을 전달하지 않습니다.
- React CRUD는 typed HTTP, SSH/SFTP 실시간 흐름은 인증된 WebSocket·streaming transport를 사용합니다.
- 모든 서버 요청은 사용자 세션과 명시적 `site_id`에 귀속합니다. 전역 활성 사이트를 두지 않습니다.
- SQLite는 WAL·`synchronous=FULL`·foreign key를 사용하고 손상·누락 시 빈 DB를 자동 생성하지 않습니다.
- migration 전 일관된 backup과 checksum을 만들고 실제 restore·readback 없이 backup 완료를 주장하지 않습니다.
- routine 테스트에서 Telegram·Web Push·메일·SMS 외부 발송을 금지합니다.
- `STATIC`, `LOCAL_RUNTIME`, `PACKAGE`, `STAGING`, `LIVE` 증거를 서로 승격해 표현하지 않습니다.
- 로컬 `make check`가 정본이며 GitHub Actions는 수동 fallback만 허용합니다.
- 제품 릴리스는 루트 `CHANGELOG.md`, Keep a Changelog 1.1.0과 SemVer 2.0.0을 따릅니다.
- 제품 버전 정본은 루트 `Cargo.toml`이며 Admin Web·Compose·release manifest와 일치해야 합니다.
- 확정 changelog 항목과 ISO 날짜가 없는 버전은 package·tag·GitHub Release로 배포하지 않습니다.

## 기본 마감

```bash
make check
```

서버·패키지·스테이징 단계는 해당 구현과 증적이 실제로 존재할 때만 상위 profile을 실행합니다.
