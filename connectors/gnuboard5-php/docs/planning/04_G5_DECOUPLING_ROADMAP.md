# G5 완전 탈의존 로드맵 — 현대 PHP 전환 전략

> [!IMPORTANT]
> 이 문서는 장기 전략용 지원 문서입니다.
> 구현 우선순위와 착수 순서의 canonical SSOT는 `docs/IMPLEMENTATION_ROADMAP.md`입니다.

> **상태**: 📋 분석 완료 / 실행 대기
> **실행 방식**: AI 코덱스 야간 자동화 가능 (단위 태스크별 독립 실행)
> **목표**: G5 PHP 파일 의존도 **100% → 완전 제로**. 단 하나의 G5 파일도 include하지 않는다.
> **원칙**: 레거시 제약 해제 → **현대 PHP 개발 방법론을 전면 도입**한다.

---

## 0. 방법론 결정: "레거시 꺼져" 이후의 현대 PHP 스택

### 핵심 결정: PDO + Query Builder (ORM 아님)

| 선택지 | 장점 | 단점 | 판정 |
|--------|------|------|------|
| **Raw PDO** | 가볍고 빠름, 학습비용 제로 | 쿼리 빌딩 반복, 보일러플레이트 | ❌ 너무 날것 |
| **PDO + Query Builder (채택)** | 타입 안전, SQL 인젝션 방지, 가벼움 | ORM보다 추상화 낮음 | ✅ **최적** |
| **Doctrine ORM** | 완전한 객체 매핑, 마이그레이션 | 무겁고 복잡, G5 스키마와 마찰 | ❌ 오버킬 |
| **Eloquent (Laravel)** | 직관적 API | Laravel 의존성 유입, 독립 운영 어려움 | ❌ 프레임워크 종속 |

**이유**: G5 테이블은 이미 존재하고 우리가 스키마를 설계한 게 아님. Full ORM은 기존 스키마와 충돌이 많고, 마이그레이션 도구를 쓸 수도 없음. **PDO + 경량 쿼리 빌더**가 "G5 테이블을 그대로 쓰면서 현대적으로 접근"하는 최적의 해법.

### 추천 쿼리 빌더

```php
// Doctrine DBAL (Query Builder만 사용, ORM 미사용)
$qb = $connection->createQueryBuilder();
$result = $qb->select('mb_id', 'mb_nick', 'mb_email')
    ->from('g5_member')
    ->where('mb_id = :id')
    ->setParameter('id', $memberId)
    ->executeQuery()
    ->fetchAssociative();
```

### 현대 PHP 전체 스택 (G5 탈의존 후 사용 가능)

| 카테고리 | 기술 | 역할 |
|---------|------|------|
| **언어** | PHP 8.1+ | Enum, Readonly, Named Args, Fibers, Union/Intersection Types |
| **라우팅** | Slim 4 (유지) | PSR-7/PSR-15 마이크로 프레임워크 |
| **DB 접근** | PDO + Doctrine DBAL | 쿼리 빌더 + Prepared Statement + 트랜잭션 |
| **DI 컨테이너** | PHP-DI | PSR-11 호환, 자동 와이어링, 인터페이스 바인딩 |
| **검증** | Rakit Validation (유지) | 입력값 검증 |
| **인증** | firebase/php-jwt (유지) | JWT 발급/검증 |
| **로깅** | Monolog | PSR-3, 파일/Syslog/Slack 다중 핸들러 |
| **문서화** | OpenAPI YAML + API_SPEC (유지) | `api/docs/openapi.yaml` SSOT + `docs/API_SPEC.md` 보조 문서 |
| **정적 분석** | PHPStan Level 8 | 타입 안전성 최고 수준 강제 |
| **테스트** | PHPUnit + Mockery | 단위/통합/계약 테스트 |
| **코드 스타일** | PHP-CS-Fixer (PSR-12) | 자동 포맷팅 |

### PHP 8.1+ 현대 문법 전면 도입

```php
<?php
declare(strict_types=1);

// Enum (게시판 검색 필드)
enum SearchField: string
{
    case Title = 'title';
    case Content = 'content';
    case TitleContent = 'title_content';
    case Author = 'author';
}

// Readonly DTO (불변 데이터 전달)
final readonly class MemberDto
{
    public function __construct(
        public string $mbId,
        public string $mbNick,
        public string $mbEmail,
        public int $mbLevel,
        public int $mbPoint,
    ) {}
}

// Named Arguments (가독성)
$member = new MemberDto(
    mbId: 'user01',
    mbNick: '닉네임',
    mbEmail: 'user@example.com',
    mbLevel: 2,
    mbPoint: 1500,
);

// Union Types (에러 핸들링)
function findMember(string $id): MemberDto|null
{
    // ...
}

// Match Expression (권한 체크)
$permission = match(true) {
    $level >= 10 => Permission::Admin,
    $level >= 5  => Permission::Manager,
    $level >= 2  => Permission::Writer,
    default      => Permission::Reader,
};
```

### PSR 표준 전면 준수

| PSR | 이름 | 적용 |
|-----|------|------|
| PSR-1/12 | 코딩 스타일 | PHP-CS-Fixer 자동 강제 |
| PSR-3 | Logger Interface | Monolog |
| PSR-4 | Autoloading | Composer autoload |
| PSR-7 | HTTP Message | Slim PSR-7 |
| PSR-11 | Container | PHP-DI |
| PSR-15 | HTTP Middleware | Slim Middleware |

### 디렉토리 구조 (탈의존 최종 형태)

```
/api
├── /v1
│   ├── /Core                    ← [NEW] 인프라 레이어
│   │   ├── /Database
│   │   │   ├── PdoConnectionFactory.php
│   │   │   ├── QueryBuilder.php (Doctrine DBAL 래퍼)
│   │   │   └── TableRegistry.php
│   │   ├── /Security
│   │   │   └── PasswordCompat.php
│   │   ├── /Util
│   │   │   └── DateTime.php
│   │   └── /Exception
│   │       ├── ApiException.php
│   │       ├── NotFoundException.php
│   │       └── ValidationException.php
│   ├── /Auth
│   │   ├── /Controller/AuthController.php
│   │   ├── /Service/AuthService.php
│   │   ├── /Repository/AuthRepository.php      ← PDO 전용
│   │   └── /Dto/TokenDto.php                   ← readonly class
│   ├── /Member
│   │   ├── /Controller/MemberController.php
│   │   ├── /Service/MemberService.php
│   │   ├── /Repository/MemberRepository.php    ← PDO 전용
│   │   └── /Dto/MemberDto.php                  ← readonly class
│   ├── ... (Board, Post, Comment, File, Like, Point, Menu)
│   └── /Middlewares
│       ├── JwtAuthMiddleware.php
│       ├── CorsMiddleware.php
│       └── AdminGuardMiddleware.php
├── /docs
├── /vendor
├── index.php         ← common.php 없이 독립 부팅
├── routes.php
└── container.php     ← [NEW] PHP-DI 설정

---

## 1. 현재 상태 분석 결과 (실측 기준 수정본)

> ⚠️ 아래 수치는 실제 `grep` 계측값입니다. 초판 추정치와 다릅니다.

### 1-1. 실측 의존도 요약

| 의존 유형 | 실측 횟수 | 사용 레이어 | 대체 난이도 |
|-----------|----------|------------|------------|
| `sql_query()` | **38회** | Repository | ⭐ 쉬움 (PDO 전환) |
| `sql_fetch()` | **25회** | Repository | ⭐ 쉬움 |
| `sql_fetch_array()` | **12회** | Repository | ⭐ 쉬움 |
| `sql_insert_id()` | **3회** | Repository | ⭐ 쉬움 |
| `$g5['table_name']` 전역 | ~15회 | Repository | ⭐ 쉬움 (env 전환) |
| `G5_DATA_PATH`, `G5_FILE_PERMISSION` | 6회 | **Repository + Service ⚠️** | ⭐ 쉬움 (env 전환) |
| `G5_TIME_YMDHIS` 상수 | ~6회 | Repository | ⭐ 쉬움 (`date()` 전환) |
| `get_member()` | 1회 | AuthRepository | ⭐⭐ 보통 (PDO 직접 쿼리로 대체) |
| `login_password_check()` + `get_encrypt_string()` | 2회 | AuthRepository | ⭐⭐ 보통 (.env 기반 대체) |
| `insert_point()` | 1회 | AuthRepository (회원가입 포인트) | ⭐⭐⭐ 어려움 (로직 재구현 필요) |
| `common.php` 로드 | 1회 | `api/index.php:108` | ⭐⭐⭐ 핵심 (최종 제거 대상) |

### 1-2. 격리 현황 (초판 수정)

> **초판 오류 수정**: "Service 레이어는 G5 의존 없음"이라는 주장은 틀렸습니다.

```
Controller  → G5 의존 없음 ✅
Service     → FileService가 G5_DATA_PATH, G5_TIME_* 직접 참조 ⚠️
Repository  → G5 함수(sql_query 등) 집중 사용 (주 전환 대상)  ⚠️
```

**우선순위 조정**: `FileService`의 G5 상수 제거도 Phase 2에 포함해야 합니다.
`AuthRepository`의 `insert_point()` 포팅이 가장 복잡한 단일 태스크입니다.

---

## 2. G5 함수 → PDO 대체 매핑표

| G5 함수 | 대체 코드 | 비고 |
|---------|----------|------|
| `sql_query($sql)` | `$pdo->exec($sql)` 또는 `$pdo->query($sql)` | Prepared Statement 권장 |
| `sql_fetch($sql)` | `$pdo->query($sql)->fetch(PDO::FETCH_ASSOC)` | 단일 행 |
| `sql_fetch_array($result)` | `$stmt->fetch(PDO::FETCH_ASSOC)` | 반복 행 |
| `sql_insert_id()` | `$pdo->lastInsertId()` | 트랜잭션 내 사용 |
| `sql_num_rows($result)` | `$stmt->rowCount()` | SELECT에선 비권장 → COUNT 쿼리 |
| `sql_free_result($result)` | `$stmt->closeCursor()` 또는 제거 | PDO 자동 관리 |

### 전역 변수/상수 대체

| G5 전역 | 대체 방식 |
|---------|----------|
| `$g5['member_table']` | `$_ENV['G5_TABLE_PREFIX'] . 'member'` 또는 DI 설정 |
| `$g5['board_table']` | `$_ENV['G5_TABLE_PREFIX'] . 'board'` |
| `$g5['write_prefix']` | `$_ENV['G5_TABLE_PREFIX'] . 'write_'` |
| `G5_TIME_YMDHIS` | `date('Y-m-d H:i:s')` |
| `G5_TIME_YMD` | `date('Y-m-d')` |
| `G5_DATA_PATH` | `$_ENV['G5_DATA_PATH']` |
| `G5_FILE_PERMISSION` | `$_ENV['G5_FILE_PERMISSION'] ?? '0644'` |

### 비밀번호 검증 전략: G5 함수 미사용, PHP 네이티브 完

**핵심 원칙**: G5의 `check_password()`, `login_password_check()`, `get_encrypt_string()`을 **임포트하지 않는다.**  
대신 PHP 네이티브 함수와 `.env` 설정으로 완전 대체한다.

```php
// G5의 check_password() 내부는 결국 이것이다
password_verify($plainPassword, $hashedPassword);  // PHP 8 네이티브

// G5_STRING_ENCRYPT_FUNCTION (암호화 방식) → .env에서 읽기
// .env: G5_ENCRYPT_FUNC=create_hash  또는  G5_ENCRYPT_FUNC=sql_password
$func = strtolower($_ENV['G5_ENCRYPT_FUNC'] ?? 'create_hash');

// 레거시 G5 (구버전 sql_password 해시) 폴백
if (password_verify($plain, $hash)) { return true; }
if ($func === 'create_hash' && validate_password($plain, $hash)) { return true; }
if ($func === 'sql_password' && sql_password($plain) === $hash) { return true; }
return false;
```

> **설치 시 사용자가 `.env`에 자신의 G5 설정값을 입력한다.**  
> API가 G5 파일을 읽는 게 아니라, 설치 매뉴얼이 사용자에게 "당신 그누보드5의 설정을 여기다 옮겨 쓰세요"라고 안내한다.  
> G5 파일 의존 = 0, 호환성 = 100%.

---

## 3. 실행 계획 (코덱스 야간 태스크)

### Phase 0: 설치 어시스턴트(Install Wizard) 구축 (1야)

**설계 원칙**: API가 G5 파일에서 설정을 직접 읽는 것은 작업 의도 위반.  
대신 **웹 기반 설치 체크리스트 페이지**를 제공하여 사용자가 스스로 환경을 확인하고 `.env`를 구성하도록 안내한다.

#### 설치 어시스턴트 동작 방식

```
사용자가 /setup 접속
        ↓
환경 자동 체크 (PHP 버전, 확장, DB 연결 등)
        ↓
미설정 항목 → ❌ + 구체적 지시문 표시
설정 완료 항목 → ✅ + 완료 표시
        ↓
전체 ✅ 시 → "설치 완료, /setup 접근 차단" 안내
```

#### 체크 항목 목록

| # | 체크 항목 | 자동 감지 | 실패 시 안내 문구 |
|---|----------|----------|------------------|
| 1 | PHP 8.1+ 버전 확인 | ✅ 자동 | "PHP 버전을 8.1 이상으로 업그레이드하세요" |
| 2 | PDO, PDO_MySQL 확장 활성화 | ✅ 자동 | "php.ini에서 `extension=pdo_mysql` 활성화하세요" |
| 3 | `.env` 파일 존재 여부 | ✅ 자동 | "`cp .env.example .env` 명령어를 실행하세요" |
| 4 | DB 연결 테스트 | ✅ 자동 | ".env의 DB_HOST, DB_NAME, DB_USER, DB_PASS를 확인하세요" |
| 5 | `g5_member` 테이블 존재 확인 | ✅ 자동 | "그누보드5 DB명과 테이블 접두사(DB_TABLE_PREFIX)를 확인하세요" |
| 6 | `G5_DATA_PATH` 경로 존재 | ✅ 자동 | "그누보드5의 data 폴더 절대경로를 G5_DATA_PATH에 입력하세요" |
| 7 | `G5_DATA_PATH` 쓰기 권한 | ✅ 자동 | "`chmod 707 data/` 명령어를 실행하세요" |
| 8 | `G5_ENCRYPT_FUNC` 설정 확인 | ✅ 자동 | "그누보드5 config.php의 G5_STRING_ENCRYPT_FUNCTION 값을 확인 후 입력하세요" |
| 9 | JWT 시크릿 키 설정 여부 | ✅ 자동 | "`JWT_SECRET`에 32자 이상의 랜덤 문자열을 입력하세요" |
| 10 | `/setup` 접근 차단 여부 (최종) | ✅ 자동 | "설치 완료 후 `.env`에 `SETUP_ENABLED=false` 설정하세요" |

#### 설치 어시스턴트 UI (텍스트 기반)

```
[GET /setup]

🔧 그누보드5 REST API 설치 어시스턴트
──────────────────────────────────────
✅ PHP 8.3.4     — 요구사항 충족
✅ PDO/MySQL     — 확장 활성화됨
✅ .env          — 파일 존재
✅ DB 연결       — 그누보드5 DB 연결 성공
✅ g5_member     — 테이블 확인됨
❌ G5_DATA_PATH  — 경로 없음 또는 쓰기 권한 없음
                   → config.php에서 G5_DATA_PATH 값을 복사 후
                     .env의 G5_DATA_PATH에 입력하세요
⚠️  G5_ENCRYPT_FUNC — 미설정 (기본값 create_hash 사용 중)
                   → 기존 회원 로그인 문제가 생기면
                     config.php의 G5_STRING_ENCRYPT_FUNCTION 확인
❌ JWT_SECRET    — 미설정
                   → .env에 JWT_SECRET=랜덤32자 입력하세요

6/9 항목 통과 — 위 ❌ 항목 해결 후 페이지를 새로고침하세요.
```

#### 구현 파일

| 파일 | 역할 |
|------|------|
| `api/v1/Setup/Controller/SetupController.php` | 체크 항목 실행 및 JSON 응답 |
| `api/v1/Setup/Service/EnvironmentChecker.php` | 각 체크 항목 로직 |
| 라우트: `GET /setup` | `SETUP_ENABLED=true` 일 때만 활성화 |

---

### Phase 1: PDO 인프라 구축 (1야)

| 태스크 ID | 내용 | 파일 | 예상 시간 |
|----------|------|------|----------|
| **P1-1** | PDO 커넥션 팩토리 생성 | `api/v1/Core/Database/PdoConnectionFactory.php` [NEW] | 30분 |
| **P1-2** | `.env`에 DB 접속 정보 추가 | `.env.example` 수정 | 10분 |
| **P1-3** | 테이블명 설정 클래스 (`TableRegistry`) | `api/v1/Core/Database/TableRegistry.php` [NEW] | 20분 |
| **P1-4** | 시간 유틸 (`G5_TIME_*` 대체) | `api/v1/Core/Util/DateTime.php` [NEW] | 10분 |
| **P1-5** | 비밀번호 유틸 (네이티브 검증) | `api/v1/Core/Security/PasswordCompat.php` [NEW] | 20분 |
| **P1-6** | DI 컨테이너에 PDO 등록 | `api/index.php` 수정 | 20분 |

**Phase 1 산출물**: PDO 기반 유틸 클래스 세트 + 단위 테스트

---

### Phase 2: Repository PDO 전환 (2~3야)

**전환 순서**: 의존도 낮은 것부터 시작 (실패 영향 최소화)

| 야간 | 대상 Repository | G5 함수 호출 수 | 작업 내용 |
|------|----------------|-----------------|----------|
| **2야** | `MenuRepository` | 3회 | `sql_query` → PDO, `$g5['menu_table']` → `TableRegistry` |
| **2야** | `PointRepository` | 5회 | 동일 패턴 전환 |
| **2야** | `LikeRepository` | 6회 | 동일 패턴 전환 |
| **3야** | `BoardRepository` | 5회 | 동일 + `$g5['write_prefix']` 전환 |
| **3야** | `FileRepository` | 7회 | 동일 + `G5_DATA_PATH` → env 전환 |
| **3야** | `MemberRepository` | 6회 | 동일 패턴 전환 |
| **4야** | `PostRepository` | 18회 | 가장 큰 Repository, 동적 테이블 쿼리 포함 |
| **4야** | `CommentRepository` | 15회 | 계층형 댓글 쿼리 포함 |
| **4야** | `AuthRepository` | ~8회 | `check_password` → `PasswordCompat` 전환 |

**각 Repository 전환 절차** (코덱스 반복 패턴):

```
1. Repository 생성자에 PDO + TableRegistry 주입
2. sql_query/fetch → PDO prepared statement로 교체
3. $g5['xxx_table'] → $this->tables->get('xxx')로 교체
4. G5_TIME_* → DateTime::now()로 교체
5. 기존 계약 테스트 실행 → 통과 확인
6. GnuboardDependencyGuard::assertFunctions() 호출 제거
```

---

### Phase 3: common.php 제거 (1야)

| 태스크 ID | 내용 |
|----------|------|
| **P3-1** | `api/index.php`에서 `include common.php` 라인 제거 |
| **P3-2** | `ob_start()` / G5 부트스트랩 억제 코드 전체 제거 |
| **P3-3** | `GnuboardDependencyGuard` 클래스 제거 |
| **P3-4** | `.env`의 DB 설정으로 PDO 직접 연결 |
| **P3-5** | 전체 테스트 스위트 실행 → 통과 확인 |
| **P3-6** | `/health` 엔드포인트에서 "G5-Independent: true" 반환 확인 |

---

## 4. 전환 전/후 아키텍처

### Before (현재)

```
[Request] → api/index.php
                ↓
          include common.php  ← 💀 여기서 parse error 나면 전체 사망
                ↓
          config.php → DB 설정
          lib/*.php → 함수 수백 개 로드
          session_start() → 불필요한 세션 시작
          전역변수 $g5, $member, $config 오염
                ↓
          [Slim Router] → Controller → Service → Repository
                                                      ↓
                                                 sql_query() ← G5 함수
```

### After (탈의존 완료)

```
[Request] → api/index.php
                ↓
          .env → PDO 직접 연결  ← ✅ G5와 완전 독립
                ↓
          [Slim Router] → Controller → Service → Repository
                                                      ↓
                                                 PDO::prepare() ← PHP 네이티브
```

**결과**:
- `common.php` 없이 API 독립 기동
- G5 코어에 parse error가 나도 **API는 100% 생존**
- 세션·전역변수 오염 제로
- DB 접속 정보도 `.env` 직접 관리 → `config.php` 불필요

---

## 5. 설치 시 .env 매핑 명세 (설치 매뉴얼 핵심)

**설계 원칙**: API가 G5 파일에서 상수/설정을 읽지 않는다. 설치 시 사용자가 자신의 G5 설정값을 `.env`에 직접 입력한다.

| .env 키 | G5 원본 | 설명 | 예시 값 |
|---------|---------|------|--------|
| `DB_HOST` | `$g5['connect']` (config.php) | DB 호스트 | `localhost` |
| `DB_PORT` | - | DB 포트 | `3306` |
| `DB_NAME` | `G5_DB_NAME` (config.php) | DB명 | `gnuboard5` |
| `DB_USER` | `G5_DB_USER` (config.php) | DB 계정 | `root` |
| `DB_PASS` | `G5_DB_PASSWORD` (config.php) | DB 비밀번호 | `secret` |
| `DB_TABLE_PREFIX` | `G5_TABLE_PREFIX` (config.php) | 테이블 접두사 | `g5_` |
| `G5_DATA_PATH` | `G5_DATA_PATH` (config.php) | 그누보드 data 디렉토리 절대경로 | `/var/www/html/data` |
| `G5_ENCRYPT_FUNC` | `G5_STRING_ENCRYPT_FUNCTION` (config.php) | 비밀번호 암호화 함수 | `create_hash` 또는 `sql_password` |
| `G5_FILE_PERMISSION` | `G5_FILE_PERMISSION` (config.php) | 파일 생성 퍼미션 | `0644` |
| `G5_DIR_PERMISSION` | `G5_DIR_PERMISSION` (config.php) | 디렉토리 퍼미션 | `0755` |

> **설치 매뉴얼 안내 문구**: "당신의 그누보드5 `/config.php`를 열어 아래 값들을 복사해서 `.env`에 입력하세요."

## 6. 리스크 및 대응

| 리스크 | 확률 | 대응 |
|--------|------|------|
| `.env` 미설정 시 API 기동 불가 | 낮음 | 부팅 시 필수 env 키 검증 + 친절한 오류 메시지 출력 |
| 비밀번호 알고리즘 불일치 | 낮음 | `.env`의 `G5_ENCRYPT_FUNC` + `password_verify()` 폴백으로 100% 호환 |
| `insert_point()` 로직 복잡도 | 중간 | `PointRepository`에서 포인트 증감 로직을 PDO+순수PHP로 재구현 |
| G5 이벤트 훅(hook) 미작동 | 낮음 | 본 프로젝트는 G5 훅 시스템 미사용 (API 계층에서 직접 처리) |

---

## 6. 코덱스(Codex) 프롬프트 템플릿

각 Phase의 태스크를 야간에 코덱스에게 맡길 때 사용할 프롬프트 형태:

```
[Phase 1-1] PDO 커넥션 팩토리 생성

목표: api/v1/Core/Database/PdoConnectionFactory.php 신규 생성

요구사항:
1. .env에서 DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASS 읽기
2. PDO 인스턴스를 싱글턴으로 관리
3. PDO::ATTR_ERRMODE => ERRMODE_EXCEPTION 강제
4. PDO::ATTR_DEFAULT_FETCH_MODE => FETCH_ASSOC 기본
5. 연결 실패 시 ApiException 발생
6. charset=utf8mb4 강제
7. PHPUnit 단위테스트 작성 (tests/Unit/Core/Database/)
8. 헌법 §8.1 파일 헤더 주석 포함

참조 파일: .env.example, api/index.php
헌법: .agent/Constitution.md §8.2 strict_types, §8.5 PDO 전용
```

---

## 7. 완료 기준

- [x] Phase 1: PDO 인프라 구축 및 단위 테스트 통과
- [x] Phase 2: Repository 기본 경로 PDO 전용 전환 완료 (`LEGACY_SQL_FALLBACK=false` 기본)
- [x] Phase 3: `common.php` include 제거, API 독립 기동 확인
- [x] 전체 PHPUnit 테스트 스위트 100% 통과
- [x] `/health` 엔드포인트 G5 미의존 확인
- [x] 스테이징 배포 후 스모크 테스트 통과

---

## 9. 예상 일정 (수정본)

> 초판 4~5야 → Auth/포인트 복잡도 및 실측 의존도 반영하여 상향 조정

| Phase | 작업 | 야간 | 비고 |
|-------|------|------|------|
| Phase 0 | 설치 어시스턴트 구축 | **1야** | SetupController + EnvironmentChecker |
| Phase 1 | PDO 인프라 구축 | **1야** | Core 레이어 신규 파일 |
| Phase 2 | Repository (단순 도메인) | **2야** | Menu, Point, Like, Board, File, Member |
| Phase 3 | Repository (복잡 도메인) | **2야** | Post(18회), Comment(15회), AuthRepository (`insert_point` 포팅 포함) |
| Phase 4 | FileService G5 상수 제거 | **1야** | Service 레이어 잔존 의존 정리 |
| Phase 5 | common.php 완전 제거 | **1야** | index.php 정리 + 전체 테스트 |
| **합계** | | **6~8야** | Auth insert_point 복잡도에 따라 ±1~2야 |

> **핵심**: 코덱스가 밤마다 단일 Phase씩 처리하면 충분합니다.  
> 각 야간 작업 전 테스트 통과 확인 → 다음 Phase로 진입하는 게이트 방식으로 운영하세요.
