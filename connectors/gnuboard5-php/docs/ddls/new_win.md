# Popup (new_win) Domain DDL

## 1. 범위
- 공개 팝업 조회(`GET /popups/active`)
- 관리자 팝업 CRUD

## 2. 핵심 테이블

### 2.1 `g5_new_win`
```sql
CREATE TABLE IF NOT EXISTS `g5_new_win` (
  `nw_id` int(11) NOT NULL AUTO_INCREMENT,
  `nw_division` varchar(10) NOT NULL DEFAULT 'both',
  `nw_device` varchar(10) NOT NULL DEFAULT 'both',
  `nw_begin_time` datetime NOT NULL DEFAULT '0000-00-00 00:00:00',
  `nw_end_time` datetime NOT NULL DEFAULT '0000-00-00 00:00:00',
  `nw_disable_hours` int(11) NOT NULL DEFAULT 0,
  `nw_left` int(11) NOT NULL DEFAULT 0,
  `nw_top` int(11) NOT NULL DEFAULT 0,
  `nw_height` int(11) NOT NULL DEFAULT 0,
  `nw_width` int(11) NOT NULL DEFAULT 0,
  `nw_subject` text NOT NULL,
  `nw_content` text NOT NULL,
  `nw_content_html` tinyint(4) NOT NULL DEFAULT 0,
  PRIMARY KEY (`nw_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;
```

| 컬럼 | 의미 |
|---|---|
| `nw_division` | 노출 위치(web/mobile/both 정책) |
| `nw_device` | 디바이스 조건(pc/mobile/both) |
| `nw_begin_time`, `nw_end_time` | 노출 기간 |
| `nw_disable_hours` | 닫기 시 재노출 억제 시간 |
| `nw_left`, `nw_top`, `nw_width`, `nw_height` | 팝업 위치/크기 |
| `nw_content_html` | HTML 렌더링 여부 |

## 3. 인덱스/무결성 포인트
- PK 외 보조 인덱스가 없으므로 활성 팝업 조회는 기간 스캔 비용에 주의.
- `nw_begin_time <= now <= nw_end_time` 조건을 빈번히 쓰는 경우 운영 환경 인덱스 정책 검토.

## 4. 비즈니스 규칙
- 활성 팝업은 기간, `device`, `division` 조건을 모두 만족해야 반환.
- `nw_disable_hours`는 API 응답 시 클라이언트 쿠키/스토리지 정책과 함께 동작해야 한다.
