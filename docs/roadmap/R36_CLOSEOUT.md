# R36 전체 종결 기록

R36은 2026-09-01 구현 기준선
`7dce00afeb3ee7a54980fbcc193708686d53021a`에서 `batch_pass`로 닫았습니다.
새 R 배치를 만들지 않고 정정·실행 증거·브라우저·package·staging을 하나의
종결 배치에서 마감했습니다.

## 완료 결과

| 단계 | 결과 | 완료 근거 |
|---|---|---|
| A 상태·하네스 정정 | PASS | hash-bound case, 실패·skip·stale 증거 제외 |
| B 실제 소비·회귀 | PASS | legacy/Core 699/699, finding 0 |
| C UI·원격 | PASS | 내장 브라우저 41 workflow/43 page, SSH/SFTP 4 roundtrip |
| D 원컨테이너 | PASS | SQLite 영구저장, upgrade, backup·key restore, 실패 rollback |
| E 종결 gate | PASS | `make check`, package 47/47, staging 50/50 |

전체 거버넌스 범위는 legacy 510 + Core 189 + capability 13 = 712개입니다.
실행 증거 감사 대상 699개와 capability 수를 합쳐 표현하지 않습니다.

## 증거 통제

- 실제 성공한 case·assertion·관측 subject만 기록했습니다.
- mock 회귀, 공식 G5 readback, 내장 브라우저, 원격 SSH/SFTP, package,
  staging 증거를 서로 승격하지 않았습니다.
- 내장 브라우저만 사용했고 2사용자×2사이트 격리와 최초 설치·OTP를 포함했습니다.
- SQLite schema 3→4 실제 upgrade에서 신규 zero-count 필드 때문에 정상 row를
  불일치로 오판하던 결함을 발견해 수정하고 재실행했습니다.
- 실패 upgrade는 검증 backup과 이전 image로 복원한 뒤 핵심 row를 읽었습니다.
- routine 외부 Telegram·Web Push·메일·SMS 발송은 0건입니다.

Tracked 종결 증거는
[`R36_BATCH_GATE_PASS.json`](../audits/evidence/R36_BATCH_GATE_PASS.json)이며,
원본 report와 receipt는 경로·SHA-256으로 결속합니다. 자격정보, CA private key,
staging 설정, ignored 실행 산출물은 Git에 포함하지 않습니다.

## 판정 경계

R36은 서버판 전환과 배포 전 인증의 종결입니다. 인터넷 공개 운영 배포,
실제 외부 알림 수신, 독립 Commerce 플러그인 구현은 인증 범위가 아닙니다.
새 commit의 출하 판정은 해당 revision에서 동일 gate를 다시 실행해야 합니다.
