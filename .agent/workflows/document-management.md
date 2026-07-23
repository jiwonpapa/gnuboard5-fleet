---
doc_type: workflow
status: active
owner: rust-admin
source_of_truth: false
ai_default_include: true
last_reviewed: 2026-07-23
review_cycle_days: 30
bounded_context: global
---
# Document Management Workflow

## 1. 시작 전 확인

1. `specs/README.md`에서 canonical 문서 위치를 확인한다.
2. 우선순위 변경이 필요한지 `specs/IMPLEMENTATION_ROADMAP.md`를 먼저 본다.
3. 현재 작업 상태는 `specs/TODO.md`에서 확인한다.

## 2. 문서 변경 절차

1. 새 문서가 정말 필요한지 먼저 판단한다.
2. 새 문서가 필요하면 역할을 활성 SSOT, 지원 문서, 기록 문서 중 하나로 명시하고 frontmatter 메타데이터를 먼저 작성한다.
3. 구현 착수 순서에 영향을 주면 `specs/IMPLEMENTATION_ROADMAP.md`를 갱신한다.
4. 상태 변경이 생기면 `specs/TODO.md`의 단일 상태 레지스터만 수정한다.
5. 완료 작업은 `specs/TODO.md`의 `Done`에 잠깐 두고 `specs/HISTORY.md`에 Why와 함께 기록한다.
6. 같은 사실의 기존 정본이 있으면 새 문서를 만들지 않고 링크만 추가한다.

## 3. 감사 문서 운영

1. 감사 문서는 `specs/audits/YYYY-MM-DD-<topic>.md`로 생성한다.
2. 활성 기간은 기본 7일이다.
3. 보관 대상은 `python3 scripts/archive_old_audits.py`로 `specs/archive/audits/<year>/`에 이동한다.

## 4. 검색과 검증

1. 대량 문서 탐색 전 `python3 scripts/doc-index.py`로 `.cache/docs/docs.db` 인덱스를 재생성한다.
2. 문서 구조를 수정한 뒤 `python3 scripts/check_document_metadata.py`와 `bash scripts/check-doc-governance.sh`를 실행한다.
3. 검증 실패 시 frontmatter 누락, 중복 SSOT, 누락 문서, 상태 섹션, 감사 파일명 규칙부터 확인한다.
4. `python3 scripts/check_document_hygiene.py`로 expired audit, inactive reference, entrypoint coverage drift를 함께 확인한다.
