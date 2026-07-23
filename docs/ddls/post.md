# Post Domain DDL

## 1. 범위
- 게시글 조회/생성/수정/삭제 API의 영속성 기준
- 동적 테이블(`g5_write_{bo_table}`) 운용 규칙
- 원글과 댓글 공통 구조 이해(댓글은 다른 도메인에서 분리 문서화)

## 2. 핵심 테이블

### 2.1 동적 게시글 테이블 `g5_write_{bo_table}`
`bo_table` 유효성은 `g5_board` 기준 + 정규식으로 2단계 검증한다.

```sql
CREATE TABLE `g5_write_<bo_table>` (
  `wr_id` int(11) NOT NULL AUTO_INCREMENT,
  `wr_num` int(11) NOT NULL DEFAULT '0',
  `wr_reply` varchar(10) NOT NULL,
  `wr_parent` int(11) NOT NULL DEFAULT '0',
  `wr_is_comment` tinyint(4) NOT NULL DEFAULT '0',
  `wr_comment` int(11) NOT NULL DEFAULT '0',
  `wr_comment_reply` varchar(5) NOT NULL,
  `ca_name` varchar(255) NOT NULL,
  `wr_option` set('html1','html2','secret','mail') NOT NULL,
  `wr_subject` varchar(255) NOT NULL,
  `wr_content` text NOT NULL,
  `wr_seo_title` varchar(255) NOT NULL DEFAULT '',
  `wr_link1` text NOT NULL,
  `wr_link2` text NOT NULL,
  `wr_link1_hit` int(11) NOT NULL DEFAULT '0',
  `wr_link2_hit` int(11) NOT NULL DEFAULT '0',
  `wr_hit` int(11) NOT NULL DEFAULT '0',
  `wr_good` int(11) NOT NULL DEFAULT '0',
  `wr_nogood` int(11) NOT NULL DEFAULT '0',
  `mb_id` varchar(20) NOT NULL,
  `wr_password` varchar(255) NOT NULL,
  `wr_name` varchar(255) NOT NULL,
  `wr_email` varchar(255) NOT NULL,
  `wr_homepage` varchar(255) NOT NULL,
  `wr_datetime` datetime NOT NULL DEFAULT '0000-00-00 00:00:00',
  `wr_file` tinyint(4) NOT NULL DEFAULT '0',
  `wr_last` varchar(19) NOT NULL,
  `wr_ip` varchar(255) NOT NULL,
  `wr_facebook_user` varchar(255) NOT NULL,
  `wr_twitter_user` varchar(255) NOT NULL,
  `wr_1` varchar(255) NOT NULL,
  `wr_2` varchar(255) NOT NULL,
  `wr_3` varchar(255) NOT NULL,
  `wr_4` varchar(255) NOT NULL,
  `wr_5` varchar(255) NOT NULL,
  `wr_6` varchar(255) NOT NULL,
  `wr_7` varchar(255) NOT NULL,
  `wr_8` varchar(255) NOT NULL,
  `wr_9` varchar(255) NOT NULL,
  `wr_10` varchar(255) NOT NULL,
  PRIMARY KEY (`wr_id`),
  KEY `wr_seo_title` (`wr_seo_title`),
  KEY `wr_num_reply_parent` (`wr_num`,`wr_reply`,`wr_parent`),
  KEY `wr_is_comment` (`wr_is_comment`,`wr_id`)
) ENGINE=MyISAM  DEFAULT CHARSET=utf8;
```

### 2.2 제약/요구사항
- `wr_id` 자동증가, 원글 PK.
- `wr_is_comment = 0`만 게시글 API에서 기본 대상으로 사용.
- `wr_num`,`wr_reply`는 트리 구조 정렬에 사용.
- `wr_parent`는 원글/댓글 관계.
- `wr_hit`, `wr_good`, `wr_nogood` 집계 갱신은 동시성 고려(락이 없음으로 정합성 정책 필요).

### 2.3 Post API에서 핵심으로 쓰는 쿼리 패턴
- 목록: `SELECT * FROM g5_write_{bo_table} WHERE wr_is_comment = 0 ... ORDER BY ... LIMIT ...`
- 상세: `SELECT * FROM g5_write_{bo_table} WHERE wr_id = :wr_id`
- 작성: `INSERT` with required fields (`wr_num`,`wr_reply`, `wr_subject`, `wr_content`, `mb_id`, `wr_datetime` ...)
- 삭제: `DELETE FROM g5_write_{bo_table} WHERE wr_id = :wr_id AND wr_is_comment = 0`
- 좋아요/싫어요는 `g5_board_good`와 함께 이력 정합성 관리

### 2.4 동적 테이블 운영 규칙
- `bo_table`은 반드시 `g5_board` 존재 검증 후 생성.
- SQL 작성 시 동적 테이블명은 Prepared Statement 바인딩 불가 → 문자열 조합은 허용 범위에서만 허용.
- 임시/보안상 `g5_write_` 접두사로 시작하는 사용자 입력은 금지.
