# File Domain DDL

## 1. 범위
- 게시글 첨부파일 목록 조회/업로드 메타 관리
- `file` 삭제 시 게시글/권한 관계 정합성 확인

## 2. 핵심 테이블

### 2.1 `g5_board_file`
```sql
CREATE TABLE IF NOT EXISTS `g5_board_file` (
  `bo_table` varchar(20) NOT NULL,
  `wr_id` int(11) NOT NULL,
  `bf_no` int(11) NOT NULL,
  `bf_source` varchar(255) NOT NULL,
  `bf_file` varchar(255) NOT NULL,
  `bf_download` int(11) NOT NULL,
  `bf_content` text NOT NULL,
  `bf_fileurl` VARCHAR(255) NOT NULL,
  `bf_thumburl` VARCHAR(255) NOT NULL,
  `bf_storage` VARCHAR(50) NOT NULL,
  `bf_filesize` int(11) NOT NULL,
  `bf_width` int(11) NOT NULL,
  `bf_height` smallint(6) NOT NULL,
  `bf_type` tinyint(4) NOT NULL,
  `bf_datetime` datetime NOT NULL,
  PRIMARY KEY (`bo_table`,`wr_id`,`bf_no`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;
```

## 3. 관계
- 원본 데이터는 게시글 동적 테이블의 `(bo_table, wr_id)`에 종속.
- API에서 삭제/수정 시 `g5_board_file` 연동 없이 게시글만 조작하면 `wr_file` 카운트 불일치 가능.

## 4. API 계약 영향
- 첨부 업로드/삭제 API는 `wr_id` 소유자 + 보드 쓰기/삭제 권한 검증 필수.
- `bf_file`은 정적 경로 대신 파일 저장키 방식으로 노출(도메인 보안 규칙).
