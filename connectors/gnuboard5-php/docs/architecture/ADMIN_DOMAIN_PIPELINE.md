# 관리자 도메인 공급-계약 파이프라인

## 1. 목적
- 레거시 관리자 HTML, PHP 소스, DB 관찰 결과를 기준으로 REST 계약을 검증합니다.
- 도메인 단위로 재실행 가능한 diff 중심 파이프라인을 유지합니다.
- 첫 구현은 `config` 이지만, 스크립트 인터페이스는 `--domain=<domain>` 기반으로 일반화합니다.

## 2. 산출물 구조
- Playwright smoke
  - `output/playwright/<domain>/manifest.json`
  - `output/playwright/<domain>/<legacy-target>/snapshot.yml`
  - `output/playwright/<domain>/<legacy-target>/console.log`
  - `output/playwright/<domain>/<legacy-target>/network.log`
- source observation
  - `output/admin-domain-pipeline/<domain>/source-observation.json`
  - `output/admin-domain-pipeline/<domain>/source-observation.md`
- legacy vs contract
  - `output/admin-domain-pipeline/<domain>/legacy-vs-contract.json`
- contract vs live
  - `output/admin-domain-pipeline/<domain>/live-schema.json`
  - `output/admin-domain-pipeline/<domain>/contract-vs-live.json`
- pipeline summary
  - `output/admin-domain-pipeline/<domain>/pipeline-summary.json`
  - `output/admin-domain-pipeline/<domain>/pipeline-summary.md`
- all-domain index
  - `output/admin-domain-pipeline/index.json`
  - `output/admin-domain-pipeline/index.md`

## 2.1. manifest 규칙
- 감사 전에 `baseline manifest completeness` 를 먼저 통과해야 합니다.
- baseline manifest 의 source-of-truth 는 `schema-domains.json` 입니다.
- `schema-domains.json` 의 `legacy_forms` 는 문자열 또는 객체를 받습니다.
- 객체 규칙:
  - `path`: 실제 레거시 PHP 소스 파일 경로입니다. 예: `adm/member_form.php`
  - `target`: staging에서 사람이 보는 실제 렌더 URL target 입니다. querystring 이 필요하면 여기에 둡니다.
  - `default_section`: 레거시 HTML에 section anchor 가 없을 때 보조 힌트로 씁니다.
  - `schema_scope = supported_fields`: 해당 legacy surface는 domain `supported_fields` subset만 parity 대상으로 봅니다.
  - `schema_scope = schema_fields`: 해당 legacy surface는 현재 계약 schema에 실제로 존재하는 field 이름만 legacy inventory에서 남기고 비교합니다.
- 도메인 수준 parity 힌트:
  - `ignored_section_mismatches`: legacy form anchor 구조와 계약 section 그룹핑이 의도적으로 다른 field 를 허용합니다.
  - `ignored_render_type_mismatches`: legacy는 hidden 이지만 계약은 API 편의상 visible field로 노출하는 경우처럼, 의도된 render 차이를 field 단위로 허용합니다.
  - `ignored_required_mismatches`: legacy UI 안전장치와 API update semantics 가 다른 field 를 허용합니다.
  - `ignored_readonly_mismatches`: legacy editability와 계약 readonly_on_update 가 다르게 모델링된 field 를 허용합니다.
  - `ignored_schema_only_fields`: legacy UI에는 직접 대응 control 이 없지만 API 계약에서는 aggregate/composite 입력으로 유지하는 field 를 허용합니다.
- `db_observation` 규칙:
  - `mode`: `table | multi | none`
  - `tables`: 실제 DB 관찰 대상으로 삼을 테이블 목록입니다.
  - 단일 테이블 도메인은 기존 `table` 만으로도 동작하지만, 다중 테이블 또는 aggregate 도메인은 `db_observation` 를 우선합니다.
- 예:
```json
{
  "path": "adm/member_form.php",
  "target": "adm/member_form.php?w=u&mb_id={bootstrap_admin_id}"
}
```
- `{bootstrap_admin_id}` 는 `ADMIN_LEGACY_BOOTSTRAP_MEMBER_ID` 환경변수로 치환합니다. 없으면 기본값은 `neojins` 입니다.
- 감사 전 선행 게이트:
```bash
cd php
python3 ./scripts/check_admin_domain_manifest.py
```

## 3. 스크립트 역할
- `scripts/check_admin_domain_manifest.py`
  - 전 도메인의 baseline manifest completeness 를 점검합니다.
  - generated schema, legacy_forms, provider anchor, db observation 명세가 최소한 갖춰졌는지 확인합니다.
  - `output/admin-domain-pipeline/manifest-index.json|md` 를 생성합니다.
- `scripts/build_admin_domain_observation.py`
  - legacy form 경로, repo field 화이트리스트, update 소스, DDL 문서, 실제 DB introspection 결과를 묶습니다.
  - `--base-url` 가 있으면 렌더된 관리자 HTML inventory 까지 포함합니다.
  - `--live-base-url` + inspect secret 이 있으면 staging 서버의 REST API DB 연결(`.env`)을 통해 DB observation 을 수집합니다.
  - `db_observation.mode=multi` 면 여러 테이블을 함께 관찰합니다.
- `scripts/dump_db_table_observation.php`
  - REST API와 동일한 DB 연결 경로(`PdoConnectionFactory`, `.env`)로 실제 DB 컬럼/인덱스/샘플 row 를 뽑습니다.
  - DB 환경변수가 없으면 blocked 로 보고합니다.
- `scripts/check_legacy_schema_parity.php`
  - 레거시 HTML inventory 와 generated schema 의 field/section/type/required/readonly drift 를 비교합니다.
  - `legacy_forms` 가 여러 개인 도메인은 각 surface inventory 를 수집한 뒤, 중복 field 는 더 표현력이 높은 control 을 우선해 합성한 union surface 기준으로 비교합니다.
  - `source_field_map` 으로 레거시 helper input name 과 계약 field name 을 정규화합니다.
  - `captcha_key`, `token` 같은 helper input 은 기본 ignore 대상입니다.
  - 레거시 폼에 section anchor 가 전혀 없으면 section mismatch 는 skip 합니다.
- `scripts/run_admin_domain_playwright_smoke.py`
  - staging bootstrap 세션으로 실제 레거시 관리자 페이지를 Playwright로 엽니다.
  - snapshot/console/network 로그를 저장해, 사람이 보는 UI truth 와 네트워크 상태를 같이 남깁니다.
  - 메뉴에 없는 직접 폼(`adm/member_form.php` 등)도 `--target` 으로 직접 점검할 수 있습니다.
- `scripts/run_admin_domain_pipeline.py`
  - 위 단계들을 오케스트레이션합니다.
  - live inspect secret 이 있으면 live REST schema 와 generated contract 도 비교합니다.
  - `schema-domains.json` 의 `runtime_option_fields` 는 정적 generated schema 와 live runtime-enriched schema 사이의 선택지 개수 차이를 허용합니다.
  - `--playwright-smoke` 를 주면 legacy 브라우저 smoke 까지 summary 에 포함합니다.
- `scripts/run_all_admin_domain_pipelines.py`
  - `schema-domains.json` 의 전체 domain 을 순회합니다.
  - 기본값은 `shop-*` 제외입니다.
  - 각 도메인 summary 를 모아 index 리포트를 만듭니다.

## 4. 확정과 추론
- generated schema 와 OpenAPI 는 계약(contract)입니다.
- legacy HTML, PHP update 소스, DB column/sample 은 관찰(observation)입니다.
- 단, `runtime_option_fields` 는 계약의 정적 스냅샷이 아니라 live 환경에서 보강되는 선택지로 취급합니다.
- 관찰과 계약이 다를 때:
  - 사람이 의도적으로 바꾼 계약이면 review note 로 남깁니다.
  - 의도 없는 drift 면 fail 로 처리합니다.

## 5. 실행 예시
```bash
cd php

python3 ./scripts/run_admin_domain_pipeline.py \
  --domain=config \
  --base-url=http://127.0.0.1:8000 \
  --live-base-url=https://gnurestapi.cc/api/v1 \
  --playwright-smoke
```

inspect secret 이 있으면:
```bash
export ADMIN_SCHEMA_INSPECT_SECRET=...
python3 ./scripts/run_admin_domain_pipeline.py \
  --domain=config \
  --base-url=https://gnurestapi.cc \
  --live-base-url=https://gnurestapi.cc/api/v1 \
  --inspect-secret="$ADMIN_SCHEMA_INSPECT_SECRET" \
  --playwright-smoke
```

staging 기준 전체 non-shop 도메인:
```bash
export ADMIN_SCHEMA_INSPECT_SECRET=...
python3 ./scripts/check_admin_domain_manifest.py
python3 ./scripts/run_all_admin_domain_pipelines.py \
  --base-url=https://gnurestapi.cc \
  --live-base-url=https://gnurestapi.cc/api/v1 \
  --inspect-secret="$ADMIN_SCHEMA_INSPECT_SECRET" \
  --playwright-smoke
```

Playwright smoke 만 단독 실행:
```bash
export ADMIN_SCHEMA_INSPECT_SECRET=...
python3 ./scripts/run_admin_domain_playwright_smoke.py \
  --domain=members \
  --base-url=https://gnurestapi.cc \
  --inspect-secret="$ADMIN_SCHEMA_INSPECT_SECRET" \
  --target=adm/member_form.php?w=u\&mb_id=neojins
```

통합 배치 실행 후 결과 해석 순서:
1. `playwright_smoke`
2. `schema_check`
3. `source_observation`
4. `legacy_vs_contract`
5. `contract_vs_live`

예:
- `config`
  - 현재 기준 `pass`
  - 의미: 레거시 HTML, live REST schema, staging DB 관찰, generated contract 가 일치합니다.
- `members`
  - 현재 기준 `legacy_vs_contract = fail`
  - 의미: 엔진이 깨진 것이 아니라, 회원 수정 폼 한 장과 현재 계약이 담는 field surface 가 다릅니다.
  - 이 경우 다음 액션은 “파이프라인 고치기”가 아니라 “계약을 write/detail surface 로 분리할지”를 결정하는 것입니다.

## 6. blocked 처리 원칙
- 렌더된 HTML 이 없으면:
  - `legacy_html` blocked
  - workaround: PHP source + generated schema + DDL 문서만 비교
- 메뉴에 없는 직접 폼도:
  - `survey_local_admin_pages.php --target=<adm/...>` 로 수집 가능합니다.
  - 예: `adm/member_form.php?w=u&mb_id=neojins`
- REST API `.env` 또는 DB 환경변수가 없으면:
  - `db_live` blocked
  - workaround: `docs/ddls/*.md` 기준만 사용
- live inspect secret 이 없으면:
  - `contract_vs_live` blocked
  - workaround: generated schema 기준으로 consumer parity 만 수행
- staging legacy HTML fetch 는 self-signed 인증서를 허용하도록 fetcher 에 내장합니다.
- `dev/local_admin_bootstrap.php` 는 `X-G5-Admin-Inspect-Secret` 없이는 `401` 입니다.
- `api/v1/admin-inspect/db/{table}` 는 같은 시크릿으로 staging DB observation 을 제공합니다.
- Playwright smoke 는 `.playwright-cli/` 원본 로그를 남기고, 요약된 snapshot/console/network 를 `output/playwright/` 로 복사합니다.

## 7. 다음 확장 방식
- 새 도메인을 추가할 때는:
  1. `schema-domains.json` 에 domain 정의
     - `legacy_forms`
     - `repo_file` 또는 동등한 provider anchor
     - `table` 또는 `db_observation`
  2. 해당 legacy form/update source 와 table 연결
  3. `check_admin_domain_manifest.py` 로 baseline completeness 확인
  4. 같은 `run_admin_domain_pipeline.py --domain=<domain>` 경로로 관찰/검증 실행
- domain 전용 로직이 필요하면 observation 단계에서 adapter 를 추가하되, 파이프라인 엔트리포인트는 유지합니다.

## 8. 판정 원칙
- `pass`
  - 레거시 HTML 관찰, 계약 generated, live REST, DB 관찰이 현재 규칙상 일치합니다.
- `fail`
  - 실제 drift 가 있다는 뜻입니다. provider 구현, 계약 정의, surface scope 중 하나가 어긋난 상태입니다.
- `blocked`
  - 입력 부족입니다. inspect secret, staging URL, live DB 관찰 입력이 없을 때 주로 나옵니다.

`members` 같은 도메인에서 자주 나오는 패턴:
- `schema_only_fields` 가 많이 남음
  - 현재 계약이 edit form 이 아니라 detail/read model 까지 함께 담는지 의심합니다.
- `render_type_mismatches`
  - write surface 는 select/radio 인데 generated contract 가 number/select 로 뭉개졌는지 확인합니다.
- `required/readonly mismatches`
  - add/update 모드 차이 또는 `create_only`/`readonly_on_update` 모델링이 부족한지 확인합니다.
