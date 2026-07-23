# 🤖 Codex 관리자(Admin) 도메인 보강 + 신규 구현 프롬프트

---

## 🎭 페르소나

```
너는 "IRONDEV"다.
Admin 도메인은 16개 서브도메인 중 4개가 미구현(Mail, Poll, Popup, Auth), 2개가 부분구현(Config, Visit)이다.
기존 Admin/{Domain}/ 구조(Controller/Service/Repository)를 그대로 따른다.
PHPStan level 6. PHPUnit 필수. 보고는 한글, 코드는 영어.
쇼핑몰은 기본 제외(헌법 §9-1). 영카트 쇼핑몰 관리자단(`adm/shop_admin/`)은 예외로 레거시 API 포팅 및 정합성 감사 범위에 포함됩니다. (헌법 §9-2)
```

---

## 📋 필수 참조 파일

```
.agent/Constitution.md
api/v1/Admin/Board/Service/AdminBoardService.php   ← Admin CRUD 패턴 참고
api/v1/Admin/Board/Repository/AdminBoardRepository.php
api/v1/Admin/Board/Controller/AdminBoardController.php
api/routes.php
```

### G5 원본
```
adm/mail_*.php              ← 메일발송 9파일 692줄
adm/poll_*.php              ← 투표관리 4파일 425줄
adm/newwin*.php             ← 팝업관리 3파일 371줄
adm/auth_*.php              ← 관리자 권한 3파일 ~150줄
adm/config_form.php         ← 환경설정 1854줄
adm/visit_*.php             ← 접속통계 13파일 1352줄
```

---

## 🔥 Phase 1 (P0): 신규 구현 4개 서브도메인

### WS-A1: 관리자 권한 관리 (Admin Auth)
> G5: `auth_list.php`, `auth_update.php`, `auth_list_delete.php`
> DB: `g5_auth` — `mb_id` VARCHAR(20) PK, `au_menu` VARCHAR(50) PK, `au_auth` SET('r','w','d')

**파일 구조 [전부 NEW]:**
```
[NEW] api/v1/Admin/Auth/Controller/AdminAuthController.php
[NEW] api/v1/Admin/Auth/Service/AdminAuthService.php
[NEW] api/v1/Admin/Auth/Repository/AdminAuthRepository.php
[MODIFY] api/routes.php
```

**엔드포인트:**
| Method | Path | 설명 |
|--------|------|------|
| `GET` | `/v1/admin/auth` | 관리자 권한 목록 (그룹별) |
| `PUT` | `/v1/admin/auth/{mb_id}` | 권한 설정/변경 |
| `DELETE` | `/v1/admin/auth/{mb_id}` | 권한 삭제 (전체 메뉴) |

**비즈니스 규칙:**
1. 최고관리자만 접근
2. `au_menu`: 관리자 메뉴 코드 (100xxx, 200xxx, 300xxx 등)
3. `au_auth`: SET('r','w','d') — 읽기/쓰기/삭제 조합
4. 메뉴별 개별 권한 설정 가능
5. 자기 자신의 권한 삭제 불가

---

### WS-A2: 투표(Poll) 관리
> G5: `poll_list.php`(163줄), `poll_form.php`(131줄), `poll_form_update.php`(104줄), `poll_delete.php`(27줄)
> DB: `g5_poll` — 27 컬럼 (po_id PK, po_subject, po_poll1~9, po_cnt1~9, po_etc, po_level, po_point, po_date, po_ips, mb_ids, po_use)
> DB: `g5_poll_etc` — 기타 의견 테이블

**파일 구조 [전부 NEW]:**
```
[NEW] api/v1/Admin/Poll/Controller/AdminPollController.php
[NEW] api/v1/Admin/Poll/Service/AdminPollService.php
[NEW] api/v1/Admin/Poll/Repository/AdminPollRepository.php
[MODIFY] api/routes.php
```

**엔드포인트:**
| Method | Path | 설명 |
|--------|------|------|
| `GET` | `/v1/admin/polls` | 투표 목록 |
| `GET` | `/v1/admin/polls/{po_id}` | 투표 상세 (결과 포함) |
| `POST` | `/v1/admin/polls` | 투표 생성 |
| `PATCH` | `/v1/admin/polls/{po_id}` | 투표 수정 |
| `DELETE` | `/v1/admin/polls/{po_id}` | 투표 삭제 |

**사용자 엔드포인트 (비관리자):**
| Method | Path | 설명 |
|--------|------|------|
| `GET` | `/v1/polls/active` | 현재 활성 투표 |
| `POST` | `/v1/polls/{po_id}/vote` | 투표 참여 |
| `GET` | `/v1/polls/{po_id}/result` | 결과 조회 |

**비즈니스 규칙:**
1. 항목 최대 9개 (po_poll1~9)
2. **중복 투표 방지**: `po_ips`(IP 목록) + `mb_ids`(회원ID 목록) 체크
3. 투표 참여 레벨: `po_level` (회원 레벨 이상만)
4. 투표 시 포인트 지급: `po_point`
5. `po_use`: 0=사용안함, 1=사용
6. 기타 의견: `g5_poll_etc` 테이블에 별도 저장

---

### WS-A3: 팝업(Popup) 관리
> G5: `newwinlist.php`(121줄), `newwinform.php`(172줄), `newwinformupdate.php`(78줄)
> DB: `g5_new_win` — 13 컬럼 (nw_id PK, nw_division, nw_device, nw_begin_time, nw_end_time, nw_disable_hours, nw_left, nw_top, nw_height, nw_width, nw_subject, nw_content, nw_content_html)

**파일 구조 [전부 NEW]:**
```
[NEW] api/v1/Admin/Popup/Controller/AdminPopupController.php
[NEW] api/v1/Admin/Popup/Service/AdminPopupService.php
[NEW] api/v1/Admin/Popup/Repository/AdminPopupRepository.php
[MODIFY] api/routes.php
```

**엔드포인트:**
| Method | Path | 설명 |
|--------|------|------|
| `GET` | `/v1/admin/popups` | 팝업 목록 |
| `GET` | `/v1/admin/popups/{nw_id}` | 팝업 상세 |
| `POST` | `/v1/admin/popups` | 팝업 생성 |
| `PATCH` | `/v1/admin/popups/{nw_id}` | 팝업 수정 |
| `DELETE` | `/v1/admin/popups/{nw_id}` | 팝업 삭제 |

**사용자 엔드포인트:**
| Method | Path | 설명 |
|--------|------|------|
| `GET` | `/v1/popups/active` | 현재 활성 팝업 목록 (기간+디바이스 필터) |

**비즈니스 규칙:**
1. `nw_division`: `both`/`layer`/`new` (레이어/새창)
2. `nw_device`: `both`/`pc`/`mobile`
3. **기간 표시**: `nw_begin_time` ~ `nw_end_time` 범위 내만 활성
4. `nw_disable_hours`: N시간 동안 다시 보지 않기 (클라이언트 처리, API는 값만 전달)
5. 좌표/크기: `nw_left`, `nw_top`, `nw_width`, `nw_height`
6. HTML 사용: `nw_content_html`

---

### WS-A4: 메일 발송 관리
> G5: 9파일 692줄
> DB: `g5_mail` — 6 컬럼 (ma_id PK, ma_subject, ma_content mediumtext, ma_time, ma_ip, ma_last_option text)

**파일 구조 [전부 NEW]:**
```
[NEW] api/v1/Admin/Mail/Controller/AdminMailController.php
[NEW] api/v1/Admin/Mail/Service/AdminMailService.php
[NEW] api/v1/Admin/Mail/Repository/AdminMailRepository.php
[MODIFY] api/routes.php
```

**엔드포인트:**
| Method | Path | 설명 |
|--------|------|------|
| `GET` | `/v1/admin/mails` | 발송 이력 목록 |
| `GET` | `/v1/admin/mails/{ma_id}` | 발송 상세 |
| `POST` | `/v1/admin/mails` | 메일 발송 |
| `DELETE` | `/v1/admin/mails/{ma_id}` | 이력 삭제 |
| `POST` | `/v1/admin/mails/test` | 테스트 발송 |
| `GET` | `/v1/admin/mails/recipients` | 수신자 필터 (레벨/그룹별 회원 목록) |

**비즈니스 규칙:**
1. 최고관리자만 사용
2. **수신자 선택**: 전체/레벨별/그룹별/개별 회원
3. `ma_last_option`: JSON — 마지막 발송 옵션 저장 (재발송용)
4. 대량 발송 시 배치 처리 고려
5. `mailer()` 함수 → PHPMailer 또는 설정된 SMTP 사용
6. 발송 이력 자동 기록 (ma_time, ma_ip)

---

## 🔧 Phase 2 (P1): 기존 서브도메인 보강

### WS-B1: Config (환경설정) 보강
> G5: `config_form.php` **1854줄** → 현재 API 3 메서드
> DB: `g5_config` — 100+ 컬럼

**확인 필요:**
```bash
grep -c 'public function' api/v1/Admin/Config/Service/AdminConfigService.php
grep -c 'cf_' api/v1/Admin/Config/Repository/AdminConfigRepository.php
```

**보강 항목:**
- 현재 3메서드가 전체 config를 GET/UPDATE/RESET으로 커버하는지 확인
- 누락된 설정 그룹이 있으면 추가 (메일/SMS/소셜로그인/포인트/회원가입 등)
- config값 변경 시 validation 규칙 확인

### WS-B2: Visit (접속통계) 보강
> G5: 13파일 1352줄 — 10종 통계 (date/hour/week/month/year/browser/os/device/domain/search)
> 현재 API 4 메서드

**확인 필요:**
```bash
grep 'public function' api/v1/Admin/Visit/Service/AdminVisitService.php
```

**보강 항목:**
- 10종 통계 중 API가 커버하는 범위 확인
- 누락 통계 타입별 엔드포인트 추가:
  - `GET /v1/admin/visits/stats?type=date&from=&to=`
  - `GET /v1/admin/visits/stats?type=browser`
  - `GET /v1/admin/visits/stats?type=os`
  - `GET /v1/admin/visits/stats?type=device`
  - `GET /v1/admin/visits/stats?type=domain`
  - `GET /v1/admin/visits/stats?type=search`
- 통계 삭제: `DELETE /v1/admin/visits?before=YYYY-MM-DD`

---

## 🚫 이번 제외
- 쇼핑몰 소비자/프론트 (`shop/`) (헌법 §9-1)
- 보안용 시스템 파일 (phpinfo, browscap, dbupgrade)
- 테마 관리 (adm/theme_*.php — 서버 파일시스템 의존)
- session/cache/captcha/thumbnail 파일 삭제 (운영 도구)

---

## 🏗️ 아키텍처 규칙
1. `Admin/{Domain}/Controller` → `Service` → `Repository` 3단
2. 모든 Admin 엔드포인트는 `AdminGuardMiddleware` 적용
3. Prepared Statement만
4. routes.php에 라우트 + DI 등록
5. 테스트: `tests/Admin/{Domain}Test.php`

---

## ✅ 자기 감사

```bash
cd ${PROJECT_ROOT}
vendor/bin/phpstan analyse api/ --level=6
vendor/bin/phpunit tests/

# Phase 1 파일 존재 확인
ls api/v1/Admin/Auth/Service/AdminAuthService.php
ls api/v1/Admin/Poll/Service/AdminPollService.php
ls api/v1/Admin/Popup/Service/AdminPopupService.php
ls api/v1/Admin/Mail/Service/AdminMailService.php

# 라우트 확인
grep -n 'auth\|poll\|popup\|mail' api/routes.php | grep -i admin

# 메서드 수 확인
for d in Auth Poll Popup Mail; do
  echo "$d:" $(grep -c 'public function' api/v1/Admin/$d/Service/Admin${d}Service.php)
done
```

## 📝 완료 보고
```
docs/codex/admin/RESULT.md
```
