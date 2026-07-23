# Group Domain DDL

## 1. 범위
- 관리자 그룹 도메인(`AdminGroup`)의 생성/수정/삭제/조회
- 게시판(`g5_board.gr_id`)과의 참조 무결성 점검

## 2. 핵심 테이블

### 2.1 `g5_group`
```sql
CREATE TABLE IF NOT EXISTS `g5_group` (
  `gr_id` varchar(10) NOT NULL,
  `gr_subject` varchar(255) NOT NULL,
  `gr_device` enum('both','pc','mobile') NOT NULL DEFAULT 'both',
  `gr_admin` varchar(20) NOT NULL DEFAULT '',
  PRIMARY KEY (`gr_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;
```

### 2.2 참조 테이블 `g5_board`
- `g5_board.gr_id`는 게시판이 속한 그룹 ID
- 그룹 삭제 시 게시판 고아 데이터가 생기지 않도록 선행 점검 필요

## 3. API 계약 영향
- `gr_id`는 정규식 `^[a-zA-Z0-9_]{1,10}$`로 검증 후 저장.
- 그룹 삭제 API는 운영에서는 게시판 참조 유무를 반드시 점검해야 함.
- 그룹명(`gr_subject`)은 빈 값 금지.
- REST 생성/수정 공개 필드는 `gr_id`, `gr_subject`, `gr_admin`, `gr_device`, `gr_use_access`이며 나머지 `SELECT *` 컬럼은 응답 Presenter에서 노출하지 않는다.
- `gr_device`는 `both|pc|mobile`, `gr_use_access`는 정수 `0|1`만 허용하고 미선언 body 필드는 400으로 거부한다.
- `/admin/groups*`는 `/admin/board-groups*`와 같은 구현·DTO를 사용하는 deprecated alias이며 삭제하지 않는다.
