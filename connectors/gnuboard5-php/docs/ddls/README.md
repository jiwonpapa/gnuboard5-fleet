# 도메인별 DDL 문서

## 목적
- 도메인 구현 전/중 `Gnuboard5` 스키마 확정성 확보
- MyISAM 계열 구조와 동적 게시판 테이블(`g5_write_*`) 특성을 고려한 API 계약 정합성 확보
- 개발자 간 해석 분기 감소를 위해 필수 컬럼·제약·조인 포인트를 문서로 고정

## 작성 규칙
- 기반 스키마는 `install/gnuboard5.sql` 및 보드 생성 기준 `adm/sql_write.sql`을 기준으로 한다.
- 각 도메인 문서는 다음을 포함해야 한다.
  - 대표 테이블 목록
  - PK/UK/INDEX 요약
  - API 읽기/쓰기 경로에서 사용되는 핵심 컬럼
  - 동시성/데이터 무결성 위험 포인트
  - 동적 테이블 처리 정책(해당 시)
- 스키마 변경/업그레이드는 `docs/audits/AUDIT_REPORT_YYYY-MM-DD.md`에 사유(Why) 반영 후 반영

## 도메인 목록
- [auth](./auth.md)
- [board](./board.md)
- [post](./post.md)
- [comment](./comment.md)
- [file](./file.md)
- [like](./like.md)
- [member](./member.md)
- [point](./point.md)
- [config](./config.md)
- [menu](./menu.md)
- [group](./group.md)
- [content](./content.md)
- [faq](./faq.md)
- [popular](./popular.md)
- [visit](./visit.md)
- [push_notification](./push_notification.md)
- [sdui_layout](./sdui_layout.md)
- [report_block](./report_block.md)
- [memo](./memo.md)
- [qa](./qa.md)
- [scrap](./scrap.md)
- [sms](./sms.md)
- [api_tables](./api_tables.md)
- [poll](./poll.md)
- [new_win](./new_win.md)
- [mail](./mail.md)

## 공통 전제
- `g5_*` 기본 테이블은 `install/gnuboard5.sql`의 `CREATE TABLE` 스키마를 따라야 한다.
- `bo_table` 기반 게시글/댓글 테이블은 동적 생성(`g5_write_{bo_table}`) 되며, API에서 문자열 결합 SQL 금지.
- 동적 테이블명은 `g5_board.bo_table` 존재 여부 + 정규식 `^[a-zA-Z0-9_]{1,20}$` 두 단계 검증 후 사용.
