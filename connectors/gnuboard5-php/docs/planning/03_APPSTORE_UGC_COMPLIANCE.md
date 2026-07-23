# 애플 앱스토어 심사 프리패스 모듈 (UGC 방어 API)

> **상태**: 📋 계획 단계 | **우선순위**: 🔴 필수 (앱스토어 심사 통과 전제조건) | **대상**: REST API + Flutter

---

## 1. 문제 정의

> **애플 앱스토어 가이드라인 1.2 (User Generated Content)**
> UGC를 포함하는 앱은 반드시 다음 기능을 구현해야 합니다:
> - 부적절한 콘텐츠 **신고(Report)** 기능
> - 사용자 **차단(Block)** 기능
> - 부적절한 콘텐츠 **숨기기/필터링** 기능
>
> **이 기능이 없으면 100% 리젝됩니다.** 예외 없음.

Google Play Store도 동일한 정책을 점점 강화하는 추세이므로, 양대 스토어 공통 대응이 필수입니다.

---

## 2. 솔루션 개요

신고(Report) + 차단(Block) + 콘텐츠 필터링 기능을 **REST API + Flutter UI 세트**로 패키징하여, 솔루션 설치 시 기본 탑재되도록 합니다.

```
[Flutter 앱]
    ├── 게시글/댓글 → [🚩 신고] 버튼
    ├── 사용자 프로필 → [🚫 차단] 버튼
    └── 차단된 사용자의 콘텐츠 → 자동 숨김 처리

[REST API]
    ├── /api/v1/reports      → 신고 접수/관리
    ├── /api/v1/blocks       → 사용자 차단 관리
    └── /api/v1/admin/reports → 관리자 신고 처리
```

---

## 3. 기능 상세

### 3-1. 신고(Report) 시스템

| 기능 | 설명 |
|------|------|
| **신고 대상** | 게시글, 댓글, 회원 (3종) |
| **신고 사유** | 스팸, 욕설/혐오, 음란물, 개인정보 노출, 저작권 침해, 기타 |
| **중복 방지** | 동일 사용자가 동일 대상을 중복 신고 불가 (409 Conflict) |
| **자동 임계치** | 누적 신고 N건 도달 시 자동 비공개 처리 (관리자 설정) |
| **관리자 처리** | 승인(삭제/비공개) / 기각 / 보류 |

### 3-2. 차단(Block) 시스템

| 기능 | 설명 |
|------|------|
| **차단 효과** | 차단한 사용자의 게시글·댓글이 목록/상세에서 숨김 처리 |
| **양방향 차단** | A가 B를 차단하면 A에게 B의 콘텐츠가 안 보임 (B에겐 A가 보임) |
| **차단 해제** | 사용자가 직접 차단 목록에서 해제 가능 |
| **차단 상한** | 차단 가능 최대 인원수 설정 (기본 500명) |

### 3-3. 콘텐츠 필터링 연동

기존 게시글/댓글 조회 API(`GET /posts`, `GET /comments`)에 차단 필터를 자동 적용:

```
기존 쿼리:
SELECT * FROM g5_write_free WHERE wr_is_comment = 0 ...

차단 적용 후:
SELECT * FROM g5_write_free
WHERE wr_is_comment = 0
  AND mb_id NOT IN (SELECT blocked_mb_id FROM g5_user_block WHERE mb_id = :current_user)
  ...
```

---

## 4. REST API 엔드포인트

### 사용자용

| 메서드 | 엔드포인트 | 설명 |
|--------|-----------|------|
| POST | `/api/v1/reports` | 신고 접수 |
| GET | `/api/v1/blocks` | 내 차단 목록 조회 |
| POST | `/api/v1/blocks` | 사용자 차단 |
| DELETE | `/api/v1/blocks/{mb_id}` | 차단 해제 |

### 관리자용

| 메서드 | 엔드포인트 | 설명 |
|--------|-----------|------|
| GET | `/api/v1/admin/reports` | 신고 목록 (필터: 상태/유형/기간) |
| PATCH | `/api/v1/admin/reports/{report_id}` | 신고 처리 (승인/기각/보류) |
| GET | `/api/v1/admin/reports/stats` | 신고 통계 |

### 신고 접수 요청/응답 예시

**Request**:
```json
POST /api/v1/reports
{
    "target_type": "post",
    "target_id": "free:1234",
    "reason": "spam",
    "detail": "광고성 게시물입니다."
}
```

**Response 201**:
```json
{
    "data": {
        "report_id": 567,
        "target_type": "post",
        "target_id": "free:1234",
        "reason": "spam",
        "status": "pending",
        "created_at": "2026-03-04T16:00:00+09:00"
    },
    "guide": {
        "reason": "신고가 정상적으로 접수되었습니다.",
        "action": "관리자가 검토 후 처리 결과를 알려드립니다."
    }
}
```

---

## 5. DB 스키마 (예상)

```sql
-- 신고 테이블
CREATE TABLE g5_report (
    rp_id           INT AUTO_INCREMENT PRIMARY KEY,
    mb_id           VARCHAR(20) NOT NULL COMMENT '신고자',
    rp_target_type  ENUM('post', 'comment', 'member') NOT NULL,
    rp_target_id    VARCHAR(100) NOT NULL COMMENT 'bo_table:wr_id 또는 mb_id',
    rp_reason       ENUM('spam', 'abuse', 'adult', 'privacy', 'copyright', 'other') NOT NULL,
    rp_detail       TEXT,
    rp_status       ENUM('pending', 'approved', 'rejected', 'hold') DEFAULT 'pending',
    rp_admin_memo   TEXT COMMENT '관리자 처리 메모',
    rp_datetime     DATETIME NOT NULL,
    rp_processed_at DATETIME,
    UNIQUE KEY (mb_id, rp_target_type, rp_target_id)
);

-- 사용자 차단 테이블
CREATE TABLE g5_user_block (
    ub_id           INT AUTO_INCREMENT PRIMARY KEY,
    mb_id           VARCHAR(20) NOT NULL COMMENT '차단한 사용자',
    blocked_mb_id   VARCHAR(20) NOT NULL COMMENT '차단 대상',
    ub_datetime     DATETIME NOT NULL,
    UNIQUE KEY (mb_id, blocked_mb_id)
);
```

---

## 6. Flutter UI 필수 구현 사항

### 신고 UI

- 게시글/댓글 우측 상단 **[⋮] 메뉴 → 신고하기**
- 신고 사유 선택 바텀시트 (라디오 버튼 6종)
- 상세 사유 입력 (선택)
- 신고 완료 토스트 메시지

### 차단 UI

- 사용자 프로필 → **[🚫 차단하기]** 버튼
- 차단 확인 다이얼로그: "이 사용자의 게시글과 댓글이 더 이상 표시되지 않습니다."
- **설정 → 차단 관리** 화면: 차단 목록 + 해제 버튼

### 콘텐츠 숨김 처리

- 차단된 사용자의 게시글/댓글은 목록에서 완전 제거 (빈 공간 없이)
- 직접 URL로 접근 시에도 "차단된 사용자의 콘텐츠입니다" 안내 표시

---

## 7. 앱스토어 심사 체크리스트

| # | 심사 요건 | 대응 | 상태 |
|---|----------|------|------|
| 1 | 부적절한 콘텐츠 신고 가능 | `/api/v1/reports` + 신고 UI | 📋 |
| 2 | 부적절한 사용자 차단 가능 | `/api/v1/blocks` + 차단 UI | 📋 |
| 3 | 차단 시 해당 콘텐츠 숨김 | 게시글/댓글 조회 시 차단 필터 | 📋 |
| 4 | 신고 처리 매커니즘 존재 | 관리자 `/admin/reports` 처리 | 📋 |
| 5 | 앱 내 명확한 이용약관 | `/api/v1/config` 약관 노출 | ✅ (기존) |
| 6 | 콘텐츠 모더레이션 시스템 | 자동 임계치 비공개 + 관리자 수동 처리 | 📋 |

---

## 8. 오픈 이슈

1. 자동 비공개 임계치 기본값 (3건? 5건? 관리자 설정 가능?)
2. 신고 누적된 회원에 대한 자동 제재 정책 (경고 → 임시차단 → 영구차단)
3. 차단된 콘텐츠 복구 프로세스 (오신고 대응)
4. 신고 알림을 관리자에게 푸시로 보낼지 (01_PUSH와 연계)
