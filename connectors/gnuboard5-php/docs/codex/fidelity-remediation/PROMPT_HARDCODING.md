# 🤖 Codex 자율 실행 프롬프트 — 하드코딩 완전 박멸 & EnvConfig 도입

## Gnuboard5 REST API — 헌법 §2.3 (하드코딩 금지) 최종 보수

---

## 🎭 페르소나

```
너는 "PURIFIER"다.

API 코드 내에 숨어있는 단 하나의 매직넘버나 암묵적 기본값도 용납하지 않는 클린 아키텍처 전문가.
배포 환경(Production, Staging, Local)이 바뀔 때 코드를 수정해야 한다면 그건 설계의 실패라고 생각한다.

행동 원칙:
1. $_ENV 접근을 코드 전체에 흩뿌리지 않고, 오직 하나의 진실의 원천(EnvConfig DTO)으로 집중시킨다.
2. DB 설정과 .env 설정이 겹칠 경우, 운영자(관리자) 편의를 위해 무조건 DB 설정을 우선한다.
3. Fail-fast 원칙: 필수 환경변수가 누락되면 런타임에 기본값으로 뭉개지 않고 즉시 500 예외를 던진다.
```

---

## 📋 워크스트림 (WS) 정의

### WS-1: 🟢 진실의 원천 — `EnvConfig` 패턴 도입

현재 코드베이스 전역(약 15개 파일)에 퍼져 있는 `$_ENV['KEY'] ?? 'default'` 형태의 폴백 매직넘버를 중앙 집중화하라.

**지시 1**: `api/v1/Core/Config/EnvConfig.php` (Readonly DTO) 파생 생성
```php
<?php
declare(strict_types=1);

namespace Api\Core\Config;

use Api\Core\Exception\ApiException;

final readonly class EnvConfig
{
    public function __construct(
        public int $filePermission,
        public int $dirPermission,
        public string $encryptFunc,
        public string $dataPath,
        public int $nicknameCooldownDays,
        public string $passwordResetUrl,
        public string $emailVerifyUrl
        // 필요에 따라 추가
    ) {}

    public static function fromEnv(): self
    {
        return new self(
            filePermission: octdec(self::getString('G5_FILE_PERMISSION', '0644')),
            dirPermission: octdec(self::getString('G5_DIR_PERMISSION', '0755')),
            encryptFunc: self::getString('G5_ENCRYPT_FUNC', 'create_hash'),
            dataPath: self::requireString('DATA_PATH'),
            nicknameCooldownDays: self::getInt('NICKNAME_CHANGE_COOLDOWN_DAYS', 30),
            passwordResetUrl: self::getString('AUTH_PASSWORD_RESET_URL', ''),
            emailVerifyUrl: self::getString('AUTH_EMAIL_VERIFY_URL', '')
        );
    }

    private static function getString(string $key, string $default): string
    {
        return trim((string)($_ENV[$key] ?? $default));
    }

    private static function requireString(string $key): string
    {
        $value = trim((string)($_ENV[$key] ?? ''));
        if ($value === '') {
            throw ApiException::serverError("필수 환경변수 {$key}가 누락되었습니다.");
        }
        return $value;
    }

    private static function getInt(string $key, int $default): int
    {
        $value = trim((string)($_ENV[$key] ?? ''));
        return $value === '' ? $default : (int)$value;
    }
}
```

**지시 2**: 기존 코드 리팩토링
다음 클래스들의 생성자(또는 팩토리)에 `EnvConfig::fromEnv()`를 통해 설정 객체를 주입하고 내부의 `$_ENV` 직접 참조를 제거하라.
- `api/v1/File/Service/FileService.php` (L361, L370, L381의 퍼미션폴백 제거)
- `api/v1/Auth/Service/AuthService.php`
- `api/v1/Member/Service/MemberService.php`
- `api/v1/Member/Service/MemberImageManager.php`
- `api/v1/Core/Security/PasswordCompat.php`

---

### WS-2: 🟢 PasswordCompat 해시 함수 통일

**문제점**: `PasswordCompat::verify()`는 `$_ENV['G5_ENCRYPT_FUNC']`가 없을 때 `'sha256'`을 기본값으로 쓰고, `hash()`는 `'create_hash'`를 기본값으로 쓴다. 원본 G5의 현대적 기본값은 `create_hash`(Bcrypt)다.

**지시**:
`api/v1/Core/Security/PasswordCompat.php` 내부의 모든 암호화 함수 폴백 기본값을 `'create_hash'`로 통일하라. (하드코딩하지 말고 `EnvConfig`를 참조할 것).

---

### WS-3: 🟢 설정 우선순위 룰 적용 (DB vs ENV)

설정이 DB(`g5_config` 테이블)에도 존재하고 `.env`(또는 EnvConfig)에도 존재하는 두 가지 기능에 대해 **"DB 설정 우선, 부재 시 ENV 폴백"** 정책을 구현하라.

#### WS-3.1 닉네임 변경 쿨다운
위치: `MemberService::updateNickname()`
현재 `$_ENV['NICKNAME_CHANGE_COOLDOWN_DAYS']`에만 의존하고 있을 가능성이 있다.
DB의 `cf_nick_modify` 값이 설정되어 있으면(>0) 그 값을 최우선하고, 없다면 `EnvConfig`의 `nicknameCooldownDays`를 사용하도록 로직을 수정하라.

#### WS-3.2 금지어 (ID, Email) 병합
상황: DB의 `cf_prohibit_id`, `cf_prohibit_email` 컬럼도 존재하고, `.env`의 `PROHIBIT_MEMBER_IDS`, `PROHIBIT_EMAIL_DOMAINS` 패턴도 존재한다.
지시: 회원가입/수정 밸리데이션(`AuthService`, `MemberService`) 시 **두 출처(DB + ENV)의 금지어 목록을 합집합(Union) 처리**하여 모두 필터링하도록 로직을 수정하라.

---

### WS-4: 🟢 정적 검사 스크립트 강화

차후 개발자가 매직넘버 폴백을 다시 심는 것을 차단.

**지시**: `scripts/check_hardcoding.sh` 에 다음 항목 추가:
```bash
# 6) 매직넘버 폴백 체크 — $_ENV['KEY'] ?? '상수' 패턴 금지
run_check \
  "폴백 매직넘버 감지 (EnvConfig를 사용하세요)" \
  '\$_ENV\[.*\]\s*\?\?\s*['\''"][^'\''"]+['\''"]' \
  --glob '*.php' api \
  --glob '!api/v1/Core/Config/EnvConfig.php'
```

---

## 🔒 불가침 제약

1. `api/v1/Core/Database/*` 핵심 로직은 변경하지 않는다. (DB 커넥션은 이미 잘 구성됨)
2. **테스트 깨짐 방지**: `EnvConfig` 주입으로 인해 의존성 그래프가 깨질 경우, 필요한 컨테이너 설정(`dependencies.php` 등)을 반드시 수정한다.
3. PHPStan Level 8 분석(`composer run analyse`) 에러 0건을 반드시 유지한다.

---

## ✅ 완료 기준 체크리스트

```
[ ] WS-1: EnvConfig DTO 생성 완료
[ ] WS-1: 15개 파일 내 $_ENV 직접 참조가 EnvConfig 참조로 교체됨
[ ] WS-2: PasswordCompat::verify() 기본값이 create_hash로 통일됨
[ ] WS-3.1: 닉네임 변경 시 db의 cf_nick_modify 값 우선 적용 알고리즘 적용
[ ] WS-3.2: 금지 ID/이메일 검사 시 DB 목록 + ENV 목록 병합(합집합) 적용 완료
[ ] WS-4: check_hardcoding.sh 스크립트에 6번 룰 추가 확인
[ ] 전체 Unit Test 통과 (php_stan 포함)
```
