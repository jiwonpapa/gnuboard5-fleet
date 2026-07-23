---
doc_type: governance
status: active
owner: rust-admin
source_of_truth: true
canonical_for: document governance rules
ai_default_include: true
last_reviewed: 2026-07-23
review_cycle_days: 30
bounded_context: global
---
# Document Governance

## 목적

문서 난립, 중복 SSOT, 완료 작업과 진행 작업의 혼선을 막기 위해
이 프로젝트의 문서 역할과 운영 규칙을 고정한다.

## Canonical Documents

- 문서 인덱스: `specs/README.md`
- 문서 운영 SSOT: `specs/DOCUMENT_SYSTEM.md`
- 로드맵 SSOT: `specs/IMPLEMENTATION_ROADMAP.md`
- 작업 상태 SSOT: `specs/TODO.md`
- 완료 이력 SSOT: `specs/HISTORY.md`
- 검색 인덱스: `.cache/docs/docs.db` (로컬 재생성, Git 제외)

## 강제 규칙

1. 구현 우선순위는 `specs/IMPLEMENTATION_ROADMAP.md`만 따른다.
2. 작업 상태는 `specs/TODO.md`만 따른다.
3. 작업 상태는 `Inbox -> Next -> In Progress -> Blocked -> Done` 순서로만 이동한다.
4. `Done`은 최근 완료 작업만 유지하고, 장기 이력은 `specs/HISTORY.md`로 이관한다.
5. 문서를 삭제하기 전에 지원 문서, 기록 문서, 아카이브 후보로 먼저 분류한다.
6. 사용자 명시 지시 없이 설계 문서와 운영 문서를 삭제하지 않는다.
7. 날짜형 감사 문서는 `specs/audits/YYYY-MM-DD-<topic>.md` 규칙을 따른다.
8. 날짜형 감사 문서는 기본 7일 뒤 `specs/archive/audits/<year>/`로 이동한다.
9. SQLite는 `.cache/docs/docs.db` 로컬 검색 인덱스로만 재생성하고, Markdown이 권위 원본이다.
10. 새 로드맵 문서, 새 TODO 문서, 동일 목적의 중복 감사 문서 생성을 피한다.
11. active-scope 문서는 YAML frontmatter 메타데이터를 가져야 한다.
12. `deprecated`, `superseded`, `archived` 문서는 AI 기본 참조 대상에서 제외한다.
13. 한 사실은 한 정본 문서에만 존재해야 하며, 다른 문서는 링크와 요약만 유지한다.
14. foundation/domain README는 AI entrypoint로 유지하고 책임 범위와 기본 참조 순서를 명시한다.
15. TTL과 상태 전이는 `specs/foundation/DOCUMENT_LIFECYCLE_POLICY.md`를 따른다.

## 분류 기준

- 활성 SSOT: 현재 의사결정에 직접 사용되는 canonical 문서
- 지원 문서: 헌법, 워크플로, 운영 가이드
- 기록 문서: HISTORY, 감사 문서, 아카이브된 문서
- 아카이브 후보: 즉시 삭제하지 않고 보관 위치를 재분류해야 하는 문서
- 기본 제외 문서: `deprecated`, `superseded`, `archived`, 과거 조사 메모

## 필수 명령

- `python3 scripts/doc-index.py`
- `python3 scripts/check_document_metadata.py`
- `bash scripts/check-doc-governance.sh`
- `python3 scripts/archive_old_audits.py`
