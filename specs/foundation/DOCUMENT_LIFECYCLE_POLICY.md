---
doc_type: policy
status: active
owner: rust-admin
source_of_truth: true
canonical_for: document lifecycle policy
ai_default_include: true
last_reviewed: 2026-03-13
review_cycle_days: 30
bounded_context: global
---
# 문서 생애주기 정책

이 문서는 `rust` 프로젝트 문서의 생성, 유지, 전이, 보관 정책을 정의합니다.

## 1. 상태 전이

문서 상태는 다음만 허용합니다.

- `draft`
- `active`
- `deprecated`
- `superseded`
- `archived`

권장 전이:

- `draft -> active`
- `active -> deprecated`
- `active -> superseded`
- `deprecated -> archived`
- `superseded -> archived`

## 2. 상태 의미

### `draft`

- 초안
- 기본 참조 대상 아님
- 구현 기준으로 사용 금지

### `active`

- 현재 유효
- AI 기본 참조 가능
- 정본 문서일 수 있음

### `deprecated`

- 신규 참조 금지
- 대체 방향은 있으나 완전 전환 전
- AI 기본 참조 제외

### `superseded`

- 다른 문서로 대체 완료
- 대체 문서를 명시해야 함
- AI 기본 참조 제외

### `archived`

- 보관만 목적
- 기본 참조 금지
- 필요 시 증빙/회고 용도로만 사용

## 3. TTL 정책

### 날짜형 감사 문서

- 기본 활성 기간: 7일
- 이후 `specs/archive/audits/<year>/` 이동 후보

### 임시 계획서 / 조사 메모 / 실험 문서

- 생성 시 재검토 기한을 둡니다.
- 정본 반영 후 archive 또는 superseded 처리합니다.

## 4. 정본과 비정본

- 정본 문서는 `source_of_truth: true`
- 기록/보관 문서는 보통 `source_of_truth: false`
- 한 사실은 한 정본 문서에만 남기고 나머지는 링크로 연결합니다.

## 5. AI 참조 규칙

- `active + ai_default_include: true`만 기본 참조 대상입니다.
- `deprecated`, `superseded`, `archived`는 기본 제외합니다.
- 예외적으로 과거 판단 근거가 필요하면 명시적으로만 읽습니다.

## 6. 운영 체크

아래 상황이면 문서 정리가 필요합니다.

- active 문서인데 `last_reviewed`가 재검토 주기를 넘김: 경고로 보고하고, 구조/빌드 완료를 막지는 않습니다.
- superseded 문서인데 `supersedes`/대체 문서 링크가 없음
- archive 후보가 여전히 active처럼 참조됨
- 같은 사실을 두 문서가 모두 정본처럼 주장함
