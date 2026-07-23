# 관리자 도메인 구현 진행도 감사 — 2026-03-06

## 1. 범위

- 레거시 기준: `adm/` 전체를 전수 확인하되 `adm/shop_admin/`은 제외
- 포함 범위: `adm/*.php`, `adm/sms_admin/*.php`, `adm/admin.menu{100,200,300,900}.php`
- 현재 구현 기준: `api/routes/v1/admin.php`, `api/v1/Admin/**`, `api/docs/openapi.yaml`, `tests/Admin/**`
- 제외 범위: 영카트 쇼핑몰 관리자(`adm/shop_admin/**`)

## 2. 방법

1. 레거시 관리자 폴더를 실제 파일 기준으로 스캔
2. 메뉴 파일 기준으로 “사용자에게 보이는 관리자 기능”을 추출
3. `api/v1/Admin`와 `api/routes/v1/admin.php`를 대조
4. 단순 파일 수가 아니라 기능 단위로 `완료 / 부분 / 미구현` 판정

## 3. 인벤토리

### 3.1 레거시 관리자 표면

- `adm/*.php`: `114`개
- `adm/sms_admin/*.php`: `41`개
- 쇼핑몰 제외 후 레거시 관리자 PHP 총량: `155`개
- 메뉴 파일 기준 고유 기능 진입점: `42`개

메뉴 기준 고유 진입점은 다음과 같습니다.

- 커뮤니티/운영 핵심: `config_form.php`, `auth_list.php`, `theme.php`, `menu_list.php`, `sendmail_test.php`, `newwinlist.php`, `member_list.php`, `member_list_exel.php`, `mail_list.php`, `visit_list.php`, `visit_search.php`, `visit_delete.php`, `point_list.php`, `poll_list.php`, `board_list.php`, `boardgroup_list.php`, `popular_list.php`, `popular_rank.php`, `qa_config.php`, `contentlist.php`, `faqmasterlist.php`, `write_count.php`
- 운영/유지보수 유틸: `session_file_delete.php`, `cache_file_delete.php`, `captcha_file_delete.php`, `thumbnail_file_delete.php`, `member_list_file_delete.php`, `phpinfo.php`, `browscap.php`, `browscap_convert.php`
- 별도 처리 항목: `dbupgrade.php`, `service.php`
- SMS 관리자: `config.php`, `member_update.php`, `sms_write.php`, `history_list.php`, `history_num.php`, `form_group.php`, `form_list.php`, `num_group.php`, `num_book.php`, `num_book_file.php`

### 3.2 현재 API 관리자 표면

- `api/v1/Admin/*` 서브도메인: `21`개 (`Common` 포함)
- `api/routes/v1/admin.php` 관리자 라우트 메서드: `181`개

현재 API 관리자 서브도메인:

- `Auth`, `Board`, `Config`, `Content`, `Faq`, `Group`, `Layout`, `Mail`, `Member`, `Menu`, `Point`, `Poll`, `Popular`, `Popup`, `Push`, `Report`, `Sms`, `System`, `Visit`, `WriteCount`

## 4. 진행도 판정

### 4.1 핵심 커뮤니티 관리자 기능

레거시 메뉴 기준 핵심 커뮤니티/운영 기능 `22`개 중:

- `완료`: `22`
- `부분`: `0`
- `미구현`: `0`

즉, **핵심 커뮤니티 관리자 기능 이행률은 높음**입니다.

### 4.2 레거시 관리자 전체 표면

쇼핑몰 제외, SMS 포함, 광고/웹전용/내부실행 항목을 제외한 API 이관 대상 메뉴 기능 `40`개 중:

- `완료`: `40`
- `부분`: `0`
- `미구현`: `0`

가중치 기준(`완료=1`, `부분=0.5`) 구현률은 `100.0%`입니다.

즉, **API 이관 대상으로 합의된 레거시 메뉴 범위는 모두 이행 완료**입니다.

## 5. 도메인별 판정

### 5.1 완료

아래는 레거시 실기능이 현재 Admin API에 실질적으로 올라온 항목입니다.

| 레거시 기능 | 레거시 근거 | 현재 API 근거 | 판정 |
|---|---|---|---|
| 환경설정 | `adm/config_form.php` | `GET/PUT /admin/config` | 완료 |
| 관리권한설정 | `adm/auth_list.php` | `/admin/auth*`, `/admin/system/auths*` | 완료 |
| 메뉴설정 | `adm/menu_list.php` | `/admin/menus*` | 완료 |
| 메일 테스트/회원 메일 | `adm/sendmail_test.php`, `adm/mail_list.php`, `adm/mail_form.php`, `adm/mail_preview.php`, `adm/mail_select_form.php` | `/admin/mails*`, `/admin/mail-tests`, `/admin/system/mails*` | 완료 |
| 팝업레이어관리 | `adm/newwinlist.php` | `/admin/popups*`, `/admin/system/popups*` | 완료 |
| `phpinfo()` | `adm/phpinfo.php` | `GET /admin/system/phpinfo` | 완료 |
| 세션파일 일괄삭제 | `adm/session_file_delete.php` | `POST /admin/system/maintenance/session-files/purge` | 완료 |
| 캐시파일 일괄삭제 | `adm/cache_file_delete.php` | `POST /admin/system/maintenance/cache-files/purge` | 완료 |
| 캡챠파일 일괄삭제 | `adm/captcha_file_delete.php` | `POST /admin/system/maintenance/captcha-files/purge` | 완료 |
| 썸네일파일 일괄삭제 | `adm/thumbnail_file_delete.php` | `POST /admin/system/maintenance/thumbnail-files/purge` | 완료 |
| 회원관리파일 일괄삭제 | `adm/member_list_file_delete.php` | `POST /admin/system/maintenance/member-list-files/purge` | 완료 |
| Browscap 업데이트 | `adm/browscap.php`, `adm/browscap_update.php` | `GET /admin/system/browscap`, `POST /admin/system/browscap/update` | 완료 |
| 접속로그 변환 | `adm/browscap_convert.php`, `adm/browscap_converter.php` | `POST /admin/system/browscap/convert` | 완료 |
| 회원관리 | `adm/member_list.php`, `adm/member_form.php`, `adm/member_delete.php` | `/admin/members*` | 완료 |
| 회원 엑셀 | `adm/member_list_exel.php` | `GET /admin/members/excel` | 완료 |
| 접속자 통계/검색/삭제 | `adm/visit_list.php`, `adm/visit_search.php`, `adm/visit_delete.php` | `/admin/visits/stats`, `/admin/visits/search`, `DELETE /admin/visits` | 완료 |
| 포인트관리 | `adm/point_list.php`, `adm/point_update.php` | `/admin/points*` | 완료 |
| 투표관리 | `adm/poll_list.php`, `adm/poll_form.php` | `/admin/polls*`, `/admin/system/polls*` | 완료 |
| 게시판관리 | `adm/board_list.php`, `adm/board_form.php`, `adm/board_copy.php` | `/admin/boards*` | 완료 |
| 게시판그룹/그룹회원 | `adm/boardgroup_list.php`, `adm/boardgroupmember_list.php` | `/admin/groups*`, `/admin/board-groups*` | 완료 |
| 인기검색어 | `adm/popular_list.php`, `adm/popular_rank.php` | `/admin/popular`, `/admin/popular/rank` | 완료 |
| 1:1문의 설정 | `adm/qa_config.php` | `GET/PUT /admin/system/qa-config` | 완료 |
| 내용관리 | `adm/contentlist.php`, `adm/contentform.php` | `/admin/contents*` | 완료 |
| FAQ관리 | `adm/faqmasterlist.php`, `adm/faqmasterform.php`, `adm/faqlist.php`, `adm/faqform.php` | `/admin/faq-masters*`, `/admin/faqs*` | 완료 |
| SMS 관리자 | `adm/sms_admin/config.php`, `member_update.php`, `sms_write.php`, `history_list.php`, `history_num.php`, `form_group.php`, `form_list.php`, `num_group.php`, `num_book.php`, `num_book_file.php` | `/admin/sms/config`, `/admin/sms/member-sync`, `/admin/sms/template-groups*`, `/admin/sms/templates*`, `/admin/sms/contact-groups*`, `/admin/sms/contacts*`, `/admin/sms/history/*`, `/admin/sms/messages` | 완료 |
| 글/댓글 현황 | `adm/write_count.php` | `GET /admin/write-count/stats` | 완료 |

### 5.2 범위 외/별도 처리

| 항목 | 레거시 근거 | 처리 방침 | 근거 |
|---|---|---|---|
| 부가서비스 | `adm/service.php` | API 이관 대상 제외 | 외부 광고/홍보 링크 모음이라 제품 기능 계약으로 유지할 이유가 없음 |
| 테마 미리보기 | `adm/theme_preview.php` | 웹 전용으로 유지 | 실제 프런트 렌더링 결과를 확인하는 화면이라 JSON API보다 웹 실행이 적절 |
| DB 업그레이드 | `adm/dbupgrade.php` | 웹/CLI 내부 실행기로 유지 | 다단계 스키마 변경 실행기라 공개 REST 계약보다 운영 전용 실행 흐름이 적절 |

### 5.3 미구현

#### 관리자 메인 대시보드

- 레거시 `adm/index.php`는 신규 회원, 최근 게시물, 최근 포인트 등을 묶어 보여주는 관리자 메인입니다.
- 현재 API에는 이를 대체하는 **단일 대시보드 엔드포인트가 없습니다**.
- 일부 데이터는 `/admin/points/summary`, `/admin/visits/stats`, `/admin/write-count/stats`로 분산 조회할 수 있으나, 레거시 대시보드와 동등하다고 보긴 어렵습니다.

## 6. 현재 API가 레거시보다 앞선 부분

다음 도메인은 레거시 `adm` 핵심 메뉴 기준으로는 없거나 약했던 영역인데, 현재 API에는 별도 Admin 도메인으로 존재합니다.

- `Layout`: `/admin/layouts*`
- `Report`: `/admin/reports*`
- `Push`: `/admin/push/messages`

즉, 현재 Admin API는 **레거시 단순 복제**가 아니라 일부 영역은 이미 **확장 구현** 상태입니다.

## 7. 테스트/검증 성숙도

### 7.1 단위 테스트

현재 전용 관리자 테스트는 다음 정도입니다.

- `tests/Admin/Auth/AdminAuthServiceTest.php`
- `tests/Admin/Group/AdminGroupServiceTest.php`
- `tests/Admin/Mail/AdminMailServiceTest.php`
- `tests/Admin/Member/AdminMemberServiceTest.php`
- `tests/Admin/Poll/AdminPollServiceTest.php`
- `tests/Admin/Popup/AdminPopupServiceTest.php`
- `tests/Admin/Sms/AdminSmsServiceTest.php`
- `tests/Admin/System/AdminSystemThemeServiceTest.php`
- `tests/Admin/System/AdminSystemMaintenanceServiceTest.php`
- 공통 검증: `AdminValidationServiceTest.php`, `AdminBaseRepositoryTest.php`

의미:

- `Board`, `Config`, `Content`, `Faq`, `Menu`, `Point`, `Popular`, `Visit`, `Layout`, `Report`, `Push`, `WriteCount`는 전용 테스트가 상대적으로 약합니다.

### 7.2 런타임 검증

- 최신 관리자 전수 런타임 감사는 [ADMIN_ENDPOINT_EXHAUSTIVE_AUDIT_2026-03-06.md](./ADMIN_ENDPOINT_EXHAUSTIVE_AUDIT_2026-03-06.md)를 기준으로 봅니다.
- 최신 스테이징 `GET /admin/**` 전수 결과는 `200 50 / 404 3 / 503 12 / 500 0`입니다.
- 즉 **관리자 GET 기준 500은 제거됐지만**, 스테이징에서는 `g5_sms5_*` 확장 테이블이 없어 SMS 관리자 기능이 `503 Service Unavailable` 상태입니다.
- 따라서 현재 평가는 “구현은 완료, 스테이징 운영 가능성은 SMS 스키마 설치 여부에 따라 부분 제한”이 맞습니다.

## 8. 최종 평가

### 8.1 한 줄 평가

**메뉴 기반 관리자 기능은 `menu100`, `menu200`, `menu300`, `menu900`까지 모두 올라왔고, 남은 실질 갭은 비메뉴성 관리자 대시보드 1건입니다.**

### 8.2 해석

- **핵심 관리자 CRUD/운영 관점**: 거의 완료
  - 환경설정, 권한, 게시판, 그룹, 회원, 포인트, 투표, 팝업, 메일, 접속통계, 인기검색어, 내용관리, QA 설정, 글통계는 실질적으로 API화됨
- **레거시 `adm` 전체 대체 관점**: 거의 완료
  - 메뉴 기반 기능은 닫혔고, 비메뉴성 관리자 대시보드만 남아 있음
- **보안/운영 관점 해석 주의**
  - `dbupgrade`와 `theme_preview`는 무조건 API로 내는 것이 정답은 아님
  - `service.php`는 구현 대상이 아니라 명시적 비대상 처리 항목임

## 9. 권고 우선순위

1. **남은 관리자 표면 먼저 이관**
   - `Admin Dashboard Summary`

2. **범위 외 항목은 구현 과제가 아니라 정책으로 관리**
   - `dbupgrade`는 API 직노출보다 CLI 또는 내부 전용 운영도구가 더 적절합니다.
   - `theme_preview`는 웹 렌더링 경로로 유지하고 API 이관 과제에서 제외합니다.

3. **SMS는 별도 관리자 도메인으로 유지**
   - `adm/sms_admin` 이관은 완료했지만, `Push`와 섞지 않고 별도 계약/테스트 축으로 계속 유지해야 합니다.

## 10. 결론

- **커뮤니티 관리자 핵심 기능 기준**: `22 완료 + 0 부분 + 0 미구현`
- **API 이관 대상 관리자 기능 기준**: `40 완료 + 0 부분 + 0 미구현`
- 따라서 현재 상태는:
  - **“핵심 관리자 API는 거의 다 됐다”는 평가는 맞음**
  - **“메뉴 기반 관리자 API는 모두 정리됐고, 다음은 비메뉴 대시보드”라는 평가는 정확함**
