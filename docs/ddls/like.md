# Like Domain DDL

## 1. 범위
- 게시글/댓글 추천(`good`)·비추천(`nogood`) 이력 관리
- 중복 추천 방지 정책, 멱등성 보장에 필요한 키 확인

## 2. 핵심 테이블

### 2.1 `g5_board_good`
```sql
CREATE TABLE IF NOT EXISTS `g5_board_good` (
  `bg_id` int(11) NOT NULL AUTO_INCREMENT,
  `bo_table` varchar(20) NOT NULL,
  `wr_id` int(11) NOT NULL,
  `mb_id` varchar(20) NOT NULL,
  `bg_flag` varchar(255) NOT NULL,
  `bg_datetime` datetime NOT NULL,
  PRIMARY KEY (`bg_id`),
  UNIQUE KEY `fkey1` (`bo_table`,`wr_id`,`mb_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;
```

- `bg_flag` 값: `good`/`nogood` 사용.
- UNIQUE 키 때문에 한 회원은 한 게시글/댓글에 한 번만 반영 가능.

## 3. API 계약 영향
- 새로고침/중복 요청을 동일 `mb_id`,`bo_table`,`wr_id`로 처리해야 멱등성 보장.
- 실제 노출 카운트(`wr_good`, `wr_nogood`)는 `g5_board_good`와의 정합성 체크를 통해 동기화 가능.
