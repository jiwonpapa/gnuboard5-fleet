# Memo Domain DDL

## 1. 범위
- 회원 간 쪽지 송수신 저장(`recv`/`send` 2중 레코드)
- 미읽음 카운트 산출(`me_read_datetime`)
- 회원 테이블 카운터(`mb_memo_cnt`, `mb_memo_call`) 동기화

## 2. 핵심 테이블

### 2.1 `g5_memo`
```sql
CREATE TABLE IF NOT EXISTS `g5_memo` (
  `me_id` INT(11) NOT NULL AUTO_INCREMENT,
  `me_recv_mb_id` varchar(20) NOT NULL default '',
  `me_send_mb_id` varchar(20) NOT NULL default '',
  `me_send_datetime` datetime NOT NULL default '0000-00-00 00:00:00',
  `me_read_datetime` datetime NOT NULL default '0000-00-00 00:00:00',
  `me_memo` text NOT NULL,
  `me_send_id` INT(11) NOT NULL DEFAULT '0',
  `me_type` ENUM('send','recv') NOT NULL DEFAULT 'recv',
  `me_send_ip` VARCHAR(100) NOT NULL DEFAULT '',
  PRIMARY KEY (`me_id`),
  KEY `me_recv_mb_id` (`me_recv_mb_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;
```

## 3. 컬럼 설명(핵심)
- `me_type`: 수신함(`recv`) / 발신함(`send`) 구분
- `me_send_id`: 발신함 레코드가 참조하는 수신함 `me_id`
- `me_read_datetime`: `'0000-00-00 00:00:00'`이면 미확인 상태

## 4. 비즈니스 규칙
- 발송 시 수신/발신 2건을 트랜잭션으로 함께 기록한다.
- 읽음 처리(`markAsRead`)는 `me_id`와 `me_send_id`를 함께 갱신해 양쪽 레코드를 동기화한다.
- 미읽음 집계는 `me_type='recv' AND me_read_datetime='0000-00-00 00:00:00'` 조건을 사용한다.
- 삭제 권한은 송신자/수신자 본인에 한정한다.
