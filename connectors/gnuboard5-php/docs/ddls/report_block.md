# Report/Block Domain DDL

## 1. 범위
- UGC 신고 접수/처리/통계
- 사용자 간 차단 관계 등록/해제/조회

## 2. 핵심 테이블

### 2.1 `g5_report`
```sql
CREATE TABLE IF NOT EXISTS `g5_report` (
  `rp_id` int(11) NOT NULL AUTO_INCREMENT,
  `mb_id` varchar(20) NOT NULL,
  `rp_target_type` varchar(20) NOT NULL,
  `rp_target_id` varchar(50) NOT NULL,
  `rp_reason` varchar(50) NOT NULL,
  `rp_detail` text NOT NULL,
  `rp_status` varchar(20) NOT NULL DEFAULT 'pending',
  `rp_admin_memo` text NOT NULL,
  `rp_datetime` datetime NOT NULL,
  `rp_processed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`rp_id`),
  KEY `idx_target` (`rp_target_type`,`rp_target_id`),
  KEY `idx_status_datetime` (`rp_status`,`rp_datetime`),
  KEY `idx_member_target` (`mb_id`,`rp_target_type`,`rp_target_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 2.2 `g5_user_block`
```sql
CREATE TABLE IF NOT EXISTS `g5_user_block` (
  `ub_id` int(11) NOT NULL AUTO_INCREMENT,
  `mb_id` varchar(20) NOT NULL,
  `blocked_mb_id` varchar(20) NOT NULL,
  `ub_datetime` datetime NOT NULL,
  PRIMARY KEY (`ub_id`),
  UNIQUE KEY `uk_member_blocked` (`mb_id`,`blocked_mb_id`),
  KEY `idx_member` (`mb_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

## 3. API 계약 영향
- `/reports`는 `target_type(post|comment|member)`와 `reason` 화이트리스트를 강제한다.
- 동일 사용자-동일 대상(`mb_id + rp_target_type + rp_target_id`)은 중복 접수 전 검사 후 `409` 처리한다.
- `/admin/reports`는 `status`, `target_type`, 페이지네이션 필터를 사용한다.
- `/blocks`는 본인 차단 금지이며 `(mb_id, blocked_mb_id)` 고유키 기반 upsert를 사용한다.

## 4. 무결성/운영 포인트
- 신고 처리 시 `rp_status`와 `rp_processed_at`를 함께 갱신한다.
- 신고 통계는 `rp_status` 그룹 집계를 기본으로 한다.
- 차단 테이블은 조회 빈도가 높아 `mb_id` 인덱스를 필수로 유지한다.
