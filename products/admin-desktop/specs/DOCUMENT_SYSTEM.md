---
doc_type: governance
status: active
owner: rust-admin
source_of_truth: true
canonical_for: document operating system
ai_default_include: true
last_reviewed: 2026-07-23
review_cycle_days: 30
bounded_context: global
---
# 문서 운영 체계

이 문서는 `rust` 프로젝트의 문서 운영 SSOT입니다.

문서는 단순 참고자료가 아니라 구조적 진실을 전달하는 운영 자산입니다.
따라서 모든 문서는 같은 급으로 취급하지 않으며, 타입·상태·소유자·검토일·정본 여부를 구분해 운영합니다.

## 1. 목표

- AI와 사람이 현재의 진실을 즉시 식별할 수 있게 한다.
- 구버전 문서와 임시 문서가 active 설계를 오염시키지 못하게 막는다.
- 한 사실은 한 정본 문서에만 남기고, 나머지는 링크와 요약만 유지한다.
- 코드/계약/구조 변경이 문서 정본 업데이트 없이 완료되지 않게 만든다.

## 2. 문서 계층

### 2.1 헌법 문서

- 예: `.agent/Constitution.md`
- 역할: 거의 변하지 않는 상위 원칙과 금지 규칙
- 특성: 소수만 존재, 최고 신뢰도

### 2.2 정본 문서

- 예: `specs/README.md`, `specs/AUDIT_SYSTEM.md`, `specs/TODO.md`, `specs/HISTORY.md`
- 역할: 실제 구현/운영과 1:1로 연결되는 현재 기준
- 특성: `source_of_truth: true`, `status: active`

### 2.3 의사결정 문서

- 예: ADR, 구조 선택 이유, 전환 전략
- 역할: 왜 이렇게 했는지 보존
- 특성: 구조 변경 시 과거 판단 근거 제공

### 2.4 작업 문서

- 예: TODO, 리팩터링 계획, 감사 보고서, 체크리스트
- 역할: 실행과 추적
- 특성: 영구 정본이 아니며 TTL 또는 상태 전이가 필요

### 2.5 기록/보관 문서

- 예: archive, superseded 설계안, 과거 감사 문서
- 역할: 참고/증빙
- 특성: AI 기본 참조 대상에서 제외

## 3. 문서 메타데이터

active-scope 문서는 YAML frontmatter 형태의 메타데이터를 가져야 합니다.
스키마는 [DOCUMENT_METADATA_SCHEMA.md](/Users/neojins/workspace/gnuboard5/rust/specs/foundation/DOCUMENT_METADATA_SCHEMA.md)를 따릅니다.

최소 필수 필드:

- `doc_type`
- `status`
- `owner`
- `source_of_truth`
- `ai_default_include`
- `last_reviewed`
- `review_cycle_days`

## 4. 상태 규칙

허용 상태는 다음 다섯 가지입니다.

- `draft`
- `active`
- `deprecated`
- `superseded`
- `archived`

추가 규칙:

- `deprecated`, `superseded`, `archived` 문서는 `ai_default_include: false`여야 합니다.
- `source_of_truth: true` 문서는 `status: active`여야 합니다.
- 감사 문서처럼 시간 제한이 있는 작업 문서는 상태 전이 또는 archive를 가져야 합니다.

## 5. 한 사실 한 정본

- 한 사실은 한 정본 문서에만 존재해야 합니다.
- 다른 문서에 같은 사실이 필요하면 복붙하지 않고 링크와 요약만 둡니다.
- 예:
  - 감사 운영 규칙: `specs/AUDIT_SYSTEM.md`
  - 작업 상태: `specs/TODO.md`
  - 영구 이력: `specs/HISTORY.md`

## 6. AI 기본 참조 규칙

- AI 기본 참조 시작점은 다음 순서입니다.
  1. `.agent/Constitution.md`
  2. `specs/README.md`
  3. 해당 컨텍스트 README
  4. 관련 정본 문서
- `deprecated`, `superseded`, `archived` 문서는 AI 기본 참조 대상에서 제외합니다.
- 임시 계획서, 회의 메모, 조사 메모는 필요 시에만 명시적으로 읽습니다.

## 7. 컨텍스트 entrypoint

- `specs/foundation/README.md`는 foundation entrypoint입니다.
- `specs/domains/README.md`는 domain entrypoint입니다.
- 각 entrypoint는 다음을 제공해야 합니다.
  - 책임 범위
  - 관련 정본 문서 링크
  - 기본 참조 순서
  - 금지 규칙 또는 주의점

## 8. 코드/문서 동시 갱신

아래가 바뀌면 관련 정본 문서를 같이 갱신해야 합니다.

- 공개 계약
- 감사 규칙
- crate 책임
- 의존 규칙
- 구조 분해 기준
- blocked/waiver/warning budget 운영 규칙

문서 정본 영향이 있는데 관련 문서를 갱신하지 않으면 완료로 간주하지 않습니다.

## 9. 문서 TTL

TTL이 필요한 대표 대상:

- 조사 메모
- 실험 결과
- 임시 계획서
- AI 초안 보고서
- 날짜형 감사 문서

기본 규칙:

- 날짜형 감사 문서는 7일 뒤 archive 후보
- superseded 문서는 대체 문서를 명시
- archived 문서는 기본 참조에서 제외

상세 규칙은 [DOCUMENT_LIFECYCLE_POLICY.md](/Users/neojins/workspace/gnuboard5/rust/specs/foundation/DOCUMENT_LIFECYCLE_POLICY.md)를 따릅니다.

## 10. 검사와 인덱스

- 문서 거버넌스 검사는 `bash scripts/check-doc-governance.sh`
- 문서 메타데이터 검사는 `python3 scripts/check_document_metadata.py`
- 문서 위생 검사는 `python3 scripts/check_document_hygiene.py`
- 문서 인덱스는 `python3 scripts/doc-index.py`
- `.cache/docs/docs.db`는 Git에서 제외하는 로컬 검색 인덱스이며, Markdown 원문이 권위 원본입니다.

## 10.1 정기 문서 운영 점검

문서 운영 체계는 아래 정기 루프 안에서 유지합니다.

- 정기 구조 감사
- 정기 문서 감사
- 정기 코드-문서 정합성 감사

문서 쪽에서 특히 보는 항목은 다음입니다.

- active 문서 메타데이터 유효성
- 오래된 날짜형 감사 문서의 archive 미이행 여부
- active 문서가 inactive 문서를 다시 참조하는지 여부
- foundation/domain entrypoint가 active 지원 문서를 놓치고 있지 않은지 여부
- 상태값과 실제 참조 상태의 drift
- 한 사실에 대한 중복 정본 존재 여부
- deprecated/superseded/archive 문서의 기본 제외 준수 여부

코드-문서 정합성 기준은 [CODE_DOC_CONSISTENCY_AUDIT.md](/Users/neojins/workspace/gnuboard5/rust/specs/foundation/CODE_DOC_CONSISTENCY_AUDIT.md)를 따른다.

## 11. 현재 도입 범위

이번 2차 단계의 active-scope는 아래 경로 전체입니다.

- `.agent/sub-constitutions/*.md`
- `.agent/workflows/*.md`
- `specs/*.md`
- `specs/codex/*.md`
- `specs/foundation/*.md`
- `specs/domains/*.md`
- `specs/integration/*.md`
- `specs/audits/README.md`

이 범위에서는 다음 규칙을 상설 강제합니다.

- frontmatter 메타데이터 존재
- 필수 필드 존재
- `source_of_truth: true`면 `canonical_for` 존재
- `last_reviewed + review_cycle_days` 경과 문서 경고
- 동일 `canonical_for` 중복 금지
- archive 경로 문서의 status drift 금지

날짜형 감사 문서와 archive 하위 문서는 계속 점진 이행 대상으로 유지합니다.
`specs/codex/*.md`의 날짜형 prompt/report 문서는 기록 자산으로 유지하되, 기본적으로 `archived + ai_default_include:false`로 관리합니다.
