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
# 관리자 도메인 소비자 실렌더 패리티 파이프라인

## 1. 목적
- live `/admin-inspect/config`, `/admin-inspect/schema/{domain}` fixture 를 내려받아 실제 React DOM 렌더를 검증합니다.
- 정적 consumer parity 가 못 잡는 값 채움, control kind, readonly/editable, 탭 중복, 핵심 설명 노출 문제를 fail 로 만듭니다.
- 파이프라인은 공용 runner 를 사용하고, 강한 DOM assertion 이 필요한 도메인만 render adapter 를 붙입니다.

## 2. 스크립트
- `scripts/check_admin_domain_consumer_render_parity.py`
  - `--domain=<domain>` 기반입니다.
  - live inspect fixture 를 fetch 한 뒤 대응 Vitest 파일을 실행합니다.
  - 출력:
    - `output/admin-domain-consumer-render-parity/<domain>/live-config.json`
    - `output/admin-domain-consumer-render-parity/<domain>/live-schema.json`
    - `output/admin-domain-consumer-render-parity/<domain>/latest.json`
    - `output/admin-domain-consumer-render-parity/<domain>/latest.md`
- `scripts/run_all_admin_domain_consumer_render_parity.py`
  - 전체 non-shop domain 을 순회합니다.
  - 결과 인덱스:
    - `output/admin-domain-consumer-render-parity/index.json`
    - `output/admin-domain-consumer-render-parity/index.md`

## 3. adapter registry 원칙
- 엔진은 공용입니다.
- 도메인별 render adapter 는 아래만 제공합니다.
  - live fixture 를 먹일 Vitest 파일
  - 사용자/레거시 기준 핵심 audited check 목록
- adapter 가 없는 도메인은 `blocked` 로 남기되, 리포트 구조는 유지합니다.

## 4. 현재 config render adapter 가 보는 것
- live fixture:
  - `https://gnurestapi.cc/api/v1/admin-inspect/config`
  - `https://gnurestapi.cc/api/v1/admin-inspect/schema/config`
- Vitest:
  - `g5-admin/src/features/config/AdminConfigPage.render-audit.test.tsx`

## 4.1. 현재 members render adapter 가 보는 것
- live fixture:
  - `https://gnurestapi.cc/api/v1/admin-inspect/members`
  - `https://gnurestapi.cc/api/v1/admin-inspect/members/{mb_id}`
  - `https://gnurestapi.cc/api/v1/admin-inspect/schema/members`
- Vitest:
  - `g5-admin/src/features/members/AdminMembersPage.render-audit.test.tsx`

## 5. 실행 예시
```bash
cd /Users/neojins/workspace/gnuboard5/rust
python3 ./scripts/check_admin_domain_consumer_render_parity.py --domain=config
```

전체 non-shop 도메인:
```bash
cd /Users/neojins/workspace/gnuboard5/rust
python3 ./scripts/run_all_admin_domain_consumer_render_parity.py
```

권장 일괄 실행 순서:
1. PHP provider batch
2. Rust consumer static parity batch
3. Rust consumer render parity batch

예:
```bash
cd /Users/neojins/workspace/gnuboard5/php
python3 ./scripts/run_all_admin_domain_pipelines.py \
  --base-url=https://gnurestapi.cc \
  --live-base-url=https://gnurestapi.cc/api/v1 \
  --inspect-secret="$ADMIN_SCHEMA_INSPECT_SECRET" \
  --playwright-smoke

cd /Users/neojins/workspace/gnuboard5/rust
python3 ./scripts/run_all_admin_domain_consumer_parity.py
python3 ./scripts/run_all_admin_domain_consumer_render_parity.py
```

권장 선행:
- provider pipeline 의 Playwright smoke / legacy parity / live schema parity 가 먼저 돌아야 합니다.
- render parity 는 그 위에서 “Rust 가 live contract 를 실제로 어떻게 그리는지”를 검증하는 마지막 단계입니다.

## 6. config 에서 잠그는 핵심 포인트
- `cf_admin` 이 select 로 렌더되고 현재 DB 관리자 계정이 선택 상태인지
- `cf_bbs_rewrite` 가 짧은주소 탭에서만 radio 로 보이는지
- `cf_use_member_icon`, `cf_icon_level` 이 회원가입 탭에서 select 로 editable 한지
- `cf_cert_use` 가 본인확인 탭에서 select 로 보이는지
- `cf_1_subj`, `cf_1` 이 여분필드 탭에서 제목/값 쌍으로 editable 한지
- 위 항목 일부를 실제로 수정하고 저장한 뒤, 성공 응답 이후 폼이 새 서버 값으로 reset/re-hydrate 되는지

## 7. 운영 원칙
- provider parity 가 먼저 pass 여야 render parity 결과를 신뢰합니다.
- render parity 는 “소비자가 live contract 를 실제로 어떻게 그리는지”를 보는 단계입니다.
- config adapter 는 render parity 단계 안에 save/reload round-trip mock 을 포함합니다.
- 실제 live write parity 는 운영 데이터 변경 위험이 있어 별도 승인 없이는 자동화하지 않습니다.
- adapter 가 없는 도메인은 `blocked` 가 정상입니다. 이 경우 먼저 static parity + provider diff 를 보고, 실제 drift 가 많은 도메인만 render adapter 를 추가합니다.

현재 기준 해석:
- `config`
  - `pass`
  - 실제 DOM 및 save/reload mock parity 까지 닫혔습니다.
- `members`
  - `pass`
  - live list/detail/schema fixture 를 기준으로 회원 수정 작업면 DOM 과 save/reload mock parity 까지 닫혔습니다.
