# ADR-0015: local, package, staging 인증 증거 분리

- 상태: Accepted
- 배치: B10

## 결정

B10 인증은 다음 세 profile을 순서대로 실행하며 서로 대신하지 않습니다.

1. `LOCAL_RUNTIME_PASS`
2. `PACKAGE_PASS`
3. `STAGING_PASS`

local profile은 잠긴 공식 G5 v5.6.32와 현재 PHP Connector를 실제
PHP+MariaDB 환경에서 기동합니다. 이 MariaDB는 관리 대상 G5 자체의
필수 DB를 재현하는 test-only service이며 G5 Fleet 배포 구성에는
포함되지 않습니다.

Fleet의 production SSRF 정책은 private·loopback 주소를 계속 차단합니다.
local E2E만 별도 Cargo feature `local-certification`과 명시적
`G5_FLEET_CERTIFICATION_MODE=local`을 함께 요구합니다. production
Containerfile은 이 feature를 빌드하지 않습니다.

## local 증거

- 공식 G5 version·commit·tree·composed runtime fingerprint
- PHP Connector health/version과 Shop 설치
- 2사용자×2사이트 session·site·secret 격리
- Connector login과 `cf_10` 수정·재조회·원복
- Chromium named session 두 개의 실제 Admin Web 가시성
- 브라우저에 G5 비밀번호·JWT 비노출
- routine 외부 알림 발송 0

## package 증거

release manifest의 image ID, image 내장 version/revision, PHP Connector
package identity, 4개 artifact checksum과 두 SBOM을 재검증합니다. 별도의
임시 state에서 clean install, 데이터 보존 upgrade, 암호화 master-key
복원과 존재하지 않는 image upgrade rollback을 실행합니다.

## staging 증거

staging은 명시적 HTTPS origin, provider instance ID, 현재 release image
deployment receipt와 backup/restore rollback receipt가 모두 있어야
실행합니다. `/readyz`와 `/api/v1/meta`가 현재 Git revision과 image
version을 되돌려야 `STAGING_PASS`가 됩니다.

staging target 또는 receipt가 없으면 local/package PASS를 staging으로
승격하지 않습니다. Telegram·Web Push 실제 발송은 별도 요청이 있을 때만
검증합니다.
