# ADR-0013: 알림 outbox, 안전한 PWA와 Commerce 경계

- 상태: Accepted
- 날짜: 2026-07-24

## 결정

알림은 외부 queue나 Redis 없이 SQLite `notification_outbox`를 정본으로
사용합니다.

- `event_id + channel`로 중복 enqueue를 제거합니다.
- 단일 설치 writer가 만료 가능한 lease를 획득하고 attempts를 증가시킵니다.
- transient 실패는 bounded exponential retry, 영구 실패와 최대 시도
  초과는 `dead_letter`로 전환합니다.
- payload는 typed 필드와 같은 origin action path만 허용하고 기본
  email·전화·token 후보를 저장 전에 마스킹합니다.
- Telegram과 Web Push는 injected transport adapter입니다. routine gate는
  fake provider만 사용하며 네트워크 client를 포함하지 않습니다.
- provider가 구성되지 않은 서버에서는 worker를 시작하지 않아 외부
  발송이 기본 비활성입니다.

Admin Web service worker는 app shell과 정적 asset만 cache합니다.
`/api/*`, `/healthz`, `/readyz`와 mutation 응답은 cache하지 않습니다.

Commerce는 `plugins/commerce-sdk/contracts/commerce-plugin-v1.json`의
서버 전용 계약으로만 연결합니다. Fleet Core는 설치 slot을 제공하지만
Commerce 구현 또는 Shop operation을 import하지 않으며 미설치 상태로
정상 부팅합니다.

## 증거 한계

B08은 fake Telegram·Web Push 상태 전이와 PWA cache 정책을 검증합니다.
실제 외부 발송은 요청받은 live 검증 전까지 인증하지 않습니다.
