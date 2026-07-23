# 비밀번호 해시 호환성 감사 — 2026-03-06

## 결론

- 스테이징 `.env`는 `G5_ENCRYPT_FUNC=create_hash`입니다.
- 그런데 `g5_member.mb_password` 실측 결과는 `20건 중 create_hash 1건, bcrypt 19건`입니다.
- 이 상태는 **API 로그인은 될 수 있지만, 원본 G5 웹 로그인과는 불일치**합니다.

## 근거

### 스테이징 환경값

- `DB_HOST=localhost`
- `DB_PORT=3306`
- `DB_NAME=neojins`
- `DB_USER=neojins`
- `G5_ENCRYPT_FUNC=create_hash`

### 스테이징 회원 해시 분포

- `create_hash`: 1
- `bcrypt_len_60`: 19

샘플(마스킹):

- `neo***` → `sha256:...` 형식, 길이 78
- `st0***` → `$2y$12$...` 형식, 길이 60
- `stg***` → `$2y$12$...` 형식, 길이 60

### 왜 문제인가

- 원본 G5는 `G5_STRING_ENCRYPT_FUNCTION=create_hash`일 때 `validate_password()` 기준의 PBKDF2 포맷을 기대합니다.
- 현재 API는 `create_hash` 모드에서 `bcrypt`도 검증은 해주지만, 원본 G5 `check_password()`는 `bcrypt`를 직접 읽지 못합니다.
- 따라서 **API와 G5 웹이 같은 회원 DB를 보더라도 로그인 결과가 달라질 수 있습니다.**

## 원인

과거 구현에서 `create_hash` 모드임에도 `PasswordCompat::hash()`가 `password_hash()`를 사용했습니다.

### 과거 구현

- 기준 커밋: `e2bb4093d`
- 지속 구간: `e2bb4093d` ~ `41af7deeb`

해당 시기 구현 요지:

```php
if (in_array($func, ['create_hash', 'password_hash', 'bcrypt'], true)) {
    return password_hash($plain, PASSWORD_DEFAULT);
}
```

즉, `.env`가 `create_hash`여도 실제 저장은 `$2y$...` `bcrypt`였습니다.

### 현재 구현

현재 `main`의 `PasswordCompat::hash()`는 `create_hash`일 때 G5 PBKDF2 형식으로 저장하도록 수정되어 있습니다.

## 현재 가능한 자동 회복 범위

- **가능**: 사용자가 API 로그인에 성공하면 현재 코드가 `needsRehash()`를 통해 `bcrypt -> create_hash`로 재저장할 수 있습니다.
- **불가능**: plaintext 비밀번호를 모르는 상태에서 DB의 기존 `bcrypt`를 일괄적으로 `create_hash`로 변환하는 것은 불가능합니다.

## 권고

### P1

- `AUTH-301`로 운영 절차를 확정하십시오.
- 선택지는 둘뿐입니다.
  - 강제 비밀번호 재설정
  - API 로그인 성공 시 재해시를 유도하고, G5 웹 로그인은 그 이후 사용하게 운영

### P1

- `php scripts/check_password_hash_compat.php`
- 또는 `composer run audit:password-hash-compat`

위 명령을 스테이징/운영 점검 절차에 포함시키십시오.

### P2

- `mb_password2` 보존 전략은 현재 스키마에 없습니다.
- 원본 G5의 legacy hash 업그레이드 이력까지 맞출 필요가 있으면 별도 컬럼/감사 로그 정책을 검토하십시오.
