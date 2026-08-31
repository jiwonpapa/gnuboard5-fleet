# R36 전체 종결 실행 계획

2026-08-31 사용자가 남은 작업의 목표 추진과 단계별 검증·커밋·푸시를
승인했습니다. 새로운 R 배치를 만들지 않고 현재 `R36 active` 안에서 진행합니다.

## 기준선과 범위

- 기준선: `94c8a1c4e6c932f754b81effae2d558e39d4f770`, main/origin 일치
- 정적: legacy 510, Core 189, capability 13, finding 0
- runtime: 항목별 증거 연결 누락 699 + 원격 증거 SHA/기간 문제 2
- 이전 브라우저·패키지·스테이징의 PASS는 현재 revision PASS가 아님
- Core 밖의 일반 게시판·Commerce 공급 계약은 보존하며 범위를 확대하지 않음
- routine 외부 메일·SMS·Telegram·Web Push 발송 0 유지

## 단계와 마감

| 단계 | 수행 내용 | 마감 조건 |
|---|---|---|
| A | 상태 문서 정정, 항목별 실행 receipt와 변이 회귀 | 등록 ID/단순 PASS로 다른 기능까지 인증할 수 없음 |
| B | 실제 G5 실행·도메인 readback/원복·실행 테스트 수집 | 각 항목이 관측 case와 원본 hash에 연결, 누락/skip은 FAIL |
| C | 내장 브라우저 설치·OTP·사이트 격리·도메인·반응형 검증, 원격 SSH/SFTP 재검증 | 사용자 인증 승인 경계 준수, 실제 UI/원격 동작 증거 확보 |
| D | 원컨테이너 Rust+React+SQLite, 영구 state, HTTPS/보안헤더, 설치/재시작/업데이트/복원 | ARM64/AMD64 대상별 실제 package gate, 외부 DB 필수 0 |
| E | 동일 SHA 전체 회귀·스테이징·실패 rollback, 문서/배치 증거 종결 | 전역 정적/실행/배포 gate PASS, R36 tracked 완료 증거 |

단계별 검증 후 커밋·푸시합니다. 새 commit이 생기면 revision-bound 증거를
기존 파일의 SHA/날짜 수정으로 재사용하지 않고 재실행합니다. 실행 결과는
ignored output에 보존하고 최종 완료 문서는 그 결과와 정확한 구현 commit을
참조합니다. 미래 commit hash를 넣거나 증거를 수동으로 조작하지 않습니다.

## 증거 통제

- 실행기는 실제 성공한 case·assertion·관측한 subject만 기록합니다.
- mock 테스트, 실제 G5 readback, 내장 브라우저, 원격 SSH, package, staging은
  서로 구분합니다. 동일한 일반 PASS 파일을 699개 ID에 붙이지 않습니다.
- 브라우저는 Codex 내장 브라우저만 사용합니다. 비밀번호·OTP 입력 직전에
  목적지와 테스트 계정을 명시해 승인받습니다. 별도 headed 브라우저나 인증
  우회용 cookie 주입은 사용하지 않습니다.
- 기존 로컬/스테이징 설치·DB·키는 소유권과 백업을 확인하기 전에 지우지 않습니다.
- 공개 GitHub Release/tag, 운영 사이트 변경, 실제 외부 발송은 자동으로 하지 않습니다.

## 현재 상태

A 구현: 문서 정정, hash-bound 원본 case 검증, 항목별 증거 종류·Git SHA·
OpenAPI SHA·G5 commit·부모 실행 ID·시각 검증과 실패 항목의 valid 집계 제외.
하네스 회귀 36개와 전역 정적 감사 PASS를 확인했고 `0a76e05`로 커밋·푸시했습니다.
전체 `make check`의 최근 완료 지점은 `677bec6`입니다. 이후 변경은 해당
revision에서 다시 검증합니다.

B 진행 중: 요청 ID별 실제 Rust→PHP 응답과 성공한 도메인 checkpoint를
수집하는 producer를 구현했습니다. HTTP 200만 있는 경우, 직접 PHP 호출,
skip, 잘못된 실행 ID는 소비 증거가 아닙니다. 외부 발송은 별도 safe boundary로
기록합니다. `677bec690ad107aca47f5946191d83cc8f7042c2`에서 Core 189/189의
항목별 실행 증거를 확보했습니다. 실제 provider readback 178개와 외부 발송을
막은 safe boundary 11개이며, 외부 발송 성공 189개라는 뜻이 아닙니다.
실행 중 PHP container의 8,524개 파일 SHA-256을 composed source와 대조했습니다.
이때 전역 runtime은 여전히 FAIL 512개입니다: legacy 510개 실행 증거 연결 누락,
과거 R04 원격 증거 SHA/유효 기간 2개. 정적 매핑을 실행 증거로 대체하지 않습니다.
이전 로컬 설치 상태를 보존하며 실행별 Compose project와 PID 시작 시각을
검사하여 다른 실행을 잘못 종료하지 않도록 했습니다.

C 진행 중: 내장 브라우저에서 승인된 검증 계정으로 로그인·OTP 재인증,
보안 설정·사이트 이름·G5 설정 저장/readback/원복을 수행했습니다. 이는 6개
참조 페이지에 대응하는 예비 관측이며 43개 페이지 전체 또는 현재 HEAD 인증이
아닙니다. FAQ 중복 목록 요청의 선택 초기화 경합은 `f00d11b`로 수정했으며
웹 205개 테스트·타입·린트·빌드가 PASS했습니다. 설정 설명의 PHP 코드 노출은
추출기를 수정하고 동적 표현식 17개를 설명 override로 보존했습니다. 24개 schema,
659개 field의 설명·생성 metadata 외 구조는 동일하며 PHP 설명 조각은 0개입니다.

증적: `output/certification/r36-b/make-check-677bec6.log`,
`output/certification/r36-b/runtime-parity-677bec6.log`,
`output/certification/r36/browser-677bec6/cases.partial.json`.
마지막 파일은 `IN_PROGRESS` 예비 관측이며 완료 receipt가 아닙니다.
D/E 원컨테이너·스테이징·동일 SHA 최종 gate는 아직 재검증하지 않았습니다.

R36은 전체 종결 전까지 `active`입니다. 정적 매핑 완료와 제품
출하 완료를 분리하며 package/staging을 생략한 채 전체 완료를 선언하지 않습니다.
