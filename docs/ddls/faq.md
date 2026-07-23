# FAQ Domain DDL

## 1. 범위
- 관리자 FAQ 도메인(`AdminFaq`) CRUD
- FAQ 카테고리(마스터)와 FAQ 항목의 1:N 구조

## 2. 핵심 테이블

### 2.1 `g5_faq_master`
```sql
CREATE TABLE IF NOT EXISTS `g5_faq_master` (
  `fm_id` int(11) NOT NULL AUTO_INCREMENT,
  `fm_subject` varchar(255) NOT NULL,
  `fm_head_html` text NOT NULL,
  `fm_tail_html` text NOT NULL,
  `fm_mobile_head_html` text NOT NULL,
  `fm_mobile_tail_html` text NOT NULL,
  `fm_order` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`fm_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;
```

### 2.2 `g5_faq`
```sql
CREATE TABLE IF NOT EXISTS `g5_faq` (
  `fa_id` int(11) NOT NULL AUTO_INCREMENT,
  `fm_id` int(11) NOT NULL,
  `fa_subject` varchar(255) NOT NULL,
  `fa_content` text NOT NULL,
  `fa_order` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`fa_id`),
  KEY `fm_id` (`fm_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;
```

## 3. API 계약 영향
- FAQ 마스터는 `fm_subject` 필수, `fm_order`와 PC/모바일 상하단 HTML을 함께 관리합니다.
- FAQ 마스터 삭제 시 연결된 `g5_faq` 항목과 `data/faq/{fm_id}_{h|t}` 이미지도 함께 정리합니다.
- FAQ 생성/수정 시 `fm_id` 존재 여부를 먼저 검증.
- 목록 기본 정렬은 `fa_order ASC, fa_id DESC`.
- FAQ 상세 응답은 `g5_faq_master` 조인으로 `fm_subject`를 포함.
