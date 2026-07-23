# Auth/Member Domain Audit (2026-03-06)

## 범위

- 현재 REST API의 공개 회원/인증 도메인
  - `api/routes/v1/auth.php`
  - `api/routes/v1.php`의 `/members/**`
- 레거시 그누보드 회원/인증 흐름
  - `bbs/login_check.php`
  - `bbs/logout.php`
  - `bbs/register.php`
  - `bbs/register_form.php`
  - `bbs/register_form_update.php`
  - `bbs/register_email.php`
  - `bbs/register_email_update.php`
  - `bbs/email_certify.php`
  - `bbs/password_lost.php`
  - `bbs/password_lost2.php`
  - `bbs/password_lost_certify.php`
  - `bbs/password_reset.php`
  - `bbs/password_reset_update.php`
  - `bbs/member_confirm.php`
  - `bbs/member_leave.php`
  - `bbs/profile.php`
  - `bbs/ajax.mb_id.php`
  - `bbs/ajax.mb_nick.php`
  - `bbs/ajax.mb_email.php`
  - `bbs/ajax.mb_hp.php`
  - `bbs/ajax.mb_recommend.php`

쇼핑몰(`shop/`, `adm/shop_admin/`)은 제외했습니다.

## 결론

- 판정: `부분 구현`
- 현재 API는 로그인, JWT 갱신/로그아웃, 회원가입, 이메일 기반 비밀번호 재설정, 이메일 인증, 내 정보 조회/수정/탈퇴, 아이콘/프로필 이미지 업로드, 공개 이메일 재인증 요청까지 실제 코드와 테스트로 동작 근거가 있습니다.
- 감사에서 잡힌 P0/P1 항목은 같은 날 보수되어, 공개 회원가입/수정에서 본인확인 필드 직접 쓰기가 차단됐고, `mb_open` 공개정책과 `mb_mailling`/`mb_sms`/주소 필드도 레거시 기준으로 복원됐습니다.
- 남은 갭은 `사전 중복검사`, `CAPTCHA`, `본인인증 기반 비밀번호 재설정`, `소셜 로그인` 같은 P2 후속 범위입니다.

## 검증 결과

- `vendor/bin/phpunit tests/Auth tests/Member`
  - `50 tests`, `243 assertions`, 통과
- `vendor/bin/phpstan analyse api/v1/Auth api/v1/Member api/v1/Core/Security api/v1/Core/Config --level=8`
  - 통과
- `./scripts/docs-check.sh`
  - 통과

주의:

- 현재 검증은 서비스/리포지토리 중심입니다.
- `AuthController`, `MemberController`, 실제 HTTP 라우트 레벨 통합 테스트는 없습니다.

## 주요 Findings

### P0. 본인확인 필드 신뢰 경계가 레거시와 다릅니다 (`2026-03-06` 조치 완료)

- 조치 현황: 공개 회원가입/수정 API에서 `mb_birth`, `mb_sex`, `mb_certify`, `mb_adult`, `mb_dupinfo` 입력을 금지했고, 전송 시 `403`을 반환하도록 보수했습니다.

- 현재 회원가입은 `mb_birth`, `mb_sex`, `mb_certify`, `mb_adult`, `mb_dupinfo`를 요청 바디에서 직접 받아 그대로 저장합니다.
  - 근거: `api/v1/Auth/Repository/AuthMemberRegistrationRepository.php:47-55`, `api/v1/Auth/Repository/AuthMemberRegistrationRepository.php:78-118`
- 현재 회원정보 수정도 같은 필드들을 허용하고 서버가 그대로 갱신합니다.
  - 근거: `api/v1/Member/Service/MemberProfileFieldNormalizer.php:19-50`, `api/v1/Member/Service/MemberProfileFieldNormalizer.php:109-115`
- 레거시는 `cf_cert_use`와 세션의 `ss_cert_*` 값이 일치할 때만 인증 필드를 저장하고, 불일치 시 차단하거나 값을 초기화합니다.
  - 근거: `bbs/register_form_update.php:136-140`, `bbs/register_form_update.php:172-215`

영향:

- 앱/클라이언트가 본인확인 완료 여부를 임의로 주장할 수 있습니다.
- 성인 여부(`mb_adult`)와 중복가입 식별값(`mb_dupinfo`)의 신뢰도가 무너집니다.

권고:

- 공개 API에서 해당 필드를 즉시 읽기 전용 또는 비활성 처리하고,
- 별도 본인확인 플로우를 구현하기 전까지는 서버가 임의 입력을 저장하지 않도록 막아야 합니다.

### P1. 공개 프로필이 `mb_open` 공개정책을 따르지 않습니다 (`2026-03-06` 조치 완료)

- 조치 현황: `MemberService::getPublicProfile()`에서 `mb_open`이 닫힌 계정은 본인/관리자 외 조회를 `403`으로 차단하도록 복원했습니다.

- 현재 `/members/{mb_id}`는 회원 존재만 확인하고 `mb_open`을 검사하지 않습니다.
  - 근거: `api/v1/Member/Service/MemberService.php:68-82`
- 응답도 `mb_id`, `mb_nick`, `mb_level`, `mb_point`를 기본 노출합니다.
  - 근거: `api/v1/Member/Service/MemberProfilePresenter.php:42-55`
- 레거시는 조회자와 대상 회원의 `mb_open` 상태를 모두 확인하고, 비공개면 조회를 막습니다.
  - 근거: `bbs/profile.php:4-18`

영향:

- 레거시에서는 막히는 공개 프로필 조회가 API에서는 성공합니다.
- 최소한의 회원 식별 정보와 레벨/포인트가 불필요하게 외부로 노출됩니다.

권고:

- 레거시 `profile.php`와 같은 공개정책을 `MemberService::getPublicProfile()`에 반영해야 합니다.
- 필요하면 공개 응답 필드도 `mb_nick`, `mb_profile`, `mb_homepage`, 가입일 정도로 재정의해야 합니다.

### P1. 회원가입/수정 필드가 레거시보다 좁고, 일부는 강제 기본값으로 고정됩니다 (`2026-03-06` 조치 완료)

- 조치 현황: `mb_mailling`, `mb_sms`, `mb_addr3`, `mb_addr_jibeon`을 가입/수정/조회 계약에 복원했고, 동의 변경 시 일자 컬럼과 `mb_agree_log`를 함께 갱신하도록 맞췄습니다.

- 레거시는 `mb_mailling`, `mb_sms`, `mb_addr3`, `mb_addr_jibeon`까지 받습니다.
  - 근거: `bbs/register_form_update.php:48-55`, `bbs/register_form_update.php:232-245`
- 현재 회원가입은 `mb_mailling`, `mb_sms`를 요청에서 받지 않고 DB에 `'0'`으로 고정합니다.
  - 근거: `api/v1/Auth/Repository/AuthMemberRegistrationRepository.php:80-91`
- 현재 회원수정 허용 목록에도 `mb_mailling`, `mb_sms`, `mb_addr3`, `mb_addr_jibeon`이 없습니다.
  - 근거: `api/v1/Member/Repository/MemberMutationRepository.php:25-56`
  - 근거: `api/v1/Member/Service/MemberProfileFieldNormalizer.php:19-50`

영향:

- 레거시 프런트/앱에서 관리하던 연락수신/주소 정보의 일부를 API에서 보존하지 못합니다.
- 신규 가입 시 이메일/SMS 수신동의 상태가 항상 꺼진 값으로 저장됩니다.

권고:

- `mb_mailling`, `mb_sms`, `mb_addr3`, `mb_addr_jibeon`을 공개 계약에 추가해야 합니다.
- `mb_mailling_date`, `mb_sms_date` 갱신 규칙도 같이 복원해야 합니다.

### P1. 이메일 미인증 사용자의 재발송/이메일 변경 경로가 레거시보다 약합니다 (`2026-03-06` 조치 완료)

- 조치 현황: 공개 `POST /api/v1/auth/email-reverification-requests`를 추가해 `mb_id + mb_password` 기반으로 인증메일 재발송과 이메일 변경 후 재발송이 가능해졌습니다.

- 레거시는 로그인 차단 시 `register_email.php`로 유도하고, 로그인 없이 인증메일 재발송과 이메일 변경이 가능합니다.
  - 근거: `bbs/login_check.php:55-59`
  - 근거: `bbs/register_email.php:8-29`
  - 근거: `bbs/register_email_update.php:12-49`
- 현재 API의 이메일 인증 재발송은 JWT 인증이 필수입니다.
  - 근거: `api/routes/v1/auth.php:54-62`

영향:

- 가입 직후 발급받은 토큰을 잃어버리거나 만료시키면, 미인증 회원은 로그인도 못 하고 인증메일 재발송도 못 합니다.

권고:

- `register_email.php` 대응 공개 엔드포인트를 별도로 두거나,
- 최소한 미인증 회원용 `mb_id + email + ckey/reset-like token` 재발송 플로우를 열어야 합니다.

### P2. 레거시의 사전 검증 엔드포인트가 없습니다

- 레거시는 아이디/닉네임/이메일/휴대폰/추천인 확인용 AJAX 엔드포인트를 제공합니다.
  - 근거: `bbs/ajax.mb_id.php:5-15`
  - 근거: `bbs/ajax.mb_nick.php:5-16`
  - 근거: `bbs/ajax.mb_email.php`
  - 근거: `bbs/ajax.mb_hp.php`
  - 근거: `bbs/ajax.mb_recommend.php`
- 현재 API는 등록/수정 시점의 최종 검증만 있고 공개 preflight 엔드포인트는 없습니다.

영향:

- 앱/프런트가 레거시처럼 단계별 중복검사 UX를 구현하려면 매번 실제 가입/수정 시도를 해야 합니다.

권고:

- `/auth/availability/member-id`, `/auth/availability/nick`, `/auth/availability/email`, `/auth/availability/phone`, `/auth/availability/recommender` 같은 엔드포인트를 추가하는 편이 맞습니다.

### P2. CAPTCHA, 본인인증 기반 비밀번호 재설정, 소셜 로그인은 레거시 대비 미구현입니다

- 레거시는 회원가입/비밀번호 찾기/이메일 재발송에 CAPTCHA를 씁니다.
  - 근거: `bbs/register_form_update.php:20-22`, `bbs/password_lost2.php:10-12`, `bbs/register_email_update.php:18-20`
- 레거시는 `cf_cert_find=1`일 때 본인인증 기반 비밀번호 재설정도 제공합니다.
  - 근거: `bbs/password_reset.php:7-10`, `bbs/password_reset_update.php:4-31`
- 레거시는 소셜 로그인 분기 코드를 실제 로그인/가입 흐름에 포함합니다.
  - 근거: `bbs/login_check.php:16-30`, `bbs/register_form.php:15-23`
- 현재 프로젝트 내부 작업 프롬프트에는 이 세 축을 제외 대상으로 둔 흔적이 있습니다.
  - 근거: `docs/codex/auth-member/PROMPT.md:243-251`

판정:

- 현재 기준으로는 `미구현`입니다.
- 다만 프로젝트에서 의도적으로 후순위로 미뤘을 가능성은 있습니다.

## 레거시 ↔ API 매핑

| 레거시 흐름 | 레거시 파일 | 현재 API | 판정 | 비고 |
|---|---|---|---|---|
| 로그인 | `bbs/login.php`, `bbs/login_check.php` | `POST /api/v1/auth/login` | 완료 | 브루트포스 방어, 이메일 미인증 차단, 포인트 합계 동기화 포함 |
| 로그아웃 | `bbs/logout.php` | `POST /api/v1/auth/logout` | 완료 | 세션 대신 JWT 폐기 모델 |
| 토큰 갱신 | 레거시 없음 | `POST /api/v1/auth/refresh` | API 확장 완료 | 레거시보다 개선된 플로우 |
| 회원가입 본처리 | `bbs/register_form.php`, `bbs/register_form_update.php` | `POST /api/v1/auth/register` | 부분 | 약관/캡차/본인확인 강제는 여전히 후속 범위 |
| 가입 결과 화면 | `bbs/register_result.php` | 회원가입 응답 본문 | API 대체 완료 | 화면 대신 JSON 응답 |
| 아이디/닉네임/이메일/휴대폰/추천인 사전검사 | `bbs/ajax.mb_*` | 없음 | 미구현 | 최종 검증만 존재 |
| 이메일 인증 확정 | `bbs/email_certify.php` | `POST /api/v1/auth/email-verifications` | 완료 | TTL 토큰 기반 |
| 미인증 이메일 변경/재발송 | `bbs/register_email.php`, `bbs/register_email_update.php` | `POST /api/v1/auth/email-reverification-requests` | 완료 | 로그인 불가 상태에서도 `mb_id + mb_password`로 재발송/이메일 변경 가능 |
| 비밀번호 찾기(이메일) | `bbs/password_lost.php`, `bbs/password_lost2.php`, `bbs/password_lost_certify.php` | `POST /api/v1/auth/password-reset-requests`, `POST /api/v1/auth/password-resets` | 완료 | 임시비밀번호 메일 대신 토큰+신규비밀번호 방식 |
| 비밀번호 찾기(본인인증) | `bbs/password_reset.php`, `bbs/password_reset_update.php` | 없음 | 미구현 | `cf_cert_find=1` 대응 없음 |
| 회원정보 수정 전 비밀번호 확인 | `bbs/member_confirm.php` | `PATCH /api/v1/members/me`의 `mb_password_current` | API 대체 완료 | 별도 화면 없이 인라인 확인 |
| 내 정보 조회 | 레거시 마이페이지/수정폼 데이터 | `GET /api/v1/members/me` | 완료 | 핵심 필드 조회 가능 |
| 내 정보 수정 | `bbs/register_form_update.php` (`w=u`) | `PATCH /api/v1/members/me` | 완료 | 레거시 핵심 필드와 공개 쓰기 제한 규칙 복원 |
| 회원 탈퇴 | `bbs/member_leave.php` | `DELETE /api/v1/members/me` | 완료 | 관리자 계정 탈퇴 금지 포함 |
| 공개 프로필 | `bbs/profile.php` | `GET /api/v1/members/{mb_id}` | 완료 | `mb_open` 공개정책과 관리자 예외 반영 |
| 회원 아이콘/프로필 이미지 | `bbs/register_form_update.php` 업로드 처리 | `POST/DELETE /api/v1/members/me/icon`, `POST/DELETE /api/v1/members/me/image` | 완료 | 업로드/삭제 구현 및 테스트 존재 |
| 소셜 로그인 | `bbs/login_check.php`, `bbs/register_form.php` | 없음 | 미구현 | 별도 OAuth 플로우 없음 |

## 현재 구현 상태 요약

### 완료

- 로그인/로그아웃/JWT 갱신
- 이메일 기반 비밀번호 재설정
- 이메일 인증 확정
- 미인증 이메일 재발송/이메일 변경 요청
- 내 정보 조회
- 내 정보 수정
- 회원 탈퇴
- 공개 프로필 보호 규칙
- 회원 아이콘/프로필 이미지 업로드/삭제

### 부분 구현

- 회원가입
  - 핵심 생성은 되지만 약관, CAPTCHA, 본인확인 강제는 아직 후속 범위입니다.

### 미구현

- 사전 중복검사/추천인 조회 엔드포인트
- 본인인증 기반 비밀번호 재설정
- 소셜 로그인
- 레거시 CAPTCHA 방어

## 권장 처리 순서

### 1단계. 후속 UX/API 보강

1. 아이디/닉네임/이메일/휴대폰/추천인 availability 엔드포인트 추가
2. CAPTCHA와 본인인증 기반 비밀번호 재설정 범위 확정
3. 소셜 로그인 도입 여부 확정

### 2단계. 테스트/통합 검증 보강

1. HTTP 라우트/컨트롤러 통합 테스트 추가
2. 필요하면 `register_email.php` 대응 `mb_id + ckey` 모델 도입 여부 재검토

## 비고

- 현재 문서/계약상 Auth/Member 도메인은 핵심 P0/P1 정합성은 닫혔고, 남은 범위는 P2 보강 과제입니다.
- 다음 구현 턴은 `1단계. 후속 UX/API 보강`부터 시작하는 것이 맞습니다.
