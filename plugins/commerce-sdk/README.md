# Commerce Plugin SDK Boundary

이 디렉터리는 유료 Commerce 플러그인의 공개 계약만 소유합니다. 상용 구현과 라이선스 발급 private key는 이 저장소에 두지 않습니다.

이 공개 SDK는 Apache-2.0입니다. 공식 Commerce 구현과 제3자 플러그인은 각 독립 저장소에서 상용 또는 오픈소스 라이선스를 선택할 수 있습니다.

Commerce 기능은 PHP Connector의 Shop 공급자 계약, 서버 application·route·권한, 반응형 웹 UI, 알림 event source를 함께 제공해야 합니다. 브라우저 UI만 숨기는 방식은 허용하지 않습니다.

[`contracts/commerce-plugin-v1.json`](contracts/commerce-plugin-v1.json)은
현재 26개 Shop operation과 서버 전용 호출 context를 고정합니다. Fleet
Core는 `/api/v1/plugins`에서 설치 가능 slot만 공개하며 Commerce 구현을
import하거나 미설치 상태의 부팅을 막지 않습니다. 플러그인은 브라우저에
G5·결제·라이선스 secret을 전달할 수 없습니다.

초기 구현 우선순위는 주문·결제·취소요청 알림, 주문 목록/상세, 배송·송장, 저재고, 문의·리뷰 답변, 상품 빠른 수정, 매출 요약입니다. 실제 결제 취소·환불은 step-up 인증과 감사 로그가 갖춰진 뒤 별도 활성화합니다.
