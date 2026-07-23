# 그누보드5 연동계층 설계서 (v0.2)

> **작성일**: 2026-03-04
> **대상**: Gnuboard5 REST API 프로젝트
> **헌법 근거**: [Constitution.md](../../.agent/Constitution.md) §1, §4, §8.5

> [!IMPORTANT]
> 본 설계는 **오직 REST API 개발 및 런타임 환경에만 한정**됩니다.
> 기존 그누보드5 웹사이트(프론트엔드·관리자 페이지)의 동작·아키텍처·코어 로직에는 어떠한 영향도 주지 않습니다.

---

## 1. 문서 목적

본 문서는 아래 의사결정을 위한 설계서이다.

1. 그누보드5 함수를 API 코드에서 직접 호출할지
2. 연동계층(Repository Adapter)을 도입할지
3. 도입한다면 어떤 범위와 순서로 적용할지

**핵심 원칙**: "전면 교체"가 아니라 "호환성 리스크를 줄이는 점진 전환"을 선택한다.

---

## 2. 문제 정의

초기 구조에서는 `common.php` 로드 및 그누보드 함수 직접 호출이 혼재되어 있었다.

- 예: `get_member`, `sql_query`, `sql_fetch`, `insert_point`
- 현재 상태: 서비스/컨트롤러 직접 호출은 제거했고, Repository는 PDO 기본 경로 + 제한적 레거시 폴백(기본 비활성)으로 운영

**예상 리스크**:

| # | 리스크 | 영향 |
|---|--------|------|
| 1 | 함수 시그니처/동작 변경 | 런타임 장애 |
| 2 | 도메인 서비스가 G5 세부사항에 오염 | 테스트 어려움 증가 |
| 3 | 변경 영향범위 확대 | 배포 리드타임 증가 |

---

## 3. 용어 정리

| 용어 | 정의 |
|------|------|
| HTTP 미들웨어 | Slim request/response 파이프라인 구성요소 |
| 연동계층 (본 문서 대상) | 도메인 Service와 그누보드 코어 사이의 호환 계층. 헌법(§1.3)상 **Repository** 역할을 수행 |
| Port | Repository 인터페이스. 도메인이 필요한 기능 계약만 정의 |
| G5 Repository | Port의 구현체. G5 함수 호출·매핑·예외 변환을 수행하는 Adapter |

---

## 4. 대안 비교 및 결론

| 대안 | 장점 | 단점 | 적합 시점 |
|------|------|------|-----------|
| A. 함수 직접 호출 유지 | 구현 속도 빠름, 초기 비용 낮음 | 업데이트 취약, 테스트 어려움, 결합도 높음 | PoC/단기 실험 |
| **B. 연동계층 도입 (채택)** | 변경 흡수, 테스트 용이, 영향범위 축소 | 초기 설계/전환 비용 발생 | 운영/지속개발 단계 |

**결론**: 운영 안정성과 업데이트 대응이 중요하므로 **B를 채택**한다.

---

## 5. 목표 / 비목표

### 목표

1. API 도메인 코드는 그누보드 함수명을 직접 참조하지 않는다.
2. 그누보드 변경 영향은 Repository 내부로 국소화한다.
3. 오류 반환은 RFC 7807 정책을 유지한다. (헌법 §0.10-1)
4. 도메인별 전환 상태를 추적 가능하게 한다.

### 비목표

1. 그누보드 코어 소스 수정 (헌법 §0.7 불가침)
2. 단기간 내 모든 도메인의 완전 전환
3. 기존 API 계약(OpenAPI)의 파괴적 변경

---

## 6. 제안 아키텍처

```
[HTTP Request]
    ↓
[Middleware] → CORS, JWT, Rate-Limit
    ↓
[Controller] → 입력 검증 + 응답 포맷팅
    ↓
[Service] → 비즈니스 로직
    ↓
[Port (Interface)] → 도메인 계약
    ↓
[G5 Repository] → G5 함수 호출 + DTO 매핑 + 예외 변환
    ↓
[Gnuboard Core] → common.php / g5_* 테이블
```

### 구성 요소

| 구성 요소 | 역할 | 예시 |
|-----------|------|------|
| **Port (Interface)** | 도메인이 필요한 기능 계약만 정의. 헌법상 Repository 인터페이스 | `MemberRepository`, `PostRepository`, `PointRepository` |
| **G5 Repository** | 헌법 데이터 I/O 레이어이자 G5 Adapter. 함수 호출·검증·매핑 담당 | `G5MemberRepository`, `G5PostRepository` |
| **Mapper / DTO** | 그누보드 raw array → API 응답용 DTO 변환 | `MemberDto`, `PostDto` |
| **Compatibility Guard** | 부트 시 필수 함수·상수 존재 점검. 미지원 시 fail-fast | `G5CompatibilityChecker` |

---

## 7. 설계 규칙 (필수)

| # | 규칙 | 헌법 근거 |
|---|------|-----------|
| 1 | 서비스/컨트롤러에서 `sql_*`, `get_member` 등 직접 호출 금지. 모든 G5 함수 접근은 Repository 내부로만 격리 | §1.3 |
| 2 | Repository 외부로 그누보드 전역 상태(`$g5`, 전역 상수) 누출 금지 | §8.5 |
| 3 | 모든 연동 예외는 RFC 7807로 변환 (parse error 포함) | §0.10-1 |
| 4 | Repository I/O는 DTO/배열 스키마로 명시 | §2.1 SRP |
| 5 | 하드코딩 금지: 환경값은 `.env` 또는 주입된 설정만 사용 | §2.3 |
| 6 | Auth 구현 시 코어 해시 호환 규칙(`password_verify` + `G5_ENCRYPT_FUNC` 폴백)을 유지하고 독자 해싱 규격 추가 금지 | §6.1 |

---

## 8. 전환 전략 (도메인별 점진 도입)

### 우선순위

| 순위 | 도메인 | 사유 |
|------|--------|------|
| 1 | `Auth` / `Member` | 인증·회원은 장애 파급이 가장 큼 |
| 2 | `Post` / `Comment` / `Board` | 핵심 CRUD 도메인 |
| 3 | `Point` / `Like` / `Menu` / `Config` | 부가 기능 도메인 |
| 4 | `File` | 파일 처리는 함수 유틸 이관 후 완료 |

### 도메인당 수행 절차

1. Port 인터페이스 정의
2. G5 Repository 구현
3. 서비스 코드에서 직접 호출 제거
4. 계약 테스트(성공/실패/권한) 추가
5. 배포 후 모니터링 및 로그 확인

---

## 9. 버전 호환 정책

1. 지원 대상 그누보드 버전을 문서에 고정 표기한다.
2. 버전 업그레이드 시 Repository 계약 테스트를 먼저 통과해야 한다.
3. 미지원 변경 감지 시 배포 차단(파이프라인 실패)한다.

**관련 파일**:
- `docs/compatibility/gnuboard-version-matrix.md`
- `tests/contract/g5-repository/*`

---

## 10. 배포/운영 가드레일

| 단계 | 내용 |
|------|------|
| CI | 정적검사 + 하드코딩 검사 + PHPUnit + 계약 테스트 |
| 배포 조건 | 테스트 100% 통과 시에만 패키징/배포 (헌법 §0.10-3) |
| 장애 대응 | Repository 오류 로그에 함수명·입력키·스택트레이스 기록. API 응답은 Problem Details만 반환 |

---

## 11. 롤백 전략

| 방법 | 설명 |
|------|------|
| **기능 토글** | `USE_G5_REPO_AUTH=true` 형태로 도메인별 단계 전환 |
| **장애 시** | 도메인 단위로 즉시 이전 경로 복귀 |
| **롤백 후** | 동일 요청의 재현 로그 확보 후 Repository 패치 |

---

## 12. 완료 기준 (Definition of Done)

- [x] 우선순위 도메인(Auth/Member)이 Port + G5 Repository 구조로 전환됨
- [x] 파일 처리 도메인(File)이 파일 유틸을 Repository로 격리 완료
- [x] 직접 그누보드 함수 호출이 서비스/컨트롤러에서 제거됨
- [x] 계약 테스트 및 실패 시나리오 테스트가 추가됨 (`tests/contract/g5-repository/*`)
- [x] 호환 매트릭스 문서가 최신 상태로 유지됨 (`docs/compatibility/gnuboard-version-matrix.md`)
- [x] 스테이징에서 배포/롤백 리허설 1회 이상 완료됨 (`scripts/deploy_staging.sh --rehearsal`)

---

## 13. 결정 사항 (Resolved)

| # | 항목 | 결정 |
|---|------|------|
| 1 | 도메인별 기능 토글 저장 위치 | `.env`를 단일 소스로 사용 |
| 2 | 계약 테스트 fixture 전략 | DB 의존 없는 계약 테스트 + 실패 시나리오 테스트 병행 |
| 3 | 그누보드 버전 관리 | 매트릭스 문서 고정 + 배포 전 계약 테스트 통과를 게이트로 강제 |

---

## 14. 레거시 장애전파 차단 파이프라인

> [!CAUTION]
> `common.php`의 parse error는 **try/catch로 잡을 수 없습니다.**
> 방어 지점은 무조건 **런타임 전(배포 시점)**입니다.

### 5단계 방어 체계

| 단계 | 전략 | 효과 |
|------|------|------|
| **① 엔트리포인트 분리** | `/health`, `/docs`는 `common.php` 미의존으로 서비스 | 코어 장애 시에도 관제·문서 생존 |
| **② 지연 로딩 Repository** | `index.php` 전역 선로딩 금지. G5가 필요한 Repository 부트 시에만 `require_once` | 장애 폭발 반경을 "G5 의존 엔드포인트"로 축소 |
| **③ 배포 게이트** | `php -l` 문법 검사 + 부트 스모크 + API 계약 스모크. 1건 실패 시 중단 | 결함 코드 프로덕션 유입 차단 |
| **④ 원자 배포 + 즉시 롤백** | `releases/<timestamp>` + Symlink 전환. 스모크 실패 시 이전 경로 원복 | 서비스 셧다운 시간 → 수초 단위 방어 |
| **⑤ 버전 고정 + 호환 매트릭스** | G5 메이저/마이너 고정. 스테이징 계약 테스트 통과 후만 업그레이드 허용 | 비호환 업그레이드 사전 차단 |

### 장애 시나리오별 커버리지

| 장애 시나리오 | 방어 단계 | 결과 |
|-------------|----------|------|
| `common.php` parse error | ①+② | Health/Docs 생존, G5 의존 엔드포인트만 503 |
| G5 함수 시그니처 변경 | ②+⑤ | Repository 내부에서 예외 포착 → RFC 7807 |
| G5 버전 비호환 업그레이드 | ③+⑤ | 배포 게이트 계약 테스트 실패 → 배포 차단 |
| 잘못된 코드 배포 | ③+④ | 스모크 실패 → Symlink 즉시 원복 |
| G5 전역 상태 오염 | §7-2 | Repository 외부 누출 금지 규칙으로 방어 |

---

## 15. 다음 액션

1. 매 릴리스 전 `scripts/deploy_staging.sh --dry-run`으로 사전 점검
2. 운영 반영 직전 `scripts/deploy_staging.sh` 표준 배포 실행
3. 장애 발생 시 `scripts/rollback_staging.sh`로 즉시 원복

---

## 부록 A. 최소 인터페이스 예시

### Port (Interface)

```php
<?php
declare(strict_types=1);

interface MemberRepository
{
    public function findById(string $memberId): ?MemberDto;
    public function create(MemberCreateDto $input): MemberDto;
}
```

### G5 Repository (Adapter 구현체)

```php
<?php
declare(strict_types=1);

final class G5MemberRepository implements MemberRepository
{
    private bool $coreLoaded = false;

    public function findById(string $memberId): ?MemberDto
    {
        $this->ensureCoreLoaded();
        // get_member() 호출 및 결과 DTO 매핑
    }

    public function create(MemberCreateDto $input): MemberDto
    {
        $this->ensureCoreLoaded();
        // insert 쿼리 + 코어 해시 함수 사용
    }

    /**
     * 지연 로딩: 실제 G5 기능이 필요한 시점에만 코어를 로드.
     * parse error는 try/catch 불가 → 배포 게이트(php -l)로 사전 차단.
     */
    private function ensureCoreLoaded(): void
    {
        if (!$this->coreLoaded) {
            require_once G5_PATH . '/common.php';
            $this->coreLoaded = true;
        }
    }
}
```
