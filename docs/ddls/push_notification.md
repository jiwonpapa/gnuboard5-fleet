# Push/Notification Domain DDL

## 1. 범위
- 사용자 디바이스 토큰 등록/해제
- 사용자별 알림 이력 조회
- 사용자별 알림 수신 설정 저장

## 2. 핵심 테이블

### 2.1 `g5_push_device`
```sql
CREATE TABLE IF NOT EXISTS `g5_push_device` (
  `pd_id` int(11) NOT NULL AUTO_INCREMENT,
  `mb_id` varchar(20) NOT NULL,
  `pd_token` varchar(512) NOT NULL,
  `pd_platform` varchar(20) NOT NULL DEFAULT 'fcm',
  `pd_active` tinyint(4) NOT NULL DEFAULT 1,
  `pd_datetime` datetime NOT NULL,
  PRIMARY KEY (`pd_id`),
  UNIQUE KEY `uk_member_token` (`mb_id`,`pd_token`),
  KEY `idx_member_active` (`mb_id`,`pd_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 2.2 `g5_push_log`
```sql
CREATE TABLE IF NOT EXISTS `g5_push_log` (
  `pl_id` int(11) NOT NULL AUTO_INCREMENT,
  `mb_id` varchar(20) NOT NULL,
  `pl_title` varchar(255) NOT NULL,
  `pl_body` text NOT NULL,
  `pl_type` varchar(50) NOT NULL DEFAULT 'manual',
  `pl_status` varchar(30) NOT NULL DEFAULT 'sent',
  `pl_datetime` datetime NOT NULL,
  PRIMARY KEY (`pl_id`),
  KEY `idx_member_datetime` (`mb_id`,`pl_datetime`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 2.3 `g5_push_setting`
```sql
CREATE TABLE IF NOT EXISTS `g5_push_setting` (
  `mb_id` varchar(20) NOT NULL,
  `ps_receive_comment` tinyint(4) NOT NULL DEFAULT 1,
  `ps_receive_message` tinyint(4) NOT NULL DEFAULT 1,
  `ps_receive_notice` tinyint(4) NOT NULL DEFAULT 1,
  `ps_datetime` datetime NOT NULL,
  PRIMARY KEY (`mb_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

## 3. API 계약 영향
- `/devices` 등록은 `g5_push_device`의 `(mb_id, pd_token)` 고유키를 기준으로 upsert 처리한다.
- `/members/me/notifications` 목록은 `g5_push_log.mb_id` 기준 내림차순 페이지네이션을 사용한다.
- `/members/me/notifications/settings`는 `g5_push_setting` 1행 upsert 정책으로 동작한다.
- `/admin/push/send`는 외부 푸시 전송이 아닌 내부 큐 적재(로그 저장)를 우선 구현한다.

## 4. 무결성/운영 포인트
- 토큰은 최대 512자 제한을 둔다.
- 토큰 해제는 `pd_active=0` 소프트 비활성화를 기본으로 한다.
- 알림 로그는 운영 중 대용량이 될 수 있으므로 월 단위 아카이브 정책을 권장한다.
