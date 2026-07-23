# ADR-0004: 비-vendor PHP composed runtime

- 상태: 승인
- 날짜: 2026-07-23

## 배경

PHP connector 저장소는 REST API 자체만 추적하며 GnuBoard5 원본의 `adm/`, `install/`과 Composer `vendor/`를 포함하지 않습니다. connector만 실행 입력으로 사용하면 레거시 관리자 분류 scanner가 0건을 반환하고 Rust 교차 감사의 PHPUnit·Composer 단계도 clean clone에서 실행할 수 없습니다.

## 결정

공식 G5와 Composer 산출물은 제품 Git 이력에 vendor하지 않습니다. `make bootstrap` 또는 `make prepare`가 다음 입력으로 `.cache/composed/gnuboard5-php`를 만듭니다.

1. `UPSTREAMS.lock.json`과 exact ref/commit/tree/file fingerprint가 일치하는 `.cache/upstream/gnuboard5/v5.6.32`
2. 현재 clean destination `HEAD:connectors/gnuboard5-php` subtree
3. connector의 tracked `composer.lock` exact package set

sanitized migration source commit/tree와 원본 private commit/tree는 `MIGRATION_PROVENANCE.json`이 각각 기록합니다. 공개 history gate는 sanitized source만 reachable함을 검증합니다. composed runtime은 최초 snapshot에 영구 고정하지 않고 현재 destination subtree를 기록하므로 정상 후속 개발을 허용합니다.

합성은 upstream 파일 위에 connector 파일을 deterministic path 순서로 overlay합니다. Git symlink mode, worktree symlink, 절대·상위 경로 이탈은 거부합니다. 새 임시 tree를 완성한 후 교체하여 삭제된 입력이나 과거 `vendor/` 파일이 남지 않게 합니다.

Composer install은 prepare 단계에만 있습니다. `make check`는 네트워크나 설치를 시도하지 않고 다음을 fail-closed 검증합니다.

- upstream 및 현재 connector commit/tree와 파일 fingerprint
- overlay exact file set·mode·content 및 stale 파일 부재
- Composer lock과 installed exact name/version set
- vendor·전체 runtime fingerprint
- 합성 OpenAPI/manifest와 canonical tracked connector 원본의 동일 해시

PHP docs-check의 실행 `php-root`는 composed runtime입니다. 감사 결과의 canonical 계약 식별자는 계속 `connectors/gnuboard5-php/api/docs/openapi.yaml`이며, 두 파일 해시가 다르면 통과할 수 없습니다. 참조 전용 Rust/Tauri child audit는 routine gate에서 실행하지 않으며 B02 이후 활성 Axum/React 감사가 이 composed provider 계약을 소비합니다.

## 결과

- 원본 G5와 `vendor/` 중복을 저장소에서 제거한 상태로 clean clone 재현성을 확보합니다.
- 네트워크 준비와 오프라인 검증 경계를 분리합니다.
- prepared runtime이 없거나 source·lock·vendor가 drift하면 `MIGRATION_STATIC_PASS`를 발급하지 않습니다.
