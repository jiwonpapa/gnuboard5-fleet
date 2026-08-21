# 변경 기록

이 프로젝트의 주목할 만한 변경 사항을 이 파일에 기록합니다.

형식은 [Keep a Changelog 1.1.0](https://keepachangelog.com/ko/1.1.0/)을
따르며, 제품 버전은 [Semantic Versioning 2.0.0](https://semver.org/lang/ko/)을
따릅니다. Git 커밋 목록은 변경 기록을 대신하지 않습니다.

## [Unreleased]

### Added

- Keep a Changelog 기반 제품 변경 기록과 SemVer 기반 릴리스 정책.
- Axum 서버, React SPA/PWA, 내장 SQLite로 구성된 self-hosted Fleet Core.
- 별도 설치되는 그누보드5 PHP Connector와 canonical OpenAPI 계약.
- 최초 설치 관리자, 필수 OTP, 복구 코드, 사이트별 세션·비밀 격리.
- PHP → OpenAPI → Rust → 서버 → UI 소비를 검증하는 이관 감사 하네스.
- 회원 목록·상세·수정·레벨·내보내기·아이콘·이미지·소프트 삭제를 제공하는 R12 반응형 관리 작업대와 공식 G5 로컬 인증 하네스.
- 게시판 그룹 CRUD·부분 수정·그룹 회원 관리를 canonical/legacy 17개 계약으로 제공하는 R13 반응형 작업대와 공식 G5·브라우저 검증 하네스.
- 게시판 목록·상세·생성·수정·복제·삭제·최근글 정리를 제공하는 R14 반응형 작업대와 공식 G5 로컬 인증 하네스.
- 정적 내용 목록·상세·생성·수정·삭제와 HTML 0/1/2 모드를 보존하는 R15 반응형 작업대와 공식 G5 로컬 인증 하네스.
- FAQ 분류·문항 CRUD, PC·모바일 HTML 보존, 상·하단 이미지 관리를 제공하는 R16 반응형 작업대와 공식 G5 로컬 인증 하네스.
- 메뉴 CRUD와 표준·호환 순서변경을 제공하는 R17 반응형 작업대와 공식 G5·브라우저 인증 하네스.
- 레이아웃·테마·포인트·투표·팝업·인기검색어를 typed site-scoped 서버 웹으로 이관한 R18~R23 작업대.
- 방문 통계·로그 검색·조건 삭제를 빈 조건 차단, OTP step-up과 삭제 후 재조회로 제공하는 R24 반응형 작업대.
- 신고 목록·상태 통계·처리 변경을 OTP step-up, 확인 대화상자와 변경 후 재조회로 제공하는 R25 반응형 작업대.
- QA 설정 36개 필드의 차등 저장·원복과 문의 번호 일괄 삭제를 OTP step-up, 확인 대화상자와 서버 재조회로 제공하는 R26 반응형 작업대.
- 글·댓글 작성량을 기간·날짜·게시판별로 조회하고 합계와 bucket을 함께 비교하는 R27 반응형 통계 작업대.
- 메일 템플릿 CRUD·수신자 조회·회원 dry-run·테스트 계약을 외부 발송 0 경계로 제공하는 R28 반응형 메일 작업대.

### Changed

- 활성 제품을 Tauri 데스크톱 앱에서 서버가 제공하는 반응형 웹 앱으로 전환했습니다.
- 릴리스 빌드가 정본 버전, SemVer 형식과 확정된 changelog 항목을 검증하도록 강화했습니다.
- PHP Connector 게시판 생성·삭제가 G5 write table 수명주기를 함께 관리하도록 보강했습니다.

### Security

- SQLite 손상·누락 시 자동 재생성하지 않는 fail-closed 저장 정책을 적용했습니다.
- 브라우저에 G5 JWT·refresh token·SSH private key를 전달하지 않는 서버 보안 경계를 적용했습니다.

[Unreleased]: https://github.com/jiwonpapa/gnuboard5-fleet/commits/main
