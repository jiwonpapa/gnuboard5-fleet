# 2026-03-09 Multi-Site Self Audit

## 범위

- 기준 문서: `specs/domains/MULTI_SITE_SDD.md`
- Codex 실행 기준: `specs/codex/2026-03-09-MULTI_SITE_CODEX_PROMPT.md`
- 감사 방식: 구현 대조 + 빌드/테스트/커버리지 + 1회 수정 루프

## 결과 요약

| 항목 | 판정 | 비고 |
|------|------|------|
| SQLite + SQLCipher 사이트 저장소 | 완료 | `db.rs`, `site_manager.rs`, `app_state.rs` |
| legacy `app-config.json/session` 마이그레이션 | 완료 | 첫 사이트 `기본 사이트` 자동 이관 |
| 사이트별 JWT/session 분리 | 완료 | keyring/file session store site scope 적용 |
| 사이트 catalog/add/update/delete/switch/health-check | 완료 | Tauri command + TS bridge 완료 |
| 사이트 scope 라우팅(`/sites/:siteId/*`) | 완료 | 로그인/보호 라우트/상단 메뉴/좌측 메뉴 반영 |
| 상단 탭 바 + 사이트 추가 UX | 완료 | `SiteTabBar`, `SiteFormDialog`, 온보딩 페이지 |
| 첫 페이지 멀티사이트 대시보드 | 완료 | `/overview`를 활성 사이트/활동 중심 대시보드로 전환 |
| 로컬 활동 기록 조회 | 완료 | `cmd_site_activity_list` + overview 표시 |
| updater plugin 로드 | 완료 | `tauri-plugin-updater` 등록 |
| PHP `/admin/dashboard` 연동 | 보류 | OpenAPI에 엔드포인트 부재, 로컬 대시보드로 대체 |
| 잠금 화면 / biometric / idle lock | 보류 | 이번 1회 구현 범위에서 미착수 |

## 셀프감사에서 발견 후 수정한 항목

1. `AdminOverviewPage` 빠른 진입 링크가 사이트 scope 없이 canonical path만 사용하고 있었습니다.
   - 수정: `buildSiteRoute(activeSite.id, item.to)`로 보정
2. 새 대시보드 테스트가 DOM 중복 텍스트와 `MemoryRouter` href 형식을 잘못 가정하고 있었습니다.
   - 수정: 다중 텍스트 허용과 실제 href 기대값으로 교정

## 검증 명령

```bash
cargo check --manifest-path g5-admin/src-tauri/Cargo.toml
cargo test -p g5-admin-desktop export_ts_bindings -- --nocapture
cargo test -p g5-admin-desktop
pnpm --dir g5-admin exec tsc --noEmit
pnpm --dir g5-admin lint
pnpm --dir g5-admin test
pnpm --dir g5-admin test:coverage:critical
pnpm --dir g5-admin build
```

## 검증 결과

- Rust `cargo check` 통과
- `export_ts_bindings` 통과
- Rust unit/doc test `304 passed`
- Frontend test `50 files / 364 tests` 통과
- Critical coverage `84.90 / 75.74 / 80.91 / 85.00`
- Production web build 통과

## 결론

멀티사이트 P0의 핵심인 `SQLite 저장소`, `사이트별 세션`, `온보딩`, `탭 바`, `사이트 scope 라우팅`, `로컬 대시보드`, `활동 기록`, `업데이트 플러그인 로드`는 현재 구현과 검증이 맞습니다.

다만 명세 원문 기준 전체 완료는 아닙니다. `PHP /admin/dashboard`가 계약에 없어서 서버 통계형 대시보드는 아직 붙지 않았고, `lock/biometric/idle lock` 보안 레이어도 후속 범위로 남아 있습니다.
