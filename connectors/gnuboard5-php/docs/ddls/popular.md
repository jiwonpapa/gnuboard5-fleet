# Popular Domain DDL

## 1. 범위
- 인기검색어 통계 도메인(`AdminPopular`) 조회/초기화
- 기간별 인기 키워드 관리

## 2. 핵심 테이블

### 2.1 `g5_popular`
```sql
CREATE TABLE IF NOT EXISTS `g5_popular` (
  `pp_word` varchar(50) NOT NULL,
  `pp_date` date NOT NULL,
  `pp_rank` int(11) NOT NULL DEFAULT '0',
  `pp_cnt` int(11) NOT NULL DEFAULT '0',
  `pp_ip` varchar(255) NOT NULL DEFAULT '',
  KEY `pp_date` (`pp_date`),
  KEY `pp_word` (`pp_word`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;
```

## 3. API 계약 영향
- 조회 API는 `pp_date DESC, pp_rank ASC` 정렬을 기본으로 사용.
- 초기화 API는 전체 삭제 또는 기간 필터 삭제를 지원.
- 통계 데이터는 집계성 데이터이므로 트랜잭션 잠금보다 배치 정합성 확인이 중요.
