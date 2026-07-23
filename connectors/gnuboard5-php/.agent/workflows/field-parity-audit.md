description: 레거시 관리자 포팅과 데이터 의미를 검증하는 포팅 정합성 감사
---

# 포팅 정합성 감사 워크플로우

레거시 `adm/*.php` 관리자 폼, `schema-domains.json`, generated registry, `/admin/schema` 계약이 같은 의미를 유지하는지 검증합니다.
이 감사는 “필드 개수가 맞느냐”만 보는 것이 아니라, **레거시 포팅이 read/write/default/validation 의미까지 맞느냐**를 확인하는 공급자 포팅 감사입니다.
> **기준**: `.agent/Constitution.md`, `docs/AUDIT_SYSTEM.md`, `docs/AUDIT_STRATEGY.md`
> **실행 명령**: `composer run audit:porting`
> **legacy alias**: `composer run audit:field-parity`

> **출력**: `docs/audits/FIELD_PARITY_AUDIT_YYYY-MM-DD.md`

## 언제 실행하는가

- `adm/*.php` 관리자 폼을 건드렸을 때
- `api/v1/Admin/Schema/**`, `schema-domains.json`, generated JSON을 건드렸을 때
- create 기본값, 라벨, required, section 의미를 바꿨을 때
- Rust 관리자 소비단에서 폼 렌더링 drift가 의심될 때

## Phase 1. generated registry 기본 상태 확인

```bash
composer run schema:check
composer run audit:schema-provider-readiness
./scripts/docs-check.sh
find api/v1/Admin/Schema/Data/generated -maxdepth 1 -name '*.json' | sort
ls -1 api/v1/Admin/Schema/schema-domains.json
```

`composer run audit:porting` 자체도 `schema:check + contract:check + docs-check`를 baseline으로 수행합니다.

## Phase 2. 레거시 폼 필드와 API 필드를 비교

도메인별로 아래 4개를 함께 봅니다.

1. 레거시 폼의 `name="..."` 필드
2. Repository의 `UPDATABLE_FIELDS`
3. install SQL 컬럼
4. generated registry의 `fields_by_name`

필수 점검 항목:

- 레거시 폼에 있는데 API가 누락한 필드
- API가 쓰는데 generated registry가 누락한 필드
- 읽기 전용 필드가 잘못 수정 가능으로 표시된 경우
- create 전용 기본값이 edit 현재값과 섞인 경우
- 저장 시 부작용(예: 파일 삭제 플래그, 토글 coercion)이 포팅 중 누락된 경우

```bash
rg -n "UPDATABLE_FIELDS" api/v1/Admin/*/Repository
rg -n "schema" api/routes/v1.php api/routes/v1/admin.php api/routes/v1/admin/*.php api/docs/openapi.yaml
```

## Phase 3. 메타데이터 품질을 본다

필수 검증 항목:

- `label` 출처가 레거시 폼 또는 명시적 override인지
- `label == field name` 잔존이 없는지
- `FIXME_필드명`은 정말 레거시 한글 라벨을 찾지 못한 예외만 남았는지
- 남아 있는 `FIXME_필드명`은 개수/도메인/다음 작업이 감사 보고서에 기록되는지
- `input_type`, `data_type`, `required`, `readonly_on_update`, `create_only`가 맞는지
- `default_value`가 **create용 정적 기본값**인지
- 동적 설정값(`$config[...]`)이나 edit 현재값을 `default_value`로 오인하지 않았는지

```bash
python3 - <<'PY'
import json
from pathlib import Path

root = Path("api/v1/Admin/Schema/Data/generated")
raw_hits = []
fixme_hits = []
default_hits = []

for path in sorted(root.glob("*.json")):
    data = json.loads(path.read_text())
    for section in data.get("sections", []):
        for field in section.get("fields", []):
            name = field.get("name", "")
            label = field.get("label", "")
            if label == name:
                raw_hits.append((path.name, name, label))
            if isinstance(label, str) and label.startswith("FIXME_"):
                fixme_hits.append((path.name, name, label))
            if "default_value" in field:
                default_hits.append((path.name, name, field.get("default_value")))

print("=== raw field label (label == name) ===")
for item in raw_hits:
    print(item)
if not raw_hits:
    print("(없음)")

print("")
print("=== FIXME label ===")
for item in fixme_hits:
    print(item)
if not fixme_hits:
    print("(없음)")

print("")
print("=== sample default_value ===")
for item in default_hits[:20]:
    print(item)
PY
```

## Phase 4. schema 계약과 라우트 존재를 확인한다

```bash
rg -n "/admin/schema|AdminFieldSchema|default_value" api/docs/openapi.yaml
composer run contract:check
```

`/admin/schema`나 OpenAPI가 바뀌었으면 php 내부 감사만으로 닫지 말고 `composer run audit:integrated`를 추가합니다.
provider coverage/backlog까지 바뀌었으면 `output/admin-schema-provider-readiness/latest.{md,json}`도 같이 증적으로 남깁니다.

## Phase 5. 보고서 작성

`docs/audits/FIELD_PARITY_AUDIT_YYYY-MM-DD.md` 형식으로 저장합니다.

포함 항목:

- 감사한 도메인
- 누락/초과 필드
- raw/FIXME 라벨 현황
- `default_value` 의미 위반 여부
- OpenAPI/route/schema 정합성
- Rust 소비단 영향 여부
- read parity / write parity / default parity / validation parity 판정

## 주의사항

- `chk_*`, `token`, `w`, `page`, `sfl`, `sst`, `sod`, `stx`는 API 필드가 아닙니다.
- `*_del`은 파일 삭제 플래그일 수 있으므로 일반 필드 parity와 별도 취급합니다.
- `default_value`는 “편집 기본값”이 아니라 **생성 기본값**입니다.
