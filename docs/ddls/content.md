# Content Domain DDL

## 1. 범위
- 관리자 고정 컨텐츠 도메인(`AdminContent`) CRUD
- 약관/소개/정책 페이지 등 정적 컨텐츠 관리

## 2. 핵심 테이블

### 2.1 `g5_content`
```sql
CREATE TABLE IF NOT EXISTS `g5_content` (
  `co_id` varchar(20) NOT NULL,
  `co_html` tinyint(4) NOT NULL DEFAULT '0',
  `co_subject` varchar(255) NOT NULL,
  `co_content` text NOT NULL,
  `co_mobile_content` text NOT NULL,
  PRIMARY KEY (`co_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;
```

## 3. API 계약 영향
- `co_id`는 URL 식별자로 사용되므로 불변 키로 취급.
- `co_content`/`co_mobile_content`는 HTML 저장 가능 여부(`co_html`)와 함께 관리.
- 조회/수정 API는 `co_id`를 기준으로 1건 단위 처리.
