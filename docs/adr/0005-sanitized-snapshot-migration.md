# ADR-0005: 공개 통합 저장소는 sanitized snapshot만 이관

- 상태: 승인
- 날짜: 2026-07-23

## 결정

원본 PHP와 Rust 저장소는 private 보관 이력으로 유지합니다. 공개 `gnuboard5-fleet`에는 각 원본의 봉인된 clean revision에서 만든 단일 sanitized snapshot commit만 이관합니다.

- 모든 위치의 `output/` 런타임·감사 증적은 snapshot과 전체 공개 이력에서 제외합니다.
- 현재 `api/`와 내용이 어긋난 PHP `api.zip`도 이중 정본이므로 제외하고 원본 SHA-256만 provenance에 남깁니다.
- Markdown에서 재생성되는 비결정적 Rust `specs/docs.db`는 snapshot에서 제외하고 ignored `.cache/docs/docs.db`로 생성합니다.
- 원본 commit/tree와 sanitized snapshot commit/tree를 `MIGRATION_PROVENANCE.json`에 함께 기록합니다.
- sanitized snapshot commit은 subtree import commit의 부모로 보존해 공개 범위 안의 provenance를 검증합니다.
- 원본 전체 commit graph는 공개 통합 저장소에 포함하지 않습니다.
- 이후 증적은 ignored `output/audit/runs/`에서 재생성하며 소스처럼 commit하지 않습니다.

첫 공개 감사에서 제외 대상으로 확인한 tracked 증적은 PHP 231개, Rust 77개입니다. 해당 파일에는 관리자 자격정보, 회원 식별자, 비밀번호 해시, 이메일과 IP가 포함되어 있었습니다.

## 강제 규칙

`MIGRATION_STATIC_PASS`는 다음 조건을 모두 만족해야 합니다.

1. 모든 reachable commit에 금지된 `output/` 경로가 없습니다.
2. current tree와 reachable history의 비밀·개인정보 정적 검사가 통과합니다.
3. 원본 private commit은 공개 저장소에서 reachable하지 않습니다.
4. import commit의 subtree tree가 기록된 sanitized source tree와 정확히 같습니다.

## 결과

과거 line-level blame은 원본 private 저장소에서 확인합니다. 공개 저장소는 이관 시점 이후의 통합 이력만 제공하며, 보안성과 재현 가능한 provenance를 우선합니다.
