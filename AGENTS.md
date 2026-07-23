# G5 Fleet 통합 개발 규칙

존댓말을 사용하고 사용자를 형님이라 부릅니다.

이 저장소는 그누보드5 멀티사이트 통합 관리자 제품의 단일 정본입니다. 세부 최고 규범은 `governance/CONSTITUTION.md`입니다.

## 제품 경계

- `connectors/gnuboard5-php`: 각 G5 사이트에 별도 배포하는 PHP REST API 제공자
- `products/admin-desktop`: 이관된 Tauri 데스크톱 제품과 공통 Rust/React 원본
- `apps/admin-server`: 신규 self-hosted Rust 서버
- `apps/admin-web`: 서버판 및 태블릿 PWA용 React UI
- `plugins/commerce-sdk`: 유료 Commerce 구현이 연결되는 공개 계약 경계
- `tools/audit`: PHP → OpenAPI → Rust → 서버 → UI 소비를 검증하는 Python 하네스

## 절대 규칙

- Canonical OpenAPI는 `connectors/gnuboard5-php/api/docs/openapi.yaml` 하나만 둡니다.
- REST API 312개와 일반 게시판 26개, 관리자 Shop 26개 공급자 계약을 임의로 축소하지 않습니다.
- Shop 공급자 계약은 보존하되 소비·서버·태블릿 기능은 유료 Commerce 플러그인이 소유합니다.
- Fleet Core는 Commerce 구현을 import하지 않습니다.
- React는 원격 G5에 직접 요청하지 않으며 브라우저에 G5 JWT·SSH 비밀을 전달하지 않습니다.
- 모든 서버 요청은 사용자 세션과 명시적 `site_id`에 귀속합니다. 전역 활성 사이트를 두지 않습니다.
- routine 테스트에서 Telegram·Web Push·메일·SMS 외부 발송을 금지합니다.
- `STATIC`, `LOCAL_RUNTIME`, `PACKAGE`, `STAGING`, `LIVE` 증거를 서로 승격해 표현하지 않습니다.
- 로컬 `make check`가 정본이며 GitHub Actions는 수동 fallback만 허용합니다.

## 기본 마감

```bash
make check
```

서버·패키지·스테이징 단계는 해당 구현과 증적이 실제로 존재할 때만 상위 profile을 실행합니다.
