# 통합 감사 보고서 — 2026-03-10

> **기준 시점**: 2026-03-10 12:30 KST  
> **범위**: 현재 `php` worktree, `./scripts/run_quality_gates.sh`, `composer test`, `composer analyse`, 문서 거버넌스, 하드코딩 검사, 외부 인증/관리자 SSOT

## 결론

**🟢 통과**

- 전체 품질 게이트(`./scripts/run_quality_gates.sh`)가 다시 통과합니다.
- service coverage는 `80.17% (5449/6797)`로 복구됐고, 하드 기준 `80%`를 다시 넘겼습니다.
- 외부 인증 실 smoke는 여전히 스테이징 credential 부재로 `Blocked`지만, 품질/배포 게이트 blocker는 아닙니다.

## 이번 라운드에서 닫힌 항목

### 1. 스테이징 SMS 운영 방침 고정

- `ADMIN_SMS_ENABLED=false`면 `/admin/sms/*` 라우트를 등록하지 않도록 바꿨습니다.
- 따라서 스테이징 canonical은 `g5_sms5_*` 테이블/icode 운영 준비 전까지 `404 비노출`입니다.

### 2. 포인트/추천/스크랩 경합 감사

- `PointMutationRepository`, `FilePointRepository`, `PostScrapMutationRepository`, `LikeRepository`를 재감사했습니다.
- 실제 우선 보강 대상은 `LikeRepository`의 `INSERT -> counter UPDATE` 원자성 부족 1건이었고, 이번에 트랜잭션으로 보강했습니다.
- 회귀 테스트는 `tests/Like/LikeRepositoryTest.php`, `tests/File/FilePointRepositoryTest.php`를 추가했습니다.

### 3. 외부 인증 staging blocker 확인

- 2026-03-10 스테이징 `/home/neojins/public_html/.env` 실측에서 `AUTH_EXTERNAL_GOOGLE_*`, `AUTH_EXTERNAL_KAKAO_*`, `ADMIN_SMS_ENABLED` 항목이 비어 있었습니다.
- 따라서 `AUTH-308`, `AUTH-310`은 자격증명 반영 전까지 `Blocked`가 맞습니다.

### 4. 스타일 정리 범위 확정

- `.php-cs-fixer.dist.php`를 추가해 적용 범위를 `api/`, `tests/`, `scripts/`로 고정했습니다.
- 같은 기준의 dry-run JSON 결과 현재 수정 후보는 `111 files`입니다.

### 5. Service coverage 하드 게이트 복구

- Admin/System/SMS/FAQ/File 중심 저커버리지 서비스 테스트를 대폭 보강했습니다.
- `composer run test:coverage:ci`와 `php scripts/check_service_coverage.php build/coverage/clover.xml 80` 기준이 모두 다시 녹색입니다.

## 활성 리스크

| 항목 | 상태 | 메모 |
|---|---|---|
| Service coverage 게이트 | ✅ | `80.17% (5449/6797)` |
| Google staging smoke | 🟡 | credential 미주입 |
| Kakao staging smoke | 🟡 | credential 미주입 |
| SMS 관리자 staging 노출 | ✅ | `ADMIN_SMS_ENABLED=false` 정책으로 차단 가능 |

## 권고 우선순위

1. 스테이징 `Google`/`Kakao` credential 반영 후 `AUTH-308`, `AUTH-310` 재개
2. `php-cs-fixer` 수정 후보 `111 files`를 작은 묶음으로 분할 정리
3. 스테이징 실 smoke 결과를 다시 근거 문서에 반영
