# API Internal Tables DDL

## 1. 범위
- REST API 전용 보안 테이블
- 로그인 실패 제한(Rate-limit) 및 JWT 폐기 토큰 추적

## 2. 핵심 테이블

### 2.1 `g5_api_login_attempt`
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

### 2.2 `g5_api_token_blacklist`
```sql
CREATE TABLE IF NOT EXISTS `g5_api_token_blacklist` (
  `tb_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `mb_id` varchar(20) NOT NULL DEFAULT '',
  `token_jti` varchar(64) NOT NULL,
  `token_type` varchar(20) NOT NULL,
  `expires_at` int(11) NOT NULL DEFAULT 0,
  `revoked_at` datetime NOT NULL,
  PRIMARY KEY (`tb_id`),
  UNIQUE KEY `uniq_token` (`token_jti`, `token_type`),
  KEY `idx_expires_at` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
```

### 2.3 `g5_api_external_auth_link`
```sql
CREATE TABLE IF NOT EXISTS `g5_api_external_auth_link` (
  `link_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `provider` varchar(32) NOT NULL,
  `provider_user_id` varchar(191) NOT NULL,
  `mb_id` varchar(20) NOT NULL,
  `provider_email` varchar(255) NOT NULL DEFAULT '',
  `provider_profile_json` longtext DEFAULT NULL,
  `linked_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`link_id`),
  UNIQUE KEY `uniq_provider_user` (`provider`, `provider_user_id`),
  KEY `idx_mb_id` (`mb_id`),
  KEY `idx_provider_email` (`provider_email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
```

## 3. 비즈니스 규칙
- `g5_api_login_attempt`는 `mb_id + ip_address` 기준 upsert로 실패 횟수를 누적한다.
- 차단 판정은 `LOGIN_FAIL_MAX_ATTEMPTS`, `LOGIN_FAIL_WINDOW_SECONDS` 환경값을 사용한다.
- `g5_api_token_blacklist`는 로그아웃/토큰 회전 시 `jti`를 기록하고 재사용을 차단한다.
- 만료된 블랙리스트 레코드는 배치 또는 요청 시점 정리(`expires_at`)를 수행한다.
- `g5_api_external_auth_link`는 `provider + provider_user_id`를 단일 외부 계정 식별자로 사용한다.
- 외부 인증 `complete` 응답의 `link_token`을 통해 현재 로그인 회원에게 연결하며, 다른 회원에 이미 연결된 계정은 `409 Conflict`로 차단한다.
- `provider_profile_json`은 공급자 원문 핵심 프로필을 내부 추적용으로 보존하는 필드이며, 앱에는 정규화된 응답만 노출한다.
