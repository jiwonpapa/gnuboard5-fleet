---
doc_type: support
status: active
owner: rust-admin
source_of_truth: false
ai_default_include: true
last_reviewed: 2026-03-13
review_cycle_days: 30
bounded_context: audits
---
# 감사 문서 규칙

날짜형 감사 문서는 이 디렉터리에 두고 아래 규칙을 따른다.

- 파일명: `YYYY-MM-DD-<topic>.md`
- 예시: `2026-03-06-ui-bootstrap-audit.md`
- 활성 보관 기간: 기본 7일
- 보관 위치: `specs/archive/audits/<year>/`

활성 보관 기간이 지난 감사 문서는 `python3 scripts/archive_old_audits.py`로 이동한다.
