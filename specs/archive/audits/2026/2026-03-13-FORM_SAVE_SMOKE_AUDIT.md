# Route-Native Form Save Smoke Audit — 2026-03-13

## 범위

- 저장 대상 route-native admin form feature 18개
- registry SSOT: `specs/domains/FORM_SAVE_SMOKE_COVERAGE.toml`
- audit command: `python3 scripts/check_form_save_smoke_coverage.py`

## 전체 판정

- `failures=0`
- `warnings=0`
- `page_save_features=18`
- `validation_guard_features=18`
- `unsupported_404_features=17`
- `save_ready_features=18`

판정은 `🟢 save smoke complete`입니다.

- 저장 가능한 route-native form surface는 전부 registry에 들어왔습니다.
- `boards`, `board-groups`, `config`, `contents`, `faqs`, `layouts`, `mails`, `members`, `menus`, `points`, `polls`, `popups`, `security`, `system`, `theme`, `sms-contacts`, `sms-messages`, `sms-templates`가 전부 representative page save evidence를 가집니다.
- remote-backed 17개 feature는 unsupported 404 UX까지 page level에서 고정됐고, local `security`는 save + validation 기준을 유지합니다.
- `T2-101`은 rollout backlog가 아니라 상설 유지보수 상태로 전환됐습니다.

## 주요 관찰

### 1. page save success 증적은 18건 전부 확보됐다

- registry에 등록된 18개 feature가 모두 `page_save`/`save_ready` 상태입니다.
- representative page test는 생성/적용/저장 mutation 호출 assertion을 직접 고정합니다.
- 신규 저장 surface는 같은 수준의 page save smoke를 같이 추가하지 않으면 안 됩니다.

### 2. validation evidence도 18개 전부 확보됐다

- `boards`, `board-groups`, `config`, `contents`, `faqs`, `layouts`, `mails`, `members`, `menus`, `points`, `polls`, `popups`, `security`, `system`, `theme`, `sms-contacts`, `sms-messages`, `sms-templates`가 전부 validation guard를 가집니다.
- page submit guard가 불안정한 surface는 supporting serializer/form test와 함께 page level validation evidence를 보조합니다.

### 3. unsupported 404 evidence는 remote 17개 전부 확보됐다

- `boards`, `board-groups`, `config`, `contents`, `faqs`, `layouts`, `mails`, `members`, `menus`, `points`, `polls`, `popups`, `system`, `theme`, `sms-contacts`, `sms-messages`, `sms-templates`가 unsupported 404 UX를 page level에서 고정했습니다.
- `security`는 local transport라 unsupported 404 요구 대상이 아닙니다.

## 현재 수준 분류

### `save_ready`

- `board-groups`
- `boards`
- `config`
- `contents`
- `faqs`
- `layouts`
- `mails`
- `members`
- `menus`
- `points`
- `polls`
- `popups`
- `security`
- `sms-contacts`
- `sms-messages`
- `sms-templates`
- `system`
- `theme`

### `warning`

- 없음

## Next

1. 신규 route-native 저장 surface가 추가되면 `FORM_SAVE_SMOKE_COVERAGE.toml`에 먼저 등록하고 같은 수준의 page save/validation/404 evidence를 같이 붙이기
2. `check_form_save_smoke_coverage.py` 결과를 deep audit과 release 직전 체크에서 계속 `warnings=0`으로 유지하기

## 검증

- `python3 scripts/check_form_save_smoke_coverage.py`
- `bash scripts/run_deep_audit.sh`
- `python3 scripts/doc-index.py`
- `bash scripts/check-doc-governance.sh`
