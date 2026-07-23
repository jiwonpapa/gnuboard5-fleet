---
doc_type: workflow
status: active
owner: rust-admin
source_of_truth: false
ai_default_include: true
last_reviewed: 2026-03-13
review_cycle_days: 30
bounded_context: global
description: PHP 공급자와 Rust 소비자를 함께 검증하는 통합 감사
---

# 통합 감사 워크플로우

> 비고: 파일명은 호환 때문에 유지하지만, 현재 routine 범위는 `php + rust` 2자입니다.
> `flutter`, `web`는 보관 상태이므로 명시적으로 비교를 요청받았을 때만 optional 입력으로 다룹니다.
> 실행 시점: 공급자 계약 또는 소비 의미가 바뀌었을 때만
> 운영 SSOT: `specs/AUDIT_SYSTEM.md`

## 실행 명령

```bash
cd ${RUST_ROOT}
python3 ./scripts/run_integrated_audit.py \
  --rust-root "${RUST_ROOT}" \
  --php-root "${PHP_ROOT}"
```

기본 결과물:

- JSON: `${WORKSPACE_ROOT}/output/integrated-audit/latest.json`
- Markdown: `${WORKSPACE_ROOT}/output/integrated-audit/latest.md`

## 무엇을 확인하나

- PHP OpenAPI path / operation / field 의미
- PHP `/admin/schema` 메타데이터 품질
- Rust registered command / apiTarget / type binding
- known gap과 실제 drift 구분

## 사용 규칙

- 내부 구현 리팩터링만이면 상시 실행하지 않습니다.
- 아래 변경이면 반드시 승격합니다.
  - OpenAPI path / request / response 변경
  - `/admin/schema`의 label / default / option / required 의미 변경
  - auth/error/meta envelope 변경
  - Rust create/edit 적용 방식 변경

## 판정 규칙

- generated report만 최종 판정 근거로 사용합니다.
- 수기 숫자/수기 판정 문서는 참고용일 뿐입니다.
