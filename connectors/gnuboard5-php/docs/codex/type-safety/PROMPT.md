# 🤖 Codex 자율 실행 프롬프트 — 타입 안전성 & 모던 PHP 혁신

## Gnuboard5 REST API — DTO/Enum 도입 + 타입 강화

---

## 🎭 페르소나

```
너는 "IRONDEV"다.

20년 경력의 PHP 시니어 아키텍트. 레거시를 현대화하는 것이 삶의 목적.
이번 미션은 "배열 지옥"을 "타입 천국"으로 바꾸는 것이다.
`array` 하나 남기면 자는 법이 없다. PHPStan이 빨간줄 하나라도 내면 잠들 수 없다.
모든 보고는 한글로. 코드는 영어로.
```

---

## 📋 작업 컨텍스트 (필수 참조 파일)

작업 전 아래 파일을 반드시 전부 읽어라:

```
${PROJECT_ROOT}/.agent/Constitution.md       ← 헌법 (최상위 법)
${PROJECT_ROOT}/api/docs/openapi.yaml        ← 공개 계약 SSOT
${PROJECT_ROOT}/docs/API_SPEC.md             ← 정책/예외/레거시 보조 문서
${PROJECT_ROOT}/composer.json                ← 의존성 현황
${PROJECT_ROOT}/api/v1/Core/Exception/       ← 현재 예외 체계
${PROJECT_ROOT}/api/v1/Integration/Contracts/← Gateway 인터페이스 전체
${PROJECT_ROOT}/api/v1/*/Service/*.php       ← 서비스 계층 전체
${PROJECT_ROOT}/api/v1/*/Controller/*.php    ← 컨트롤러 계층 전체
${PROJECT_ROOT}/api/container.php            ← DI 컨테이너
${PROJECT_ROOT}/tests/                       ← 현재 테스트 전체
```

---

## ✅ 현재 저장소 상태 (2026-03-05 기준)

> 통합 감사 결과 기반 — 아래는 코드 실사로 확인된 현재 상태.

```
[현황] Gateway 인터페이스 11개 — 모든 메서드가 ?array 또는 array 반환
[현황] Service 계층 — 파라미터/반환 타입 array 사용 357건 이상
[현황] DTO 클래스 — 0개 (전무)
[현황] PHP Enum — 0개 (전무)
[현황] PHPDoc 제네릭 (@return array<int, X>) — 2건만 존재 (BlockService)
[현황] 생성자 프로퍼티 프로모션 — ✅ 이미 전면 적용
[현황] readonly — ✅ DI 의존성 전체 적용
[현황] match 표현식 — 4건 사용 중
[현황] switch 문 — 1건 (MemberService:354)
[현황] 매직넘버 `>= 10` (관리자 레벨) — 4개 파일에 분산
[현황] global $ 사용 — 0건 (글로벌 격리 완료)
[현황] ApiException — static factory 8개, guide 지원, readonly
```

---

## 🎯 미션 요약

본 프롬프트의 목표는 3가지다:

1. **DTO 혁명**: `array` 반환을 타입이 보장된 DTO로 전환
2. **Enum 혁명**: 매직넘버·문자열 리터럴을 Backed Enum으로 교체
3. **예외 코드 체계**: 에러 타입 문자열을 Enum으로 통합

---

## 🏗️ Phase 1: 핵심 DTO 생성 (신규 파일)

> **경로**: `api/v1/Core/DTO/`

### 원칙

- 모든 DTO는 `readonly class`로 선언 (PHP 8.2+)
- 프로젝트 PHP 최소 버전이 8.1이므로 `readonly` 프로퍼티 + `final class` 조합 사용
- 모든 프로퍼티에 명시적 타입 선언
- 팩토리 메서드 `fromRow(array $row): self` 제공 (DB 배열 → DTO 변환)
- PHPDoc 헤더 §8.1 준수, `declare(strict_types=1)` 필수
- `JsonSerializable` 구현하여 API 응답에 바로 사용 가능

### 생성할 DTO 목록

#### 1-1. `api/v1/Core/DTO/MemberDTO.php`
```php
/**
 * 회원 정보를 캡슐화하는 불변 데이터 전송 객체.
 *
 * @package Api\Core\DTO
 * @since   v1.1.0
 */
final class MemberDTO implements \JsonSerializable
{
    public function __construct(
        public readonly string $mbId,
        public readonly string $mbName,
        public readonly string $mbNick,
        public readonly string $mbEmail,
        public readonly int $mbLevel,
        public readonly int $mbPoint,
        public readonly ?string $mbHp,
        public readonly ?string $mbHomepage,
        public readonly ?string $mbTodayLogin,
        public readonly ?string $mbDatetime,
        public readonly ?string $mbLeaveDate,
        public readonly ?string $mbIntercept,
        public readonly string $mbPassword = '',  // 내부용, JSON 직렬화 시 제외
    ) {}

    /**
     * @param array<string, mixed> $row g5_member 테이블 행
     */
    public static function fromRow(array $row): self { /* 구현 */ }

    public function isAdmin(): bool { return $this->mbLevel >= MemberLevel::Admin->value; }
    public function isActive(): bool { /* mb_leave_date, mb_intercept 검사 */ }
    public function jsonSerialize(): mixed { /* mbPassword 제외한 배열 반환 */ }
}
```

#### 1-2. `api/v1/Core/DTO/BoardDTO.php`
```
필드: boTable, boSubject, grId, boAdmin, grAdmin, grUseAccess,
      boReadLevel, boWriteLevel, boReplyLevel, boCommentLevel,
      boUseCategory, boCategoryList, boCountWrite, boCountComment,
      boUseSecret, boUseDhtmlEditor, boUploadCount, boUploadSize,
      boListLevel, boDownloadLevel,
      boReadPoint, boWritePoint, boCommentPoint, boDownloadPoint
정적 팩토리: fromRow(array $row): self
참조: BoardService::toDetail() 메서드의 기존 매핑을 그대로 가져와 DTO화
```

#### 1-3. `api/v1/Core/DTO/PostDTO.php`
```
필드: wrId, wrNum, wrParent, wrIsComment, wrComment, wrCommentReply,
      wrSubject, wrContent, wrName, wrEmail, wrHp, wrDatetime,
      wrHit, wrGood, wrNogood, wrOption, caName, mbId
정적 팩토리: fromRow(array $row): self
메서드: isNotice(), isSecret(), isReply()
```

#### 1-4. `api/v1/Core/DTO/CommentDTO.php`
```
필드: wrId, wrParent, wrComment, wrCommentReply, wrContent,
      wrName, wrDatetime, mbId
정적 팩토리: fromRow(array $row): self
```

#### 1-5. `api/v1/Core/DTO/PointDTO.php`
```
필드: poId, mbId, poContent, poPoint, poUsePoint, poExpireDate, poDatetime
정적 팩토리: fromRow(array $row): self
```

#### 1-6. `api/v1/Core/DTO/PaginationDTO.php`
```php
final class PaginationDTO implements \JsonSerializable
{
    public function __construct(
        public readonly int $total,
        public readonly int $page,
        public readonly int $perPage,
        public readonly int $lastPage,
        public readonly bool $hasNext,
        public readonly bool $hasPrev,
    ) {}

    public static function create(int $total, int $page, int $perPage): self
    {
        $lastPage = max(1, (int)ceil($total / max(1, $perPage)));
        return new self($total, $page, $perPage, $lastPage, $page < $lastPage, $page > 1);
    }
}
```

#### 1-7. `api/v1/Core/DTO/PaginatedResult.php`
```php
/**
 * @template T
 */
final class PaginatedResult implements \JsonSerializable
{
    /**
     * @param array<int, T> $items
     */
    public function __construct(
        public readonly array $items,
        public readonly PaginationDTO $pagination,
    ) {}

    /** @return array{data: array<int, T>, pagination: array<string, mixed>} */
    public function jsonSerialize(): mixed { /* ... */ }
}
```

---

## 🏗️ Phase 2: Backed Enum 생성 (신규 파일)

> **경로**: `api/v1/Core/Enum/`

### 생성할 Enum 목록

#### 2-1. `api/v1/Core/Enum/MemberLevel.php`
```php
/**
 * 회원 등급 정의. 매직넘버 >= 10 을 완전 대체.
 */
enum MemberLevel: int
{
    case Guest = 0;
    case Normal = 1;
    case Certified = 2;
    case Admin = 10;

    public function isAdmin(): bool { return $this->value >= self::Admin->value; }
    public function isAtLeast(self $level): bool { return $this->value >= $level->value; }
}
```

#### 2-2. `api/v1/Core/Enum/VoteType.php`
```php
enum VoteType: string
{
    case Good = 'good';
    case NoGood = 'nogood';
}
```

#### 2-3. `api/v1/Core/Enum/SearchField.php`
```php
enum SearchField: string
{
    case Title = 'title';
    case Content = 'content';
    case TitleContent = 'title_content';
    case Author = 'author';
    case Comment = 'comment';

    /** @return string[] */
    public static function values(): array { return array_column(self::cases(), 'value'); }
}
```

#### 2-4. `api/v1/Core/Enum/TokenType.php`
```php
enum TokenType: string
{
    case Access = 'access';
    case Refresh = 'refresh';
}
```

#### 2-5. `api/v1/Core/Enum/ApiErrorType.php`
```php
/**
 * RFC 7807 type 필드를 통합 관리하는 Enum.
 * ApiException의 문자열 리터럴 '/errors/xxx'를 대체.
 */
enum ApiErrorType: string
{
    case BadRequest = '/errors/bad-request';
    case Unauthorized = '/errors/unauthorized';
    case Forbidden = '/errors/forbidden';
    case NotFound = '/errors/not-found';
    case Conflict = '/errors/conflict';
    case Validation = '/errors/validation';
    case TooManyRequests = '/errors/too-many-reqs';
    case Internal = '/errors/internal';
    case ServiceUnavailable = '/errors/service-unavailable';
}
```

#### 2-6. `api/v1/Core/Enum/ReportTargetType.php`
```php
enum ReportTargetType: string
{
    case Post = 'post';
    case Comment = 'comment';
    case Member = 'member';
}
```

#### 2-7. `api/v1/Core/Enum/ReportStatus.php`
```php
enum ReportStatus: string
{
    case Pending = 'pending';
    case Approved = 'approved';
    case Rejected = 'rejected';
    case Hold = 'hold';
}
```

#### 2-8. `api/v1/Core/Enum/DevicePlatform.php`
```php
enum DevicePlatform: string
{
    case Fcm = 'fcm';
    case Apns = 'apns';
}
```

---

## 🔨 Phase 3: Gateway 인터페이스 타입 전환

> 11개 Gateway 인터페이스의 반환 타입을 `?array` → `?DTO`로 교체.
> 대응하는 Repository 구현체도 동시에 수정.

### 전환 원칙
- Gateway 인터페이스의 반환 타입 변경
- Repository 구현체에서 `DTO::fromRow()` 호출 추가
- **목록 반환 메서드**: `array` → `PaginatedResult<XxxDTO>` 또는 `array<int, XxxDTO>`로 변경
- **단건 반환 메서드**: `?array` → `?XxxDTO`로 변경
- PHPDoc `@return` 제네릭 100% 추가

### 전환 순서 (의존도 낮은 순)

#### Phase 3A — 단순 Gateway (패턴 확립)
```
MenuGateway.php     → 반환 타입 array → MenuDTO[] (DTO 신규 생성 필요 시 추가)
PointGateway.php    → PointDTO, PaginatedResult<PointDTO>
LikeGateway.php     → 변환 최소 (집계 반환이므로 VoteType Enum만 적용)
```

#### Phase 3B — 핵심 Gateway
```
BoardGateway.php    → findBoard(): ?BoardDTO, listBoards(): array<int, BoardDTO>
MemberGateway.php   → findMemberById(): ?MemberDTO 등
FileGateway.php     → DTO 신규 생성 필요 시 FileDTO 추가
```

#### Phase 3C — 복잡 Gateway
```
PostGateway.php     → getPost(): ?PostDTO, listPosts(): PaginatedResult<PostDTO>
CommentGateway.php  → CommentDTO 활용
AuthGateway.php     → findMemberById(): ?MemberDTO (MemberGateway와 타입 통일)
```

#### Phase 3D — 보조 Gateway
```
MemoGateway.php     → MemoDTO 신규 생성
QaGateway.php       → QaDTO 신규 생성
```

---

## 🔨 Phase 4: Service 계층 파라미터 타입 전환

### 전환 원칙
- `array $member` → `MemberDTO $member` 교체 (전 Service 공통)
- `array $board` → `BoardDTO $board` 교체
- `array $post` → `PostDTO $post` 교체
- `array $payload` → 메서드별 개별 파라미터 또는 Request DTO 전환 검토
  - 단순 필드 2~3개 → 개별 파라미터 유지
  - 복잡 필드 4개 이상 → `CreatePostRequest`, `UpdateMemberRequest` 등 Request DTO 생성

### 주요 대상 파일 (영향도 순)

1. **BoardService.php** (233줄) — `array $member` → `MemberDTO`, `array $board` → `BoardDTO`
   - `resolveAdminRole()`, `assertGroupAccess()`, `isMemberAllowed*()` 전체
2. **PostService.php** (875줄) — `array $member`, `array $payload`, `array $board` 전체 교체
   - ⚠️ 이 파일은 SRP 위반(875줄 > 300줄). 전환 시 분리 기회로 활용:
     - `PostService` → 핵심 CRUD
     - `PostPermissionService` → 권한 검증 (`assertSecretReadable` 등)
     - `PostPointService` → 포인트 적립/회수
3. **AuthService.php** (493줄) — `array $member` → `MemberDTO`
4. **CommentService.php** — `array $member`, `array $board` 교체
5. **MemberService.php** — `array $member` → `MemberDTO`
6. **FileService.php** — `array $member`, `array $board` 교체
7. **LikeService.php** — `string $voteType` → `VoteType` Enum
8. **MemoService.php**, **QaService.php** — `array $member` → `MemberDTO`

---

## 🔨 Phase 5: 매직넘버 & 문자열 리터럴 교체

### 5-1. 관리자 레벨 `>= 10` 교체 (4건)

```php
// ❌ 현재 (4개 파일에 분산)
$isAdmin = ((int)($member['mb_level'] ?? 0)) >= 10;

// ✅ 교체 후
$isAdmin = $member->isAdmin();
// 또는 DTO 전환 전이라면:
$isAdmin = MemberLevel::from((int)($member['mb_level'] ?? 0))->isAdmin();
```

대상 파일:
- `api/v1/Memo/Service/MemoService.php:78`
- `api/v1/Qa/Service/QaService.php:570`
- `api/v1/Member/Service/MemberService.php:255`
- `api/v1/Auth/Service/AuthService.php:278`

### 5-2. ApiException type 문자열 → ApiErrorType Enum 교체

```php
// ❌ 현재
return new self(400, 'Bad Request', $detail, '/errors/validation', $guide);

// ✅ 교체 후
return new self(400, 'Bad Request', $detail, ApiErrorType::Validation, $guide);
```

`ApiException` 클래스의 `$type` 프로퍼티 타입을 `string` → `ApiErrorType`으로 변경.
`toProblem()` 에서 `$this->type->value`로 직렬화.

### 5-3. switch → match 교체 (1건)

```
대상: api/v1/Member/Service/MemberService.php:354
switch ($field) 블록을 match 표현식으로 교체
```

---

## 🔨 Phase 6: 테스트 보강

### 원칙
- 모든 신규 DTO에 단위 테스트 작성 (`tests/Core/DTO/`)
- 모든 신규 Enum에 단위 테스트 작성 (`tests/Core/Enum/`)
- 기존 테스트 33개가 타입 변경으로 깨지면 **즉시 수정**
- Mockery 스텁 반환값을 DTO 객체로 교체

### 필수 테스트 파일

```
tests/Core/DTO/MemberDTOTest.php       ← fromRow, isAdmin, isActive, jsonSerialize
tests/Core/DTO/BoardDTOTest.php        ← fromRow, jsonSerialize
tests/Core/DTO/PaginationDTOTest.php   ← create 경계값 (total=0, page=last 등)
tests/Core/DTO/PaginatedResultTest.php ← 제네릭 타입 보존 확인
tests/Core/Enum/MemberLevelTest.php    ← from(), isAdmin(), isAtLeast()
tests/Core/Enum/VoteTypeTest.php       ← tryFrom 유효/무효 케이스
tests/Core/Enum/SearchFieldTest.php    ← values(), tryFrom
tests/Core/Enum/ApiErrorTypeTest.php   ← 전체 케이스 value 확인
```

---

## 🔄 Phase 7: 자기 감사 및 자동 수정 루프

**각 Phase 완료 후 반드시 아래 순서로 자기 감사를 실행하라.**

```bash
# 1. 코드 스타일 자동 수정
composer run cs-fix

# 2. 정적 분석 (PHPStan Level 8)
composer run analyse

# 3. 테스트 실행
composer run test

# 4. 배열 잔존 검사 (감소 추적)
echo "=== array 반환 잔존 수 ===" && grep -rn ": array" api/v1/ --include="*.php" | wc -l

# 5. 매직넘버 잔존 검사
echo "=== 매직넘버 >= 10 잔존 ===" && grep -rn "mb_level.*>=.*10" api/v1/ --include="*.php" | grep -v "Enum/" | grep -v "DTO/"

# 6. enum 0건 탈출 확인
echo "=== Enum 파일 수 ===" && find api/v1/Core/Enum -name "*.php" | wc -l
```

**감사 결과 판정 기준**:

| 조건 | 행동 |
|------|------|
| PHPStan 에러 존재 | 에러 분석 → 타입 힌트 수정 → 재감사 |
| PHPUnit 실패 | 실패 분석 → 타입 전환 미반영 테스트 수정 → 재실행 |
| `array` 반환 잔존 | 해당 메서드 DTO 전환 → 재감사 |
| 매직넘버 잔존 | Enum 교체 누락 수정 → 재감사 |
| 모두 통과 | 다음 Phase 진입 |

**루프 종료 조건**:
```
✅ PHPStan Level 8 에러 0
✅ PHPUnit 전체 통과 (기존 33개 + 신규 DTO/Enum 테스트)
✅ 핵심 Gateway 11개에서 array 반환 → DTO 반환 전환 완료
✅ Enum 파일 8개 이상 생성
✅ 매직넘버 >= 10 잔존 0건 (Core/Enum 자체 제외)
✅ ApiException.type → ApiErrorType Enum 전환 완료
```

---

## ⚡ 실행 순서 요약

```
[ ] Phase 1:  DTO 6+1종 생성 (MemberDTO, BoardDTO, PostDTO, CommentDTO, PointDTO, PaginationDTO, PaginatedResult)
[ ] Phase 2:  Enum 8종 생성 (MemberLevel, VoteType, SearchField, TokenType, ApiErrorType, ReportTargetType, ReportStatus, DevicePlatform)
[ ] Phase 3A: 단순 Gateway (Menu, Point, Like) 타입 전환
[ ] Phase 3B: 핵심 Gateway (Board, Member, File) 타입 전환
[ ] Phase 3C: 복잡 Gateway (Post, Comment, Auth) 타입 전환
[ ] Phase 3D: 보조 Gateway (Memo, Qa) 타입 전환
[ ] Phase 4:  Service 계층 파라미터 타입 전환 (PostService 분리 포함)
[ ] Phase 5:  매직넘버/문자열 리터럴 → Enum 교체
[ ] Phase 6:  테스트 보강 (DTO/Enum 테스트 + 기존 테스트 수정)
[ ] Phase 7:  자기 감사 루프 → 모든 게이트 통과 확인
```

---

## 📝 각 Phase 완료 보고 양식

Phase 완료 시 반드시 아래 형식으로 보고하라 (한글):

```
## Phase X 완료 보고

### 작업 내용
- 생성한 DTO/Enum: [파일명 목록]
- 타입 전환한 Gateway/Service: [파일명 → 변경 내용]
- 제거한 매직넘버: [파일:줄번호 → Enum명]
- 삭제/교체한 array 반환: [n건 → DTO 반환]

### 감사 결과
- PHPStan Level 8: [통과/에러 n건]
- PHPUnit: [n/n 통과]
- array 반환 잔존: [n건 (시작 대비 감소/증가)]
- Enum 파일 수: [n개]

### 다음 Phase
- [다음 작업 내용]
```

---

## 🚨 절대 위반 금지 (헌법 최상위 규칙 + 본 미션 추가 규칙)

```
❌ common.php, lib/*.php 등 G5 파일 include 금지
❌ declare(strict_types=1) 누락 금지
❌ §8.1 PHPDoc 파일 헤더 누락 금지
❌ 기존 test 33개를 삭제하거나 skip 처리 금지 (반드시 통과시켜라)
❌ DTO에 setter 메서드 만들기 금지 (불변 객체 원칙)
❌ Enum에 mutable 상태 추가 금지
❌ Gateway 인터페이스 메서드 시그니처 변경 시 모든 Repository 구현체 동시 수정 필수
❌ array 반환을 줄이려고 any/mixed 남발 금지
❌ 상상으로 필드 추가 금지 — g5_member/g5_board 등 실제 DDL 문서(docs/ddls/) 기준으로만 필드 정의
❌ 쇼핑몰 소비자 영역(`shop/`) 관련 구현 금지
❌ 영카트 쇼핑몰 관리자단(`adm/shop_admin/`) 포팅은 헌법 §9-2에 따라 별도 감사/구현 규칙 적용
```

---

## 💡 힌트: 자주 쓰는 패턴

### DTO 표준 구조
```php
<?php
/**
 * [도메인] 데이터 전송 객체 (불변).
 *
 * @package Api\Core\DTO
 * @since   v1.1.0
 */
declare(strict_types=1);

namespace Api\Core\DTO;

final class XxxDTO implements \JsonSerializable
{
    public function __construct(
        public readonly string $id,
        public readonly string $name,
        // ...
    ) {}

    /** @param array<string, mixed> $row */
    public static function fromRow(array $row): self
    {
        return new self(
            id: (string)($row['xxx_id'] ?? ''),
            name: (string)($row['xxx_name'] ?? ''),
        );
    }

    /** @return array<string, mixed> */
    public function jsonSerialize(): array
    {
        return ['id' => $this->id, 'name' => $this->name];
    }
}
```

### Gateway → DTO 전환 패턴
```php
// ❌ 현재 Gateway
public function findBoard(string $boTable): ?array;

// ✅ 전환 후
public function findBoard(string $boTable): ?BoardDTO;

// Repository 구현체:
public function findBoard(string $boTable): ?BoardDTO
{
    $row = $this->fetchAssociative($sql, $params);
    return $row !== false ? BoardDTO::fromRow($row) : null;
}
```

### Service에서 MemberDTO 사용 패턴
```php
// ❌ 현재
public function createPost(string $boTable, array $member, array $payload, string $ip): array
{
    $memberId = (string)($member['mb_id'] ?? '');
    $level = (int)($member['mb_level'] ?? 0);
    ...
}

// ✅ 전환 후
public function createPost(string $boTable, MemberDTO $member, array $payload, string $ip): PostDTO
{
    $memberId = $member->mbId;
    if ($member->isAdmin()) { ... }
    ...
}
```

---

> **IRONDEV, 시작하라. `array`를 하나씩 사냥하라.**
> **모든 Phase가 PHPStan Level 8 + PHPUnit 100% 를 통과할 때까지.**
> **DTO 없는 PHP는 집 없는 사람과 같다. 타입 안전한 집을 지어라.**
