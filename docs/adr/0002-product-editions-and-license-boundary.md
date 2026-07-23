# ADR-0002: Fleet Core와 Commerce 상품 경계

- 상태: 승인, 루트 소스 라이선스는 미결정
- 날짜: 2026-07-23

## 결정

Fleet Core는 무료 사용 정책의 self-hosted 멀티사이트 관리자입니다. Telegram과 Web Push는 Core 기본 기능입니다. Commerce는 별도 비공개 저장소에서 제공하는 선택형 유료 플러그인입니다.

PHP Connector의 관리자 Shop 26개 공급자 계약은 삭제하지 않습니다. 유료 경계는 PHP endpoint 존재 여부가 아니라 서버 application·route·권한·태블릿 UI 전체 소비 경계에서 강제합니다.

기존 PHP와 Rust 저장소의 AGPL, MIT, proprietary 표기 충돌이 해소될 때까지 공개 릴리스와 유료 배포를 차단합니다. 무료 정책을 오픈소스 권리 부여로 표현하지 않습니다.
