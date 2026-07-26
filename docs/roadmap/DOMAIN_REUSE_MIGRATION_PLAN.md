# 도메인별 재사용 이관 배치

## 1. 결론

기존 Tauri 제품을 새로 만들지 않습니다. 기존 React 화면, 컴포넌트,
타입, 검증 규칙, 스타일과 테스트를 우선 추출하고, 중앙 Tauri transport만
Rust Axum HTTP·WebSocket 경계로 교체합니다.

2026-07-26 감사 기준 출발점은 다음과 같습니다.

- legacy React: 43개 feature page, TS/TSX 1,285개, 약 74,282 LOC
- 직접 `@tauri-apps`를 import하는 파일: 17개
- raw `invoke()` 호출: 중앙 client 1곳
- 활성 React: route 3개, TS/TSX 20개, 약 3,439 LOC
- Core OpenAPI 소비 대상: 29개 domain, 189 operations
- 전체 migration 미종결: 523 findings

따라서 UI는 재사용 가능성이 높지만 아직 이관 완료가 아닙니다. 과거
B00~B10은 기반 작업 이력으로만 보존하고, 아래 R 배치의 PASS 증거 없이
전환 완료를 주장하지 않습니다.

## 2. 고정 실행 규칙

1. 한 번에 활성화하는 배치는 하나뿐입니다.
2. 선행 배치가 `BATCH_PASS`가 아니면 다음 배치를 시작하지 않습니다.
3. 각 도메인에서 신규 UI 작성 전에 legacy 재사용 목록을 먼저 확정합니다.
4. 화면 구조·동작·스타일·테스트는 우선 재사용하고 Tauri 의존 경계만
   Axum HTTP·WebSocket transport로 바꿉니다.
5. 범용 JSON console, route registry와 generic `Value` 통신은 실제
   도메인 UI·typed DTO·workflow 소비로 인정하지 않습니다.
6. `products/admin-desktop`은 불변 참조 snapshot으로 유지합니다.
7. Shop 26개는 공급자 계약만 보존하며 Core 완료 수치에 넣지 않습니다.
8. routine 테스트에서 메일·SMS·Telegram·Web Push를 외부로 발송하지
   않습니다.
9. 배치마다 검증 후 별도 commit과 push를 수행합니다.
10. 배치 PASS는 제품 전체 완료가 아닙니다. 전체 완료는 R36에서만
    판정합니다.

## 3. 배치 완료 게이트

R00에서 `make check-batch BATCH=Rxx`를 구현합니다. 각 배치는 아래
증거를 모두 가져야 합니다.

| 증거 | 필수 내용 |
|---|---|
| scope | 대상 operation ID, legacy command/page/test의 정확한 분모 |
| reuse | `reused`, `adapted`, `redesigned`, `deferred` 파일 목록과 사유 |
| contract | canonical OpenAPI와 typed Rust DTO·client·service |
| server | 사용자 session과 명시적 `site_id`에 귀속된 Axum route |
| web | 실제 legacy workflow를 보존한 typed HTTP·WebSocket 소비 |
| test | Rust·React scoped test와 Tauri active dependency 금지 |
| runtime | 로컬 G5 저장·재조회·원복 또는 read-only readback |
| parity | 선택 항목 0 unmapped, 0 pending, 0 invalid evidence |
| report | 배치 결과와 전체 523 findings 중 남은 수를 함께 기록 |
| git | 검증된 단일 배치 commit과 원격 push SHA |

상태 표기는 다음으로 제한합니다.

- `PLANNED`: 범위만 고정
- `IMPLEMENTED`: 코드와 scoped test만 통과
- `LOCAL_VERIFIED`: 현재 코드로 로컬 G5 readback까지 통과
- `BATCH_PASS`: 위 완료 게이트와 commit·push까지 모두 통과
- `STAGING_VERIFIED`: 현재 commit SHA를 staging에 배포해 재검증

## 4. 배치 순서

모든 배치의 초기 상태는 `PLANNED`입니다.

### 4.1 이관 통제와 공통 기반

| 배치 | 범위 | 주요 결과 |
|---|---|---|
| R00 | 배치 감사 통제 | machine-readable manifest, scoped gate, 잔여 findings 계수 |
| R01 | React 공통 기반 재사용 | AppShell, navigation, 공통 component·style·type·test 추출, 중앙 transport 교체 |
| R02 | Fleet 설치·인증·보안 | 설치 wizard, master 계정, TOTP·recovery, session·lockout·audit workflow |
| R03 | 사이트·활동·backup | 사이트 등록/수정/삭제, health, activity, backup·restore UI와 서버 흐름 |
| R04 | SSH·SFTP·terminal | SSH profile/검증, terminal WebSocket, SFTP streaming·중단복구 |

R01은 43개 page를 빈 화면으로 일괄 복사하지 않습니다. 공통 기반만 먼저
추출하고 각 page는 아래 해당 도메인 배치에서 workflow 단위로 이관합니다.

### 4.2 Core OpenAPI 도메인

| 배치 | 도메인 | operations |
|---|---|---:|
| R10 | admin + config + schema | 5 |
| R11 | auth + member self + system auth | 10 |
| R12 | members | 10 |
| R13 | groups | 17 |
| R14 | boards | 7 |
| R15 | contents | 5 |
| R16 | faq-masters + faqs | 14 |
| R17 | menus | 7 |
| R18 | layouts | 8 |
| R19 | theme | 4 |
| R20 | points | 7 |
| R21 | polls + system polls | 10 |
| R22 | popups + system popups | 10 |
| R23 | popular | 3 |
| R24 | visits | 3 |
| R25 | reports | 3 |
| R26 | qa + system qa | 3 |
| R27 | write-count | 1 |
| R28 | mails + system mail | 13 |
| R29 | sms config | 3 |
| R30 | sms-contacts | 15 |
| R31 | sms-templates | 13 |
| R32 | sms-messages | 6 |
| R33 | push | 2 |
| R34 | system browscap·purge·phpinfo·health | 10 |
|  | **합계** | **189** |

`system`의 29 operations는 실제 업무 도메인으로 나눕니다. auth 3개는
R11, polls 5개는 R21, popups 5개는 R22, QA 2개는 R26, mail 4개는
R28, 나머지 10개는 R34가 소유합니다.

### 4.3 제품 종결

| 배치 | 범위 | 완료 기준 |
|---|---|---|
| R35 | 알림·PWA | outbox, fake delivery, Web Push subscription, offline/cache 안전 |
| R36 | 전체 종결 | 523 findings 0, 현재 SHA package·staging 배포, 전체 readback·rollback 증거 |

## 5. 배치별 보고 형식

완료 보고는 반드시 아래 형식을 사용합니다.

```text
R13 GROUPS
상태: LOCAL_VERIFIED
OpenAPI: 17/17
legacy page: 2/2
legacy command: 17/17
legacy test: 8/8
reuse: 31 reused / 6 adapted / 1 redesigned / 0 deferred
global migration findings: 523 → 474
commit/push: 미실행
전체 제품 완료: 아니오
```

분모, runtime 증거, commit·push SHA가 없는 보고는 `BATCH_PASS`가
아닙니다. `deferred`가 하나라도 있으면 해당 배치는 완료가 아닙니다.

## 6. 첫 실행

첫 작업은 R00입니다.

1. 배치 manifest에 위 operation 소유권을 고정합니다.
2. legacy command/page/test를 배치에 1:1 배정합니다.
3. scoped audit가 선택 배치의 누락을 fail-closed로 검출하게 합니다.
4. global parity는 R36 전까지 FAIL 상태와 잔여 수를 그대로 공개합니다.
5. R00 검증·commit·push 후에만 R01을 시작합니다.
