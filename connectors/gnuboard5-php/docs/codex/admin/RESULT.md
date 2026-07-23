# 관리자(Admin) 도메인 보강 결과

## 완료 범위
- WS-A1 Admin Auth 신규 구현 완료
  - `GET /v1/admin/auth`
  - `PUT /v1/admin/auth/{mb_id}`
  - `DELETE /v1/admin/auth/{mb_id}`
- WS-A2 Admin Poll 신규 구현 완료
  - 관리자: `GET/POST/PATCH/DELETE /v1/admin/polls` 계열
  - 사용자: `GET /v1/polls/active`, `POST /v1/polls/{po_id}/vote`, `GET /v1/polls/{po_id}/result`
- WS-A3 Admin Popup 신규 구현 완료
  - 관리자: `GET/POST/PATCH/DELETE /v1/admin/popups` 계열
  - 사용자: `GET /v1/popups/active`
- WS-A4 Admin Mail 신규 구현 완료
  - `GET /v1/admin/mails`
  - `GET /v1/admin/mails/{ma_id}`
  - `POST /v1/admin/mails`
  - `POST /v1/admin/mails/test`
  - `GET /v1/admin/mails/recipients`
  - `DELETE /v1/admin/mails/{ma_id}`

## 기존 도메인 보강
- WS-B1 Config 보강
  - `AdminConfigRepository::UPDATABLE_FIELDS` 확장 (메일/SMS/회원/포인트/소셜로그인 포함)
  - `AdminConfigService` 입력 정규화/검증(bool/int/email) 추가
- WS-B2 Visit 보강
  - `type` 기반 통계 지원:
    - `date/hour/week/month/year/browser/os/device/domain/search`
  - 삭제 보강:
    - `DELETE /v1/admin/visits?before=YYYY-MM-DD`

## 생성/수정 파일(핵심)
- 신규
  - `api/v1/Admin/Auth/{Controller,Service,Repository}/AdminAuth*.php`
  - `api/v1/Admin/Poll/{Controller,Service,Repository}/AdminPoll*.php`
  - `api/v1/Admin/Popup/{Controller,Service,Repository}/AdminPopup*.php`
  - `api/v1/Admin/Mail/{Controller,Service,Repository}/AdminMail*.php`
  - `tests/Admin/Auth/AdminAuthServiceTest.php`
  - `tests/Admin/Poll/AdminPollServiceTest.php`
  - `tests/Admin/Popup/AdminPopupServiceTest.php`
  - `tests/Admin/Mail/AdminMailServiceTest.php`
- 수정
  - `api/routes.php`
  - `api/v1/Admin/Config/Repository/AdminConfigRepository.php`
  - `api/v1/Admin/Config/Service/AdminConfigService.php`
  - `api/v1/Admin/Visit/{Controller,Service,Repository}/AdminVisit*.php`

## 비즈니스 규칙 반영 확인
- Admin 전용 기능: 최고관리자(`mb_level >= 10`) 체크 적용
- Auth: 메뉴별 권한(`r/w/d`) 정규화, 자기 권한 삭제 금지
- Poll: 항목 최대 9개, 중복투표(IP+회원ID) 방지, 레벨 검증, 투표 포인트 지급, 기타의견 저장
- Popup: 기간/디바이스/구분 필터 기반 활성 팝업 조회
- Mail: 수신자 범위(전체/레벨/그룹/개별), 발송 이력 기록, 테스트 발송 지원

## 자기 감사 결과
- 정적 분석
  - 명령: `vendor/bin/phpstan analyse api/ --level=6 --memory-limit=1G`
  - 결과: 통과 (`[OK] No errors`)
- 테스트
  - 명령: `vendor/bin/phpunit tests/`
  - 결과: 통과 (`OK (142 tests, 611 assertions)`)

## 참고
- 기존 ` /v1/admin/system/* ` 라우트와 신규 세분화 라우트(` /v1/admin/auth|polls|popups|mails `)가 현재 공존합니다.
  - 하위 호환성 유지에는 유리하지만, 장기적으로는 신규 라우트로 수렴하는 정리 작업이 권장됩니다.
