# SMS Domain DDL

## 1. 범위
- 레거시 `adm/sms_admin/*.php` 기반 관리자 SMS 도메인
- 설정, 주소록, 템플릿, 발송 이력, 재전송 흐름

## 2. 핵심 테이블

### 2.1 `g5_sms5_config`
```sql
CREATE TABLE IF NOT EXISTS `g5_sms5_config` (
  `cf_phone` varchar(255) NOT NULL DEFAULT '',
  `cf_datetime` datetime NOT NULL DEFAULT '0000-00-00 00:00:00'
) ENGINE=MyISAM DEFAULT CHARSET=utf8;
```

| 컬럼 | 의미 |
|---|---|
| `cf_phone` | 기본 회신번호 |
| `cf_datetime` | 마지막 갱신 시각 |

### 2.2 `g5_sms5_form_group`
```sql
CREATE TABLE IF NOT EXISTS `g5_sms5_form_group` (
  `fg_no` int(11) NOT NULL AUTO_INCREMENT,
  `fg_name` varchar(255) NOT NULL DEFAULT '',
  `fg_count` int(11) NOT NULL DEFAULT '0',
  `fg_member` tinyint(4) NOT NULL,
  PRIMARY KEY (`fg_no`),
  KEY `fg_name` (`fg_name`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;
```

### 2.3 `g5_sms5_form`
```sql
CREATE TABLE IF NOT EXISTS `g5_sms5_form` (
  `fo_no` int(11) NOT NULL AUTO_INCREMENT,
  `fg_no` tinyint(4) NOT NULL DEFAULT '0',
  `fg_member` char(1) NOT NULL DEFAULT '0',
  `fo_name` varchar(255) NOT NULL DEFAULT '',
  `fo_content` text NOT NULL,
  `fo_datetime` datetime NOT NULL DEFAULT '0000-00-00 00:00:00',
  PRIMARY KEY (`fo_no`),
  KEY `fg_no` (`fg_no`, `fo_no`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;
```

### 2.4 `g5_sms5_book_group`
```sql
CREATE TABLE IF NOT EXISTS `g5_sms5_book_group` (
  `bg_no` int(11) NOT NULL AUTO_INCREMENT,
  `bg_name` varchar(255) NOT NULL DEFAULT '',
  `bg_count` int(11) NOT NULL DEFAULT '0',
  `bg_member` int(11) NOT NULL DEFAULT '0',
  `bg_nomember` int(11) NOT NULL DEFAULT '0',
  `bg_receipt` int(11) NOT NULL DEFAULT '0',
  `bg_reject` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`bg_no`),
  KEY `bg_name` (`bg_name`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;
```

### 2.5 `g5_sms5_book`
```sql
CREATE TABLE IF NOT EXISTS `g5_sms5_book` (
  `bk_no` int(11) NOT NULL AUTO_INCREMENT,
  `bg_no` int(11) NOT NULL DEFAULT '0',
  `mb_no` int(11) NOT NULL DEFAULT '0',
  `mb_id` varchar(20) NOT NULL DEFAULT '',
  `bk_name` varchar(255) NOT NULL DEFAULT '',
  `bk_hp` varchar(255) NOT NULL DEFAULT '',
  `bk_receipt` tinyint(4) NOT NULL DEFAULT '0',
  `bk_datetime` datetime NOT NULL DEFAULT '0000-00-00 00:00:00',
  `bk_memo` text NOT NULL,
  PRIMARY KEY (`bk_no`),
  KEY `bk_name` (`bk_name`),
  KEY `bk_hp` (`bk_hp`),
  KEY `mb_no` (`mb_no`),
  KEY `bg_no` (`bg_no`, `bk_no`),
  KEY `mb_id` (`mb_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;
```

### 2.6 `g5_sms5_write`
```sql
CREATE TABLE IF NOT EXISTS `g5_sms5_write` (
  `wr_no` int(11) NOT NULL DEFAULT '1',
  `wr_renum` int(11) NOT NULL DEFAULT '0',
  `wr_reply` varchar(255) NOT NULL DEFAULT '',
  `wr_message` text NOT NULL,
  `wr_booking` datetime NOT NULL DEFAULT '0000-00-00 00:00:00',
  `wr_total` int(11) NOT NULL DEFAULT '0',
  `wr_re_total` int(11) NOT NULL DEFAULT '0',
  `wr_success` int(11) NOT NULL DEFAULT '0',
  `wr_failure` int(11) NOT NULL DEFAULT '0',
  `wr_datetime` datetime NOT NULL DEFAULT '0000-00-00 00:00:00',
  `wr_memo` text NOT NULL,
  KEY `wr_no` (`wr_no`, `wr_renum`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;
```

### 2.7 `g5_sms5_history`
```sql
CREATE TABLE IF NOT EXISTS `g5_sms5_history` (
  `hs_no` int(11) NOT NULL AUTO_INCREMENT,
  `wr_no` int(11) NOT NULL DEFAULT '0',
  `wr_renum` int(11) NOT NULL DEFAULT '0',
  `bg_no` int(11) NOT NULL DEFAULT '0',
  `mb_no` int(11) NOT NULL DEFAULT '0',
  `mb_id` varchar(20) NOT NULL DEFAULT '',
  `bk_no` int(11) NOT NULL DEFAULT '0',
  `hs_name` varchar(30) NOT NULL DEFAULT '',
  `hs_hp` varchar(255) NOT NULL DEFAULT '',
  `hs_datetime` datetime NOT NULL DEFAULT '0000-00-00 00:00:00',
  `hs_flag` tinyint(4) NOT NULL DEFAULT '0',
  `hs_code` varchar(255) NOT NULL DEFAULT '',
  `hs_memo` varchar(255) NOT NULL DEFAULT '',
  `hs_log` varchar(255) NOT NULL DEFAULT '',
  PRIMARY KEY (`hs_no`),
  KEY `wr_no` (`wr_no`),
  KEY `mb_no` (`mb_no`),
  KEY `bk_no` (`bk_no`),
  KEY `hs_hp` (`hs_hp`),
  KEY `hs_code` (`hs_code`),
  KEY `bg_no` (`bg_no`),
  KEY `mb_id` (`mb_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;
```

## 3. API 계약 영향
- 설정 저장은 `g5_config`의 `cf_sms_*`, `cf_icode_*` 필드와 `g5_sms5_config.cf_phone`을 함께 다룹니다.
- 템플릿 그룹/템플릿은 `fg_no` 기준 1:N 구조이며, `fg_no=0`은 미분류 템플릿을 의미합니다.
- 연락처 그룹은 `bg_no=1` 기본 그룹을 전제로 하며, 기본 그룹은 수정/삭제/비우기 대상에서 제외합니다.
- 연락처 동기화는 `g5_member.mb_id`, `mb_hp`, `mb_sms`, `mb_leave_date`를 읽어 `g5_sms5_book`과 그룹 통계를 재계산합니다.
- 발송 배치는 `g5_sms5_write`, 수신 결과는 `g5_sms5_history`에 남기며, 재전송은 `(wr_no, wr_renum)` 조합을 기준으로 새 배치를 추가합니다.
- DB가 문자열로 반환하는 숫자/플래그는 공개 응답에서 integer/boolean으로 정규화하고, 설정·템플릿·연락처·발송 이력의 nullable 문자열은 키를 생략하지 않고 `null`로 반환합니다.
- 템플릿 그룹의 `fg_member`와 연락처의 `bk_receipt` 입력은 관리자 소비자 계약상 정수 `0|1`을 canonical 형식으로 사용합니다.

## 4. 동시성/무결성 위험 포인트
- 모든 SMS 테이블이 MyISAM 기반이라 트랜잭션 롤백이 불가능합니다. 발송 배치 생성과 이력 적재는 부분 실패를 고려한 보상 로직이 필요합니다.
- `g5_sms5_write`는 PK 없이 `(wr_no, wr_renum)` 보조 인덱스만 있으므로 배치 번호 증가 로직은 충돌 가능성을 항상 검토해야 합니다.
- 그룹 통계(`bg_count`, `bg_member`, `bg_nomember`, `bg_receipt`, `bg_reject`)는 집계값 캐시이므로 배치 업데이트 뒤 즉시 재계산해야 숫자 불일치가 누적되지 않습니다.
- 연락처/템플릿 중복 체크는 애플리케이션 레벨에서 수행되므로, 대량 등록 시 동일 번호/동일 본문에 대한 경쟁 조건을 주의해야 합니다.
