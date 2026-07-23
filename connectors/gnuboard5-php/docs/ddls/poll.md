# Poll Domain DDL

## 1. 범위
- 공개 투표(`GET /polls/active`, `POST /polls/{po_id}/vote`, `GET /polls/{po_id}/result`)
- 관리자 투표 CRUD
- 기타의견 저장

## 2. 핵심 테이블

### 2.1 `g5_poll`
```sql
CREATE TABLE IF NOT EXISTS `g5_poll` (
  `po_id` int(11) NOT NULL AUTO_INCREMENT,
  `po_subject` varchar(255) NOT NULL DEFAULT '',
  `po_poll1` varchar(255) NOT NULL DEFAULT '',
  `po_poll2` varchar(255) NOT NULL DEFAULT '',
  `po_poll3` varchar(255) NOT NULL DEFAULT '',
  `po_poll4` varchar(255) NOT NULL DEFAULT '',
  `po_poll5` varchar(255) NOT NULL DEFAULT '',
  `po_poll6` varchar(255) NOT NULL DEFAULT '',
  `po_poll7` varchar(255) NOT NULL DEFAULT '',
  `po_poll8` varchar(255) NOT NULL DEFAULT '',
  `po_poll9` varchar(255) NOT NULL DEFAULT '',
  `po_cnt1` int(11) NOT NULL DEFAULT 0,
  `po_cnt2` int(11) NOT NULL DEFAULT 0,
  `po_cnt3` int(11) NOT NULL DEFAULT 0,
  `po_cnt4` int(11) NOT NULL DEFAULT 0,
  `po_cnt5` int(11) NOT NULL DEFAULT 0,
  `po_cnt6` int(11) NOT NULL DEFAULT 0,
  `po_cnt7` int(11) NOT NULL DEFAULT 0,
  `po_cnt8` int(11) NOT NULL DEFAULT 0,
  `po_cnt9` int(11) NOT NULL DEFAULT 0,
  `po_etc` varchar(255) NOT NULL DEFAULT '',
  `po_level` tinyint(4) NOT NULL DEFAULT 0,
  `po_point` int(11) NOT NULL DEFAULT 0,
  `po_date` date NOT NULL DEFAULT '0000-00-00',
  `po_ips` mediumtext NOT NULL,
  `mb_ids` text NOT NULL,
  `po_use` tinyint(4) NOT NULL DEFAULT 0,
  PRIMARY KEY (`po_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;
```

| 컬럼 | 의미 |
|---|---|
| `po_poll1`~`po_poll9` | 선택지 텍스트 |
| `po_cnt1`~`po_cnt9` | 선택지 득표수 |
| `po_etc` | 기타의견 질문 문구. 빈 문자열이면 기타의견 비활성 |
| `po_level` | 투표 가능 최소 레벨 |
| `po_point` | 참여 시 지급 포인트 |
| `po_ips`, `mb_ids` | 중복투표 방지용 추적 필드 |
| `po_use` | 사용 여부(1=활성) |

### 2.2 `g5_poll_etc`
```sql
CREATE TABLE IF NOT EXISTS `g5_poll_etc` (
  `pc_id` int(11) NOT NULL DEFAULT 0,
  `po_id` int(11) NOT NULL DEFAULT 0,
  `mb_id` varchar(20) NOT NULL DEFAULT '',
  `pc_name` varchar(255) NOT NULL DEFAULT '',
  `pc_idea` varchar(255) NOT NULL DEFAULT '',
  `pc_datetime` datetime NOT NULL DEFAULT '0000-00-00 00:00:00',
  PRIMARY KEY (`pc_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;
```

| 컬럼 | 의미 |
|---|---|
| `pc_id` | 기타의견 PK(수동 증가 관리 주의) |
| `po_id` | 투표 FK |
| `pc_idea` | 기타의견 내용 |
| `pc_datetime` | 등록시각 |

## 3. 인덱스/무결성 포인트
- `g5_poll`는 `po_id` 단일 PK만 있어 조회는 `po_use`, `po_date` 조건 스캔 비용에 주의.
- `g5_poll_etc`는 `po_id` 인덱스가 기본 스키마에 없어 목록 조회 빈도가 높으면 인덱스 추가를 고려.
- `pc_id`는 AUTO_INCREMENT가 아니므로 저장소에서 `MAX(pc_id)+1` 로직 충돌 위험을 관리해야 한다.

## 4. 비즈니스 규칙
- 투표는 `po_use=1` 이고 레벨 조건(`po_level`)을 만족해야 가능.
- 중복 투표는 `po_ips`, `mb_ids`, `poll_etc` 기록으로 차단.
- 기타의견은 `po_etc` 질문 문자열이 비어 있지 않을 때만 저장.
