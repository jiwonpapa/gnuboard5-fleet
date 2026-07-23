# Comment Domain DDL

## 1. 범위
- 댓글 조회/등록/수정/삭제 도메인
- 게시글 테이블의 동적 구조 내 `wr_is_comment = 1` 레코드로 관리되는 데이터 규칙 정리

## 2. 핵심 테이블

### 2.1 동적 게시글 테이블 `g5_write_{bo_table}` (공통)
댓글은 동일 테이블의 동일 스키마를 사용한다.

- 댓글 필터 조건: `wr_is_comment = 1`
- 부모 연결: `wr_parent = <원글 wr_id>`
- `wr_comment`/`wr_comment_reply`는 원글/대댓글/트리 정렬에서 사용
- `wr_num`/`wr_reply`는 원글과 동일 트리 정렬 규칙

### 2.2 추천 동반 테이블
- 댓글 추천/비추천은 `g5_board_good`의 `wr_id` 범위로 처리되며 댓글 `wr_id`도 대상 가능.

## 3. 작성/조회 규칙
- `wr_is_comment=1`이더라도 `g5_board_new` 집계 및 포인트 정책은 원문 정책과 분기되어 적용될 수 있음(원문 규칙 준수).
- 댓글 삭제 시 대상 글의 `wr_comment` 카운트 동기화 필요.
- `bo_count_comment`는 `g5_board` 집계와 동기화를 같이 맞추어야 함.

## 4. API 계약 영향
- 댓글 목록은 원글 API에서 확장(`expand=comments`)으로 조합하거나 별도 댓글 리소스로 설계 가능.
- `wr_parent`가 없는 데이터는 API에서 reject.
- 본문 권한은 원글 권한 체크 후 상향 적용(비밀글/레벨/차단).
