# 서버 전환 동등성 감사 하네스

## 결론

기존 `tools/audit/g5audit.py`의 `SERVER_STATIC_PASS`는 활성 서버 골격과 계약
registry를 검사할 뿐, desktop snapshot 전체가 서버·웹으로 이관됐음을
증명하지 않습니다.

전체 전환 완료 판정은 별도 모듈인 `tools/migration_parity`,
`governance/MIGRATION_PARITY.json`과
`governance/MIGRATION_BATCHES.json`만 담당합니다. 2026-09-01 구현 기준선
`7dce00a`의 정적·runtime·staging 결과는 모두 `PASS`입니다.

| legacy 감사 축 | 기준선 | 유효 매핑 | 현재 판정 |
|---|---:|---:|---|
| Tauri command | 253 | 253 | STATIC PASS |
| React page | 43 | 43 | STATIC PASS |
| Rust workspace member | 21 | 21 | STATIC PASS |
| frontend regression test | 100 | 100 | STATIC PASS |
| Rust regression test | 93 | 93 | STATIC PASS |
| Core operation typed 소비 | 189 | 189 | STATIC PASS |
| 서버 전환 필수 capability | 13 | 13 | STATIC PASS |

R00~R36의 32개 배치는 모두 닫혔습니다. 정적 매핑 712개(legacy 510 +
Core 189 + capability 13)는 유효하고, runtime 감사 대상 legacy/Core
699개에도 항목별 실행 증거가 연결됐습니다. runtime·staging finding은 0개입니다.

## 구조

하네스는 책임별로 분리합니다.

- `inventory.py`: 봉인된 legacy와 활성 서버·웹 inventory 수집
- `manifest.py`: 매핑 계약과 허용 값 검증
- `parity.py`: baseline, 1:1 매핑, target, test, symbol, capability 검증
- `runtime.py`: Git revision·시간에 결속된 evidence와 실시간 staging probe
- `execution.py`: 항목별 관측 case, assertion, 증거 등급, 원본 artifact hash·parent run 검증
- `batch.py`: legacy·Core operation·capability의 단일 배치 소유권과 scoped finding
- `batch_cli.py`: 선택 배치 gate와 전역 잔여 findings 동시 보고
- `report.py`: 원자적 JSON 결과 기록
- `cli.py`: profile 실행과 종료 코드
- `tests/`: 정상 fixture, fail-closed, 변이 회귀

단일 문자열 검사나 파일 존재만으로는 PASS하지 않습니다. 각 legacy
항목에는 다음 정보가 필요합니다.

```json
{
  "legacy_id": "crate::commands::example::cmd_example",
  "disposition": "adapted",
  "target_paths": ["crates/example/src/lib.rs", "apps/admin-server/src/example.rs"],
  "test_paths": ["apps/admin-server/tests/example.rs"],
  "checks": [
    {
      "path": "apps/admin-server/src/example.rs",
      "contains": "example_handler"
    }
  ],
  "evidence_ids": ["example-runtime-readback"],
  "rationale": "Tauri State를 RequestContext와 site-bound service로 교체"
}
```

`disposition`은 `reused`, `adapted`, `redesigned`, `deferred` 중 하나입니다.
`deferred`도 완료로 처리하지 않으며 owner, issue, review date가 있어도
감사는 FAIL합니다.

## Fail-closed 조건

- legacy count 또는 파일 내용 fingerprint 변경
- 미매핑, 중복 매핑, inventory에 없는 ID
- 활성 허용 경계 밖 target 또는 legacy snapshot을 target으로 지정
- 누락 target, 회귀 test, 구현 symbol/계약 check
- symlink 또는 저장소 밖 경로
- pending 필수 capability
- runtime/staging profile의 evidence 누락, status·Git revision 불일치, stale
- 등록한 evidence ID에 해당 항목의 관측 case·assertion이 없는 경우
- raw artifact의 hash·크기·parent run·SHA 불일치 또는 실패/skip case
- regression/mock만으로 Core provider readback이나 실제 browser workflow를 대체한 경우
- staging profile의 실시간 HTTPS probe 실패

### 실행 receipt

legacy/Core 항목의 runtime evidence는 `g5-fleet.migration-execution/v1`
receipt입니다. 각 receipt의 `artifacts`는 `g5-fleet.execution-cases/v1`
원본 JSON을 상대 경로·SHA-256·크기·run ID로 연결합니다. 원본에는 동일
Git SHA와 부모 run ID, 실제 실행한 `cases`가 있어야 합니다. 각 case는
고유 ID, PASS, 비어 있지 않은 assertion, 검증 종류와 관측한
`category`/`item_id` subjects를 가집니다.

Core operation은 `provider_readback` 또는 외부 발송을 하지 않는
`safe_external_boundary` case가 필요합니다. React page에는
`browser_workflow`가 필요하며, 단위 regression 결과만으로 대체하지 않습니다.
테스트·crate 매핑에는 실행된 `regression` case를 연결합니다. 원본을 생성하는
실행기가 관측한 범위만 subjects에 기록하며 수동 일괄 PASS 작성은 금지합니다.

정상 감사 실패는 종료 코드 `1`, manifest·실행 자체의 하네스 오류는
종료 코드 `2`입니다.

## 실행

```bash
# 하네스 자체 회귀·변이 테스트
make test-migration-parity

# 전체 정적 이관 동등성
make audit-migration-parity

# 선택 배치의 정적 gate와 전체 잔여 findings 동시 보고
make check-batch BATCH=R11

# 동일 revision의 로컬 runtime evidence 포함
make audit-migration-runtime

# cached receipt만 보지 않고 staging에 실시간 접속
G5_FLEET_AUDIT_BASE_URL=https://g5-fleet.test \
make audit-migration-staging
```

사설 CA가 시스템 trust store에 없을 때만
`G5_FLEET_AUDIT_CA_FILE`에 공개 CA 인증서 경로를 전달합니다. 검증을
비활성화하는 옵션은 제공하지 않습니다.

결과는 기본적으로
`output/audit/runs/<run_id>/result.json`에 기록됩니다. 보고서에는 전체
legacy·active inventory, 매핑 coverage, capability 상태, 모든 finding과
실시간 probe 결과가 들어갑니다.

배치 보고서는 선택 범위의 정확한 operation·legacy·capability ID와 배치
finding, 전역 finding을 함께 기록합니다. R00 control gate는 712개
미종결 항목 때문에 실패하지 않지만 baseline drift, inventory anomaly,
배치 소유권 누락·중복이 있으면 fail-closed됩니다. R01 이후 배치는 자신이
소유한 미종결 항목이 하나라도 있으면 실패합니다.

## 기준선 변경

`legacy_baseline` fingerprint를 감사 통과 목적으로 갱신하면 안 됩니다.
봉인 snapshot 변경이 승인된 경우에만 변경 내용 검토, inventory 재생성,
매핑 영향 분석, 변이 테스트 후 함께 갱신합니다.

`make check`는 하네스 자체 테스트와 정적 동등성 감사를 필수로 실행합니다.
정적 `make check` PASS는 runtime/package/staging 완료를 대신하지 않습니다.
R36 종결은 구현 기준선에서 별도 runtime, package, staging gate도 통과했고
tracked 종결 증거에 원본 report hash를 기록했습니다. 새 commit에는 기존
revision-bound 증거를 재사용하지 않습니다.
