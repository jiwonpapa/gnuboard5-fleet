# ADR-0003: GnuBoard5 최신 안정판 고정

- 상태: 승인
- 날짜: 2026-07-23

## 결정

공식 `gnuboard/gnuboard5`의 최신 안정 태그를 commit과 tree로 고정합니다. 최초 기준선은 `v5.6.32`입니다. 기존 로컬 5.6.24 코어는 역사 비교 자료일 뿐 이관하지 않습니다.

G5 전체 소스를 제품 코드에 vendor하지 않고 `.cache/upstream/`에 검증된 checkout을 만듭니다. version.php와 LICENSE.txt 해시가 lock과 다르면 실패합니다. 새 안정판 반영은 PHP legacy 분석, OpenAPI 재추출, Rust/server/web 소비 감사, 로컬 E2E가 모두 통과한 뒤에만 lock을 변경합니다.
