# 서버 전환 동등성 감사 하네스

## 결론

기존 `tools/audit/g5audit.py`의 `SERVER_STATIC_PASS`는 활성 서버 골격과 계약
registry를 검사할 뿐, desktop snapshot 전체가 서버·웹으로 이관됐음을
증명하지 않습니다.

전체 전환 완료 판정은 별도 모듈인 `tools/migration_parity`,
`governance/MIGRATION_PARITY.json`과
`governance/MIGRATION_BATCHES.json`만 담당합니다. 현재 정적 감사
결과는 `FAIL`입니다.

| legacy 감사 축 | 기준선 | 유효 매핑 | 현재 판정 |
|---|---:|---:|---|
| Tauri command | 253 | 0 | FAIL |
| React page | 43 | 1 | PARTIAL |
| Rust workspace member | 21 | 10 | PARTIAL |
| frontend regression test | 100 | 16 | PARTIAL |
| Rust regression test | 93 | 22 | PARTIAL |
| Core operation typed 소비 | 189 | 0 | FAIL |
| 서버 전환 필수 capability | 13 | 0 | FAIL |

R01은 공통 기반 49개를 닫아 전역 finding을 712개에서 663개로
줄였습니다. 활성 server route 35개와 Core registry 189개는 현황 inventory입니다. 이
숫자만으로 253개 command, 43개 page 또는 실제 업무 흐름의 이관을
인증하지 않습니다.

## 구조

하네스는 책임별로 분리합니다.

- `inventory.py`: 봉인된 legacy와 활성 서버·웹 inventory 수집
- `manifest.py`: 매핑 계약과 허용 값 검증
- `parity.py`: baseline, 1:1 매핑, target, test, symbol, capability 검증
- `runtime.py`: Git revision·시간에 결속된 evidence와 실시간 staging probe
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
- staging profile의 실시간 HTTPS probe 실패

정상 감사 실패는 종료 코드 `1`, manifest·실행 자체의 하네스 오류는
종료 코드 `2`입니다.

## 실행

```bash
# 하네스 자체 회귀·변이 테스트
make test-migration-parity

# 전체 정적 이관 동등성
make audit-migration-parity

# 선택 배치의 정적 gate와 전체 잔여 findings 동시 보고
make check-batch BATCH=R02

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
따라서 현재처럼 전체 매핑이 미완료이면 기존 좁은 서버 gate가 PASS해도
최종 `make check`는 FAIL하는 것이 정상입니다.
