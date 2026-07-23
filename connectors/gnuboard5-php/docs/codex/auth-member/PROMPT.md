# 🤖 Codex 회원/인증 도메인 비즈니스 로직 보강 프롬프트

---

## 🎭 페르소나

```
너는 "IRONDEV"다.
20년 경력의 PHP 시니어 아키텍트. G5 원본 소스를 완벽히 이해하고 있다.
기존 코드 구조(AuthGateway interface → AuthRepository 구현, AuthService 서비스 레이어)를 절대 깨지 않는다.
모든 새 메서드는 AuthGateway 인터페이스에 먼저 선언하고 AuthRepository에서 구현한다.
PHPStan level 6 통과 필수. 테스트 작성 필수. 보고는 한글로, 코드는 영어로.
```

---

## 📋 필수 참조 파일 (작업 전 반드시 읽어라)

```
.agent/Constitution.md          ← 헌법
api/v1/Auth/Service/AuthService.php            ← 417줄
api/v1/Auth/Controller/AuthController.php
api/v1/Auth/Repository/AuthRepository.php      ← 1122줄
api/v1/Integration/Contracts/AuthGateway.php   ← 26 메서드
api/v1/Member/Service/MemberService.php        ← 441줄
api/v1/Member/Controller/MemberController.php
api/v1/Member/Repository/MemberRepository.php
api/v1/Integration/Contracts/MemberGateway.php
api/v1/Admin/Member/Service/AdminMemberService.php
api/v1/Admin/Member/Controller/AdminMemberController.php
api/v1/Core/Security/PasswordPolicy.php
api/routes.php                  ← 라우트 정의
```

### G5 원본 참조 (비즈니스 로직 근거)
```
bbs/login_check.php             ← 로그인 182줄
bbs/register_form_update.php    ← 가입/수정 702줄
bbs/member_leave.php            ← 탈퇴 33줄
bbs/password_lost2.php          ← 비번찾기 77줄
bbs/member_confirm.php          ← 비번재확인 42줄
lib/register.lib.php            ← 검증함수 182줄
adm/member_form_update.php      ← 관리자 회원수정 393줄
adm/auth_list.php               ← 관리권한 273줄
adm/auth_update.php             ← 관리권한 저장
```

---

## ✅ 현재 이미 구현된 것 (건드리지 마라)

아래 기능은 이미 구현 완료. 덮어쓰거나 중복 구현하지 말 것:

- ✅ 로그인 (브루트포스 방어, today_login, 비활성 체크)
- ✅ 이메일 미인증 시 로그인 차단 (`isEmailCertificationRequiredAndMissing`)
- ✅ 로그인 시 포인트 합계 재계산 (`syncMemberPointTotal`)
- ✅ 레거시 해시 → bcrypt 자동 업그레이드 (`rehashPasswordIfNeeded`)
- ✅ 회원가입 (ID/닉네임/이메일/비밀번호 전체 검증, cf_register_level, 가입포인트 트랜잭션)
- ✅ 닉네임 예약어 차단 (`isReservedNick`, cf_prohibit_id)
- ✅ 닉네임 최소길이 한글2자/영문4자 분기
- ✅ 이름 UTF-8 검증 (`mb_check_encoding`)
- ✅ 로그아웃 (JTI 블랙리스트)
- ✅ 비밀번호 재설정 (TTL 토큰, hash_equals)
- ✅ 이메일 인증 (mb_email_certify2 + TTL)
- ✅ 동일 이메일 2건 이상 체크 (`countMembersByEmail`)
- ✅ 비밀번호 강도 검증 (`PasswordPolicy`)
- ✅ 입력 세니타이징 (`sanitizeSingleLine`, `sanitizeMultiline`)
- ✅ 휴대폰 유효성 (`validateRegisterPhone` 인터페이스 존재)
- ✅ 이메일 변경 시 인증 초기화 + 재발송 (`issueEmailVerificationForChangedEmail`)
- ✅ 메일 발송 인프라 (`sendAuthMail` — PHP mail() 기반)
- ✅ 회원 탈퇴 (비번확인, 관리자 차단, mb_leave_date)
- ✅ 닉네임 변경 쿨다운 (cf_nick_modify)
- ✅ 관리자 회원 목록/상세/수정/삭제/엑셀

---

## 🔥 WS-1: P0 필수 구현 (4건)

### WS-1A: 회원가입 시 추천인 검증 + 포인트 부여
> G5 근거: `bbs/register_form_update.php` L143-149, L301-302

**구현할 것:**
1. `AuthGateway` 인터페이스에 추가:
   ```php
   public function validateRecommend(string $recommenderMbId, string $registrantMbId): void;
   public function grantRecommendPoint(string $recommenderMbId, string $registrantMbId): void;
   ```
2. `AuthRepository`에 구현:
   - `validateRecommend()`: 추천인 존재 확인 (`existsMemberId`), 본인 추천 차단 (`strtolower` 비교), 빈 문자열이면 skip
   - `grantRecommendPoint()`: `g5_config.cf_recommend_point` 읽어서 `g5_point` 테이블 INSERT + `mb_point` UPDATE. `cf_use_recommend` 가 1일 때만 동작. 트랜잭션 사용 (`grantRegisterPoint` 패턴 참고)
3. `AuthService::register()`에서 `mb_recommend` 처리:
   - 빈 값이 아니면 `validateRecommend()` 호출
   - 가입 완료 후 `grantRecommendPoint()` 호출
4. `registerMember()` 에서 `mb_recommend` 컬럼에 추천인 ID 저장 (현재 빈 문자열 하드코드)

**테스트:**
- `tests/Auth/RecommendTest.php` 작성
  - 유효 추천인 → 포인트 부여 확인
  - 존재하지 않는 추천인 → 예외
  - 본인 추천 → 예외
  - 추천인 미입력 → 정상 가입
  - `cf_use_recommend = 0` → skip

### WS-1B: 마케팅/3자제공 동의 + 동의 로그 기록
> G5 근거: `bbs/register_form_update.php` L264-293, L385-420

**구현할 것:**
1. `AuthRepository::registerMember()`에서 `mb_marketing_agree`, `mb_thirdparty_agree` 를 요청 바디에서 수신 (현재 하드코드 '0' → 수정)
   - 이미 `AuthService::register()`에서 `mb_marketing_agree`, `mb_thirdparty_agree` 를 전달하고 있으므로, `registerMember()` SQL에서 이 값들을 바인드
   - 동의 시 `mb_marketing_date`, `mb_thirdparty_date` = NOW()
2. `MemberGateway` + `MemberRepository`에 추가:
   ```php
   public function appendAgreeLog(string $memberId, string $action, array $items): void;
   ```
   - `mb_agree_log` 컬럼에 `[2026-03-05 12:00:00, {action}] 마케팅 동의 | 3자제공 동의` 형태 CONCAT
3. `AuthService::register()`에서 가입 시 동의 로그 기록
4. `MemberService::updateMyProfile()`에서 동의 변경 시:
   - `mb_mailling`, `mb_sms` 변경 시 각각 `mb_mailling_date`, `mb_sms_date` 갱신
   - 동의 로그 기록 호출

**테스트:**
- `tests/Member/AgreeLogTest.php`

### WS-1C: 관리자 보안 규칙 (4건)
> G5 근거: `adm/member_form_update.php` L187-202

**구현할 것 — `AdminMemberService`에 추가:**
1. **상위 레벨 수정 차단**: 로그인한 관리자의 `mb_level` 보다 높거나 같은 회원은 수정 불가
   ```php
   if ($targetMember['mb_level'] >= $currentAdmin['mb_level']) {
       throw ApiException::forbidden('자신보다 권한이 높거나 같은 회원은 수정할 수 없습니다.');
   }
   ```
2. **본인 레벨 수정 차단**: 로그인 중인 관리자가 자신의 레벨을 변경하려 하면 차단
3. **관리자 탈퇴일/차단일 설정 차단**: 최고관리자(super)의 `mb_leave_date`, `mb_intercept_date` 수정 차단 + 본인의 탈퇴일/차단일 수정 차단
4. **최고관리자 비밀번호 수정 차단**: super가 아닌 관리자가 super의 비밀번호를 수정 시도 시 차단

**구현 위치:** `AdminMemberService::update()` 메서드 앞부분에 검증 추가. `AdminMemberController`에서 `$currentAdmin` (JWT 디코딩된 회원 정보)을 넘겨줘야 함.

**테스트:**
- `tests/Admin/AdminMemberSecurityTest.php`

### WS-1D: 비밀번호 찾기 — 관리자 차단
> G5 근거: `bbs/password_lost2.php` L28-29

**구현할 것:**
- `AuthService::requestPasswordReset()`에서 조회된 회원의 `mb_level >= 10` (관리자)이면 비밀번호 재설정 차단
- 단, 응답은 동일하게 "메일이 발송되었습니다" (계정 존재 비노출 원칙 유지)

**테스트:**
- `tests/Auth/PasswordResetAdminBlockTest.php`

---

## 🟡 WS-2: P1 비즈니스 로직 (6건)

### WS-2A: 회원 수정 — 추가 필드 허용
> G5 근거: `bbs/register_form_update.php` L434-447

**구현할 것:**
1. `MemberService::ALLOWED_UPDATE_FIELDS` 배열에 추가:
   - `mb_signature` (text, XSS 필터 → `sanitizeMultiline`)
   - `mb_profile` (text, XSS 필터 → `sanitizeMultiline`)
   - `mb_open` (tinyint, 0 or 1)
   - `mb_tel` (varchar, `sanitizeSingleLine`)
   - `mb_hp` (varchar, 휴대폰 형식 검증)
   - `mb_addr3` (varchar)
   - `mb_addr_jibeon` (varchar, 'N' or 'R' or '')
2. `normalizeUpdates()`에서 각 필드 세니타이징 처리
3. `mb_open` 변경 시 `mb_open_date` 갱신 (G5 L377-378 참고)

**테스트:**
- 각 필드 수정 + 세니타이징 검증

### WS-2B: 관리권한 CRUD (g5_auth 테이블)
> G5 근거: `adm/auth_list.php` 273줄, `adm/auth_update.php`, `adm/auth_list_delete.php`

**구현할 것:**
1. 새 도메인 생성: `api/v1/Admin/Auth/`
   - `AdminAuthController.php`
   - `AdminAuthService.php`
2. DB 테이블: `g5_auth` (mb_id, au_menu, au_auth)
3. 엔드포인트:
   - `GET /v1/admin/auth` — 관리권한 목록 (검색/정렬/페이징)
   - `POST /v1/admin/auth` — 관리권한 추가 (mb_id, au_menu, au_auth='r'/'w'/'d')
   - `DELETE /v1/admin/auth` — 관리권한 삭제 (체크박스 다중 삭제)
4. 최고관리자(super, mb_level=10)만 접근 가능
5. `routes.php`에 등록

**테스트:**
- `tests/Admin/AdminAuthCrudTest.php`

### WS-2C: 회원 아이콘/프로필 이미지 업로드
> G5 근거: `bbs/register_form_update.php` L471-586

**구현할 것:**
1. 새 엔드포인트:
   - `POST /v1/members/me/icon` — 아이콘 업로드 (multipart/form-data)
   - `DELETE /v1/members/me/icon` — 아이콘 삭제
   - `POST /v1/members/me/image` — 프로필 이미지 업로드
   - `DELETE /v1/members/me/image` — 프로필 이미지 삭제
2. 비즈니스 규칙:
   - 파일 형식: gif, jpg, png만 허용 (`getimagesize`로 검증)
   - 용량 제한: `cf_member_icon_size` (g5_config)
   - 크기 제한: `cf_member_icon_width` x `cf_member_icon_height`
   - 초과 시 리사이즈 시도, 실패 시 거부
   - 저장 경로: `data/member/{mb_id[0:2]}/{mb_icon_name}.gif`
3. `MemberController` + `MemberService`에 메서드 추가
4. `routes.php`에 등록 (JWT 미들웨어)

**테스트:**
- `tests/Member/MemberIconUploadTest.php`

### WS-2D: 휴대폰 중복 검사
> G5 근거: `lib/register.lib.php` `exist_mb_hp()`

**구현할 것:**
1. `AuthRepository::validateRegisterPhone()`가 이미 인터페이스에 있으므로 구현 확인 후 보강:
   - 번호 형식 검증: `01[0-9]{8,9}` (숫자만)
   - 중복 검사: `g5_member.mb_hp` 에서 동일 번호 조회 (자신 제외)
   - `hyphen_hp_number()` 스타일 하이픈 형식 저장
2. `AuthService::register()`에서 `mb_hp` 가 전달되면 `validateRegisterPhone()` 호출
3. `MemberService::updateMyProfile()`에서 `mb_hp` 변경 시 검증

### WS-2E: 수정 전 비밀번호 재확인
> G5 근거: `bbs/member_confirm.php`

**구현할 것:**
- `PATCH /v1/members/me` 요청 시 `current_password` 필드를 **필수**로 받도록 수정
- `MemberService::updateMyProfile()`에서 현재 비밀번호 검증 후 수정 진행
- 비밀번호가 틀리면 `401 Unauthorized`

### WS-2F: 관리자 동의 로그
> G5 근거: `adm/member_form_update.php` L150-179, L233-268

**구현할 것:**
- `AdminMemberService::update()`에서 마케팅/SMS/3자제공 동의 값이 변경되면:
  - 각 `_date` 컬럼 갱신
  - `mb_agree_log`에 `[날짜, 관리자 회원수정] 항목` 형태 로그 추가

---

## 🚫 이번 프롬프트에서 제외 (P2)

아래 항목은 이번 작업 범위가 아니다. 손대지 마라:
- 소셜 로그인 (별도 OAuth 플로우)
- 본인확인/실명인증 (KCB/PASS 외부 연동)
- CAPTCHA (baseline은 Rate Limiting 유지, 실제 CAPTCHA는 provider 토큰 검증 adapter가 정해진 뒤 별도 범위로 처리)
- `mb_1`~`mb_10` 커스텀 필드 (용도 미정)
- `mb_sex`, `mb_birth`, `mb_certify`, `mb_adult`, `mb_dupinfo` (본인확인 연동 시)
- `mb_memo_call`, `mb_memo_cnt`, `mb_scrap_cnt` (쪽지/스크랩 도메인)

---

## 🏗️ 아키텍처 규칙 (반드시 준수)

1. **인터페이스 먼저**: 새 메서드는 반드시 `AuthGateway` 또는 `MemberGateway` 인터페이스에 먼저 선언
2. **Prepared Statement만**: SQL 문자열 보간 절대 금지. `$this->executeStatement($sql, $params)` 패턴 사용
3. **트랜잭션**: 포인트 관련 작업은 반드시 `beginTransaction/commit/rollback` 사용 (`grantRegisterPoint` 패턴)
4. **ENV 설정**: 설정값은 `$_ENV` 에서 읽되 기본값 제공 (예: `(int)($_ENV['LOGIN_FAIL_MAX_ATTEMPTS'] ?? 5)`)
5. **g5_config 참조**: G5 환경설정은 `$this->loadConfig()` 메서드로 `g5_config` 테이블에서 읽기
6. **예외 처리**: `ApiException::badRequest()`, `::unauthorized()`, `::forbidden()`, `::conflict()`, `::notFound()`, `::serverError()` 사용
7. **XSS 필터**: 사용자 입력은 `sanitizeSingleLine()` / `sanitizeMultiline()` 처리
8. **테스트**: 각 WS마다 `tests/` 디렉토리에 PHPUnit 테스트 작성. Mock은 Mockery 사용.

---

## ✅ 자기 감사 체크리스트

각 WS 완료 후 아래를 반드시 확인하라:

```bash
cd .

# 1. PHPStan
vendor/bin/phpstan analyse api/ --level=6

# 2. PHPUnit
vendor/bin/phpunit tests/

# 3. AuthGateway 인터페이스 ↔ AuthRepository 일치
grep -c 'public function' api/v1/Integration/Contracts/AuthGateway.php
grep -c 'public function' api/v1/Auth/Repository/AuthRepository.php
# AuthRepository >= AuthGateway 이어야 함

# 4. 라우트 등록 확인
grep -n 'admin/auth' api/routes.php
grep -n 'members/me/icon' api/routes.php
```

---

## 📝 완료 보고

모든 WS 완료 후 아래 파일에 보고 작성:

```
docs/codex/auth-member/RESULT.md
```

보고 형식:
```markdown
# 회원/인증 도메인 보강 결과

## 완료 항목
| WS | 항목 | 수정 파일 | 추가 줄 수 | 테스트 |
|---|------|---------|-----------|-------|

## PHPStan 결과
## PHPUnit 결과
## 미완료 사유 (있을 경우)
```
