# Gnuboard5 PHP REST API — Change History

> **규칙**: 모든 변경의 **Why**(사유)를 기록한다. Why 없는 커밋은 Revert 대상.

---

## 2026-08-12

### `QG-238` 관리자 게시판 생성 시 write table 수명주기 복구

- 게시판 생성 시 기존 정상 게시판의 write table 구조를 복제하고, 게시판이 하나도 없는 설치에서는 잠금 G5 5.6.32 스키마로 생성하도록 보강했습니다. 게시판 삭제 시 대응 write table도 함께 제거합니다.
  - Why: REST 생성이 `g5_board` 행만 저장해 생성 직후 복제·글쓰기에서 `g5_write_{bo_table}` 미존재 500이 발생했고, 삭제 후에는 반대로 고아 write table이 남았습니다.
- write table 복제·최초 생성·삭제 SQL 회귀 테스트와 공식 G5 로컬 생성→수정→복제→삭제 readback 인증을 추가했습니다.

## 2026-07-22

### `QG-237` 모노레포 이전 전 clean-clone 소스 폐쇄

- 전역 `*.sh` 및 `shop/` ignore 규칙에 가려졌던 품질 게이트·live inspect 스크립트와 관리자 쇼핑몰 Catalog 구현을 명시적으로 추적 대상으로 복구했습니다.
  - Why: 로컬 작업 폴더에서는 감사와 26개 `/admin/shop/*` 계약이 동작하지만 clean clone에는 일부 실행기와 Stock SMS 구현이 없어, 이관된 저장소가 같은 공급자 기능을 재현할 수 없었습니다.
- 그누보드 코어 `adm/`, `install/`, `lib/`, `plugin/`, 공개 `shop/` 제외 정책은 유지하며 API 커넥터 소스만 예외 처리했습니다.

### `QG-236` 17-domain live 왕복에서 발견된 strict DB 결함 수정

- 관리자 게시판 최소 생성 payload에 G5 strict MySQL DDL이 요구하는 빈 text 기본값을 보충하고, 명시적 사용자 입력은 그대로 우선하도록 payload builder 회귀 테스트를 추가했습니다.
  - Why: OpenAPI 필수 필드만 보낸 정상 생성 요청이 `bo_category_list` NOT NULL/no default 제약으로 500이 되어 생성 계약과 실제 DB 저장이 달랐습니다.
- 관리자 포인트 원장의 audit relation ID를 20자 이하의 prefix+난수 suffix로 바꾸고 길이·prefix·유일성 회귀 테스트를 추가했습니다.
  - Why: 기존 actor+`uniqid()` 조합이 레거시 `po_rel_id varchar(20)`을 넘어 정상 포인트 지급이 SQL 1406으로 실패했습니다.
- 수정본을 테스트 VM에 배포한 뒤 production Rust wire client의 관리자 17-domain 검증이 Apache origin에서 17/17 통과했고 writable 13-domain의 readback·cleanup과 외부 발송 0건을 확인했습니다. 공개 HTTPS의 PUT·PATCH·DELETE HTML 403은 ModSecurity CRS 911100 외부 정책 blocker로 분리했습니다.
- Verification: PHPUnit `870 tests` 실행 PASS, PHPStan level 8 PASS, PHP standard audit PASS, PHP Python 하네스 `44 tests` 및 Ruff·Mypy·ShellCheck PASS.

### `QG-235` API v1 루트 Apache 403 제거

- `api/.htaccess`에서 실제 소스 디렉터리와 겹치는 `/api/v1` 루트를 물리 디렉터리 예외보다 먼저 front controller로 전달합니다.
- rewrite 순서를 계약 테스트로 고정해 `/api/v1/`이 Apache HTML 403으로 되돌아가는 회귀를 차단합니다.
- Why: 정상 health와 인증 API가 동작해도 API 루트의 Apache 403은 VPSGuard 차단이나 전체 API 장애로 오인되므로, API 오류는 일관된 JSON 계약으로 응답해야 합니다.

### `QG-234` 신규 설치 신고 테이블 초기화와 SMS 미구성 응답 계약 보강

- 관리자 신고 목록·통계·상태 변경이 공개 신고 API 호출 여부와 무관하게 공용 `ReportSchemaRepository`에서 `g5_report` 테이블을 먼저 준비하도록 통합했습니다. 같은 DB 연결에서는 DDL을 한 번만 실행합니다.
  - Why: 신규 설치 직후 관리자가 신고 통계를 먼저 열면 테이블이 생성되지 않아 500이 발생했고, 공개 신고 API를 선행 호출해야만 정상화되는 숨은 순서 의존성이 있었습니다.
- SMS5 선택 테이블이 없는 사이트에서 목록 API가 반환하는 503을 6개 읽기 operation과 공용 `ServiceUnavailable` 응답으로 OpenAPI에 명시하고 계약 회귀 테스트를 추가했습니다.
  - Why: SMS 미설치는 지원되는 사이트 상태이지만 계약에 503이 없으면 생성 소비자가 이를 미문서 서버 장애로 오판하고 반복 호출합니다.
- 단일 인용 YAML 정규식의 `\\d`를 다시 이스케이프한 7개 필드를 교정하고, 모든 OpenAPI 패턴에서 이중 이스케이프 숫자 클래스를 금지하는 계약 테스트를 추가했습니다.
  - Why: PHP가 반환한 정상 MySQL 일시(`2026-07-22 10:36:17`)를 Rust wire validator가 거부해 회원메일 작업면이 실패했으며, 같은 오류가 회원 탈퇴·차단일과 메일 템플릿 일시 계약에도 잠복해 있었습니다.

## 2026-07-20

### `QG-233` GitHub-hosted 검증을 로컬 CI와 pre-push hard gate로 전환

- PHP 자동 `push`/`pull_request` Actions를 중지하고 `workflow_dispatch` fallback으로만 남겼습니다. `composer run ci:local`에 PHP 8.1 production lock 호환성, 감사 하네스 자체 품질, 전체 공급자 quality gate, PHP-Rust 통합 감사를 결합하고 `.githooks/pre-push`에서 같은 명령을 강제했습니다.
  - Why: GitHub Actions 월 2,000분 한도를 소진한 상태에서도 검증 강도를 낮추지 않고, 이미 구축된 감사 하네스를 개발 호스트에서 동일하게 재현해야 합니다.
- `composer run hooks:install`을 추가해 clone별 Git hook 설치를 명시적으로 재현할 수 있게 했고, hosted deploy는 외부 상태 변경 경계이므로 기존 수동 workflow로 분리 유지했습니다.
  - Why: 추적 파일만 추가하면 Git hook은 자동 활성화되지 않으므로 설치 명령과 현재 clone 설정이 함께 있어야 실제 푸시 차단이 작동합니다.
- PHP 8.1 runtime lock 검사에서 발견된 Symfony 8 전이 의존성을 `symfony/finder`·`symfony/yaml` 6.4 LTS로 고정했습니다.
  - Why: 루트 계약은 PHP 8.1+인데 production lock이 PHP 8.4+ 패키지를 포함하면 기존 runtime-compat job과 실제 PHP 8.1 배포가 모두 성립하지 않습니다.

## 2026-07-17

### `QG-232` 감사 하네스 Python 경계와 CI 품질 게이트 1차 정리

- Shell heredoc에 들어 있던 generated 관리자 schema 라벨 검사를 `scripts/check_generated_schema_labels.py`로 분리하고, 스키마 인벤토리 0건·깨진 section/field 구조·raw/FIXME 라벨을 fail-closed로 처리했습니다.
  - Why: 감사 정책이 Shell 내부 익명 Python 본문에 있으면 독립 단위 테스트·lint·type 검사와 재사용이 어렵고, scanner 0건도 정상처럼 지나갈 수 있습니다.
- Python 하네스 41개 회귀 테스트와 신규 감사기의 Ruff·Mypy, 변경된 Shell 진입점의 ShellCheck를 `composer run audit:harness`로 고정하고 PHP→Rust 통합 CI의 선행 hard gate로 편입했습니다.
  - Why: Python이 공급자 감사의 주 실행 언어인데도 코드 자체의 회귀·정적 품질이 CI 필수 조건이 아니면 하네스 결함이 API PASS를 만들 수 있습니다.
- 구조 감사에서 확인된 기존 `AdminBoardInputNormalizer` 379 LOC warning을 숨기지 않고 `WB-2026-014`로 등록해 owner, 만료일, 320 LOC 이하 분해 조건을 고정했습니다.
  - Why: 활성 warning에 budget이 없으면 감사 자체가 실패하고, 단지 이번 하네스 변경과 무관하다는 이유로 방치하면 fail-closed 거버넌스가 깨집니다.

## 2026-07-15

### `QG-231` protected 일반 게시판·공개 투표 계약 및 PHP provider hard gate 완결

- `/boards*`, `/files*`, `/polls*`의 protected 일반 게시판 `26` operation을 named·closed 요청과 구체 성공 응답으로 고정했습니다. 게시글 검색 enum·정렬 query, 게시글/댓글/파일/추천/투표 입력의 미선언 필드 거부, canonical/legacy 투표 별칭을 실제 Controller→Service→Repository 흐름과 맞췄습니다.
  - Why: 게시판 소비 시점이 미정이어도 provider 계약을 줄이거나 열린 상태로 두면 나중에 앱을 붙일 때 필드 누락과 별칭 드리프트를 다시 발견하게 됩니다. 26개 operation은 1차 소비 여부와 무관하게 축소 금지 protected hard gate로 유지해야 합니다.
- `PostPublicPresenter`, `FilePublicPresenter`, `CommentPresenter`를 도입해 raw DB/스토리지 row를 공개 DTO로 제한했습니다. 게시글의 내부 `wr_password`와 파일의 서버 절대경로 `path`가 API 응답에 노출될 수 있던 결함을 차단하고 타입을 OpenAPI와 일치시켰습니다.
  - Why: OpenAPI 필드가 정확해도 raw row를 그대로 반환하면 미문서 비밀·내부 경로가 섞여 소비 계약과 실제 응답이 달라집니다.
- G5 DDL과 `adm/poll_form.php`를 대조해 `po_etc`를 0/1 플래그가 아닌 최대 125자의 기타의견 질문 문자열로 복원했습니다. 빈 문자열일 때만 기타의견을 비활성화하고 공개 결과·투표 저장·관리자 요청 계약을 같은 의미로 맞췄습니다.
  - Why: 기존 구현과 OpenAPI가 함께 잘못된 타입을 공유해 하네스만으로는 통과할 수 있던 의미 오류였으며, 레거시 원본과의 독립 대조가 필요했습니다.
- provider 하네스는 `anyOf/oneOf`의 모든 허용 분기가 명시적 필수 필드를 가지는 경우를 required 계약으로 판정하되, 빈 분기가 하나라도 있으면 계속 실패합니다. field binding은 multipart binary 업로드의 PSR 파일 배열 증거만 `string/binary`로 인정하고 일반 string에는 허용하지 않습니다.
- 공식 quality gate에서 발견된 `slim/slim` 1건과 `symfony/yaml` 3건의 보안 advisory를 닫기 위해 lockfile을 Slim `4.15.2`, Symfony Yaml `8.1.1`과 호환 전이 의존성으로 최소 갱신했습니다.
  - Why: API 계약이 모두 통과해도 알려진 의존성 취약점이 남으면 배포 품질 게이트가 실패하므로 완료로 판정할 수 없습니다.
- 결과: 전체 OpenAPI `312`, active `189`, protected `26`은 유지했습니다. provider blocking은 `34 -> 0`, field binding은 `10 -> 0`으로 닫혔고 audited `215/215`, provider/field `certified=true`입니다. deferred `17`, excluded shop `29`는 별도 증거로 보존합니다. live provider identity·실제 write/readback과 Rust 소비 aggregate는 이 PHP 로컬 인증에 포함하지 않습니다.
- Verification:
  - PHPUnit (`861 tests`, `6592 assertions`, `5 skipped`)
  - PHPUnit coverage (`54.10%`, `13495/24944` lines)
  - service coverage gate (`82.15%`, `7341/8936` statements)
  - Python 감사 하네스 단위 테스트 (`37 tests`)
  - `composer audit` (`PASS`, advisories 0)
  - `composer run analyse` (`PASS`, PHPStan level 8)
  - `composer run contract:manifest`, `composer run audit:runtime-routes`, `composer run audit:openapi-provider`, `composer run audit:openapi-field-bindings` (`PASS`)

### `QG-230` 잔여 관리자·세션 인증 요청·저장·응답 계약 완결

- `/admin/polls*`, `/admin/popular*`, `/admin/write-count/stats`, `/admin/push/send`, `/admin/reports*`, `/admin/visits`, `/admin/qa`, `/admin/schema*`와 `/auth/login|refresh|logout`의 요청·응답을 named·closed/구체 schema로 고정했습니다. 관리자 투표는 표준/레거시 선택지를 보존하고 raw 결과를 27개 공개 필드로 제한했으며, push 대상·신고 enum·방문 삭제 범위·QA ID·schema domain을 실제 runtime에서 검증합니다.
  - Why: 관리자 1차 소비 범위의 마지막 열린 body와 raw row를 남기면 앱이 모든 필드를 생성·소비하는지 하네스가 판정할 수 없고, 인증 body의 미선언 입력도 세션 계층에 흘러갑니다.
- 공개 Board DTO와 관리자 Board DTO를 분리해 일반 게시판의 작은 공개 계약을 도입해도 관리자 96개 필드 계약이 축소되지 않도록 했습니다. SMS 비밀 설정 필드는 `writeOnly`로 고정했습니다.
- 결과: 전체 OpenAPI `312`, active `189`, protected `26`은 유지했습니다. provider blocking은 `77 -> 34`, field binding은 `19 -> 10`으로 줄었으며 잔여는 `QG-231`에서 닫았습니다.

### `QG-229` 관리자 권한·환경설정 요청·저장·응답 계약 완결

- `/admin/auth*`의 권한 조회·저장 계약을 named·closed schema로 고정하고, canonical `auths[]`와 레거시 `au_menu/au_auth` 입력을 명시적으로 분리했습니다. 회원 등록일 검색 조건은 실제 `mb_datetime` 조회에 결합했고, 회원별 권한 행을 페이지 단위로 유실하지 않도록 distinct 회원 페이지 조회와 권한 상세 조회를 분리했습니다.
  - Why: 열린 권한 body와 페이지 SQL의 row 단위 제한은 미선언 입력을 허용하고 한 회원의 복수 메뉴 권한을 잘라낼 수 있습니다. 입력 별칭·필드 타입·날짜 조건·저장 결과를 같은 계약으로 고정해야 관리자 소비 누락을 판정할 수 있습니다.
- `/admin/config`는 수정 가능한 canonical `153`개 필드를 모두 named·closed request schema로 선언하고 미선언 입력을 400으로 거부합니다. 응답은 안전한 `140`개 필드만 반환하며 인증·소셜·SMS 비밀 `13`개와 미지 DB 컬럼은 Presenter에서 차단합니다. 정수·플래그·이메일·CSV·레거시 포트 입력 의미를 실제 정규화와 일치시켰습니다.
  - Why: 기존 설정 API는 무필드 열린 body와 public `ConfigResponse`를 재사용하고 raw `SELECT *` row를 반환해, 153개 저장 필드의 누락과 비밀 컬럼 노출을 동시에 검출할 수 없었습니다.
- field binding 하네스는 정적 class constant `foreach` 확장 한도를 `512`개로 높여 153개 canonical 설정 목록을 동적 입력으로 오판하지 않게 했고, `oneOf/anyOf`의 마지막 분기만 남기지 않고 각 타입·enum 분기를 모두 검증하도록 보강했습니다.
- 결과: 전체 OpenAPI `312`, active `189`, protected 일반 게시판 `26`은 유지했습니다. 관리자 권한 `3/3`, 환경설정 `2/2` operation은 field binding을 통과했습니다. 전체 provider 적색 기준선은 `86 -> 77`, field binding은 `22 -> 19`이며 `199 passed / 16 failed`, `certified=false`를 유지합니다.
- Verification:
  - 집중 PHPUnit (`43 tests`, `178 assertions`) 및 하네스 PHPUnit (`15 tests`, `309 assertions`)
  - `composer run contract:manifest`, `composer run audit:runtime-routes` (`PASS`)
  - `composer run audit:openapi-provider` (expected FAIL: blocking `77`, deferred `17`, excluded `29`)
  - `composer run audit:openapi-field-bindings` (expected FAIL: `19`, `199 passed / 16 failed`)

### `QG-228` 관리자 콘텐츠·FAQ 요청·저장·응답 계약 완결

- `/admin/contents*`, `/admin/faqs*`, `/admin/faq-masters*`의 JSON·multipart 요청을 named·closed schema로 고정하고 생성·수정·이미지 업로드/삭제 성공 응답을 실제 상세·이미지 DTO로 교체했습니다. FAQ 이미지의 `file|image|header_image|fm_himg`, `file|image|footer_image|fm_timg` 단일 파일·단일 배열 호환 형태는 축소 없이 보존했습니다.
  - Why: 익명·열린 요청과 범용 응답은 활성 관리자 소비자가 콘텐츠 10개 필드, FAQ 정렬, 마스터 HTML, 이미지 메타를 빠짐없이 생성·소비하는지 판정할 수 없습니다. 특히 정규화 결과를 저장하지 않거나 raw DB row를 반환하면 OpenAPI가 맞아 보여도 실제 저장·응답은 드리프트합니다.
- `AdminContentPayloadNormalizer`와 `AdminFaq*PayloadNormalizer`가 요청 화이트리스트, 필수 문자열, 정수·enum·기본값을 검증합니다. 콘텐츠 raw `SELECT *`는 공개 10개 컬럼 조회와 Presenter로 제한했고 FAQ 생성이 정규화 결과를 버리고 원본 payload를 저장하던 결함을 수정했습니다. 콘텐츠·FAQ Presenter는 DB 타입과 nullable 마스터 제목을 응답 계약으로 정규화합니다.
- 결과: 전체 OpenAPI `312`, active `189`, protected 일반 게시판 `26`은 유지했습니다. 콘텐츠·FAQ·FAQ 마스터 `20/20` operation은 field binding을 통과하고 provider finding은 `31`건 제거되었습니다. 전체 provider 적색 기준선은 `117 -> 86`, field binding은 `27 -> 22`이며 `196 passed / 19 failed`, `certified=false`를 유지합니다.
- Verification:
  - `vendor/bin/phpunit` (`824 tests`, `6220 assertions`, `6 skipped`)
  - `composer run analyse` (`PASS`, PHPStan level 8)
  - 집중 PHPUnit (`19 tests`, `230 assertions`)
  - 변경 PHP `13`개 `php-cs-fixer` (`PASS`)
  - `composer run contract:check`, `composer run schema:check`, `composer run audit:runtime-routes` (`PASS`)
  - `composer run audit:openapi-provider` (expected FAIL: blocking `86`, deferred `17`, excluded `29`)
  - `composer run audit:openapi-field-bindings` (expected FAIL: `22`, `196 passed / 19 failed`)

### `QG-227` 관리자 포인트 원장·액션 계약 완결

- `/admin/points*`의 통합 `action`, 삭제, 지급·차감·만료 요청 5개를 named·closed schema로 고정하고 각 성공 응답을 포인트 증감·삭제 집계·만료 집계별 구체 schema로 교체했습니다. 통합 action의 `grant|deduct`는 `mb_id/point`를 조건부 필수로 요구하고 `expire`는 `base_date`만 허용합니다.
  - Why: 통합/레거시 경로가 익명 요청과 `MessageResponse`를 사용하면 활성 Tauri가 이미 소비하는 전후 잔액·삭제 건수·만료 집계를 생성 계약에서 확인할 수 없습니다. 열린 body는 내부 원장 출처 필드 주입이나 잘못된 숫자/날짜의 묵시적 변환도 허용합니다.
- `AdminPointInputNormalizer`가 action·검색 enum, 증감/삭제/만료 화이트리스트, 정수 포인트·원장 ID, 유효한 달력 날짜를 검증합니다. 목록 SQL에 기존 OpenAPI 필드였지만 누락됐던 `po_use_point`, `po_expired`, `po_expire_date`를 복원하고 `AdminPointPresenter`가 전체 12개 원장 필드와 합계·만료 결과 타입을 정규화합니다.
- 결과: 전체 OpenAPI `312`, active `189`, protected 일반 게시판 `26`은 유지했습니다. 포인트 `7/7` operation은 field binding을 통과하고 provider finding은 `15`건 제거되었습니다. 전체 provider 적색 기준선은 `132 -> 117`, field binding은 `29 -> 27`이며 `191 passed / 24 failed`, `certified=false`를 유지합니다.
- Verification:
  - `vendor/bin/phpunit` (`817 tests`, `6073 assertions`, `8 skipped`)
  - `composer run analyse` (`PASS`, PHPStan level 8)
  - 집중 PHPUnit (`37 tests`, `190 assertions`, `1 skipped`)
  - 변경 PHP `7`개 `php-cs-fixer --dry-run --diff` (`PASS`)
  - `composer run contract:check`, `./scripts/docs-check.sh`
  - `composer run contract:manifest`, `composer run audit:runtime-routes` (`PASS`)
  - `composer run audit:openapi-provider` (expected FAIL: blocking `117`, deferred `17`, excluded `29`)
  - `composer run audit:openapi-field-bindings` (expected FAIL: `27`, `191 passed / 24 failed`)

### `QG-226` 관리자 메뉴 표준·레거시 계약 완결

- `/admin/menus*`의 생성·수정·재정렬 요청을 named·closed schema로 고정하고 생성·수정·표준/레거시 재정렬의 범용 성공 응답을 상세·재정렬 구체 schema로 교체했습니다. 표준 `PATCH /admin/menus`와 레거시 `PATCH /admin/menus/reorder`는 같은 요청·응답 계약으로 유지했습니다.
  - Why: 메뉴 수정이 `additionalProperties: true`이고 재정렬 항목이 required/closed가 아니면 소비자가 보낸 필드가 실제 저장되지 않거나 잘못된 항목이 조용히 버려집니다. 또한 기존 OpenAPI는 사용 플래그를 boolean으로 선언했지만 활성 Tauri 소비자는 정수 `0|1`을 보내므로 canonical 타입을 실제 소비·DB와 맞춰야 합니다.
- `AdminMenuPayloadNormalizer`가 생성 기본값(`_self`, `0`, `1`, `1`), 수정 화이트리스트, 정수 플래그 enum, 재정렬의 `orders[].me_id/me_order`를 검증합니다. `AdminMenuPresenter`는 DB 문자열 숫자를 8개 공개 메뉴 필드의 계약 타입으로 정규화합니다.
- 결과: 전체 OpenAPI `312`, active `189`, protected 일반 게시판 `26`은 유지했습니다. 메뉴 `7/7` operation은 field binding을 통과하고 provider finding은 `15`건 제거되었습니다. 전체 provider 적색 기준선은 `147 -> 132`, field binding은 `31 -> 29`이며 `189 passed / 26 failed`, `certified=false`를 유지합니다.
- Verification:
  - `vendor/bin/phpunit` (`811 tests`, `5995 assertions`, `8 skipped`)
  - `composer run analyse` (`PASS`, PHPStan level 8)
  - 집중 PHPUnit (`40 tests`, `181 assertions`, `1 skipped`)
  - 변경 PHP `6`개 `php-cs-fixer --dry-run --diff` (`PASS`)
  - `composer run contract:check`, `./scripts/docs-check.sh`
  - `composer run contract:manifest`, `composer run audit:runtime-routes` (`PASS`)
  - `composer run audit:openapi-provider` (expected FAIL: blocking `132`, deferred `17`, excluded `29`)
  - `composer run audit:openapi-field-bindings` (expected FAIL: `29`, `189 passed / 26 failed`)

### `QG-225` 관리자 회원 입력·저장·응답 계약 완결

- `/admin/members*`의 수정·레벨·아이콘·이미지 요청을 named·closed schema로 고정하고 목록·상세·수정·레벨·미디어 성공 응답을 관리자 회원 전용 구체 schema로 교체했습니다. 정렬 query의 기본값/enum과 multipart의 기존 `file|icon|mb_icon`, `file|image|mb_img` 별칭은 축소 없이 보존했습니다.
  - Why: 관리자 회원 조회가 `SELECT *` row를 그대로 반환하고 수정 body가 열린 객체이면 비밀번호 해시·인증 토큰 같은 비밀 컬럼이 응답에 섞이거나 내부 동의일자/로그 필드가 외부 입력으로 주입될 수 있습니다. 외부 입력 화이트리스트, 저장 가능 필드, 안전한 응답 DTO를 한 계약으로 고정해야 합니다.
- `AdminMemberPresenter`가 `g5_member` row를 공개 57개 필드로 제한하고 숫자·우편번호 타입을 정규화합니다. `mb_password`, `mb_email_certify2`, `mb_lost_certify`, `mb_dupinfo`는 응답에서 차단하며 비밀번호 입력은 `writeOnly`입니다. 미선언 수정 필드는 400으로 거부하고 `mb_open` 변경은 `mb_open_date`와 동의 로그까지 같은 저장 흐름에서 갱신합니다.
- field binding 하네스는 request 배열에 서버가 대입한 파생 필드를 HTTP 입력으로 오판하지 않되, request alias에서 파생된 대입은 원래 입력 계보를 유지하도록 회귀를 추가했습니다.
- 결과: 전체 OpenAPI `312`, active `189`, protected 일반 게시판 `26`은 유지했습니다. 회원 `10/10` operation은 field binding을 통과하고 provider finding은 `15`건 제거되었습니다. 전체 provider 적색 기준선은 `162 -> 147`, field binding은 `35 -> 31`이며 `187 passed / 28 failed`, `certified=false`를 유지합니다.
- Verification:
  - `vendor/bin/phpunit` (`803 tests`, `5935 assertions`, `8 skipped`)
  - `composer run analyse` (`PASS`, PHPStan level 8)
  - 집중 PHPUnit (`34 tests`, `454 assertions`, `1 skipped`)
  - 변경 PHP `10`개 `php-cs-fixer --dry-run --diff` (`PASS`)
  - `composer run contract:check`, `./scripts/docs-check.sh`
  - `composer run contract:manifest`, `composer run audit:runtime-routes` (`PASS`)
  - `composer run audit:openapi-provider` (expected FAIL: blocking `147`, deferred `17`, excluded `29`)
  - `composer run audit:openapi-field-bindings` (expected FAIL: `31`, `187 passed / 28 failed`)

### `QG-224` 관리자 메일 요청·저장·응답 계약 완결

- `/admin/mails*`와 레거시 `/admin/mail-tests`의 쓰기 `5`개를 템플릿·발송·테스트별 named·closed request schema로 고정하고, body 성공 응답 `8`개를 목록·상세·수신자·발송 결과별 구체 schema로 교체했습니다. canonical `ma_subject/ma_content`와 기존 `subject/content` 별칭, 두 테스트 경로는 축소 없이 보존했습니다.
  - Why: 메일 템플릿 생성·발송 API가 익명 요청과 `MessageResponse`에 머물면 소비자는 `ma_last_option`, 수신자 DTO, 발송 카운트와 dry-run 결과를 생성할 수 없고 미선언 입력도 저장 계층까지 흘러갈 수 있습니다. 요청 필드와 실제 템플릿/수신자 저장·조회·응답을 한 계약으로 닫아야 합니다.
- `AdminMailPresenter`가 템플릿·상세·수신자 DB row를 정확한 공개 필드와 타입으로 제한합니다. 템플릿/발송/테스트 runtime은 미선언 필드를 400으로 거부하고, 발송 요청의 13개 필드와 테스트 요청의 4개 필드를 Controller→Service→Repository 흐름에 결합했습니다.
- 결과: 전체 OpenAPI `312`, active `189`, protected 일반 게시판 `26`은 유지했습니다. 메일 `8/8` operation은 field binding을 통과하고 provider finding은 `20`건 제거되었습니다. 전체 provider 적색 기준선은 `182 -> 162`, field binding은 `40 -> 35`이며 `183 passed / 32 failed`, `certified=false`를 유지합니다.
- Verification:
  - `vendor/bin/phpunit` (`797 tests`, `5815 assertions`, `8 skipped`)
  - `composer run analyse` (`PASS`, PHPStan level 8)
  - 집중 PHPUnit (`20 tests`, `221 assertions`)
  - `composer run contract:manifest`, `composer run audit:runtime-routes` (`PASS`)
  - `composer run audit:openapi-provider` (expected FAIL: blocking `162`, deferred `17`, excluded `29`)
  - `composer run audit:openapi-field-bindings` (expected FAIL: `35`, `183 passed / 32 failed`)

### `QG-223` 관리자 게시판 그룹 표준·레거시 계약 완결

- 표준 `/admin/board-groups*`와 레거시 alias `/admin/groups*`를 축소 없이 같은 named·closed 요청/구체 응답 schema로 고정했습니다. 생성·수정은 `gr_id/gr_subject/gr_admin/gr_device/gr_use_access`, 회원 추가는 `mb_id`, 회원 목록은 `page/per_page/search`를 실제 구현과 일치시켰습니다.
  - Why: alias 두 벌 중 하나만 닫거나 optional 필드와 query를 계약에서 빼면 관리자 소비자가 같은 서비스의 일부 기능만 생성하게 됩니다. 두 경로가 같은 Controller→Service→Repository를 공유한다는 사실을 계약과 하네스가 모두 증명해야 합니다.
- `AdminGroupPresenter`가 `SELECT *` 결과를 공개 5개 그룹 필드로 제한하고 DB 문자열 숫자와 LEFT JOIN nullable 회원 필드를 계약 타입으로 정규화합니다. 쓰기 runtime은 미선언 필드를 거부하고 `gr_device=both|pc|mobile`, `gr_use_access=0|1`을 강제합니다.
- 결과: 전체 OpenAPI `312`, active `189`, protected 일반 게시판 `26`은 유지했습니다. 그룹 표준·레거시 `16/16` operation은 field binding을 통과하고 provider finding은 `23`건 제거되었습니다. 전체 provider 적색 기준선은 `205 -> 182`, field binding은 `47 -> 40`이며 `180 passed / 35 failed`, `certified=false`를 유지합니다.
- Verification:
  - `vendor/bin/phpunit` (`787 tests`, `5645 assertions`, `8 skipped`)
  - `composer run analyse` (`PASS`, PHPStan level 8)
  - 변경 PHP `7`개 `php-cs-fixer --dry-run --diff` (`PASS`)
  - 집중 PHPUnit (`17 tests`, `142 assertions`)
  - `composer run contract:manifest`, `composer run audit:runtime-routes` (`PASS`)
  - `composer run audit:openapi-provider` (expected FAIL: blocking `182`, deferred `17`, excluded `29`)
  - `composer run audit:openapi-field-bindings` (expected FAIL: `40`, `180 passed / 35 failed`)

### `QG-222` 관리자 레이아웃 요청·응답 계약 완결

- `/admin/layouts*`의 JSON 요청 `5`개를 저장·위젯 생성·부분 수정·재정렬별 named·closed schema로 고정하고, body 성공 응답 `8`개를 목록/상세 named schema로 교체했습니다. `AdminLayoutPresenter`가 DB 문자열 숫자를 공개 계약의 integer로 정규화하면서 활성 관리자 소비자가 사용하는 `sl_schema` JSON 문자열과 `sl_active` 0/1 의미를 보존합니다.
  - Why: 익명 widget object와 원시 DB row를 그대로 노출하면 생성 소비자는 `widget_id/type/config/style` 필드를 만들 수 없고 PDO 반환 타입에 따라 같은 응답의 숫자 타입이 달라질 수 있습니다. 레이아웃 저장 입력부터 `sl_*` 응답까지 한 계약으로 고정해야 필드 누락을 검출할 수 있습니다.
- 위젯 부분 수정은 `type/title/order`를 실제 계약 타입으로 정규화합니다. field binding 하네스는 PHP associative array가 JSON object로 직렬화되는 언어 경계를 인식하되 string 같은 비호환 타입은 계속 실패하도록 회귀를 추가했습니다.
- 결과: 전체 OpenAPI `312`, active `189`, protected 일반 게시판 `26`은 유지했습니다. 관리자 레이아웃 `8/8` operation은 field binding을 통과하고 provider finding은 `20`건 제거되었습니다. 전체 provider 적색 기준선은 `225 -> 205`, field binding은 `51 -> 47`이며 `173 passed / 42 failed`, `certified=false`를 유지합니다.
- Verification:
  - `vendor/bin/phpunit` (`779 tests`, `5544 assertions`, `8 skipped`)
  - `composer run analyse` (`PASS`, PHPStan level 8)
  - `composer run test:coverage:ci` + service coverage check (`PASS`, service `81.10%`)
  - 변경 PHP `7`개 `php-cs-fixer --dry-run --diff` (`PASS`)
  - 집중 PHPUnit (`46 tests`, `393 assertions`)
  - `composer run contract:manifest`, `composer run audit:runtime-routes` (`PASS`)
  - `composer run contract:check`, `./scripts/docs-check.sh`
  - `composer run audit:openapi-provider` (expected FAIL: blocking `205`, deferred `17`, excluded `29`)
  - `composer run audit:openapi-field-bindings` (expected FAIL: `47`, `173 passed / 42 failed`)

### `QG-221` 관리자 SMS 성공 응답 계약 완결

- `/admin/sms*`에서 body를 반환하는 성공 응답 `33`개를 설정·회원 동기화·템플릿·연락처·발송 이력별 named schema로 고정했습니다. 런타임 Presenter `4`개가 DB 문자열 숫자, 0/1 플래그, nullable 문자열, 중첩 중복 발송 요약을 공개 계약 타입으로 정규화합니다.
  - Why: 요청 계약만 닫혀 있어도 성공 응답이 `MessageResponse`이면 생성 소비자는 실제 필드명·타입을 알 수 없고, DB driver가 반환한 문자열 타입이 소비자 DTO까지 새어 나갈 수 있습니다. PHP 런타임과 활성 Rust 관리자 모델이 같은 필드 구조를 사용하도록 provider 응답을 구체화해야 합니다.
- `fg_member`, `bk_receipt` canonical 요청 타입을 활성 관리자 소비자가 실제 전송하는 정수 `0|1`로 맞췄습니다. SMS 계약 테스트는 body 성공 응답 전체와 핵심 DTO의 closed/required 필드를 전수 고정합니다.
- field binding 하네스가 `ApiResponse::envelope()`의 custom meta 인자와 `self/static/parent` 정적 Presenter 호출의 중첩 반환 필드를 추적하도록 보강하고, 해당 오탐 회귀 테스트를 추가했습니다.
- 결과: 전체 OpenAPI `312`, active `189`, protected 일반 게시판 `26`은 유지했습니다. SMS `37/37` operation은 field binding을 통과하며 provider finding은 `32`건 제거되었습니다. 전체 provider 적색 기준선은 `257 -> 225`, field binding은 `51`건과 `170 passed / 45 failed`, `certified=false`를 유지합니다.
- Verification:
  - `vendor/bin/phpunit` (`773 tests`, `5438 assertions`, `8 skipped`)
  - `python3 -m unittest discover -s scripts/tests -p 'test_*.py' -v` (`35 tests`)
  - `composer run analyse` (`PASS`, PHPStan level 8)
  - `composer run test:coverage:ci` + service coverage check (`PASS`, service `81.16%`)
  - 변경 PHP `15`개 `php-cs-fixer --dry-run --diff` (`PASS`)
  - `composer run contract:check`, `composer run schema:check`, `composer run audit:schema-contract`, `./scripts/docs-check.sh`
  - `./scripts/check_hardcoding.sh`, `composer run test:plugin:isolation`
  - `composer run audit:runtime-routes` (`PASS`, active/protected mismatch `0`)
  - `composer run audit:openapi-provider` (expected FAIL: blocking `225`, deferred `17`, excluded `29`)
  - `composer run audit:openapi-field-bindings` (expected FAIL: `51`, `170 passed / 45 failed`)
  - `composer run audit:auto` (expected FAIL: 위 provider/field 적색, 미배포 live provider의 기존 board boolean drift `2`건, 별도 Rust 소비 aggregate 적색)
  - `composer audit --locked` (기존 advisory `4`건 — Slim `1` medium, Symfony YAML `3` low)

## 2026-07-14

### `QG-220` 관리자 시스템 계약·필드 파이프라인 완결

- `/admin/system*`의 쓰기 요청 `8`개를 named·closed schema로 고정하고 성공 응답 `22`개를 실제 자료형에 맞는 named schema로 교체했습니다. 권한은 실제 flat row, 투표는 목록 요약/상세 전체 필드, QA·테마·브라우저 캡·메일은 각 runtime 응답 형태로 정규화했습니다.
  - Why: 익명·범용 계약은 operation 존재만 보장하고 필드 생성·저장·반환 누락을 감춥니다. 실제 PHP와 활성 Rust 소비자가 같은 필드명·타입·응답 구조를 사용하도록 provider 계약을 먼저 닫아야 합니다.
- QA 설정에서 레거시 `qa_1_subj..qa_5_subj`, `qa_1..qa_5` 10개 필드를 요청·초기 INSERT·조회 응답까지 복원했습니다. 권한·투표·QA·메일·테마·브라우저 캡은 미선언 입력을 400으로 거부하고, 브라우저 캡 `rows` query 별칭은 body 우선의 deprecated 호환 계약으로 보존했습니다.
- field binding 하네스는 선언된 scalar를 분해한 내부 값이 가짜 request 하위 필드로 확장되지 않게 보강했습니다. DB가 없는 phpinfo/파일 정리 operation은 endpoint별 필수 계층 정책으로 Controller→Service 증거를 요구하며, 존재하지 않는 Repository를 강제하지 않습니다.
- 결과: 전체 OpenAPI `312`, active `189`, protected 일반 게시판 `26`은 유지했습니다. 관리자 시스템 `32/32` operation은 field binding을 통과하고 provider finding은 `0`입니다. 전체 provider 적색 기준선은 `298 -> 257`, field binding은 `67 -> 51`이며 `170 passed / 45 failed`, `certified=false`입니다. 잔여 적색과 live provider write/readback을 닫기 전에는 전체 API 완료가 아닙니다.
- Verification:
  - `vendor/bin/phpunit` (`770 tests`, `5069 assertions`, `8 skipped`)
  - `python3 -m unittest discover -s scripts/tests -p 'test_*.py' -v` (`35 tests`)
  - `composer run analyse` (`PASS`, PHPStan level 8)
  - `composer run test:coverage:ci` + service coverage check (`PASS`, service `81.06%`)
  - 변경 PHP `13`개 `php-cs-fixer --dry-run --diff` (`PASS`)
  - `composer run contract:check`, `composer run schema:check`, `./scripts/docs-check.sh`
  - `composer run audit:runtime-routes` (`PASS`, active/protected mismatch `0`)
  - `composer run audit:openapi-provider` (expected FAIL: blocking `257`, deferred `17`, excluded `29`)
  - `composer run audit:openapi-field-bindings` (expected FAIL: `51`, `170 passed / 45 failed`)
  - `composer audit` (expected FAIL: 기존 advisory `4`건 — Slim `1` medium, Symfony YAML `3` low)

### `QG-219` 관리자 게시판 전 필드 계약과 복사 파이프라인 완결

- `/admin/boards*` 쓰기 요청을 named·closed schema로 고정하고, 생성·수정 요청을 관리자 게시판 generated schema와 exact 비교하도록 계약 테스트를 강화했습니다. runtime mutable field를 `61 -> 92`로 맞추고 응답은 전체 `96`개 필드를 OpenAPI 타입으로 정규화하며, 미선언 입력·잘못된 enum/type을 400으로 거부합니다.
  - Why: OpenAPI에 필드가 있어도 Repository whitelist가 받지 않거나 DB 문자열을 boolean으로 그대로 반환하면 생성된 소비자가 계약을 온전히 소비할 수 없습니다. 계약·검증·저장·응답을 같은 필드 집합으로 증명해야 누락을 탐지할 수 있습니다.
- 게시판 복사의 `copy_posts`를 Service→Repository→DB/file store까지 전달했습니다. 활성화 시 게시글, 공지·카운트, 첨부 메타데이터와 실제 첨부 파일 트리를 함께 복사하고 DB 실패 시 생성 파일을 정리합니다. 최근 게시물 일괄 삭제도 closed `bn_ids` 요청으로 고정했습니다.
- field binding 하네스가 class constant field whitelist와 PHP-DI interface→concrete autowire binding을 추적하도록 보강했습니다. YAML merge anchor를 사용하는 계약 manifest도 duplicate-key guard를 유지한 채 해석하며, `bo_use_secret`을 credential 오탐에서 제외하되 실제 `api_secret` 검출은 유지합니다. 대형 graph 감사 entrypoint의 memory limit은 `512M`으로 고정했습니다.
- 결과: 전체 OpenAPI `312`, active `189`, protected 일반 게시판 `26`은 유지했습니다. 관리자 게시판 `7/7` operation이 field binding을 통과합니다. provider 적색 기준선은 `311 -> 298`, field binding은 `117 -> 67`이며 `157 passed / 58 failed`, `certified=false`입니다. 잔여 적색과 live provider write/readback을 닫기 전에는 전체 API 완료가 아닙니다.
- Verification:
  - `vendor/bin/phpunit` (`765 tests`, `4936 assertions`, `10 skipped`)
  - `python3 -m unittest discover -s scripts/tests -p 'test_*.py' -v` (`35 tests`)
  - `composer run analyse` (`PASS`, PHPStan level 8)
  - `composer run test:coverage:ci` + service coverage check (`PASS`, service `80.96%`)
  - `composer run contract:check`, `composer run schema:check`, `./scripts/docs-check.sh`
  - `composer run audit:runtime-routes` (`PASS`, active/protected mismatch `0`)
  - `composer run audit:openapi-provider` (expected FAIL: blocking `298`, deferred `17`, excluded `29`)
  - `composer run audit:openapi-field-bindings` (expected FAIL: `67`, `157 passed / 58 failed`)

### `QG-218` 관리자 SMS 요청 계약과 중첩·multipart field binding 완결

- field binding 하네스가 배열 요소 계보(`field[]`, `field[].name`), 여러 request media type의 합집합, 숫자 index, 업로드 파일/stream 소비를 추적하도록 보강했습니다. 일반 함수의 문자열 인자를 request 하위 field로 오판하던 helper 추정을 제거하고, `is_*` 검증과 SMS boolean 정규화의 타입 증거를 반영했습니다.
  - Why: `str_starts_with($phone, '02')`를 `phone.02`로 만들거나 JSON만 보고 multipart 필드를 누락하면 존재하지 않는 OpenAPI 필드를 추가하게 됩니다. 반대로 배열 요소와 업로드 파일의 실제 소비를 놓치면 SMS import·발송 대상 누락을 검출할 수 없습니다.
- SMS request body `18`개 media를 `16`개 named·closed request schema로 고정했습니다. template/contact batch, import, message의 기존 관리자 별칭(`fo_no`, `bk_no`, `upload_bg_no`, `confirm`, `wr_message`, `fo_no`, `wr_reply`, `bk_*`)은 제거하지 않고 deprecated 호환 필드로 계약에 보존했습니다. SMS 조회 `6`개 operation의 레거시 query 별칭도 문서화했습니다.
- runtime은 SMS 쓰기 payload와 중첩 `contacts[]`/`manual_targets[]`의 미선언 필드를 400으로 거부합니다. multipart body를 실제 parsed body에서 읽도록 연결하고, 계약에만 있고 저장에서 무시되던 import `memo`/`receipt`를 DB insert까지 전달하도록 수정했습니다.
- 결과: 전체 OpenAPI `312`, active `189`, protected 일반 게시판 `26`은 유지했습니다. SMS `37/37` operation이 field binding을 통과하고 SMS request provider finding은 `0`입니다. provider 적색 기준선은 `350 -> 311`(active `275`, protected `34`, 공통 `2`), field binding은 `171 -> 117`이며 `127 passed / 88 failed`, `certified=false`입니다. 잔여 적색을 닫기 전에는 전체 API 완료가 아닙니다.
- Verification:
  - `vendor/bin/phpunit` (`758 tests`, `4864 assertions`, `11 skipped`)
  - `python3 -m unittest discover -s scripts/tests -p 'test_*.py' -v` (`33 tests`)
  - `composer run analyse` (`PASS`, PHPStan level 8)
  - `composer run test:coverage:ci` + service coverage check (`PASS`, service `80.91%`)
  - `composer run contract:check`, `composer run schema:check`, `./scripts/docs-check.sh`
  - `composer run audit:runtime-routes` (`PASS`, active/protected mismatch `0`)
  - `composer run audit:openapi-provider` (expected FAIL: blocking `311`, deferred `17`, excluded `29`)
  - `composer run audit:openapi-field-bindings` (expected FAIL: `117`, `127 passed / 88 failed`)

### `QG-217` request field 계보 오탐 제거와 관리자 팝업 계약 완결

- field binding 하네스가 조립 배열의 모든 key/value taint를 서로 곱해 `body:a.b` 같은 가짜 입력을 만들던 문제를 key별 member 계보로 분리했습니다. 해석 가능한 메서드 호출에는 legacy helper 추정을 중복 적용하지 않고, literal associative/list `foreach`, 변수 array key, `array_keys()`, 변수 기반 enum 목록을 정적으로 전개하도록 보강했습니다.
  - Why: analyzer 오탐을 OpenAPI 필드 누락으로 고치면 존재하지 않는 request 필드를 공개 계약에 추가하게 됩니다. 반복 정규화 코드도 실제 필드별 입력→검증 흐름으로 증명해야 남은 적색을 진짜 provider 결함으로 사용할 수 있습니다.
- `/admin/popups*`와 `/admin/system/popups*`의 쓰기 `4`개를 공통 named·closed `PopupCreateRequest`/`PopupUpdateRequest`로 고정하고, 목록·상세·생성·수정 성공 응답 `6`개를 실제 `PopupListResponse`/`PopupDetailResponse`로 교정했습니다. 시스템 팝업의 `nw_division`/`nw_device` enum 검증과 양쪽 구현의 미선언 필드 거부를 추가해 `additionalProperties: false`를 runtime에서도 지킵니다.
- 결과: 전체 OpenAPI `312`, active `189`, protected 일반 게시판 `26`을 유지했습니다. 팝업 관리자 API `10/10`은 field binding을 통과하고 runtime active/protected route·security·response mismatch는 `0`입니다. provider 적색 기준선은 `366 -> 350`(active `316`, protected `34`), field binding은 `282 -> 171`이며 `108 passed / 107 failed`, `certified=false`입니다. 응답 필수 필드 미결합은 계속 `0`입니다.
- Verification:
  - `vendor/bin/phpunit` (`755 tests`, `4847 assertions`, `11 skipped`)
  - `python3 -m unittest discover -s scripts/tests -p 'test_*.py' -v` (`33 tests`)
  - `composer run analyse` (`PASS`, PHPStan level 8)
  - `composer run test:coverage:ci` + service coverage check (`PASS`, service `80.78%`)
  - `composer run contract:check`, `composer run schema:check`, `./scripts/docs-check.sh`
  - `composer run audit:runtime-routes` (`PASS`, active/protected mismatch `0`)
  - `composer run audit:openapi-provider` (expected FAIL: blocking `350`, deferred `17`, excluded `29`)
  - `composer run audit:openapi-field-bindings` (expected FAIL: `171`, `108 passed / 107 failed`)
  - `composer audit` (FAIL: 현재 lock 기준 `slim/slim` 1건, `symfony/yaml` 3건; 이번 request 계약 범위와 분리)

### `QG-216` OpenAPI response field 추적과 runtime status 감사 강화

- field binding 하네스가 OpenAPI 선택 응답 필드와 선택 부모 아래의 필수 자식을 필수 출력으로 오판하던 문제를 수정했습니다. 배열 append 응답, 반환형이 명시된 지연 객체 호출, typed service/repository의 `get()`을 실제 호출 graph로 추적하며 대형 JSON 증적은 128MB 기본 제한 안에서 streaming 기록합니다.
  - Why: 하네스 오탐을 실제 API 누락처럼 계산하면 잘못된 DTO 수정을 유도하고, 반대로 지연 생성 helper나 배열 조립을 추적하지 못하면 실제 PHP가 생성하는 필드·입력 흐름을 증명할 수 없습니다.
- 공통 success envelope schema `35`개의 `meta`를 runtime과 같이 required로 고정했습니다. 모든 명시적 `withStatus()`를 OpenAPI response status와 대조하도록 runtime graph를 보강하고, 실제 PHP가 `204`를 반환하던 `DELETE /admin/faqs/{fa_id}`의 잘못된 `200 + MessageResponse` 계약을 `204`로 수정했습니다.
- `/admin/schema/{domain}`은 generated JSON을 그대로 통과시키지 않고 OpenAPI 필수 root/section/field/option 구조로 정규화하면서 기존 확장 필드는 보존합니다. 응답 필수 필드 미결합은 `188 -> 0`으로 닫았습니다.
- 결과: 전체 OpenAPI `312`, active `189`, protected 일반 게시판 `26`은 유지했습니다. runtime active/protected route·security·response mismatch는 `0`입니다. provider 적색 기준선은 `402 -> 366`(active `332`, protected `34`), field binding은 `551 -> 282`이며 `45 passed / 170 failed`, `certified=false`입니다. 새로 드러난 미문서 구현 입력 `125`건을 포함한 잔여 적색은 `QG-212`에서 계속 닫습니다.
- Verification:
  - `vendor/bin/phpunit` (`753 tests`, `4791 assertions`, `12 skipped`)
  - 집중 회귀 `23 tests`, `1124 assertions` (`OpenApiFieldBindingAudit`, `RuntimeRouteGraph`, `AdminSchema`)
  - `python3 -m unittest discover -s scripts/tests -p 'test_*.py' -v` (`33 tests`)
  - `composer run analyse` (`PASS`, PHPStan level 8)
  - `composer run test:coverage:ci` + service coverage check (`PASS`, service `80.75%`)
  - `composer run contract:check`, `composer run schema:check`, `./scripts/docs-check.sh`, plugin isolation (`PASS`)
  - `composer run audit:runtime-routes` (`PASS`, active/protected response-contract `0`)
  - `composer run audit:openapi-provider` (expected FAIL: blocking `366`, deferred `17`, excluded `29`)
  - `composer run audit:openapi-field-bindings` (expected FAIL: `282`, response field unbound `0`)
  - `composer run audit:porting` (schema/contract PASS 후 live 관리자 URL·DB 입력이 없는 domain pipeline에서 expected FAIL)
  - `composer audit` (FAIL: 현재 lock 기준 `slim/slim` 1건, `symfony/yaml` 3건; 이번 하네스 범위와 분리)

### `QG-215` 201 Created Location 계약과 runtime 응답 정합화

- active 관리자 + protected 일반 게시판의 생성 응답 `27`개에 공통 `Location` header 계약을 선언하고, 실제 Controller가 생성된 게시판·그룹 회원·레이아웃 위젯·SMS 리소스·팝업·설문·스크랩 식별자를 사용해 같은 header를 반환하도록 맞췄습니다. deferred QA 생성 `3`개도 이미 존재하던 runtime header를 OpenAPI에 반영했습니다.
  - Why: OpenAPI에 `201 Created`만 있고 생성 리소스의 주소가 없거나, 문서에는 header가 있는데 runtime이 반환하지 않으면 Rust/Tauri가 생성 후 상세 조회·수정 대상으로 이동할 수 없습니다. 상태 코드와 body schema만 맞추는 감사로는 이 소비 누락을 검출할 수 없습니다.
- 주소로 조회하는 새 리소스가 아닌 메일 발송과 포인트 지급·차감 action `4`개 operation은 가짜 `201` 대신 실제 runtime과 OpenAPI를 `200`으로 통일했습니다. 그룹 생성 Location은 canonical `/admin/board-groups/{gr_id}`로 정규화하고, 레이아웃 위젯 ID는 저장 전에 확정해 응답 URI와 저장 identity가 같도록 했습니다.
- runtime route graph가 operation별 OpenAPI `201/Location`과 handler의 실제 `201/Location` 선언을 대조하고 active/protected 불일치를 hard-fail하도록 보강했습니다. provider/runtime Location 제거와 runtime status drift 변이 테스트를 추가했습니다.
- provider 감사는 같은 Location 정책을 전체 `312` operation에 적용한 뒤 범위별로 분류합니다. hard gate 밖에 남은 Location 미선언 `9`개도 deferred non-admin `6`개와 excluded shop `3`개 증거로 숨기지 않습니다.
- 결과: 전체 operation `312`, active `189`, protected `26`은 그대로 유지했습니다. runtime route/security/response-contract mismatch는 active/protected 모두 `0`입니다. provider 적색 기준선은 `434 -> 402`(active `333`, protected `34`, 공통 `35`)로 줄었고, field binding은 `551`로 유지되어 API 완료 상태로 오인하지 않습니다.
- Verification:
  - `vendor/bin/phpunit` (`750 tests`, `4741 assertions`, `12 skipped`)
  - `python3 -m unittest discover -s scripts/tests -p 'test_*.py' -v` (`33 tests`)
  - `composer run analyse` (`PASS`, PHPStan level 8)
  - `composer run test:coverage:ci` + service coverage check (`PASS`, service `80.75%`)
  - `composer run contract:check`, `composer run schema:check`, `./scripts/docs-check.sh`, hardcoding/lint/plugin-isolation (`PASS`)
  - `composer run audit:runtime-routes` (`PASS`, active/protected response-contract `0`)
  - `composer run audit:openapi-provider` (expected FAIL: blocking `402`, deferred `17`, excluded `29`)
  - `composer run audit:openapi-field-bindings` (expected FAIL: `551`)
  - `composer audit` (FAIL: 현재 lock 기준 `slim/slim` 1건, `symfony/yaml` 3건; 이번 응답 계약 범위와 분리해 후속 dependency 조치 필요)

### `QG-214` 전체 REST API와 일반 게시판 보호 인벤토리 강화

- `api/docs/openapi.phase1-consumer-scope.json`에 전체 `312` operation의 method+path 집합 SHA 및 분류별 기대 개수를 고정하고, 일반 게시판 `/boards`, `/boards/*`, `/files/*`, `/polls/*` exact `26` operation을 소비 여부와 별개의 protected provider surface로 선언했습니다.
  - Why: 1차 Tauri 앱이 관리자 API만 소비하더라도 이미 구현된 게시판 REST API를 줄이거나 감사에서 제외하면, 향후 게시판 소비 결정 시 누락·계약 드리프트를 뒤늦게 발견하게 됩니다. 소비 범위와 공급자 구현 보존 범위를 분리해야 합니다.
- provider/runtime/field/docs 하네스가 protected 일반 게시판의 operation 존재, route/handler, required/optional JWT 의미, request/response field를 hard-fail하도록 보강하고 삭제·route drift·optional auth drift 변이 테스트를 추가했습니다.
- OpenAPI operation 수는 `312`로 유지한 채 모든 operation에 실제 공통 429·500 응답을 선언하고, 게시판 다운로드 2개의 binary body와 다운로드 header를 runtime과 맞췄습니다. binary 응답을 JSON named DTO로 오판하지 않도록 provider 감사도 보정했습니다.
- 현재 runtime은 active `189` + protected `26` route/security finding 0건으로 통과합니다. provider 감사는 blocking `434`건, field binding은 exact `215` operation 중 `9 passed / 206 failed`, `551 findings`로 적색을 유지합니다.
- Verification:
  - `vendor/bin/phpunit tests/contract/Phase1ConsumerScopeTest.php tests/contract/RuntimeRouteGraphTest.php tests/contract/OpenApiFieldBindingAuditTest.php tests/contract/DocsCheckRouteGraphTest.php` (`25 tests`, `1140 assertions`)
  - `python3 -m unittest scripts.tests.test_check_openapi_provider_contract` (`6 tests`)
  - `composer run contract:check` (`PASS`, operations `312`)
  - `composer run audit:runtime-routes` (`PASS`, active/protected route·security `0` findings)
  - `composer run audit:openapi-provider` (expected FAIL: blocking `434`)
  - `composer run audit:openapi-field-bindings` (expected FAIL: `551`)

### `QG-213` Phase 1 관리자 소비 범위 SSOT와 감사 게이트 통일

- `api/docs/openapi.phase1-consumer-scope.json`과 PHP/Python 공통 판정기를 추가하고 provider/runtime/field/docs 감사가 동일한 exact `189` operation을 사용하도록 정책 중복을 제거했습니다.
  - Why: 1차 제품은 관리자 앱만 소비하는데 공급자 감사는 전체 312개를, runtime 감사와 field 감사는 서로 다른 관리자 부분집합을 hard-fail하면 일반 게시판 미확정 범위가 관리자 완료도를 오염시키거나 반대로 실제 관리자 누락이 가려질 수 있었습니다.
- `/admin/boards/*`를 포함한 non-shop 관리자 `184`개와 `/auth/login|logout|refresh`, `/health`, `/members/me` `5`개를 active로 고정했습니다. 일반 `/boards/*`, `/files/*`, `/polls/*` 및 `/admin-inspect/*`는 deferred, `/admin/shop/*`는 excluded 증거로 분리했습니다.
- runtime graph를 v3로 올려 범위 ID/SHA, active/deferred/excluded count와 finding을 기록하고, active operation 변경 및 stale scope 변이가 반드시 실패하도록 회귀 테스트를 추가했습니다.
- 현재 runtime active route/security는 `189/189`, finding `0`으로 통과합니다. deferred route 누락 `3`건과 security 차이 `14`건은 보존합니다. OpenAPI 공급자 의미 감사는 active `769`, deferred `205`, excluded `78`, field binding은 `477` findings로 계속 적색이며 전체 API 인증은 아닙니다.
- Verification:
  - `vendor/bin/phpunit tests/contract/Phase1ConsumerScopeTest.php tests/contract/RuntimeRouteGraphTest.php tests/contract/OpenApiFieldBindingAuditTest.php tests/contract/DocsCheckRouteGraphTest.php tests/contract/OpenApiProviderAuditWiringTest.php` (`21 tests`, `1086 assertions`)
  - `python3 -m unittest scripts.tests.test_check_openapi_provider_contract` (`5 tests`)
  - `composer run audit:runtime-routes` (`PASS`, active `189/189`)
  - `composer run audit:openapi-provider` (expected FAIL: active `769`)
  - `composer run audit:openapi-field-bindings` (expected FAIL: `477`)
  - `./scripts/docs-check.sh` (`PASS`)
  - `composer run quality-gate` (expected FAIL: provider `769`, field binding `477`; runtime/docs는 PASS)

### `QG-207` OpenAPI field binding fail-closed 감사 하네스

- `api/docs/openapi.field-binding-policy.json`, `scripts/lib/OpenApiFieldBindingAudit.php`, `scripts/check_openapi_field_bindings.php`를 추가해 active exact `189` operation의 request/response field를 실제 PHP AST flow와 자동 대조합니다.
  - Why: OpenAPI schema와 runtime handler 이름이 존재해도 handler가 다른 필드명을 읽거나 Service/Repository에 전달하지 않거나 실제 응답이 문서 필드를 생성하지 않으면 Rust/Tauri는 불완전한 계약을 정상 소비할 수 있으므로, operation별 field 증거와 미해석 경로를 자동 Failure로 고정해야 했습니다.
- runtime route graph에 handler FQCN·method·portable source path·line·OpenAPI SHA를 저장하고, field artifact에는 OpenAPI·policy·runtime·analyzer·PHP source fingerprint를 함께 남깁니다. route closure와 Controller→Service→Repository 호출, request 위치/type/default/enum, response array/envelope, 동적 입력과 tainted unresolved call을 추적합니다. 범위 ID/SHA와 active/deferred 분리는 후속 `QG-213`의 v3에서 추가했습니다.
- field rename, field type mismatch, 동적 request key, stale runtime graph 변이 테스트를 추가하고 `quality-gate`에 field binding 감사를 연결했습니다.
- 현재 적색 기준선은 `189 operations`, `9 passed / 180 failed`, 총 `477 findings`, `certified=false`입니다. 계층 도달은 Controller `188`, Service `186`, Repository `109`, RouteClosure `1` operation이며 실제 OpenAPI/API 결함은 이번 하네스 범위에서 수정하지 않았습니다.
- Verification:
  - `vendor/bin/phpunit tests/contract/OpenApiFieldBindingAuditTest.php tests/contract/RuntimeRouteGraphTest.php tests/contract/OpenApiProviderAuditWiringTest.php`
  - `composer run audit:runtime-routes` (현재 `QG-213` 기준 active PASS, deferred 17건 보존)
  - `composer run audit:openapi-field-bindings` (expected FAIL: 현재 477건 field-flow 결함)

### `QG-211` PHP OpenAPI 의미 계약과 실제 Slim runtime graph 감사 강화

- `api/docs/openapi.audit-policy.json`, `scripts/check_openapi_provider_contract.py`, `scripts/extract_runtime_route_graph.php`를 추가해 PHP 공급자 계약을 문법·path 개수 수준에서 request/response/security/runtime handler 의미 수준으로 확장했습니다.
  - Why: 기존 `contract:check`와 route scanner는 `MessageResponse`, 열린 request object, security/media/header 변경, 실제 middleware 차이를 놓쳐 불완전한 OpenAPI를 Rust/Tauri가 정상 계약처럼 소비할 수 있었습니다.
- route scanner는 `$app`/`$group` 및 Slim type-hint receiver만 route로 인정해 `$container->get()`·`$context->get()` 9건 오탐을 제거하고, `/admin-inspect` blanket 예외를 제거했습니다.
- contract manifest는 path/operation parameter, security, server, request/response media type, header, 공통 response와 재귀 schema `$ref`를 semantic fingerprint에 포함합니다. 변이 테스트는 security·parameter·media type·공통 오류·nested schema 변경이 반드시 fingerprint를 바꾸도록 고정합니다.
- 실제 Slim RouteCollector 감사 프로필은 DB 요청 없이 316 route operation을 등록하고 `/v1` 315건 handler를 전부 해석합니다. 도입 당시 내부 route 누락 3건과 security middleware 의미 불일치 14건을 Failure로 잡았고, 후속 `QG-213`에서 1차 범위를 확정하면서 이 17건은 deferred 증거로 재분류했습니다.
- `quality-gate`는 OpenAPI 의미 감사, runtime graph, 선언 route/docs 검사를 모두 실행해 새 하네스가 선택 실행 명령으로만 남지 않도록 고정했습니다.
- 도입 당시 OpenAPI 의미 감사 기준선은 전체 `312 operations`, 총 `1065 findings`, `certified=false`였습니다. 후속 `QG-213`의 관리자 범위 확정 후 현재 active 기준선은 `769`, deferred `205`, excluded `78`입니다.
- Verification:
  - `python3 -m unittest discover -s scripts/tests -p 'test_*.py' -v`
  - `vendor/bin/phpunit tests/contract/DocsCheckRouteGraphTest.php tests/contract/RuntimeRouteGraphTest.php`
  - `composer run contract:check`
  - `composer run audit:openapi-provider` (expected FAIL: 현재 OpenAPI 의미 결함)
  - `composer run audit:runtime-routes` (현재 `QG-213` 기준 active PASS, deferred 17건 보존)

---

## 2026-07-13

### `QG-205` API 파이프라인 공급자 1차 감사 정의와 fail-closed harness 도입

- `docs/AUDIT_SYSTEM.md`, `scripts/docs-check.sh`, `scripts/run_{all_,}admin_domain_pipeline.py`, `scripts/run_admin_domain_playwright_smoke.py`, `scripts/check_admin_domain_manifest.py`와 회귀 테스트를 갱신해 PHP route/OpenAPI/schema/legacy browser 증적 자체를 fail-closed로 강화했습니다. Rust aggregate 연결은 Rust 저장소의 별도 구현·검증 전까지 PHP CI에 선반영하지 않습니다.
  - Why: 선언 route와 OpenAPI path 수가 맞는 것만으로는 실제 runtime route, request/response field, Tauri/UI 소비 완료를 증명할 수 없고, stale summary·child 실패·빈 manifest·404 화면이 통과하면 감사 자체가 누락을 숨기게 됩니다. 앱/API 구현은 건드리지 않고 먼저 공급자 증적의 경계와 거짓 통과 조건을 닫아야 했습니다.
- route parser는 도달 가능한 require/include graph와 8개 HTTP method를 검사하고, 동적 route path나 해석 불가능한 module load를 Failure로 처리합니다. `adm/**/*.php` 254개는 core 155개와 `adm/shop_admin` 99개로 파일별 분류하며 공개 `shop/`은 제외합니다.
- domain/browser runner는 고유 audit-run-id, 실행 시작 시각, child exit, domain row count/status를 결합하고 snapshot·console·network artifact, final URL, 로그인/404/fatal/4xx·5xx evidence를 검증합니다.
- Verification:
  - `python3 -m unittest discover -s scripts/tests -p 'test_*.py' -v` (`20 passed`)
  - `vendor/bin/phpunit tests/contract/DocsCheckRouteGraphTest.php` (`6 tests`, `165 assertions`)
  - `bash scripts/docs-check.sh --provider-contract-only`

---

## 2026-03-24

### boards/contents/groups/polls/popups parity drift를 schema-scoped legacy 비교로 정리
- `api/v1/Admin/Dev/Support/{LegacyAdminSchemaParitySurfaceMerger,LegacyAdminSchemaParityComparator}.php`, `scripts/check_legacy_schema_parity.php`, `tests/Admin/Dev/LegacyAdminSchemaParity{Comparator,SurfaceMerger}Test.php`, `api/v1/Admin/Schema/schema-domains.json`을 갱신해 `schema_scope = schema_fields` 와 `ignored_section_mismatches` 를 추가하고, `boards`, `contents`, `groups`, `polls`, `popups` 도메인에 legacy helper control/section grouping 차이를 manifest 힌트로 선언했습니다.
  - Why: 이 다섯 도메인의 최신 실측 fail은 live/provider 계약 문제가 아니라 legacy parity 모델이 helper checkbox, 검색 파라미터, 결과 집계용 read-only 필드까지 같은 위상으로 비교하면서 생긴 false drift가 대부분이었습니다. surface별로 실제 계약 field 만 남기고, section/readonly 차이도 의도된 항목만 명시적으로 허용해야 파이프라인이 다시 실제 계약 드리프트만 경고하게 됩니다.
- 이어서 `api/v1/Admin/Dev/Support/LegacyAdminFieldInventoryExtractor.php`, `tests/Admin/Dev/LegacyAdminFieldInventoryExtractorTest.php`, `api/v1/Admin/Schema/schema-domains.json`을 갱신해 duplicate name control 에서는 hidden 보다 실제 입력 가능한 field 를 우선 선택하도록 보강하고, `mails`, `points`, `menus`, `faq-masters`, `faqs` 도메인의 legacy surface 정의를 staging truth에 맞게 조정했습니다.
  - Why: 이 다섯 도메인은 popup shell, editor helper, 리스트 화면, precondition 없는 zero-state가 섞여 있어 기존 parity 모델이 실제 수정 surface보다 wrapper/control noise를 먼저 집계하고 있었습니다. 관찰 가능한 surface만 남기고 duplicate field 선택까지 보정해야 `legacy_vs_contract`가 다시 실제 drift만 경고하게 됩니다.

### system parity drift를 legacy/live truth 기준으로 재모델링
- `api/v1/Admin/Schema/schema-domains.json`, `api/v1/Admin/Dev/Support/{LegacyAdminSchemaParitySurfaceMerger,LegacyAdminSchemaParityComparator}.php`, `scripts/check_legacy_schema_parity.php`, `tests/Admin/{Dev/LegacyAdminSchemaParity{Comparator,SurfaceMerger}Test.php,Schema/AdminSchemaServiceTest.php}`를 갱신해 `system` 도메인의 `cf_icode_id`, `cf_icode_pw`, `cf_phone`를 optional로 고정하고, section anchor 없는 legacy surface는 manifest `default_section`을 parity inventory에도 적용하며, `cf_icode_server_ip/port`의 hidden legacy 표현은 manifest에서 명시적으로 허용하도록 보강했습니다.
  - Why: staging 재관측 결과 `system`은 더 이상 stale 산출물 문제가 아니라 실제 drift가 남아 있었고, 그중 `required` 불일치는 로컬 generated contract가 live/legacy truth보다 과하게 엄격해서 생긴 문제였습니다. 반면 `cf_icode_server_ip/port`는 live 계약이 의도적으로 더 노출하는 필드라, 이를 버그처럼 계속 fail시키기보다 manifest에 의도된 차이로 선언해 parity가 진짜 drift만 남기도록 좁히는 편이 맞았습니다.
- 같은 흐름으로 `cf_phone`의 legacy required 차이는 `ignored_required_mismatches`로 선언해 parity fail을 제거했습니다.
  - Why: `adm/sms_admin/config.php`는 운영 UI 안전장치로 `cf_phone` 입력을 강제하지만, staging live 계약은 update semantics 상 optional을 유지하는 것이 실제 동작과 일치했습니다. 이 차이는 버그라기보다 surface policy 차이이므로, 파이프라인이 계속 실패하는 대신 manifest가 의도된 차이로 설명하도록 올리는 편이 맞았습니다.
- `theme`, `sms-contacts`, `sms-messages`, `sms-templates` 파이프라인용으로 `LegacyAdminFieldInventoryExtractor`가 table 바깥 form control 과 indexed array name(`bg_name[0]`)까지 수집하도록 보강하고, parity manifest에 `ignored_schema_only_fields`를 추가했습니다.
  - Why: 이 네 도메인은 레거시 UI가 전통적인 `table > tr > th/td` 한 장 폼이 아니라 list+toolbar+JS aggregate 구조를 많이 써서, 기존 extractor는 add form 과 composite control 을 구조적으로 놓쳤습니다. 이 상태에서 생기는 `legacy_vs_contract` fail은 구현 drift라기보다 파이프라인 관찰 모델 부족에 가깝기 때문에, 먼저 extractor 범위를 넓히고 API-only aggregate 입력은 manifest 힌트로 분리하는 편이 맞았습니다.

### 관리자 parity 파이프라인이 다중 legacy surface union을 비교하도록 확장
- `api/v1/Admin/Dev/Support/LegacyAdminSchemaParitySurfaceMerger.php`, `scripts/check_legacy_schema_parity.php`, `api/v1/Admin/Schema/schema-domains.json`, `docs/architecture/ADMIN_DOMAIN_PIPELINE.md`, `tests/Admin/Dev/LegacyAdminSchemaParitySurfaceMergerTest.php`를 갱신해 `legacy_forms`가 여러 개인 도메인은 각 surface를 scoped inventory/schema로 잘라 합성한 뒤 parity를 계산하도록 바꾸고, `system` 도메인에는 `adm/sms_admin/config.php`를 추가했습니다.
  - Why: 기존 파이프라인은 `build_admin_domain_observation.py`가 여러 legacy form을 수집해도 실제 parity 비교는 첫 번째 target 한 장만 보고 있었기 때문에, `system`처럼 계약이 `config_form.php`와 `sms_admin/config.php` 두 레거시 면에 걸친 aggregate domain에서 `cf_phone` 같은 실제 필드를 계속 놓쳤습니다. multi-surface union을 파이프라인 자체로 승격해야 manifest가 선언한 공급자 면과 parity 결과가 다시 같은 모델을 보게 됩니다.

### 관리자 parity가 `supported_fields` 도메인에서 legacy 전체 폼을 오탐하던 문제 보정
- `scripts/check_legacy_schema_parity.php`, `api/v1/Admin/Schema/schema-domains.json`, `docs/HISTORY.md`를 갱신해 `schema_scope = supported_fields` 로 선언된 legacy target 은 schema뿐 아니라 legacy inventory도 같은 field subset으로 잘라 비교하도록 맞췄고, `system` 도메인의 `adm/config_form.php` 비교도 그 규칙을 사용하도록 고정했습니다.
  - Why: 기존 parity 스크립트는 `supported_fields` 도메인에서도 schema만 축소하고 legacy inventory는 전체 폼을 그대로 비교했기 때문에, `members`나 `system`처럼 한 레거시 페이지 안 일부 섹션만 계약 surface 로 삼는 도메인이 구조적으로 항상 대량 `legacy_only_fields`를 낳았습니다. 이 상태는 실제 drift와 파이프라인 모델 부재를 구분하지 못하게 하므로, 먼저 비교 범위를 manifest가 선언한 surface와 같게 맞춰 false fail을 걷어내는 것이 맞았습니다.

### config service와 schema runtime option resolver 구조 경고 2건 해소
- `api/v1/Admin/Config/{Service/AdminConfigService.php,Support/AdminConfigPayload{Normalizer,Guard}.php}`, `api/v1/Admin/Schema/{Repository/AdminSchemaRuntimeOptionResolver.php,Support/AdminSchemaRuntime{DirectoryOptionCatalog,StateProvider}.php}`, `docs/{HISTORY.md,audits/WARNING_BUDGETS.toml}`를 갱신해 `config` 쓰기 service에서는 payload orchestration만 남기고, `/admin/schema` runtime option 보강기에서는 domain option 조립만 남기도록 책임을 분리했습니다.
  - Why: `AdminConfigService`와 `AdminSchemaRuntimeOptionResolver`는 각각 설정 정규화/검증과 runtime state 조회/디렉터리 스캔을 한 파일에 같이 들고 있어 구조 감사 warning budget 없이는 유지할 수 없는 상태였습니다. 이번 단계에서는 budget을 연장하기보다 정규화, 상태 조회, 파일시스템 option 조립을 `Support` collaborator로 분리해 본체를 다시 orchestration 경계로 되돌리고, 구조 감사가 진짜 활성 drift만 추적하도록 만드는 편이 맞았습니다.

## 2026-03-08

## 2026-03-09

## 2026-03-11

## 2026-03-12

## 2026-03-13

## 2026-03-14

## 2026-03-15

### 구현 감사 자동 보고서와 CI `audit:auto` 강제 도입
- `scripts/{run_standard_audit.py,run_standard_audit.sh,run_integrated_audit.sh,run_audit_auto.sh}`, `.github/workflows/ci.yml`, `composer.json`, `.gitignore`, `AGENTS.md`, `docs/{AUDIT_SYSTEM,AUDIT_STRATEGY,README,HISTORY}.md`, `.agent/workflows/{audit,deep-audit,field-parity-audit}.md`를 갱신해 구현 감사가 표준 보고서와 `AUDIT_LATEST`를 자동 작성하도록 바꾸고, CI 품질 게이트도 `audit:auto`를 기준 진입점으로 전환했습니다.
  - Why: 이전 상태는 `audit:auto`가 로컬 편의 스크립트에 가깝고, CI는 여전히 개별 게이트를 수동 나열하고 있었으며, `audit:implementation` 결과도 권위 보고서가 자동으로 남지 않았다. 이 구조에서는 로컬/CI 감사 선택이 갈라지고, 사람이 보고서 작성까지 기억해야 해서 운영 드리프트가 다시 생길 수 있다. 구현 감사 실행 자체가 보고서를 남기고 CI가 같은 자동 선택기를 쓰도록 고정해야 감사체계가 실제 운영에서도 하나의 기준으로 닫힌다.

### PHP 감사 자동 선택기와 구조 handoff freshness 게이트 도입
- `scripts/run_audit_auto.sh`, `scripts/check_structure_report_freshness.py`, `.gitignore`, `composer.json`, `AGENTS.md`, `docs/{AUDIT_SYSTEM,AUDIT_STRATEGY,README,HISTORY}.md`, `.agent/workflows/{audit,deep-audit,field-parity-audit}.md`를 갱신해 변경 파일 기준 감사 자동 선택기(`audit:auto`)와 구조 generated artifact freshness 검증기를 추가했습니다.
  - Why: 지금까지는 어떤 감사를 올려야 하는지 사람 기억과 환경변수(`RUN_BLACKBOX`, `RUN_INTEGRATED`)에 많이 의존했고, `output/php-structure-audit/latest.*`도 생성 후 소스가 더 바뀌면 stale 산출물이 그대로 최신 handoff처럼 보일 수 있었다. 자동 선택기와 freshness gate를 넣어야 감사 승격 누락과 stale handoff를 체계 차원에서 줄일 수 있다.

### 포팅 감사 baseline에 docs-check를 편입하고 shop-catalog stocksms 계약 드리프트를 수정
- `scripts/run_field_parity_audit.sh`, `api/routes/v1/admin/shop-catalog.php`, `api/docs/openapi.yaml`, `tests/contract/AdminShopCatalogContractTest.php`를 갱신해 포팅 감사가 `docs-check`까지 함께 실행되도록 바꾸고, `POST /admin/shop/catalog/stocksms/{stock_sms_id}/send` 경로를 OpenAPI와 계약 테스트에 맞췄습니다.
  - Why: 실제로 `audit:porting`은 통과했지만 `audit:implementation`은 OpenAPI ↔ Route 드리프트 때문에 실패하는 상태였고, 그 결과 포팅 감사만으로는 관리자 계약 파손을 막지 못한다는 구멍이 드러났다. porting baseline에 docs-check를 편입하고 stocksms 발송 경로를 테스트로 고정해야 같은 종류의 누락이 다시 조용히 지나가지 않는다.

### shop-catalog stocksms 저장소를 분리해 구조 warning을 제거
- `api/v1/Admin/Shop/Catalog/Repository/{AdminShopCatalogProductRepository.php,AdminShopCatalogRepository.php,AdminShopCatalogStockSmsRepository.php}`를 갱신해 `item_stocksms` 조회/수정/발송/삭제 책임을 별도 저장소로 분리하고, 기존 product 저장소는 상품/옵션 경계에 집중하도록 정리했습니다.
  - Why: 구조 감사가 `AdminShopCatalogProductRepository`를 warning threshold 초과 파일로 잡고 있었는데, 이 경고는 아직 budget도 없이 남아 있어 구조 감사 체계와 실제 코드 상태가 충돌하고 있었다. 이 경우 warning budget을 덧칠하기보다 stocksms 책임을 별도 저장소로 분리하는 것이 bounded context와 구조 게이트 둘 다에 더 맞는 방향이었다.

### shop-admin catalog 1차 착수 스캐폴드 반영
- `api/routes/v1/admin.php`, `api/routes/v1/admin/shop-catalog.php`, `api/docs/openapi.yaml`, `api/docs/openapi.contract-manifest.json`, `api/v1/Admin/Shop/Catalog/{Controller,Service,Repository}/*`를 반영해 `/admin/shop/catalog` 1차 구현 착수를 계약+라우트+스켈레톤 기준으로 정리했습니다.
- `composer run audit:implementation` 통과 후 `composer run audit:integrated`는 Rust 미반영으로 `php_openapi_paths_missing_in_rust`(12건)로 실패해, Rust 쪽 구현 반영 후 재실행이 필요함을 기록했습니다.
  - Why: 공용 계약 기준에서 PHP가 먼저 구조/구현을 선점하면 소비자(Rust) 반영 순서를 분리해도 경로 정합성 drift를 투명하게 추적해야 하고, 현재 상태를 스캔 상태로 고정해 다음 구현 단계가 통제된 상태에서 진행되어야 합니다.

### `/admin/schema` placeholder label 5건 해소
- `api/v1/Admin/Schema/schema-domains.json`, `api/v1/Admin/Schema/Data/generated/{sms-contacts,mails,points}.json`, `tests/Admin/Schema/AdminSchemaServiceTest.php`, `docs/{TODO,HISTORY}.md`를 갱신해 `sms-contacts.contacts_text`, `sms-contacts.dry_run`, `mails.use_selected_template`, `mails.dry_run`, `points.base_date`에 남아 있던 `FIXME_` 라벨을 현재 작업면 기준 제목으로 정리함
  - Why: `/admin/schema` provider rollout은 끝났지만 통합 감사는 여전히 `php_fixme_schema_labels=5` warning 1건이 남아 있었고, 이 다섯 필드는 provider 미구현이 아니라 실제 작업면이 이미 합의한 제목을 schema source가 따라가지 못한 상태였다. 레거시 폼에 직접 대응하는 `<label>`이 없는 API 전용 편의 필드라도, 이미 소비단과 테스트에서 합의된 작업면 제목이 있으면 placeholder를 그대로 두기보다 provider label로 승격해 마지막 schema label warning을 닫는 것이 맞았다.

### 문서 거버넌스 stale audit archive 재정렬
- `docs/audits/*_2026-03-06.md` 10건을 `docs/archive/audits/`로 이동하고 `docs/DOCUMENT_REGISTRY.md`를 재생성해 문서 보관 정책과 분류 레지스트리를 현재 상태로 다시 맞춤
  - Why: 구조/구현/포팅 게이트는 녹색이었지만 dated audit 10건이 활성 `docs/audits/`에 남아 있어 `docs-check`가 실패하고 문서 거버넌스 기준선이 깨져 있었다. 이 상태를 방치하면 감사 루프는 통과해도 문서 SSOT가 오래된 증적으로 다시 오염되므로, 보관 정책을 실제 파일 이동과 레지스트리 재생성까지 반영해 기준선을 다시 고정하는 것이 맞았다.

### `/admin/schema` provider rollout 2차(sms-contacts, sms-messages, sms-templates, mails, points)
- `api/v1/Admin/Schema/schema-domains.json`, `api/v1/Admin/Schema/Data/generated/{sms-contacts,sms-messages,sms-templates,mails,points}.json`, `tests/Admin/Schema/AdminSchemaServiceTest.php`, `docs/{TODO,HISTORY}.md`, `docs/audits/ADMIN_SCHEMA_PROVIDER_READINESS.toml`를 갱신해 남아 있던 5개 provider domain을 모두 추가하고 readiness baseline을 implemented 16개 / blocked 0개로 줄임
  - Why: system/theme 이후 남은 `/admin/schema` provider blocker는 모두 SMS/메일/포인트 작업면이었고, Rust 메타데이터 backlog도 이 5개 domain 부재를 전제로 막혀 있었다. 이제 provider backlog를 더 잘게 쪼개 문서로만 관리하기보다, 남은 5개를 한 번에 올려 공급자 책임을 닫고 이후 경고는 `provider_domain_missing`이 아니라 실제 label/widget drift와 소비자 정합성 문제로 좁히는 것이 맞았다.

### `/admin/schema` provider rollout 1차(system, theme)
- `api/v1/Admin/Schema/schema-domains.json`, `api/v1/Admin/Schema/Data/generated/{system,theme}.json`, `tests/Admin/Schema/AdminSchemaServiceTest.php`, `docs/{TODO,HISTORY}.md`, `docs/audits/ADMIN_SCHEMA_PROVIDER_READINESS.toml`를 갱신해 `system`, `theme` domain을 provider에 추가하고 readiness baseline을 implemented 11개 / blocked 5개로 줄임
  - Why: Rust 쪽 메타데이터 backlog에서 가장 먼저 막혀 있던 P1 항목이 `system`, `theme`였고, 둘 다 기존 PHP API와 레거시 폼/설정 경계가 이미 있어 `/admin/schema` domain만 추가하면 provider blocker를 실제로 줄일 수 있는 상태였다. readiness registry와 generated artifact가 이미 있으니, 이제는 숫자를 유지하는 문서보다 backlog를 실제로 줄여 공급자 책임을 이행하는 것이 맞았다.

### `/admin/schema` provider readiness registry 도입
- `docs/audits/ADMIN_SCHEMA_PROVIDER_READINESS.toml`, `scripts/check_admin_schema_provider_readiness.py`, `scripts/generate_admin_schema_provider_report.py`, `composer.json`, `scripts/run_deep_audit.sh`, `docs/{AUDIT_SYSTEM,AUDIT_STRATEGY,README,TODO}.md`, `.agent/workflows/field-parity-audit.md`를 갱신해 implemented provider 9개와 blocked backlog 7개를 machine-readable registry와 generated artifact로 고정함
  - Why: 지금까지 `/admin/schema` provider 잔량은 Rust 쪽 blocker handoff에서만 보였고, PHP 공급자 저장소 자체에서는 “무엇이 이미 provider에 올라왔고 무엇이 아직 domain 자체가 없는지”를 감사가 직접 추적하지 못했다. provider readiness registry를 도입해야 PHP도 `/admin/schema` coverage를 자기 저장소 안에서 canonical하게 관리하고, Rust blocker와 분리된 공급자 backlog를 상설 감사 대상으로 유지할 수 있다.

### Shared gateway/source-of-truth 규칙을 machine-readable registry로 승격
- `docs/architecture/GATEWAY_USAGE_RULES.json`를 추가하고 `tests/contract/g5-repository/GatewayImplementationContractTest.php`, `scripts/php_structure_findings.py`, `scripts/check_active_structure_boundaries.py`, `scripts/generate_structure_audit_report.py`를 갱신해 shared gateway allowlist와 local compat contract leak 규칙을 같은 registry에서 읽도록 정리함
  - Why: 지금까지 shared gateway inventory allowlist는 계약 테스트 파일 안 배열과 설명용 Markdown에 나뉘어 있어, 구조 감사는 이 규칙을 직접 보지 못했고 설명 문서와 테스트 규칙이 따로 drift할 여지가 있었다. machine-readable registry를 두고 구조 감사와 계약 테스트가 같이 읽게 해야 bounded context/source-of-truth 규칙이 문서 설명이 아니라 상설 감사 규칙으로 승격된다.

### PHP 구조 감사 generated artifact 도입
- `scripts/generate_structure_audit_report.py`, `composer run audit:structure-report`, `output/php-structure-audit/latest.{md,json}`를 추가하고 `scripts/run_deep_audit.sh`, `docs/{AUDIT_SYSTEM,AUDIT_STRATEGY,README,TODO}.md`를 갱신해 active structure finding, warning budget, blocker 상태를 재사용 가능한 최신 generated evidence로 고정함
  - Why: 구조 감사가 콘솔 출력과 수기 문서에만 남아 있으면 handoff나 회귀 비교 때 다시 로그를 파싱해야 하고, warning budget/blocker와 현재 finding을 한 덩어리로 재사용하기 어렵다. generated `latest.md/json`을 두면 deep audit가 끝날 때마다 같은 형식의 최신 증적이 남고, 이후 통합 감사나 운영 handoff도 같은 산출물을 그대로 참조할 수 있다.

### PHP 감사 운영 SSOT와 blocker registry 도입
- `docs/AUDIT_SYSTEM.md`를 추가하고 `AGENTS.md`, `docs/{README,AUDIT_STRATEGY}.md`, `.agent/workflows/{audit,deep-audit,field-parity-audit}.md`, `README.md`를 갱신해 PHP 쪽 감사 운영 규정과 감사 선택 매트릭스를 분리함
  - Why: 기존 PHP는 `AUDIT_STRATEGY.md`와 워크플로 문서만으로 감사 체계를 설명하고 있었기 때문에, 헌법과 운영 규정의 경계가 모호하고 blocker 상태를 어디에 canonical하게 기록해야 하는지가 분명하지 않았다. Rust 쪽과 마찬가지로 감사 운영 SSOT를 별도로 두어야 이후 blocker, 예외, 보고 형식을 체계적으로 확장해도 상위 규범과 집행 규정을 혼동하지 않는다.
- `docs/audits/BLOCKERS.toml`, `scripts/check_blocker_registry.py`, `composer run audit:blockers`, `scripts/run_deep_audit.sh`를 추가/갱신해 `AUTH-308`, `AUTH-310` 같은 운영 blocker를 `docs/TODO.md` Blocked와 registry 양쪽에서 자동 검증하도록 정리함
  - Why: 지금까지는 staging credential 부재 같은 blocker가 `docs/TODO.md`의 서술에만 남아 있어, 시간이 지나면 누가 소유하고 어떤 upstream을 기다리는지 감사가 자동으로 잡아내지 못했다. blocker registry를 도입하면 PHP 쪽도 “닫을 수 없는 일”을 debt가 아니라 운영 상태로 관리할 수 있고, deep audit가 그 일관성을 계속 강제할 수 있다.
- `docs/audits/{WAIVERS,WARNING_BUDGETS}.toml`, `scripts/check_{audit_waivers,warning_budgets}.py`, `composer run audit:{waivers,warning-budgets}`, `scripts/run_deep_audit.sh`를 추가/갱신해 PHP 감사 체계도 blocker 외 예외 허용과 경고 운영 debt를 registry 단위로 다룰 준비선을 세움
  - Why: blocker만 관리하면 “지금 막힌 일”은 보이지만, 구조 경고를 언제까지 허용할지와 예외를 언제 회수할지를 추적하기 어렵다. PHP는 아직 Rust처럼 활성 warning 자동 매칭까지는 가지 않더라도, 최소한 registry와 검증기부터 둬야 예외와 경고를 문장형 메모가 아니라 운영 객체로 다룰 수 있다.
- `scripts/php_structure_findings.py`, `scripts/check_active_structure_boundaries.py`, `composer run audit:structure-findings`, `docs/audits/WARNING_BUDGETS.toml`, `scripts/check_warning_budgets.py`, `scripts/run_deep_audit.sh`를 갱신해 PHP 구조 감사도 `rule/path` finding을 내보내고 warning budget이 active 구조 경고와 자동 매칭되도록 보강함
  - Why: 이전 PHP 구조 감사는 `wc`, `rg` 출력 중심이라 사람이 로그를 읽고 “이게 실제 경고인지”를 해석해야 했고, warning budget은 registry 형식만 있을 뿐 실 warning과 연결되지 않았다. 구조 경고를 finding으로 승격해야 budget과 waiver가 진짜 운영 제어 장치가 되고, deep audit 결과도 더 이상 수기 판단에 기대지 않게 된다.

### Point provider domain 포트를 query/reward/maintenance로 세분화
- `api/v1/Point/Contracts/Point{Query,Reward,Maintenance}Gateway.php`를 추가하고 `api/v1/Point/{Contracts/PointGateway.php,Repository/PointRepository.php,Service/PointService.php,definitions.php}`, `tests/{Point/PointServiceTest.php,contract/g5-repository/GatewayImplementationContractTest.php}`를 갱신해 Point 도메인 내부를 `query/reward/maintenance` 포트로 세분화함
  - Why: `PointGateway` 전체를 provider domain 내부에서도 그대로 들고 있으면 이후 shared surface를 줄일 때 읽기와 보상/관리 책임이 다시 섞인다. Point 도메인 자신부터 더 좁은 포트를 쓰게 고정해야 다음 단계에서 cross-domain/plugin 호환면도 `reward`와 `maintenance/admin` 경계로 안전하게 줄일 수 있다.
- `api/v1/Integration/Contracts/Point{Reward,Maintenance}Gateway.php`를 추가하고 `api/v1/{Auth/Service/{AuthRegistrationService.php,AuthSessionService.php},Auth/Service/Support/{AuthRegistrationPointService.php,AuthSessionIssuer.php},Post/Service/PostPointService.php,Memo/Service/MemoService.php,Admin/Poll/Service/{AdminPollVoteService.php,Support/AdminPollVoteRewardService.php},Point/definitions.php}`, `tests/contract/g5-repository/GatewayImplementationContractTest.php`를 갱신해 순수 reward/maintenance 소비가 broad shared `PointGateway` 대신 더 좁은 shared 포트를 바라보게 정리함
  - Why: Point 도메인 내부만 좁혀도 cross-domain 서비스가 계속 broad `PointGateway`를 쥐고 있으면 shared inventory가 줄지 않고, 보상 흐름과 로그인 후 합산 동기화가 같은 계약으로 다시 섞인다. reward/maintenance 전용 shared 호환면을 먼저 만들어 두면 plugin/admin 호환을 깨지 않으면서도 broad surface를 실제 소비 지점부터 단계적으로 줄일 수 있다.

### Auth provider domain 포트를 identity/registration/session/recovery로 세분화
- `api/v1/Auth/Contracts/Auth{Identity,Registration,Session,Recovery}Gateway.php`를 추가하고 `api/v1/Auth/{Contracts/AuthGateway.php,Repository/AuthRepository.php,definitions.php,Service/{AuthAvailabilityService.php,AuthRegistrationService.php,AuthSessionService.php,AuthRecoveryService.php},Service/Support/{AuthRegistrationPayloadBuilder.php,AuthSessionIssuer.php,AuthSessionPolicy.php,AuthSessionTokenManager.php,AuthRecoveryMemberResolver.php},External/Service/{ExternalAuthTransitionService.php,ExternalAuthLinkageService.php}}`, `tests/{Auth/AuthSessionServiceTest.php,Auth/ExternalAuthTransitionServiceTest.php,Support/BuildsDomainServices.php,contract/g5-repository/GatewayImplementationContractTest.php}`를 갱신해 Auth 도메인 내부와 외부 인증 전환 흐름이 더 좁은 local 포트를 바라보게 정리함
  - Why: `AuthGateway`를 provider domain 내부에서도 그대로 쥐고 있으면 세션/복구/가입/식별 책임이 계속 한 계약으로 섞여 다음 shared slim phase에서 broad `AuthGateway`를 줄일 기준점이 생기지 않는다. 먼저 Auth 내부를 `identity/registration/session/recovery`로 세분화해 두어야 이후 middleware/member/external auth에 남은 shared 호환면을 어떤 축으로 줄일지 문서와 계약 테스트로 더 안전하게 고정할 수 있다.

### Auth shared 소비면을 identity/session/recovery 포트로 1차 축소
- `api/v1/Integration/Contracts/Auth{Identity,Session,Recovery}Gateway.php`를 추가하고 `api/v1/{Integration/Contracts/AuthGateway.php,Auth/definitions.php,Member/Service/{MemberService.php,MemberProfileUpdateService.php},Middlewares/{JwtAuthMiddleware.php,OptionalJwtAuthMiddleware.php},Core/Middleware/JwtAuthMiddleware.php}`, `tests/{Security/OptionalJwtAuthMiddlewareTest.php,contract/g5-repository/GatewayImplementationContractTest.php}`, `docs/{README,IMPLEMENTATION_ROADMAP,TODO,HISTORY}.md`, `docs/architecture/SHARED_GATEWAY_INVENTORY.md`를 갱신해 `member/middleware` 소비가 broad shared `AuthGateway` 대신 더 좁은 shared 포트를 바라보게 정리함
  - Why: provider domain 내부를 나눠도 실제 cross-domain 소비가 계속 broad shared `AuthGateway`를 들고 있으면 slim phase는 문서상으로만 끝난다. `member/middleware`가 필요한 면을 `identity/session/recovery`로 먼저 쪼개 두어야 deprecated broad shared `AuthGateway`를 진짜 compatibility shell로 축소할 수 있고, 다음 단계에서 external auth/Post/Point와의 경계도 더 선명하게 정리할 수 있다.

### Point shared 소비면을 query/reward/maintenance 포트로 2차 축소
- `api/v1/Integration/Contracts/PointQueryGateway.php`를 추가하고 `api/v1/{Integration/Contracts/PointGateway.php,Point/definitions.php,Admin/Point/Service/AdminPointService.php}`, `tests/{Admin/Point/AdminPointServiceTest.php,Admin/AdminValidationServiceTest.php,contract/g5-repository/GatewayImplementationContractTest.php}`, `docs/{README,IMPLEMENTATION_ROADMAP,TODO,HISTORY}.md`, `docs/architecture/SHARED_GATEWAY_INVENTORY.md`를 갱신해 `AdminPointService`가 broad shared `PointGateway` 대신 `PointQueryGateway`, `PointRewardGateway`, `PointMaintenanceGateway`를 직접 바라보게 정리함
  - Why: `Point` 도메인 내부와 일부 cross-domain reward/maintenance 소비를 좁혀도 관리자 포인트 흐름이 계속 broad shared `PointGateway`를 들고 있으면 inventory 상 broad surface가 실제보다 크게 남고, 조회/보상/관리 책임도 다시 한 서비스에 섞인다. `AdminPointService`부터 shared `query/reward/maintenance` 포트로 고정하면 broad shared `PointGateway`는 `Auth/Post/plugin` 같은 진짜 잔여 호환면만 남게 되고, 이후 slim phase에서 무엇이 아직 shared여야 하는지 판단이 훨씬 명확해진다.

### Point broad shared facade를 plugin/compat surface 위주로 추가 축소
- `api/v1/{Auth/Service/AuthService.php,Post/Service/PostService.php}`, `tests/{Support/BuildsDomainServices.php,contract/g5-repository/GatewayImplementationContractTest.php}`, `docs/{README,IMPLEMENTATION_ROADMAP,TODO,HISTORY}.md`, `docs/architecture/SHARED_GATEWAY_INVENTORY.md`를 갱신해 `AuthService`, `PostService`가 실제로 사용하지 않던 broad shared `PointGateway` 생성자 의존을 제거하고, broad `PointGateway`가 plugin/compatibility shell 위주로만 남도록 정리함
  - Why: subservice들이 이미 `PointQueryGateway`, `PointRewardGateway`, `PointMaintenanceGateway`로 분리된 상태에서 상위 파사드인 `AuthService`, `PostService`가 broad shared `PointGateway`를 계속 생성자에 들고 있으면 broad surface가 실제보다 넓게 보이고, inventory 상 잔여 부채도 과장된다. 쓰지 않는 파사드 의존을 제거해 두면 broad `PointGateway`의 남은 책임이 plugin/compatibility shell이라는 점이 더 분명해지고, 이후 Point slim phase는 plugin-facing surface만 보면 된다.

### Auth broad shared shell을 repository/contract-test 호환면으로 최소화
- `tests/{Support/BuildsDomainServices.php,Member/Member{Service,EventDispatch}Test.php,Security/OptionalJwtAuthMiddlewareTest.php,contract/g5-repository/GatewayImplementationContractTest.php}`, `docs/{README,IMPLEMENTATION_ROADMAP,TODO,HISTORY}.md`, `docs/architecture/SHARED_GATEWAY_INVENTORY.md`를 갱신해 `Member`/`JWT` 테스트 보조층도 `AuthIdentityGateway`, `AuthRecoveryGateway`, `AuthSessionGateway`를 기준으로 정리하고, broad shared `AuthGateway` allowlist를 repository compat와 계약 테스트 위주로 축소함
  - Why: API 레이어는 이미 `AuthIdentityGateway`, `AuthSessionGateway`, `AuthRecoveryGateway`를 사용하고 있는데 테스트 보조층과 일부 회귀 테스트가 broad shared `AuthGateway`를 계속 붙들고 있으면, 문서상으로는 shell을 줄였다고 해도 실제 allowlist가 넓게 남아 구조 부채가 과장된다. 테스트 보조층도 좁은 shared 포트 기준으로 맞춰 두면 broad `AuthGateway`는 정말 필요한 repository compat/계약 테스트 껍데기만 남고, 이후 재유입도 더 명확하게 차단할 수 있다.

### Post shared read surface를 internal helper에서 분리
- `api/v1/{Post/Contracts/{PostReadGateway,PostGateway}.php,Integration/Contracts/{PostReadGateway,PostGateway}.php,Post/definitions.php,Comment/Service/{CommentService.php,Support/CommentContextService.php},File/Service/{FileService.php,FileReadService.php,FileUploadService.php,FileDeleteService.php}}`, `tests/{Support/BuildsDomainServices.php,Comment/*.php,File/*.php,contract/g5-repository/GatewayImplementationContractTest.php}`, `docs/{README,IMPLEMENTATION_ROADMAP,TODO,HISTORY}.md`, `docs/architecture/SHARED_GATEWAY_INVENTORY.md`를 갱신해 `Comment/File` internal helper가 broad shared `PostGateway` 대신 shared `PostReadGateway`를 바라보게 정리함
  - Why: `Comment/File`가 실제로는 게시글 존재 여부와 소유자 확인 같은 read helper만 쓰는데 broad shared `PostGateway`를 계속 참조하면 plugin-facing write/reaction surface와 internal helper surface가 한 계약에 섞여 구조 부채가 과장된다. shared read 포트를 먼저 분리해 두면 broad `PostGateway`는 `Core/Plugin`과 repository compat shell 위주로 남고, 이후 plugin-facing write/reaction 분리도 더 작은 범위에서 진행할 수 있다.

### Point broad shared shell을 reward 중심 테스트 보조층에서 축소
- `tests/{Support/BuildsDomainServices.php,Post/*.php,Memo/MemoServiceTest.php,Admin/Poll/AdminPollServiceTest.php,contract/g5-repository/GatewayImplementationContractTest.php}`, `docs/{README,IMPLEMENTATION_ROADMAP,TODO,HISTORY}.md`, `docs/architecture/SHARED_GATEWAY_INVENTORY.md`를 갱신해 `Post/Memo/AdminPoll` 테스트 보조층이 broad shared `PointGateway` 대신 `PointRewardGateway`를 바라보게 정리함
  - Why: API 코드에서는 이미 `PointQueryGateway`, `PointRewardGateway`, `PointMaintenanceGateway`로 책임을 분리했는데 테스트 보조층이 broad shared `PointGateway`를 계속 쓰고 있으면 문서상 잔여 부채가 실제보다 넓게 남는다. reward 중심 테스트부터 좁은 shared 포트로 옮겨 두면 broad `PointGateway`는 `Core/Plugin`과 `Auth` compat shell 위주로 남고, 다음 slim phase는 그 남은 호환면만 보면 된다.

### Point broad shared shell을 Auth 테스트 호환면에서 추가 축소
- `tests/Auth/{AuthService,AuthServicePoint,AuthSessionService,AuthEventDispatch,ExternalAuthTransitionService}Test.php`, `tests/contract/g5-repository/GatewayImplementationContractTest.php`, `docs/{README,IMPLEMENTATION_ROADMAP,TODO,HISTORY}.md`, `docs/architecture/SHARED_GATEWAY_INVENTORY.md`를 갱신해 `Auth` 테스트 보조층도 broad shared `PointGateway` 대신 `PointRewardGateway`/`PointMaintenanceGateway`를 바라보게 정리함
  - Why: 실제 서비스 경계가 이미 register/login/session 기준으로 reward/maintenance 포트로 갈라져 있는데 Auth 테스트만 broad `PointGateway`를 계속 들고 있으면 broad shell이 plugin surface보다 넓게 남아 보인다. Auth 테스트 보조층도 좁은 shared 포트로 옮겨 두면 broad `PointGateway`는 `Core/Plugin`과 repository/contract compat shell 위주로만 남고, 다음 slim phase는 plugin-facing reward 경계만 집중해서 볼 수 있다.

### 구조 감사가 순수 위임 파사드를 warning이 아닌 note로 판정하도록 보강
- `scripts/php_structure_findings.py`, `docs/{AUDIT_SYSTEM,AUDIT_STRATEGY,README,TODO,HISTORY}.md`, `docs/audits/WARNING_BUDGETS.toml`를 갱신해 public API가 순수 위임만 하는 façade는 `oversized_service_or_repository` warning에서 제외하고, active structure warning과 warning budget을 0건으로 정리함
  - Why: `AdminSmsRepository`, `AdminSmsService`는 길이는 길지만 실제 책임이 store/service delegation에 머무는 façade인데, 기존 LOC 규칙은 이 둘을 일반 거대 서비스처럼 경고로 처리해 false positive를 만들었다. 구조 감사가 pure delegation façade를 note로만 추적하게 바꾸면 경고는 진짜 아키텍처 드리프트에 집중되고, warning budget도 임시 숨김 장치가 아니라 실제 운영 debt만 담게 된다.

### 코어 env 읽기를 공통 reader/factory 구조로 분리
- `api/v1/Core/Config/{EnvConfig.php,EnvConfigFactory.php,EnvDataPathResolver.php,EnvValueReader.php,EnvLoader.php,RuntimeProfileResolver.php}`를 갱신해 `EnvConfig`에서 env 읽기와 data path 해석 책임을 factory/support로 분리하고, `EnvLoader`·`RuntimeProfileResolver`도 같은 env reader를 재사용하도록 정리함
  - Why: 기존 코어 설정 계층은 `EnvConfig`, `EnvLoader`, `RuntimeProfileResolver`가 각각 `$_ENV/getenv`를 직접 읽고 있어 env fallback 규칙이 클래스마다 따로 흔들리고 있었다. 공통 reader/factory로 수렴해 두면 설정 값 객체, env 해석 규칙, runtime profile 판정을 독립적으로 바꿀 수 있고 core runtime 경계도 더 명확해진다.
- `api/v1/Core/{Middleware/RateLimitMiddleware.php,Security/PasswordPolicy.php,Database/TableRegistry.php}`도 공통 `EnvValueReader`를 사용하도록 정리해 코어 계층의 직접 `$_ENV/getenv` 접근 중복을 줄임
  - Why: rate limit, 비밀번호 정책, 테이블 prefix 해석까지 각자 env fallback을 들고 있으면 운영 변수 적용 규칙이 미세하게 갈라질 수 있다. 코어 계층의 env access를 공통 reader로 수렴해 두면 추후 runtime/profile 정책 변경 시 수정 지점을 줄일 수 있다.
- `api/v1/{Admin/Mail/Service/Support/AdminMailDispatchConfig.php,Admin/System/Service/Support/AdminSystemMailDispatchConfig.php,Auth/External/Support/ExternalAuthConfig.php,Auth/External/Support/ExternalAuthProviderConfig.php}`도 공통 `EnvValueReader`를 사용하도록 정리하고 `tests/Core/Config/EnvValueReaderTest.php`를 추가해 optional bool 규칙까지 고정함
  - Why: 메일 발송 support와 외부 인증 support가 각각 자체 `envString/envBool/envInt` 구현을 들고 있으면 코어 env 규칙을 바꿀 때 support 계층이 다시 드리프트한다. reader를 재사용하고 테스트로 optional bool 의미까지 고정해 두면 이후 runtime/config 정리도 같은 규칙으로 안전하게 확장할 수 있다.
- `api/v1/{Support/Logging/ApiLoggerFactory.php,Middlewares/RequestContextMiddleware.php,Qa/Service/QaAttachmentStorage.php,Qa/Repository/QaRepositorySupport.php}`도 공통 `EnvValueReader`를 사용하도록 정리하고 `tests/Support/Logging/ApiLoggerFactoryTest.php`를 추가함
  - Why: logger level, trusted proxy 해석, QA 첨부 저장소/저장소 support가 각자 env helper를 들고 있으면 운영 환경 변수 규칙이 middleware·qa·logging 계층마다 따로 흔들린다. 이 구간도 공통 reader에 수렴시켜 두면 코어 env 규칙 변경이 횡단 관심사 계층에 일관되게 반영된다.
- `api/v1/{Setup/Service/EnvironmentChecker.php,Setup/Controller/SetupController.php,Core/Plugin/Middleware/LicenseCheckMiddleware.php}`도 공통 `EnvValueReader`를 사용하도록 정리함
  - Why: 설치 점검 경로와 플러그인 라이선스 체크가 별도 env 읽기 규칙을 유지하면 운영/설치 환경에서 값 유무 판단이 코어와 달라질 수 있다. setup/license도 공통 reader 규칙으로 묶어 두면 남는 직접 env 접근이 사실상 DB 연결 팩토리와 reader 자체로만 좁혀진다.

### SMS 레거시 iCode 전송 경계를 factory/normalizer로 분리
- `api/v1/Admin/Sms/Support/{LegacyIcodeTransport.php,LegacyIcodeClientFactory.php,LegacyIcodeEnvironmentBootstrapper.php,LegacyIcodeResultNormalizer.php}`를 갱신하고 `tests/Admin/Sms/LegacyIcodeResultNormalizerTest.php`를 추가해 레거시 client 생성/부트스트랩과 전송 결과 해석 책임을 분리함
  - Why: 기존 `LegacyIcodeTransport`는 레거시 상수 부트스트랩, iCode client 생성, 결과 코드 해석, 휴대폰 포맷팅을 한 파일에 함께 들고 있어 SMS 레거시 경계가 다시 갓파일처럼 비대해질 여지가 있었다. factory와 result normalizer로 갈라 두면 레거시 include/bootstrap과 발송 결과 해석을 독립적으로 테스트/수정할 수 있다.
- `api/v1/Core/Database/PdoConnectionFactory.php`가 공통 `EnvValueReader`를 재사용하도록 정리하고 `tests/Core/Database/PdoConnectionFactoryTest.php`를 추가함
  - Why: DB 연결 팩토리는 `.env 파일 우선 + 런타임 env fallback + 비밀번호 trim 예외`라는 특수 규칙 때문에 마지막까지 직접 env 접근이 남아 있었다. 이 규칙을 reader 재사용 패턴과 테스트로 고정해 두면 남은 direct env access가 reader 자체와 의도된 legacy/global 경계로만 좁혀진다.
- `api/v1/{Comment,File,Like,Memo,Menu,Qa}/Repository/*Repository.php`, 관련 도메인 서비스 테스트, `tests/Support/BuildsDomainServices.php`, `tests/contract/g5-repository/GatewayImplementationContractTest.php`를 갱신해 local-only gateway의 내부 사용처는 도메인 `Contracts/*Gateway`를 기준으로 정리하고, 저장소는 로컬 계약과 deprecated `Integration\Contracts`를 함께 구현하도록 맞춤
  - Why: local-only gateway는 이미 도메인 Contracts가 진실 원본인데도 테스트 조립과 저장소 선언 일부가 여전히 중앙 `Integration\Contracts`를 직접 바라보고 있어 호환층과 실제 경계가 뒤섞여 있었다. 내부 사용처를 로컬 계약으로 수렴시키고 저장소만 이중 구현으로 남겨 두면 도메인 경계는 선명해지고, 옛 namespace를 기대하는 코드와의 하위 호환도 유지된다.
- `tests/contract/g5-repository/GatewayImplementationContractTest.php`에 local-only gateway의 deprecated `Integration\Contracts` 사용처 allowlist 검사를 추가해 `Comment/File/Like/Memo/Menu/Qa` 구 인터페이스가 정의 파일, 호환 저장소, 계약 테스트 바깥으로 다시 새지 않도록 고정함
  - Why: 한번 로컬 계약으로 정리해도 별도 가드가 없으면 다음 수정에서 테스트 조립이나 서비스 코드가 다시 중앙 compatibility namespace를 끌어다 쓸 수 있다. 허용 범위를 계약 테스트로 못 박아 두면 구조 감사가 놓치는 회귀도 빠르게 잡을 수 있다.
- `docs/{README.md,IMPLEMENTATION_ROADMAP.md,TODO.md,AUDIT_STRATEGY.md}`를 현재 구조 정상화 기준으로 현행화해 남은 우선순위를 `SMS legacy iCode bootstrap/global 경계`와 `shared gateway(Auth/Board/Member/Point/Post)` 재분류로 다시 고정함
  - Why: 최근 구조 정리가 많이 진행된 뒤에도 로드맵과 TODO가 외부 인증 smoke만 다음 작업처럼 보이면 실제 실행 순서와 문서 SSOT가 어긋난다. 현재 문서 상태, 남은 구조 부채, blocked 운영 과제를 같은 기준으로 맞춰 두어야 다음 세션이 틀린 우선순위로 출발하지 않는다.
- `api/v1/Admin/Sms/Support/{LegacyIcodeEnvironmentBootstrapper.php,LegacyIcodeClientFactory.php,LegacyIcodeTransport.php}`와 `tests/Admin/Sms/{LegacyIcodeEnvironmentBootstrapperTest.php,LegacyIcodeClientFactoryTest.php}`를 갱신해 legacy iCode 전송이 `$GLOBALS['config']`를 영구 오염시키지 않도록 bootstrap snapshot/restore를 도입하고, client 생성/전송을 그 스코프 안에서만 수행하도록 고정함
  - Why: 레거시 SMS 라이브러리는 전송 중 `global $config`를 직접 읽기 때문에 bootstrap 자체를 없앨 수는 없지만, 이전처럼 전송 후에도 병합된 설정이 전역에 남아 있으면 다음 호출이나 다른 테스트가 legacy config 오염의 영향을 받을 수 있다. snapshot/restore로 오염 시간을 `sendBatch()` 안으로 가두면 레거시 요구사항은 유지하면서도 global side effect를 한 단계 더 줄일 수 있다.
- `api/v1/Admin/Sms/Support/{LegacyIcodeEnvironmentBootstrapper.php,LegacyIcodeClientFactory.php}`와 `tests/Admin/Sms/{LegacyIcodeEnvironmentBootstrapperTest.php,LegacyIcodeClientFactoryTest.php}`를 다시 갱신해 legacy iCode bootstrap이 `cf_icode_token_key` patch만 주입하고 non-token 경로에서는 `$GLOBALS['config']`를 만들지 않도록 줄였으며, helper include도 client 생성 시점으로 이동시키고 legacy client init이 만든 임시 global slot도 factory에서 정리하도록 보강함
  - Why: 실제 legacy lib를 확인해 보니 JSON/token 경로가 읽는 전역 설정은 `cf_icode_token_key`뿐인데도 bootstrapper가 전체 SMS config를 `$GLOBALS['config']`에 병합하고 있었고, non-token 경로도 `global $config` 선언만으로 빈 전역 슬롯을 남길 수 있었다. 전역 오염 범위를 token key 하나로 줄이고 non-token 경로의 임시 global까지 factory에서 정리해 두면 legacy boundary를 더 명확히 유지할 수 있고, helper include도 필요한 순간에만 열리게 된다.
- `api/v1/Point/Contracts/PointGateway.php`를 추가하고 `api/v1/Integration/Contracts/PointGateway.php`, `api/v1/Point/{definitions.php,Repository/PointRepository.php,Service/PointService.php}`, `tests/{Point/PointServiceTest.php,contract/g5-repository/GatewayImplementationContractTest.php}`를 갱신해 Point 도메인 내부의 진실 원본을 local contract로 옮기고 deprecated shared namespace는 cross-domain/plugin 호환면만 허용하도록 allowlist를 축소함
  - Why: `PointGateway`는 plugin reward와 여러 도메인 보상 흐름 때문에 shared를 유지해야 하지만, provider domain인 Point 자신까지 deprecated `Integration\\Contracts`를 계속 참조하면 shared/local 경계가 영원히 줄지 않는다. Point 도메인 내부부터 local contract를 진실 원본으로 고정하면 다음 단계에서 reward/query 포트를 더 잘게 나눌 수 있고, shared namespace는 정말 필요한 cross-domain/plugin surface만 남긴 채 관리할 수 있다.
- `api/v1/{Auth,Post}/Contracts/*Gateway.php`를 추가하고 `api/v1/Integration/Contracts/{Auth,Post}Gateway.php`, 각 도메인 `definitions.php`/repository/service/test와 `tests/{Support/BuildsDomainServices.php,contract/g5-repository/GatewayImplementationContractTest.php}`를 갱신해 Auth/Post 도메인 내부의 진실 원본도 local contract로 옮기고 deprecated shared namespace는 definitions/repository 및 cross-domain/plugin 호환면만 허용하도록 allowlist를 축소함
  - Why: `AuthGateway`와 `PostGateway`도 shared를 유지해야 하는 이유는 남아 있지만, provider domain 자신이 deprecated `Integration\\Contracts`를 계속 쓰면 다음 slim phase에서 identity/read, plugin-facing read/write 같은 더 좁은 포트로 나눌 출발점이 없다. provider domain 내부를 local contract 기준으로 고정해 두면 shared namespace는 정말 필요한 member/middleware/comment/file/plugin surface만 남게 되고, 이후 세분화 작업도 allowlist와 계약 테스트로 더 안전하게 진행할 수 있다.
- `docs/architecture/SHARED_GATEWAY_INVENTORY.md`를 추가하고 `tests/contract/g5-repository/GatewayImplementationContractTest.php`에 shared gateway allowlist guard를 보강해 `Auth/Board/Member/Point/Post`의 cross-domain 사용처를 문서와 테스트로 함께 고정함
  - Why: local-only gateway를 정리한 뒤에도 shared gateway는 “왜 남아 있는지”와 “어디까지가 허용 경계인지”가 문서화돼 있지 않으면 다음 리팩터링에서 임의 확장이나 과잉 localize가 다시 발생할 수 있다. inventory 문서와 계약 테스트를 같이 두면 shared/local 판단 기준이 SSOT와 자동 게이트 양쪽에 동시에 고정된다.

### 메모 목록 저장소를 paged/cursor/detail 구조로 분리
- `api/v1/Memo/Repository/{MemoListQueryRepository.php,MemoPagedListRepository.php,MemoCursorListRepository.php,MemoDetailQueryRepository.php}`를 갱신하고 `tests/Memo/MemoListQueryRepositoryTest.php`를 추가해 메모 목록 페이지 조회, cursor 목록 조회, 상세/읽지 않음 카운트 책임을 별도 저장소로 분리하고 기존 `MemoListQueryRepository`는 파사드 역할만 유지하도록 축소함
  - Why: 기존 메모 목록 저장소는 페이지 목록, cursor 목록, 단건 상세, 읽지 않음 카운트를 한 파일에서 함께 들고 있어 pagination 규칙과 상세/카운트 규칙이 같은 클래스에서 함께 흔들리고 있었다. paged/cursor/detail 경계를 분리해 두면 목록 전략과 단건 조회·뱃지 계산 규칙을 독립적으로 바꿀 수 있고, 저장소 테스트도 더 직접 붙일 수 있다.

### 관리자 신고 저장소를 query/mutation/schema 구조로 분리
- `api/v1/Admin/Report/Repository/{AdminReportRepository.php,AdminReportQueryRepository.php,AdminReportMutationRepository.php,AdminReportSchemaRepository.php}`를 갱신해 신고 저장소에 섞여 있던 목록 조회·통계 집계·상태 변경·컬럼 메타 해석 책임을 각각 별도 저장소로 분리하고, 기존 `AdminReportRepository`는 파사드 역할만 유지하도록 축소함
  - Why: 기존 관리자 신고 저장소는 목록 조회와 상태 변경, 통계 집계, `INFORMATION_SCHEMA` 기반 컬럼 존재 판단까지 한 파일에 함께 들고 있어 운영 테이블 스키마 차이와 관리자 처리 흐름 변경이 같은 클래스에서 함께 흔들리고 있었다. query/mutation/schema 경계를 분리해 두면 조회 규칙, 상태 변경 정책, 선택 컬럼 해석을 독립적으로 바꿀 수 있다.

### 포인트 조회 저장소를 history/summary 파사드 구조로 분리
- `api/v1/Point/Repository/{PointQueryRepository.php,PointHistoryQueryRepository.php,PointSummaryQueryRepository.php}`를 갱신해 포인트 조회 저장소에 섞여 있던 이력 pagination/cursor 조회 책임과 중복 지급 확인·합계 조회 책임을 각각 별도 저장소로 분리하고, 기존 `PointQueryRepository`는 query 파사드로 축소함
  - Why: 기존 `PointQueryRepository`는 포인트 이력 조회와 집계/중복 확인 규칙을 같은 파일에서 함께 들고 있어 cursor 규칙 변경과 합계·중복 정책 변경이 한 클래스에서 함께 흔들리고 있었다. history/summary를 분리해 두면 읽기 pagination 규칙과 포인트 집계 정책을 독립적으로 바꿀 수 있다.

### 관리자 메일 수신자 저장소를 list/send 전용 저장소로 분리
- `api/v1/Admin/Mail/Repository/{AdminMailRecipientRepository.php,AdminMailRecipientListRepository.php,AdminMailRecipientSendRepository.php}`를 갱신하고 `tests/Admin/Mail/AdminMailRecipientRepositoryTest.php`를 추가해 수신자 목록 조회와 발송 대상 선별을 별도 저장소로 분리하고, 기존 `AdminMailRecipientRepository`는 파사드 역할만 유지하도록 축소함
  - Why: 기존 메일 수신자 저장소는 관리자 목록 pagination과 실제 발송 대상 선별 SQL을 같은 파일에서 함께 들고 있어 화면 검색 조건 변경과 발송 대상 규칙 변경이 한 클래스에서 함께 흔들리고 있었다. list/send 전용 저장소로 나누면 관리자 조회 흐름과 발송 대상 산정 규칙을 독립적으로 바꿀 수 있고, 저장소 단위 테스트도 더 직접 붙일 수 있다.

### 관리자 투표 서비스에서 입력·tracker·포인트 지급 책임을 분리
- `api/v1/Admin/Poll/Service/{AdminPollVoteService.php,Support/AdminPollVoteInputNormalizer.php,Support/AdminPollVoteTracker.php,Support/AdminPollVoteRewardService.php}`를 갱신해 투표 서비스에 섞여 있던 `po_id/poll_no` 검증, 회원 판정, 중복 투표 tracker 문자열 처리, 참여 포인트 지급 책임을 별도 support로 분리하고, 기존 `AdminPollVoteService`는 active/vote orchestration에 집중하도록 축소함
  - Why: 기존 투표 서비스는 활성 투표 조회와 투표 처리 외에 입력 정규화, IP/회원 중복 tracker 파싱, 포인트 지급 정책까지 함께 들고 있어 투표 참여 정책과 부수효과 변경이 같은 클래스에서 함께 흔들리고 있었다. 입력·tracker·reward 축을 분리해 두면 투표 도메인 정책과 포인트 지급 정책을 독립적으로 바꿀 수 있다.

### 관리자 FAQ 서비스에서 입력 정규화와 pagination 조립을 분리
- `api/v1/Admin/Faq/Service/{AdminFaqService.php,Support/AdminFaqInputNormalizer.php,Support/AdminFaqPaginationBuilder.php}`를 갱신해 FAQ 서비스에 섞여 있던 목록 query 정규화, FAQ 식별자/마스터 검증용 값 정리, pagination 응답 조립 책임을 별도 support로 분리하고, 기존 `AdminFaqService`는 FAQ CRUD와 FAQ 마스터 delegation에 집중하도록 축소함
  - Why: 기존 FAQ 서비스는 FAQ CRUD facade 위에 목록 query 보정과 pagination 조립, 식별자 검증까지 함께 들고 있어 FAQ 저장 규칙과 목록 입력 정책이 같은 클래스에서 함께 흔들리고 있었다. 입력 정규화와 pagination 조립을 분리해 두면 FAQ mutation 흐름과 목록/검증 규칙을 독립적으로 바꿀 수 있다.

### 인증 세션 서비스에서 토큰 관리와 세션 발급 책임을 분리
- `api/v1/Auth/Service/{AuthSessionService.php,Support/AuthSessionIssuer.php,Support/AuthSessionTokenManager.php}`를 갱신해 인증 세션 서비스에 섞여 있던 refresh/logout 토큰 폐기 규칙과 로그인 후 세션 발급·포인트 동기화·이벤트 발행 책임을 각각 별도 support로 분리하고, 기존 `AuthSessionService`는 로그인 검증 orchestration에 집중하도록 축소함
  - Why: 기존 `AuthSessionService`는 로그인 검증 외에 refresh/logout 토큰 관리와 세션 발급 후 부수효과까지 한 파일에 함께 들고 있어 세션 정책 변경과 토큰 수명주기 변경이 같은 클래스에서 함께 흔들리고 있었다. 토큰 관리와 세션 발급을 분리해 두면 인증 입력 검증, 토큰 폐기 정책, 로그인 후 side effect를 독립적으로 바꿀 수 있다.

### 게시글 읽기 서비스에서 문맥 해석과 응답 조립을 분리
- `api/v1/Post/Service/{PostReadService.php,Support/PostReadContextResolver.php,Support/PostReadResultBuilder.php}`를 갱신해 게시글 읽기 서비스에 섞여 있던 게시판/게시글 읽기 문맥 해석과 목록·새글 pagination 응답 조립 책임을 각각 별도 support로 분리하고, 기존 `PostReadService`는 권한 검증 이후 gateway orchestration에 집중하도록 축소함
  - Why: 기존 `PostReadService`는 read 흐름 자체보다 게시판 존재/권한 판정과 pagination 응답 배열 조립 코드가 섞여 있어 읽기 정책과 응답 shape 변경이 같은 클래스에서 함께 흔들리고 있었다. 문맥 해석과 응답 조립을 분리해 두면 게시글 조회 정책과 목록 응답 형식을 독립적으로 바꿀 수 있다.

### QA 쓰기 서비스에서 문맥 해석과 payload 조립을 분리
- `api/v1/Qa/Service/{QaWriteService.php,Support/QaWriteContextResolver.php,Support/QaWritePayloadBuilder.php}`를 갱신해 QA 쓰기 서비스에 섞여 있던 답변/연관질문 기준 글 해석과 질문·답변 payload 조립 책임을 각각 별도 support로 분리하고, 기존 `QaWriteService`는 첨부 처리와 gateway orchestration에 집중하도록 축소함
  - Why: 기존 `QaWriteService`는 질문/답변/연관질문 생성 흐름 자체보다 parent/origin 해석과 payload 배열 조립 코드가 더 길게 들어 있어 QA 정책 변경과 저장 흐름이 한 파일에서 함께 흔들리고 있었다. 문맥 해석과 payload 조립을 분리해 두면 QA 쓰기 정책과 persistence orchestration을 독립적으로 바꿀 수 있다.

### 게시글 payload 정규화에서 content·option·link 규칙을 분리
- `api/v1/Post/Service/{PostPayloadNormalizer.php,Support/PostContentInputNormalizer.php,Support/PostOptionNormalizer.php,Support/PostLinkNormalizer.php}`를 갱신해 게시글 payload 정규화기에 섞여 있던 제목/본문·카테고리 sanitizing, 옵션 token/공지 bool 처리, 링크 URL 검증 책임을 각각 별도 support로 분리하고, 기존 `PostPayloadNormalizer`는 create/reply/update payload 조합 파사드로 축소함
  - Why: 기존 `PostPayloadNormalizer`는 단순 helper처럼 보였지만 실제로는 텍스트 sanitizing, category 인코딩 검증, secret option 정책, 링크 URL validation까지 서로 다른 변경 이유를 한 파일에 들고 있었다. content/option/link 경계를 분리해 두면 게시글 작성 정책과 입력 형식 규칙을 독립적으로 바꿀 수 있고, post mutation 계층도 더 명확한 입력 축을 재사용할 수 있다.

### 인증 복구 서비스에서 입력 정규화·회원 해석·민감 응답 조립을 분리
- `api/v1/Auth/Service/{AuthRecoveryService.php,Support/AuthRecoveryInputNormalizer.php,Support/AuthRecoveryMemberResolver.php,Support/AuthRecoveryResponseBuilder.php}`를 갱신해 인증 복구 서비스에 섞여 있던 이메일/아이디/비밀번호 입력 검증, 비밀번호 재설정 대상 회원 선택, 민감 토큰 노출 응답 조립 책임을 각각 별도 support로 분리하고, 기존 `AuthRecoveryService`는 메일 발송과 gateway orchestration에 집중하도록 축소함
  - Why: 기존 `AuthRecoveryService`는 비밀번호 재설정/이메일 재인증 흐름 자체보다 입력 검증과 회원 판정, 환경별 응답 shape 조립 코드가 더 많은 상태여서 recovery 정책 변경과 메일 orchestration이 같은 클래스에서 함께 흔들리고 있었다. 입력/회원/응답 경계를 분리해 두면 복구 정책과 노출 정책을 독립적으로 바꿀 수 있다.

### 게시글 스크랩 mutation 저장소에서 write와 count 동기화를 분리
- `api/v1/Post/Repository/{PostScrapMutationRepository.php,PostScrapWriteStore.php,PostScrapCountStore.php}`를 갱신해 스크랩 mutation 저장소에 섞여 있던 insert/delete 트랜잭션과 회원 스크랩 수 동기화 책임을 각각 별도 store로 분리하고, 기존 `PostScrapMutationRepository`는 공개 gateway 시그니처를 유지하는 위임 파사드로 축소함
  - Why: 기존 `PostScrapMutationRepository`는 스크랩 저장소처럼 보이지만 실제로는 중복 확인/insert/delete, named lock, 회원별 count 재계산, 게시글 삭제 시 fan-out 동기화까지 모두 한 파일에 들고 있어 write 규칙과 count 유지 규칙이 같은 경계에서 함께 흔들리고 있었다. write와 count store를 분리해 두면 트랜잭션 경계와 파생 카운트 유지 정책을 독립적으로 바꿀 수 있다.

### 관리자 게시판 서비스에서 입력 정규화와 pagination 조립을 분리
- `api/v1/Admin/Board/Service/{AdminBoardService.php,Support/AdminBoardInputNormalizer.php,Support/AdminBoardPaginationBuilder.php}`를 갱신해 게시판 서비스에 섞여 있던 목록 query 정규화, `bo_table`/`gr_id`/copy target 검증, pagination 조립 책임을 별도 support로 분리하고, 기존 `AdminBoardService`는 게시판 CRUD/복사 orchestration에 집중하도록 축소함
  - Why: 기존 게시판 서비스는 저장소 facade 위에 입력 검증과 pagination 조립까지 한 파일에 같이 들고 있어 목록 query 규칙 변경과 게시판 copy/CRUD 정책이 같은 경계에서 흔들리고 있었다. 입력 정규화와 pagination 조립을 분리해 두면 목록/검증 정책과 게시판 mutation 흐름을 독립적으로 바꿀 수 있다.

### 관리자 그룹 서비스에서 입력 정규화와 회원 관리 책임을 분리
- `api/v1/Admin/Group/Service/{AdminGroupService.php,AdminGroupMemberService.php,Support/AdminGroupInputNormalizer.php}`를 갱신해 그룹 서비스에 섞여 있던 `gr_id`/`gr_subject`/flag/member id 정규화와 그룹 회원 pagination·추가·삭제 책임을 별도 서비스/support로 분리하고, 기존 `AdminGroupService`는 그룹 CRUD facade로 축소함
  - Why: 기존 그룹 서비스는 그룹 CRUD와 그룹 회원 관리, 입력 형식 검증을 한 파일에 같이 들고 있어 그룹 metadata 변경과 회원 관리 규칙 수정이 같은 경계에서 흔들리고 있었다. 입력 규칙과 membership 흐름을 분리해 두면 group CRUD와 membership 정책을 독립적으로 바꿀 수 있다.

### 관리자 설정 저장소에서 update allowlist 조립을 builder로 분리
- `api/v1/Admin/Config/Repository/{AdminConfigRepository.php,AdminConfigUpdateBuilder.php}`를 갱신해 설정 저장소에 길게 박혀 있던 update allowlist와 SQL set/param 조립 책임을 별도 builder로 분리하고, 기존 `AdminConfigRepository`는 config 조회와 실제 update 실행 orchestration에 집중하도록 축소함
  - Why: 기존 설정 저장소는 단순 repository처럼 보이지만 실제로는 수백 줄의 allowlist와 payload-to-SQL 조립을 함께 들고 있어 설정 필드 추가와 persistence 경계가 한 파일에서 같이 흔들리고 있었다. update builder를 분리해 두면 allowlist 갱신과 저장소 경계를 독립적으로 바꿀 수 있다.

### 댓글 서비스에서 문맥 조회와 생성/삭제 부수효과를 분리
- `api/v1/Comment/Service/{CommentService.php,Support/CommentContextService.php,Support/CommentMutationLifecycle.php}`를 갱신해 댓글 서비스에 섞여 있던 원글/부모댓글/대상댓글 문맥 조회와 생성·삭제 후 point/board_new/event 부수효과를 별도 support로 분리하고, 기존 `CommentService`는 권한 확인과 orchestration에 집중하도록 축소함
  - Why: 기존 댓글 서비스는 공개 API 흐름은 짧지만 실제로는 문맥 조회, 부모댓글 유효성 확인, point 부여/회수, board_new/카운트 갱신, 이벤트 발행까지 여러 변경 이유를 한 파일에 같이 들고 있었다. 조회 경계와 부수효과 경계를 분리해 두면 댓글 정책과 persistence/event 규칙을 독립적으로 바꿀 수 있다.

### QA 입력 서비스에서 텍스트·권한·일반 값 정규화를 분리
- `api/v1/Qa/Service/{QaInputService.php,Support/QaTextInput.php,Support/QaActorInput.php,Support/QaScalarInput.php}`를 갱신해 QA 입력 서비스에 섞여 있던 카테고리/본문 sanitizing, 멤버 권한 판정, 이메일·전화·flag·pagination 정규화를 각각 별도 support로 분리하고, 기존 `QaInputService`는 얇은 facade로 축소함
  - Why: 기존 입력 서비스는 helper 모음처럼 보였지만 실제로는 텍스트 sanitizing과 관리자 판정, 일반 값 coercion 규칙이 한 파일에 섞여 있어 작은 입력 규칙 수정도 unrelated helper를 함께 건드리게 만들고 있었다. 입력 축을 분리해 두면 QA 쓰기/읽기 서비스가 필요한 규칙을 더 명확히 재사용할 수 있다.

### 관리자 게시판 mutation 저장소에서 payload 조립과 copy 경로를 분리
- `api/v1/Admin/Board/Repository/{AdminBoardMutationRepository.php,AdminBoardMutationPayloadBuilder.php,AdminBoardCopyStore.php}`를 갱신해 게시판 mutation 저장소에 섞여 있던 create/update payload 조립과 게시판 copy/write table 복제 책임을 각각 별도 builder/store로 분리하고, 기존 mutation 저장소는 write orchestration에 집중하도록 축소함
  - Why: 기존 `AdminBoardMutationRepository`는 게시판 쓰기 저장소처럼 보이지만 실제로는 payload 조립 규칙과 copy 시 전체 row/쓰기 테이블 복제까지 함께 들고 있어 게시판 필드 변경과 copy 정책이 한 파일에서 같이 흔들리고 있었다. builder와 copy store를 분리해 두면 board field 조립 규칙과 copy 경로를 독립적으로 바꿀 수 있다.

### 관리자 대시보드 recent 저장소를 회원·게시글·포인트 축으로 분리
- `api/v1/Admin/Dashboard/Repository/{AdminDashboardRecentRepository.php,AdminDashboardRecentMemberRepository.php,AdminDashboardRecentPostRepository.php,AdminDashboardRecentPointRepository.php}`를 갱신해 대시보드 recent 저장소에 섞여 있던 회원/게시글/포인트 최근 조회 책임을 각각 별도 저장소로 분리하고, 기존 `AdminDashboardRecentRepository`는 recent facade로 축소함
  - Why: 기존 recent 저장소는 recent list를 모아주는 용도처럼 보이지만 실제로는 세 도메인의 쿼리와 게시글 hydrate 규칙까지 모두 한 파일에 들어 있어 대시보드 한 영역 변경이 다른 recent query에 같이 파급되고 있었다. 조회 축을 나눠 두면 대시보드 recent card별 쿼리와 hydrate 규칙을 독립적으로 조정할 수 있다.

### 게시글 답글 저장소에서 순번 계산과 실제 쓰기 책임을 분리
- `api/v1/Post/Repository/{PostReplyRepository.php,PostReplySequenceResolver.php,PostReplyWriteStore.php}`를 갱신해 답글 저장소에 섞여 있던 reply depth/순번 계산과 실제 write/board_new 갱신 책임을 각각 별도 resolver/store로 분리하고, 기존 `PostReplyRepository`는 답글 생성 orchestration에 집중하도록 축소함
  - Why: 기존 `PostReplyRepository`는 답글 저장소처럼 보이지만 실제로는 원글 조회, 다음 reply 문자 계산, secret option 보정, write insert, board_new/카운트 갱신까지 여러 변경 이유를 한 파일에 같이 들고 있었다. 순번 계산과 쓰기 경로를 분리해 두면 답글 순서 정책과 persistence 규칙을 독립적으로 바꿀 수 있고, 이후 post write 쪽 공통 정책 재사용도 쉬워진다.

### 인증 저장소 공통 support에서 config·입력·timed token 책임을 분리
- `api/v1/Auth/Repository/{AuthRepositorySupport.php,AuthRepositoryConfigSupport.php,AuthRepositoryInputSupport.php,AuthRepositoryTimedTokenSupport.php}`를 갱신해 인증 저장소 기반 클래스에 섞여 있던 설정 조회 fallback, 입력 정규화, timed token encode/decode 책임을 각각 별도 support trait로 분리하고, 기존 `AuthRepositorySupport`는 공통 의존성 보관과 조합 역할에 집중하도록 축소함
  - Why: `AuthRepositorySupport`는 저장소 기반 클래스처럼 보이지만 실제로는 config fallback, password policy, 입력 정규화, token codec까지 여러 축을 한 파일에 같이 들고 있어 인증 규칙 변경과 저장소 경계 변경이 함께 흔들리고 있었다. support를 분리해 두면 recovery/registration/member policy 저장소들이 공통 규칙을 재사용하면서도 설정·입력·token 책임을 독립적으로 바꿀 수 있다.

### 파일 서비스 공통 support에서 입력·메타데이터·스토리지 책임을 분리
- `api/v1/File/Service/{FileOperationSupport.php,FileInputSupport.php,FileMetadataSupport.php,FileStorageSupport.php}`를 갱신해 파일 서비스 공통 trait에 섞여 있던 업로드 입력 검증, 이미지/ MIME 판별, 파일시스템 디렉터리/권한/아티팩트 정리 책임을 각각 별도 support trait로 분리하고, 기존 `FileOperationSupport`는 서비스 조합용 얇은 래퍼로 축소함
  - Why: 기존 `FileOperationSupport`는 파일 서비스 기반 trait처럼 보이지만 실제로는 요청값 정규화, 업로드 검증, 이미지 판독, 디렉터리 생성, 파일 삭제까지 서로 다른 변경 이유를 한 파일에 같이 들고 있었다. 입력 규칙과 파일시스템 정책을 분리해 두면 업로드 검증 변경이 스토리지 정리 로직을 함께 흔들지 않고, `FileUploadService`/`FileReadService`/`FileDeleteService`도 필요한 공통 책임을 더 명확히 공유할 수 있다.

### 포인트 지급 저장소에서 실제 mutation 쓰기 책임을 분리
- `api/v1/Point/Repository/{PointGrantStore.php,PointGrantMutationStore.php}`를 갱신해 포인트 지급 저장소에 섞여 있던 named lock orchestration과 실제 point/member insert/update mutation 책임을 분리하고, 기존 `PointGrantStore`는 지급/회수 lock orchestration과 원본 포인트 조회 흐름에 집중하도록 축소함
  - Why: `PointGrantStore`는 포인트 지급 lock store처럼 보이지만 실제로는 중복 체크, 회원 잔액 확인, 만료 계산, point/member 테이블 transaction 쓰기까지 한 파일에 같이 들어 있어 lock 정책 변경과 persistence 규칙이 같은 경계에서 함께 흔들리고 있었다. mutation store를 분리해 두면 lock orchestration과 실제 point ledger 쓰기를 독립적으로 바꿀 수 있고, 포인트 회수도 같은 쓰기 경로를 재사용할 수 있다.

### 외부 인증 provider mapper에서 성공/실패 응답 builder를 분리
- `api/v1/Auth/External/Provider/Support/{GoogleExternalAuthResultMapper.php,GoogleExternalAuthFailureBuilder.php,GoogleExternalAuthSuccessBuilder.php,KakaoExternalAuthResultMapper.php,KakaoExternalAuthFailureBuilder.php,KakaoExternalAuthSuccessBuilder.php}`를 갱신해 Google/Kakao provider mapper에 섞여 있던 실패 응답 조합, token payload sanitizing, provider tx id 생성과 성공 user payload 조합 책임을 각각 별도 builder로 분리하고, 기존 result mapper는 provider별 error/status 분기 orchestration에 집중하도록 축소함
  - Why: Google/Kakao provider result mapper는 adapter support처럼 보이지만 실제로는 provider error/status 분기와 성공 payload compose, token sanitizing, tx id 생성까지 한 파일에 함께 들어 있어 응답 규칙 변경과 payload 조합 규칙이 같은 클래스에서 같이 흔들리고 있었다. provider별 failure/success builder를 분리해 두면 provider 상태 분기와 payload 조합 규칙을 독립적으로 바꿀 수 있고, adapter mapper도 결과 분기 책임에 더 집중할 수 있다.

### 게시글 변경 서비스에서 접근 가드와 이벤트 브리지를 분리
- `api/v1/Post/Service/{PostMutationService.php,Support/PostMutationAccessGuard.php,Support/PostMutationEventBridge.php}`를 갱신해 게시글 생성/수정/답글 서비스에 함께 있던 board access 검증, 작성 지연 확인, 원글/작성자 권한 확인과 `post.creating`/`post.created`/`post.updated` 이벤트 payload 조합 책임을 각각 별도 support로 분리하고, 기존 `PostMutationService`는 게시글 저장 orchestration에 집중하도록 축소함
  - Why: `PostMutationService`는 게시글 변경 orchestration 서비스처럼 보이지만 실제로는 접근 정책 검증과 이벤트 payload compose까지 한 파일에 같이 들어 있어 글쓰기 정책 변경과 이벤트 계약 조합이 같은 클래스에서 함께 흔들리고 있었다. access guard와 event bridge를 분리해 두면 권한/지연 정책과 이벤트 조합 규칙을 독립적으로 바꿀 수 있고, 게시글 mutation 서비스도 저장 흐름에 더 집중할 수 있다.

### 외부 인증 결과/요청 support를 값 정규화와 state/token 책임으로 분리
- `api/v1/Auth/External/Service/Support/{ExternalAuthResultBuilder.php,ExternalAuthResultValueNormalizer.php,ExternalAuthTransitionTokenIssuer.php}`를 갱신해 외부 인증 결과 조합 support에 함께 있던 status/optional value 정규화와 transition token 발급 책임을 별도 support로 분리하고, 기존 `ExternalAuthResultBuilder`는 start/complete 응답 조합에 집중하도록 축소함
  - Why: `ExternalAuthResultBuilder`는 외부 인증 결과 응답 builder처럼 보이지만 실제로는 provider result 상태 검증, optional payload/meta 정규화, transition token 발급까지 한 파일에 같이 들어 있어 응답 shape 변경과 token 발급 규칙이 같은 클래스에서 함께 흔들리고 있었다. value normalizer와 token issuer를 분리해 두면 결과 조합과 token 정책을 독립적으로 바꿀 수 있고, 외부 인증 결과 응답 builder도 조합 책임에 더 집중할 수 있다.
- `api/v1/Auth/External/Service/Support/{ExternalAuthRequestNormalizer.php,ExternalAuthInputValueNormalizer.php,ExternalAuthStateResolver.php}`를 갱신해 외부 인증 요청 정규화 support에 함께 있던 provider/flow/url/scopes/payload 정규화와 state 생성·검증 책임을 각각 support로 분리하고, 기존 `ExternalAuthRequestNormalizer`는 start/complete 입력 shape 조합에 집중하도록 축소함
  - Why: `ExternalAuthRequestNormalizer`는 외부 인증 요청 입력 normalizer처럼 보이지만 실제로는 provider/flow/url validation, scenario/runtime 규칙, state 생성과 replay 검증까지 한 파일에 같이 들어 있어 입력 schema 변경과 state 검증 정책이 같은 경계에서 함께 흔들리고 있었다. 입력 value normalizer와 state resolver를 분리해 두면 입력 규칙과 state 정책을 독립적으로 바꿀 수 있고, 외부 인증 request normalizer도 API 입력 shape 조합에 더 집중할 수 있다.

### 게시판 저장소에서 read query를 분리하고 관리자 권한 서비스 입력/출력을 support로 분리
- `api/v1/Board/Repository/{BoardRepository.php,BoardQueryRepository.php}`를 갱신해 게시판 저장소에 함께 있던 board/group 조회 SQL, 그룹 접근 회원 확인, config 읽기 책임을 별도 query repository로 분리하고, 기존 `BoardRepository`는 공개 gateway 시그니처를 유지하는 위임 파사드로 축소함
  - Why: `BoardRepository`는 게시판 gateway처럼 보이지만 실제로는 board detail/list 조회, group membership 조회, config 조회, write table 노출이 한 파일에 함께 있어 게시판 조회 SQL 변경과 write table 규칙이 같은 경계에서 같이 흔들리고 있었다. query repository를 분리해 두면 board read 규칙과 gateway 파사드 경계를 독립적으로 바꿀 수 있고, BoardService가 기대하는 공개 계약도 그대로 유지할 수 있다.
- `api/v1/Admin/Auth/Service/{AdminAuthService.php,Support/AdminAuthPayloadNormalizer.php,Support/AdminAuthPresenter.php}`를 갱신해 관리자 권한 서비스에 함께 있던 `mb_id/au_menu/au_auth` 정규화와 회원별 auth group/pagination 응답 조합 책임을 각각 support로 분리하고, 기존 `AdminAuthService`는 권한 확인과 저장 orchestration에 집중하도록 축소함
  - Why: `AdminAuthService`는 관리자 권한 orchestration 서비스처럼 보이지만 실제로는 권한 payload validation과 member 기준 응답 compose까지 한 파일에 같이 들어 있어 입력 규칙 변경과 응답 shape 조합이 같은 클래스에서 함께 흔들리고 있었다. normalizer/presenter를 분리해 두면 입력 검증과 응답 조합을 독립적으로 바꿀 수 있고, 관리자 auth 서비스도 저장 흐름과 접근 제어에 더 집중할 수 있다.

### 게시글 scrap 조회 저장소에서 hydrate 책임을 분리
- `api/v1/Post/Repository/{PostScrapQueryRepository.php,PostScrapHydratorRepository.php}`를 갱신해 게시글 scrap 조회 저장소에 함께 있던 scrap 목록/커서 조회 SQL과 게시글 hydrate 책임을 분리하고, 기존 `PostScrapQueryRepository`는 paging query와 cursor 조합에 집중하도록 축소함
  - Why: `PostScrapQueryRepository`는 scrap 조회 저장소처럼 보이지만 실제로는 scrap 목록 조회와 게시글 write table 탐색, 게시글 hydrate까지 한 파일에 같이 들어 있어 scrap paging 규칙을 바꾸는 작업이 게시글 hydrate 규칙과 함께 흔들리고 있었다. hydrator를 분리해 두면 scrap 목록 query와 게시글 compose 규칙을 독립적으로 바꿀 수 있고, 게시글 read 계층도 이미 적용한 query/hydrator 패턴과 더 일관된 구조를 유지할 수 있다.

### 회원가입 서비스에서 입력 payload 조합과 포인트 지급을 support로 분리
- `api/v1/Auth/Service/{AuthRegistrationService.php,Support/AuthRegistrationPayloadBuilder.php,Support/AuthRegistrationPointService.php}`를 갱신해 회원가입 서비스에 함께 있던 본인확인 필드 차단, 입력 정규화/검증, registerMember payload 조합과 가입/추천 포인트 지급·이벤트 발행 책임을 각각 별도 support로 분리하고, 기존 `AuthRegistrationService`는 회원 생성, 토큰 발급, 메일 통지 orchestration에 집중하도록 축소함
  - Why: `AuthRegistrationService`는 회원가입 orchestration 서비스처럼 보이지만 실제로는 입력 payload 조합과 포인트 지급/이벤트 발행까지 한 파일에 같이 들어 있어 회원 생성 정책 수정이 포인트 지급 흐름과 함께 흔들리고 있었다. payload builder와 point service를 분리해 두면 가입 validation 규칙과 포인트 지급 정책을 독립적으로 바꿀 수 있고, auth 서비스도 토큰/메일 orchestration에 더 집중할 수 있다.

### 외부 인증 연결 저장소를 query/mutation repository로 분리
- `api/v1/Auth/External/Repository/{ExternalAuthLinkRepository.php,ExternalAuthLinkRepositorySupport.php,ExternalAuthLinkQueryRepository.php,ExternalAuthLinkMutationRepository.php}`를 갱신해 외부 인증 연결 저장소에 섞여 있던 provider-user 조회/회원별 목록 조회와 링크 upsert/삭제, 테이블 bootstrap/입력 정규화를 각각 별도 repository/support로 분리하고, 기존 `ExternalAuthLinkRepository`는 공개 시그니처를 유지하는 위임 파사드로 축소함
  - Why: `ExternalAuthLinkRepository`는 외부 인증 연결 저장소처럼 보이지만 실제로는 조회 SQL, link upsert, 삭제, table bootstrap, provider/member/email 정규화가 한 파일에 함께 들어 있어, 링크 persistence 변경과 identity validation 규칙 변경이 같은 경계에서 같이 흔들리고 있었다. query/mutation/support 경계를 나눠 두면 외부 인증 연결 조회와 저장 정책을 독립적으로 바꿀 수 있고, static table bootstrap semantics도 유지한 채 auth external 도메인의 구조 경계를 더 선명하게 만들 수 있다.

### 관리자 레이아웃 서비스에서 입력 정규화를 support로 분리
- `api/v1/Admin/Layout/Service/{AdminLayoutService.php,Support/AdminLayoutInputNormalizer.php}`를 갱신해 관리자 레이아웃 서비스에 섞여 있던 page/widget id 검증, widget payload 정규화, patch/reorder 입력 해석, pagination 입력 정규화를 별도 support로 분리하고, 기존 `AdminLayoutService`는 repository orchestration과 not-found 판정에 집중하도록 축소함
  - Why: `AdminLayoutService`는 레이아웃 관리 서비스처럼 보이지만 실제로는 목록 pagination 해석, page/widget identifier 검증, 위젯 전체 payload 정규화, patch payload 해석이 한 파일에 함께 들어 있어 레이아웃 저장 흐름과 입력 검증 규칙이 같은 파일에서 같이 흔들리고 있었다. input normalizer를 분리해 두면 관리자 레이아웃 포팅이나 widget 타입 정책 변경 시 수정 경계를 더 좁힐 수 있고, 서비스는 저장 orchestration에 더 집중할 수 있다.

### 파일 레코드 저장소를 query/mutation store로 분리
- `api/v1/File/Repository/{FileRecordRepository.php,FileRecordQueryStore.php,FileRecordMutationStore.php}`를 갱신해 파일 레코드 저장소에 섞여 있던 파일 개수/다음 `bf_no`/단건·목록 조회와 파일 레코드 생성·삭제, 다운로드 카운트, 게시글 `wr_file` 집계 갱신을 각각 별도 store로 분리하고, 기존 `FileRecordRepository`는 공개 시그니처를 유지하는 위임 파사드로 축소함
  - Why: `FileRecordRepository`는 첨부파일 저장소처럼 보이지만 실제로는 조회 SQL과 파일 row 쓰기, 게시글 파일 수 집계 갱신이 한 파일에 함께 들어 있어 조회 규칙을 바꾸는 작업이 쓰기/집계 갱신과 같이 흔들릴 수 있었다. query/mutation 경계를 분리해 두면 파일 조회 규칙과 첨부 변경·집계 규칙을 독립적으로 바꿀 수 있고, 파일 도메인도 이미 적용한 read/write 파사드 패턴과 더 일관된 구조를 유지할 수 있다.

### 알림 저장소를 log/settings repository로 분리
- `api/v1/Notification/Repository/{NotificationRepository.php,NotificationRepositorySupport.php,NotificationLogRepository.php,NotificationSettingRepository.php}`를 갱신해 알림 저장소에 함께 있던 push log 목록/커서 조회와 알림 수신 설정 조회·저장을 각각 별도 repository로 분리하고, 기존 `NotificationRepository`는 공개 시그니처를 유지하는 위임 파사드로 축소함
  - Why: `NotificationRepository`는 알림 저장소처럼 보이지만 실제로는 push log read 모델과 수신 설정 upsert 모델이 한 파일에 함께 들어 있어, 로그 페이징 규칙 변경과 설정 persistence 변경이 같은 경계에서 같이 흔들리고 있었다. log/settings 경계를 나눠 두면 목록 조회와 설정 저장을 독립적으로 바꿀 수 있고, 알림 도메인도 read/settings 파사드 구조를 더 명확하게 유지할 수 있다.

### 메모 변경 저장소를 send/state/member-signal store로 분리
- `api/v1/Memo/Repository/{MemoMutationRepository.php,MemoSendStore.php,MemoStateStore.php,MemoMemberSignalStore.php}`를 갱신해 메모 변경 저장소에 함께 있던 쪽지 발송 트랜잭션, 읽음/삭제 상태 변경, 회원 memo count/call 신호 갱신을 각각 별도 store로 분리하고, 기존 `MemoMutationRepository`는 공개 시그니처를 유지하는 위임 파사드로 축소함
  - Why: `MemoMutationRepository`는 메모 변경 저장소처럼 보이지만 실제로는 쪽지 row 쓰기 트랜잭션과 읽음/삭제 상태 갱신, 회원 메모 카운트 신호 갱신이라는 서로 다른 변경 이유를 한 파일에서 같이 들고 있었다. send/state/member-signal 경계를 나눠 두어야 쪽지 저장 규칙을 바꾸면서 회원 집계 신호를 건드리지 않을 수 있고, 메모 도메인도 이미 적용한 mutation facade 패턴과 더 일관된 구조를 유지할 수 있다.

### 회원 제약 저장소를 uniqueness/policy repository로 분리
- `api/v1/Member/Repository/{MemberConstraintRepository.php,MemberUniquenessRepository.php,MemberPolicyConstraintRepository.php}`를 갱신해 회원 제약 저장소에 섞여 있던 닉네임/이메일/휴대전화 중복 조회와 금지 닉네임/금지 이메일/닉네임 변경 주기 정책 조회를 각각 별도 repository로 분리하고, 기존 `MemberConstraintRepository`는 공개 시그니처를 유지하는 위임 파사드로 축소함
  - Why: `MemberConstraintRepository`는 회원 검증 저장소 하나처럼 보이지만 실제로는 DB uniqueness 조회와 환경설정/DB 기반 정책 해석이 한 파일에 함께 들어 있어, 중복 검사 규칙 변경과 금지어/쿨다운 정책 변경이 같은 경계에서 같이 흔들리고 있었다. uniqueness/policy 축을 분리해 두면 회원 가입/수정 validation 규칙과 정책 해석을 독립적으로 바꿀 수 있고, 회원 도메인 검증 계층도 더 명확한 read/policy 경계를 유지할 수 있다.

### 게시판 서비스에서 필터/권한/상세 응답 조합을 support로 분리
- `api/v1/Board/Service/{BoardService.php,Support/BoardFilterNormalizer.php,Support/BoardAccessPolicy.php,Support/BoardDetailPresenter.php}`를 갱신해 게시판 서비스에 섞여 있던 group filter 정규화, 그룹 접근/권한 판정, 상세 응답 조합을 별도 support로 분리하고, 기존 `BoardService`는 gateway 호출과 공개 정책 API에 집중하도록 축소함
  - Why: `BoardService`는 게시판 조회 서비스처럼 보이지만 실제로는 입력 정규화, 그룹 접근 정책, 관리자 역할 판정, 상세 응답 조합이 한 파일에 함께 들어 있어 권한 정책 수정과 응답 필드 유지보수가 같은 파일에서 같이 흔들리고 있었다. support 분리를 해 두면 접근 정책과 응답 조합을 독립적으로 다룰 수 있고, 게시판 계약 수정도 더 좁은 경계에서 처리할 수 있다.

### 관리자 포인트 서비스에서 입력 정규화와 결과 조합을 support로 분리
- `api/v1/Admin/Point/Service/{AdminPointService.php,Support/AdminPointInputNormalizer.php,Support/AdminPointResultBuilder.php}`를 갱신해 관리자 포인트 서비스에 함께 있던 pagination/member id/po_ids 정규화와 지급·차감 결과 응답 조합을 별도 support로 분리하고, 기존 `AdminPointService`는 repository/gateway orchestration에 집중하도록 축소함
  - Why: `AdminPointService`는 포인트 관리 서비스처럼 보이지만 실제로는 입력 정규화 helper, actor rel id 생성, 결과 payload 조합이 같이 들어 있어 포인트 정책 수정과 응답 형식 변경이 한 파일에서 같이 흔들리고 있었다. 입력/결과 support를 분리해 두면 검증 규칙과 포인트 처리 흐름을 분리해서 더 안전하게 유지보수할 수 있다.

### 댓글 변경 저장소를 entry/board-activity store로 분리
- `api/v1/Comment/Repository/{CommentMutationRepository.php,CommentEntryMutationStore.php,CommentBoardActivityStore.php}`를 갱신해 댓글 변경 저장소에 함께 있던 댓글 생성·수정·삭제와 `board_new` 적재, 게시판 댓글 수 증감 책임을 각각 별도 store로 분리하고, 기존 `CommentMutationRepository`는 공개 시그니처를 유지하는 파사드로 축소함
  - Why: `CommentMutationRepository`는 댓글 변경 저장소처럼 보이지만 실제로는 실제 댓글 row 변경과 게시판 집계/신규글 적재라는 서로 다른 변경 이유를 한 파일에서 같이 들고 있었다. entry/board-activity 축을 분리해 두어야 댓글 본문 변경 규칙과 게시판 집계 규칙을 독립적으로 바꿀 수 있고, 댓글 도메인도 이미 적용 중인 mutation facade 패턴과 더 일관된 구조를 유지할 수 있다.

### 인증 복구 저장소를 password/email recovery store로 분리
- `api/v1/Auth/Repository/{AuthRecoveryRepository.php,AuthPasswordRecoveryStore.php,AuthEmailRecoveryStore.php}`를 갱신해 인증 복구 저장소에 함께 있던 비밀번호 재설정 토큰 발급·소모 흐름과 이메일 인증 토큰 발급·확정 흐름을 별도 store로 분리하고, 기존 `AuthRecoveryRepository`는 공개 `AuthGateway` 계약을 유지하는 파사드로 축소함
  - Why: `AuthRecoveryRepository`는 인증 복구 저장소 하나처럼 보이지만 실제로는 비밀번호 초기화와 이메일 인증이라는 서로 다른 수명주기와 검증 규칙을 한 파일에서 같이 들고 있었다. password/email recovery 축을 분리해 두어야 복구 토큰 정책과 이메일 인증 정책을 독립적으로 바꿀 수 있고, auth 도메인도 보안 저장소 분리 이후 구조 경계가 더 선명해진다.

### 세션 서비스에서 인증 정책과 응답 조합을 support로 분리
- `api/v1/Auth/Service/{AuthSessionService.php,Support/AuthSessionPolicy.php,Support/AuthSessionResultBuilder.php}`를 갱신해 세션 서비스에 섞여 있던 로그인/토큰 주체 검증, 계정 상태 확인, 로그인 실패 제한 설정 해석, 토큰/로그아웃 응답 조합을 별도 support로 분리하고, 기존 `AuthSessionService`는 gateway/jwt/event orchestration에 집중하도록 축소함
  - Why: `AuthSessionService`는 로그인 서비스처럼 보이지만 실제로는 입력 검증, 계정 상태 정책, refresh/logout 응답 조합이 한 파일에 같이 들어 있어 인증 정책 수정과 세션 발급 흐름 수정이 한 경계에서 함께 흔들리고 있었다. policy/result support를 분리해 두면 인증 정책과 토큰 발급 orchestration을 독립적으로 다룰 수 있고, 이후 소비단 계약 보강 시에도 세션 에러 의미를 더 안전하게 유지할 수 있다.

### 시스템 파일 정리 서비스를 cache/storage 하위 서비스로 분리
- `api/v1/Admin/System/Service/{AdminSystemFileMaintenanceService.php,AdminSystemCacheMaintenanceService.php,AdminSystemStorageMaintenanceService.php,Support/AdminSystemMaintenanceResultBuilder.php}`를 갱신해 시스템 파일 정리 서비스에 함께 있던 세션/캐시/captcha 정리와 썸네일/회원관리 파일 정리 책임을 각각 별도 하위 서비스로 분리하고, 기존 `AdminSystemFileMaintenanceService`는 결과 builder를 공유하는 위임 파사드로 축소함
  - Why: `AdminSystemFileMaintenanceService`는 파일 정리 서비스처럼 보이지만 실제로는 캐시성 파일 정리와 디렉터리 기반 스토리지 정리가 한 파일에 같이 들어 있어 변경 이유가 다른 운영 배치가 함께 흔들리고 있었다. cache/storage 축을 분리해 두면 운영성 파일 정리 규칙을 더 독립적으로 바꿀 수 있고, 관리자 시스템 유지보수 도메인도 이미 적용한 하위 서비스 파사드 패턴과 더 일관된 구조를 유지할 수 있다.

### 게시글 공지 저장소를 notice/delete-cascade store로 분리
- `api/v1/Post/Repository/{PostNoticeRepository.php,PostNoticeMutationStore.php,PostDeleteCascadeStore.php}`를 갱신해 게시글 공지 저장소에 함께 있던 `bo_notice` 갱신 책임과 글 삭제 시 댓글/스크랩/첨부/신규글/카운터 정리 책임을 별도 store로 분리하고, 기존 `PostNoticeRepository`는 공개 시그니처를 유지하는 파사드로 축소함
  - Why: `PostNoticeRepository`는 이름상 공지 저장소처럼 보이지만 실제로는 공지글 ID 집합 관리와 게시글 삭제 cascade가 한 파일에 같이 들어 있어 공지 정책 변경과 삭제 정리 규칙이 같은 파일에서 함께 흔들리고 있었다. notice/delete-cascade 축을 분리해 두면 공지글 관리와 삭제 정리 규칙을 독립적으로 바꿀 수 있고, 게시글 mutation 계층도 더 명확한 read/write/delete 경계를 유지할 수 있다.

### SMS 배치 조회 저장소를 list/detail store로 분리
- `api/v1/Admin/Sms/Repository/{AdminSmsMessageBatchStore.php,AdminSmsMessageListStore.php,AdminSmsMessageDetailStore.php}`를 갱신해 SMS 배치 조회 저장소에 함께 있던 발송 이력 목록/상세 목록 조회와 단일 배치/재시도 배치/배치별 수신자 상세 조회 책임을 별도 store로 분리하고, 기존 `AdminSmsMessageBatchStore`는 공개 시그니처를 유지하는 파사드로 축소함
  - Why: `AdminSmsMessageBatchStore`는 배치 조회 저장소처럼 보이지만 실제로는 상위 이력 목록 조회와 단일 배치 hydrate, 배치별 상세 수신자 조회가 한 파일에 같이 들어 있어 목록 조건 변경과 상세 응답 조립이 함께 흔들릴 수 있었다. list/detail 축을 분리해 두면 배치 목록 조회와 개별 배치 상세 조회를 독립적으로 바꿀 수 있고, SMS 메시지 축도 이미 적용한 query/detail 파사드 패턴과 더 일관된 구조를 유지할 수 있다.

### SMS 연락처 변경 저장소를 write/batch/import store로 분리
- `api/v1/Admin/Sms/Repository/{AdminSmsContactMutationStore.php,AdminSmsContactWriteStore.php,AdminSmsContactBatchStore.php,AdminSmsContactImportStore.php}`를 갱신해 SMS 연락처 엔트리 변경 저장소에 섞여 있던 기본 CRUD, 일괄 처리, csv/xls 업로드 가져오기를 각각 별도 store로 분리하고, 기존 `AdminSmsContactMutationStore`는 공개 시그니처를 유지하는 위임 파사드로 축소함
  - Why: `AdminSmsContactMutationStore`는 연락처 저장소처럼 보이지만 실제로는 단건 수정, 일괄 이동/복사/삭제, 파일 업로드 파싱과 가져오기까지 한 파일에 함께 들어 있어 연락처 CRUD 규칙을 바꾸는 작업이 업로드 포맷 처리와 같이 흔들릴 수 있었다. 변경 축을 write/batch/import로 나눠 두면 연락처 생성/수정 정책과 대량 처리/가져오기 규칙을 독립적으로 바꿀 수 있고, 남은 SMS 구조 부채도 더 작은 단위로 관리할 수 있다.

### SMS 템플릿 엔트리 저장소를 query/write/batch store로 분리
- `api/v1/Admin/Sms/Repository/{AdminSmsTemplateEntryStore.php,AdminSmsTemplateQueryStore.php,AdminSmsTemplateWriteStore.php,AdminSmsTemplateBatchStore.php}`를 갱신해 SMS 템플릿 엔트리 저장소에 섞여 있던 목록/상세 조회, 단건 생성·수정·삭제, 일괄 이동·삭제를 각각 별도 store로 분리하고, 기존 `AdminSmsTemplateEntryStore`는 공개 시그니처를 유지하는 위임 파사드로 축소함
  - Why: `AdminSmsTemplateEntryStore`는 템플릿 저장소처럼 보이지만 실제로는 템플릿 조회 SQL, 그룹 이름 hydrate, 단건 쓰기, 일괄 그룹 이동/삭제까지 함께 들고 있어 조회 규칙과 변경 규칙이 한 파일에서 같이 흔들리고 있었다. query/write/batch 경계를 나눠 두면 템플릿 포팅이나 그룹 정책 변경 시 수정 범위를 좁힐 수 있고, SMS 도메인도 이미 적용한 query/mutation 파사드 패턴과 더 일관된 구조를 유지할 수 있다.

### SMS 연락처 그룹 저장소를 member-sync/query/mutation store로 분리
- `api/v1/Admin/Sms/Repository/{AdminSmsContactGroupStore.php,AdminSmsMemberSyncStore.php,AdminSmsContactGroupQueryStore.php,AdminSmsContactGroupMutationStore.php}`를 갱신해 SMS 연락처 그룹 저장소에 함께 있던 회원 동기화 배치, 그룹 조회, 그룹 생성·이동·삭제를 각각 별도 store로 분리하고, 기존 `AdminSmsContactGroupStore`는 공개 시그니처를 유지하는 위임 파사드로 축소함
  - Why: `AdminSmsContactGroupStore`는 그룹 저장소처럼 보이지만 실제로는 회원 주소록 동기화 배치와 그룹 CRUD/조회가 한 파일에 같이 들어 있어, 그룹 정책을 건드릴 때 회원 동기화 배치까지 같은 파일에서 함께 흔들리고 있었다. member-sync/query/mutation 경계를 분리해 두면 연락처 그룹 운영 규칙과 회원 동기화 배치 규칙을 독립적으로 수정할 수 있고, SMS 도메인 남은 구조 부채도 더 작은 단위로 쪼개서 관리할 수 있다.

### 회원 프로필 필드 정규화를 field policy/value normalizer로 분리
- `api/v1/Member/Service/{MemberProfileFieldNormalizer.php,Support/MemberProfileFieldPolicy.php,Support/MemberProfileValueNormalizer.php}`를 갱신해 회원 프로필 필드 정규화기에서 허용 필드 정책과 zip/전화번호/불리언/문자열 정규화 helper를 별도 support로 분리하고, 기존 `MemberProfileFieldNormalizer`는 gateway 기반 검증과 필드별 update 조합 책임만 유지하도록 축소함
  - Why: `MemberProfileFieldNormalizer`는 필드 allowlist 정책, 값 정규화 helper, gateway 검증 호출이 한 파일에 같이 들어 있어 수정 금지 필드 정책을 바꿀 때 값 정규화 로직까지 함께 흔들릴 수 있었다. field policy와 value normalizer를 분리해 두면 허용 필드 규칙과 값 정규화 규칙을 독립적으로 바꿀 수 있고, 이후 회원 프로필 포팅이나 소비단 의미 조정에서도 변경 경계가 더 선명해진다.

### 신규글 목록 저장소를 query/hydrator repository로 분리
- `api/v1/Post/Repository/{PostNewPostListRepository.php,PostNewPostRepositoryBase.php,PostNewPostQueryRepository.php,PostNewPostHydratorRepository.php}`를 갱신해 신규글 목록 저장소에 함께 있던 목록/커서 조회 SQL 책임과 게시물 hydrate 책임을 별도 repository로 분리하고, 기존 `PostNewPostListRepository`는 공개 시그니처를 유지하는 파사드로 축소함
  - Why: `PostNewPostListRepository`는 신규글 조회 저장소처럼 보이지만 실제로는 목록 SQL, cursor pagination, 게시글/부모글 hydrate가 한 파일에 섞여 있어 read 규칙과 hydrate 규칙이 함께 움직이고 있었다. query/hydrator 축을 분리해 두어야 신규글 조회 조건을 바꾸면서 게시물 hydrate를 건드리지 않을 수 있고, 게시글 read 계층도 이미 정리한 facade 패턴과 더 일관된 구조를 유지할 수 있다.

### QA 첨부 서비스에서 업로드/파일명 규칙을 support로 분리
- `api/v1/Qa/Service/{QaAttachmentService.php,Support/QaAttachmentUploadNormalizer.php,Support/QaAttachmentFilenameSanitizer.php}`를 갱신해 QA 첨부 서비스에 함께 있던 업로드 슬롯 정규화, 삭제 플래그 해석, 파일명 sanitizing 규칙을 별도 support로 분리하고, 기존 `QaAttachmentService`는 저장/검증 orchestration만 담당하도록 축소함
  - Why: `QaAttachmentService`는 첨부 저장 서비스처럼 보이지만 실제로는 업로드 슬롯 해석, 삭제 플래그 파싱, 파일명/확장자 정규화까지 한 파일에 몰려 있어 업로드 규칙 변경이 저장 로직과 함께 흔들릴 수 있었다. support로 분리해 두면 QA 첨부 포팅이나 업로드 정책 조정 시 변경 경계를 더 좁게 가져갈 수 있고, 서비스는 storage orchestration에 집중하게 된다.

### 인증 repository 공통 베이스에서 입력 정규화와 timed token codec 분리
- `api/v1/Auth/{Repository/AuthRepositorySupport.php,Service/AuthInputHelper.php,Support/AuthInputNormalizer.php,Support/AuthTimedTokenCodec.php}`를 갱신해 repository/service가 중복으로 들고 있던 member id, 전화번호, 주소, 우편번호, 본인확인 수단 정규화 규칙과 만료 토큰 encode/decode 규칙을 공통 support로 수렴함
  - Why: `AuthRepositorySupport`와 `AuthInputHelper`는 거의 같은 문자열 정규화 규칙을 서로 복제한 채 들고 있었고, 비밀번호 재설정/이메일 인증의 timed token 규칙도 repository 베이스 클래스 내부에 고정돼 있었다. 공통 support로 수렴해 두어야 인증 입력 규칙을 한 곳에서 바꿀 수 있고, repository 베이스 클래스도 설정/DB 보조 책임과 입력/토큰 보조 책임을 분리해 더 얇게 유지할 수 있다.

### 구현 감사 루프에서 Packagist advisory 재시도/완화 처리 추가
- `scripts/run_quality_gates.sh`를 갱신해 `composer audit`가 Packagist advisory endpoint 타임아웃으로 실패할 때 3회 재시도 후 `--ignore-unreachable`로 완화되도록 조정함
  - Why: 구현 감사는 코드 품질/구조 판단 게이트인데, 외부 advisory endpoint의 일시 장애 때문에 반복적으로 전체 구현 감사가 실패하면 로컬 구조 개선 결과를 안정적으로 검증할 수 없었다. 재시도 후 완화 처리로 보안 감사는 유지하되, 외부 네트워크 일시 장애가 구조 정합성 판단을 가로막지 않도록 감사 루프 자체를 안정화했다.

### QA 본문 조회 저장소를 query/hydrator repository로 분리
- `api/v1/Qa/Repository/{QaContentQueryRepository.php,QaContentHydratorRepository.php}`를 갱신해 QA 본문 조회 저장소에 함께 있던 목록/상세/연관질문/다운로드 조회 SQL과 QA row/answer/file 메타 정규화 책임을 분리하고, 기존 `QaContentQueryRepository`는 조회 파사드로 축소함
  - Why: `QaContentQueryRepository`는 조회 저장소처럼 보이지만 실제로는 SQL 조회뿐 아니라 답변 중첩 조회, 파일 메타 계산, 응답 정규화까지 함께 들고 있어 조회 조건 변경과 응답 조립 규칙이 같이 흔들릴 수 있었다. hydrator를 분리해 두면 QA 조회 조건을 바꾸면서 answer/file 메타 조립을 건드리지 않을 수 있고, 이미 정리한 query/hydrator 패턴과도 맞아 구조 일관성이 높아진다.

### SMS 발송 저장소를 recipient resolver/dispatch writer로 분리
- `api/v1/Admin/Sms/Repository/{AdminSmsMessageDispatchStore.php,AdminSmsRecipientResolverStore.php,AdminSmsMessageDispatchWriterStore.php}`를 갱신해 SMS 발송 저장소에 함께 있던 수신자/메시지 해석, 중복 전화번호 제거, 발송 이력 적재 책임을 분리하고, 기존 `AdminSmsMessageDispatchStore`는 provider 호출과 발송 orchestration만 담당하도록 축소함
  - Why: `AdminSmsMessageDispatchStore`는 실제 전송 adapter처럼 보이지만 수신자 조회 SQL, 템플릿 메시지 해석, 중복 제거, write/history transaction까지 전부 한 파일에 묶여 있었다. resolver와 writer를 분리해 두어야 수신자 선택 규칙과 발송 기록 적재 규칙을 독립적으로 바꿀 수 있고, 이후 SMS 축을 더 정리할 때도 dispatch store를 얇은 orchestration 계층으로 유지할 수 있다.

### 관리자 레이아웃 저장소를 query/mutation repository로 분리
- `api/v1/Admin/Layout/Repository/{AdminLayoutRepository.php,AdminLayoutRepositoryBase.php,AdminLayoutQueryRepository.php,AdminLayoutMutationRepository.php}`를 갱신해 관리자 레이아웃 저장소에 함께 있던 목록/상세 조회 책임과 레이아웃 저장·위젯 추가/수정/삭제/정렬 책임을 별도 repository로 분리하고, 기존 `AdminLayoutRepository`는 공개 시그니처를 유지하는 파사드로 축소함
  - Why: `AdminLayoutRepository`는 규모가 작아 보여도 조회, upsert, 위젯 조작, 누락 테이블 fallback까지 서로 다른 변경 이유를 한 파일에 들고 있었다. query/mutation 축을 갈라 두면 레이아웃 조회와 위젯 쓰기 규칙을 독립적으로 바꿀 수 있고, 이후 관리자 레이아웃 기능이 커져도 저장소가 다시 갓파일화되는 속도를 늦출 수 있다.

### 관리자 투표 저장소를 query/mutation/vote repository로 분리
- `api/v1/Admin/Poll/Repository/{AdminPollRepository.php,AdminPollRepositoryBase.php,AdminPollQueryRepository.php,AdminPollMutationRepository.php,AdminPollVoteRepository.php}`를 갱신해 관리자 투표 저장소에 함께 있던 목록/상세/활성 투표 조회 책임, 투표 생성/수정/삭제 책임, 실제 투표 집계와 기타 의견 저장 책임을 별도 repository로 분리하고, 기존 `AdminPollRepository`는 공개 시그니처를 유지하는 파사드로 축소함
  - Why: `AdminPollRepository`는 관리자 투표 저장소 하나처럼 보이지만 실제로는 관리자 CRUD와 사용자 투표 집계, 기타의견 적재까지 서로 다른 변경 이유의 SQL이 한 파일에 섞여 있었다. query/mutation/vote 축을 분리해 두어야 관리자 설정 변경과 실제 투표 기록 규칙을 독립적으로 바꿀 수 있고, facade의 `UPDATABLE_FIELDS`를 유지해 관리자 스키마 추출 흐름도 흔들리지 않게 지킬 수 있다.

### 관리자 그룹 저장소를 query/mutation/member repository로 분리
- `api/v1/Admin/Group/Repository/{AdminGroupRepository.php,AdminGroupRepositoryBase.php,AdminGroupQueryRepository.php,AdminGroupMutationRepository.php,AdminGroupMemberRepository.php}`를 갱신해 관리자 그룹 저장소에 함께 있던 그룹 목록/상세 조회, 그룹 생성/수정/삭제, 그룹 멤버십 조회/추가/삭제 책임을 별도 repository로 분리하고, 기존 `AdminGroupRepository`는 공개 시그니처를 유지하는 파사드로 축소함
  - Why: `AdminGroupRepository`는 규모는 작아도 그룹 CRUD와 그룹 멤버십 관리라는 서로 다른 변경 이유를 한 파일에 함께 들고 있어 이후 권한 정책이나 멤버 조회 조건이 바뀔 때 그룹 쓰기 규칙까지 같이 흔들릴 여지가 있었다. query/mutation/member 축을 분리해 두면 그룹 관리와 멤버십 관리의 변경 경계를 분명히 유지할 수 있고, facade의 `UPDATABLE_FIELDS`는 관리자 스키마 추출 호환을 위해 그대로 남겨 이후 schema generated 흐름도 깨지지 않는다.

### 댓글 포인트 저장소를 grant/revoke store로 분리
- `api/v1/Comment/Repository/{CommentPointRepository.php,CommentPointStoreBase.php,CommentPointGrantStore.php,CommentPointRevokeStore.php}`를 갱신해 댓글 포인트 저장소에 함께 있던 지급/차감 회수 책임을 별도 store로 분리하고, 기존 `CommentPointRepository`는 공개 시그니처와 생성자 호환성을 유지하는 파사드로 축소함
  - Why: `CommentPointRepository`는 댓글 포인트 저장소 하나처럼 보이지만 실제로는 댓글 작성 포인트 지급과 댓글 삭제 회수 흐름이 각각 별도 트랜잭션/중복 방지 규칙을 가지고 있어 변경 이유가 다른 write 로직이 한 파일에 묶여 있었다. grant/revoke 축을 갈라 두어야 지급 규칙과 회수 규칙을 독립적으로 바꿀 수 있고, 댓글 도메인도 다른 mutation facade 패턴과 더 일관된 구조를 유지할 수 있다.

### 메모 조회 저장소를 list/recipient/config repository로 분리
- `api/v1/Memo/Repository/{MemoQueryRepository.php,MemoListQueryRepository.php,MemoRecipientRepository.php,MemoConfigRepository.php}`를 갱신해 메모 조회 저장소에 함께 있던 목록/상세·cursor 조회 책임, 수신자 검증 책임, 메모 발송 포인트 설정 조회 책임을 별도 repository로 분리하고, 기존 `MemoQueryRepository`는 공개 시그니처를 유지하는 파사드로 축소함
  - Why: `MemoQueryRepository`는 조회 저장소처럼 보이지만 실제로는 메모 목록/상세 hydrate, cursor pagination, 수신자 공개 여부 검증, 발송 포인트 설정 조회까지 서로 다른 변경 이유를 한 파일에서 같이 들고 있었다. list/recipient/config 축을 분리해 두어야 메모 조회 규칙과 수신자 정책, 설정 조회를 독립적으로 바꿀 수 있고, 메모 도메인도 다른 query facade 패턴과 더 일관된 구조를 유지할 수 있다.

### 관리자 게시판 저장소를 query/mutation repository로 분리
- `api/v1/Admin/Board/Repository/{AdminBoardRepository.php,AdminBoardQueryRepository.php,AdminBoardMutationRepository.php}`를 갱신해 관리자 게시판 저장소에 함께 있던 목록/상세 조회 책임과 생성/수정/삭제/복제 책임을 별도 repository로 분리하고, 기존 `AdminBoardRepository`는 공개 시그니처를 유지하는 파사드로 축소함
  - Why: `AdminBoardRepository`는 관리자 게시판 저장소 하나처럼 보이지만 실제로는 목록 조회 정렬 규칙과 게시판 생성/복제/업데이트 규칙이 한 파일에 섞여 있어 변경 이유가 서로 다른 read/write 흐름이 함께 움직이고 있었다. query/mutation 축을 갈라 두어야 게시판 조회 정렬 정책과 게시판 쓰기/복제 정책을 독립적으로 바꿀 수 있고, 관리자 도메인도 이미 정리한 facade 패턴과 더 일관된 구조를 유지할 수 있다.

### 관리자 시스템 메일 발송 서비스를 payload/config/transport support로 분리
- `api/v1/Admin/System/Service/{AdminSystemMailDispatchService.php,Support/AdminSystemMailDispatchConfig.php,Support/AdminSystemMailDispatchPayloadResolver.php,Support/AdminSystemMailTransport.php}`를 갱신해 관리자 시스템 메일 발송 서비스에 함께 있던 payload 해석, 수신자/템플릿 검증, 개인화/수신거부 링크 조립, 환경설정 조회, 실제 `mail()` 호출 책임을 별도 support로 분리하고, 기존 `AdminSystemMailDispatchService`는 공개 시그니처와 private personalize entry를 유지하는 파사드로 축소함
  - Why: `AdminSystemMailDispatchService`는 겉으로는 시스템 메일 발송 서비스 하나지만 실제로는 템플릿 fallback, 수신자 검증, 개인화, 환경 변수 해석, 메일 전송까지 서로 다른 변경 이유를 한 파일에 묶고 있었다. payload/config/transport support를 분리해 두어야 운영 설정 변경, 템플릿/수신자 규칙 변경, 실제 발송 방식 변경을 서로 독립적으로 다룰 수 있고, 시스템 서비스 계층도 이미 정리한 facade 패턴과 더 일관된 구조를 유지할 수 있다.

### 인증 보안 저장소를 login-attempt/token-blacklist repository로 분리
- `api/v1/Auth/Repository/{AuthSecurityRepository.php,AuthLoginAttemptRepository.php,AuthTokenBlacklistRepository.php}`를 갱신해 인증 보안 저장소에 함께 있던 로그인 실패 추적/오늘 로그인 갱신 책임과 토큰 블랙리스트 책임을 별도 repository로 분리하고, 기존 `AuthSecurityRepository`는 공개 시그니처를 유지하는 파사드로 축소함
  - Why: `AuthSecurityRepository`는 인증 보안 저장소처럼 보이지만 실제로는 로그인 시도 rate-limit 상태 저장과 토큰 폐기 저장소를 한 파일에서 같이 들고 있어 변경 이유가 서로 다른 규칙이 한곳에 묶여 있었다. login-attempt와 token-blacklist 축을 갈라 두어야 로그인 차단 정책과 토큰 폐기 정책을 독립적으로 바꿀 수 있고, 이후 auth 구조 감사에서도 보안 write 경계가 더 선명하게 유지된다.

### QA 변경 저장소를 question/answer repository로 분리
- `api/v1/Qa/Repository/{QaMutationRepository.php,QaQuestionMutationRepository.php,QaAnswerMutationRepository.php}`를 갱신해 QA 변경 저장소에 함께 있던 질문 생성/수정 책임과 답변 생성 책임을 별도 repository로 분리하고, 기존 `QaMutationRepository`는 공개 시그니처를 유지하는 파사드로 축소함
  - Why: `QaMutationRepository`는 이름상 변경 저장소 하나로 보이지만 실제로는 질문 생성 규칙, 연관 질문 처리, 답변 생성과 부모 상태 갱신, 삭제 위임이 함께 들어 있어 write 계층 경계가 흐려져 있었다. question/answer 축을 분리해 두어야 질문 쓰기 규칙과 답변 쓰기 규칙을 독립적으로 바꿀 수 있고, QA 도메인도 이미 정리한 query/mutation facade 패턴과 더 일관된 구조를 유지할 수 있다.

### QA 조회 저장소를 content/config repository로 분리
- `api/v1/Qa/Repository/{QaQueryRepository.php,QaContentQueryRepository.php,QaConfigRepository.php}`를 갱신해 QA 조회 저장소에 함께 있던 질문 목록/상세/관련 질문/첨부 메타 조회 책임과 QA 설정 fallback 조회 책임을 별도 repository로 분리하고, 기존 `QaQueryRepository`는 공개 시그니처를 유지하는 파사드로 축소함
  - Why: `QaQueryRepository`는 질문 조회 저장소처럼 보이지만 실제로는 질문 row 정규화와 답변 hydrate, 파일 메타 생성, QA 설정 fallback까지 한 파일에 함께 들고 있어 read 계층 경계가 흐려져 있었다. content query와 config query를 갈라 두어야 질문 read 흐름과 설정 규칙을 독립적으로 바꿀 수 있고, QA 도메인도 다른 query/mutation 분리 패턴과 더 일관된 구조를 유지할 수 있다.

### 회원 조회 저장소를 lookup/constraint repository로 분리
- `api/v1/Member/Repository/{MemberQueryRepository.php,MemberLookupRepository.php,MemberConstraintRepository.php}`를 갱신해 회원 조회 저장소에 함께 있던 프로필/이미지 설정 조회 책임과 닉네임·이메일·휴대폰 중복 검사, 금지어/금지 도메인, 닉네임 변경 cooldown 규칙 조회 책임을 별도 repository로 분리하고, 기존 `MemberQueryRepository`는 공개 시그니처를 유지하는 파사드로 축소함
  - Why: `MemberQueryRepository`는 단순 조회 저장소처럼 보이지만 실제로는 회원 조회와 프로필 수정 validation 규칙 조회가 한 파일에 섞여 있어 회원 도메인 경계가 반쯤만 나뉜 상태였다. lookup과 constraint 축을 갈라 두어야 회원 조회 정책과 프로필 검증 정책을 독립적으로 바꿀 수 있고, 이후 `MemberValidationRepository`도 더 선명한 의존성 위에서 유지할 수 있다.

### Admin SMS 저장소에서 설정 책임을 별도 config store로 분리
- `api/v1/Admin/Sms/Repository/{AdminSmsRepository.php,AdminSmsConfigStore.php}`를 갱신해 SMS 설정 조회/기본 row seed/update 책임을 별도 config store로 분리하고, 기존 `AdminSmsRepository`는 공개 시그니처를 유지한 채 config/template/contact/message store 파사드 역할에 더 가깝게 정리함
  - Why: 서비스 계층에서는 이미 `AdminSmsConfigService`로 설정 책임을 떼어냈는데 저장소는 여전히 config/template/contact/message 중 설정 축만 직접 들고 있어 파사드 경계가 반쯤만 닫힌 상태였다. 저장소도 같은 축으로 정리해 두어야 SMS 설정 seed/update 규칙을 다른 주소록/템플릿/발송 로직과 독립적으로 바꿀 수 있고, 다음 구조 감사에서도 `AdminSmsRepository` 길이와 책임 집중을 더 자연스럽게 낮출 수 있다.

### Admin SMS 템플릿 파사드에서 그룹/엔트리 서비스를 분리
- `api/v1/Admin/Sms/Service/{AdminSmsTemplateService.php,AdminSmsTemplateGroupService.php,AdminSmsTemplateEntryService.php}`를 갱신해 기존 템플릿 파사드에 함께 있던 그룹 CRUD/이동·비우기 책임과 템플릿 목록/CRUD/일괄 이동 책임을 각각 별도 서비스로 분리하고, `AdminSmsTemplateService`는 공개 시그니처를 유지한 채 템플릿 하위 파사드 역할만 남기도록 정리함
  - Why: `AdminSmsTemplateService`는 상위 `AdminSmsService` 아래 하위 파사드이면서도 템플릿 그룹 관리와 엔트리 CRUD를 한 파일에 함께 들고 있어 연락처 축을 정리한 뒤에도 SMS 내부 구조가 완전히 대칭적이지 않았다. 그룹 흐름과 엔트리 흐름을 다시 갈라 두어야 템플릿 관리 규칙과 엔트리 validation을 독립적으로 바꿀 수 있고, SMS 도메인 전체가 config/template/contact/message 단위로 더 일관된 파사드 패턴을 유지할 수 있다.

### Admin SMS 연락처 파사드에서 그룹/엔트리 서비스를 분리
- `api/v1/Admin/Sms/Service/{AdminSmsContactService.php,AdminSmsContactGroupService.php,AdminSmsContactEntryService.php}`를 갱신해 기존 연락처 파사드에 함께 묶여 있던 그룹 CRUD/이동·비우기 책임과 연락처 목록/CRUD/일괄 처리/import·export 책임을 각각 별도 서비스로 분리하고, `AdminSmsContactService`는 공개 시그니처를 유지한 채 연락처 하위 파사드 역할만 남기도록 정리함
  - Why: `AdminSmsContactService`는 이미 상위 `AdminSmsService` 아래의 하위 파사드인데도 그룹 관리와 개별 연락처 처리, 파일 import/export까지 다시 한 파일에 함께 들고 있어 SMS 도메인 내부 병목이 아직 남아 있었다. 그룹 흐름과 엔트리 흐름을 다시 분리해 두어야 주소록 정책 수정과 대량 import/export 규칙을 서로 독립적으로 바꿀 수 있고, 다음 구조 감사에서도 SMS 계층이 파사드-전용 서비스 패턴으로 더 일관되게 유지된다.

### Admin SMS 파사드에서 설정 관리 책임을 별도 config service로 분리
- `api/v1/Admin/Sms/Service/{AdminSmsService.php,AdminSmsConfigService.php}`와 `tests/Admin/Sms/AdminSmsConfigServiceTest.php`를 갱신해 SMS 설정 조회/정규화/업데이트와 `icode` 사용 여부 기반 회원 동기화 사전조건을 별도 config service로 분리하고, 기존 `AdminSmsService`는 공개 시그니처를 유지한 채 config/template/contact/message 하위 서비스 파사드 역할만 남기도록 정리함
  - Why: `AdminSmsService`는 이미 템플릿/주소록/발송 이력을 하위 서비스로 위임하고 있는데 설정 업데이트와 회원 동기화 사전조건만 여전히 직접 들고 있어 SMS 파사드의 책임 경계가 끝까지 닫히지 않은 상태였다. 설정 책임을 별도 service로 떼어 두어야 `AdminSmsService`가 진짜 오케스트레이션 파사드가 되고, 이후 `icode` 설정 정책이나 callback validation을 바꿀 때도 다른 SMS 기능과 독립적으로 다룰 수 있다.

### 관리자 투표 관리 서비스를 접근 정책/입력 정규화 support로 분리
- `api/v1/Admin/Poll/Service/{AdminPollManageService.php,Support/AdminPollAccessPolicy.php,Support/AdminPollInputNormalizer.php}`와 `tests/Admin/Poll/{AdminPollAccessPolicyTest.php,AdminPollInputNormalizerTest.php}`를 추가·갱신해 최고관리자 접근 정책, 목록 페이지네이션, `po_id` 검증, 투표 payload/option/bool 정규화를 support 클래스로 분리하고, 기존 `AdminPollManageService`의 공개 생성자와 메서드 시그니처는 유지한 채 repository/result service 오케스트레이션만 남기도록 정리함
  - Why: `AdminPollManageService`는 관리자 권한 판정, 목록 페이지네이션, poll payload 정규화, 옵션 최소 개수 검증, bool/int coercion까지 함께 들고 있어 관리자 투표 규칙이 늘어나면 다시 병목이 될 구조였다. 접근 정책과 입력 정규화를 support로 떼어 두어야 투표 저장 흐름과 관리자 검증 규칙을 독립적으로 바꿀 수 있고, 결과 조회 서비스와도 더 선명한 경계를 유지할 수 있다.

### 관리자 팝업 서비스를 접근 정책/입력 정규화 support로 분리
- `api/v1/Admin/Popup/Service/{AdminPopupService.php,Support/AdminPopupAccessPolicy.php,Support/AdminPopupInputNormalizer.php}`와 `tests/Admin/Popup/{AdminPopupAccessPolicyTest.php,AdminPopupInputNormalizerTest.php}`를 추가·갱신해 최고관리자 접근 정책, 목록/활성 필터 정규화, 팝업 payload 기본값/enum/datetime 검증을 support 클래스로 분리하고, 기존 `AdminPopupService`의 공개 생성자와 메서드 시그니처는 유지한 채 repository 오케스트레이션만 남기도록 정리함
  - Why: `AdminPopupService`는 CRUD/활성 조회 오케스트레이션 외에 관리자 권한 판정, 팝업 기본값 주입, enum·datetime 검증, ID 유효성 검사까지 함께 들고 있어 관리자 팝업 규칙이 늘어나면 다시 비대화될 구조였다. 접근 정책과 입력 정규화를 support로 떼어 두어야 팝업 저장 흐름과 관리자 검증 규칙을 독립적으로 바꿀 수 있고, 공개 팝업 조회 규칙도 더 작은 테스트 단위로 유지할 수 있다.

### 메모 서비스를 입력 정규화/전송 정책 support로 분리
- `api/v1/Memo/Service/{MemoService.php,Support/MemoInputNormalizer.php,Support/MemoPolicyService.php}`와 `tests/Memo/{MemoInputNormalizerTest.php,MemoPolicyServiceTest.php}`를 추가·갱신해 회원/목록/전송 입력 정규화, 쪽지 ID 검증, 수신자/본문 sanitize, 비공개 회원 발송 금지·포인트 부족·읽지 않음 판정을 support 클래스로 분리하고, 기존 `MemoService`의 공개 생성자와 메서드 시그니처는 유지한 채 gateway 오케스트레이션만 남기도록 정리함
  - Why: `MemoService`는 목록/상세/삭제 오케스트레이션 외에 회원 인증 판정, kind/page/cursor 정규화, 수신자/본문 sanitize, 발송 가능 여부와 포인트 부족 판정, 읽지 않음 판정까지 함께 들고 있어 메모 규칙이 쌓일수록 다시 병목이 될 구조였다. 입력 규칙과 정책을 support로 떼어 두어야 메모 gateway 흐름과 사용자 정책을 독립적으로 바꿀 수 있고, 이후 관리자 메모나 알림 연계가 붙더라도 같은 규칙을 더 작은 단위 테스트로 재사용할 수 있다.

### 포인트 변경 저장소를 적립/회수 store와 삭제 store로 분리
- `api/v1/Point/Repository/{PointMutationRepository.php,PointGrantStore.php,PointDeleteStore.php}`를 갱신해 기존 포인트 변경 저장소에 섞여 있던 적립·회수·만료 계산 책임과 삭제·합계 재동기화 책임을 별도 store로 분리하고, 기존 `PointMutationRepository`는 공개 생성자와 `grant()/revoke()/deleteById()` 시그니처를 유지하는 파사드로 축소함
  - Why: `PointMutationRepository`는 named lock 기반 경합 제어 아래에서 적립/회수 규칙과 삭제 후 회원 총합 재계산까지 함께 들고 있어 포인트 정책 수정과 관리자 삭제 처리 수정이 서로 얽힐 위험이 있었다. 적립/회수 흐름과 삭제 흐름을 store 단위로 갈라 두어야 포인트 지급 정책과 정리 정책을 독립적으로 바꿀 수 있고, 이미 query/mutation으로 갈라진 포인트 도메인의 구조 경계도 더 일관되게 유지된다.

### 댓글 서비스를 입력 정규화/권한 정책 support로 분리
- `api/v1/Comment/Service/{CommentService.php,Support/CommentInputNormalizer.php,Support/CommentPermissionService.php}`와 `tests/Comment/{CommentInputNormalizerTest.php,CommentPermissionServiceTest.php}`를 추가·갱신해 댓글 본문/ID/부모 댓글 입력 정규화와 연속 작성 지연 검증, 댓글 생성·수정·삭제 권한 및 답글 존재 삭제 금지 정책을 support 클래스로 분리하고, 기존 `CommentService`의 생성자와 공개 메서드 시그니처는 유지한 채 board/post/comment/event 오케스트레이션만 남기도록 정리함
  - Why: `CommentService`는 게시판 접근 검증과 포인트/이벤트 오케스트레이션 외에 본문 정규화, parent 댓글 ID 검증, 연속 작성 지연, 수정/삭제 권한 판정까지 한 파일에서 모두 처리하고 있어 댓글 도메인 규칙이 늘어날수록 다시 병목이 될 구조였다. 입력 규칙과 권한 정책을 support로 떼어 두어야 게시판 규칙 변경과 댓글 오케스트레이션을 독립적으로 바꿀 수 있고, 향후 댓글 관리자 기능을 붙일 때도 같은 검증 로직을 재사용하기 쉬워진다.

### FAQ 마스터 서비스를 payload/presenter support로 분리
- `api/v1/Admin/Faq/Service/{AdminFaqMasterService.php,Support/AdminFaqMasterPayloadNormalizer.php,Support/AdminFaqMasterPresenter.php}`를 갱신해 FAQ 마스터 payload 정규화와 summary/detail/pagination 응답 enrich 책임을 별도 support 클래스로 분리하고, 기존 서비스의 생성자와 공개 CRUD/image 메서드 시그니처는 유지한 채 repository/image 오케스트레이션만 남기도록 정리함
  - Why: `AdminFaqMasterService`는 CRUD 조립과 이미지 파일 위임 외에 입력 정규화, summary/detail 응답 enrich, pagination 계산까지 함께 들고 있어 FAQ 관리자 변경이 쌓일수록 다시 병목이 될 구조였다. payload와 presenter를 떼어 두어야 입력 규칙과 응답 조립 규칙을 독립적으로 바꿀 수 있고, FAQ 관리자 서비스도 다른 관리자 도메인과 같은 얇은 facade 패턴을 유지할 수 있다.

### 회원 이미지 매니저를 storage/processor support로 분리
- `api/v1/Member/Service/{MemberImageManager.php,Support/MemberImageStorage.php,Support/MemberImageProcessor.php}`를 갱신해 업로드 경로 계산·디렉터리 권한·파일 이동/삭제 책임과 이미지 파일 검증·리사이즈 책임을 별도 support 클래스로 분리하고, 기존 `MemberImageManager`의 생성자와 공개 `upload()/delete()` 계약은 유지한 채 회원 ID 정규화와 응답 조립만 남기도록 정리함
  - Why: `MemberImageManager`는 회원 이미지 업로드 오케스트레이션 외에 저장 경로 결정, 디렉터리 권한, 파일 이동, 이미지 바이너리 검증, 리사이즈까지 모두 한 파일에 들고 있어 이후 프로필/관리자 이미지 정책이 달라질 때 다시 병목이 될 가능성이 높았다. storage와 processor를 갈라 두어야 파일시스템 규칙과 이미지 처리 규칙을 독립적으로 바꿀 수 있고, 회원 미디어 도메인도 다른 서비스처럼 파사드 중심 구조를 유지할 수 있다.

### Google/Kakao 외부 인증 provider adapter에서 응답 매핑 책임을 support로 분리
- `api/v1/Auth/External/Provider/{GoogleExternalAuthProviderAdapter.php,KakaoExternalAuthProviderAdapter.php}`와 `api/v1/Auth/External/Provider/Support/{GoogleExternalAuthResultMapper.php,KakaoExternalAuthResultMapper.php}`를 갱신해 provider adapter 안에 섞여 있던 공급자 오류 매핑, token/userinfo 응답 검증, 성공 payload 조립 책임을 provider별 support 클래스로 분리하고, 기존 어댑터의 생성자와 공개 `start()/complete()` 계약은 유지한 채 HTTP 오케스트레이션만 남기도록 정리함
  - Why: 외부 인증 서비스 계층을 이미 정리한 뒤에도 Google/Kakao adapter는 여전히 원격 응답 해석과 실패 상태 매핑, 성공 사용자 payload 조립을 한 파일에서 같이 들고 있어 provider 추가나 오류 정책 변경 시 다음 병목이 될 가능성이 높았다. 응답 매퍼를 provider별 support로 떼어 두어야 adapter는 authorize/token/userinfo 호출 순서에만 집중하고, 공급자별 결과 규칙도 서비스 밖에서 더 작은 단위로 유지할 수 있다.

### 인증 회원 조회 저장소를 lookup/policy repository로 분리
- `api/v1/Auth/Repository/{AuthMemberQueryRepository.php,AuthMemberLookupRepository.php,AuthMemberPolicyRepository.php}`와 `tests/Auth/AuthMemberRepositoriesTest.php`를 갱신해 회원 조회/존재성 검사 책임과 비밀번호/인증정책/금지어 판독 책임을 별도 repository로 분리하고, 기존 `AuthMemberQueryRepository`는 공개 시그니처를 유지하는 파사드로 축소함
  - Why: `AuthMemberQueryRepository`는 이름과 달리 단순 조회뿐 아니라 비밀번호 검증·재해시, 추천/이메일 인증 정책, 금지어 병합까지 같이 들고 있어 인증 도메인의 조회 경계가 흐려져 있었다. lookup과 policy를 분리해 두어야 회원 레코드 조회 규칙과 인증 정책/예약어 규칙을 독립적으로 바꿀 수 있고, 다음 auth 구조 감사에서도 facade 아래 책임이 더 선명하게 유지된다.

### 관리자 대시보드 저장소를 summary/recent repository로 분리
- `api/v1/Admin/Dashboard/Repository/{AdminDashboardRepository.php,AdminDashboardSummaryRepository.php,AdminDashboardRecentRepository.php}`를 갱신해 회원/게시물/포인트/방문자 집계 책임과 최근 회원/게시글/포인트 피드 조회 책임을 별도 repository로 분리하고, 기존 `AdminDashboardRepository`는 공개 `overview()` 시그니처를 유지하는 파사드로 축소함
  - Why: `AdminDashboardRepository`는 단순한 overview 조립기처럼 보이지만 실제로는 통계 집계 쿼리와 최근 활동 피드 hydrate, 게시글 원문 fallback 조회까지 모두 한 파일에 들고 있어 관리자 홈 확장 시 다시 병목이 될 구조였다. summary와 recent repository를 갈라 두어야 집계 규칙과 최근 피드 규칙을 독립적으로 바꿀 수 있고, 다음 구조 감사에서도 관리자 대시보드가 다른 도메인과 같은 파사드 패턴을 유지할 수 있다.

### 관리자 메일 저장소를 템플릿/수신자 repository로 분리
- `api/v1/Admin/Mail/Repository/{AdminMailRepository.php,AdminMailTemplateRepository.php,AdminMailRecipientRepository.php}`를 갱신해 메일 템플릿 CRUD/last_option 책임과 관리자 메일 수신자 조회·대상 해석 책임을 별도 repository로 분리하고, 기존 `AdminMailRepository`는 공개 시그니처를 유지하는 파사드로 축소함
  - Why: `AdminMailRepository`는 메일 템플릿 영속화와 회원 대상 필터링/수신자 해석이라는 성격이 다른 책임을 한 파일에 함께 들고 있어 다음 메일 관리자 변경 때 다시 병목이 될 가능성이 높았다. 템플릿과 수신자 repository를 갈라 두어야 메일 템플릿 정책과 대상 조회 정책을 서로 독립적으로 바꿀 수 있고, 관리자 메일 도메인도 다른 관리자 도메인과 같은 분리 패턴으로 일관되게 유지할 수 있다.

### 외부 인증 transition 서비스를 토큰 해석/가입 payload support로 분리
- `api/v1/Auth/External/Service/{ExternalAuthTransitionService.php,Support/ExternalAuthTransitionTokenDecoder.php,Support/ExternalAuthTransitionPayloadBuilder.php}`와 `tests/Auth/{ExternalAuthTransitionServiceTest.php,ExternalAuthTransitionTokenDecoderTest.php,ExternalAuthTransitionPayloadBuilderTest.php}`를 갱신해 transition_token 해석과 flow 검증, 외부 인증 가입 payload 보강, 링크 응답 직렬화를 support 클래스로 분리하고, 기존 `ExternalAuthTransitionService`의 생성자와 공개 메서드 시그니처는 유지한 채 session/claim/register 오케스트레이션만 남기도록 정리함
  - Why: `ExternalAuthTransitionService`는 세션 발급과 계정 연결 흐름을 조립하는 역할 외에 transition token 규칙, provider fallback 회원가입 payload, 링크 응답 직렬화까지 같이 들고 있어 다음 auth flow 확장 때 다시 같은 비대화 패턴으로 회귀할 위험이 있었다. 토큰 해석과 payload 조립을 support로 떼어 두어야 서비스는 auth gateway와 registration/session orchestration에 집중하고, 전환 규칙도 별도 단위 테스트로 더 안전하게 고정할 수 있다.

### 외부 인증 서비스를 입력 정규화/결과 조립 support로 분리
- `api/v1/Auth/External/Service/{ExternalAuthService.php,Support/ExternalAuthRequestNormalizer.php,Support/ExternalAuthResultBuilder.php}`와 `tests/Auth/{ExternalAuthRequestNormalizerTest.php,ExternalAuthResultBuilderTest.php}`를 추가·갱신해 외부 인증 시작/완료 입력 정규화, state 검증, 공급자 결과 상태 해석, transition token 조립을 support 클래스로 분리하고, 기존 `ExternalAuthService`의 생성자와 공개 메서드 시그니처는 그대로 유지한 채 오케스트레이션만 남기도록 정리함
  - Why: `ExternalAuthService`는 공급자 시작/완료 흐름을 조립하는 역할 외에 입력 정규화, replay 시나리오 정책, state 검증, 결과 응답 조립까지 모두 한 파일에 들고 있어 다음 공급자 추가나 auth flow 확장 시 다시 비대화될 위험이 컸다. 정규화와 응답 조립을 support로 분리해 두어야 서비스는 공급자 registry와 linkage orchestration에 집중하고, request/response 규칙도 별도 단위 테스트로 더 안전하게 고정할 수 있다.

### 관리자 회원 저장소를 조회/변경 repository로 분리
- `api/v1/Admin/Member/Repository/{AdminMemberRepository.php,AdminMemberRepositoryBase.php,AdminMemberQueryRepository.php,AdminMemberMutationRepository.php}`를 갱신해 기존 회원 저장소에 함께 있던 목록/상세/엑셀 export/query 책임과 수정/등급 변경/탈퇴 mutation 책임을 별도 repository로 분리하고, 기존 `AdminMemberRepository`는 공개 시그니처를 유지하는 파사드로 축소함
  - Why: `AdminMemberRepository`는 이미 서비스가 query/mutation으로 갈라져 있는데 저장소는 여전히 읽기와 쓰기를 한 파일에서 같이 들고 있어 계층 경계가 반쯤만 나뉜 상태였다. 저장소도 같은 축으로 분리해 두어야 회원 관리자 변경 정책과 조회/export 정책을 서로 독립적으로 바꿀 수 있고, 다음 구조 감사에서도 남은 member hotspot을 더 자연스럽게 낮출 수 있다.

### 관리자 회원 변경 서비스에서 권한 정책과 payload 정규화를 support로 분리
- `api/v1/Admin/Member/Service/{AdminMemberMutationService.php,Support/AdminMemberMutationAccessPolicy.php,Support/AdminMemberPayloadNormalizer.php}`를 갱신해 회원 수정/등급 변경/삭제 권한 판정을 access policy로 분리하고, 레거시 회원 payload 및 동의 이력 정규화를 payload normalizer로 이동했으며, 기존 서비스의 공개 생성자와 메서드 시그니처는 유지함
  - Why: `AdminMemberMutationService`는 권한 판정, 레거시 필드 정규화, 동의 이력 생성, 이미지 위임까지 한 파일에 함께 들어 있어 다음 회원 관리자 기능이 붙으면 다시 비대화될 가능성이 높았다. 정책과 정규화를 support로 분리해 두어야 서비스는 오케스트레이션에 집중하고, 권한 규칙과 레거시 payload 규칙도 별도 단위로 안전하게 바꿀 수 있다.

### Admin SMS 연락처 엔트리 저장소를 조회/변경 store로 분리
- `api/v1/Admin/Sms/Repository/{AdminSmsContactEntryStore.php,AdminSmsContactQueryStore.php,AdminSmsContactMutationStore.php}`를 갱신해 기존 연락처 엔트리 저장소에 섞여 있던 조회·내보내기 책임과 생성·수정·일괄 처리·업로드 가져오기 책임을 별도 store로 분리하고, 기존 `AdminSmsContactEntryStore`는 공개 시그니처를 유지하는 파사드로 축소함
  - Why: `AdminSmsContactEntryStore`는 주소록 조회, 중복 조회, CRUD, 일괄 처리, CSV/XLSX 업로드까지 한 파일에 쌓여 있어 이미 분리한 그룹 저장소와 비교해도 책임 농도가 너무 높았다. 조회와 변경 경계를 갈라 두어야 주소록 조회 규칙과 업로드/일괄 처리 규칙을 독립적으로 바꿀 수 있고, SMS 도메인 구조 감사에서도 남은 hotspot을 더 안정적으로 줄일 수 있다.

### Admin SMS 발송 저장소를 배치 조회/전송 store로 분리
- `api/v1/Admin/Sms/Repository/{AdminSmsMessageStore.php,AdminSmsMessageStoreBase.php,AdminSmsMessageBatchStore.php,AdminSmsMessageDispatchStore.php}`를 갱신해 기존 발송 저장소에 섞여 있던 배치/상세 조회 책임과 실제 전송·재전송·수신자 해석 책임을 별도 store로 분리하고, 기존 `AdminSmsMessageStore`는 공개 시그니처를 유지하는 파사드로 축소함
  - Why: `AdminSmsMessageStore`는 발송 이력 조회, 상세 조회, 수신자 해석, 실전 전송 영속화까지 모두 한 파일에 쌓여 있어 SMS 도메인 마지막 큰 저장소 병목이었다. 조회와 전송 경계를 갈라 두어야 이후 발송 조회 정책과 전송 정책을 서로 독립적으로 바꿀 수 있고, 구조 감사에서도 SMS 저장소 hotspot을 더 명확하게 줄일 수 있다.

### Admin SMS 연락처 저장소를 그룹/연락처 엔트리 store로 분리
- `api/v1/Admin/Sms/Repository/{AdminSmsContactStore.php,AdminSmsContactStoreBase.php,AdminSmsContactGroupStore.php,AdminSmsContactEntryStore.php}`를 갱신해 기존 연락처 저장소에 섞여 있던 회원 동기화·그룹 통계/관리 책임과 연락처 CRUD·가져오기/내보내기 책임을 별도 store로 분리하고, 기존 `AdminSmsContactStore`는 공개 시그니처를 유지하는 파사드로 축소함
  - Why: `AdminSmsContactStore`는 회원 동기화, 그룹 이동/통계, 연락처 조회/수정, CSV/XLSX 가져오기까지 한 파일에 쌓여 있어 SMS 도메인에서 가장 큰 병목이었다. 그룹과 엔트리 책임을 쪼개 두어야 이후 SMS 주소록 정책과 import/export 정책을 서로 독립적으로 바꿀 수 있고, 남은 SMS 저장소 정리도 책임 단위로 계속 밀 수 있다.

### Admin SMS 템플릿 저장소를 그룹/템플릿 엔트리 store로 분리
- `api/v1/Admin/Sms/Repository/{AdminSmsTemplateStore.php,AdminSmsTemplateStoreBase.php,AdminSmsTemplateGroupStore.php,AdminSmsTemplateEntryStore.php}`를 갱신해 템플릿 그룹 통계·이동 책임과 템플릿 CRUD·일괄 변경 책임을 별도 store로 분리하고, 기존 `AdminSmsTemplateStore`는 공개 시그니처를 유지하는 파사드로 축소함
  - Why: `AdminSmsTemplateStore`도 연락처 저장소와 비슷하게 그룹 관리와 템플릿 본문 관리가 한 파일에 섞여 있어 다음 리팩터링 대상이 명확했다. 그룹과 엔트리 책임을 미리 갈라 두어야 템플릿 분류 규칙과 템플릿 본문 정책을 따로 수정할 수 있고, SMS 도메인 구조 부채를 같은 패턴으로 일관되게 줄일 수 있다.

### 관리자 테마 서비스의 파일 시스템/메타데이터 판독을 support catalog로 분리
- `api/v1/Admin/System/Service/{AdminSystemThemeService.php,Support/AdminSystemThemeCatalog.php}`를 갱신해 설치 테마 탐색, README/theme config 파싱, screenshot 검증을 support catalog로 이동하고, 메인 서비스는 권한 확인과 설정 업데이트 규칙만 유지하도록 정리함
  - Why: `AdminSystemThemeService`는 관리자 권한 정책과 현재 테마 설정 업데이트 외에 디렉터리 스캔, 파일 파싱, 테마 메타데이터 조합을 한 클래스에 같이 들고 있어 다음 기능 확장 때 다시 비대화될 여지가 컸다. 파일 시스템 catalog를 분리해 두어야 테마 탐색 규칙과 관리자 설정 규칙이 서로 독립적으로 바뀔 수 있고, 구조 감사에서도 서비스 책임이 더 선명해진다.

### FAQ 마스터 서비스의 이미지 파일 처리를 support manager로 분리
- `api/v1/Admin/Faq/Service/{AdminFaqMasterService.php,Support/AdminFaqMasterImageManager.php}`를 갱신해 FAQ 마스터 서비스에 섞여 있던 이미지 업로드·삭제·메타데이터 판독·경로 계산을 support manager로 분리하고, 기존 공개 시그니처는 유지한 채 서비스는 CRUD와 응답 조합에 집중하도록 정리함
  - Why: `AdminFaqMasterService`는 FAQ 마스터 CRUD와 페이지네이션 외에 파일 시스템 접근과 이미지 검증까지 함께 들고 있어 다음 변경이 생길 때마다 서비스 경계가 다시 무너질 위험이 있었다. 이미지 책임을 별도 manager로 떼어 두어야 관리자 FAQ 도메인에서 파일 처리 정책을 독립적으로 바꿀 수 있고, 메인 서비스도 구조 감사 기준에서 더 명확한 파사드 역할을 유지할 수 있다.

### 관리자 메일 발송 서비스를 설정/페이로드 해석 support로 분리해 env 직접 접근을 격리
- `api/v1/Admin/Mail/Service/{AdminMailDispatchService.php,Support/AdminMailDispatchConfig.php,Support/AdminMailDispatchPayloadResolver.php,Support/AdminMailMailer.php}`를 갱신해 메일 발송 토글·발신자·제목 prefix env 해석을 support config로 수렴시키고, 템플릿/대상 payload 해석과 실제 mail transport 조합을 메인 서비스 밖으로 분리했으며 기존 공개 시그니처는 유지함
  - Why: `AdminMailDispatchService`는 bulk 발송 규칙과 env 설정 해석, 실제 메일 transport 조합을 한 파일에서 동시에 들고 있어 구조상 병목이었고, 관리자 영역의 직접 `$_ENV/getenv` 후보로도 계속 잡히고 있었다. 설정 해석과 payload helper를 분리해 두어야 이후 발송 정책 변경과 transport 교체가 같은 클래스에 다시 얹히지 않고, 관리자 서비스 계층의 런타임 직접 접근도 한 단계 더 줄일 수 있다.

### 관리자 시스템 유지보수 파사드를 파일 정리/Browscap 전용 서비스로 분리
- `api/v1/Admin/System/Service/{AdminSystemMaintenanceService,AdminSystemFileMaintenanceService,AdminSystemBrowscapService}.php`, `api/v1/Admin/System/Service/Support/AdminSystemMaintenanceContext.php`를 갱신해 기존 유지보수 서비스에 섞여 있던 파일 정리와 Browscap 갱신/변환 로직을 전용 서비스 2개로 분리하고, 경로/디렉터리 helper는 context support로 수렴했으며 기존 파사드의 생성자와 공개 메서드 시그니처는 유지함
  - Why: `AdminSystemMaintenanceService`는 시스템 파일 청소와 Browscap 운영 작업이라는 서로 다른 책임을 한 클래스에 함께 들고 있어 다음 기능 추가 때마다 유지보수 파사드가 다시 비대해질 위험이 컸다. 내부 서비스와 context로 절개해 두어야 파일 정리 규칙 변경과 Browscap 운영 변경이 서로 엮이지 않고, 테스트도 책임 단위로 더 안전하게 유지할 수 있다.

### Admin SMS 저장소 공통 helper를 베이스 클래스로 수렴해 중복 규칙을 제거
- `api/v1/Admin/Sms/Repository/AdminSmsRepositoryBase.php`를 추가하고 `AdminSmsRepository`, `AdminSms{Template,Contact,Message}Store`가 이를 상속하도록 정리해 SMS 테이블 해석, 저장소 가용성 검사, 전화번호 정규화/표시, provider 준비 여부 판단, timestamp 생성 helper를 공용화함
  - Why: 저장소/서비스를 분리한 뒤에도 SMS 도메인 내부에서는 같은 helper가 여러 파일에 복제돼 있어 이후 수정 때 한 군데만 바꾸고 다른 군데를 놓치는 drift 위험이 남아 있었다. 공통 베이스로 수렴해 두어야 다음 정리는 실제 비즈니스 책임 분리에 집중할 수 있고, SMS 하위 저장소가 다시 helper 복붙으로 커지는 회귀도 막을 수 있다.

### Admin SMS 파사드 서비스를 템플릿/주소록/발송 전용 서비스로 분리해 서비스 계층 병목을 해소
- `api/v1/Admin/Sms/Service/{AdminSmsService,AdminSmsTemplateService,AdminSmsContactService,AdminSmsMessageService}.php`, `api/v1/Admin/Sms/Service/Support/AdminSmsInput.php`를 갱신해 기존 단일 서비스에 섞여 있던 템플릿/주소록/발송 검증과 페이지네이션 규칙을 전용 서비스 3개와 공용 입력 정규화 support 클래스로 분리하고, `AdminSmsService`는 기존 공개 시그니처를 유지한 채 파사드 위임만 수행하도록 정리함
  - Why: 저장소 분리를 마친 뒤에도 `AdminSmsService`가 템플릿/주소록/발송 규칙을 한 파일에 계속 쌓고 있어 다음 기능 추가 때마다 서비스 계층이 다시 갓파일로 회귀할 위험이 컸다. 검증/정규화 규칙을 공용 support로 모으고 전용 서비스별로 절개해 두어야 이후 수정이 한 군집에만 머물고, SMS 도메인 구조 감사도 서비스와 저장소 양쪽에서 같은 방식으로 유지할 수 있다.

### Admin SMS 발송 이력/재전송 군집을 하위 저장소로 분리해 파사드를 설정 조립 중심으로 축소
- `api/v1/Admin/Sms/Repository/{AdminSmsRepository,AdminSmsMessageStore}.php`를 갱신해 발송 이력 조회, 재전송, 수신자 해석, 중복 수신자 정리, write/history 기록 책임을 `AdminSmsMessageStore`로 추출하고, 기존 `AdminSmsRepository`는 설정 조회와 하위 저장소 조립만 맡도록 정리함
  - Why: 템플릿과 연락처 군집을 떼어낸 뒤 남아 있던 마지막 큰 책임은 발송 이력/재전송/recipient resolve 묶음이었다. 이 군집까지 분리해 두어야 `AdminSmsRepository`가 더 이상 거대 구현 파일로 회귀하지 않고, SMS 도메인에서 장애가 나더라도 `설정`, `주소록`, `템플릿`, `발송 이력` 중 어느 층에서 문제가 났는지 바로 좁혀서 볼 수 있다.

### Admin SMS 연락처 군집을 하위 저장소로 분리해 회원동기화/주소록 책임을 파사드 밖으로 이동
- `api/v1/Admin/Sms/Repository/{AdminSmsRepository,AdminSmsContactStore}.php`를 갱신해 회원 동기화, 연락처 그룹/연락처 CRUD, 일괄 처리, 업로드 가져오기, 내보내기, 그룹 통계를 `AdminSmsContactStore`로 추출하고, 기존 `AdminSmsRepository`는 공개 시그니처를 유지한 채 연락처 관련 API를 하위 저장소에 위임하도록 정리함
  - Why: 템플릿 군집을 뗀 뒤에도 `AdminSmsRepository`에는 회원 동기화와 주소록 관리 책임이 크게 남아 있었고, 이 책임은 발송 이력/transport보다 응집도가 높으면서도 외부 계약을 흔들지 않고 먼저 절개할 수 있는 두 번째 절단면이었다. 연락처 저장소를 분리해 두면 이후 남는 것은 발송 이력과 transport 조립 책임 중심으로 좁아지고, 주소록 계열 테스트/정합성 문제도 한 파일에서 더 쉽게 추적할 수 있다.

### Admin SMS 템플릿 군집을 하위 저장소로 분리해 `AdminSmsRepository`를 파사드 중심으로 축소
- `api/v1/Admin/Sms/Repository/{AdminSmsRepository,AdminSmsTemplateStore}.php`를 갱신해 템플릿 그룹/템플릿 CRUD, 그룹 통계, 템플릿 저장소 가용성 검사를 `AdminSmsTemplateStore`로 추출하고, 기존 `AdminSmsRepository`는 공개 메서드 시그니처를 유지한 채 하위 저장소에 위임하도록 정리함
  - Why: 구조 감사에서 SMS 도메인의 다음 hotspot은 여전히 `AdminSmsRepository`였고, 템플릿 군집은 연락처/발송 이력보다 외부 파급 없이 먼저 떼어낼 수 있는 응집도 높은 절단면이었다. 서비스와 테스트가 넓게 `AdminSmsRepository` 파사드에 묶여 있으므로 생성자나 공개 계약을 흔들지 않고 내부 위임 저장소만 추출해 두어야 회귀 없이 파일 책임을 줄이고, 다음 단계에서 연락처/발송 이력도 같은 패턴으로 더 안전하게 분할할 수 있다.

### 외부 인증 provider의 env 직접 접근을 support config로 이동
- `api/v1/Auth/External/Support/ExternalAuthProviderConfig.php`, `api/v1/Auth/definitions.php`, `api/v1/Auth/External/Provider/{GoogleExternalAuthProviderAdapter,KakaoExternalAuthProviderAdapter}.php`, `tests/Auth/{ExternalAuthProviderConfigTest,GoogleExternalAuthProviderAdapterTest,KakaoExternalAuthProviderAdapterTest,ExternalAuthServiceTest}.php`를 갱신해 Google/Kakao provider가 직접 읽던 `AUTH_EXTERNAL_*` env 접근을 support config로 수렴시키고, adapter는 DI된 provider config만 사용하도록 정리함
  - Why: 구조 감사에서 외부 인증 adapter가 `$_ENV/getenv`를 직접 읽는 경로가 반복적으로 잡히고 있었고, provider 구현이 transport 로직과 runtime 설정 해석까지 동시에 책임지는 상태였다. provider별 override는 유지하되 env 해석 지점을 support config로 모아야 adapter는 계약/정규화 책임만 유지하고, 이후 환경설정 정책도 한 지점에서만 바꿀 수 있다.

### Admin SMS 저장소에서 레거시 iCode 전송 책임을 support adapter로 분리
- `api/v1/Admin/Sms/Repository/AdminSmsRepository.php`, `api/v1/Admin/Sms/Support/{SmsTransport,LegacyIcodeTransport}.php`, `api/v1/Admin/definitions.php`를 갱신해 SMS 저장소가 직접 하던 레거시 iCode client 부팅/환경 define/결과 정규화를 `LegacyIcodeTransport`로 이동하고, 관리자 도메인 정의에서 transport binding을 추가함
  - Why: 구조 감사에서 가장 큰 hotspot이 `AdminSmsRepository`였고, 특히 `$GLOBALS['config']`를 포함한 레거시 iCode bootstrap이 저장소 내부에 섞여 있어 DB 책임과 anti-corruption layer 책임이 한 파일에서 뒤엉켜 있었다. 이 경계를 support adapter로 분리해 두어야 이후 SMS 저장소는 데이터 정합성과 기록 쪽으로 더 안전하게 쪼갤 수 있고, 레거시 전송 경계도 한 지점에서만 추적할 수 있다.

### PHP 감사 체계를 공급자 기준 `구조 / 구현 / 포팅`으로 재분류
- `docs/AUDIT_STRATEGY.md`, `php/AGENTS.md`, `.agent/workflows/{audit,deep-audit,field-parity-audit}.md`, `composer.json`, `scripts/run_{standard,deep,field_parity}_audit.sh`, `docs/{README,DOCUMENT_REGISTRY,HISTORY}.md`를 갱신해 PHP 감사 책임을 `구조 감사`, `구현 감사`, `포팅 정합성 감사`, `통합 감사`로 재분류하고, 역할 이름 기반 alias 명령(`audit:implementation`, `audit:structure`, `audit:porting`)을 추가했으며, Rust 소비단 감사는 Rust가 소유한다는 경계를 명문화함
  - Why: 형님이 요구한 감사 기준은 “한 번에 다 돌리는 만능 감사”가 아니라, 공급자 프로젝트에서 절대 틀어지면 안 되는 구조와 기능 구현, 레거시 포팅 정합성을 분리해 각각 다른 기준으로 보는 체계였다. 기존 `standard / deep / field-parity`도 역할은 있었지만 왜 분리하는지와 Rust 소비단 감사 책임 경계가 문서상 충분히 선명하지 않아, 다음 작업자가 다시 모든 감사를 한데 뭉치거나 소비단 판단까지 PHP에서 하려는 방향으로 회귀할 위험이 있었다.

### Codex 앱용 PHP 래퍼를 추가하고 감사 진입점을 `composer run audit:*`로 고정
- `php/AGENTS.md`, `.gitignore`, `scripts/run_{standard,deep,field_parity}_audit.sh`, `composer.json`, `api/routes/v1/auth.php`, `docs/{HISTORY,TODO}.md`를 갱신해 Codex 앱이 `php` 디렉토리에서 바로 읽는 얇은 래퍼를 추가하고, 표준/심층/필드 정합성 감사를 각각 `composer run audit:standard|deep|field-parity`로 실행 가능하게 정리했으며, 새 audit shell wrapper가 ignore되지 않도록 예외를 추가하고, Slim route args를 shape array로 정규화해 표준 감사 래퍼가 품질 게이트까지 그대로 통과하도록 맞춤
  - Why: 기존 구조는 헌법과 워크플로우는 있어도 Codex가 실제로 무엇을 먼저 읽고 어떤 명령을 실행해야 하는지 즉시 알기 어려웠다. `php/AGENTS.md`와 실행 가능한 audit 래퍼를 두면 Codex는 문서 묶음을 해석하는 대신 고정된 진입점만 따르면 되고, 래퍼 자체가 품질 게이트에서 막히면 의미가 없으므로 route args 타입 경계도 같이 바로잡아야 했다.

### 감사 워크플로우를 표준/심층/특수 3축으로 재정렬하고 구식 커버리지 감사 파일을 제거
- `.agent/workflows/{audit,deep-audit,field-parity-audit,commit-push}.md`를 현재 구조 기준으로 다시 정리하고, 중복과 stale reference가 심했던 `.agent/workflows/api-coverage-audit.md`를 제거했으며, 표준 감사는 `quality-gate` 중심의 기본 루프, 심층 감사는 구조 드리프트 탐사, 필드 정합성 감사는 `/admin/schema` 전용 특수 루프로 역할을 분리했고, 활성 기간을 지난 `docs/audits/{AUDIT_REPORT_2026-03-05,DEEP_AUDIT_2026-03-05}.md`는 archive로 이동해 `docs-check`를 다시 녹색으로 복구함
  - Why: 기존 워크플로우는 `api/routes.php`, 중앙 `Integration/Contracts`, Flutter 3자 통합, `specs/audits` 같은 과거 구조 기준 명령이 섞여 있어 실제 저장소를 기준으로 감사를 돌릴수록 오히려 잘못된 명령을 따라갈 위험이 있었다. 감사 명령 파일은 많다고 좋은 것이 아니라, 표준 루프 1개와 목적이 다른 심층/특수 루프만 남겨야 프로젝트가 커져도 무엇을 언제 돌려야 하는지가 흔들리지 않는다.

### `/admin/schema`에 create용 `default_value`를 추가해 생성 폼 초기값을 백엔드 계약으로 고정
- `scripts/extract_admin_schema.py`, `api/v1/Admin/Schema/{README.md,schema-domains.json,Data/generated/*.json}`, `api/docs/{openapi.yaml,openapi.contract-manifest.json}`, `tests/{Admin/Schema/AdminSchemaServiceTest.php,contract/AdminSchemaContractTest.php}`, `docs/{API_SPEC,HISTORY}.md`를 갱신해 관리자 스키마 필드에 `default_value`를 추가하고, 레거시 폼의 정적 배열/생성 분기/실제 컨트롤 기본값과 manifest override를 우선으로 추출하되 `$config[...]`·현재 레코드·헬퍼 기반 동적 값은 `null`로 남기도록 정리함
  - Why: 헤드리스 관리자 소비단이 필드명/타입만 받아서는 “게시판 생성 시 기본 스킨은 basic”, “메뉴 생성 시 기본 노출은 true” 같은 초기 상태를 다시 프론트에 하드코딩하게 된다. 반대로 편집값과 동적 설정값까지 `default_value`로 오해하면 잘못된 초기값으로 저장될 수 있으므로, 생성용 정적 기본값만 백엔드 계약으로 내리고 동적 기본값은 의도적으로 `null`로 남겨야 소비단이 안전하게 create/edit를 분리할 수 있다.

### PHP 8.5 deprecation 없는 전체 PHPUnit 상태로 마감
- `api/v1/Member/Service/MemberImageManager.php`, `tests/{Admin/System/AdminSystemCoverageServiceTest.php,File/File{OperationSupport,Service}Test.php,Member/{MemberImageManagerTest,MemberMediaServiceTest.php},Setup/EnvironmentCheckerTest.php}`, `docs/{TODO,HISTORY}.md`를 갱신해 `Reflection*::setAccessible()`와 `imagedestroy()` deprecation 지점을 제거하고 `./vendor/bin/phpunit --display-deprecations` 기준 전체 스위트를 경고 없이 다시 통과시킴
  - Why: 구조 작업이 끝나도 전체 테스트가 PHP 8.5 deprecation을 계속 뿜으면 다음 작업자가 실제 회귀와 런타임 정책 변경을 구분하기 어려워진다. 이번 라운드는 구조 정상화 마감이 목적이므로, 마지막에 전체 스위트를 깨끗하게 만들어 두어야 이후 기능 작업에서 새 경고를 바로 잡아낼 수 있다.

### runtime env와 legacy config fallback 접근을 typed config/provider로 격리
- `api/v1/Core/Config/{EnvConfig,LegacyConfigProvider}.php`, `api/v1/Auth/definitions.php`, `api/routes/v1/{admin,auth}.php`, `api/v1/{Config/Repository/ConfigRepository.php,Auth/Repository/AuthRepositorySupport.php}`, `tests/Core/Config/{EnvConfigTest,LegacyConfigProviderTest}.php`, `docs/{TODO,HISTORY}.md`를 갱신해 `ADMIN_SMS_ENABLED`, `G5_INDEPENDENT`, JWT 설정은 `EnvConfig`로 수렴시키고, 레거시 `$GLOBALS['config']` fallback은 `LegacyConfigProvider`를 통해서만 읽도록 정리함
  - Why: route module과 JWT wiring이 직접 `$_ENV/getenv`를 읽고, repository fallback이 바로 `$GLOBALS['config']`를 만지면 테스트와 구조 감사 모두에서 실제 의존 경계가 흐려진다. 운영에 필요한 값을 typed config로 모으고, 불가피한 legacy fallback도 전용 provider 뒤로 숨겨 두어야 이후 레거시 분리와 blackbox 테스트가 안정적으로 이어진다.

### local-only gateway를 도메인 Contracts로 승격하고 Integration alias를 deprecated 호환층으로 축소
- `api/v1/{Comment,File,Like,Memo,Menu,Qa}/Contracts/*.php`, `api/v1/Integration/Contracts/*.php`, 관련 `definitions.php`, 서비스 타입 선언, `tests/contract/g5-repository/GatewayImplementationContractTest.php`, `docs/{TODO,HISTORY}.md`를 갱신해 local-only gateway는 도메인 내부 계약을 기준으로 사용하고 기존 `Integration\Contracts`는 deprecated alias로 계속 해석되도록 정리함
  - Why: `Comment/File/Like/Memo/Menu/Qa`는 플러그인 scope나 다도메인 공유 정책에 직접 걸리지 않는 local port인데도 중앙 `Integration\Contracts`를 계속 참조하고 있어 도메인 경계가 흐려져 있었다. 새 로컬 계약을 진실 원본으로 세우고 기존 인터페이스는 alias 호환층으로 남기면 내부 의존 방향은 바로잡되, 아직 옛 namespace를 쓰는 테스트나 확장 코드는 한 번에 깨지지 않는다.

### `api/container.php`를 도메인 definitions 수집기로 축소
- `api/container.php`, `api/v1/*/definitions.php`, `docs/{TODO,HISTORY}.md`를 갱신해 기존 중앙 DI 배열을 도메인별 `definitions.php`로 분산하고, 메인 container는 plugin context를 주입한 뒤 정의 파일을 수집해 builder에 등록하는 조립기만 남기도록 정리함
  - Why: `routes/v1`를 분해한 다음에도 DI 등록이 `container.php` 한 곳에 몰려 있으면 도메인 추가 때마다 같은 중앙 파일에 바인딩, infra 설정, plugin context를 함께 수정해야 한다. PHP-DI autowiring을 유지한 채 정의 위치만 각 도메인으로 내리면 외부 계약 변화 없이 중앙 병목을 줄이고, 이후 local contract 이관과 config 정리도 도메인 단위로 진행하기 쉬워진다.

### `/api/routes/v1` 엔트리를 resolve 기반 모듈 조립기로 축소
- `api/routes/v1.php`, `api/routes/v1/admin.php`, `api/routes/v1/*.php`, `api/routes/v1/admin/*.php`, `scripts/docs-check.sh`, `docs/{TODO,HISTORY}.md`를 갱신해 공개/관리자 라우트를 도메인별 route module로 분해하고, 각 모듈이 자신이 필요한 컨트롤러/미들웨어를 직접 resolve하도록 정리했으며, 문서 거버넌스 검증기가 중첩 route module까지 재귀적으로 수집하도록 보강함
  - Why: 기존 `v1.php`와 `admin.php`는 경로 수가 늘어날수록 중앙 파일이 계속 비대해지고 새 도메인 추가 때마다 진입점 한 곳에서 import, factory, route wiring을 모두 만지게 만드는 병목이었다. 외부 HTTP 계약은 그대로 유지한 채 route 등록 책임을 모듈 안으로 내리면 충돌 면적이 줄고, `docs-check`가 같은 구조를 이해하게 맞춰 두어야 다음 구조 작업에서도 문서/계약 검증이 깨지지 않는다.

### AI 기본 검색 경계를 SSOT 중심으로 고정하고 stale audit 보관 정책을 다시 맞춤
- `.agentignore`, `.cursorignore`, `.gitignore`, `.agent/sub-constitutions/document-governance.md`, `docs/{README,TODO,HISTORY,DOCUMENT_REGISTRY}.md`를 갱신하고 `scripts/archive_old_audits.py --apply --days 7`로 활성 보관 기간을 넘긴 감사 파일을 `docs/archive/audits/`로 이동해 기본 AI 검색 범위를 SSOT/계약 문서 중심으로 재정렬함
  - Why: 문서 체계 자체는 이미 SSOT/지원/기록/아카이브로 분리되어 있었지만, ignore 규칙이 없고 오래된 감사 파일이 활성 영역에 남아 있으면 AI가 현재 설계보다 과거 감사본과 프롬프트 잔해를 먼저 집을 가능성이 높았다. 권위 체계를 바꾸는 것이 아니라 검색 기본값을 현재 계약 중심으로 좁히고, stale audit를 실제로 archive로 밀어 넣어야 다음 구조 작업이 과거 문서 노이즈에 덜 흔들린다.

### 통합 감사 진입점을 PHP-Rust 기준으로 단순화하고 보관 상태 소비자 참조를 정리
- `composer.json`의 `audit:integrated`를 `php + rust` 기준으로 고정하고, `docs/testing/EXTERNAL_PROVIDER_TESTING_REVIEW.md`의 활성 소비자 설명을 Rust 데스크톱 앱 기준으로 정리함
  - Why: 현재 활성 제품 범위는 `php + rust`인데도 문서와 감사 진입점이 계속 Flutter를 routine 소비자처럼 가정하고 있으면, 실제 작업 범위와 generated audit가 계속 어긋난다. 기본 감시선을 현재 제품 기준으로 줄여야 불필요한 drift와 오해를 막을 수 있다.

### TDD / 회귀 방지 규칙을 PHP 헌법 본문으로 승격
- `.agent/Constitution.md` `§7.2 테스트 동반 개발`을 보강해 `버그 수정 = 회귀 테스트 필수`, `TDD 우선 원칙`, `인증/세션/env/config/마이그레이션/트랜잭션/동시성 같은 운영·보안 경로 전용 회귀망 필수`, `회귀 테스트 없는 커밋 금지`, `감사 문서는 보조이고 강제 규칙은 헌법`을 명문화함
  - Why: 기존 PHP 헌법에도 `재현 테스트 → 픽스 → 통과` 원칙은 있었지만, 어떤 AI 모델이라도 오해 없이 따라야 할 수준으로 `회귀 테스트 의무`, `민감 경로 전용 회귀망`, `감사 문서보다 헌법 우선`이 강제 문구로 정리돼 있지는 않았다. 운영/API 회귀는 테스트 규칙이 흐리면 바로 재발하므로, 감사 보고서가 아니라 헌법 본문에 못 박아야 했다.

### `php-cs-fixer` 잔여 108파일을 전량 정리해 dry-run 0건으로 마감
- `.php-cs-fixer.dist.php` 범위의 `api/`, `tests/`, `scripts/` 잔여 후보 108파일에 자동 포맷을 적용하고, `./vendor/bin/php-cs-fixer fix --dry-run --format=json --config=.php-cs-fixer.dist.php` 기준 `files=[]` 상태를 복구했으며 `docs/{TODO,IMPLEMENTATION_ROADMAP,HISTORY}.md`, `docs/audits/{AUDIT_LATEST,AUDIT_REPORT_2026-03-11}.md`에 결과를 반영함
  - Why: 스타일 작업을 소배치로만 남겨 두면 매 턴마다 같은 잔여 후보를 다시 훑어야 하고, 이후 기능 변경 PR이 포맷 부채와 섞여 리뷰 비용이 계속 커진다. 범위가 이미 REST API 프로젝트 코드로 제한된 만큼, 이 시점에 잔여 후보를 0으로 만들어 다음 변경부터는 실제 로직 diff만 보이게 하는 편이 유지보수 효율이 더 높다.

### 스크랩 등록/삭제와 `mb_scrap_cnt` 동기화를 같은 트랜잭션으로 보강
- `api/v1/Post/{Repository/PostScrapMutationRepository.php,Service/PostScrapService.php}`, `tests/Post/{ScrapTest.php,PostScrapRepositoryTest.php}`, `docs/{TODO,IMPLEMENTATION_ROADMAP,HISTORY}.md`, `docs/audits/POINT_CONCURRENCY_AUDIT_2026-03-10.md`를 갱신해 `add/remove -> updateScrapCount` 2단계 흐름을 repository 내부 단일 mutation으로 바꾸고, member lock 안에서 `mb_scrap_cnt`를 같은 트랜잭션으로 동기화하도록 정리함
  - Why: 추천 경합을 보강한 뒤에도 스크랩은 서비스 계층에서 `등록/삭제`와 `카운트 동기화`가 분리되어 있어, 짧더라도 `mb_scrap_cnt`가 stale 될 가능성이 남아 있었다. 이 값은 사용자가 바로 보는 프로필/요약 수치라서 “필요하면 나중에”보다 지금 repository 안에서 원자성을 닫아두는 편이 후속 운영 리스크가 적다.

### `php-cs-fixer` 1차 소배치로 포맷 부채를 4파일 줄임
- `api/v1/{Core/Error/ProblemDetailsHelper.php,Layout/{Controller/LayoutController.php,Service/LayoutService.php}}`, `tests/Core/Error/ProblemDetailsHelperTest.php`에 1차 소배치 자동 포맷을 적용하고, `.php-cs-fixer.dist.php` 기준 dry-run 잔여 후보를 `111 -> 108 files`로 줄임
  - Why: 스타일 부채를 한 번에 밀면 기능 변경과 포맷 변경이 뒤섞여 리뷰 품질이 떨어진다. 범위를 이미 `api/`, `tests/`, `scripts/`로 제한해 둔 만큼, 리스크가 낮은 파일 묶음부터 작은 배치로 줄여 나가야 이후 포맷 정리가 실제로 지속 가능해진다.

## 2026-03-10

### Service coverage를 `80.17%`까지 복구해 품질 게이트를 다시 통과
- `tests/{Admin/System/AdminSystemCoverageServiceTest.php,Admin/Admin{FinalRepositoryServiceCoverage,OpenServiceCoverage}Test.php,Admin/Sms/AdminSmsServiceCoverageTest.php,Admin/Faq/{AdminFaqServiceCoverageTest,AdminFaqMasterServiceTest.php},Admin/Point/AdminPointServiceTest.php,Admin/Member/AdminMemberImageServiceCoverageTest.php,Admin/Poll/AdminPollServiceTest.php,Admin/Mail/AdminMailServiceTest.php,File/FileUploadServiceCoverageTest.php}`를 보강해 `./scripts/run_quality_gates.sh` 기준 service coverage를 `59.88% -> 80.17% (5449/6797)`로 끌어올리고 하드 게이트를 다시 녹색으로 복구함
  - Why: `ADM-303`, `AUD-201`, 외부 인증/관리자 도메인 확장 이후 서비스 계층 분모가 급증하면서 커버리지 게이트가 다시 적색으로 무너졌고, 이 상태를 `--skip-quality`로 계속 넘기면 품질 게이트 자체가 신뢰를 잃는다. 범위가 넓어진 Admin/System/SMS/FAQ/File 서비스들을 실 서비스 경로 기준 테스트로 덮어 최소한 “새로 추가한 서비스는 다시 게이트에 포함된다”는 상태를 복원해야 이후 배포와 후속 리팩터링이 정상화된다.

### 스테이징 SMS 운영 방침을 `ADMIN_SMS_ENABLED` 기반 404 비노출로 고정
- `api/routes/v1{,.php,/admin.php}`, `.env.example`, `docs/{API_SPEC,README,IMPLEMENTATION_ROADMAP,TODO,HISTORY}.md`를 갱신해 SMS 관리자 경로를 런타임 토글로 제어하고, 스테이징 canonical을 `g5_sms5_*` 테이블/icode 운영 준비 전까지 `ADMIN_SMS_ENABLED=false` 기반 `404 Not Found` 비노출로 정리함
  - Why: 기존 스테이징은 SMS 테이블이 없는 상태에서 `/admin/sms/*`가 `503`으로만 보였고, 이 상태는 “구현은 됐지만 운영 준비는 안 된 기능”을 클라이언트가 계속 탐색하게 만든다. 이번 라운드의 목표는 테이블 설치 여부 논쟁을 남기는 것이 아니라 스테이징 운영 정책을 확정하는 것이므로, 준비 전에는 경로 자체를 숨기고 준비 후에만 다시 노출하는 토글을 명시적으로 두는 편이 더 안전했다.

### 포인트/추천/스크랩 경합 재감사와 추천 트랜잭션 보강
- `api/v1/Like/Repository/LikeRepository.php`, `tests/{Like/LikeRepositoryTest.php,File/FilePointRepositoryTest.php}`, `docs/audits/POINT_CONCURRENCY_AUDIT_2026-03-10.md`, `docs/{IMPLEMENTATION_ROADMAP,TODO,HISTORY}.md`를 갱신해 포인트/다운로드 포인트/추천/스크랩 경합 구간을 다시 점검하고, `LikeRepository`의 vote row insert와 게시글 카운터 update를 하나의 트랜잭션으로 묶었으며 관련 회귀 테스트를 추가함
  - Why: named lock은 이미 들어가 있었지만 추천/비추천은 `INSERT -> counter UPDATE`가 분리되어 있어 중간 실패 시 카운터와 이력의 정합성이 깨질 여지가 있었다. `AUD-201`은 “어디를 먼저 보강할지”를 정하는 항목이므로, 실제 위험이 있던 한 지점을 트랜잭션으로 닫고 나머지는 감사 문서와 테스트로 기준을 고정하는 것이 가장 현실적인 마감이었다.

### php-cs-fixer 적용 범위를 REST API 프로젝트 코드로 고정
- `.php-cs-fixer.dist.php`, `docs/{IMPLEMENTATION_ROADMAP,TODO,HISTORY}.md`를 갱신해 스타일 정리 범위를 `api/`, `tests/`, `scripts/`의 PHP 파일로 한정하고, 레거시 `adm/` 전체를 자동 포맷 대상에서 제외하는 기준을 추가함
  - Why: `STYLE-101`의 핵심은 “무엇을 정리할 것인가”를 확정하는 것이지, 레거시 전체를 한 번에 건드리는 것이 아니다. 설정 파일이 없던 상태에서는 `php-cs-fixer`가 저장소 전체를 훑으려 해 리뷰 노이즈만 키우므로, REST API 프로젝트 범위를 먼저 명시해 이후 포맷 작업이 의도치 않게 레거시 코어까지 번지지 않게 해야 했다.

### 외부 인증 provider 기본 endpoint를 catalog로 분리해 배포 하드코딩 게이트를 통과
- `api/v1/Auth/External/{Provider/{GoogleExternalAuthProviderAdapter,KakaoExternalAuthProviderAdapter}.php,Support/{ExternalAuthProviderEndpointCatalog.php,provider-endpoints.json}}`, `tests/Auth/{GoogleExternalAuthProviderAdapterTest.php,KakaoExternalAuthProviderAdapterTest.php,ExternalAuthServiceTest.php}`, `docs/testing/EXTERNAL_PROVIDER_SANDBOX_MATRIX.md`를 갱신해 provider 기본 authorize/token/userinfo URL을 JSON catalog로 이동하고, 문서의 로컬 절대경로를 제거함
  - Why: 2026-03-10 스테이징 배포 직전 품질 게이트에서 외부 URL 리터럴과 문서 절대경로가 즉시 차단되었고, 이 상태를 무시하면 외부 인증 feature는 머지됐어도 실제 배포가 불가능하다. provider 기본값을 코드 밖 catalog로 빼서 hardcoding 규칙을 만족시키고, 동시에 문서 참조도 상대 경로 기준으로 정리해야 정상 배포가 가능했다.

### 레거시 `adm/index.php` 대체용 관리자 대시보드 요약 경계를 추가
- `api/v1/Admin/Dashboard/{Controller/AdminDashboardController.php,Service/AdminDashboardService.php,Repository/AdminDashboardRepository.php}`, `api/routes/v1{,.php,/admin.php}`, `api/docs/openapi.yaml`, `tests/{Admin/Dashboard/AdminDashboardServiceTest.php,contract/AdminDashboardContractTest.php}`, `docs/{README,IMPLEMENTATION_ROADMAP,TODO,HISTORY}.md`를 갱신해 `/admin/dashboard` 단일 응답으로 신규 회원/최근 게시물/최근 포인트/방문 요약을 묶어 제공하도록 정리함
  - Why: `ADM-302`는 레거시 관리자 메인만 빠진 상태로 Admin API 전체가 거의 닫혀 있었기 때문에 오래 남아 있었다. 이미 흩어져 있던 회원/포인트/방문 통계를 소비자에서 다시 조립하게 두면 `adm/index.php` 대체라는 목표가 계속 미완으로 남으므로, 관리자 첫 화면이 바로 사용할 수 있는 요약 응답을 서버에서 정식 계약으로 제공해야 했다.

### 외부 인증 foundation 위에 두 번째 실제 provider(`kakao`)를 연결
- `api/v1/Auth/External/Provider/KakaoExternalAuthProviderAdapter.php`, `api/container.php`, `tests/{Auth/KakaoExternalAuthProviderAdapterTest.php,Auth/ExternalAuthServiceTest.php}`, `docs/{README,TODO,HISTORY}.md`, `docs/testing/{EXTERNAL_PROVIDER_SANDBOX_MATRIX,EXTERNAL_PROVIDER_TESTING_REVIEW,API_BLACKBOX_TESTING}.md`를 갱신해 Kakao Login REST API 기준 authorize/code/userinfo adapter를 추가하고, `google`에 이어 두 번째 실제 provider를 registry에 연결함
  - Why: `AUTH-309`이 남아 있으면 foundation이 여전히 “실제 공급자 1종만 증명된 상태”에 머무른다. 공개 자료 접근성과 국내 서비스 적합성을 함께 고려하면 `Kakao`가 두 번째 adapter로 가장 자연스럽고, `cf_kakao_*` 설정 컬럼도 이미 스키마에 있으므로 지금 여기서 provider abstraction이 복수 vendor로도 유지되는지 코드와 문서에서 함께 닫아야 했다.

### 외부 인증 foundation 위에 첫 실제 provider(`google`)를 연결하고 transition 정책을 문서화
- `api/v1/Auth/External/{Contracts/ExternalAuthHttpClient.php,Provider/GoogleExternalAuthProviderAdapter.php,Support/NativeExternalAuthHttpClient.php,Service/ExternalAuthService.php}`, `api/container.php`, `api/docs/{openapi.yaml,openapi.contract-manifest.json}`, `tests/{Auth/GoogleExternalAuthProviderAdapterTest.php,Auth/ExternalAuthServiceTest.php,contract/ExternalAuthContractTest.php}`, `docs/{README,TODO,HISTORY}.md`, `docs/testing/{EXTERNAL_PROVIDER_SANDBOX_MATRIX,EXTERNAL_PROVIDER_TESTING_REVIEW,API_BLACKBOX_TESTING}.md`를 갱신해 외부 인증 foundation에 `google` adapter를 연결하고, `transition_token` TTL/재사용 정책과 staging smoke 체크리스트 기준을 고정함
  - Why: `AUTH-304`로 공급자 후보와 공개 정책은 정리됐지만, 실제 adapter 1종이 없으면 foundation이 계속 가짜 경로로만 남는다. 가장 공개 문서 접근성이 좋고 표준 OAuth/OIDC 흐름에 맞는 `Google`을 먼저 연결해 provider abstraction이 실전에서도 동작하는지 증명하고, 동시에 `transition_token` 정책을 문서로 못 박아 다음 smoke와 2번째 provider 작업이 흔들리지 않게 해야 했다.

### 외부 인증 공급자 sandbox 정책 매트릭스를 고정해 AUTH-304를 마감
- `docs/testing/{EXTERNAL_PROVIDER_SANDBOX_MATRIX,EXTERNAL_PROVIDER_TESTING_REVIEW,API_BLACKBOX_TESTING}.md`, `docs/{README,DOCUMENT_REGISTRY,TODO,HISTORY}.md`를 갱신해 공개 공식 문서 기준 공급자 sandbox/test 정책을 `Google`, `Kakao`, `Naver`, `KG이니시스`, `NHN KCP`, `KCB`까지 정리하고, fake provider + callback replay는 CI canonical, 실제 vendor sandbox는 staging/manual 계층이라는 기준을 확정함
  - Why: `AUTH-304`는 더 이상 코드 공백이 아니라 “어떤 공급자는 공개 자료만으로 붙일 수 있고, 어떤 공급자는 계약 포털 없이는 못 붙이는가”를 분명히 해야 닫히는 항목이었다. 이 근거가 문서에 없으면 `AUTH-305`에서 첫 adapter 선택이 또 상상 구현으로 흐르므로, 공개 증거가 있는 후보와 없는 후보를 먼저 나눠 고정해야 했다.

### Auth 잔여 P2 범위를 availability 구현과 external auth 후속 범위로 재정렬
- `api/v1/Auth/{Controller/AuthController.php,Service/AuthAvailabilityService.php,Service/AuthService.php,Repository/Auth{Repository,MemberRepository,MemberQueryRepository}.php}`, `api/v1/Integration/Contracts/AuthGateway.php`, `api/routes/v1/auth.php`, `api/docs/{openapi.yaml,openapi.contract-manifest.json}`, `tests/{Auth/AuthServiceTest.php,Support/BuildsDomainServices.php,contract/AuthContractTest.php}`, `docs/{API_SPEC,HISTORY,TODO}.md`, `docs/codex/auth-member/PROMPT.md`를 갱신해 회원가입 사전검사 경로(`/auth/availability/member-id|nick|email|phone|recommender`)를 추가하고, CAPTCHA/본인인증 기반 비밀번호 재설정/소셜 로그인은 external auth adapter 후속 범위로 문서 기준을 고정함
  - Why: `AUTH-303`이 오래 Next에 남아 있던 이유는 “남은 P2를 실제로 뭘 구현할지”가 문서마다 달랐기 때문이다. availability는 이미 내부 검증 primitive가 모두 있었고 외부 공급자도 필요 없으므로 바로 API로 승격하는 게 맞았고, 반대로 CAPTCHA·본인인증·소셜 로그인은 공급자/운영정책 없이는 상상 구현이 되므로 external auth foundation 후속 범위로 접어야 SSOT와 실제 코드가 다시 맞는다.

### 실서버 authenticated success path trace 검증과 staging smoke 계정 복구를 마감
- `docs/{TODO,HISTORY}.md`, `docs/testing/API_BLACKBOX_TESTING.md`를 갱신하고, 스테이징에 누락된 Schemathesis smoke 회원을 레거시/API 호환 해시(`create_hash`)로 복구한 뒤 `POST /api/v1/auth/login -> GET /api/v1/members/me` 성공 경로를 2026-03-10 실서버에서 다시 검증해 header/meta trace 일치와 인증 성공을 확인함
  - Why: `OBS-101`이 마지막까지 막힌 이유는 trace 로직이 아니라 `.tmp_schemathesis_auth.env`가 가리키는 회원이 스테이징 DB에 실제로 없었기 때문이다. 이 상태를 문서에 남기지 않으면 다음 작업자가 또 "비밀번호 해시 문제"로 오해하게 되므로, authenticated success path 완료와 smoke 계정 복구 사실을 SSOT에 같이 기록해야 했기 때문.

### live trace 응답 drift를 ResponseTraceMiddleware에서 고정
- `api/v1/Middlewares/ResponseTraceMiddleware.php`, `tests/{Support/ResponseTraceMiddlewareTest.php,Core/Middleware/ErrorMiddlewareTest.php,Security/RequestContextMiddlewareTest.php}`, `docs/{HISTORY,TODO}.md`를 갱신해 success/error 응답의 trace 주입이 request 객체를 다시 읽으며 새 ID를 생성하지 않도록 보정하고, response header에 이미 박힌 trace를 최우선으로 재사용하도록 정리함
  - Why: 2026-03-10 실서버 `curl`에서 `/api/v1/health`, `/api/v1/admin/members` 401, `/api/v1/auth/login` 실패 응답이 `X-Request-Id`와 본문 `request_id`, `meta.request_id`를 서로 다른 값으로 내려주고 있었고, 이 상태면 Rust 관리자와 운영 로그가 같은 장애를 서로 다른 식별자로 보게 되어 `OBS-101/102`의 목적 자체가 무너졌기 때문.

### 스테이징 비밀번호 해시 호환성 drift 재감사 결과를 정리
- `docs/{TODO,HISTORY}.md`를 갱신해 원격 `php scripts/check_password_hash_compat.php --json` 실측 결과를 반영하고, 스테이징이 `encrypt_func=create_hash`, `total=1`, `incompatible_count=0` 상태임을 기준으로 `AUTH-301`을 Done으로 이동
  - Why: 문서에는 여전히 `bcrypt 19건` 운영 blocker가 남아 있었지만, 실제 스테이징 원격 데이터는 이미 그 상태가 아니었다. 해결된 운영 이슈를 Next에 계속 남겨두면 다음 작업자가 잘못된 blocker를 기준으로 판단하게 되므로, 실측 결과로 SSOT를 바로잡아야 했기 때문.

### 배포 보안 프리플라이트와 외부 `.env` 경로 지원 고정
- `api/v1/Core/Config/EnvLoader.php`, `api/index.php`, `api/v1/Core/Database/PdoConnectionFactory.php`, `api/v1/Auth/External/Support/ExternalAuthConfig.php`, `api/docs/openapi.yaml`, `api/docs/openapi.contract-manifest.json`, `scripts/check_password_hash_compat.php`, `scripts/run_phpunit_coverage.sh`, `scripts/run_quality_gates.sh`, `scripts/deploy_staging.sh`, `.github/workflows/ci.yml`, `tests/Support/EnvLoaderTest.php`, `tests/Auth/ExternalAuthServiceTest.php`, `.agent/workflows/{audit,deploy-staging,field-parity-audit}.md`, `docs/{API_SPEC,DOCUMENT_REGISTRY,HISTORY,IMPLEMENTATION_ROADMAP,TODO}.md`를 갱신하고 `resources/deploy/{apache-webroot.htaccess.example,nginx-sensitive-files.conf.example}`를 추가해 `APP_ENV_FILE|API_ENV_FILE` 기반 외부 env 파일 경로를 지원하고, 품질 게이트에 `composer audit`를 포함했으며, 실제 배포 전에 원격 `.env` 존재·민감 파일 HTTP 차단·`/setup` 잠금·Apache 루트 `.htaccess`를 점검하도록 표준 절차를 고정함
  - Why: 웹루트 `.env`를 단순 관례로 두고 배포하면 서버 설정 하나만 어긋나도 비밀값이 그대로 노출될 수 있고, 기존 스크립트는 배포 성공만 확인할 뿐 공개면에서 `/.env`, `composer.json`, `/setup` 같은 민감 경로를 실제로 막고 있는지 검사하지 않았기 때문. 보안은 운영자 기억이 아니라 배포 하드 게이트와 서버별 예시 설정으로 강제해야 재발을 줄일 수 있기 때문.

### 관리자 필드 메타데이터 extractor를 manifest + stale check 구조로 재정리
- `api/v1/Admin/Schema/schema-domains.json`, `api/v1/Admin/Schema/README.md`, `scripts/extract_admin_schema.py`, `composer.json`, `scripts/run_quality_gates.sh`, `.github/workflows/ci.yml`, `.agent/workflows/field-parity-audit.md`를 갱신해 도메인 정의를 extractor 코드 밖 manifest로 분리하고, `schema:extract`/`schema:check` 명령과 CI 게이트를 추가함
  - Why: 레거시 `adm/*.php`가 바뀔 때마다 extractor 파이썬 코드 자체를 다시 뜯어고치면 재사용성이 떨어지고 누락이 생기기 쉬우므로, “manifest 수정 -> generated registry 재추출 -> stale check 실패 시 차단” 흐름으로 고정해야 새로운 도메인 추가와 레거시 업데이트 대응이 쉬워지기 때문.

### 관리자 필드 메타데이터 generated registry와 `/admin/schema` API 도입
- `scripts/extract_admin_schema.py`, `api/v1/Admin/Schema/*`, `api/routes/v1.php`, `api/routes/v1/admin.php`, `api/docs/openapi.yaml`, `tests/Admin/Schema/AdminSchemaServiceTest.php`, `tests/contract/AdminSchemaContractTest.php`를 추가·갱신해 레거시 `adm/board_form.php`, `adm/config_form.php`, `adm/member_form.php`의 라벨/타입/섹션 정보를 generated JSON registry로 고정하고, `/admin/schema`, `/admin/schema/{domain}`로 클라이언트에 제공하도록 구현함
  - Why: 헤드리스 클라이언트가 `bo_subject`, `cf_title`, `mb_hp` 같은 payload key만으로는 실제 화면 제목과 의미를 알 수 없고, Rust/Flutter가 레거시 SSR 코드를 매번 뒤져 라벨을 복제하는 구조는 재사용 구조가 아니기 때문. 레거시 폼은 bootstrap source로만 쓰고, 운영 시점에는 generated registry와 `/admin/schema`를 진실 원본으로 삼아 drift를 줄여야 했기 때문.

### REST API 블랙박스 감사 후 계약 드리프트와 방문통계 검증 보강
- `api/v1/Menu/Controller/MenuController.php`, `api/v1/Admin/Point/Repository/AdminPointRepository.php`, `api/v1/Admin/Visit/Service/AdminVisitService.php`, `api/docs/openapi.yaml`, `tests/Admin/AdminValidationServiceTest.php`, `tests/Menu/MenuControllerTest.php`, `tests/contract/*`를 갱신해 public `/menus` pagination 누락을 런타임에서 보정하고, admin point `po_datetime`를 RFC3339로 정규화했으며, admin visit 통계의 비현실적 날짜/역전 범위를 400으로 차단하고, `config/group/faq/member/menu` 스키마 드리프트와 `/admin/members/excel` 400 문서를 실제 런타임에 맞게 수정함
  - Why: 2026-03-08 실측 blackbox(Schemathesis/Hurl)에서 `/config`, `/menus`, `/admin/groups`, `/admin/faq-masters`, `/admin/members`, `/admin/points`, `/admin/visits/stats`가 문서와 실제 응답이 어긋나거나, 유효 형식처럼 보이는 극단 입력에 500을 내는 문제가 확인되었고, 이 상태를 그대로 두면 Rust/Flutter 클라이언트와 차기 자동 퍼징이 계속 거짓 양성/회귀를 만들기 때문.

### 관리자 OpenAPI 응답 스키마 구체화와 계약 테스트 강화
- `api/docs/openapi.yaml`, `tests/contract/ContractTestCase.php`, `tests/contract/Admin*ContractTest.php`를 갱신해 관리자 `board/member/menu/config/point/visit/content/faq/group/popup/poll/system-auth/sms-config` 응답을 `MessageResponse` 범용 스키마에서 도메인별 envelope 스키마로 분리하고, 방문 통계/검색 파라미터도 실제 서비스 구현(`date_from`, `date_to`, `type`, `limit`, `ip`, `referer`, `agent`) 기준으로 바로잡음
  - Why: 관리자 감사에서 이 구간은 실제 API가 이미 구체 응답을 내리는데도 OpenAPI가 `MessageResponse`로 뭉개져 있어 Rust/문서/테스트가 모두 “대충 맞는 것처럼” 통과하고 있었고, 특히 방문 도메인은 파라미터 문서까지 실제 서비스와 어긋나서 다음 구현이 다시 잘못된 계약을 따라갈 위험이 컸기 때문.

### 오픈소스 신뢰 인프라 기본 세트 도입
- `LICENSE`, `CHANGELOG.md`, `SECURITY.md`, `CONTRIBUTING.md`, `CLA.md`, `README.md`, `composer.json`, `tests/Contract/*`를 추가·갱신해 AGPL-3.0 기반 라이선스 표기, 보안 신고 정책, 기여 절차, CLA, OpenAPI 계약 테스트 골격을 프로젝트 루트에 고정
  - Why: 형님이 지정한 `rust/specs/codex/2026-03-08-TRUST_INFRA_CODEX_PROMPT.md` 요구를 실제 저장소 정책으로 적용하려면, 코드보다 먼저 라이선스/보안/기여/계약 테스트가 루트에서 바로 확인 가능한 상태여야 하고, `composer test -- --filter=Contract`로 문서 계약 회귀를 즉시 탐지할 수 있어야 했기 때문.

## 2026-03-07

### 외부 인증 foundation 경계와 dev fake provider 추가
- `api/v1/Auth/External/*`, `api/routes/v1.php`, `api/routes/v1/auth.php`, `api/container.php`, `api/docs/openapi.yaml`, `tests/Auth/ExternalAuthServiceTest.php`를 추가·갱신해 `/auth/external/providers`, `/auth/external/{provider}/start`, `/auth/external/{provider}/complete` 경계를 만들고, dev runtime에서만 동작하는 `fake provider`, signed `request_token`, replay 시나리오 기반 완료 검증 구조를 도입
  - Why: 본인인증/소셜로그인 같은 외부 연동은 vendor 문서가 확정되기 전에도 내부 앱/서버 개발이 계속되어야 하므로, 실제 공급자 미선정 상태에서도 `start -> complete -> normalized result`를 검증할 수 있는 공통 경계와 fake adapter가 먼저 필요했기 때문.

### 외부 인증 연결 저장소와 link_token 기반 계정 연결 관리 추가
- `api/v1/Auth/External/Repository/ExternalAuthLinkRepository.php`, `api/v1/Auth/External/Service/ExternalAuthLinkageService.php`, `api/v1/Auth/External/Service/ExternalAuthLinkManagementService.php`, `api/routes/v1/auth.php`, `api/docs/openapi.yaml`, `docs/ddls/api_tables.md`, `tests/Auth/ExternalAuthLinkManagementServiceTest.php`를 추가·갱신해 외부 인증 완료 결과에 `linkage`, `link_token`을 포함하고, `/auth/external/links`, `/auth/external/{provider}/links`, `/auth/external/{provider}/links/{provider_user_id}` 경계로 현재 회원의 외부 계정 연결 조회/등록/해제를 지원
  - Why: `complete` 응답만으로는 실제 회원 계정과 외부 계정을 안전하게 묶을 수 없고, 앱이 공급자 사용자 식별자를 임의로 전달하면 보안 경계가 약해지므로, 서버가 서명한 `link_token`과 내부 전용 링크 테이블을 통해 계정 연결을 서버 책임으로 고정해야 했기 때문.

### 외부 인증 완료 이후 전환 경계(session/claim/register) 추가
- `api/v1/Auth/External/Service/ExternalAuthTransitionService.php`, `api/v1/Auth/External/Controller/ExternalAuthController.php`, `api/routes/v1/auth.php`, `api/v1/Auth/Service/AuthSessionService.php`, `api/v1/Auth/Service/AuthRegistrationService.php`, `api/docs/openapi.yaml`, `tests/Auth/ExternalAuthTransitionServiceTest.php`, `tests/Auth/ExternalAuthServiceTest.php`를 갱신해 `/auth/external/{provider}/sessions`, `/auth/external/{provider}/claims`, `/auth/external/{provider}/registrations` 경계를 추가하고, `complete` 결과에 `available_actions`, `transition_token`(legacy alias `link_token`)을 포함하도록 정리
  - Why: foundation과 링크 테이블만으로는 실제 앱이 `완료 후 어디로 가야 하는지`를 안전하게 결정할 수 없으므로, `이미 연결됨 -> 세션 발급`, `기존 회원 확인 후 연결`, `신규 가입 후 연결`을 서버 책임 전환 경계로 명시하고, 클라이언트가 임의의 분기 로직이나 raw 공급자 식별자 없이 후속 단계를 진행할 수 있어야 했기 때문.
- `RegisterResponse`와 외부 인증 신규 가입 응답에 `expires_in`을 추가해 세션/가입 토큰 응답 구조를 정렬
  - Why: 비밀번호 로그인은 `expires_in`이 있는데 회원가입 응답은 빠져 있으면 클라이언트가 토큰 만료 처리를 경로별로 다르게 구현하게 되므로, 인증 성공 계열 응답의 기본 shape를 초기에 맞춰두는 편이 이후 앱 구현과 계약 유지에 유리하기 때문.

### 외부 공급자 테스트 전략 리뷰 문서 추가
- `docs/testing/EXTERNAL_PROVIDER_TESTING_REVIEW.md`, `docs/testing/API_BLACKBOX_TESTING.md`, `docs/README.md`, `docs/TODO.md`를 갱신해 본인인증·소셜로그인 같은 외부 서비스는 `php adapter + fake provider + callback replay + vendor sandbox` 순서로 테스트해야 한다는 기준과 공급자 문의 체크리스트를 남김
  - Why: 외부 서비스 연동은 결국 vendor 문서와 sandbox 정책을 확인해야 하지만, 내부 개발을 그 일정에 종속시키면 앱/서버 구현이 멈추므로, 나중에 출근 후 바로 실행할 수 있는 구조적 테스트 전략과 확인 항목을 문서로 고정해 둘 필요가 있었기 때문.

### PHP-Rust 교차 디버깅용 응답 추적/책임 귀속 구조 정비
- `api/v1/Support/Http/TraceContext.php`, `api/v1/Middlewares/ResponseTraceMiddleware.php`, `api/v1/Middlewares/RequestContextMiddleware.php`, `api/v1/Core/Middleware/ErrorMiddleware.php`, `api/v1/Core/Error/ProblemDetailsHelper.php`, `api/v1/Core/Middleware/RateLimitMiddleware.php`, `api/index.php`, `api/routes/v1/auth.php`, `api/docs/openapi.yaml`를 정비해 성공/실패 응답 모두에 `request_id`, `correlation_id`, `server_request_id`, `error_code`, `error_category`, `fault_domain`, `owner`, `retryable`, `user_actionable`를 일관되게 담도록 구조를 고정
  - Why: Rust/Tauri 관리자 클라이언트와 PHP API를 함께 개발하는 현재 구조에서는 장애가 났을 때 어느 계층 책임인지 응답과 로그만으로 즉시 판별되어야 하는데, 기존에는 에러 응답 중심 `request_id`만 남고 성공 경로 trace와 서버 책임 분류가 일관되지 않아 디버깅이 사람 추론에 의존하고 있었기 때문.
- `tests/Support/ResponseTraceMiddlewareTest.php`, `tests/Core/Error/ProblemDetailsHelperTest.php`, `tests/Core/Middleware/ErrorMiddlewareTest.php`, `tests/Security/RequestContextMiddlewareTest.php`를 보강하고 `composer run test`, `composer run analyse`를 다시 통과
  - Why: 추적 구조는 문서 선언만으로는 의미가 없고, 헤더/본문/meta/log가 같은 식별자를 유지한다는 보장이 자동화 테스트로 고정되어야 이후 계약 회귀를 초기에 잡을 수 있기 때문.

## 2026-03-06

### 관리자 전수 런타임 감사 보정
- `api/v1/Admin/System/Repository/AdminSystemConfigRepository.php`에서 `g5_config.cf_mobile_theme`가 없는 레거시 스키마를 fallback 처리하고, `api/v1/Admin/Sms/Repository/AdminSmsRepository.php`에서 `g5_sms5_*` 미설치 환경을 `503 Service Unavailable`로 명시 응답하도록 보강
  - Why: 스테이징 관리자 `GET /admin/**` 전수 감사에서 `system/themes`와 `sms/*`가 스키마 부재를 500으로 터뜨리고 있었기 때문에, 운영자가 `request_id`만 보고 로그를 뒤지는 상태를 줄이고 원인을 응답에서 바로 식별 가능하게 만들어야 했기 때문.
- `scripts/run_schemathesis.sh`에 `SCHEMATHESIS_INCLUDE_ADMIN=true` 플래그를 추가하고, 관리자 GET 전수 감사본 `docs/audits/ADMIN_ENDPOINT_EXHAUSTIVE_AUDIT_2026-03-06.md`를 작성
  - Why: 기존 전수 검사 루틴이 기본값으로 `/admin/` 전체를 제외하고 있어 관리자 도메인 장애가 감사 범위에서 빠졌으므로, 관리자 경로를 의도적으로 포함시킬 수 있는 재현 경로와 최신 근거 문서를 함께 남겨야 했기 때문.

### 관리자 회원 상세 `mb_zip` 컬럼 오조회 수정
- `api/v1/Admin/Member/Repository/AdminMemberRepository.php`에서 존재하지 않는 `mb_zip` 컬럼 직접 조회/수정을 제거하고 `mb_zip1`, `mb_zip2` 기반으로 상세 응답과 관리자 수정 payload를 정규화
  - Why: 스테이징 `GET /api/v1/admin/members/{mb_id}`가 실제 DDL에 없는 `mb_zip` 컬럼을 읽어 500이 발생했기 때문에, 조회와 수정 모두를 실컬럼 기준으로 바로잡아 같은 계열 장애가 재발하지 않게 해야 했기 때문.

### 500 에러 응답 운영 분류 보강
- `api/v1/Core/Error/ProblemDetailsHelper.php`, `api/v1/Core/Middleware/ErrorMiddleware.php`, `api/index.php`를 보강해 500/503 계열 예외에 `error_code`, `meta.error_category`, 분류형 `guide.reason`을 함께 내려주도록 정리
  - Why: 500을 단순 일반문구로만 내려주면 클라이언트와 운영이 장애 원인을 분류할 수 없으므로, 내부 구현 상세는 숨기면서도 DB/스토리지/네트워크/부트스트랩 같은 안전한 운영 원인은 응답 자체에 포함해야 장애 대응 속도가 올라가기 때문.

### Auth/Member 레거시 정합성 보수
- `api/v1/Auth/*`, `api/v1/Member/*`, `api/routes/v1/auth.php`를 보강해 공개 회원가입/수정에서 본인확인 필드 직접 입력을 차단하고, `mb_mailling`, `mb_sms`, `mb_addr3`, `mb_addr_jibeon`을 가입·수정·조회 계약에 복원
  - Why: 레거시 `register_form_update.php` 기준으로 본인확인 필드는 공개 입력이 아니라 검증 결과여야 하고, 수신동의/주소 필드를 빠뜨리면 기존 회원 데이터와 앱 입력값을 온전히 보존할 수 없기 때문.
- `MemberService::getPublicProfile()`에 `mb_open` 보호 규칙을 복원하고, 공개 프로필 응답을 실제 presenter 기준(`mb_open`, `mb_homepage`, `mb_profile`, `mb_datetime`)으로 재정렬
  - Why: 비공개 회원 프로필이 API에서 그대로 조회되면 레거시 `profile.php`의 공개정책을 깨게 되므로, 조회 허용 조건과 노출 필드를 함께 좁혀야 했기 때문.
- `POST /api/v1/auth/email-reverification-requests`와 관련 문서/OpenAPI/테스트를 추가해 미인증 회원의 공개 이메일 재발송/변경 플로우를 복원
  - Why: 이메일 미인증 상태에서는 로그인도 막히는데 JWT가 있어야만 재발송이 가능하면 사용자 복구 경로가 막히므로, 공개 재검증 경로를 별도로 열어야 레거시 `register_email.php` 계열 흐름을 실질적으로 대체할 수 있기 때문.

### 비밀번호 해시 호환성 감사 및 재발 방지
- `api/v1/Core/Security/PasswordHashAudit.php`, `scripts/check_password_hash_compat.php`, `tests/Security/PasswordHashAuditTest.php`를 추가하고 Composer 스크립트 `audit:password-hash-compat`를 도입
  - Why: `G5_ENCRYPT_FUNC=create_hash` 환경에서 실제 `g5_member.mb_password`에 어떤 형식의 해시가 들어있는지 정량적으로 확인할 수 있어야, 코드 수정 후에도 운영 데이터가 여전히 G5 웹 로그인과 호환되는지 반복 검증할 수 있기 때문.
- `EnvConfig`, 부트 검증, Setup 환경 점검, 활성 문서/프롬프트를 `create_hash|sql_password`만 허용하는 정책으로 고정
  - Why: `sha256` 같은 비호환 값을 정상 옵션처럼 남겨두면 동일한 데이터 드리프트가 다시 발생하므로, 환경 검증과 문서 안내를 동시에 조여야 재발을 실질적으로 막을 수 있기 때문.
- 스테이징 실측 결과 `g5_member` 20건 중 `create_hash` 1건, `bcrypt` 19건으로 확인되어 운영 후속 과제 `AUTH-301`을 추가
  - Why: 현재 코드는 고쳐졌더라도 이미 저장된 `bcrypt` 해시는 원본 G5 `check_password()`가 직접 검증하지 못하므로, 강제 비밀번호 재설정 또는 API 로그인 재해시 유도 같은 운영 조치가 별도로 필요하기 때문.

### 문서 관리 SSOT 도입
- `docs/IMPLEMENTATION_ROADMAP.md`, `docs/TODO.md`, `docs/DOCUMENT_REGISTRY.md`를 문서 SSOT 체계의 canonical 문서로 도입하고, `docs/README.md`, `.agent/sub-constitutions/document-governance.md`, `.agent/workflows/document-management.md`를 그 기준에 맞게 재정비
  - Why: 계획 문서, 감사 문서, 작업 메모가 제각각 기준처럼 해석되면 문서 정리와 실행 순서가 다시 분산되므로, 로드맵 1개와 작업 상태판 1개를 고정한 뒤 나머지 문서를 지원/기록 문서로 재분류해야 후속 문서 정합성 작업을 안정적으로 진행할 수 있기 때문.
- `scripts/doc-processor.py`, `scripts/doc-index.py`, `scripts/archive_old_audits.py`, `scripts/docs-check.sh`를 문서 거버넌스 자동화 축으로 도입
  - Why: 규약만 있고 자동 검증이 없으면 다시 드리프트가 누적되므로, 분류 레지스트리 생성, SQLite 검색 인덱스, 감사 보관 정책, 거버넌스 검사를 스크립트로 강제해야 문서 관리 체계가 유지되기 때문.

### 문서-계약 정합성 2차 정리
- `docs/API_SPEC.md`를 OpenAPI 보조 문서로 재정의하고, 실제 `docs/ddls/*.md` 전체 집합과 `/setup` 운영 예외 경로를 반영
  - Why: 사람용 문서가 더 이상 구현되지 않은 소스 주석 기반 생성 체계를 전제하거나 실제 DDL 집합을 누락하면, 이후 문서 감사와 운영 의사결정이 잘못된 기준 위에서 반복되기 때문.
- `api/docs/openapi.yaml`에 `admin/groups` 레거시 alias와 `admin/system/*` 공개 경로를 반영하고, `scripts/docs-check.sh`가 `/v1` 밖 문서화 예외를 허용하도록 보정
  - Why: 코드에는 있는데 계약서에 없는 경로와, 규약은 허용하지만 검사기가 거부하는 예외 규칙이 동시에 존재하면 문서 거버넌스가 스스로를 위반하게 되므로, 계약과 검사 로직을 같은 변경에서 수렴시켜야 하기 때문.
- 범위 감사 파일 2건을 규약형 이름으로 재명명하고 `AUDIT_LATEST.md`를 표준 감사본과 재동기화
  - Why: 날짜형 표준 감사본 뒤에 접미사가 붙는 파일명은 기준 보고서와 범위 보고서를 다시 혼동하게 만들므로, 규약형 이름으로 분리하고 최신본을 단일 표준 감사본에 맞춰야 문서 보관 정책이 안정적으로 작동하기 때문.
- `scripts/run_phpunit_coverage.sh`를 추가하고 coverage 관련 Composer 스크립트/워크플로 문서를 새 실행 경로로 통일
  - Why: CI는 `pcov`를 설치하지만 로컬 환경은 그렇지 않을 수 있으므로, 커버리지 드라이버 부재를 경고로 흘려보내지 말고 명확하게 실패시키는 표준 실행 경로가 있어야 품질 게이트 판정이 일관되기 때문.
- `scripts/run_quality_gates.sh`를 추가하고 배포/패키징/Composer 품질 게이트를 coverage 임계치 포함 단일 실행 경로로 통일
  - Why: 빌드 스크립트, 배포 스크립트, CI가 서로 다른 품질 검사를 돌리면 특정 환경에서만 커버리지나 문서 검사가 빠지는 구멍이 생기므로, 표준 게이트를 한 스크립트로 모아야 감사 결과와 실제 배포 경로가 일치하기 때문.
- `tests/{Auth,Member,Notification,Post,Qa}/*Test.php`에 저커버리지 서비스용 단위 테스트를 보강하고 Service 커버리지 하드 게이트를 60%, R4 종료 목표를 80%로 단계화
  - Why: Xdebug로 실측한 현재 기준선이 55.16%였기 때문에 곧바로 80%를 하드 실패로 두면 게이트가 영구 적색 상태가 되고, 그렇다고 측정을 빼버리면 다시 거짓 안정성이 생기므로, 실제 통과 가능한 최소 게이트는 복구하되 종료 목표 80%는 문서/백로그로 계속 추적해야 하기 때문.
- `tests/{Auth,File,Member,Qa}/*Test.php`에 `AuthSessionService`, `FileOperationSupport`, `MemberMediaService`, `Qa*Service` 보강 테스트를 추가하고 Service 커버리지를 `62.13% -> 80.77%`로 끌어올린 뒤 CI/로컬 하드 게이트를 다시 `80%`로 상향
  - Why: 임시 하드 게이트 60%는 품질 회복 과정에서만 유효했고, 실제 수치가 종료선 80%를 넘은 뒤에도 낮은 기준을 유지하면 회귀를 조기에 차단하지 못하므로, 테스트 확장과 게이트 상향을 같은 변경에서 묶어야 기준이 다시 느슨해지지 않기 때문.

### 관리자 menu100 1차 이행
- `api/v1/Admin/System/*`, `api/routes/v1/admin.php`, `api/docs/openapi.yaml`에 `admin.menu100.php` 기반 운영 기능을 1차 반영
  - Why: 레거시 `adm/admin.menu100.php`의 메뉴가 문서상으로만 “부분 구현” 상태로 남아 있으면 운영자 기능 이관 진행률을 정확히 평가할 수 없으므로, 근거가 명확한 항목부터 `Admin/System` 계약으로 실제 이식해야 하기 때문.
- 추가 범위: 테마 목록/상세, `phpinfo`, 세션/캐시/캡챠/썸네일/회원관리파일 일괄삭제, Browscap 상태/업데이트/접속로그 변환
  - Why: 이 항목들은 레거시 스크립트 동작이 명확하고 쇼핑몰 의존성이 낮아 `menu100` 중 가장 먼저 API화할 수 있는 축이기 때문.
- `tests/Admin/System/*Test.php`를 추가해 새 `Admin/System` 메뉴100 서비스의 파일 정리/테마 메타데이터/Browscap 상태 경로를 고정
  - Why: 운영성 엔드포인트는 실수 시 파괴 범위가 크므로, 최소한의 단위 테스트 없이 올리면 다음 리팩터링에서 조용히 깨질 가능성이 높기 때문.

### 관리자 menu200 메일 정합화
- `api/v1/Admin/Mail/*`, `api/routes/v1/admin.php`, `api/docs/openapi.yaml`에 레거시 `mail_form.php`, `mail_preview.php`, `mail_select_form.php` 흐름을 반영해 템플릿 생성/수정과 `ma_id` 기반 발송 옵션 저장을 보강
  - Why: `menu200`의 회원메일발송은 단순 발송 엔드포인트가 아니라 템플릿 관리와 마지막 발송 옵션 기억이 핵심인데, 이 축이 빠지면 레거시 관리자와 실제 운영 절차가 계속 어긋나기 때문.
- 메일 템플릿 상세 응답에 `preview_html`과 파싱된 `last_option`을 포함해 레거시 미리보기/대상선택 폼 선행 데이터를 직접 대체
  - Why: API 클라이언트가 레거시 전용 문자열 포맷을 다시 파싱하지 않고도 마지막 발송 조건과 미리보기 본문을 그대로 재사용할 수 있어야 `menu200` 도메인이 UI 교체 대상이 되기 때문.
- `service.php`는 광고성 외부 링크 모음이라 API 이관 대상에서 제외하고 관련 계약을 제거
  - Why: 제품 기능이 아닌 외부 홍보 링크를 REST 계약으로 유지하면 관리자 API 범위가 불필요하게 오염되고, 하드코딩 정책에도 맞지 않기 때문.
- `theme_preview.php`는 웹 렌더링 전용, `dbupgrade.php`는 내부 실행기 성격이 강해 API 이관 대상에서 제외
  - Why: 화면 렌더링 결과 확인과 다단계 스키마 업그레이드는 공개 REST 계약보다 웹/CLI 운영 흐름이 더 적합하므로, 억지로 API화하면 오히려 운영 리스크만 커지기 때문.

### 관리자 menu300 FAQ 마스터 이행
- `api/v1/Admin/Faq/*`, `api/routes/v1/admin.php`, `api/docs/openapi.yaml`에 레거시 `faqmasterlist.php`, `faqmasterform.php`, `faqmasterformupdate.php` 흐름을 반영해 FAQ 마스터 CRUD와 상단/하단 이미지 업로드·삭제를 추가
  - Why: `menu300`의 FAQ 관리는 FAQ 항목 CRUD만으로는 닫히지 않고, 분류 단위의 제목/정렬/상하단 HTML과 이미지 관리가 있어야 레거시 관리자 운영 절차를 대체할 수 있기 때문.
- FAQ 계약 문서와 DDL 문서를 `faq_master` 실제 필드와 이미지 파일 저장 규칙에 맞게 갱신
  - Why: 기존 문서는 `g5_faq_master`를 제목만 가진 단순 테이블처럼 설명하고 있어, 코드가 확장되면 곧바로 문서-구현 불일치가 다시 발생하기 때문.

### 관리자 menu900 SMS 관리자 이행
- `api/v1/Admin/Sms/*`, `api/routes/v1{,/admin}.php`, `api/docs/openapi.yaml`에 레거시 `adm/sms_admin/{config,member_update,sms_write,history_list,history_num,form_group,form_list,num_group,num_book,num_book_file}.php` 흐름을 반영해 SMS 설정, 회원 동기화, 템플릿 그룹/템플릿, 연락처 그룹/연락처, 발송/이력/재전송 API를 추가
  - Why: `menu900`은 별도 관리자 서브시스템에 가까운 규모라서 한 번 범위에 포함하기로 했으면 설정부터 주소록, 템플릿, 발송 이력까지 닫아야 레거시 관리자 메뉴가 실제로 대체되기 때문.
- `docs/ddls/sms.md`, `docs/API_SPEC.md`, `docs/audits/ADMIN_DOMAIN_PROGRESS_AUDIT_2026-03-06.md`를 SMS 스키마와 계약, 진행도에 맞게 갱신
  - Why: SMS 도메인은 `g5_sms5_*` 전용 테이블과 레거시 icode 전송 제약을 함께 이해해야 하므로, 코드만 올리고 문서가 비어 있으면 다음 이행 라운드에서 다시 범위 해석이 갈라지기 때문.

### 통합 감사 2026-03-06 후속 시정
- `composer.json`, `composer.lock`에서 `firebase/php-jwt`를 `^7.0`으로 올리고, `JwtService`에 `JWT_SECRET` 최소 32자 강제를 추가했으며 관련 테스트 픽스처를 모두 장문 시크릿으로 교체
  - Why: 감사에서 확인된 `CVE-2025-45769`를 닫으려면 7.x 업그레이드가 필수였고, 업그레이드 후 새 라이브러리 제약(짧은 HMAC 키 금지)을 코드와 테스트에 같이 반영해야 실제 보안 게이트가 성립하기 때문.
- `scripts/check_service_coverage.php`와 CI `pcov` 설정을 추가하고 `Quality Gates` 워크플로우에서 서비스 계층 커버리지 80% 검사를 수행하도록 변경
  - Why: 커버리지 드라이버 부재 때문에 헌법상 커버리지 기준을 검증할 수 없던 상태를 끝내고, CI에서 수치 측정과 임계치 검사를 동시에 자동화해야 감사 지적을 닫을 수 있기 때문.
- `composer.json`의 사용자 정의 `"audit"` 스크립트를 `"quality-gate"`로 변경하고 관련 문서 예시를 갱신
  - Why: Composer 내장 `composer audit` 명령과 스크립트 이름이 충돌하면 취약점 검사 로그가 매번 경고를 섞어 출력하므로, 표준 명령과 내부 품질 게이트를 분리해 혼선을 제거해야 하기 때문.
- `MySqlNamedLock` 기반 논리 잠금을 `PointMutationRepository`, `CommentPointRepository`, `FileRepository`, `PostScrapRepository`, `PostReactionRepository`, `LikeRepository`에 도입
  - Why: 포인트 적립/차감, 다운로드 포인트, 스크랩, 추천은 동시 요청 시 중복 처리와 잔액 경합이 발생할 수 있으므로, MyISAM 호환성까지 고려한 세션 단위 named lock으로 핵심 경합 구간을 먼저 직렬화해야 하기 때문.
- `docs/audits/COVERAGE_AND_STATUS_AUDIT_2026-03-06.md`의 절대경로를 상대 참조로 수정
  - Why: 감사 문서의 로컬 절대경로는 환경 종속성을 키워 재현성을 해치므로, 문서 자체도 저장소 상대경로 기준으로 유지해야 하기 때문.
- `FileRepository`, `PostWriteRepository`, `PostScrapRepository`, `PostPermissionService`를 facade 유지 + 내부 세부 컴포넌트 분리 방식으로 재구성
  - Why: 공개 계약을 깨지 않으면서 God Class를 줄이려면, 상위 facade는 유지하고 record/query/mutation/policy 역할을 내부 클래스로 분리하는 것이 가장 안전한 구조 개선 경로이기 때문.
- `PostQueryRepository`, `PostNewPostRepository`, `AdminVisitRepository`도 동일한 facade + 세부 저장소 구조로 추가 분해
  - Why: 남은 대형 저장소 역시 하나의 파일에 목록/상세/통계/삭제 책임이 섞여 있어 변경 범위가 과도했으므로, 역할별 저장소로 분리해 회귀 범위와 읽기 부담을 함께 줄여야 했기 때문.

### 엔드포인트 표준 감사 후속 조치
- `api/routes/v1/{auth,admin}.php`와 샘플 플러그인 라우트에 표준 경로 alias를 추가하고, 기존 동사형 경로는 레거시 호환용으로 유지
  - Why: 이미 배포된 클라이언트를 깨지 않으면서도 새 소비자에게는 리소스 중심 경로를 제공해야 표준 준수와 하위 호환을 동시에 만족할 수 있기 때문.
- `api/docs/openapi.yaml`에서 공개 Poll/Popup, Memo, Member Scrap 태그를 재분류하고 관리자 하위 도메인을 세분화된 태그로 분리
  - Why: 단일 `Admin` 태그에 모든 운영자 엔드포인트가 뭉치면 Swagger 탐색성과 감사 추적성이 떨어지므로, 도메인 단위로 태그를 쪼개야 실제 운영자가 필요한 계약을 바로 찾을 수 있기 때문.
- `api/docs/openapi.yaml`에 누락되어 있던 관리자 도메인(`boards`, `members`, `config`, `contents`, `faqs`, `menus`, `popular`, `visits`, `write-count`) 계약을 추가
  - Why: 구현은 있는데 Swagger에 빠져 있으면 블랙박스 테스트와 외부 통합이 모두 불완전해지므로, 실제 라우트 기준으로 계약서를 전수 보강해야 했기 때문.
- `docs/API_SPEC.md`를 canonical 경로 기준으로 갱신하고, 구경로는 "레거시 호환 경로"로 명시
  - Why: 사람용 문서와 OpenAPI 계약서가 서로 다른 기준을 가리키면 이후 개발자가 다시 구경로를 신규 표준으로 오해하게 되기 때문.

### 구조개선 2차 반영: DI 강제, 커서 페이징, God Class 분리
- `api/v1/{Auth,Member,Qa,Post}/Service/*`의 상위 조립 서비스에서 내부 `?? new` 생성을 제거하고, `CommentService`, `AdminPollService`, `AdminSystemService`, `MemberProfileUpdateService`까지 생성자 필수 주입으로 통일
  - Why: 서비스 내부 조립이 남아 있으면 테스트/런타임 조립 경로가 갈라지고 도메인 경계가 흐려지므로, 서비스 계층만큼은 컨테이너 기반 조립으로 고정해야 리팩터링과 장애 추적이 쉬워지기 때문.
- 사용자향 목록 6개 경로에 커서 페이징 지원을 추가하고 관련 DTO(`CursorPaginationDTO`, `CursorPaginatedResult`, `NotificationLogDTO`, `BlockEntryDTO`, `MemoItemDTO`, `PostScrapDTO`, `NewPostDTO`)를 확장
  - Why: 감사에서 지적된 OFFSET 편중 구조를 바로 줄이기 위해 트래픽이 먼저 몰리는 `new-posts`, `scraps`, `points`, `notifications`, `blocks`, `memos`부터 커서 모드로 전환해야 했기 때문.
- `api/docs/openapi.yaml`, `docs/API_SPEC.md`에 `cursor`, `next_cursor`, `mode=cursor` 계약을 반영
  - Why: 구현만 커서 모드로 열고 문서를 그대로 두면 블랙박스 감사와 외부 클라이언트가 모두 잘못된 페이지네이션 계약을 따르게 되므로, 스펙을 동시에 고정해야 했기 때문.
- `api/v1/Admin/Member/Service/AdminMemberService.php`를 `AdminMemberQueryService`, `AdminMemberMutationService`, `AdminMemberImageService`로 분리
  - Why: 관리자 회원 도메인은 조회/변경/이미지 업로드 책임이 한 파일에 뭉쳐 있어 변경 영향 범위가 과도했으므로, 감사 권고대로 query/mutation 경계를 실제 코드로 분리해야 했기 때문.
- `api/v1/Core/Plugin/PluginLoader.php`에서 플러그인 디스커버리/매니페스트 해석을 `PluginDiscoveryService`로 추출
  - Why: 플러그인 부팅 장애와 매니페스트 파싱 장애는 성격이 다른데 하나의 클래스에 섞여 있으면 테스트와 장애 추적 범위가 커지므로, 디스커버리 책임을 별도 서비스로 분리해야 했기 때문.
- `tests/Support/BuildsDomainServices.php`와 관련 도메인 테스트를 새 조립 계약에 맞게 보정하고, 블록 커서 테스트는 실제 인코딩된 커서 토큰을 사용하도록 수정
  - Why: 서비스 생성자 구조를 바꾼 뒤 테스트 헬퍼가 예전 시그니처에 머물면 회귀 검증이 가짜 안정성만 제공하므로, 테스트 조립 경로도 실제 런타임 구조와 일치시켜야 했기 때문.

### 구조개선 3차 반영: 남은 큰 서비스 분리
- `api/v1/Post/Service/PostMutationService.php`에서 삭제 흐름을 `PostDeleteService`로 추출하고 `PostService`를 `read/mutation/delete/scrap` 조합형으로 재정리
  - Why: 게시글 생성/수정과 삭제/새글정리 로직은 실패 양상과 권한 규칙이 달라 하나의 서비스에 두면 회귀 범위가 커지므로, 삭제 축을 별도 서비스로 분리해야 변경 위험을 줄일 수 있기 때문.
- `api/v1/Admin/Mail/Service/AdminMailService.php`를 `AdminMailQueryService`, `AdminMailDispatchService`로 분리
  - Why: 메일 이력 조회와 실제 발송은 외부 I/O 의존성과 실패 처리 방식이 달라 하나의 파일에 있으면 테스트/장애 분석 범위가 불필요하게 커지므로, 조회와 발송을 나눠야 했기 때문.
- `api/v1/File/Service/FileService.php`를 `FileUploadService`, `FileReadService`, `FileDeleteService` + `FileOperationSupport`로 분리
  - Why: 파일 업로드/다운로드/삭제는 권한, 파일시스템, 포인트 차감 정책이 서로 다른 축이라 한 파일에 몰아두면 작은 수정도 전체 파일 도메인 회귀로 번지므로, 공통 helper는 trait로 모으고 작업별 서비스로 분리해야 했기 때문.

### 감사 권고 후속 조치 1차 반영
- `api/v1/Post/Repository/PostScrapRepository.php`의 스크랩 목록 조회를 게시판별 배치 쿼리로 전환하고 `tests/Post/PostScrapRepositoryTest.php`를 추가
  - Why: 페이지 내 스크랩 수만큼 write table을 개별 조회하던 N+1 구조는 게시판 수가 적어도 응답시간이 불필요하게 증가하므로, board별 `wr_id` 묶음 조회로 쿼리 수를 줄여야 했기 때문.
- `api/v1/Security/JwtService.php`에 기본 `JWT leeway` 30초를 도입하고 `.env.example`/`api/container.php`로 설정값(`JWT_LEEWAY_SECONDS`)을 노출, `tests/Security/JwtServiceTest.php` 추가
  - Why: 서버 간 시계 오차 몇 초 때문에 정상 토큰이 간헐적으로 거부되면 로그인/리프레시 장애로 이어질 수 있으므로, 허용 오차를 명시적으로 고정해야 했기 때문.
- 샘플 플러그인 3종의 `error_log()`를 Monolog `LoggerInterface` 기반으로 교체하고 `PluginLoader`가 플러그인 컨테이너에 로거를 주입하도록 조정
  - Why: 헌법상 구조화 로깅 원칙을 샘플 코드가 위반하면 서드파티 플러그인 개발자도 그대로 따라가게 되므로, 기준 구현부터 Monolog를 사용해야 했기 때문.
- `ValidationPatterns` 공통 정규식 상수를 추가하고 `mb_id`, `gr_id`, `Bearer` 토큰 검증 중복을 주요 서비스/미들웨어에서 제거
  - Why: 같은 필드가 파일마다 다른 정규식으로 검증되면 문서-런타임-테스트가 다시 갈라지므로, 핵심 패턴을 단일 상수로 묶어야 했기 때문.
- `.github/workflows/ci.yml` 신규 추가
  - Why: 로컬 수동 실행에만 의존하면 품질 게이트가 누락되기 쉬우므로, `Runtime Compat(PHP 8.1)`와 `Quality Gates(PHP 8.4)`를 push/PR 단계에서 자동 실행해야 했기 때문.
- `.github/workflows/deploy-staging.yml` 신규 추가
  - Why: 스테이징 배포를 개인 로컬 셸 습관에만 의존하면 재현성과 감사 가능성이 떨어지므로, 저장소 시크릿 기반으로 같은 `deploy_staging.sh` 절차를 GitHub Actions에서도 반복 가능하게 만들어야 했기 때문.
- `tests/{Board,Device,Layout,Block,Report}/*Test.php` 신규 추가 및 `api/v1/Board/Service/BoardService.php`의 `group_id` 검증을 `ValidationPatterns::GROUP_ID`로 통일
  - Why: 문서 감사에서 남아 있던 테스트 공백 5개 도메인을 실제 서비스 규칙 단위로 고정하지 않으면 이후 리팩터링 때 무인증/권한/중복신고/레이아웃 fallback 같은 핵심 규칙이 조용히 깨질 수 있기 때문.
- `tests/Admin/Group/AdminGroupServiceTest.php`, `tests/Admin/Member/AdminMemberServiceTest.php` 신규 추가
  - Why: Admin 계층은 엔드포인트 수가 많은 반면 테스트가 상대적으로 빈약했으므로, 그룹 회원 관리와 회원 권한 수정/삭제 제약처럼 장애 영향이 큰 규칙부터 자동 검증으로 고정해야 했기 때문.
- `tests/Admin/AdminValidationServiceTest.php` 확장으로 `Config`, `Content`, `Faq`, `Menu`, `Visit`, `Push`, `Report`, `Layout`, `WriteCount`의 선행 입력 검증 경로를 추가 고정
  - Why: 남은 Admin 도메인도 저장소 호출 전 단계에서 잘려야 하는 입력 규칙이 많으므로, 이 구간을 자동화해 잘못된 요청이 DB/레거시 계층으로 전파되는 것을 선제 차단해야 했기 때문.

### Schemathesis 자동 픽스처 확장 및 관리자 감사 노이즈 축소
- `scripts/run_schemathesis.sh`에 관리자/회원 상세 경로용 자동 픽스처 수집을 추가(`gr_id`, `ma_id`, `me_id`, `po_id`, `qa_id`, `report_id`)하고 파일/링크/문의첨부 다운로드 경로는 별도 fixture(`file_*`, `link_*`, `qa_file_*`)로 분리
  - Why: 하나의 `wr_id`나 `qa_id`를 모든 상세 경로에 공용 주입하면 실제 첨부파일/링크가 없는 리소스에 걸려 404 warning이 반복되므로, 엔드포인트 성격별 샘플 데이터를 분리해 감사 신호를 더 정확하게 만들기 위해.
- `schemathesis_hooks.py`에 path별 fixture 매핑(`files`, `link`, `qa file download`)과 추가 path 파라미터 치환(`gr_id`, `ma_id`, `me_id`, `po_id`, `qa_id`)을 반영
  - Why: 쉘 스크립트에서 fixture를 수집하더라도 훅이 path 단위로 올바르게 주입하지 않으면 Schemathesis가 여전히 랜덤 값을 섞어 계약 검증 품질이 흔들리기 때문.
- `api/docs/openapi.yaml`의 `/admin/board-groups/{gr_id}` 계열 path 파라미터를 공용 `grId` 컴포넌트로 승격하고 정규식 `^[A-Za-z0-9_]{1,10}$`를 명시
  - Why: 런타임은 엄격히 `gr_id` 형식을 검증하는데 문서가 느슨하면 Schemathesis와 사람용 계약서가 동시에 잘못된 요청을 정상으로 오해하게 되기 때문.
- `.env.example`, `docs/testing/API_BLACKBOX_TESTING.md`를 확장 fixture와 경로별 주입 규칙에 맞게 업데이트
  - Why: 감사 워크플로우와 환경변수 목록이 코드와 어긋나면 다음 실행자가 동일한 재현 경로를 밟지 못하기 때문.

### 플러그인 계약 문서화 및 구현 규약서 고정
- `api/docs/openapi.yaml`에 플러그인 샘플 엔드포인트(`hello`, `premium-push`, `board-reward`)와 관련 스키마/라이선스 응답을 추가
  - Why: Swagger UI와 배포 계약서가 실제 샘플 플러그인 런타임을 반영하지 않으면, 플러그인 소비자와 개발자가 서로 다른 계약을 보게 되기 때문.
- `docs/API_SPEC.md`에 플러그인 샘플 도메인 섹션과 플러그인 규약 문서 참조를 추가
  - Why: OpenAPI만으로는 아키텍처 제약과 개발 원칙이 전달되지 않으므로, 사람용 명세서에도 동일한 기준을 고정해야 하기 때문.
- `docs/architecture/PLUGIN_IMPLEMENTATION_STANDARD.md` 신규 추가
  - Why: "이 스펙대로 개발하라"는 강제 문서는 권고형 가이드와 분리해야 구현 검토/감사/리뷰에서 준수 여부를 명확히 판정할 수 있기 때문.
- `docs/architecture/PLUGIN_DEVELOPER_GUIDE.md`를 규약서 보조 문서로 위치 재정의
  - Why: 기존 가이드는 실무 예시 문서인데, 강제 규약처럼 오해될 수 있어 문서 역할을 명확히 분리할 필요가 있었기 때문.
- `docs/README.md`와 `scripts/check_plugin_isolation.sh`를 플러그인 문서/감사 기준에 맞게 보강
  - Why: 문서 인덱스와 자동 검사 기준이 실제 플러그인 정책을 따라가지 못하면 저장소 운영 기준이 다시 흐트러지기 때문.

## 2026-03-05

### 타입 안전성 1차 이행 + Rate Limit 런타임 적용
- `api/v1/Core/DTO/*` 신규 추가(`MemberDTO`, `BoardDTO`, `PostDTO`, `CommentDTO`, `PointDTO`, `PaginationDTO`, `PaginatedResult`, `MenuDTO`)
  - Why: Service/Gateway 간 구조화된 데이터를 `array`가 아닌 불변 DTO로 전달해 타입 추적성과 유지보수성을 높이기 위해.
- `api/v1/Core/Enum/*` 신규 추가(`MemberLevel`, `VoteType`, `SearchField`, `TokenType`, `ApiErrorType`, `ReportTargetType`, `ReportStatus`, `DevicePlatform`)
  - Why: `>= 10`, `'good'/'nogood'`, 에러 타입 문자열 같은 매직넘버/리터럴 분산을 제거하고 도메인 의미를 코드 타입으로 고정하기 위해.
- `Like/Menu/Point` Gateway·Repository·Service에 DTO/Enum 기반 시그니처 전환 반영
  - Why: 전면 전환 전 저위험 도메인부터 타입 전환 패턴을 안정화해 후속 도메인 확장 시 회귀를 줄이기 위해.
- `ApiException`(Core/Support)의 RFC7807 `type`을 `ApiErrorType` Enum으로 통합하고 `ErrorMiddleware`/`ApiResponse` 직렬화 경로 동기화
  - Why: 에러 타입 문자열 오타/불일치를 방지하고 예외 응답 포맷의 단일 진실 공급원(single source of truth)을 확보하기 위해.
- `api/v1/Core/Middleware/RateLimitMiddleware.php` 추가 및 `api/index.php` 전역 등록
  - Why: 헌법 §5.8의 분당 제한 정책(기본 60/120, 로그인 강화 제한)을 런타임에서 강제해 무차별 호출/로그인 시도 리스크를 즉시 낮추기 위해.
- `phpunit.xml` coverage source 설정, `composer.json`에 `test:coverage` 스크립트 추가
  - Why: 커버리지 측정이 불가능하던 상태를 해소해 품질 목표를 수치로 관리 가능한 상태로 만들기 위해.
- 테스트 보강: `tests/Core/DTO/*`, `tests/Core/Enum/*`, `tests/Core/Middleware/RateLimitMiddlewareTest.php` 및 기존 테스트 타입 전환 반영
  - Why: DTO/Enum/RateLimit 신규 코드가 회귀 없이 동작함을 자동 검증 게이트에 포함시키기 위해.

### Schemathesis 자동 인증/픽스처 주입 및 계약 안정화
- `scripts/run_schemathesis.sh`에 자동 로그인(`SCHEMATHESIS_AUTH_MB_ID/SCHEMATHESIS_AUTH_MB_PASSWORD`), 자동 픽스처 수집(`bo_table`, `wr_id`, `mb_id`, `page_id`, `widget_id`, `bf_no`), 누락 픽스처 경로 자동 제외 로직 추가
  - Why: 수동 토큰 입력과 랜덤 path 파라미터로 인해 발생하던 인증 경고/404 노이즈를 줄이고 야간 무인 감사 실행의 재현성을 높이기 위해.
- `schemathesis_hooks.py` 추가 (`map_query`, `map_path_parameters`)
  - Why: `page/per_page` 경계값을 안정화하고 환경변수 기반 픽스처를 각 요청에 강제 주입해 스펙 퍼징의 실효성을 높이기 위해.
- OpenAPI 파라미터 제약 보강(`page` 상한, `page_id`/`widget_id` 패턴 정정)
  - Why: 스키마가 백엔드 검증보다 느슨해 생기던 계약 불일치 경고를 줄이고 문서-런타임 정합성을 맞추기 위해.
- 문서/워크플로우 업데이트(`docs/testing/API_BLACKBOX_TESTING.md`, `.agent/workflows/*.md`, `.env.example`)
  - Why: 팀이 동일 명령으로 자동 인증/픽스처 경로를 즉시 재사용할 수 있도록 운영 절차를 코드와 동기화하기 위해.
- `PostService::listPosts`의 `category/search`를 legacy utf8mb3 호환 문자열로 정규화하고 단위 테스트(`tests/Post/PostServiceTest.php`) 추가
  - Why: 퍼징 입력(4바이트 유니코드)에서 발생한 DB 콜레이션 충돌(500)을 서비스 레이어에서 선제 차단해 장애 전파를 막기 위해.
- `schemathesis_hooks.py`에 헤더/쿼리 문자열 정규화 및 Authorization 자동 정리 로직 추가, `run_schemathesis.sh`에 `generation-with-security-parameters=false`, `generation-allow-x00=false` 기본값 반영
  - Why: 웹서버 선단(Apache)에서 발생하던 HTML 400 노이즈를 줄여 계약 검증 경고를 API 자체 이슈 중심으로 수렴시키기 위해.
- `text/html` 응답 deserializer 등록 및 토큰 부재 시 인증 필수 경로 자동 제외 옵션(`SCHEMATHESIS_AUTO_EXCLUDE_AUTH_REQUIRED_WHEN_NO_TOKEN`) 추가
  - Why: 인증 정보가 없는 기본 실행에서도 불필요 경고를 줄여 CI 리포트를 실제 실패 신호 중심으로 유지하기 위해.

## 2026-03-04

### 비즈니스 로직 갭 일괄 해소 (Auth/Member/Post/File/Admin)
- `Auth` 도메인에 로그아웃(토큰 폐기), 로그인 실패 횟수 제한(기본 5회/5분), `mb_today_login` 갱신, 비밀번호 재설정 요청/확정, 이메일 인증 요청/확정 추가
  - Why: 사용자 라이프사이클(로그인/탈퇴/재설정/인증)에서 운영 장애와 보안 구멍이 되던 누락 기능을 API 단에서 닫기 위해.
- `Member` 도메인에 회원 탈퇴 API와 닉네임 변경 쿨다운(`cf_nick_modify` 또는 ENV override) 강제 로직 추가
  - Why: 레거시 정책과 동일한 회원 관리 규칙을 REST API로 강제해 웹/앱 간 정책 불일치를 제거하기 위해.
- `Post` 도메인에 `wr_num` 자동 채번, `wr_parent=self`, 공지글 상단 정렬/동기화, 비밀글 접근 제어, 글쓰기/삭제 포인트 적립·회수 반영
  - Why: 그누보드 핵심 게시글 규칙(스레딩/공지/비밀글/포인트)을 맞추지 못하면 데이터 무결성과 권한 모델이 붕괴되기 때문.
- `File` 도메인에 다운로드 포인트 차감(중복 차감 방지) 추가
  - Why: 게시판 다운로드 정책(`bo_download_point`)이 API 경로에서도 동일하게 적용되어야 과금/포인트 일관성이 유지되기 때문.
- `Admin` 도메인 확장: `board_copy`, 그룹회원 관리, 방문자 검색/삭제, 인기검색어 랭크, 글/댓글 집계, 회원 Excel 데이터, 그리고 신규 `Admin/System`(권한/auth, 팝업/new_win, 투표/poll, QA 설정, 테마, 메일 테스트/수신자)
  - Why: 감사 문서에서 누락으로 지적된 운영 기능을 API 엔드포인트로 이관해 관리자 기능 커버리지를 실사용 수준으로 끌어올리기 위해.
- `.agent/workflows/commit-push.md`, `.agent/workflows/deploy-staging.md`에 `hurl/schemathesis/blackbox` 명령 반영
  - Why: 명령 누락으로 테스트 게이트가 사람 습관에 의존하던 상태를 워크플로우 표준으로 고정하기 위해.

### API 블랙박스 게이트 도입 (Schemathesis + Hurl)
- `scripts/setup_api_test_tools.sh` 추가 (hurl + schemathesis 설치 자동화)
  - Why: 신규 머신/세션에서도 동일한 테스트 도구를 반복 가능하게 맞추기 위해.
- `scripts/run_hurl_suite.sh`, `scripts/run_schemathesis.sh`, `scripts/run_api_contract_bombing.sh` 추가
  - Why: 스펙 기반 자동 폭격과 고정 회귀를 분리/조합 실행 가능한 표준 게이트로 고정하기 위해.
- `tests/hurl/*.hurl` 회귀 시나리오(health/docs/openapi/auth-required) 추가
  - Why: 빠른 실패 감지 지점을 별도 유지해 스테이징 품질 확인 시간을 단축하기 위해.
- `tools/requirements-api-tests.txt`, `docs/testing/API_BLACKBOX_TESTING.md`, `composer.json` API 테스트 스크립트 추가
  - Why: 도구 설치/실행/리포트 경로를 코드와 문서 모두에서 동일하게 유지하기 위해.

### Push/SDUI/UGC 도메인(1차) 구현 및 문서 동기화
- `api/v1`에 신규 도메인 추가: `Device`, `Notification`, `Layout`, `Report`, `Block`, `Admin/Push`, `Admin/Layout`, `Admin/Report`
  - Why: 리뷰 문서(`01_PUSH_NOTIFICATION`, `02_SDUI_DYNAMIC_LAYOUT`, `03_APPSTORE_UGC_COMPLIANCE`)에 명시된 미구현 엔드포인트를 코드로 반영해 문서-구현 괴리를 줄이기 위해.
- `api/routes.php`에 사용자/관리자 신규 라우트 등록
  - Why: 도메인 코드 추가만으로는 API 계약이 유효하지 않으므로 실제 엔드포인트를 런타임에 노출하기 위해.
- `api/v1/Core/Database/TableRegistry.php`에 신규 테이블 맵(`push_*`, `sdui_*`, `report`, `user_block`) 반영
  - Why: 동적 문자열 테이블명 사용을 금지하고 화이트리스트 기반 접근 원칙을 유지하기 위해.
- `tests/NewDomains/NewDomainServiceValidationTest.php` 추가
  - Why: 신규 도메인 최소 검증 경로(인증/입력/관리자 제약)를 테스트 게이트에 포함해 회귀 위험을 낮추기 위해.
- 문서 동기화: `docs/API_SPEC.md`, `api/docs/openapi.yaml`, `docs/ddls/{push_notification,sdui_layout,report_block}.md`, `docs/ddls/README.md`
  - Why: 헌법의 도메인별 DDL 선행/명세 동기화 원칙을 신규 도메인에도 동일하게 적용하기 위해.

### CODEX_MASTER_PROMPT 감사 권장조치 이행
- `docs/review/CODEX_MASTER_PROMPT.md`에 완료 Phase(`[DONE]`) 상태, 누락 Phase(FileService), `.env` 파서 예시(EnvLoader 기반), 네임스페이스/오타 정합성 반영
  - Why: 이미 완료된 작업을 재실행하는 혼선을 줄이고, 프롬프트를 현재 코드 기준의 운영 문서로 동기화하기 위해.
- `.agent/Constitution.md`의 디렉토리 구조, PHPStan 기준(Level 8), G5 함수 재사용 정책(기본 금지+제한적 폴백), 비밀번호 호환 규칙을 현행 아키텍처와 일치하도록 수정
  - Why: 헌법과 실제 구현 간 충돌(규정 해석 분기)을 제거해 코드 리뷰/감사 기준을 단일화하기 위해.
- `api/v1/Core/Config/EnvLoader.php` 도입 및 `api/index.php` 환경 로딩 경로를 공용 파서로 교체
  - Why: `.env` 값에 `=`가 포함된 시크릿/토큰을 안정적으로 파싱하고, 파서 로직을 테스트 가능한 구조로 분리하기 위해.
- `tests/Support/EnvLoaderTest.php` 추가
  - Why: 환경 파서의 핵심 리스크(`=` 포함 값, quoted 값, inline comment)를 자동 테스트로 고정해 회귀를 차단하기 위해.
- `docs/audits/AUDIT_REPORT_2026-03-04_CODEX_MASTER_PROMPT_ACTIONS.md` 추가
  - Why: 외부 감사문서의 권장조치 1~4 이행 증적을 별도 리포트로 남겨 추적 가능성을 확보하기 위해.

### 문서 기준 재감사 후속 (계약 테스트/배포 리허설 체계 완성)
- `tests/contract/g5-repository/*` 계약 테스트와 실패 시나리오 테스트 추가
  - Why: 연동계층 설계서의 DoD(계약 테스트/실패 시나리오)를 코드 게이트로 고정해 회귀를 자동 차단하기 위해.
- `docs/compatibility/gnuboard-version-matrix.md` 신규 작성
  - Why: 그누보드/런타임 버전 지원 범위와 업그레이드 차단 조건을 문서로 고정해 운영 판단의 모호성을 줄이기 위해.
- `scripts/deploy_staging.sh`, `scripts/rollback_staging.sh`, `scripts/build_release_package.sh` 추가
  - Why: 헌법 제0장(테스트 100% 통과 전 패키징/배포 금지)을 스크립트 레벨로 강제하고, 스테이징 롤백 절차를 즉시 실행 가능 상태로 만들기 위해.
- `LegacySqlExecutor`를 기본 비활성(`LEGACY_SQL_FALLBACK=false`)로 전환하고 테스트 부트스트랩에서만 활성화
  - Why: 런타임 기본 경로를 PDO 중심으로 고정하면서도 테스트/비상 호환 경로를 분리해 단계적 탈의존 전략을 현실화하기 위해.
- `docs/architecture/G5_INTEGRATION_LAYER_DRAFT.md`, `docs/review/04_G5_DECOUPLING_ROADMAP.md`, `docs/API_SPEC.md` 상태/게이트 항목 갱신
  - Why: 문서 체크리스트와 실제 구현 상태(코드/스크립트/테스트) 간 잔여 불일치를 제거하기 위해.

### CODEX Master Prompt 페이즈 완료 (Core 안정화 + Admin 10도메인)
- `api/v1/Core` 잔여 정적분석 이슈 정리(`LegacySqlExecutor`, `Post/CommentRepository`) 및 `phpstan.neon` 정합성 패치
  - Why: Phase 진행 중 남아 있던 타입 경고(콜러블 추론 실패)를 제거해 PHPStan Level 8을 0건으로 고정하기 위해.
- `api/v1/Admin/*` 10개 도메인(Board/Group/Member/Config/Point/Content/Faq/Menu/Popular/Visit) Controller·Service·Repository 신규 구현
  - Why: `CODEX_MASTER_PROMPT.md`의 Phase 4 요구사항(관리자 API 전 도메인 구현)을 실제 라우트/도메인 코드로 이행하기 위해.
- `api/routes.php`에 `/api/v1/admin/*` 라우트군 등록 및 `JwtAuthMiddleware + AdminGuardMiddleware(mb_level=10)` 체인 적용
  - Why: 관리자 API의 권한 경계를 코드 레벨에서 일관되게 강제해 일반 사용자 접근을 구조적으로 차단하기 위해.
- `tests/Admin/AdminValidationServiceTest.php` 추가 (Admin 신규 코드 검증 경로 테스트)
  - Why: 신규 도메인 도입 시 최소 회귀 방지선을 확보하고 “테스트 없는 코드 커밋 금지” 원칙을 충족하기 위해.
- DDL 문서 확장(`docs/ddls/group.md`, `content.md`, `faq.md`, `popular.md`, `visit.md`) 및 `docs/ddls/README.md` 인덱스 갱신
  - Why: 헌법 §10-2(도메인 착수 전 DDL 문서화 강제) 정합성을 Admin 신규 도메인까지 확대 적용하기 위해.
- `docs/API_SPEC.md` 구현 범위 섹션을 Admin API 포함 상태로 업데이트
  - Why: 문서에 “관리자 API 제외”가 남아 있던 상태를 제거해 실제 구현 상태와 스펙 계약을 동기화하기 위해.

### 감사 후속 정합성 패치
- `.gitignore`에 `scripts/check_hardcoding.sh` 추적 예외를 추가
  - Why: 문서/워크플로우에서 필수 실행으로 규정된 검사 스크립트가 Git 추적에서 누락되던 재현성 문제를 해소하기 위해.
- `/members/{mb_id}` 라우트에 Optional JWT 미들웨어를 추가하고 API 명세에 선택 인증 규칙을 명시
  - Why: 관리자(`mb_level=10`) 예외 노출 정책이 문서에는 있으나 라우팅에 인증 컨텍스트가 전달되지 않던 불일치를 제거하기 위해.
- Config 응답 예시 키(`cf_member_point`)를 구현 화이트리스트 기준(`cf_register_point`)으로 정정
  - Why: 문서 예시와 실제 응답 스키마 불일치로 인한 프론트 연동 오해를 방지하기 위해.
- 헌법 §4.3 DB 규칙을 그누보드 코어 DB API 연동 현실에 맞게 보정
  - Why: Prepared Statement 100% 강제 문구와 레거시 코어 연동 방식 간 충돌을 해소해 코드리뷰 기준을 단일화하기 위해.
- `docs/audits/AUDIT_REPORT_2026-03-04.md`를 조치 완료본으로 갱신
  - Why: 이전 감사의 구버전 진단 항목을 현재 코드 기준으로 정리하고, 실제 조치 상태를 문서에 고정하기 위해.
- `api/index.php` 오토로더 경로를 루트 `vendor` 우선 + `api/vendor` fallback으로 보정
  - Why: 서버 배포 시 `api/vendor`만 가정하면 Composer PSR-4 기준 경로가 어긋나 런타임 클래스 로딩 실패(500)가 발생할 수 있어, 실제 프로젝트 구조(루트 composer)와 일치시키기 위해.

### Member/Like/Point/Menu/Config 도메인 착수
- `api/v1/Member`, `api/v1/Like`, `api/v1/Point`, `api/v1/Menu`, `api/v1/Config` 3계층 구조와 라우트 매핑 추가
  - Why: `boards` 외 핵심 도메인을 순차 착수해 사용자 스펙(회원 프로필, 공개 프로필, 포인트 이력, 메뉴 조회, 좋아요/비추천, 설정 조회)을 구현 기준으로 고정하기 위해.
- 회원/좋아요/포인트/메뉴/설정 서비스에 대한 단위 테스트와 테스트 스텁 인프라 추가
  - Why: 헌법에서 TDD를 의무화하고 배포 이전 `100%` 통과 기준을 수치화하기 위해.
- 도메인 API 스펙 동기화(`api/docs/openapi.yaml`, `docs/API_SPEC.md`) 및 하드코딩 검사 게이트 반영
  - Why: 구현과 문서 간 괴리를 제거하고, 기존 `/posts/latest`처럼 스펙에 없는 경로가 남는 것을 정리하기 위해.
- phpunit 부트스트랩 경로 정리 및 테스트 안정화
  - Why: `phpunit` 실행 일관성을 확보하고 CI/CD 실행 시 수동 작업을 제거하기 위해.

### 프로젝트 초기 설정
- `.agent/Constitution.md` v1.0.0 제정
  - Why: rest-middleware(Rust) 프로젝트 헌법을 PHP REST API 맥락으로 적응. REST API 일반론 + 그누보드5 연동 규칙 포함.
- `.agent/workflows/` 워크플로우 3종 생성 (commit-push, deploy-staging, document-management)
  - Why: rest-middleware와 동일한 개발 프로세스/문서 관리 체계 구축.
- `docs/API_SPEC.md` 초기 명세 작성
  - Why: API 개발 시작 전 엔드포인트 규격 확정.

### 문서 정합성 패치
- `docs/API_SPEC.md` 구조/삭제/인증 정책 충돌 정리
  - Why: 논리 삭제 vs 물리 삭제, Models-only vs Service/Repository, 해시 정책 모호성으로 구현 기준이 분산되어 재작업 위험이 컸기 때문.
- `.agent/Constitution.md` 아키텍처/비밀번호 정책 문구 통일
  - Why: 헌법과 API 명세가 동일한 기준을 참조하도록 맞춰 코드 리뷰 및 구현 판단 기준을 단일화하기 위함.
- `.agent/workflows/deploy-staging.md` 배포 모드 명시화 (표준/호환)
  - Why: `vendor` 포함 배포와 서버 `composer install` 방식이 문서마다 다르게 표현되어 운영 혼선을 유발했기 때문.
- `api/docs/openapi.yaml` 초기 산출물 추가
  - Why: `/api/docs` 문서 제공 정책의 근거 파일이 저장소에 없어 문서 자동화 기준점이 부재했기 때문.
- `vendor 동봉 배포` 정책으로 통일 및 PHP 최소 버전 8.1+ 재확정
  - Why: 국내 웹호스팅의 Composer 미지원 환경이 여전히 많아, 배포 시 서버 의존성을 제거하고 이식성을 높이기 위함.
- `api/docs/openapi.yaml` API_SPEC 동기화 확장
  - Why: SDD 원칙상 OpenAPI가 계약서여야 하나 `/health`만 정의되어 있어 실제 명세와 격차가 컸기 때문.
- `docs/API_SPEC.md` 절대경로 링크 제거 및 하드코딩 차단 규칙 명시
  - Why: 로컬 경로 링크 의존은 문서 공유 환경에서 깨지므로 환경 독립적인 규격을 유지해야 했기 때문.
- `scripts/check_hardcoding.sh` 추가 및 워크플로우 연동
  - Why: 하드코딩 금지 원칙을 문구 수준이 아닌 배포/커밋 전 자동 검증 단계로 강제하기 위함.
- 인증 도메인 착수: `auth` 라우트 및 JWT 기반 서비스 스켈레톤 구현
  - Why: 문서 우선 개발 원칙에 따라 로그인/회원가입/토큰갱신을 먼저 안정화해 후속 도메인 구현(게시판/회원/첨부/설정)의 실행 기반을 확보해야 했기 때문.
- composer 설치 기반 정리 (`vendor`/`composer.lock` 생성)
  - Why: `composer install --no-security-blocking`로 필수 패키지(`slim`, `firebase/php-jwt`, `rakit/validation`, `swagger-php`)를 실제 배포 가능한 형태로 확보해야 했기 때문.

### DDL 문서 가동
- `docs/ddls/*` 도메인 문서(README, auth, board, post, comment, file, like, member, point, config, menu) 추가 및 정합성 반영
  - Why: 도메인 착수 전 데이터 계약을 고정해 구현 충돌과 누락을 줄이기 위함.
- 문서 거버넌스 반영(`.agent/Constitution.md`, `document-management.md`)
  - Why: DDL 문서가 없는 상태에서의 개발 착수를 금지해 문서 기반 개발 규율을 강제하기 위함.

### Post 도메인 착수
- `api/v1/Post` 구조(`Repository`, `Service`, `Controller`)와 게시글 라우트(`/boards/{bo_table}/posts`) 추가
  - Why: 도메인별 계층 분리를 유지하면서 게시글 목록/조회/작성/수정/삭제/좋아요 기능의 실행 경로를 고정했기 때문.
- `api/index.php`와 라우트 엔트리 재구성
  - Why: 글로벌 예외 처리, RFC7807 매핑, 요청 컨텍스트/Trace, CORS 정책 fail-fast를 엔트리에서 일원화해야 운영 중단 이슈를 줄일 수 있기 때문.
- `post` 관련 문서/테스트/운영 게이트(하드코딩 검사, phpunit) 재점검 반영
  - Why: 운영 배포 전 품질 게이트를 코드 변경 직후에도 자동으로 재현/검증할 수 있도록 하기 위해서임.

### Comment 도메인 착수
- `api/v1/Comment` 3계층(Repository/Service/Controller)과 댓글 라우트(`/boards/{bo_table}/posts/{wr_id}/comments`) 추가
  - Why: 댓글 조회/작성/수정/삭제 구현을 API 명세(`docs/API_SPEC.md`)와 DDL 규약(`docs/ddls/comment.md`)에 맞춰 분리된 도메인으로 착수하기 위함.
- 댓글 작성/수정/삭제에서 게시글 존재 확인, `bo_comment_level` 체크, 작성자 본인/관리자 권한 검사, 부모 댓글 유효성 검사(대댓글), 댓글·게시글 카운트(`wr_comment`, `bo_count_comment`) 동기화 적용
  - Why: 실제 댓글 운영 규칙에서 가장 자주 누락되는 권한/계층/집계 정합성 이슈를 구현 단계에서 봉쇄하기 위함.

### File 도메인 착수
- `api/v1/File` 3계층(Repository/Service/Controller)과 파일 라우트(`/v1/files/upload`, `/v1/files/{bo_table}/{wr_id}/{bf_no}`) 추가
  - Why: 첨부파일 업로드/다운로드 API를 `docs/API_SPEC.md` File 항목의 계약에 맞춰 게시판 단위의 파일 수명주기(저장, 조회, 카운트 증분)로 먼저 착수하기 위함.
- 파일 업로드는 인증 회원의 `bo_write_level` 기반 쓰기 권한을 검사하고, 게시글 업로드시 게시글 존재 및 게시판 첨부 개수/크기 정책(`bo_upload_count`, `bo_upload_size`)을 검증
  - Why: 업로드 단계에서 권한/용량/개수 위반이 선차단되지 않으면 게시글 연계 데이터 정합성이 깨지는 재작업 위험이 크기 때문.
- 다운로드는 공개 경로로 라우팅하되 JWT 존재 시 선택적 인증을 적용하고, `bo_download_level` 기반으로 인증 필요/권한 제한 처리
  - Why: 문서의 `bo_download_level` 계약을 지키면서 게스트 허용/회원 필요 구간을 분리해 운영 정책 대응력을 높이기 위함.

### File 도메인 패치
- File 업로드/다운로드에서 `wr_id` 0 허용 정책 메시지 정합성 보정, 실행 파일 확장자 sanitize null-safe 처리, 다운로드 MIME 타입 보강, FileService 단위 테스트 추가
  - Why: 계약(`wr_id` 유연성)과 예외 응답, 파일 응답 메타 품질 간 불일치를 제거하고 회귀를 줄이기 위함.
- `api/v1/Core/Plugin/PluginScopePolicy.php`에 `point.write -> PointRewardGateway`, `post.read -> PostReadGateway` 우선 진입면을 추가하고, `api/plugins/Wolchuck/BoardReward/{Plugin.php,src/Service/BoardRewardService.php}`, `tests/Core/Plugin/{BoardRewardPluginIntegrationTest.php,PluginScopedContainerTest.php}`, `tests/contract/g5-repository/GatewayImplementationContractTest.php`, `docs/{README,IMPLEMENTATION_ROADMAP,TODO,HISTORY}.md`, `docs/architecture/{PLUGIN_DEVELOPER_GUIDE,PLUGIN_IMPLEMENTATION_STANDARD,SHARED_GATEWAY_INVENTORY}.md`를 갱신해 sample plugin과 plugin 테스트가 좁은 shared 포트를 우선 사용하도록 정리함
  - Why: broad `PointGateway`와 `PostGateway`는 plugin 호환 때문에 당장 제거하기 어렵지만, plugin scope가 좁은 포트를 같이 제공하지 않으면 새 플러그인도 계속 broad shell을 진입점으로 복제하게 된다. scope 정책에서 `PointRewardGateway`와 `PostReadGateway`를 함께 노출하고 sample plugin을 먼저 옮겨 두면 기존 플러그인 호환을 깨지 않으면서 broad shell의 성격을 `compatibility`로 더 명확히 고정할 수 있다.
- `api/v1/{Post/Contracts/PostWriteGateway.php,Integration/Contracts/PostWriteGateway.php,Post/Contracts/PostGateway.php,Integration/Contracts/PostGateway.php,Post/definitions.php,Core/Plugin/PluginScopePolicy.php}`, `tests/{Core/Plugin/PluginScopedContainerTest.php,contract/g5-repository/GatewayImplementationContractTest.php}`, `docs/{README,IMPLEMENTATION_ROADMAP,TODO,HISTORY}.md`, `docs/architecture/{PLUGIN_DEVELOPER_GUIDE,PLUGIN_IMPLEMENTATION_STANDARD,SHARED_GATEWAY_INVENTORY}.md`를 갱신해 `post.write` scope도 dedicated `PostWriteGateway`를 직접 받을 수 있게 정리함
  - Why: `PostReadGateway`만 열려 있으면 플러그인 읽기 흐름은 좁혀도 쓰기 흐름은 계속 broad `PostGateway`를 시작점으로 잡게 된다. shared `PostWriteGateway`를 추가해 두면 새 플러그인은 read/write를 각각 좁은 포트로 선언할 수 있고, broad `PostGateway`는 실제로 `Core/Plugin` 호환 shell인지가 더 명확해진다.
- `composer run audit:porting`, `composer run test:api:hurl`를 다시 통과시키고 `docs/{README,IMPLEMENTATION_ROADMAP,TODO}.md`를 현행화해 구조 정상화 스트림을 완료 상태로 승격함
  - Why: 구조 리팩터링이 끝나도 SSOT가 여전히 `진행 중`을 가리키면 다음 작업이 구조 정리인지 포팅/운영 검증인지가 흐려진다. 포팅 감사와 원격 smoke까지 녹색인 시점에서 로드맵을 완료로 올려 두면 이후엔 blocked 외부 인증 smoke와 문서 상태 현행화 같은 실제 잔여 과제만 추적할 수 있다.
- `docs/{architecture/SHARED_GATEWAY_INVENTORY,README,IMPLEMENTATION_ROADMAP,TODO}.md`를 다시 정리해 shared gateway slim phase를 active 과제가 아닌 compat shell/장기 재검토 조건으로 내리고 `DOC-110`을 닫음
  - Why: 구조 정상화가 끝난 뒤에도 지원 문서가 계속 “다음 슬림화 순서”를 말하면 실제로는 끝난 구조 리팩터링이 아직 진행 중인 것처럼 읽힌다. broad shared gateway를 compat shell로만 관리한다는 현재 판단과 다음 문서 운영 과제를 SSOT/지원 문서에 동시에 반영해야 이후 우선순위가 외부 인증 smoke와 문서 운영 후속으로 안정적으로 넘어간다.
- `docs/{README,AUDIT_SYSTEM,IMPLEMENTATION_ROADMAP,TODO}.md`, `.agent/sub-constitutions/document-governance.md`를 갱신해 `DOC-111`, `DOC-112`를 닫고 SQLite 검색 예시와 감사 로그 증적 규칙을 운영 기준으로 승격함
  - Why: `docs/docs.db`가 있어도 실제 조회 예시가 없으면 팀이 여전히 전체 Markdown을 무차별 스캔하게 되고, `.log`가 어떤 지위인지 규칙이 없으면 활성 감사 영역에 증적 파일이 다시 쌓일 수 있다. 검색 예시와 로그 정책을 SSOT/거버넌스에 같이 적어 두어야 문서 탐색은 빨라지고 감사 산출물은 `권위 보고서`와 `보조 증적`으로 안정적으로 분리된다.
