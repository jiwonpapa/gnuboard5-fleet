# 작업 상태 SSOT

이 문서는 이 프로젝트의 유일한 작업 상태 SSOT입니다.
상태 전이는 `Inbox -> Next -> In Progress -> Blocked -> Done`만 사용합니다.

## Inbox

- 없음

## Next

- `ARCH-224` `WB-2026-014` 만료 전 `AdminBoardInputNormalizer`를 필드군별 normalizer로 분해해 기존 215/215 field binding을 보존하면서 파일을 320 LOC 이하로 축소하기
- `QG-206` `adm/shop_admin/**/*.php` 99개를 API-covered/web-only/support-helper/unmapped로 전수 분류하고, unmapped 0을 공급자 감사 완료 조건으로 닫기
- `QG-208` Rust 교차 aggregate와 production wire 17-domain live roundtrip은 구현·검증됐다. 공개 API WAF write method 허용과 실제 Tauri invoke/DOM 전 도메인 증거를 결합한 current-run full certification을 마무리하기
- `QG-210` live provider의 site identity·revision·OpenAPI SHA를 로컬 PHP revision/contract hash와 결합해 다른 서버나 stale 배포를 인증 증거로 쓰지 못하게 하기

## In Progress

- 없음

## Blocked

- `AUTH-308` `Google` staging credential 반영 후 실 callback/login smoke와 member linkage 시나리오를 수동 검증: 2026-03-11 스테이징 `/home/neojins/public_html/.env` 재확인 기준 `AUTH_EXTERNAL_GOOGLE_*` 설정이 비어 있어 실제 provider가 `/auth/external/providers`에 노출되지 않음
- `AUTH-310` `Kakao` staging credential 또는 테스트 계정 확보 후 실 callback/login smoke와 member linkage 시나리오를 수동 검증: 2026-03-11 스테이징 `/home/neojins/public_html/.env` 재확인 기준 `AUTH_EXTERNAL_KAKAO_*` 설정이 비어 있어 실제 provider가 `/auth/external/providers`에 노출되지 않음

## Done

- `QG-237` 모노레포 이전 기준선에서 무시되던 품질 게이트·live inspect 스크립트와 관리자 Shop Catalog Stock SMS 구현을 추적 대상으로 복구해 clean clone 소스 폐쇄를 확보했다
- `QG-236` 엄격 SQL mode의 관리자 게시판 최소 생성 기본값과 포인트 원장 `po_rel_id` 길이 초과를 수정하고, 테스트 VM Apache origin에서 production Rust wire 17-domain 저장·재조회·정리와 외부 발송 0건을 통과했다. 공개 WAF의 PUT·PATCH·DELETE HTML 403은 공급자 코드가 아닌 외부 통합 blocker로 분리했다
- `QG-232` Shell 내부 generated schema 라벨 검사를 독립 Python 감사기와 4개 fail-closed 테스트로 분리하고, 전체 Python 하네스 회귀·Ruff·Mypy·ShellCheck를 `audit:harness` 및 통합 CI 필수 게이트로 고정했다
- `QG-231` protected 일반 게시판 26개와 공개 투표/파일/댓글 계약을 named·closed 요청·구체 응답으로 고정했다. 게시글 `wr_password`와 파일 서버 절대경로 `path`의 raw 응답 노출을 Presenter로 차단하고, G5 원본의 `po_etc` 기타의견 질문 문자열 의미를 복원했다. canonical/legacy 투표 required 대안과 multipart binary를 엄격하게 판정하도록 하네스를 보강했다. 전체 312/active 189/protected 26을 유지한 채 provider `34 -> 0`, field binding `10 -> 0`, audited `215/215`, PHP 로컬 `certified=true`로 마감했다
- `QG-230` 잔여 관리자 poll/popular/write-count/push/report/visit/QA/schema와 공개 세션 auth의 요청·저장·응답 계약을 닫았다. 관리자 Board 96개 필드와 공개 Board DTO를 분리해 관리자 기능을 축소하지 않았고 provider `77 -> 34`, field binding `19 -> 10`으로 줄인 뒤 잔여를 `QG-231`로 이관했다
- `QG-229` `/admin/auth*`와 `/admin/config` 요청·저장·응답을 named·closed/구체 schema로 고정했다. 권한 검색 날짜를 실제 회원 등록일 조회에 결합하고 회원별 복수 권한 페이지 유실을 제거했다. 설정은 canonical 153개 입력을 전부 검증·저장하고, 응답은 비밀 13개를 제외한 안전한 140개 필드로 제한한다. 하네스는 153개 정적 목록과 `oneOf/anyOf` 모든 타입·enum 분기를 검증한다. 대상 5/5 field binding 통과, 전체 provider `86 -> 77`, field binding `22 -> 19`, `199 passed / 16 failed`이며 전체 완료 선언은 아니다
- `QG-228` `/admin/contents*`, `/admin/faqs*`, `/admin/faq-masters*`의 JSON·multipart 요청과 body 성공 응답을 named·closed/구체 schema로 고정했다. 콘텐츠 raw `SELECT *`를 공개 10개 필드로 제한하고, 콘텐츠·FAQ·FAQ 마스터 입력은 미선언 필드와 타입 불일치를 거부한다. FAQ 생성이 정규화 payload 대신 원본을 저장하던 결함을 수정하고 이미지 업로드 별칭과 단일 배열 형태를 모두 계약화했다. 대상 20/20 field binding 통과, 전체 provider `117 -> 86`, field binding `27 -> 22`, `196 passed / 19 failed`이며 전체 완료 선언은 아니다
- `QG-227` `/admin/points*` 통합 action·삭제·지급·차감·만료 요청과 성공 응답을 named·closed/구체 schema로 고정했다. action/search enum과 정수·날짜를 검증하고 누락됐던 `po_use_point/po_expired/po_expire_date` 조회를 복원해 원장 12개 필드를 반환한다. 포인트 7/7 field binding 통과, 전체 provider `132 -> 117`, field binding `29 -> 27`, `191 passed / 24 failed`이며 전체 완료 선언은 아니다
- `QG-226` `/admin/menus*` 생성·수정·표준/레거시 재정렬 요청과 성공 응답을 named·closed/구체 schema로 고정했다. 활성 Tauri 소비와 DB에 맞춰 플래그를 integer `0|1`로 교정하고, 재정렬 중첩 항목 검증과 8개 공개 응답 필드 타입 정규화를 추가했다. 메뉴 7/7 field binding 통과, 전체 provider `147 -> 132`, field binding `31 -> 29`, `189 passed / 26 failed`이며 전체 완료 선언은 아니다
- `QG-225` `/admin/members*`의 수정·레벨·미디어 요청과 모든 body 성공 응답을 named·closed/구체 schema로 고정했다. Presenter가 raw 회원 row를 공개 57개 필드로 제한해 비밀번호 해시·인증 토큰 노출을 차단하고, 미선언 입력 거부와 `mb_open -> mb_open_date/동의 로그` 저장을 결합했다. 회원 10/10 field binding 통과, 전체 provider `162 -> 147`, field binding `35 -> 31`, `187 passed / 28 failed`이며 전체 완료 선언은 아니다
- `QG-224` `/admin/mails*`와 `/admin/mail-tests`의 요청 5개와 body 성공 응답 8개를 named·closed/구체 schema로 고정하고 canonical 템플릿 필드와 레거시 별칭·테스트 경로를 모두 보존했다. Presenter가 템플릿·상세·수신자 row를 정확한 공개 DTO로 제한하고 세 쓰기 흐름은 미선언 필드를 거부한다. 메일 8/8 field binding 통과, 전체 provider `182 -> 162`, field binding `40 -> 35`, `183 passed / 32 failed`이며 전체 완료 선언은 아니다
- `QG-223` `/admin/board-groups*`와 `/admin/groups*` alias를 유지한 채 그룹·회원 요청과 성공 응답을 named·closed schema로 고정하고, 누락 query 3개를 복원했다. Presenter가 `SELECT *`/LEFT JOIN row를 계약 필드·타입으로 제한하며 그룹 16/16 field binding을 통과했다. 전체 312 operation은 유지했고 provider는 `205 -> 182`, field binding은 `47 -> 40`, `180 passed / 35 failed`이므로 전체 완료 선언은 아니다
- `QG-222` 관리자 레이아웃 요청 5개와 body 성공 응답 8개를 named·closed/구체 schema로 고정하고, Presenter가 `sl_*` DB 타입을 정규화하면서 `sl_schema` 문자열과 `sl_active` 0/1 계약을 보존했다. 하네스는 PHP associative array와 JSON object의 타입 경계를 인식하며 레이아웃 8/8 field binding을 통과했다. 전체 312 operation은 유지했고 provider는 `225 -> 205`, field binding은 `51 -> 47`, `173 passed / 42 failed`이므로 전체 완료 선언은 아니다
- `QG-221` SMS body 성공 응답 33개를 전부 도메인별 named schema로 고정하고, 4개 Presenter가 설정·동기화·템플릿·연락처·발송 DTO의 숫자·불리언·nullable 타입을 정규화한다. 하네스는 `ApiResponse::envelope()` custom meta와 `self/static` Presenter 반환 필드를 추적하며 SMS 37/37 field binding 통과를 유지했다. 전체 312 operation은 유지했고 provider는 `257 -> 225`, field binding은 `170 passed / 45 failed`, 51건이므로 전체 완료 선언은 아니다
- `QG-220` 관리자 시스템 요청 8개와 성공 응답 22개를 named·closed/구체 schema로 고정하고 권한·투표·QA·메일 응답을 실제 타입으로 정규화했다. QA 레거시 확장 10개 필드는 요청→초기 저장→조회까지 복원했으며 하네스의 scalar-derived 오탐과 filesystem operation 계층 정책을 보강했다. 관리자 시스템 32/32 operation은 통과하지만 전체 312 operation의 provider 257건, field binding `170 passed / 45 failed`, 51건이므로 전체 완료 선언은 아니다
- `QG-219` 관리자 게시판 mutable field를 generated schema와 맞춰 61→92개로 확장하고 96개 응답 필드를 정규화했다. 생성·수정·복사·최근 게시물 삭제 요청을 named·closed schema로 고정하고 `copy_posts`가 게시글·첨부 메타·실파일을 실제 복사하도록 연결했다. 하네스는 class constant와 PHP-DI autowire를 추적하며 관리자 게시판 7/7을 통과했다. 전체 312 operation은 유지했고 provider 298건, field binding `157 passed / 58 failed`, 67건이므로 전체 완료 선언은 아니다
- `QG-218` field binding 하네스에 중첩 배열 요소, 복수 request media, 숫자 index, 업로드 파일/stream, type predicate와 SMS boolean 정규화 증거를 추가했다. SMS request body 18개 media를 16개 named·closed schema로 고정하고 기존 관리자 별칭을 보존했으며 multipart import와 `memo`/`receipt` 저장 누락을 수정했다. SMS 37/37 operation은 통과하지만 전체 provider 311건, field binding `127 passed / 88 failed`, 117건이므로 전체 완료 선언은 아니다
- `QG-217` field binding 배열 key 계보·해석된 helper·literal foreach/array_keys/enum 목록 추적을 보강해 가짜 request 경로를 제거했다. 팝업 관리자 API 10개는 named·closed request, 실제 Popup response, enum·미선언 필드 runtime 검증까지 맞춰 전부 통과했다. 전체 312 operation은 유지했고 provider 적색은 350건, field binding은 `108 passed / 107 failed`, 171건이므로 전체 완료 선언은 아니다
- `QG-216` field binding 하네스가 선택 응답 필드·선택 부모의 필수 자식을 누락으로 오판하지 않도록 고치고, 배열 append·반환형 기반 지연 객체·typed `get()` 호출을 추적하도록 보강했다. 모든 명시적 runtime `withStatus()`를 OpenAPI와 대조하고 실제 FAQ 삭제 `200/body ↔ 204` 불일치도 수정했다. `/admin/schema` 응답을 계약 형태로 정규화해 response 미결합을 188→0으로 닫았으며 전체 적색 기준선은 45 passed / 170 failed, 282건이다
- `QG-215` active 관리자 + protected 일반 게시판의 `201 Created` 27개에 OpenAPI/runtime `Location` 계약을 결합하고, deferred QA 3개도 계약을 동기화했다. 메일 발송·포인트 action 4개는 `200`으로 바로잡았으며 runtime response-contract mismatch는 active/protected/deferred 모두 0이다. hard gate 밖 Location 미선언 9개는 deferred 6/excluded shop 3 증거로 보존했다. 전체 312 operation은 유지했고 provider 적색 기준선은 402건, field binding은 551건이므로 API 완료 선언은 아니다
- `QG-214` REST API `312` operation의 method+path 집합 SHA와 분류별 개수를 축소 금지 inventory로 고정하고, 소비 결정이 deferred인 일반 게시판 26개를 provider/runtime/field protected hard gate에 편입했다. 전 operation의 429·500 계약과 게시판 다운로드 binary 응답을 실제 runtime에 맞췄다. runtime active/protected route·security는 0 findings로 통과하지만 provider 434건과 field binding 551건은 적색으로 유지하므로 API 완료 선언이 아니다
- `QG-213` Phase 1 관리자 소비 범위를 `openapi.phase1-consumer-scope.json` 단일 SSOT로 고정했다. 후속 `QG-214`에서 전체 312개와 일반 게시판 26개 보호 인벤토리를 추가했으며, 관리자 실제 소비 범위 189개 자체는 변경하지 않았다
- `QG-207` OpenAPI request/response field를 실제 PHP Controller→Service→Repository AST flow와 자동 대조하는 fail-closed 하네스를 도입했다. 후속 `QG-231` 기준 exact 215 operation이 `215 passed / 0 failed`, `0 findings`, `certified=true`이며 live/Rust 결합 인증은 별도다
- `QG-211` PHP OpenAPI 공급자 의미 감사 hard gate를 도입했다. 후속 `QG-231` 기준 blocking `0`, deferred `17`, excluded `29`, PHP 로컬 `certified=true`이며 deferred/excluded 증거는 삭제하지 않는다
- `QG-209` 실제 Slim RouteCollector 감사 프로필 도입: DB 요청 없이 316 route operation을 부팅하고 `/v1` 315건 handler를 전부 해석해 OpenAPI 312건과 결합한다. active 189개와 protected 일반 게시판 26개의 route/security finding은 0건이며 `/admin-inspect/*` deferred finding 6건을 보존한다
- `QG-205` `API_PIPELINE_AUDIT_V1` 공급자 1차 감사 정의와 fail-closed harness 도입: 8개 HTTP method 선언 route/OpenAPI parity, 동적 route unresolved hard-fail, 재귀 `adm/**/*.php` 254개 inventory, per-domain/aggregate audit-run-id·mtime·child exit·browser artifact 검증, stale/empty summary와 method/module mutation 회귀를 고정했다. 이는 하네스 도입 완료이며 실제 runtime route/handler semantics나 앱 소비 완료 선언이 아님
- `DOC-131` `shop-admin catalog` 사전 계획 완료: `docs/audits/SHOP_ADMIN_CATALOG_PLAN_2026-03-14.md`로 카탈로그 진입점/액션/도메인 분해/기본값 정책을 고정하고, 1차 구현 스펙(카테고리/상품/재고/문의/사용후기/이벤트) 실행 순서를 수립했습니다.
- `DOC-132` `shop-admin catalog` 1차 구현 착수: `shop-catalog`(카테고리/상품/재고/문의/사용후기/이벤트) 스키마/라우트/기본값 정책을 계약으로 고정하고 `/admin/shop/catalog` 라우트/컨트롤러/서비스/리포지토리 스켈레톤을 탑재했습니다.
- `DOC-133` `shop-admin catalog` 스키마 정합성 마무리: `shop-catalog` provider를 `/admin/schema`에 `shop-catalog-category|product|review|inquiry|event`로 분할 등록하고 `shop-catalog` feature를 implemented로 전환 후 `schema-provider-readiness` 정합성을 확보했습니다.
- `DOC-128` `adm/shop_admin` 1차 포팅 감사 스캔 완료: `99`개 레거시 파일과 메뉴 진입점 `26`개를 기준으로 `/admin/shop*` API/스키마 부재 및 `g5_shop_*` 의존도 정합성 갭을 확인하고 `docs/audits/SHOP_ADMIN_AUDIT_2026-03-14.md`에 반영
- `DOC-127` `/admin/schema` placeholder label 5건 해소: `sms-contacts`, `mails`, `points` domain에 남아 있던 `FIXME_` 라벨을 현재 작업면 기준 제목(`텍스트 가져오기`, `드라이런`, `선택 템플릿 사용`, `기준일`)으로 정리하고 generated schema/테스트를 다시 맞춰 통합 감사의 마지막 schema label warning을 제거
- `DOC-126` `/admin/schema` provider rollout 2차(sms-contacts, sms-messages, sms-templates, mails, points): `schema-domains.json`에 남은 5개 domain을 추가하고 generated schema/테스트/readiness registry를 갱신해 implemented 16개 / blocked 0개 기준으로 provider backlog를 종료
- `DOC-125` `/admin/schema` provider rollout 1차(system, theme): `schema-domains.json`에 `system`, `theme` domain을 추가하고 generated schema/테스트/readiness registry를 갱신해 implemented 11개 / blocked 5개 기준으로 backlog를 축소
- `DOC-124` `/admin/schema` provider readiness registry 도입: `ADMIN_SCHEMA_PROVIDER_READINESS.toml`, `check_admin_schema_provider_readiness.py`, `generate_admin_schema_provider_report.py`를 추가해 implemented 9개 / blocked 7개 provider backlog를 machine-readable registry와 generated artifact로 고정
- `DOC-129` `shop_admin 2차 포팅 정합성 사전 감사 수행: `docs/audits/FIELD_PARITY_AUDIT_2026-03-14.md` 작성, `adm/admin.menu400.shop_1of2.php` + `adm/admin.menu500.shop_2of2.php` 기준 `/admin/shop*` 라우트 후보 및 write-action 후보를 1차 정리
- `DOC-130` `shop_admin` 포팅 backlog를 `ADMIN_SCHEMA_PROVIDER_READINESS.toml`에 등록: `shop-config|shop-catalog|shop-orders|shop-personalpay|shop-promotion|shop-sales` feature의 blocked 계획을 고정하고 다음 단계 추적 체계로 이행
- `DOC-123` shared gateway/source-of-truth 규칙을 machine-readable registry로 승격: `docs/architecture/GATEWAY_USAGE_RULES.json`를 추가하고 구조 감사와 계약 테스트가 같은 allowlist를 읽어 `shared gateway inventory drift`, `local compat contract leak`를 자동 검증하도록 정리
- `DOC-122` PHP 구조 감사 generated artifact 도입: `scripts/generate_structure_audit_report.py`, `composer run audit:structure-report`, `output/php-structure-audit/latest.{md,json}`를 추가해 active finding/warning budget/blocker 상태를 재사용 가능한 최신 증적으로 고정
- `DOC-121` PHP 구조 finding을 rule/path 단위로 승격: `scripts/php_structure_findings.py`, `scripts/check_active_structure_boundaries.py`, `composer run audit:structure-findings`를 추가하고 `WARNING_BUDGETS.toml`가 active structure warning과 자동 매칭되도록 보강
- `DOC-120` PHP waiver/warning budget registry 도입: `docs/audits/{WAIVERS,WARNING_BUDGETS}.toml`과 `scripts/check_{audit_waivers,warning_budgets}.py`, `composer run audit:{waivers,warning-budgets}`를 추가하고 `run_deep_audit.sh`에 편입해 blocker 외 예외/경고 운영 debt도 registry 형태로 관리할 준비선을 고정
- `DOC-119` PHP 감사 운영 SSOT와 blocker registry 도입: `docs/AUDIT_SYSTEM.md`를 감사 운영 SSOT로 추가하고, `docs/audits/BLOCKERS.toml` + `scripts/check_blocker_registry.py` + `composer run audit:blockers`를 도입해 `docs/TODO.md`의 Blocked 상태와 실제 운영 blocker를 같은 규칙으로 점검하도록 정리
- `ARCH-215` Point shared surface split 1차: `Api\\Integration\\Contracts\\Point{Reward,Maintenance}Gateway`를 추가하고 `AuthRegistration/AuthSession/PostPoint/Memo/AdminPollVote` 흐름이 broad `PointGateway` 대신 reward/maintenance 포트를 바라보게 정리했으며, 계약 테스트 allowlist와 shared inventory 문서도 새 호환면 기준으로 갱신
- `ARCH-218` Point shared surface split 2차: `Api\\Integration\\Contracts\\PointQueryGateway`를 추가하고 `AdminPointService`가 broad shared `PointGateway` 대신 `PointQueryGateway`, `PointRewardGateway`, `PointMaintenanceGateway`를 직접 바라보게 정리했으며, 계약 테스트 allowlist와 shared inventory 문서도 `Admin/Point` 분리 후 기준으로 갱신
- `ARCH-219` Point broad facade cleanup: `AuthService`, `PostService`에서 실제로 쓰지 않던 broad shared `PointGateway` 생성자 의존을 제거하고 `tests/{Support/BuildsDomainServices.php,contract/g5-repository/GatewayImplementationContractTest.php}`와 shared inventory 문서를 갱신해 broad `PointGateway`가 plugin/compat surface 위주로만 남도록 정리
- `ARCH-220` Auth shared shell minimization: `tests/{Support/BuildsDomainServices.php,Member/Member{Service,EventDispatch}Test.php,Security/OptionalJwtAuthMiddlewareTest.php,contract/g5-repository/GatewayImplementationContractTest.php}`를 갱신해 `Member`/`JWT` 테스트 보조층도 `AuthIdentityGateway`, `AuthRecoveryGateway`, `AuthSessionGateway`를 기준으로 정리했고, broad shared `AuthGateway`는 repository compat와 계약 테스트 바깥에서 더 이상 직접 사용하지 않도록 allowlist를 축소
- `ARCH-221A` Post shared read surface split: `Api\\Post\\Contracts\\PostReadGateway`, `Api\\Integration\\Contracts\\PostReadGateway`를 추가하고 `Comment/File` internal helper가 broad shared `PostGateway` 대신 shared read 포트를 바라보게 정리했으며, 계약 테스트 allowlist와 shared inventory 문서를 새 경계 기준으로 갱신
- `ARCH-222A` Point test/helper reward surface split: `tests/{Support/BuildsDomainServices.php,Post/*.php,Memo/MemoServiceTest.php,Admin/Poll/AdminPollServiceTest.php}`를 갱신해 broad shared `PointGateway` 대신 `PointRewardGateway`를 사용하도록 정리했고, 계약 테스트 allowlist와 shared inventory 문서도 남은 broad shell 범위에 맞게 축소
- `ARCH-222B` Point auth test shell split: `tests/Auth/{AuthService,AuthServicePoint,AuthSessionService,AuthEventDispatch,ExternalAuthTransitionService}Test.php`와 `tests/contract/g5-repository/GatewayImplementationContractTest.php`를 갱신해 `Auth` 테스트 보조층도 broad shared `PointGateway` 대신 `PointRewardGateway`/`PointMaintenanceGateway`를 사용하도록 정리했고, broad shared allowlist를 `Core/Plugin` + compat shell 수준으로 추가 축소
- `ARCH-223A` Plugin narrow gateway preference: `api/v1/Core/Plugin/PluginScopePolicy.php`에 `point.write -> PointRewardGateway`, `post.read -> PostReadGateway` 우선 진입면을 추가하고, sample plugin `api/plugins/Wolchuck/BoardReward`와 `tests/Core/Plugin/*`를 좁은 shared 포트 기준으로 갱신해 broad `PointGateway`를 sample plugin 소비면에서 제거함
- `ARCH-223B` Plugin post write surface split: `Api\\Post\\Contracts\\PostWriteGateway`, `Api\\Integration\\Contracts\\PostWriteGateway`를 추가하고 `PluginScopePolicy`, plugin 테스트, shared inventory 문서를 갱신해 `post.write` scope도 broad `PostGateway` 대신 dedicated write 포트로 시작할 수 있게 정리함
- `ARCH-223` shared gateway slim phase 6: `Point` sample/plugin reward surface를 `PointRewardGateway`로, `Post` plugin read/write surface를 `PostReadGateway`/`PostWriteGateway`로 열어 broad shared `PointGateway`, `PostGateway`를 `Core/Plugin` compat shell + repository/contract 호환면 중심으로 축소했고, 구조/구현/포팅 감사와 원격 Hurl smoke까지 모두 녹색으로 마감
- `QG-204` 원격 smoke baseline 재검증: `composer run test:api:hurl`를 `https://gnurestapi.cc`에 대해 재실행해 `/api/v1/health`, `/api/docs/index.html`, `/api/docs/openapi.yaml` smoke가 모두 통과함
- `DOC-110` planning/architecture 문서 상태 현행화: `docs/architecture/SHARED_GATEWAY_INVENTORY.md`의 shared gateway slim phase 표현을 현재 완료 상태와 맞게 compat shell/장기 재검토 조건으로 정리하고, `README`/`IMPLEMENTATION_ROADMAP`/`TODO` SSOT도 다음 문서 운영 과제 기준으로 갱신
- `DOC-111` SQLite 검색 운영 예시 정리: `docs/README.md`와 문서 거버넌스에 `docs/docs.db` 재생성/FTS/path 조회 예시를 추가하고, 검색 결과는 후보 탐색 후 원문 Markdown/OpenAPI로 재확인한다는 원칙을 명시
- `DOC-112` 감사 로그 증적 규칙 승격: `docs/AUDIT_SYSTEM.md`와 문서 거버넌스에 `*.log`를 보조 증적 산출물로만 취급하고 활성 `docs/audits/`에는 장기 잔존시키지 않는 운영 규칙을 명시
- `ARCH-216` PHP 구조 warning budget 해소: `scripts/php_structure_findings.py`가 순수 위임 파사드를 구조 warning이 아니라 note로만 취급하도록 보강하고 `docs/audits/WARNING_BUDGETS.toml`를 비워 active structure warning을 0건으로 정리
- `ARCH-216` Auth provider port split: `Api\\Auth\\Contracts\\Auth{Identity,Registration,Session,Recovery}Gateway`를 추가하고 `AuthAvailability/AuthRegistration/AuthSession/AuthRecovery`와 external auth transition/linkage 흐름이 더 좁은 local 포트를 바라보게 정리했으며, `AuthRepository`/definitions/계약 테스트/SSOT 문서도 새 provider-domain 경계 기준으로 갱신
- `ARCH-217` Auth shared surface split 1차: `Api\\Integration\\Contracts\\Auth{Identity,Session,Recovery}Gateway`를 추가하고 `MemberService`, `MemberProfileUpdateService`, `Jwt/OptionalJwt` middleware가 broad shared `AuthGateway` 대신 더 좁은 shared 포트를 바라보게 정리했으며, `AuthRepository`/definitions/계약 테스트/SSOT 문서도 새 shared 호환면 기준으로 갱신
- `ARCH-213` Point provider port split: `Api\\Point\\Contracts\\Point{Query,Reward,Maintenance}Gateway`를 추가하고 `PointService`는 query 포트만 바라보게 정리했으며, `PointRepository`/definitions/계약 테스트를 갱신해 Point 도메인 내부의 read-reward-maintenance 경계를 고정
- `ARCH-211` shared gateway slim phase 2: `Auth`와 `Post` 도메인에 각각 `Api\\Auth\\Contracts\\AuthGateway`, `Api\\Post\\Contracts\\PostGateway`를 도입해 provider domain 내부의 진실 원본을 local contract로 옮기고, deprecated `Api\\Integration\\Contracts\\{Auth,Post}Gateway`는 definitions/repository와 cross-domain/plugin 소비면만 허용되도록 계약 테스트 allowlist를 축소
- `ARCH-210` shared gateway slim phase 1: `Point` 도메인에 `Api\\Point\\Contracts\\PointGateway`를 도입해 provider domain 내부의 진실 원본을 local contract로 옮기고, deprecated `Api\\Integration\\Contracts\\PointGateway`는 definitions/repository와 cross-domain/plugin 소비면만 허용되도록 계약 테스트 allowlist를 축소
- `ARCH-207` SMS legacy iCode bootstrap/global 경계 최종 축소: `LegacyIcodeEnvironmentBootstrapper`가 legacy lib에 필요한 `cf_icode_token_key`만 patch하도록 줄이고 non-token 경로에서는 `$GLOBALS['config']`를 만들지 않게 정리했으며, helper include를 client 생성 시점으로 옮기고 legacy client init이 만든 임시 global도 factory에서 정리하도록 회귀 테스트를 보강
- `ARCH-208` truly shared gateway inventory 고정: `Auth/Board/Member/Point/Post`의 소비 도메인, plugin 노출, 다음 slim 후보를 `docs/architecture/SHARED_GATEWAY_INVENTORY.md`에 기록하고 계약 테스트 allowlist로 새 cross-domain usage를 차단
- `ARCH-209` SMS legacy bootstrap scope restore: `LegacyIcodeEnvironmentBootstrapper`가 `$GLOBALS['config']` snapshot/restore를 지원하고 `LegacyIcodeClientFactory`가 전송 스코프 안에서만 legacy client를 bootstrap하도록 정리해 SMS 전송 후 global config 오염이 남지 않게 고정
- `DOC-117` 구조 정상화 기준으로 `README`, `IMPLEMENTATION_ROADMAP`, `TODO`, `AUDIT_STRATEGY`를 현행화해 현재 문서 상태와 다음 구조 우선순위를 SSOT에 반영
- `ARCH-206` local-only gateway 호환 namespace 재유입 방지: `Comment/File/Like/Memo/Menu/Qa`는 로컬 `Contracts/*Gateway`를 기준으로 내부 사용처를 정리하고, 계약 테스트에 deprecated `Integration\Contracts` allowlist guard를 추가
- `ARCH-205` DB 연결 팩토리 env 해석 수렴: `PdoConnectionFactory`도 `EnvValueReader`를 재사용하도록 정리해 direct `$_ENV/getenv` 접근을 intentional boundary로 더 축소
- `DOC-116` Codex 앱용 PHP 래퍼 추가: `php/AGENTS.md`와 `composer run audit:standard|deep|field-parity` 진입점을 도입해 Codex가 문서 묶음 대신 고정 래퍼와 실행 스크립트로 감사 루프를 따르도록 정리
- `DOC-115` 감사 워크플로우 슬림화: `.agent/workflows`를 표준 감사(`/audit`), 심층 감사(`/deep-audit`), 관리자 필드 정합성 감사(`/field-parity-audit`) 3축으로 재정렬하고 stale `api-coverage-audit.md` 제거
- `QG-203` PHP 8.5 deprecation 없는 전체 테스트 상태 복구: reflection 접근 보조와 GD image cleanup 테스트/서비스 코드를 정리해 `./vendor/bin/phpunit --display-deprecations` 기준 deprecation 0건으로 복구
- `ARCH-204` runtime/env와 legacy config fallback 접근을 config/provider로 격리: `ADMIN_SMS_ENABLED`, `G5_INDEPENDENT`, JWT 설정은 `EnvConfig`에서 읽고, `$GLOBALS['config']` fallback은 `LegacyConfigProvider`로 한정
- `ARCH-203` local port를 도메인 Contracts로 승격: `Comment/File/Like/Memo/Menu/Qa`는 각 도메인 `Contracts`를 기준으로 서비스가 의존하도록 전환하고, `Integration/Contracts`는 deprecated alias 호환층으로 축소
- `ARCH-202` `api/container.php`를 도메인 definitions 수집기로 축소: `api/v1/*/definitions.php`에서 코어/Auth/게이트웨이 바인딩을 분산 정의하고, 메인 container는 context 주입과 정의 수집만 담당하도록 정리
- `ARCH-201` `/api/routes/v1` 라우팅 진입점을 resolve 기반 모듈 구조로 분해: `v1.php`, `v1/admin.php`는 조립기만 남기고 공개/관리자 라우트를 도메인별 파일로 분리했으며, `scripts/docs-check.sh` route collector도 재귀 모듈 구조를 인식하도록 보강
- `DOC-114` AI 기본 검색 경계를 SSOT 중심으로 고정: `.agentignore`/`.cursorignore`에 `docs/archive/**`, `docs/codex/**`, stale `docs/audits/**`, generated artifact를 기본 제외로 추가하고 문서 거버넌스에 같은 규칙을 반영
- `STYLE-103` `php-cs-fixer` 전량 정리 완료: `.php-cs-fixer.dist.php` 범위(`api/`, `tests/`, `scripts/`)에서 dry-run 잔여 후보를 `108 -> 0 files`로 제거
- `AUD-202` 스크랩 카운트 강정합 보강: `PostScrapMutationRepository` 내부에서 `add/remove + mb_scrap_cnt sync`를 같은 member lock과 같은 트랜잭션으로 묶어 서비스 계층 2단계 업데이트를 제거
- `STYLE-102` `php-cs-fixer` 1차 소배치 적용: `Core/Error`, `Layout` 도메인 4개 파일 자동 포맷을 적용하고 dry-run 후보를 `111 -> 108 files`로 감소
- `DOC-001` 문서 관리 SSOT 체계 도입 기준 확정
- `DOC-002` 로드맵 SSOT와 작업 상태 SSOT 경로 확정
- `DOC-003` 문서 분류 레지스트리, 검색 인덱스, 감사 보관 프로세서 도입 착수
- `DOC-101` `docs/API_SPEC.md`의 역할을 OpenAPI 보조 문서로 정정하고 잘못된 문서 운영 전제를 제거
- `DOC-102` `docs/API_SPEC.md`의 DDL 레퍼런스를 실제 `docs/ddls/*.md` 집합에 맞게 전수 보강
- `DOC-103` `api/docs/openapi.yaml`에 누락된 공개 경로 29건을 반영하고 legacy alias는 `deprecated: true`로 문서화
- `DOC-104` `GET /setup`의 공개 운영 정책을 확정하고 문서화
- `DOC-105` 감사 파일명 위반 2건과 `AUDIT_LATEST.md` 동기화 문제를 정리
- `ADM-101` `admin.menu100.php` 대상 중 광고 링크/웹 전용/내부 실행 항목을 범위 밖으로 정리하고 API 이관 가능한 운영 기능을 마감
- `ADM-201` `admin.menu200.php` 메일 도메인을 레거시 템플릿/미리보기/마지막 발송 옵션 흐름까지 맞춰 정합화
- `ADM-301` `admin.menu300.php` 기준 FAQ Master CRUD와 FAQ 마스터 이미지 관리까지 코드/계약/테스트로 이행
- `ADM-901` `admin.menu900.php` SMS 관리자 도메인을 설정/템플릿/주소록/발송이력 API와 계약·DDL 문서까지 포함해 이행
- `AUTH-201` `G5_ENCRYPT_FUNC=create_hash` 환경에서 `password_hash()` 계열 저장을 금지하고, 비밀번호 해시 호환성 감사 스크립트/테스트를 추가
- `AUTH-302` Auth/Member 레거시 핵심 정합성 보수(`mb_open` 보호, 본인확인 필드 공개 쓰기 차단, `mb_mailling`/`mb_sms`/주소 필드 복원, 공개 이메일 재인증 요청 추가)
- `AUTH-303` Auth/Member 잔여 P2 범위 확정: availability 엔드포인트(`member-id`, `nick`, `email`, `phone`, `recommender`)는 공개 API 범위로 승격해 구현 완료, CAPTCHA는 baseline rate limit 유지 후 provider 토큰 검증이 준비되면 `AUTH-304/305` adapter 범위로만 도입, 본인인증 기반 비밀번호 재설정과 소셜 로그인은 external auth foundation 후속 범위로 고정
- `AUTH-304` 본인인증/소셜로그인 공급자 sandbox 정책 수집 완료: 공개 공식 문서 기준으로 `Google`, `Kakao`, `Naver`, `KG이니시스`, `NHN KCP`, `KCB`의 test/sandbox 접근성과 제약을 `docs/testing/EXTERNAL_PROVIDER_SANDBOX_MATRIX.md`에 고정하고, fake provider/callback replay를 CI canonical로 유지한 채 실제 adapter 착수 후보를 공개 자료 접근성 기준으로 재정렬
- `AUTH-305` 외부 인증 foundation 위에 실제 provider 1종(`google`) 연결 완료: `G5Config`/환경변수 기반 client id·secret를 읽는 `GoogleExternalAuthProviderAdapter`, native HTTP client, container wiring, OpenAPI callback method(`GET|POST`) 보강, provider/service 테스트를 추가하고 실제 공급자는 설정된 경우에만 `/auth/external/providers`에 노출되도록 정리
- `AUTH-304A` 외부 인증 foundation 경계(`/auth/external/providers|start|complete`), signed `request_token`, dev fake provider, replay 시나리오 기반 완료 검증 구조 도입
- `AUTH-304B` 외부 인증 결과에 `linkage/link_token`을 추가하고 내부 링크 테이블 `api_external_auth_link` 및 현재 회원 연결 조회/등록/해제 경계 도입
- `AUTH-306` 외부 인증 연결 관리 위에 실제 로그인/가입 전환 정책(`/sessions`, `/claims`, `/registrations`)과 `available_actions/transition_token` 계약 확정
- `AUTH-307` 실제 provider 연결 기준 `transition_token` TTL/재사용 정책과 공급자별 staging smoke 체크리스트 문서화 완료: 현재 정책은 `AUTH_EXTERNAL_REQUEST_TTL_SECONDS`(기본 600초)와 동일한 stateless HMAC 토큰이며, 서버는 만료 전 재사용을 허용하지만 클라이언트는 terminal action 이후 즉시 폐기하고 재발급 받는 것을 canonical로 고정
- `ADM-302` 레거시 `adm/index.php` 대체용 관리자 대시보드 요약 엔드포인트 구현 완료: `/admin/dashboard` 경계로 신규 회원/최근 게시물/최근 포인트/방문 요약을 단일 응답으로 묶고, 레거시 관리자 메인의 실질 운영 요약을 REST 계약으로 노출
- `AUTH-309` 두 번째 실제 provider(`kakao`)를 foundation에 연결하고 운영 문서를 확장 완료: `cf_kakao_rest_key`/`cf_kakao_client_secret` 또는 env override를 읽는 `KakaoExternalAuthProviderAdapter`, registry/container wiring, provider/service 테스트를 추가하고 Kakao Login 기준 redirect/code/userinfo 수동 smoke 체크리스트를 문서에 반영
- `ADM-303` 스테이징 SMS 관리자 운영 방침 확정: `ADMIN_SMS_ENABLED` 런타임 토글을 도입해 스테이징 canonical을 `g5_sms5_*` 테이블 미설치 시 `404 비노출`로 고정하고, 테이블 설치/icode 준비 전까지 클라이언트가 SMS 관리자 경로를 탐색하지 않도록 정리
- `AUD-201` 포인트/추천/스크랩/다운로드 포인트 경합 구간의 락 보강 범위를 재감사하고 테스트 전략 정리: `docs/audits/POINT_CONCURRENCY_AUDIT_2026-03-10.md`로 현재 잠금 전략을 고정하고, 실제 우선 보강 대상이었던 `LikeRepository` insert/update 원자성 부족을 트랜잭션으로 수정했으며 `LikeRepository`, `FilePointRepository` 회귀 테스트를 추가
- `STYLE-101` `php-cs-fixer --dry-run --diff` 적용 범위 확정: 저장소 루트 `.php-cs-fixer.dist.php`를 추가해 적용 범위를 `api/`, `tests/`, `scripts/` PHP 파일로 제한하고, 스타일 정리 대상이 레거시 `adm/` 전체가 아니라 REST API 프로젝트 코드라는 기준을 고정
- `QG-202` 저커버리지 서비스 테스트를 확장해 `./scripts/run_quality_gates.sh` 기준 service coverage를 `59.88% -> 80.17%`로 복구하고, 품질 게이트 전체를 다시 통과 가능한 상태로 복원
- `OBS-102` PHP-Rust 교차 디버깅용 응답 trace/책임 귀속 구조 정비 (`request_id`, `correlation_id`, `server_request_id`, `owner`, `fault_domain`, `retryable`, `user_actionable` 응답/로그 일관화)
- `OBS-101` Rust 관리자 클라이언트와 함께 `request_id/correlation_id/server_request_id/owner/fault_domain` 실서버 계약의 authenticated success path(`/auth/login -> /members/me`) 최종 재검증 완료: stale `.tmp_schemathesis_auth.env`가 가리키던 누락 회원을 staging smoke 계정으로 복구한 뒤, 2026-03-10 실서버에서 `/health`, `/admin/members` 401, `/auth/login` 401, `/auth/login -> /members/me` 200 경로까지 trace 일관성을 재확인
- `AUTH-301` 스테이징 `g5_member` 비밀번호 해시 호환성 drift 재감사 완료: 원격 `check_password_hash_compat.php --json` 기준 `encrypt_func=create_hash`, `total=1`, `incompatible_count=0` 확인으로 기존 bcrypt 19건 운영 blocker 종료
- `DOC-113` 외부 공급자(본인인증/소셜로그인) 테스트 리뷰 문서와 공급자 문의 체크리스트 작성
- `OPS-201` 배포 보안 프리플라이트(`composer audit`, `.env` 외부 경로 지원, 민감 파일 HTTP 차단, `/setup` 잠금 점검) 고정
- `QG-101` Xdebug 기반 실제 커버리지 수집 경로 복구와 Service 커버리지 기준선 재측정 완료 (`55.16% -> 62.13%`)
- `QG-201` 저커버리지 서비스 테스트를 확장해 Service 커버리지를 `62.13% -> 80.77%`로 끌어올리고 CI 게이트를 `80%`로 복구
