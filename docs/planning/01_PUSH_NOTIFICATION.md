# 푸시 알림 시스템 (Push Notification)

> **상태**: 📋 계획 단계 | **우선순위**: 높음 | **대상**: iOS (APNs) + Android (FCM)

---

## 1. 목표

그누보드5 커뮤니티에서 발생하는 이벤트(새 댓글, 쪽지, 공지 등)를 양대 앱스토어(iOS·Android) 네이티브 푸시로 실시간 전달하는 시스템을 구축한다.

---

## 2. 구현 범위

### 2-1. 그누보드5 관리자 애드온 (PHP)

| 항목 | 설명 |
|------|------|
| **FCM/APNs 설정 관리** | 관리자 페이지에서 Firebase 서비스 키, APNs 인증 키(p8) 업로드 및 저장 |
| **디바이스 토큰 관리** | 회원별 디바이스 토큰 등록/갱신/삭제. 멀티 디바이스 지원 |
| **푸시 템플릿 관리** | 관리자가 푸시 제목/본문 템플릿을 도메인별로 설정 |
| **수동 발송** | 관리자가 전체/그룹/개별 회원 대상으로 푸시를 직접 발송 |
| **발송 이력** | 발송 일시, 대상, 성공/실패 건수 로그 |

### 2-2. REST API 엔드포인트

| 메서드 | 엔드포인트 | 설명 |
|--------|-----------|------|
| POST | `/api/v1/devices` | 디바이스 토큰 등록 (FCM/APNs 구분) |
| DELETE | `/api/v1/devices/{token}` | 디바이스 토큰 해제 |
| GET | `/api/v1/members/me/notifications` | 내 알림 이력 목록 |
| PATCH | `/api/v1/members/me/notifications/settings` | 알림 수신 설정 (댓글/쪽지/공지 on/off) |
| POST | `/api/v1/admin/push/send` | (관리자) 수동 푸시 발송 |

### 2-3. 자동 트리거 이벤트

| 이벤트 | 수신 대상 | 조건 |
|--------|----------|------|
| 새 댓글 | 게시글 작성자 | 본인 댓글 제외 |
| 대댓글 | 부모 댓글 작성자 | 본인 대댓글 제외 |
| 쪽지 도착 | 수신자 | - |
| 공지사항 등록 | 전체 회원 | 관리자 설정 시 |
| 포인트 변동 | 해당 회원 | 선택적 |

---

## 3. DB 스키마 (예상)

```sql
-- 디바이스 토큰 테이블
CREATE TABLE g5_push_device (
    pd_id       INT AUTO_INCREMENT PRIMARY KEY,
    mb_id       VARCHAR(20) NOT NULL,
    pd_token    VARCHAR(512) NOT NULL,
    pd_platform ENUM('fcm', 'apns') NOT NULL,
    pd_active   TINYINT(1) DEFAULT 1,
    pd_datetime DATETIME NOT NULL,
    UNIQUE KEY (mb_id, pd_token)
);

-- 알림 이력 테이블
CREATE TABLE g5_push_log (
    pl_id       INT AUTO_INCREMENT PRIMARY KEY,
    mb_id       VARCHAR(20),
    pl_title    VARCHAR(255) NOT NULL,
    pl_body     TEXT,
    pl_type     VARCHAR(30),
    pl_status   ENUM('sent', 'failed') NOT NULL,
    pl_datetime DATETIME NOT NULL
);
```

---

## 4. 기술 스택 후보

| 항목 | 후보 |
|------|------|
| FCM SDK | `kreait/firebase-php` (PHP 8.1+ 지원) |
| APNs | `edamov/pushok` 또는 FCM 통합 발송 |
| 큐 시스템 | 동기 발송 (초기) → Redis Queue (확장 시) |

---

## 5. 오픈 이슈

1. 푸시 큐 비동기 처리 방식 (cron vs 데몬 vs 웹훅)
2. 웹호스팅 환경에서 백그라운드 작업 제약
3. Flutter 측 FCM/APNs 통합 패키지 선정
