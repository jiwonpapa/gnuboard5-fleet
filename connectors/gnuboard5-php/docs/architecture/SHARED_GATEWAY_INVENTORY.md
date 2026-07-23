# Shared Gateway Inventory

이 문서는 `Auth/Board/Member/Point/Post`가 왜 아직 `Api\Integration\Contracts\*Gateway`에 남아 있는지와,
현재 허용된 소비 경계를 고정하는 지원 문서입니다.
현재 broad shared gateway는 active 구조 부채가 아니라 `Core/Plugin` 및 repository/contract 호환 shell로만 관리합니다.

기준 시점: 2026-03-13
구조 가드: `tests/contract/g5-repository/GatewayImplementationContractTest.php`
machine-readable registry: `docs/architecture/GATEWAY_USAGE_RULES.json`

## 1. 현재 분류

| Gateway | 제공 도메인 | 현재 상태 | Plugin scope | 유지 이유 |
|------|------|------|------|------|
| `AuthGateway` | `Auth` | shared internal, local source fixed, provider ports split, shared surfaces narrowed, compat shell minimalized | 없음 | 세션/복구/가입/외부 인증과 `Member`, JWT middleware가 함께 사용하되, Auth 도메인 자체는 `Api\Auth\Contracts\AuthGateway`를 진실 원본으로 사용 |
| `BoardGateway` | `Board` | shared + plugin | `board.read` | `Comment/File/Like/Post`와 plugin scope가 게시판 메타데이터/정책을 함께 사용 |
| `MemberGateway` | `Member` | shared + plugin | `member.read`, `member.write` | 회원 프로필/미디어/검증과 plugin scope가 같은 read/write 경계를 공유 |
| `PointGateway` | `Point` | shared + plugin, local source fixed, shared surfaces narrowed | `point.write` | `Auth/Post/Memo/Admin/Poll` 보상/차감 흐름과 plugin reward가 같은 mutation 경계를 사용하되, Point 도메인 자체는 `Api\Point\Contracts\PointGateway`를 진실 원본으로 사용 |
| `PostGateway` | `Post` | shared + plugin, local source fixed, shared read/write surfaces narrowed | `post.read`, `post.write` | `Comment/File` internal helper와 plugin read 소비는 `Api\Integration\Contracts\PostReadGateway`, plugin write 소비는 `Api\Integration\Contracts\PostWriteGateway`를 우선 사용하고, broad `PostGateway`는 plugin/core read-write 호환면 중심으로 유지하되 Post 도메인 자체는 `Api\Post\Contracts\PostGateway`를 진실 원본으로 사용 |

## 2. 이미 localize 된 gateway

- `Comment/File/Like/Memo/Menu/Qa`는 도메인 `Contracts/*Gateway`를 진실 원본으로 사용합니다.
- `Api\Integration\Contracts\*`는 정의 파일, 호환 저장소, 계약 테스트에서만 deprecated 호환층으로 남습니다.

## 3. 호출 지도

### `AuthGateway`

- API 소비 도메인: `Auth`, `Member`, `Middlewares`, `Core/Middleware`
- 외부 흐름: `ExternalAuth*`
- plugin scope 노출: 없음
- 현재 판단:
  - Auth 도메인 자체는 `Api\Auth\Contracts\AuthGateway`를 진실 원본으로 사용하고, deprecated `Api\Integration\Contracts\AuthGateway`는 member/middleware 호환 경계만 남겼습니다.
  - provider domain 내부는 `AuthIdentityGateway`, `AuthRegistrationGateway`, `AuthSessionGateway`, `AuthRecoveryGateway`로 세분화해 가입/세션/복구 책임을 먼저 분리했습니다.
  - shared 소비면도 `Api\Integration\Contracts\AuthIdentityGateway`, `AuthSessionGateway`, `AuthRecoveryGateway`로 1차 축소해 `middleware/member`가 broad shared `AuthGateway` 대신 더 좁은 포트를 바라보게 정리했습니다.
  - broad shared `AuthGateway`는 현재 definitions/repository와 계약 테스트 호환 shell 위주로만 남아 있습니다.
  - 추가 축소는 active 구조 정상화 범위가 아니라, compat shell 제거가 소비단 영향 없이 가능하다는 근거가 확보될 때만 장기 검토합니다.

### `BoardGateway`

- API 소비 도메인: `Board`, `Comment`, `File`, `Like`, `Post`
- plugin scope 노출: `board.read`
- 현재 판단:
  - 게시판 접근 정책, 게시판 설정, 게시물/댓글/파일 검증이 같은 게시판 메타데이터를 재사용합니다.
  - plugin scope가 직접 기대는 계약이므로 plugin contract 재설계 전에는 shared 유지가 맞습니다.

### `MemberGateway`

- API 소비 도메인: `Member`
- plugin scope 노출: `member.read`, `member.write`
- 현재 판단:
  - 소비 도메인 수는 적지만 plugin read/write 경계가 이미 공개된 상태라 shared 유지가 맞습니다.
  - 추가 축소는 plugin scope 계약을 다시 설계할 때만 장기 검토합니다.

### `PointGateway`

- API 소비 도메인: `Point`, `Auth`, `Post`, `Memo`, `Admin/Point`, `Admin/Poll`
- plugin scope 노출: `point.write`
- 현재 판단:
  - 가입/포스트/메모/관리자 보상 흐름이 같은 지급/차감 mutation을 공유합니다.
  - Point 도메인 자체는 `Api\Point\Contracts\PointGateway`를 진실 원본으로 사용하고, provider domain 내부는 `PointQueryGateway`, `PointRewardGateway`, `PointMaintenanceGateway`로 세분화했습니다.
  - cross-domain 호환면도 `Api\Integration\Contracts\PointQueryGateway`, `PointRewardGateway`, `PointMaintenanceGateway`를 도입해 `Admin/Point`의 조회/관리 흐름과 `Auth/Post/Memo/AdminPoll`의 순수 reward/maintenance 소비를 broad `PointGateway`에서 2차 분리했습니다.
  - `AdminPointService`는 이제 shared `PointQueryGateway`, `PointRewardGateway`, `PointMaintenanceGateway`만 바라보며, broad `Api\Integration\Contracts\PointGateway`는 plugin reward 호환면과 compatibility shell 위주로 축소됐습니다.
  - 테스트/보조층도 `Post/Memo/AdminPoll/Auth`는 `PointRewardGateway`/`PointMaintenanceGateway` 기준으로 정리했고, sample plugin `BoardReward`도 `PointRewardGateway`로 옮겼습니다. broad `PointGateway`는 현재 `Core/Plugin` compat shell과 repository/contract 호환면 위주로만 남았습니다.
  - 추가 축소는 plugin capability를 `reward/query/maintenance`로 다시 노출할지 결정하는 장기 설계 과제일 뿐, 현재 active 구조 부채는 아닙니다.

### `PostGateway`

- API 소비 도메인: `Post`, `Comment`, `File`
- plugin scope 노출: `post.read`, `post.write`
- 현재 판단:
  - Post 도메인 자체는 `Api\Post\Contracts\PostGateway`를 진실 원본으로 사용하고, deprecated `Api\Integration\Contracts\PostGateway`는 `Comment/File/plugin` 소비면만 남겼습니다.
  - `Comment/File` internal helper가 실제로 사용하는 읽기 메서드는 `Api\Integration\Contracts\PostReadGateway`로 먼저 분리했고, plugin read scope도 같은 좁은 포트를 직접 받을 수 있게 열었습니다.
  - plugin write scope도 `Api\Integration\Contracts\PostWriteGateway`를 직접 받을 수 있게 열어 broad shared `PostGateway`는 `Core/Plugin` read-write compat shell과 repository compat shell 위주로 더 명확히 축소했습니다.
  - 남은 broad surface는 plugin-facing read/write, 스크랩, 반응 흐름이지만, 현재는 compat shell로 한정돼 있어 active 구조 부채로 보지 않습니다.
  - 추가 축소는 plugin capability를 더 잘게 재설계할 때만 장기 검토합니다.

## 4. 구조 규칙

1. 새 cross-domain 사용처는 이 문서와 계약 테스트 allowlist를 같이 갱신하지 않으면 허용하지 않습니다.
   - machine-readable 진실 원본은 `docs/architecture/GATEWAY_USAGE_RULES.json`이며, Markdown은 설명 문서입니다.
2. plugin scope가 기대는 `Board/Member/Point/Post` 계약은 plugin policy/proxy 재설계 전까지 shared 유지가 기본입니다.
3. `AuthGateway`는 plugin 이유가 아니라 middleware/member/external auth의 공통 식별 경계 때문에 shared internal로 유지합니다.
4. local-only gateway와 shared gateway를 같은 원칙으로 다루지 않습니다.

## 5. 장기 재검토 조건

1. `PointGateway`
   - plugin capability를 `reward/query/maintenance` 수준으로 다시 설계할 명확한 요구가 생길 때만 broad compat shell 축소를 재검토합니다.
2. `PostGateway`
   - plugin의 write/reaction/scrap capability를 별도 공개 계약으로 승격할 때만 broad compat shell 축소를 재검토합니다.
3. `AuthGateway`
   - repository/contract 호환 shell 제거가 소비단 영향 없이 가능하다는 증거가 확보될 때만 완전 제거를 검토합니다.
4. `BoardGateway`, `MemberGateway`
   - plugin scope 계약 자체를 재설계하는 별도 트랙이 시작될 때만 재검토합니다.
