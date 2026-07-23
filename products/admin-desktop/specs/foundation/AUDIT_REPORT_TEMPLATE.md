---
doc_type: support
status: active
owner: rust-admin
source_of_truth: false
ai_default_include: true
last_reviewed: 2026-03-13
review_cycle_days: 30
bounded_context: foundation
---
# 감사 보고서 템플릿

이 템플릿은 **수기 감사 보고서**에만 사용합니다. generated report가 있는 감사는 generated output을 우선 인용하고, 이 템플릿은 사람이 해석을 덧붙일 때만 사용합니다.

## 1. 메타데이터

- 감사 이름:
- 감사 분류: `implementation | consumer | structure | integrated`
- 감사 대상:
- 감사 기준 문서:
- 감사 일시:
- 감사자:

## 2. 입력과 범위

- 읽은 코드/문서:
- 실행한 명령:
- 제외 범위:
- 가정:

## 3. 요약

- 전체 판정: `passed | warning | failed`
- 핵심 결론:
- 즉시 조치 필요 여부:

## 4. Findings

### Failure

- `[rule-id]` 경로/대상: 무엇이 왜 실패인지, 어떤 규칙을 깼는지, 지금 막아야 하는 이유

### Warning

- `[rule-id]` 경로/대상: 지금은 허용되지만 다음 우선순위가 되는 구조 부채/계약 부채

### Note

- 참고 정보, known gap, archived surface, 측정값 메모

### Evidence

- 명령 출력 요약
- generated report 경로
- 코드/문서 경로

## 5. Waiver

- 적용 waiver id:
- 적용 근거:
- 만료일:
- 제거 조건:

waiver가 없으면 `없음`으로 적습니다. waiver를 새로 만들었다면 `specs/audits/WAIVERS.toml`과 함께 갱신해야 합니다.

## 6. 다음 액션

- 즉시 처리:
- 다음 배치:
- 문서 후속:

## 7. 검증 기록

```text
여기에 실제 실행한 검증 명령을 붙입니다.
```
