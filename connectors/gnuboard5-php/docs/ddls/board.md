# Board Domain DDL

## 1. 범위
- 게시판 메타데이터
- 그룹/메뉴 배치 정보(도메인 분류 용도)
- 최신글 노출 집계 테이블

## 2. 핵심 테이블

### 2.1 `g5_board`
```sql
CREATE TABLE IF NOT EXISTS `g5_board` (
  `bo_table` varchar(20) NOT NULL,
  `gr_id` varchar(255) NOT NULL,
  `bo_subject` varchar(255) NOT NULL,
  `bo_mobile_subject` varchar(255) NOT NULL,
  `bo_device` enum('both','pc','mobile') NOT NULL DEFAULT 'both',
  `bo_admin` varchar(255) NOT NULL,
  `bo_list_level` tinyint(4) NOT NULL,
  `bo_read_level` tinyint(4) NOT NULL,
  `bo_write_level` tinyint(4) NOT NULL,
  `bo_reply_level` tinyint(4) NOT NULL,
  `bo_comment_level` tinyint(4) NOT NULL,
  `bo_upload_level` tinyint(4) NOT NULL,
  `bo_download_level` tinyint(4) NOT NULL,
  `bo_html_level` tinyint(4) NOT NULL,
  `bo_link_level` tinyint(4) NOT NULL,
  `bo_count_delete` tinyint(4) NOT NULL,
  `bo_count_modify` tinyint(4) NOT NULL,
  `bo_read_point` int(11) NOT NULL,
  `bo_write_point` int(11) NOT NULL,
  `bo_comment_point` int(11) NOT NULL,
  `bo_download_point` int(11) NOT NULL,
  `bo_use_category` tinyint(4) NOT NULL,
  `bo_category_list` text NOT NULL,
  `bo_use_sideview` tinyint(4) NOT NULL,
  `bo_use_file_content` tinyint(4) NOT NULL,
  `bo_use_secret` tinyint(4) NOT NULL,
  `bo_use_dhtml_editor` tinyint(4) NOT NULL,
  `bo_select_editor` varchar(50) NOT NULL,
  `bo_use_rss_view` tinyint(4) NOT NULL,
  `bo_use_good` tinyint(4) NOT NULL,
  `bo_use_nogood` tinyint(4) NOT NULL,
  `bo_use_name` tinyint(4) NOT NULL,
  `bo_use_signature` tinyint(4) NOT NULL,
  `bo_use_ip_view` tinyint(4) NOT NULL,
  `bo_use_list_view` tinyint(4) NOT NULL,
  `bo_use_list_file` tinyint(4) NOT NULL,
  `bo_use_list_content` tinyint(4) NOT NULL,
  `bo_table_width` int(11) NOT NULL,
  `bo_subject_len` int(11) NOT NULL,
  `bo_mobile_subject_len` int(11) NOT NULL,
  `bo_page_rows` int(11) NOT NULL,
  `bo_mobile_page_rows` int(11) NOT NULL,
  `bo_new` int(11) NOT NULL,
  `bo_hot` int(11) NOT NULL,
  `bo_image_width` int(11) NOT NULL,
  `bo_skin` varchar(255) NOT NULL,
  `bo_mobile_skin` varchar(255) NOT NULL,
  `bo_include_head` varchar(255) NOT NULL,
  `bo_include_tail` varchar(255) NOT NULL,
  `bo_content_head` text NOT NULL,
  `bo_mobile_content_head` text NOT NULL,
  `bo_content_tail` text NOT NULL,
  `bo_mobile_content_tail` text NOT NULL,
  `bo_insert_content` text NOT NULL,
  `bo_gallery_cols` int(11) NOT NULL,
  `bo_gallery_width` int(11) NOT NULL,
  `bo_gallery_height` int(11) NOT NULL,
  `bo_mobile_gallery_width` int(11) NOT NULL,
  `bo_mobile_gallery_height` int(11) NOT NULL,
  `bo_upload_size` int(11) NOT NULL,
  `bo_reply_order` tinyint(4) NOT NULL,
  `bo_use_search` tinyint(4) NOT NULL,
  `bo_order` int(11) NOT NULL,
  `bo_count_write` int(11) NOT NULL,
  `bo_count_comment` int(11) NOT NULL,
  `bo_write_min` int(11) NOT NULL,
  `bo_write_max` int(11) NOT NULL,
  `bo_comment_min` int(11) NOT NULL,
  `bo_comment_max` int(11) NOT NULL,
  `bo_notice` text NOT NULL,
  `bo_upload_count` tinyint(4) NOT NULL,
  `bo_use_email` tinyint(4) NOT NULL,
  `bo_use_cert` enum('','cert','adult','hp-cert','hp-adult') NOT NULL DEFAULT '',
  `bo_use_sns` tinyint(4) NOT NULL,
  `bo_use_captcha` tinyint(4) NOT NULL,
  `bo_sort_field` varchar(255) NOT NULL,
  PRIMARY KEY (`bo_table`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;
```

- **PK**: `bo_table`
- `bo_table` 값은 동적 게시글 테이블명 생성의 source(`g5_write_{bo_table}`)로 사용.
- `bo_count_write`, `bo_count_comment`는 캐시 값/동기화 대상.

### 2.2 `g5_group`
```sql
CREATE TABLE IF NOT EXISTS `g5_group` (
  `gr_id` varchar(10) NOT NULL,
  `gr_subject` varchar(255) NOT NULL,
  `gr_device` enum('both','pc','mobile') NOT NULL DEFAULT 'both',
  `gr_admin` varchar(255) NOT NULL,
  `gr_use_access` tinyint(4) NOT NULL,
  `gr_order` int(11) NOT NULL,
  ... custom fields (`gr_1`~`gr_10`, `gr_1_subj`~`gr_10_subj`),
  PRIMARY KEY (`gr_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;
```
- 그룹 도메인으로 게시판 노출/관리권한/접근 제어에서 참고.
- 전체 컬럼은 `install/gnuboard5.sql` 확인.

### 2.3 `g5_board_new`
```sql
CREATE TABLE IF NOT EXISTS `g5_board_new` (
  `bn_id` int(11) NOT NULL AUTO_INCREMENT,
  `bo_table` varchar(20) NOT NULL,
  `wr_id` int(11) NOT NULL,
  `wr_parent` int(11) NOT NULL,
  `bn_datetime` datetime NOT NULL,
  `mb_id` varchar(20) NOT NULL,
  PRIMARY KEY (`bn_id`),
  KEY `mb_id` (`mb_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;
```
- 최근글 API(`POST /posts/latest` 계열) 구성의 원천 테이블.
- 게시글/댓글 모두 `wr_id`로 기록되므로 `wr_id=wr_parent` 구분으로 원글/댓글 구분.

### 2.4 `g5_group_member`
```sql
CREATE TABLE IF NOT EXISTS `g5_group_member` (
  `gm_id` int(11) NOT NULL AUTO_INCREMENT,
  `gr_id` varchar(255) NOT NULL,
  `mb_id` varchar(20) NOT NULL,
  `gm_datetime` datetime NOT NULL,
  PRIMARY KEY (`gm_id`),
  KEY `gr_id` (`gr_id`),
  KEY `mb_id` (`mb_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;
```
- 도메인 권한 판단이 필요한 경우 보조 테이블.

## 3. API 계약 영향
- 보드 목록, 보드 상세, 그룹 필터는 `g5_board` + `g5_group` 조인으로 구성.
- 보드별 조회 정책은 `bo_read_level` / `bo_write_level` / `bo_comment_level` 기반.
- `bo_use_*` 플래그는 요청/응답에서 동작 제한(쓰기 불가, 썸네일 비허용 등)을 강제.
