# ADR-0002: Apache Core와 독립 플러그인 상품 경계

- 상태: 승인
- 날짜: 2026-07-23

## 결정

Fleet Core, PHP Connector, Desktop, Server, Web와 공개 Commerce SDK는 Apache-2.0으로 배포합니다. Telegram과 Web Push는 Core 기본 기능입니다. 공식 Commerce 구현은 별도 비공개 저장소에서 제공하는 선택형 유료 플러그인이며, 제3자 플러그인도 각 저장소에서 독립 라이선스를 선택할 수 있습니다.

PHP Connector의 관리자 Shop 26개 공급자 계약은 삭제하지 않습니다. 유료 경계는 PHP endpoint 존재 여부가 아니라 서버 application·route·권한·태블릿 UI 전체 소비 경계에서 강제합니다.

플러그인 라이선스는 Fleet Core의 Apache-2.0 권리를 축소하지 않습니다. Commerce 미설치는 정상 상태이며 Core는 상용 구현을 import하거나 라이선스 서버에 의존해 부팅하지 않습니다. GnuBoard5 upstream과 외부 의존성은 각 원저작자의 라이선스와 고지를 유지합니다.
