# 📊 레거시 adm/ ↔ REST API Admin 구현 갭 감사 — 2026-03-07

> **기준**: G5 레거시 `adm/` 폴더 전수 (236파일)
> **대상**: PHP REST API `api/v1/Admin/` (20개 도메인, 87파일)

---

## 종합: REST API Admin 코어 도메인 **17/17 = 100% 구현**

레거시 코어 관리자 기능 전부 REST API로 이식 완료.
쇼핑몰(shop_admin) 99파일은 의도적 제외 (별도 프로젝트).

---

## 도메인별 상세 매핑

### ✅ 완전 구현 (레거시 ↔ API 1:1 대응)

| # | 레거시 파일군 | 파일수 | REST API 도메인 | API 파일수 | 비고 |
|---|-------------|-------|----------------|-----------|------|
| 1 | `config_form*.php` | 2 | `Admin/Config/` | 3 | ✅ GET/PUT |
| 2 | `member*.php` | 10 | `Admin/Member/` | 6 | ✅ CRUD + 이미지 + Excel |
| 3 | `board*.php` (board_*) | 15 | `Admin/Board/` | 3 | ✅ CRUD + 복사 + 새글삭제 |
| 4 | `boardgroup*.php` | 7 | `Admin/Group/` | 3 | ✅ 그룹 CRUD + 멤버 |
| 5 | `content*.php` | 3 | `Admin/Content/` | 3 | ✅ CRUD |
| 6 | `faq*.php` | 6 | `Admin/Faq/` | 5 | ✅ Master + FAQ CRUD |
| 7 | `mail*.php` + `sendmail*.php` | 10 | `Admin/Mail/` | 6 | ✅ 발송 + 템플릿 + 수신자 |
| 8 | `menu*.php` | 4 | `Admin/Menu/` | 3 | ✅ CRUD + 정렬 |
| 9 | `newwin*.php` | 3 | `Admin/Popup/` | 3 | ✅ CRUD |
| 10 | `point*.php` | 3 | `Admin/Point/` | 3 | ✅ 목록 + 적립/차감/만료 |
| 11 | `poll*.php` | 4 | `Admin/Poll/` | 5 | ✅ CRUD + 투표 결과 |
| 12 | `popular*.php` | 2 | `Admin/Popular/` | 3 | ✅ 목록 + 순위 |
| 13 | `qa_config*.php` | 2 | `Admin/System/` (qa-config) | — | ✅ SystemController 내 |
| 14 | `auth*.php` | 3 | `Admin/System/` (auths) | — | ✅ SystemController 내 |
| 15 | `visit*.php` | 14 | `Admin/Visit/` | 5 | ✅ 목록 + 검색 + 통계 |
| 16 | `theme*.php` | 5 | `Admin/System/` (theme) | — | ✅ SystemController 내 |
| 17 | `write_count.php` | 1 | `Admin/WriteCount/` | 3 | ✅ 통계 |

### ✅ 시스템/유지보수 — SystemController 통합

| 레거시 파일 | REST API 경로 | 상태 |
|-----------|--------------|------|
| `browscap*.php` (4) | `/admin/system/browscap/*` | ✅ |
| `cache_file_delete.php` | `/admin/system/maintenance/cache-files/purge` | ✅ |
| `captcha_file_delete.php` | `/admin/system/maintenance/captcha-files/purge` | ✅ |
| `session_file_delete.php` | `/admin/system/maintenance/session-files/purge` | ✅ |
| `thumbnail_file_delete.php` | `/admin/system/maintenance/thumbnail-files/purge` | ✅ |
| `phpinfo.php` | `/admin/system/phpinfo` | ✅ |
| `member_list_file_delete.php` | `/admin/system/maintenance/member-list-files/purge` | ✅ |

### ✅ SMS — 완전 구현

| 레거시 파일군 | 파일수 | REST API 도메인 | 상태 |
|-------------|-------|----------------|------|
| `sms_admin/*.php` | **41** | `Admin/Sms/` | ✅ |

레거시 41파일의 기능이 REST API로 통합:
- 설정, 주소록, 그룹, 발송, 이력, 템플릿, 멤버동기화

### ❌ 의도적 제외 — 쇼핑몰

| 레거시 파일군 | 파일수 | REST API | 이유 |
|-------------|-------|---------|------|
| `shop_admin/*.php` | **99** | ❌ 없음 | G5 쇼핑몰은 별도 프로젝트(영카트) 대상 |

### 🟡 레거시 인프라/유틸 (API 대응 불필요)

| 파일 | 성격 | API 필요 여부 |
|------|------|-------------|
| `_common.php` | 세션/인증 초기화 | ❌ 미들웨어로 대체 |
| `admin.head/tail.php` | HTML 템플릿 | ❌ SPA에서 불필요 |
| `admin.lib.php` | 유틸 함수 | ❌ Service로 분산 |
| `admin.menu*.php` (6) | 메뉴 정의 PHP | ❌ 프론트 라우터로 대체 |
| `ajax.token.php` | CSRF 토큰 | ❌ JWT로 대체 |
| `ajax.use_captcha.php` | 캡차 설정 | ❌ Config에 통합 |
| `dbupgrade.php` | DB 마이그레이션 | ❌ 별도 스크립트 |
| `index.php` | 대시보드 히어로 | ❌ 프론트 Overview 페이지 |
| `view.php` | 라우팅 | ❌ 프론트 라우터 |
| `safe_check.php` | 보안 점검 | ❌ CI/Audit로 대체 |
| `service.php` | 서비스 관리 | ❌ 레거시 |
| `_rewrite_config_form.php` | URL 리라이트 | ❌ 서버 설정 |

---

## 레거시 vs API 수량 비교

| 카테고리 | 레거시 파일수 | REST API 대응 | 구현률 |
|---------|------------|-------------|--------|
| 코어 관리자 기능 | 96 | 20개 도메인 87파일 | ✅ **100%** |
| SMS 관리자 | 41 | Admin/Sms/ 4파일 | ✅ **100%** |
| 쇼핑몰(영카트) | 99 | — | ❌ 의도적 제외 |
| 인프라/유틸 | 12 | — | ❌ 불필요 (미들웨어/SPA) |
| **합계** | **248** | **87** | — |

---

## 결론

**레거시 `adm/` → REST API 구현 갭: 0건** (쇼핑몰 제외)

G5 레거시 관리자 화면의 모든 코어 기능이 REST API `api/v1/Admin/` 20개 도메인으로 정확히 이식됨.

다만 이것은 **PHP REST API 자체**의 구현률. Rust Tauri 클라이언트가 이 API를 소비하는 비율은 별도 감사(API_COVERAGE_AUDIT)에서 17.6%로 확인됨.

```
레거시 adm/ (248파일) → PHP REST API (170 ops) → Rust Tauri (30 ops)
         ✅ 100% 이식              🔴 17.6% 소비
```
