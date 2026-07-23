# Migration Status

## 이번 기준선

- 기존 PHP REST API와 Rust/Tauri의 clean revision을 공개용 sanitized snapshot으로 이관
- 원본 private 전체 이력과 과거 `output/` 증적은 destination 이력·object DB에 포함하지 않음
- canonical OpenAPI 312개 축소 금지
- 활성 관리자 189개, 일반 게시판 26개, 관리자 Shop 26개 기준 고정
- 공식 GnuBoard5 v5.6.32 commit·tree·파일 fingerprint 고정
- Fleet Core 무료 정책, Commerce 유료 플러그인, Telegram/Web Push 기본 경계 고정
- Python migration audit와 변이 회귀 테스트 구축

## 아직 인증하지 않는 것

- Axum 서버 구현
- React HttpTransport와 태블릿 PWA
- 사용자·사이트 동시 세션 격리
- Telegram/Web Push 실제 발송
- Compose 설치·업그레이드·rollback
- GnuBoard5 v5.6.32 대상 live 저장/readback/cleanup

따라서 이번 완료 등급의 상한은 `MIGRATION_STATIC_PASS`입니다.
