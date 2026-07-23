# PROJECT CONSTITUTION v1.0.1 (Gnuboard5 PHP REST API Edition)

👑 **최상위 법** | 제정 2026-03-04 | 명시적 지시 없이 위반 불가 | **🇰🇷 사용자 보고/대화는 반드시 한글로 작성**

> **Origin**: `rest-middleware` (Rust Edition v1.9.0) 헌법에서 파생.
> PHP/Gnuboard5 맥락에 맞게 적응. Rust 고유 규칙은 제거, PHP 고유 규칙 추가.

---

## 제1조. 핵심 개발 철학: DD3 원칙 및 내재화

본 API 솔루션의 모든 설계·구현·검증은 아래 4대 원칙을 따르며, 이를 **DD3 원칙**이라 한다.

### 1. SDD (Specification-Driven Development, 스펙 주도 개발)
- **원칙**: "코드가 아니라 명세가 먼저다."
- **적용**: OpenAPI 3.0(Swagger) 명세서가 프론트엔드 및 앱 개발자와의 **유일하고 절대적인 계약서**이다. `/api/v1/**` 상세 공개 계약은 `api/docs/openapi.yaml`이 기준이며, `docs/API_SPEC.md`는 정책·레거시·운영 예외를 설명하는 보조 문서로 유지한다.

### 2. DDD (Domain-Driven Design, 도메인 주도 설계)
- **원칙**: "레거시 DB 스키마에 끌려다니지 않는다."
- **적용**: Auth, Board, Post 등 철저한 도메인 분리를 강제한다. 수천 줄짜리 절차지향적인 그누보드 갓파일(God File)에 철퇴를 내리고, **Controller(검증/라우팅) → Service(비즈니스 로직) → Repository(DB 통신)**의 3단 계층형 구조로 캡슐화한다. 향후 다른 플랫폼이나 언어로 이관하더라도 도메인 비즈니스 로직은 안전하게 보존된다.

### 3. TDD (Test-Driven Development, 테스트 주도 개발)
- **원칙**: "테스트 불가능한 코드는 짐이다."
- **적용**: 단일 책임 원칙(SRP)을 철저히 지켜 `$g5`, `$member` 같은 레거시 전역 변수와의 강한 결합을 끊어낸다. 각 도메인의 핵심 Service 로직은 DB나 웹 서버의 개입 없이도 언제든 독립적인 단위 테스트가 가능하도록 설계한다.

### 4. Error 방어 및 로깅(원클릭 디버그)
- **원칙**: PHP 네이티브 에러/스택트레이스는 클라이언트에 직접 노출되지 않는다.
- **적용**: 모든 예외는 최상단 예외 처리 미들웨어에서 RFC 7807로 매핑해 반환하고, 내부에는 요청 ID, 페이로드, 스택트레이스, 사용자/요청 컨텍스트를 즉시 파일 로그로 남긴다.

### 5. 외부 리소스 배제 및 내재화 원칙
- **원칙**: "불필요한 의존성은 곧 CS 리스크이자 부채다."
- **적용**: 무거운 범용 프레임워크를 배제한다. API 통신에 필수적인 초경량 모듈(라우팅, JWT)만 최소한으로 융합하며, 그 외 핵심 비즈니스 로직은 철저히 내재화하여 플러그인 설치형 솔루션으로서의 범용성과 독립성을 극대화한다.

---

## §0 대원칙 (Language & Core Values)

0. **언어 제약**: 모든 사용자 커뮤니케이션, 감사 보고서, 작업 요약은 반드시 **한글**로 작성한다. (코드 내 변수명/주석/기술 용어는 영어 허용)
1. **테스트 없는 구현은 미완성.** (PHPUnit 테스트 필수)
2. **API 장애가 기존 그누보드 웹사이트를 중단시켜선 안 된다.** (Fail-Safe, 독립 프로세스)
3. **Why 없는 커밋은 Revert 대상.** `docs/HISTORY.md`에 변경 사유 기록 필수.
4. 계획 → 승인 → 구현 순서 기본. 사용자 "즉시 실행" 지시 시 승인 생략 가능.
5. 🔥 **단순함 > 복잡함.** 현재 필요한 것만 명확하게. 오버엔지니어링 금지.
6. 🔥 **안전 > 관습.** `null` 체크 철저, 타입 힌팅 강제, strict_types 선언 필수.
7. 💀 **레거시 불가침.** 그누보드5 코어 파일(`lib/`, `common.php`, `head.php` 등)을 직접 수정하지 않는다. API 레이어는 별도 디렉토리에서 독립 운영.
8. **토큰 절약**: 불필요한 서론/결론 금지. 핵심 원인(Why)과 결과(Code)만 최소한으로 출력.
9. 🔥 **Gnuboard5 테이블 구조 직접 참조**: `g5_*` 테이블을 그대로 읽되, 응답은 REST 규격으로 변환. DB 스키마는 수정하지 않는다.
9-1. 🚫 **쇼핑몰 제외**: 본 프로젝트 범위는 그누보드5 **CMS/커뮤니티** 기능으로 한정한다. `shop/`(쇼핑몰 소비자/프론트 영역) 하위 파일은 구현·분석·감사 대상에서 제외한다.
9-2. ✅ **쇼핑몰 관리자 예외**: `adm/shop_admin/`은 레거시 API 포팅, 관리자 기능 매핑, 필드 정합성 감사의 분석 대상이다. 공개 사용자 쇼핑몰 API(`shop/` 소비자 경로)로의 범위 확장은 별도 프로젝트로 분리한다.
10. **모르는 내용은 상상으로 구현하지 않는다.** 문서, 명세, 코드 근거가 없으면 사용자에게 즉시 질문하여 합의 후 진행한다.

10-1. **Rust급 에러 통제 3원칙 (No Raw PHP Errors)**
   - PHP 네이티브 에러/스택트레이스는 절대 클라이언트로 노출하지 않는다.
   - 모든 예외는 최상단 전역 예외 미들웨어에서 RFC 7807(`type`, `status`, `title`, `detail`)만 반환한다.
   - 내부 로깅은 발생 지점, 요청 페이로드, 스택트레이스, 요청/회원 식별 컨텍스트를 즉시 파일 로그로 남겨 디버깅 시간을 최소화한다.

10-2. **도메인별 DDL 문서화 강제**
   - Auth, Board, Post, Comment, File 등 도메인 착수 전 `docs/ddls/*.md`의 DDL 명세를 최신화한다.
   - API 구현은 해당 도메인 DDL 계약(필드/키/조인/카운트 규칙)을 기준으로만 수행한다.

10-3. **CI/CD + TDD 배포 자동화**
   - 개별 로컬 테스트 한두 개의 수동 실행만으로 배포를 승인하지 않는다.
   - 정본 검증은 `composer run ci:local`이며, PHP 8.1 production lock, 하네스, 전체 품질 게이트, PHP-Rust 통합 감사를 모두 통과해야 한다.
   - `.githooks/pre-push`가 같은 로컬 CI를 푸시 전에 강제한다. GitHub-hosted Actions는 자동 실행하지 않고 명시적 수동 fallback으로만 유지한다.
   - PHPUnit 파이프라인이 테스트 통과 100%를 달성할 때만 배포 스크립트가 프로덕션 빌드/패키징(`vendor` 동봉 포함)을 실행한다.

---

## §1 아키텍처

> **[적용 범위(Scope) 명확화]**
> 본 헌법에 명시된 모든 아키텍처 규정, 계층형 설계, 그리고 기술 스택은 **Gnuboard5 REST API 프로젝트 개발 및 런타임 환경에만 독점적으로 적용**됩니다. 기존 그누보드5 코어 시스템이나 표준 웹페이지 렌더링, 기존 로직 등 REST API 이외의 영역에는 관여하지 않는 것을 최우선 전제로 합니다.

### §1.1 기술 스택

| 항목 | 선택 | 비고 |
|------|------|------|
| **PHP 버전** | 8.1+ | `declare(strict_types=1)` 필수 |
| **라우팅 / 미들웨어** | Slim Framework 4 (`slim/slim`) | 마이크로 컴포넌트 조합, CORS/JWT 미들웨어 체이닝 |
| **입력값 검증** | Rakit Validation (`rakit/validation`) | 독립적 1차 필터링 |
| **공개 계약 문서** | `api/docs/openapi.yaml` + `docs/API_SPEC.md` | OpenAPI SSOT + 보조 설명 문서 |
| **DB** | MySQL 8.0 호환 기준 | 그누보드5 기존 DB 직접 접근 |
| **인증** | JWT (Bearer Token) | `Authorization: Bearer {token}` |
| **응답 형식** | JSON only | `Content-Type: application/json; charset=utf-8` |
| **에러 응답** | RFC 7807 (Problem Details) | `{"type": "...", "status": 400, "title": "...", "detail": "..."}` |

### §1.2 디렉토리 구조

```
gnuboard5/php/
├── .agent/
│   ├── Constitution.md          # 본 헌법
│   ├── sub-constitutions/       # 서브헌법 (API 설계, 보안 등)
│   └── workflows/               # 워크플로우
├── api/
│   ├── v1/
│   │   ├── Auth/                # Controller/Service/Repository
│   │   ├── Board/
│   │   ├── Post/
│   │   ├── Comment/
│   │   ├── File/
│   │   ├── Member/
│   │   ├── Point/
│   │   ├── Like/
│   │   ├── Menu/
│   │   ├── Config/
│   │   ├── Admin/               # 관리자 도메인
│   │   ├── Core/                # 공통 인프라 (DB, 예외, 미들웨어)
│   │   ├── Setup/               # 설치 점검
│   │   ├── Integration/         # Gateway 계약 인터페이스
│   │   ├── Middlewares/         # JWT, OptionalJWT, CORS 등
│   │   └── Support/             # 공통 응답/예외/검증
│   ├── docs/                    # Swagger UI html 및 정적 파일
│   ├── vendor/                  # 로컬/CI composer install 결과물을 배포에 동봉
│   ├── routes.php               # 엔드포인트 라우팅 정의
│   └── index.php                # 단일 진입점 (Front Controller)
├── docs/
│   ├── HISTORY.md               # 변경 이력
│   └── API_SPEC.md              # API 명세
└── composer.json                # 의존성 정의 (배포 시 vendor 동봉 전제)
```

### §1.3 계층 분리 강제

```
[HTTP Request]
    ↓
[Middleware] → 인증, CORS, Rate-Limit
    ↓
[Controller] → 입력 검증 + 응답 포맷팅
    ↓
[Service] → 비즈니스 로직
    ↓
[Repository] → DB I/O 전담 (쿼리만)
    ↓
[MariaDB] → g5_* 테이블 직접 접근
```

- **Controller에서 SQL 쿼리 작성 금지.** Repository를 통해서만 DB 접근.
- **Service에서 HTTP Request/Response 직접 접근 금지.** Controller가 DTO로 전달.
- **Repository는 순수 DB I/O만.** 비즈니스 로직 포함 금지.

---

## §2 설계 & 품질

### §2.1 코드 기준

- **SRP**: 함수 50줄 초과 시 분리 검토. 클래스는 300줄 초과 시 분리 검토.
- **DRY**: 중복 → `helpers/` 또는 공통 서비스로 추출.
- **타입 힌팅 100%**: 모든 함수의 파라미터, 리턴 타입에 타입 힌팅 필수.
- **`declare(strict_types=1)`**: 모든 PHP 파일 첫 줄에 선언.

### §2.2 PHP 코딩 표준

- **PSR-12** 코딩 스타일 준수.
- **PSR-4** 오토로딩 (Composer).
- **PSR-7** HTTP 메시지 인터페이스 (프레임워크 사용 시).
- **네이밍**:
  - 클래스: `PascalCase`
  - 메서드/함수: `camelCase`
  - 변수: `camelCase`
  - 상수: `UPPER_SNAKE_CASE`
  - DB 컬럼 매핑: `snake_case` (g5 원본 유지)

### §2.3 Zero Hardcoding (운영값 한정)

- 비밀값/운영 endpoint/호스트 하드코딩 즉시 반려.
- 값은 `.env` 또는 `config/*.php`로 주입.
- **허용 예외**: 테스트 전용 리터럴, g5 테이블 prefix (`g5_`).
- 커밋/배포 전 `./scripts/check_hardcoding.sh` 통과를 필수 조건으로 한다.

### §2.4 Null 안전성

```php
// ❌ 금지
$member = $repo->findById($id);
$name = $member->mb_name; // null이면 Fatal Error

// ✅ 필수
$member = $repo->findById($id);
if ($member === null) {
    throw new NotFoundException("회원을 찾을 수 없습니다: {$id}");
}
```

### §2.5 타입 안전성 & 불변 객체 (DTO 정책)

> **원칙**: "`array`는 타입이 아니다. 구조가 있는 데이터는 반드시 DTO로 표현한다."

- **DTO 필수**: 도메인 데이터(회원, 게시판, 게시글, 댓글, 포인트 등)를 Service/Controller 간 전달할 때 `array` 대신 **불변 DTO(Data Transfer Object)** 를 사용한다.
- **불변성 강제**: DTO 프로퍼티는 `readonly`로 선언하고, setter 메서드를 제공하지 않는다.
- **팩토리 메서드**: DB 배열을 DTO로 변환하는 `fromRow(array $row): self` 정적 팩토리를 필수로 제공한다.
- **PHPDoc 제네릭**: 배열을 반환하는 메서드는 `@return array<int, BoardDTO>` 형태로 요소 타입을 명시하여 PHPStan이 완벽히 추적 가능하게 한다.
- **Gateway 인터페이스**: 반환 타입은 `?DTO` 또는 `array<int, DTO>`를 사용한다. 단순 `array` 반환은 신규 코드에서 금지한다.
- **위치**: `api/v1/Core/DTO/` 디렉토리에 통합 관리한다.
- **JSON 직렬화**: API 응답에 직접 사용할 DTO는 `\JsonSerializable`을 구현한다.

```php
// ❌ 금지: 구조 불명의 배열 전달
public function findMemberById(string $id): ?array;

// ✅ 필수: 타입이 보장된 DTO 반환
public function findMemberById(string $id): ?MemberDTO;
```

### §2.6 Backed Enum 강제 (매직넘버 근절)

> **원칙**: "의미 있는 상수는 Enum으로. 매직넘버는 코드에서 추방한다."

- **Backed Enum**: 상태, 등급, 분류, 플래그 등 유한한 값 집합은 `IntBackedEnum` 또는 `StringBackedEnum`으로 선언한다.
- **매직넘버 금지**: 코드 내 `>= 10` (관리자 레벨), `'good'`/`'nogood'` (투표 타입) 등의 하드코딩된 비교값은 Enum 상수로 교체한다.
- **에러 타입**: RFC 7807의 `type` 필드(`/errors/not-found` 등)는 Enum으로 통합 관리한다.
- **위치**: `api/v1/Core/Enum/` 디렉토리에 통합 관리한다.

```php
// ❌ 금지
if ($member['mb_level'] >= 10) { ... }

// ✅ 필수
if (MemberLevel::from($member->mbLevel)->isAdmin()) { ... }
```

---

## §3 로깅 & 에러 추적

### §3.1 필수 로깅 규칙

- **Logger**: Monolog (PSR-3 호환).
- **Prod**: JSON 형식 + 파일 로테이션. **Dev**: Pretty 출력.
- **민감정보 마스킹**: 비밀번호, 토큰 등은 `****`로 치환.
- **No Bare Exception**: `catch (Exception $e) { /* 무시 */ }` 금지. 반드시 로깅 또는 재던지기.

### §3.2 에러 컨텍스트 강제

```php
// ❌ 금지: 무맥락 에러
error_log("DB error");

// ✅ 필수: 구조화된 에러 로그
$logger->error('쿼리 실행 실패', [
    'component' => 'PostRepository',
    'operation' => 'findByBoard',
    'target'    => "board={$boardId}, page={$page}",
    'error'     => $e->getMessage(),
]);
```

### §3.3 에러 응답 (RFC 7807)

```json
{
    "type": "https://api.example.com/errors/not-found",
    "status": 404,
    "title": "Resource Not Found",
    "detail": "게시글 ID 12345를 찾을 수 없습니다.",
    "instance": "/api/posts/12345"
}
```

- 모든 HTTP 에러를 이 형식으로 통일. HTML 에러 페이지 금지.

### §3.4 Logger 필수 주입 규칙

- **모든 Service 클래스**에 `Psr\Log\LoggerInterface`를 생성자 주입한다.
- nullable(`?LoggerInterface`) 주입은 금지. DI 컨테이너에서 항상 인스턴스를 제공한다.
- Repository는 선택적 주입 허용 (단순 CRUD는 로깅 불필요할 수 있음).

```php
// ✅ 필수: Service 생성자
public function __construct(
    private readonly XxxRepository $repo,
    private readonly LoggerInterface $logger,  // 필수
) {}

// ❌ 금지: nullable Logger
public function __construct(?LoggerInterface $logger = null) {}
```

### §3.5 error_log() 함수 사용 금지

- `error_log()` PHP 네이티브 함수 직접 호출을 **전면 금지**한다.
- 반드시 DI로 주입된 `$this->logger->error()`, `->warning()`, `->info()` 등 PSR-3 메서드를 사용한다.
- 감사 시 `error_log(` grep으로 위반 여부를 자동 검출한다.

---

## §4 런타임 안정성

### §4.1 Fail-Fast

- Bootstrap 시 필수 리소스(DB 연결, 설정 파일) 실패 → 즉시 503 응답.
- `.env` 필수 키 누락 → 부팅 중단.

### §4.2 리소스 보호

- 설정 파일 삭제/덮어쓰기 금지 (명시적 지시 없이).
- **문서 보호**: `docs/*.md`, `.agent/*.md` 무단 삭제는 Revert 대상.
- **그누보드5 코어 불가침**: `lib/`, `common.php`, `head.php`, `tail.php` 등 코어 파일 수정 금지.

### §4.3 방어적 코딩

- DB 쿼리: 신규 DB 레이어는 Prepared Statements를 기본으로 한다. 단, 그누보드 코어 DB API(`sql_query`, `sql_fetch`) 연동 구간은 escape + 화이트리스트 검증 + 동적 테이블명 정규식 검증을 필수로 적용한다.
- 파일 I/O: `is_readable()`, `file_exists()` 사전 체크.
- JSON 파싱: `json_decode()` 후 `json_last_error()` 체크.

### §4.4 설정 입력 엄격 모드

- `.env` 필수 키: `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS`, `JWT_SECRET`, `APP_ENV`
- 하나라도 누락 시 부팅 중단 (Fail-Fast).
- `APP_ENV`는 `local`, `staging`, `production` 중 하나만 허용.

---

## §5 API 설계 원칙

### §5.1 REST 규격

- **리소스 중심 URL**: 동사 금지, 명사 복수형 사용.
  ```
  ✅ GET  /api/boards/{bo}/posts       (게시글 목록)
  ✅ POST /api/boards/{bo}/posts       (게시글 생성)
  ❌ GET  /api/getPostList              (동사 금지)
  ❌ POST /api/boards/{bo}/createPost   (동사 금지)
  ```
- **HTTP 메서드 의미 준수**:
  | 메서드 | 의미 | 멱등성 | 안전 |
  |--------|------|--------|------|
  | `GET` | 조회 | ✅ | ✅ |
  | `POST` | 생성 | ❌ | ❌ |
  | `PUT` | 전체 교체 | ✅ | ❌ |
  | `PATCH` | 부분 수정 | ❌ | ❌ |
  | `DELETE` | 삭제 | ✅ | ❌ |

- **HTTP 상태 코드 정확히 사용**:
  | 코드 | 용도 |
  |------|------|
  | `200` | GET 성공, PUT/PATCH 성공 |
  | `201` | POST로 리소스 생성 성공 (`Location` 헤더 포함) |
  | `204` | DELETE 성공 (빈 바디) |
  | `400` | 입력 검증 실패 |
  | `401` | 인증 필요 (토큰 없음/만료) |
  | `403` | 권한 없음 (인증됐으나 접근 불가) |
  | `404` | 리소스 없음 |
  | `409` | 충돌 (중복 닉네임, 이미 추천 등) |
  | `422` | 문법은 맞으나 의미적 오류 |
  | `429` | Rate Limit 초과 |
  | `500` | 서버 내부 오류 |

### §5.2 API 버전닝

- **URL prefix 방식**: `/api/v1/boards`, `/api/v1/posts`
- 초기 버전은 `v1`. 하위 호환 불가 변경 시에만 `v2` 신설.
- 버전 없는 `/api/boards`는 최신 버전으로 리다이렉트하지 않는다 (명시적 버전 강제).

### §5.3 응답 엔벨로프

**단일 리소스**:
```json
{
    "data": {
        "id": 12345,
        "title": "게시글 제목",
        "content": "본문 내용...",
        "author": { "id": "user01", "nickname": "낚시꾼" },
        "created_at": "2026-03-04T10:00:00+09:00"
    },
    "meta": {
        "server_time": "2026-03-04T13:06:00+09:00",
        "version": "v1.0.0"
    }
}
```

**목록 (페이징 포함)**:
```json
{
    "data": [ ... ],
    "pagination": {
        "total": 1523,
        "page": 1,
        "per_page": 20,
        "last_page": 77,
        "has_next": true,
        "has_prev": false
    },
    "meta": {
        "server_time": "2026-03-04T13:06:00+09:00",
        "version": "v1.0.0"
    }
}
```

- 빈 목록: `{ "data": [], "pagination": { "total": 0, ... }, "meta": { ... } }` (200, 404 아님)
- `null` 필드는 생략하지 않고 명시적으로 `null` 반환 (프론트엔드 예측 가능성).

### §5.4 페이징 표준

- **쿼리 파라미터**: `?page=1&per_page=20`
- **기본값**: `page=1`, `per_page=20`
- **상한**: `per_page` 최대 100. 초과 시 100으로 고정.
- **정렬**: `?sort=-wr_id,wr_hit` (내림차순은 `-` 접두어 사용)
- **허용 정렬 필드 화이트리스트 강제** — 임의 컬럼명 정렬 금지 (SQL Injection 방지).
- **커서 페이징**: 대용량 데이터 조회를 위한 식별자(예: `?cursor=...`) 향후 확장 스펙 고려.

### §5.5 검색 & 필터링

```
GET /api/boards/freebd/posts?search=낚시&search_field=title&category=장비
```

| 파라미터 | 설명 | 기본값 |
|---------|------|--------|
| `search` | 키워드 | (없음) |
| `search_field` | 검색 대상 | `title_content` |
| `category` | 카테고리 필터 | (전체) |
| `date_from` | 시작일 | (없음) |
| `date_to` | 종료일 | (없음) |

- `search_field` 허용값: `title`, `content`, `title_content`, `author`, `comment`
- 허용값 외 입력 → `400 Bad Request`.

### §5.6 날짜/시간 형식

- **ISO 8601** 필수: `2026-03-04T10:00:00+09:00`
- DB의 `datetime` → API 응답 시 반드시 timezone offset 포함.
- 입력도 ISO 8601 형식만 허용.

### §5.7 멱등성 보장

- `PUT`, `DELETE`는 **멱등**이어야 한다. 같은 요청을 여러 번 보내도 결과 동일.
- `POST` 중복 방지: 클라이언트가 `X-Idempotency-Key` 헤더를 보내면 서버가 중복 체크.
  ```
  POST /api/boards/freebd/posts
  X-Idempotency-Key: uuid-v4-unique-key
  ```

### §5.8 Rate Limiting

- **응답 헤더**:
  ```
  X-RateLimit-Limit: 100
  X-RateLimit-Remaining: 95
  X-RateLimit-Reset: 1709535600
  ```
- 초과 시 `429 Too Many Requests` + `Retry-After` 헤더.
- 기본 정책: IP당 분당 60회 (인증 사용자: 분당 120회).

### §5.9 CORS 정책

```php
// 프로덕션: 화이트리스트만 허용
Access-Control-Allow-Origin: https://wolchuck.co.kr
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, X-Idempotency-Key
Access-Control-Max-Age: 86400
```

- `Access-Control-Allow-Origin: *` 프로덕션 금지.
- `OPTIONS` preflight 요청에 올바르게 응답.

### §5.10 캐싱

- **GET 응답**: `Cache-Control`, `ETag` 헤더 적절히 사용.
- **목록**: `Cache-Control: private, max-age=60` (1분).
- **단일 리소스**: `ETag` + `304 Not Modified` 지원.
- **쓰기 후**: 관련 캐시 무효화.

### §5.11 필드 선택 (Sparse Fields)

```
GET /api/boards/freebd/posts?fields=id,title,author,created_at
```

- 대용량 목록에서 필요한 필드만 요청하여 응답 크기 절감.
- `fields` 파라미터 없으면 전체 필드 반환.

### §5.12 관계 리소스 포함 (Expand)

```
GET /api/posts/12345?expand=author,comments
```

- N+1 문제 방지를 위해 관계 리소스를 한 번에 로드.
- `expand` 허용 목록 화이트리스트 강제.

### §5.13 그누보드5 테이블 매핑

| API 리소스 | g5 테이블 | 비고 |
|-----------|----------|------|
| `GET /api/v1/boards` | `g5_board` | 게시판 목록/설정 |
| `*/boards/{bo}/posts` | `g5_write_{bo}` | 게시글 CRUD |
| `*/posts/{id}/comments` | `g5_write_{bo}` (wr_is_comment > 0) | 댓글 CRUD (수정/삭제 포함) |
| `*/posts/{id}/good` | `g5_board_good` | 추천/비추천 이력 |
| `*/members` | `g5_member` | 회원 조회/수정 |
| `POST /api/v1/auth/login` | `g5_member` | 로그인 → JWT 발급 |
| `POST /api/v1/auth/register` | `g5_member` | 회원가입 → JWT 발급 |
| `*/files` | `g5_board_file` | 첨부파일 업로드/다운로드 |
| `*/groups` | `g5_group` | 그룹 |
| `*/points` | `g5_point` | 포인트 이력 |
| `GET /api/v1/config` | `g5_config` | 전역 설정 (민감 필드 제외) |
| `GET /api/v1/menus` | `g5_menu` | 네비게이션 메뉴 |
| `GET /api/v1/posts/latest` | `g5_board_new` | 최신글 모아보기 |

### §5.14 g5_write_* 동적 테이블 처리

```php
// Repository 계층에서 처리
public function getWriteTable(string $boTable): string
{
    // 1. g5_board 화이트리스트 검증 (SQL Injection 방지)
    if (!$this->boardRepo->exists($boTable)) {
        throw new NotFoundException("게시판이 존재하지 않습니다: {$boTable}");
    }
    // 2. 정규식 추가 검증 (영문+숫자+언더스코어만 허용)
    if (!preg_match('/^[a-zA-Z0-9_]+$/', $boTable)) {
        throw new BadRequestException("잘못된 게시판 ID: {$boTable}");
    }
    return "g5_write_{$boTable}";
}
```

- 동적 테이블명은 PDO 바인딩이 불가 → **화이트리스트 + 정규식 이중 검증** 후 문자열 결합.
- `g5_board` 테이블에 존재하지 않는 `bo_table` → 즉시 `404`.

---

## §6 보안

### §6.1 인증/인가

- **JWT Bearer Token**: `Authorization: Bearer {token}`
- **토큰 만료**: Access Token 1시간, Refresh Token 7일
- **비밀번호**: API 독립 모드에서 `password_verify()` + `G5_ENCRYPT_FUNC` 폴백(필요 시 `md5` 폴백)으로 레거시 해시를 호환한다. API 계층에 독자 해시 규격을 추가하지 않는다.
- **Rate Limiting**: 로그인 5회 실패 → 5분 차단
- **CORS**: 화이트리스트 도메인만 허용. `*` 금지 (프로덕션).

### §6.2 입력 검증

- 모든 사용자 입력은 Controller에서 **검증 후** Service에 전달.
- **XSS**: `htmlspecialchars()` 출력 이스케이프. (API는 JSON이므로 HTML 렌더링 없음)
- **SQL Injection**: Prepared Statements 100% 강제 (§4.3 연동).
- **파일 업로드**: MIME 타입 + 확장자 이중 검증. 실행 파일 업로드 금지.

### §6.3 시크릿 관리

- `.env`는 Git 추적 금지 (`.gitignore` 포함).
- `.env.example`만 저장소에 유지.
- JWT Secret, DB 비밀번호 등은 환경변수로만 주입.

---

## §7 개발 프로세스 & 기록

### §7.1 워크플로우

Plan → Test → Code → History → Audit

### §7.2 테스트 동반 개발

- **신규 기능**: 구현 코드와 PHPUnit 테스트를 **같은 커밋**에 포함.
- **버그 픽스**: 재현 테스트 → 픽스 → 테스트 통과.
- **배포 기준**: 배포 파이프라인은 `phpunit` 100% 통과 기준을 만족할 때만 프로덕션 빌드/패키징 실행한다.
- **테스트 없는 커밋 금지**.
- **커버리지 목표**: Service 계층은 CI 하드 게이트 80%+를 유지한다. Repository 계층 핵심 쿼리 테스트는 필수다.
- **버그 수정 = 회귀 테스트 필수**: 버그를 고칠 때는 해당 실패를 재현하는 PHPUnit 테스트를 같은 변경 세트에 반드시 포함한다. 테스트 없이 버그만 고친 변경은 미완성으로 간주한다.
- **TDD 우선 원칙**: 가능하면 실패하는 테스트를 먼저 추가하고 수정한다. 구조상 선행 테스트가 불가능한 경우에도, 수정과 함께 동일 증상을 고정하는 테스트를 반드시 추가하고 보고에 이유를 남긴다.
- **API 운영/보안 경로는 전용 회귀망 필수**: 인증, 토큰/세션, rate limit, 외부 인증 callback, env/config 로딩, DB 마이그레이션, 트랜잭션/동시성, 권한 체크처럼 운영 장애나 보안 사고로 이어질 수 있는 경로는 happy path만으로 닫지 않는다. 401/403, invalid input, cancel/timeout, retry, rollback, migration 같은 영향 경로를 전용 테스트로 고정한다.
- **회귀 테스트 없는 커밋 금지**: 사용자-visible 회귀나 운영/보안 회귀를 수정하는 커밋은 영향받는 테스트 스위트를 실제로 실행하고, 최종 보고에 실행 명령을 남겨야 한다.
- **감사 문서는 보조, 강제 규칙은 헌법**: `docs/audits/**`의 TDD/coverage 감사 문서는 참고 자료다. AI 에이전트는 감사 보고서가 아니라 이 헌법 본문을 강제 규칙으로 따라야 한다.

### §7.3 기록물 관리

- `docs/HISTORY.md`: 모든 변경의 **Why** 기록.
- `api/docs/openapi.yaml`, `docs/API_SPEC.md`: 공개 계약 SSOT와 보조 설명 문서 유지.
- 200KB 초과 시 `HISTORY.{YYYY}.md`로 분리.

### §7.4 커밋 메시지

```
feat(posts): 게시글 목록 API 구현
fix(auth): JWT 만료 시간 검증 오류 수정
docs(api): 회원 API 명세 추가
refactor(repo): PostRepository 쿼리 최적화
```

### §7.5 문서 거버넌스

- 문서는 `docs/` 디렉토리에 관리.
- API 변경 시 `API_SPEC.md` 동시 갱신 필수.
- 도메인별 DDL 문서는 `docs/ddls/`에 보관하고, 구현 시작 전 해당 문서를 최신 상태로 준비해야 한다.
- Auth/Board/Post/Comment/File/Like/Member/Point/Config/Menu 등 주요 도메인 문서가 없는 상태에서는 구현 착수를 금지한다.
- 문서 삭제는 사용자 명시 지시 시에만 허용.

---

## §8 PHP 특화 규칙

### §8.1 파일 헤더 주석 강제 (No Silent Files)

> **원칙**: "파일을 열었을 때 이것이 무엇을 하는 파일인지 1초 안에 파악할 수 없다면 실격이다."

**모든 PHP 파일**은 `<?php` 선언 직후, `declare(strict_types=1)` 직전에 아래 형식의 PHPDoc 헤더 주석을 **필수로 포함**해야 한다. 주석이 없는 PHP 파일은 코드 리뷰에서 즉시 반려한다.

```php
<?php
/**
 * [파일 역할 한 줄 요약]
 *
 * [선택: 추가 설명이 필요한 경우 1~3줄 이내로 작성]
 *
 * @package  Api\[Domain]\[Layer]
 * @since    v1.0.0
 */
declare(strict_types=1);
```

**필수 항목**:

| 항목 | 설명 | 예시 |
|------|------|------|
| 한 줄 요약 | 이 파일이 **무엇을 하는지** 한 문장으로 설명 | `회원 인증 및 JWT 발급 서비스` |
| `@package` | PSR-4 네임스페이스 경로 | `Api\Post\Service` |
| `@since` | 최초 도입 버전 | `v1.0.0` |

**적용 예시**:

```php
<?php
/**
 * 게시글 CRUD 비즈니스 로직을 처리하는 서비스.
 *
 * 동적 테이블(g5_write_*) 라우팅, 공지사항 처리,
 * 조회수 증가, 포인트 차감/적립을 담당한다.
 *
 * @package  Api\Post\Service
 * @since    v1.0.0
 */
declare(strict_types=1);

class PostService
{
    // ...
}
```

```php
<?php
/**
 * G5 회원 데이터 접근 Repository (Adapter).
 *
 * 그누보드 코어의 get_member() 등을 호출하고
 * 결과를 MemberDto로 매핑한다.
 *
 * @package  Api\Member\Repository
 * @since    v1.0.0
 */
declare(strict_types=1);

final class G5MemberRepository implements MemberRepository
{
    // ...
}
```

### §8.2 strict_types

```php
<?php
declare(strict_types=1);
// 모든 PHP 파일에 필수 (§8.1 헤더 주석 바로 아래 위치)
```

### §8.3 의존성 관리

- `composer.json`으로 의존성 관리.
- 3년 이상 방치 패키지 사용 금지.
- `composer audit` 정기 실행.
- 배포 아티팩트는 로컬/CI에서 `composer install --no-dev --optimize-autoloader`로 생성한 `vendor`를 포함한다.
- 국내 웹호스팅 Composer 미지원 환경을 고려하여, 서버 Composer 실행 없이도 배포 가능해야 한다.

### §8.4 PHP 정적 분석

- **PHPStan Level 8**을 기본 게이트로 강제한다.
- `@var`, `@param`, `@return` PHPDoc 타입 힌팅 병행.

### §8.5 PDO 전용

- `mysqli` 사용 금지. **PDO** 전용.
- `PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION` 강제.
- `PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC` 기본.

### §8.6 그누보드5 연동 규칙

- 그누보드5의 `g5_*` 테이블 구조를 **직접 참조**하되, **수정하지 않는다**.
- 그누보드5 세션과 API JWT 인증은 **별개 시스템**으로 운영.
- 서비스/컨트롤러/미들웨어에서 그누보드 PHP 함수 직접 호출을 금지한다.
- Repository도 기본 경로는 PDO/DBAL을 사용하고, 레거시 함수 폴백은 `LEGACY_SQL_FALLBACK=true`에서만 제한적으로 허용한다.
- 회원 비밀번호 검증은 API 독립 호환 규칙(`password_verify` + `G5_ENCRYPT_FUNC` 폴백)을 기준으로 한다.

---

## §9 환경 & 배포

- **개발**: `APP_ENV=local`, 에러 상세 출력 허용.
- **스테이징**: `APP_ENV=staging`, 에러 로깅 + JSON 에러 응답.
- **프로덕션**: `APP_ENV=production`, `display_errors=Off`, JSON 에러 응답만.
- **Apache .htaccess**: `/api/` 경로를 `api/index.php`로 라우팅.
- **PHP-FPM** 기반 운영 권장.

---

## §10 자매 프로젝트 참조

| 프로젝트 | 역할 | 참조 |
|---------|------|------|
| `rest-middleware` (Rust) | 관제/프록시/CDN/업로드 미들웨어 | 아키텍처 패턴, 보안 정책 참조 |
| `gnuboard5` (PHP) | 메인 웹사이트 (그누보드5) | DB 스키마, 세션 관리 참조 |

---

## §11 멀티 에이전트 동시 편집 금지 (강제)

> 🔥 **절대 원칙**: **같은 파일을 여러 AI 에이전트가 동시에 수정하는 것을 금지한다.** 이것이 유일하고 핵심적인 경합 방지 규칙이다.

### §11.1 경합 금지 원칙 (Core Rule)

- **같은 파일 동시 수정 금지**: 하나의 파일을 여러 AI가 동시에 편집하면 충돌이 발생한다. 이것만 막으면 된다.
- **다른 AI가 해당 파일을 건드리지 않고 있으면 수정 가능**: 잠금 유무와 관계없이, 실제 경합이 없으면 작업을 진행할 수 있다.
- **다른 도메인은 자유**: AI-A가 `Auth/` 작업 중이어도 AI-B는 `Board/`를 동시에 작업할 수 있다.

### §11.2 도메인 잠금 (관리 도구)

도메인 잠금은 §11.1 원칙을 **효율적으로 운영하기 위한 관리 도구**이다. 잠금 미획득 자체가 위반은 아니며, **실제로 같은 파일이 동시 수정될 때**가 위반이다.

```bash
# 잠금 획득 (권장 — 경합 사전 방지)
../.agent-locks/lock.sh php <domain> <agent_name> [ttl_seconds]

# 잠금 해제 (작업 완료 시)
../.agent-locks/unlock.sh php <domain> <agent_name>

# 상태 조회
../.agent-locks/status.sh php
```

### §11.3 잠금 규칙

| 규칙 | 설명 |
|------|------|
| **도메인 단위 배타적 잠금** | 한 도메인은 한 시점에 한 에이전트만 수정 가능 |
| **TTL 기본 1시간** | 작업 완료 시 즉시 해제. 미해제 시 TTL 만료 후 자동 정리 |
| **다중 도메인 잠금 허용** | 하나의 에이전트가 여러 도메인을 동시에 잠글 수 있음 |
| **교차 프로젝트 독립** | PHP 잠금과 Rust/Flutter 잠금은 독립적 |
| **소유자만 해제** | 다른 에이전트의 잠금을 강제 해제할 수 없음 (TTL 만료 대기) |

### §11.4 위반 판정 기준

- ✅ **위반**: 같은 파일을 여러 AI가 실제로 동시에 수정한 경우 → 후행 수정 Revert
- ❌ **위반 아님**: 잠금을 안 걸었지만 다른 AI가 해당 파일을 건드리지 않은 경우
- ❌ **위반 아님**: 같은 도메인이지만 서로 다른 파일을 각각 수정한 경우

상세 규칙은 `.agent/sub-constitutions/multi-agent-locking.md` 참조

---
