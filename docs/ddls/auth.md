# Auth Domain DDL

## 1. 범위
- 인증·인가 기본 데이터
- 로그인/로그아웃 세션 추적
- 회원의 보안이력(간편인증, 인증서) 연동

## 2. 핵심 테이블

### 2.1 `g5_member`
```sql
CREATE TABLE IF NOT EXISTS `g5_member` (
  `mb_no` int(11) NOT NULL AUTO_INCREMENT,
  `mb_id` varchar(20) NOT NULL,
  `mb_password` varchar(255) NOT NULL,
  `mb_name` varchar(255) NOT NULL,
  `mb_nick` varchar(255) NOT NULL,
  `mb_nick_date` date NOT NULL,
  `mb_email` varchar(255) NOT NULL,
  `mb_homepage` varchar(255) NOT NULL,
  `mb_level` tinyint(4) NOT NULL,
  `mb_sex` char(1) NOT NULL,
  `mb_birth` varchar(255) NOT NULL,
  `mb_tel` varchar(255) NOT NULL,
  `mb_hp` varchar(255) NOT NULL,
  `mb_certify` varchar(20) NOT NULL,
  `mb_adult` tinyint(4) NOT NULL,
  `mb_dupinfo` varchar(255) NOT NULL,
  `mb_zip1` char(3) NOT NULL,
  `mb_zip2` char(3) NOT NULL,
  `mb_addr1` varchar(255) NOT NULL,
  `mb_addr2` varchar(255) NOT NULL,
  `mb_addr3` varchar(255) NOT NULL,
  `mb_addr_jibeon` varchar(255) NOT NULL,
  `mb_signature` text NOT NULL,
  `mb_recommend` varchar(255) NOT NULL,
  `mb_point` int(11) NOT NULL,
  `mb_today_login` datetime NOT NULL,
  `mb_login_ip` varchar(255) NOT NULL,
  `mb_datetime` datetime NOT NULL,
  `mb_ip` varchar(255) NOT NULL,
  `mb_leave_date` varchar(8) NOT NULL,
  `mb_intercept_date` varchar(8) NOT NULL,
  `mb_email_certify` datetime NOT NULL,
  `mb_email_certify2` varchar(255) NOT NULL,
  `mb_memo` text NOT NULL,
  `mb_lost_certify` varchar(255) NOT NULL,
  `mb_mailling` tinyint(4) NOT NULL,
  `mb_mailling_date` datetime NOT NULL,
  `mb_sms` tinyint(4) NOT NULL,
  `mb_sms_date` datetime NOT NULL,
  `mb_open` tinyint(4) NOT NULL,
  `mb_open_date` date NOT NULL,
  `mb_profile` text NOT NULL,
  `mb_memo_call` varchar(255) NOT NULL,
  `mb_memo_cnt` int(11) NOT NULL,
  `mb_scrap_cnt` int(11) NOT NULL,
  `mb_marketing_agree` tinyint(1) NOT NULL,
  `mb_marketing_date` datetime NOT NULL,
  `mb_thirdparty_agree` tinyint(1) NOT NULL,
  `mb_thirdparty_date` datetime NOT NULL,
  `mb_agree_log` TEXT NOT NULL,
  `mb_1` ... `mb_10` varchar(255) NOT NULL,
  PRIMARY KEY (`mb_no`),
  UNIQUE KEY `mb_id` (`mb_id`),
  KEY `mb_today_login` (`mb_today_login`),
  KEY `mb_datetime` (`mb_datetime`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;
```
- `mb_password`는 그누보드 코어 `login_password_check()` 흐름과 연동.
- `mb_level`은 게시판/권한 판단에 사용.
- 사용자 상태(탈퇴/차단)는 `mb_leave_date`, `mb_intercept_date`로 구분.
- **주의**: `mb_point` 변경은 점수 도메인에서만 수행하고 인증 API는 직접 증감하지 않는다.

### 2.2 `g5_auth`
```sql
CREATE TABLE IF NOT EXISTS `g5_auth` (
  `mb_id` varchar(20) NOT NULL,
  `au_menu` varchar(50) NOT NULL,
  `au_auth` set('r','w','d') NOT NULL,
  PRIMARY KEY (`mb_id`,`au_menu`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;
```
- 메뉴/권한 매핑 정책: `r` 읽기, `w` 쓰기, `d` 삭제.

### 2.3 `g5_login`
```sql
CREATE TABLE IF NOT EXISTS `g5_login` (
  `lo_id` int(11) NOT NULL AUTO_INCREMENT,
  `lo_ip` varchar(100) NOT NULL,
  `mb_id` varchar(20) NOT NULL,
  `lo_datetime` datetime NOT NULL,
  `lo_location` text NOT NULL,
  `lo_url` text NOT NULL,
  PRIMARY KEY (`lo_id`),
  UNIQUE KEY `lo_ip_unique` (`lo_ip`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;
```
- 중복 IP 로그인 이력 최신/최신화 여부를 판단할 때 사용.

### 2.4 `g5_member_cert_history`
```sql
CREATE TABLE IF NOT EXISTS `g5_member_cert_history` (
  `ch_id` int(11) NOT NULL AUTO_INCREMENT,
  `mb_id` varchar(20) NOT NULL,
  `ch_name` varchar(255) NOT NULL,
  `ch_hp` varchar(255) NOT NULL,
  `ch_birth` varchar(255) NOT NULL,
  `ch_type` varchar(20) NOT NULL,
  `ch_datetime` datetime NOT NULL,
  PRIMARY KEY (`ch_id`),
  KEY `mb_id` (`mb_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;
```
- 본인확인 이력 조회용.

### 2.5 `g5_member_social_profiles`
```sql
CREATE TABLE IF NOT EXISTS `g5_member_social_profiles` (
  `mp_no` int(11) NOT NULL AUTO_INCREMENT,
  `mb_id` varchar(255) NOT NULL,
  `provider` varchar(50) NOT NULL,
  `object_sha` varchar(45) NOT NULL,
  `identifier` varchar(255) NOT NULL,
  `profileurl` varchar(255) NOT NULL,
  `photourl` varchar(255) NOT NULL,
  `displayname` varchar(150) NOT NULL,
  `description` varchar(255) NOT NULL,
  `mp_register_day` datetime NOT NULL,
  `mp_latest_day` datetime NOT NULL,
  PRIMARY KEY (`mp_no`),
  KEY `mb_id` (`mb_id`),
  KEY `provider` (`provider`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;
```

### 2.6 `g5_api_login_attempt`
```sql
CREATE TABLE IF NOT EXISTS `g5_api_login_attempt` (
  `mb_id` varchar(20) NOT NULL,
  `ip_address` varchar(100) NOT NULL,
  `fail_count` int(11) NOT NULL DEFAULT 0,
  `last_fail` datetime NOT NULL,
  PRIMARY KEY (`mb_id`, `ip_address`),
  KEY `idx_last_fail` (`last_fail`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
```
- API 로그인 실패 누적 횟수/차단 윈도우(`LOGIN_FAIL_WINDOW_SECONDS`) 계산에 사용.

### 2.7 `g5_api_token_blacklist`
```sql
CREATE TABLE IF NOT EXISTS `g5_api_token_blacklist` (
  `tb_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `mb_id` varchar(20) NOT NULL DEFAULT '',
  `token_jti` varchar(64) NOT NULL,
  `token_type` varchar(20) NOT NULL,
  `expires_at` int(11) NOT NULL DEFAULT 0,
  `revoked_at` datetime NOT NULL,
  PRIMARY KEY (`tb_id`),
  UNIQUE KEY `uniq_token` (`token_jti`,`token_type`),
  KEY `idx_expires_at` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
```
- JWT 로그아웃/회전(Refresh Rotation) 시 폐기 토큰(`jti`) 추적.
- 만료된 블랙리스트 레코드는 주기적으로 정리.

## 3. API 계약 영향
- Auth API는 기본적으로 `mb_id`, `mb_password`, `mb_name`, `mb_nick`, `mb_email`을 중심으로 동작.
- 멤버 상태 판단 시 `mb_leave_date != ''` 또는 `mb_intercept_date != ''`는 인증 실패 조건으로 처리.
- 하드코딩 키/도메인 주소 대신 `.env` 또는 설정 테이블에서 키를 주입.
- `mb_lost_certify`, `mb_email_certify2`에는 `token|expires_at_unix` 포맷을 저장해 만료 검증을 수행한다. (하위호환: 구 포맷 토큰 값만 저장된 데이터는 만료값 없음으로 처리)
- 회원가입 시 `mb_marketing_agree`, `mb_thirdparty_agree`는 요청값(boolean)을 0/1로 정규화하여 저장한다.
- 로그인 성공 시 `AUTH_AUTO_REHASH_ON_LOGIN=true`이면 레거시 해시(md5/sha 계열)를 현재 해시 규격으로 재저장한다.
