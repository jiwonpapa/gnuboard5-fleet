---
doc_type: policy
status: active
owner: rust-admin
source_of_truth: false
ai_default_include: true
last_reviewed: 2026-03-21
review_cycle_days: 30
bounded_context: foundation
---
# 관리자 도메인 소비자 패리티 파이프라인

## 1. 목적
- PHP generated schema 와 Tauri 관리자 소비 코드의 drift 를 자동으로 찾습니다.
- 누락 field, stale field, section drift, input type 분류 오판을 diff 로 보고합니다.
- 파이프라인은 범용이며, 각 도메인은 adapter registry 로 붙입니다.

## 2. 스크립트
- `scripts/check_admin_domain_consumer_parity.py`
  - `--domain=<domain>` 기반으로 동작합니다.
  - strong adapter 가 있으면 정밀 parity 를 계산합니다.
  - adapter 가 없으면 heuristic footprint 리포트를 생성하고 `blocked` 로 남깁니다.
  - 출력:
    - `output/admin-domain-consumer-parity/<domain>/latest.json`
    - `output/admin-domain-consumer-parity/<domain>/latest.md`
- `scripts/run_all_admin_domain_consumer_parity.py`
  - 전체 non-shop domain 을 순회합니다.
  - 결과 인덱스:
    - `output/admin-domain-consumer-parity/index.json`
    - `output/admin-domain-consumer-parity/index.md`

## 3. adapter registry 원칙
- 파이프라인은 도메인 전용으로 갈라지지 않습니다.
- strong parity 가 필요한 도메인만 domain adapter 가 아래를 제공합니다.
  - schema json 경로
  - top-level text field source
  - top-level boolean field source
  - top-level radio-boolean field source
  - extra text / extra boolean field source
  - section order source
  - multi-value checkbox 예외
- adapter 가 없는 도메인도 같은 명령으로 heuristic footprint 는 생성됩니다.

## 4. 현재 config adapter 가 보는 것
- `g5-admin/src/features/config/AdminConfigSections.tsx`
- `g5-admin/src/features/config/config-field-meta.ts`
- PHP generated schema
  - `/Users/neojins/workspace/gnuboard5/php/api/v1/Admin/Schema/Data/generated/config.json`

## 5. 실행 예시
```bash
cd /Users/neojins/workspace/gnuboard5/rust
python3 ./scripts/check_admin_domain_consumer_parity.py --domain=config
```

전체 non-shop 도메인:
```bash
cd /Users/neojins/workspace/gnuboard5/rust
python3 ./scripts/run_all_admin_domain_consumer_parity.py
```

배치 운영 순서:
1. PHP provider batch 를 먼저 돌립니다.
2. provider 에서 `playwright_smoke`, `legacy_vs_contract`, `contract_vs_live` 상태를 봅니다.
3. provider 가 정리된 도메인만 consumer static parity 를 봅니다.
4. 마지막은 render parity 입니다.

권장 순서:
1. PHP provider pipeline 를 먼저 돌립니다.
2. provider summary 가 `legacy_vs_contract`, `contract_vs_live` 둘 다 정리된 뒤 consumer static parity 를 봅니다.
3. 마지막은 render parity 로 실제 DOM 을 검증합니다.

## 6. 실패 해석
- `missing_fields`
  - schema 에 있는데 consumer 가 렌더 ownership 을 안 가진 field
- `consumer_only_fields`
  - consumer 메타에 남아 있는데 schema 에는 없는 stale field
- `type_mismatches`
  - 예: schema 는 `select/radio` 인데 consumer 가 boolean switch 로 분류한 경우
- `missing_sections`
  - schema section key 가 consumer tab/order 에 없는 경우

## 7. 운영 원칙
- PHP provider drift 는 PHP 쪽에서 먼저 고칩니다.
- Rust consumer drift 는 이 리포트가 fail 시킨 뒤 바로 수정합니다.
- live REST schema 와의 최종 정합성은 PHP domain pipeline 결과와 함께 봅니다.
- `blocked + heuristic_only` 는 “엔진이 안 돈다”가 아니라 “consumer ownership mapping 이 아직 약하다”는 뜻입니다.
- 도메인별 strong adapter 를 무작정 늘리기보다, heuristic 결과로 실제 drift 가 자주 나는 도메인부터 strong adapter 로 승격합니다.

현재 기준 해석:
- `config`
  - `pass`
  - strong adapter 가 있고, 이 도메인은 render parity 까지 닫힌 상태입니다.
- `members`
  - `pass`
  - strong adapter 가 있고, write surface 기준 static parity 가 닫힌 상태입니다.
  - `mb_mailling`, `mb_open` 같은 boolean field 도 `radio(boolean)` control 로 모델링해 정적 parity 에 반영합니다.
