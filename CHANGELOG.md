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

### Changed

- 활성 제품을 Tauri 데스크톱 앱에서 서버가 제공하는 반응형 웹 앱으로 전환했습니다.
- 릴리스 빌드가 정본 버전, SemVer 형식과 확정된 changelog 항목을 검증하도록 강화했습니다.

### Security

- SQLite 손상·누락 시 자동 재생성하지 않는 fail-closed 저장 정책을 적용했습니다.
- 브라우저에 G5 JWT·refresh token·SSH private key를 전달하지 않는 서버 보안 경계를 적용했습니다.

[Unreleased]: https://github.com/jiwonpapa/gnuboard5-fleet/commits/main
