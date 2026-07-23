# Visit Domain DDL

## 1. 범위
- 방문 통계 도메인(`AdminVisit`)의 요약/일별 통계 조회
- 원천 로그(`g5_visit`) + 일집계(`g5_visit_sum`) 결합

## 2. 핵심 테이블

### 2.1 `g5_visit`
```sql
CREATE TABLE IF NOT EXISTS `g5_visit` (
  `vi_id` int(11) NOT NULL AUTO_INCREMENT,
  `vi_ip` varchar(255) NOT NULL,
  `vi_date` date NOT NULL,
  `vi_time` time NOT NULL,
  `vi_referer` text NOT NULL,
  `vi_agent` text NOT NULL,
  `vi_browser` varchar(255) NOT NULL,
  `vi_os` varchar(255) NOT NULL,
  PRIMARY KEY (`vi_id`),
  KEY `vi_date` (`vi_date`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;
```

### 2.2 `g5_visit_sum`
```sql
CREATE TABLE IF NOT EXISTS `g5_visit_sum` (
  `vs_date` date NOT NULL,
  `vs_count` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`vs_date`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;
```

## 3. API 계약 영향
- 기간 조회는 `vs_date` 기준 필터를 우선 적용.
- 요약 통계는 `SUM(vs_count)` + `COUNT(DISTINCT vi_ip)`를 조합.
- 대시보드용 일별 배열은 `g5_visit_sum`을 소스로 사용.
