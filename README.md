# gnubard5restapi-php
그누보드5용 restapi 개발

## API 블랙박스 테스트
- 실전 조합: Schemathesis + Hurl
- 가이드: [docs/testing/API_BLACKBOX_TESTING.md](./docs/testing/API_BLACKBOX_TESTING.md)

## OpenAPI 계약 게이트
- canonical SSOT: `api/docs/openapi.yaml`
- Phase 1 관리자 소비 범위 SSOT: `api/docs/openapi.phase1-consumer-scope.json`
- generated manifest: `api/docs/openapi.contract-manifest.json`
- 갱신: `composer run contract:manifest`
- 검증: `composer run contract:check`

## 감사 운영 체계
- 감사 운영 SSOT: [docs/AUDIT_SYSTEM.md](./docs/AUDIT_SYSTEM.md)
- 감사 선택 매트릭스: [docs/AUDIT_STRATEGY.md](./docs/AUDIT_STRATEGY.md)
- blocker registry: [docs/audits/BLOCKERS.toml](./docs/audits/BLOCKERS.toml)
- waiver registry: [docs/audits/WAIVERS.toml](./docs/audits/WAIVERS.toml)
- warning budget registry: [docs/audits/WARNING_BUDGETS.toml](./docs/audits/WARNING_BUDGETS.toml)
- PHP OpenAPI 의미 감사: `composer run audit:openapi-provider`
- 실제 Slim runtime route/handler/middleware 감사: `composer run audit:runtime-routes`
- PHP operation→Controller→Service→Repository 필드 감사: `composer run audit:openapi-field-bindings`
- `composer run quality-gate`는 위 세 검사를 선언 route/docs 검사와 함께 fail-closed로 실행합니다.
- 전체 REST API `312` operation은 축소 금지 인벤토리로 고정합니다. Phase 1 실제 소비 범위는 `/admin/*`(단, `/admin/shop/*` 제외) 184개와 인증·상태 bootstrap 5개, 총 189개입니다.
- 일반 게시판 `/boards`, `/boards/*`, `/files/*`, `/polls/*` 26개는 소비 결정만 deferred이며 provider/runtime/field 감사의 보호 대상입니다. runtime 감사는 route/security뿐 아니라 `201 Location` 계약도 대조합니다. `/admin-inspect/*`와 기타 비관리자 API는 deferred evidence, `/admin/shop/*`는 excluded evidence로 분리합니다.

## 로컬 CI

```bash
composer run hooks:install
composer run ci:local
```

- `ci:local`은 PHP 8.1 production lock 호환성, 하네스 회귀/정적 품질, 전체 공급자 품질 게이트, PHP-Rust 통합 감사를 실행합니다.
- 설치된 `pre-push` 훅은 같은 검증을 푸시 전에 강제합니다.
- GitHub Actions 검증은 자동 실행하지 않고 수동 fallback으로만 유지합니다.

## 외부 공급자 테스트 리뷰
- 대상: 본인인증, 소셜로그인, 기타 외부 인증 공급자
- 가이드: [docs/testing/EXTERNAL_PROVIDER_TESTING_REVIEW.md](./docs/testing/EXTERNAL_PROVIDER_TESTING_REVIEW.md)

## 외부 인증 현재 경계
- foundation: `/auth/external/providers`, `/auth/external/{provider}/start`, `/auth/external/{provider}/complete`
- transition: `/auth/external/{provider}/sessions`, `/auth/external/{provider}/claims`, `/auth/external/{provider}/registrations`
- link management: `/auth/external/links`, `/auth/external/{provider}/links`, `/auth/external/{provider}/links/{provider_user_id}`

## License
This project is licensed under the [AGPL-3.0](LICENSE).
