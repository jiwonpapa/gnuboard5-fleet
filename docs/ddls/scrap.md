# Scrap Domain DDL

## 1. 범위
- 게시글 스크랩 등록/해제
- 회원별 스크랩 목록 조회
- 회원 테이블 `mb_scrap_cnt` 동기화

## 2. 핵심 테이블

### 2.1 `g5_scrap`
```sql
CREATE TABLE IF NOT EXISTS `g5_scrap` (
  `ms_id` int(11) NOT NULL auto_increment,
  `mb_id` varchar(20) NOT NULL default '',
  `bo_table` varchar(20) NOT NULL default '',
  `wr_id` varchar(15) NOT NULL default '',
  `ms_datetime` datetime NOT NULL default '0000-00-00 00:00:00',
  PRIMARY KEY (`ms_id`),
  KEY `mb_id` (`mb_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;
```

## 3. 비즈니스 규칙
- 동일 회원-동일 게시글 중복 등록은 API 레벨에서 `409 Conflict`로 차단한다.
- 게시글 삭제 시 해당 게시글의 스크랩을 일괄 삭제하고, 영향 회원의 `mb_scrap_cnt`를 재계산한다.
- 스크랩 목록 조회는 `g5_scrap` + `g5_board` + `g5_write_{bo_table}` 조합으로 게시글 존재 여부까지 반환한다.
