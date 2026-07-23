# ADR-0001: 단일 모노레포와 one-way 이관

- 상태: ADR-0005로 대체됨
- 날짜: 2026-07-23

## 결정

초기에는 PHP REST API와 Rust/Tauri 관리자 전체 이력을 `git subtree` non-squash merge로 가져오기로 했습니다. 사전 공개 감사에서 과거 `output/` 증적에 실제 자격정보와 회원 개인정보가 발견되어 이 방식은 폐기했습니다. 현재 결정은 [ADR-0005](./0005-sanitized-snapshot-migration.md)입니다.

초기 경로는 기존 빌드를 깨지 않도록 `connectors/gnuboard5-php`와 `products/admin-desktop`으로 보존합니다. 서버용 `apps/`와 공통 `crates/` 추출은 별도 검증 커밋으로 진행합니다.

기존 감사 PASS는 새 경로의 실행 증거가 아니며, 루트 migration audit 통과 후에만 `MIGRATION_STATIC_PASS`를 부여합니다.
