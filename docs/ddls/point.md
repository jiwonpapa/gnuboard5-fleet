# Point Domain DDL

## 1. 범위
- 포인트 적립/차감/히스토리 API의 정합성 기준
- 게시글/댓글 동작 후 이력 반영 규칙

## 2. 핵심 테이블

### 2.1 `g5_point`
```sql
CREATE TABLE IF NOT EXISTS `g5_point` (
  `po_id` int(11) NOT NULL AUTO_INCREMENT,
  `mb_id` varchar(20) NOT NULL,
  `po_datetime` datetime NOT NULL,
  `po_content` varchar(255) NOT NULL,
  `po_point` int(11) NOT NULL,
  `po_use_point` int(11) NOT NULL,
  `po_expired` tinyint(4) NOT NULL,
  `po_expire_date` date NOT NULL,
  `po_mb_point` int(11) NOT NULL,
  `po_rel_table` varchar(20) NOT NULL,
  `po_rel_id` varchar(20) NOT NULL,
  `po_rel_action` varchar(100) NOT NULL,
  PRIMARY KEY (`po_id`),
  KEY `index1` (`mb_id`,`po_rel_table`,`po_rel_id`,`po_rel_action`),
  KEY `index2` (`po_expire_date`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;
```

- `po_point`: 포인트 증감량
- `po_use_point`: 사용한 포인트 금액(과거 이력성 반영)
- `po_mb_point`: 포인트 반영 후 현재값
- `po_rel_table`/`po_rel_id`로 동작 출처 추적

## 3. API 계약 영향
- 게시판 글/댓글 쓰기/추천/삭제 시점별로 `po_rel_table=write|comment|good`와 `po_rel_action`을 남기도록 설계
- 환불/취소(삭제)에 대한 재적용 규칙은 별도 멱등성 키 또는 트랜잭션 보상 로직 필요
- 관리자 원장 목록은 테이블의 12개 컬럼을 모두 projection하며 `po_id`, 포인트 수치, 만료 플래그는 integer로, `po_datetime`은 RFC3339 문자열로 정규화한다.
- 수동 지급·차감 요청은 `mb_id`, 양수 `point`, 선택 `po_content`만 받으며 `po_rel_*` 내부 원장 출처는 서버가 생성한다. 삭제는 양수 정수 `po_ids[]`, 만료는 유효한 `base_date`만 허용한다.
- 지급·차감 후 응답의 `before_point/changed_point/after_point`는 실제 `g5_member.mb_point` 재조회 결과와 결합한다. 만료 응답은 `base_date`, `expired_count`, `synced_members`를 반환한다.
