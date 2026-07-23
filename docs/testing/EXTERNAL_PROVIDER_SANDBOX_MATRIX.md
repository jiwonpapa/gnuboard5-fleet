# 외부 공급자 Sandbox 정책 매트릭스

작성일: 2026-03-10  
적용 범위: `AUTH-304`, `AUTH-305`, `AUTH-307`

이 문서는 2026-03-10 시점에 공개 접근 가능한 공식 문서만 기준으로 외부 인증 공급자의 sandbox/test 정책을 정리한 지원 문서입니다.  
가맹점 전용 포털, 계약 후 제공되는 비공개 PDF, 영업 전달 자료는 여기서 추정하지 않습니다.

## 1. 결론

- 현재 foundation 위에 실제 adapter 1종을 얹기 위한 공개 자료 접근성은 `Google`, `Kakao`, `Naver`, `KG이니시스` 순으로 양호합니다.
- 2026-03-10 기준 실제 adapter는 `Google`, `Kakao`가 연결되었습니다. 설정이 없으면 provider 목록에 숨기고, 설정이 있으면 `/auth/external/providers`에 각각 `google`, `kakao`가 노출됩니다.
- `KCB`, `NHN KCP`는 서비스 자체와 테스트 진입 흔적은 공개 자료로 확인되지만, 본인확인 callback/payload 규격과 샘플 배포 절차는 공개 웹에서 닫혀 있거나 계약/문의 전제로 보입니다.
- 따라서 `AUTH-305`의 첫 실제 adapter는 공개 자료만으로도 개발/검증이 가능한 `Google`, `Kakao`, `Naver`, `KG이니시스` 중에서 고르는 것이 맞습니다.
- CI와 로컬 개발은 계속 `fake provider + callback replay`를 canonical로 유지하고, vendor sandbox는 staging/manual 검증 계층으로만 붙입니다.

## 2. 후보 범위

현재 저장소 기준 후보는 다음 두 축으로 정리합니다.

- 소셜로그인
  - `Google`, `Naver`, `Kakao`
  - 근거: `api/v1/Admin/Schema/Data/generated/config.json` 의 `cf_google_*`, `cf_naver_*`, `cf_kakao_*`
- 본인인증/간편인증
  - `KG이니시스 통합인증`, `NHN KCP`, `KCB`
  - 근거: `api/v1/Admin/Schema/Data/generated/config.json` 의 `cf_cert_*`

레거시 DDL에는 `Payco`, `Facebook`, `Twitter` 컬럼도 남아 있지만, 현재 관리 스키마와 외부 인증 foundation 문서에서 우선 후보로 다뤄지는 집합은 위 6종입니다.

## 3. 공급자 매트릭스

| 공급자 | 범주 | 공개 test/sandbox 근거 | 공개 문서 기준 핵심 제약 | 공개 자료만으로 `AUTH-305` 진행 가능성 |
|------|------|------------------------|----------------------------|------------------------------------------|
| Google OAuth/OIDC | 소셜 | 별도 sandbox보다는 dev OAuth client + 등록 redirect URI + localhost 테스트 흐름 | redirect URI exact match, 운영은 HTTPS/own domain, embedded user-agent 금지 | 높음 |
| Kakao Login | 소셜 | Kakao Login 활성화 + redirect URI 등록 + sample/FAQ 공개 | REST/JS 키별 redirect URI 등록 위치 다름, HTTP/HTTPS 각각 등록, redirect URI 사전등록 필수 | 높음 |
| Naver Login | 소셜 | Developers 등록 후 `개발 중` 상태에서 개발, 적용 시 `서비스 적용` 전환 | 실제 서비스 전환 전에 상태 변경 필요, 문서가 콘솔 중심 | 중간 이상 |
| KG이니시스 통합인증 | 본인인증/간편인증 | 공개 웹 매뉴얼 + 공개 staging 테스트 매뉴얼 존재 | HTTPS 필수, popup 기본, 앱 WebView 제약, success/fail URL 및 hash 검증 필수 | 높음 |
| NHN KCP | 본인인증 계열 후보 | Developer Center에 테스트 코드/테스트 도메인/샘플 신청 절차 공개 | identity 전용 callback/payload 문서는 공개 웹에서 제한적, 샘플은 신청/문의 기반 | 중간 이하 |
| KCB | 본인인증 계열 후보 | 서비스 포털/약관/운영 로그인 흔적 공개 | 개발 가이드, 테스트 계정, callback 명세를 공개 문서로 확인하지 못함 | 낮음 |

## 4. 공급자별 메모

### 4.1 Google OAuth/OIDC

- 공개 근거
  - [Using OAuth 2.0 for Web Server Applications](https://developers.google.com/identity/protocols/oauth2/web-server)
  - [OAuth 2.0 Policies](https://developers.google.com/identity/protocols/oauth2/policies)
- 확인된 사항
  - `redirect_uri`는 Cloud Console에 등록한 authorized redirect URI와 정확히 일치해야 합니다.
  - 로컬 개발 예시로 `http://localhost:8080` redirect URI를 공식 문서가 직접 사용합니다.
  - 운영 웹앱은 HTTPS redirect URI와 소유 도메인을 요구합니다.
  - 임베디드 user-agent를 금지하므로 앱 내 임의 WebView 기반 인증은 피해야 합니다.
- 구현 판단
  - PHP adapter 관점에서는 가장 표준적인 OAuth/OIDC 흐름이라 fake provider 이후 첫 실제 adapter 후보로 적합합니다.
  - 현재 저장소는 `GoogleExternalAuthProviderAdapter`를 통해 `login`, `account_link` flow를 실제로 지원합니다.

### 4.2 Kakao Login

- 공개 근거
  - [Kakao Login prerequisites](https://developers.kakao.com/docs/latest/en/kakaologin/prerequisite)
  - [App settings / Redirect URI](https://developers.kakao.com/docs/latest/en/app-setting/app)
  - [Kakao Login FAQ](https://developers.kakao.com/docs/latest/en/kakaologin/faq)
  - [Kakao Login REST API](https://developers.kakao.com/docs/latest/en/kakaologin/rest-api)
- 확인된 사항
  - Kakao Login을 사용하려면 콘솔에서 Login usage를 `ON`으로 켜고 redirect URI를 등록해야 합니다.
  - REST API와 JavaScript/Flutter SDK는 redirect URI를 등록하는 키 위치가 다릅니다.
  - HTTP와 HTTPS는 별도 엔트리로 등록되며 최대 10개까지 등록 가능합니다.
  - FAQ와 튜토리얼에서 localhost redirect 예시를 공개하므로 개발 단계 검증이 가능합니다.
- 구현 판단
  - 한국 서비스 적합성이 높고 공개 가이드도 충분합니다. 다만 REST/JS 키 차이를 문서에 잘못 적으면 운영 장애로 이어지므로 서버 adapter는 REST 기준으로 고정해야 합니다.
  - 현재 저장소는 `KakaoExternalAuthProviderAdapter`를 통해 `login`, `account_link` flow를 실제로 지원합니다.

### 4.3 Naver Login

- 공개 근거
  - [네이버 아이디로 로그인 소개 PDF](https://developers.naver.com/inc/devcenter/downloads/naveridro/naverlogin_docu_ver3.pdf)
  - [네이버 로그인 제품 페이지](https://developers.naver.com/products/login/api)
- 확인된 사항
  - NAVER Developers 등록 후 개발을 진행하고, 운영 반영 시 관리 메뉴에서 API 상태를 `개발 중`에서 `서비스 적용`으로 변경해야 합니다.
  - 공식 소개 문서는 신규 가입/기존 회원 매핑 구조를 직접 설명합니다.
  - 공개 자료는 콘솔/가이드 안내 중심이며 callback 세부 규격은 Google/Kakao보다 덜 노출됩니다.
- 구현 판단
  - 운영 전환 절차가 분명하고 한국 사용자 적합성도 높습니다. 다만 실제 adapter 작업 전 콘솔 권한과 callback 등록 화면 접근이 있어야 합니다.

### 4.4 KG이니시스 통합인증

- 공개 근거
  - [통합인증 웹 매뉴얼](https://manual.inicis.com/sa/auth.html)
  - [INIAPI 스테이징 환경 테스트 매뉴얼](https://manual.inicis.com/download/TLS12_test_manual.pdf)
- 확인된 사항
  - 통합인증 서비스는 HTTPS 통신이 필수입니다.
  - 기본 호출 방식은 popup이고, 앱 WebView에서는 popup 제약 때문에 페이지 전환 방식을 권장합니다.
  - `successUrl`, `failUrl`, `authHash`, `mTxId` 같은 서버 검증 필드를 요구합니다.
  - 공개 테스트 매뉴얼에 staging 도메인 `https://stginiapi.inicis.com` 과 방화벽 정보가 명시되어 있습니다.
  - 제휴사 코드 표에서 `PASS`, `KAKAO`, `NAVER`, `TOSS` 등 실제 인증수단 조합을 공개합니다.
- 구현 판단
  - 본인인증/간편인증 범위의 첫 실제 adapter 후보로 공개 자료 접근성이 가장 좋습니다. 다만 서버-서버 결과조회와 hash 검증을 먼저 틀 잡아야 합니다.

### 4.5 NHN KCP

- 공개 근거
  - [NHN KCP 시작하기](https://developer.kcp.co.kr/page/std)
  - [샘플 신청하기](https://developer.kcp.co.kr/page/download)
- 확인된 사항
  - 공개 문서에 테스트 코드 `T0000`, test 도메인, TLS 1.2 요구, 서비스 인증서 절차가 나옵니다.
  - 샘플은 개발자센터에서 신청 후 내부 검수 뒤 전달된다고 명시되어 있습니다.
  - 공개 접근 가능한 페이지는 결제 연동 설명이 중심이며, 휴대폰 본인확인 전용 callback/payload 명세는 이번 조사 범위에서 확인하지 못했습니다.
- 구현 판단
  - 테스트 환경 자체는 존재하지만, identity adapter를 상상으로 구현하기엔 공개 정보가 부족합니다. 실제 착수 전 샘플/문서 접근 권한 확보가 선행되어야 합니다.

### 4.6 KCB

- 공개 근거
  - [KCB 휴대폰본인확인 운영 로그인 포털](https://hsokms.ok-name.co.kr/oknmadmin/o)
  - [KCB 약관/본인확인 동의 페이지](https://safe.ok-name.co.kr/eterms/agreement_all.jsp)
- 확인된 사항
  - 운영 포털과 약관/동의 페이지는 공개 접근 흔적이 있으므로 서비스 실체는 확인됩니다.
  - 그러나 공개 개발 가이드, sandbox callback 예시, 테스트 계정/테스트 CI/DI 문서는 이번 조사에서 확인하지 못했습니다.
- 구현 판단
  - 공개 근거만으로는 `AUTH-305` 구현에 착수하기 어렵습니다. 계약 후 개발 포털이나 공급자 전달 문서가 필요합니다.

## 5. AUTH-305 후보 판단

### 기술 리스크 기준

1. `Google`
2. `Kakao`
3. `KG이니시스`
4. `Naver`
5. `NHN KCP`
6. `KCB`

### 이유

- `Google`, `Kakao`는 redirect/code exchange 문서가 공개적이고, fake provider 이후 server-side adapter로 옮기기 쉽습니다.
- `KG이니시스`는 본인인증 범주의 공개 테스트 자료가 가장 잘 보입니다.
- `Naver`는 공개 운영 전환 절차는 분명하지만 세부 callback 명세가 콘솔/가이드 의존적입니다.
- `NHN KCP`, `KCB`는 실제 구현에 필요한 developer 자료가 공개 접근만으로는 부족합니다.

## 6. 운영 체크리스트

### 공통

- dev/staging/prod별 redirect URI를 분리 등록합니다.
- secret/client key는 `.env` 또는 외부 비밀 저장소에서만 주입합니다.
- fake provider와 replay 경로는 dev/test runtime에서만 활성화합니다.
- staging smoke는 provider별 테스트 계정 또는 테스트 번호가 확보된 뒤에만 수행합니다.

### Google

- HTTPS redirect URI와 소유 도메인을 준비합니다.
- embedded WebView를 쓰지 않습니다.
- `cf_google_clientid`, `cf_google_secret` 또는 `AUTH_EXTERNAL_GOOGLE_CLIENT_ID`, `AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET` 중 하나를 설정합니다.
- `/auth/external/providers`에서 `google`이 노출되는지 먼저 확인합니다.
- `/auth/external/google/start`는 `callback_method=GET`, Google authorize URL, `openid email profile` scope를 반환해야 합니다.
- real callback으로 받은 `code/state/request_token`으로 `/auth/external/google/complete`를 호출해 `status=success`, `available_actions`, `transition_token`을 확인합니다.
- `transition_token`으로 `/sessions`, `/claims`, `/registrations`, `/links` 중 필요한 경로를 한 번 수행한 뒤 토큰을 즉시 폐기하고 재시도 시 fresh `complete` 결과를 다시 사용합니다.

### Kakao

- Kakao Login을 `ON`으로 켭니다.
- REST 기준 redirect URI와 JS/Flutter 기준 redirect URI 등록 위치를 혼동하지 않습니다.
- `cf_kakao_rest_key`, `cf_kakao_client_secret` 또는 `AUTH_EXTERNAL_KAKAO_CLIENT_ID`, `AUTH_EXTERNAL_KAKAO_CLIENT_SECRET`를 설정합니다. client secret은 Kakao 콘솔에서 선택적으로 비활성일 수 있으므로 blank여도 REST 키만 있으면 provider 목록에 노출됩니다.
- `/auth/external/providers`에서 `kakao`가 노출되는지 먼저 확인합니다.
- `/auth/external/kakao/start`는 `callback_method=GET`, Kakao authorize URL, 기본 scope `account_email,profile`를 반환해야 합니다.
- real callback으로 받은 `code/state/request_token`으로 `/auth/external/kakao/complete`를 호출해 `status=success`, `available_actions`, `transition_token`을 확인합니다.
- `transition_token`으로 `/sessions`, `/claims`, `/registrations`, `/links` 중 필요한 경로를 한 번 수행한 뒤 토큰을 즉시 폐기하고 재시도 시 fresh `complete` 결과를 다시 사용합니다.

### Naver

- 운영 전환 직전에 API 상태를 `서비스 적용`으로 바꾸는 체크리스트를 둡니다.

### KG이니시스

- `successUrl`, `failUrl`, `authHash`, 결과조회 URL 검증을 staging부터 강제합니다.
- 앱 WebView 대신 외부 브라우저 또는 페이지 전환 방식을 우선 검토합니다.

## 7. transition_token 정책

- 현재 `transition_token`은 `request_token`과 같은 HMAC codec을 사용하며 TTL은 `AUTH_EXTERNAL_REQUEST_TTL_SECONDS`를 그대로 따릅니다. 기본값은 `600초`입니다.
- 서버는 현재 이 토큰을 stateless로 검증하므로 `만료 전 재사용`을 기술적으로 막지 않습니다.
- 다만 canonical client 정책은 `terminal action(session/claim/register/link) 1회 성공 또는 실패 후 즉시 폐기`입니다.
- 재시도는 같은 token 재사용 대신 `complete`를 다시 호출해 새 `transition_token`을 받아 수행합니다.
- 서버 측 방어는 path provider 일치, `provider_user_id` 존재 검증, 이미 연결된 link conflict, 기존 회원 claim 시 비밀번호 검증으로 보완합니다.

## 8. 남은 질문

- `AUTH-305`에서 실제로 먼저 붙일 공급자를 사업 우선순위 기준으로 확정했는가
- `KCB`, `NHN KCP` 개발 포털 접근 권한이나 계약 문서가 있는가
- `KG이니시스`를 본인인증 첫 후보로 볼지, 소셜로그인 1종을 먼저 붙일지 제품 우선순위가 있는가
