# Gnuboard 호환 매트릭스

> 기준일: 2026-03-04
> 대상: `gnubard5restapi-php` (`/api` 독립 구동 모드)

## 1. 지원 정책

- API 런타임은 `PHP 8.1+`를 필수로 한다.
- 그누보드 코어 파일은 수정하지 않는다.
- 업그레이드 전에는 반드시 계약 테스트 + 스모크 테스트를 통과해야 한다.

## 2. 버전 매트릭스

| 구분 | 버전 | 상태 | 비고 |
|------|------|------|------|
| Gnuboard5 | 5.5.x 계열 | Supported | 운영 기준 |
| PHP | 8.1, 8.2, 8.3 | Supported | 최소 8.1 |
| PHP | 8.0 이하 | Unsupported | 문법/의존성 미지원 |

## 3. 계약 테스트 게이트

아래 명령을 모두 통과해야 배포 가능으로 판정한다.

```bash
./scripts/check_hardcoding.sh
composer run analyse
composer run test
```

계약 레이어 검증은 `tests/contract/g5-repository/`를 기준으로 한다.

## 4. 업그레이드 절차

1. 스테이징에서 그누보드 버전 변경
2. 계약 테스트 + 실패 시나리오 테스트 실행
3. `/api/v1/health`, `/api/docs/index.html`, 핵심 엔드포인트 스모크
4. 이상 시 즉시 롤백 스크립트 실행
5. 통과 시 운영 반영

## 5. 실패 시 차단 기준

- 계약 테스트 실패
- RFC 7807 에러 포맷 훼손
- `g5_independent` 헬스 체크 실패
- 관리자 경로 인증/인가 실패

위 항목 중 1건이라도 실패하면 배포를 중단한다.
