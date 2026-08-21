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
- 전체 migration 미종결: 712 findings
  - legacy inventory 510
  - Core operation typed 소비 189
  - 필수 capability 13

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
| report | 배치 결과와 최초 712 findings 중 남은 수를 함께 기록 |
| git | 검증된 단일 배치 commit과 원격 push SHA |

상태 표기는 다음으로 제한합니다.

- `PLANNED`: 범위만 고정
- `IMPLEMENTED`: 코드와 scoped test만 통과
- `LOCAL_VERIFIED`: 현재 코드로 로컬 G5 readback까지 통과
- `BATCH_PASS`: 위 완료 게이트와 commit·push까지 모두 통과
- `STAGING_VERIFIED`: 현재 commit SHA를 staging에 배포해 재검증

## 4. 배치 순서

현재 manifest 상태는 R00~R27 `batch_pass`, R28 `active`, 나머지는
`planned`입니다. R27까지 닫았고 전체 감사에는 155개 findings가 남아
있으므로 제품 기능 이관 완료를 뜻하지 않습니다.

### 4.1 이관 통제와 공통 기반

| 배치 | 범위 | 주요 결과 |
|---|---|---|
| R00 | 배치 감사 통제 | `MIGRATION_BATCHES.json`, scoped gate, 잔여 findings 계수 |
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
| R36 | 전체 종결 | 최초 712 findings 0, 현재 SHA package·staging 배포, 전체 readback·rollback 증거 |

### 4.4 목표 추진 차수

차수는 연속 작업과 보고를 묶는 단위입니다. 차수 안에서도 R 배치 순서는
건너뛰지 않으며 각 R은 별도 scoped gate, commit, push와 증거 파일을
가집니다. 앞 R이 `BATCH_PASS`가 아니면 같은 차수의 다음 R을 시작하지
않습니다.

| 차수 | 포함 배치 | Core·capability 규모 | 차수 완료 목표 |
|---|---|---:|---|
| 5차 | R27 write-count → R28 mails | Core 14 | 작성 통계와 메일 관리·테스트 발송을 typed 서버·웹으로 닫기 |
| 6차 | R29 sms config → R30 sms-contacts | Core 18 | SMS 설정과 주소록 CRUD·동기화 경계를 닫기 |
| 7차 | R31 sms-templates → R32 sms-messages | Core 19 | SMS 템플릿·발송 작성·이력 workflow를 닫기 |
| 8차 | R33 push → R34 system tools·maintenance | Core 12 | Push와 시스템 점검·정리 도구의 보안 경계를 닫기 |
| 9차 | R35 알림·PWA → R36 전체 종결 | capability 4 | 전역 findings 0, package·staging·전체 readback 종결 |

메일·SMS·Push는 routine 검증에서 실제 외부 발송을 금지하고 fake adapter와
outbox readback으로 증명합니다. 실제 발송은 별도 `LIVE` 승인과 증거가
있을 때만 수행합니다. 시스템 정리 작업은 정확한 대상 표시, 확인,
CSRF와 recent identity step-up 없이는 실행하지 않습니다.

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
global migration findings: 712 → 663
commit/push: 미실행
전체 제품 완료: 아니오
```

분모, runtime 증거, commit·push SHA가 없는 보고는 `BATCH_PASS`가
아닙니다. `deferred`가 하나라도 있으면 해당 배치는 완료가 아닙니다.

## 6. 현재 실행

R00~R27은 닫혔고 현재 목표 추진 단위는 5차의 R28 mails입니다.

1. R27 write-count의 legacy 3개와 Core operation 1개는 runtime·브라우저까지 닫았습니다.
2. R28 mails의 Core 13개와 legacy command·page·test를 재사용 이관합니다.
3. 메일 테스트·회원 메일은 외부 발송 없이 fake adapter와 outbox로 검증합니다.
4. R28 gate·commit·push 후 5차 통합 보고를 작성합니다.
5. global parity는 R36 전까지 FAIL 상태와 잔여 수를 그대로 공개합니다.

실행 명령:

```bash
make check-batch BATCH=R27
make check-batch BATCH=R28
```

배치 gate가 PASS하더라도 전역 `make audit-migration-parity`는 R36 전까지
FAIL과 전체 잔여 수를 그대로 반환합니다.

R00 closeout:

- 구현 commit: `1f10132a1c168fb0bdbac6d75ba647d460f9179e`
- tracked 증거: `docs/audits/evidence/R00_BATCH_GATE_PASS.json`
- R00 finding: 0
- 전역 잔여 finding: 712
- 다음 R01 사전 probe: FAIL 49

R01 closeout:

- 구현 commit: `a53b866aeb60a556ffe179c2516f849533a3f080`
- tracked 증거: `docs/audits/evidence/R01_BATCH_GATE_PASS.json`
- scope: legacy 49, Core 0, capability 0
- reuse: 18 reused / 19 adapted / 12 redesigned / 0 deferred
- R01 finding: 0
- 전역 잔여 finding: 663
- 다음 R02 사전 probe: FAIL 66

R02 closeout:

- 구현 commit: `2193d26feaf2b09e84f8c12deceed646c1d2c75f`
- tracked 증거: `docs/audits/evidence/R02_BATCH_GATE_PASS.json`
- scope: legacy 58, Core 0, capability 8
- reuse: 3 reused / 20 adapted / 35 redesigned / 0 deferred
- R02 finding: 0
- 전역 잔여 finding: 597
- 다음 R03 사전 probe: FAIL 57

R03 closeout:

- 구현 commit: `05a6e8c150a7fcaf3c36de6e87db4b88a1c51c4c`
- tracked 증거: `docs/audits/evidence/R03_BATCH_GATE_PASS.json`
- scope: legacy 57, Core 0, capability 0
- reuse: 2 reused / 27 adapted / 28 redesigned / 0 deferred
- R03 finding: 0
- 전역 잔여 finding: 540
- 다음 R04 사전 probe: FAIL 73

R04 closeout:

- 구현 commit: `fac6a92fc2213d39257fad04fc9c70e75c22dcdd`
- tracked 증거: `docs/audits/evidence/R04_BATCH_GATE_PASS.json`
- runtime 증거: `docs/audits/evidence/R04_REMOTE_RUNTIME_CERTIFICATION.json`
- scope: legacy 72, Core 0, capability 1
- reuse: 1 reused / 55 adapted / 16 redesigned / 0 deferred
- R04 finding: 0
- 전역 잔여 finding: 467
- 다음 R10 사전 probe: FAIL 19

R10 closeout:

- 구현 commit: `e92bf23111f30967940b778f9e55a74171d33dee`
- tracked 증거: `docs/audits/evidence/R10_BATCH_GATE_PASS.json`
- scope: legacy 14, Core 5, capability 0
- reuse: 5 reused / 9 adapted / 0 redesigned / 0 deferred
- R10 finding: 0
- 전역 잔여 finding: 448
- 다음 R11 사전 probe: FAIL 19

R11 closeout:

- 구현 commit: `302571c6d699f3197b031d8a425ab8e53bac4f46`
- tracked 증거: `docs/audits/evidence/R11_BATCH_GATE_PASS.json`
- scope: legacy 9, Core 10, capability 0
- reuse: 1 reused / 8 adapted / 0 redesigned / 0 deferred
- R11 finding: 0
- 전역 잔여 finding: 429
- 다음 R12 사전 probe: FAIL 26

R12 closeout:

- 구현 commit: `b330a2a32c6339434e0182413b25b3feb3e36338`
- tracked 증거: `docs/audits/evidence/R12_BATCH_GATE_PASS.json`
- scope: legacy 16, Core 10, capability 0
- reuse: 0 reused / 16 adapted / 0 redesigned / 0 deferred
- 공식 G5 v5.6.32 local runtime 회원 10 operation readback PASS
- R12 finding: 0
- 전역 잔여 finding: 403
- 다음 R13 사전 probe: FAIL 37

R13 closeout:

- 구현 commit: `8cc1ecbec6d57f7865b05fd4a5bc4735f942ad7f`
- tracked 증거: `docs/audits/evidence/R13_BATCH_GATE_PASS.json`
- scope: legacy 20, Core 17, capability 0
- reuse: 0 reused / 20 adapted / 0 redesigned / 0 deferred
- 공식 G5 v5.6.32 local runtime canonical·legacy 그룹 17 operation readback PASS
- Chromium 데스크톱·390px 모바일 그룹 생성·재조회 UI PASS
- R13 finding: 0
- 전역 잔여 finding: 366
- 다음 R14 사전 probe: FAIL 17
