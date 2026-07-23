# 레거시 adm/ ↔ REST API 필드 수준 정합성 전수 감사 — 2026-03-08

> **방법론**: 레거시 `adm/*.php` 폼의 `name="xxx"` 속성 전수 추출 → REST API `Repository::UPDATABLE_FIELDS` + `SELECT` 컬럼 대조
>
> **범위**: 10개 핵심 도메인 (Board, Config, Member, Poll, Popup, Content, FAQ, Menu, Group, Point)

---

## 종합: 🟠 필드 누락 다수 발견

| 도메인 | 레거시 필드 | API 필드 | 누락 | 판정 |
|--------|-----------|---------|------|------|
| **Board** | 57 | 11 | **46** | 🔴 |
| **Config** | 117 | 92 | **25** | 🟠 |
| **Member** | 28 | 18 UPDATABLE | **6** | 🟠 |
| **Content** | 10 | 5 | **5** | 🟠 |
| **Group** | 5 | 2 | **3** | 🟠 |
| **Poll** | 6 | 17 | 0 (API가 더 많음) | ✅ |
| **Popup** | 13 | 13 | 0 | ✅ |
| **FAQ Master** | 7 | 7 | 0 | ✅ |
| **Menu** | 1 | 8 | 0 (API가 더 많음) | ✅ |
| **Point** | 11 | — | 별도 확인 필요 | 🟡 |

---

## 2026-03-08 후속 조치 상태

| 도메인 | 감사 당시 | 현재 상태 | 비고 |
|--------|----------|----------|------|
| **Board** | 46필드 누락 | ✅ 해결 | `UPDATABLE_FIELDS`와 `SELECT *` 확장, Rust 폼/모델 parity 반영 |
| **Config** | 25필드 누락 | ✅ 해결 | 인증/이메일/회원 이미지/기타 scalar 설정 필드 반영 |
| **Member** | 6필드 누락 + leave_date 누락 | ✅ 해결 | `mb_password`, `mb_memo`, `mb_profile`, `mb_signature`, `mb_adult`, `mb_certify`, `mb_leave_date` 지원 |
| **Content** | 5필드 누락 | 🟡 부분 해결 | `include_head/tail`, `tag_filter_use`, `skin/mobile_skin` 반영. `co_himg/co_timg` 업로드/삭제는 별도 파일 API 작업 필요 |
| **Group** | 3필드 누락 | ✅ 해결 | `gr_admin`, `gr_device`, `gr_use_access` 반영 |

### 검증 메모

- PHP 회귀 테스트 추가:
  - `tests/Admin/Board/AdminBoardRepositoryTest.php`
  - `tests/Admin/Config/AdminConfigRepositoryTest.php`
  - `tests/Admin/Content/AdminContentRepositoryTest.php`
  - `tests/Admin/Group/AdminGroupServiceTest.php`
  - `tests/Admin/Member/AdminMemberServiceTest.php`
- Rust 회귀 테스트 추가:
  - `src/features/board-groups/AdminBoardGroupsPage.test.tsx`
  - `src/features/contents/AdminContentsPage.test.tsx`
  - `src/features/members/MemberDetailCard.test.tsx`

---

## 도메인별 상세

### 🔴 1. Board — 46필드 누락 (57 → 11)

REST API `UPDATABLE_FIELDS`에 **11필드만** 정의:
```
bo_subject, gr_id, bo_read_level, bo_write_level, bo_comment_level,
bo_download_level, bo_use_category, bo_category_list, bo_use_secret,
bo_upload_count, bo_upload_size
```

**누락된 46필드:**

| 분류 | 누락 필드 |
|------|---------|
| **관리자/권한** | `bo_admin` |
| **기기/스킨** | `bo_device` (skin, mobile_skin은 레거시 form엔 name 없지만 DB에 존재) |
| **포인트** | `bo_write_point`, `bo_comment_point`, `bo_read_point`, `bo_download_point` |
| **레벨** | (read/write/comment/download_level은 구현됨 ✅) |
| **갤러리** | `bo_gallery_cols`, `bo_gallery_width`, `bo_gallery_height`, `bo_mobile_gallery_width`, `bo_mobile_gallery_height` |
| **이미지** | `bo_image_width` |
| **페이지** | `bo_page_rows`, `bo_mobile_page_rows`, `bo_subject_len`, `bo_mobile_subject_len`, `bo_table_width` |
| **모바일** | `bo_mobile_subject` |
| **글 설정** | `bo_write_min`, `bo_write_max`, `bo_comment_min`, `bo_comment_max` |
| **카운트** | `bo_count_delete`, `bo_count_modify`, `bo_hot`, `bo_new`, `bo_order` |
| **기능 토글** | `bo_use_captcha`, `bo_use_cert`, `bo_use_dhtml_editor`, `bo_use_email`, `bo_use_file_content`, `bo_use_good`, `bo_use_nogood`, `bo_use_ip_view`, `bo_use_list_content`, `bo_use_list_file`, `bo_use_list_view`, `bo_use_name`, `bo_use_rss_view`, `bo_use_search`, `bo_use_sideview`, `bo_use_signature`, `bo_use_sns` |
| **인클루드** | `bo_include_head`, `bo_include_tail`, `bo_insert_content` |
| **정렬** | `bo_sort_field`, `bo_reply_order` |
| **에디터** | `bo_select_editor` |

> ⚠️ **Board는 G5에서 가장 옵션이 많은 엔티티**. 현재 API는 기본 CRUD만 지원하며, 세부 설정(포인트/갤러리/모바일/기능토글 등) 전부 누락.

---

### 🟠 2. Config — 25필드 누락 (117 → 92)

REST API UPDATABLE_FIELDS **92필드** — 대부분 커버하나 아래 누락:

| 분류 | 누락 필드 |
|------|---------|
| **인증/본인확인** | `cf_cert_find`, `cf_cert_req`, `cf_cert_simple`, `cf_cert_use_seed`, `cf_cert_limit`, `cf_cert_kcb_cd`, `cf_cert_kcp_cd`, `cf_cert_kcp_enckey`, `cf_cert_kg_cd`, `cf_cert_kg_mid` |
| **이메일 알림** | `cf_email_use`, `cf_email_mb_member`, `cf_email_mb_super_admin`, `cf_email_po_super_admin`, `cf_email_wr_board_admin`, `cf_email_wr_comment_all`, `cf_email_wr_group_admin`, `cf_email_wr_super_admin`, `cf_email_wr_write` |
| **회원 아이콘/이미지** | `cf_member_icon_width`, `cf_member_icon_height`, `cf_member_icon_size`, `cf_member_img_width`, `cf_member_img_height`, `cf_member_img_size` |
| **기타** | `cf_filter`, `cf_formmail_is_member`, `cf_leave_day`, `cf_link_target`, `cf_login_minutes`, `cf_mobile_page_rows`, `cf_mobile_pages`, `cf_page_rows`, `cf_possible_ip`, `cf_popular_del`, `cf_search_part`, `cf_write_pages`, `cf_recommend_point`, `cf_use_member_icon`, `cf_use_profile`, `cf_use_promotion`, `cf_use_recommend`, `cf_use_signature`, `cf_req_profile`, `cf_req_signature` |

> ⚠️ 인증 업체 설정(KCB/KCP/KG), 이메일 알림 세부설정, 회원 아이콘/이미지 크기 제한이 API에서 관리 불가

---

### 🟠 3. Member — 6필드 누락 (update 기준)

| 누락 필드 | 설명 | 비고 |
|----------|------|------|
| `mb_password` | 비밀번호 변경 | 🔴 별도 엔드포인트 필요 |
| `mb_memo` | 관리자 메모 | 🟠 |
| `mb_profile` | 자기소개 | 🟡 |
| `mb_signature` | 서명 | 🟡 |
| `mb_adult` | 성인인증 여부 | 🟡 |
| `mb_certify` / `mb_certify_case` | 본인확인 | 🟡 |

또한 `mb_leave_date`가 UPDATABLE에 없음 → 탈퇴/복원 처리 API 없음

---

### 🟠 4. Content — 5필드 누락 (10 → 5)

| 누락 필드 | 설명 |
|----------|------|
| `co_include_head` | 페이지 상단 인클루드 |
| `co_include_tail` | 페이지 하단 인클루드 |
| `co_tag_filter_use` | HTML 태그 필터 사용 |
| `co_himg` / `co_himg_del` | 상단 이미지 업로드/삭제 |
| `co_timg` / `co_timg_del` | 하단 이미지 업로드/삭제 |

---

### 🟠 5. Group — 3필드 누락 (5 → 2)

REST API UPDATABLE은 `gr_id`, `gr_subject`만:

| 누락 필드 | 설명 |
|----------|------|
| `gr_admin` | 그룹 관리자 지정 |
| `gr_device` | 디바이스 설정 |
| `gr_use_access` | 접근 제한 사용 |

---

### ✅ 6. Poll — 양호 (API가 레거시보다 많음)

레거시 form에 6필드, API에 17필드 (po_poll1~9, po_cnt1~9 전부 포함).

### ✅ 7. Popup — 양호 (일치 + nw_content 추가)

### ✅ 8. FAQ Master — 양호 (형태만 다르고 기능 일치 + 이미지 API 별도)

### ✅ 9. Menu — 양호 (API가 레거시보다 훨씬 많음: 8 vs 1)

---

## 시정 우선순위

```
즉시 필요 (비즈니스 필수):
[ ] Board: 46필드 → UPDATABLE_FIELDS 확장 + SELECT 확장 + DTO 확장
[ ] Config: 인증업체(KCB/KCP/KG) 10필드, 이메일알림 9필드
[ ] Member: mb_password 변경 API, mb_memo, mb_leave_date update

중기 (기능 완성):
[ ] Content: include_head/tail, 이미지 업로드/삭제
[ ] Group: gr_admin, gr_device, gr_use_access

후순위 (UX 완성):
[ ] Config: 회원아이콘크기, 기타 UI 설정 필드
[ ] Member: mb_profile, mb_signature, mb_adult, mb_certify
```

---

## 감사 방법론 (재사용용)

```bash
# 1. 레거시 폼 필드 추출
grep -oE 'name="[a-z_0-9]+"' adm/{domain}_form.php | sed 's/name="//;s/"//' | sort -u

# 2. REST API UPDATABLE_FIELDS 추출
grep -A50 "UPDATABLE_FIELDS" api/v1/Admin/{Domain}/Repository/*.php | grep "'" | sed "s/.*'\(.*\)'.*/\1/" | sort -u

# 3. REST API SELECT 필드 추출
grep -oE "'[a-z_0-9]+'" api/v1/Admin/{Domain}/Repository/*.php | sort -u

# 4. diff 비교
diff <(step1) <(step2)
```
