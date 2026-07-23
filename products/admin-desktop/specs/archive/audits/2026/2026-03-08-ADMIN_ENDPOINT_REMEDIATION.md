# Admin Endpoint Remediation

Date: 2026-03-08
Scope:
- `/Users/neojins/workspace/gnuboard5/php/api/docs/openapi.yaml`
- `/Users/neojins/workspace/gnuboard5/php/api/v1/Admin/**`
- `/Users/neojins/workspace/gnuboard5/php/tests/Admin/**`
- `/Users/neojins/workspace/gnuboard5/rust/g5-admin/src/features/system/**`
- `/Users/neojins/workspace/gnuboard5/rust/g5-admin/src-tauri/src/models/**`

## Resolved

1. OpenAPI YAML 파싱 오류 해결
   - 백틱이 포함된 `description` scalar를 quote 처리했습니다.
   - `/admin/faq-masters/{fm_id}/footer-image` 아래에 잘못 붙어 있던 중복 `delete` block(`adminDeleteFaq`)을 제거했습니다.
   - Python YAML duplicate-key 검사 기준으로 `OPENAPI_OK` 확인했습니다.

2. 게시판 목록 `gr_id` 필터 런타임 구현
   - PHP `AdminBoardService`가 `gr_id` query를 읽고 검증합니다.
   - PHP `AdminBoardRepository`가 실제 SQL `WHERE gr_id = :gr_id`를 적용합니다.
   - OpenAPI `POST /admin/boards` required 목록에 `gr_id`를 추가했습니다.

3. 회원 목록 `search_field` 런타임 구현
   - PHP `AdminMemberQueryService`가 `search_field`를 검증합니다.
   - PHP `AdminMemberRepository`가 `mb_id`, `mb_name`, `mb_nick`, `mb_email`, `all` 기준 검색을 지원합니다.
   - 엑셀 export 경로도 같은 필드를 지원하도록 맞췄습니다.

4. SMS 설정 프런트 검증 정합성 수정
   - Rust `AdminSmsConfigPage`는 submit 직전 변경 payload만 PHP 규칙으로 재검증합니다.
   - 빈 포트와 잘못된 회신번호는 API 호출 전에 필드 에러로 막습니다.
   - payload diff 계산 시 공백/포트 숫자 정규화를 적용했습니다.

5. SMS member-sync summary 타입 드리프트 수정
   - Rust `AdminSmsMemberSyncSummary` 필드를 TypeScript `number`로 강제 export 하도록 수정했습니다.
   - `ts-rs` export 경로를 `g5-admin/src/types`로 바로잡아 잘못된 상위 폴더 생성 문제도 함께 정리했습니다.

## Verification

- `vendor/bin/phpunit tests/Admin/Board tests/Admin/Member tests/Admin/Sms --colors=never`
  - `27 tests`, `96 assertions`, 모두 통과
- `pnpm test`
  - `9 files`, `27 tests`, 모두 통과
- `pnpm lint`
  - 통과
- `pnpm build`
  - 통과
- `cargo test export_ts_bindings --manifest-path /Users/neojins/workspace/gnuboard5/rust/g5-admin/src-tauri/Cargo.toml`
  - 통과
- `pnpm tauri build`
  - `.app`, `.dmg` 재생성 완료

## Notes

- 이번 수정은 감사 보고서 `2026-03-08-ADMIN_ENDPOINT_CONTRACT_AUDIT.md`의 P1/P2 지적 중 구현/문서/클라이언트 drift 항목을 우선 해소한 것입니다.
- 미구현 admin domain coverage 자체는 별도 개발 범위이며, 이번 remediation 범위에는 포함하지 않았습니다.
