# 플러그인 개발 가이드

> 준수 판단 기준 문서는 `docs/architecture/PLUGIN_IMPLEMENTATION_STANDARD.md`입니다.
> 본 문서는 실제 구현 예시와 빠른 착수용 안내에 집중합니다.

## 목적

이 문서는 현재 플러그인 코어에 맞춰 신규 플러그인을 작성할 때 반드시 지켜야 하는 규칙만 정리합니다.

## 핵심 원칙

- 플러그인은 `Api\Plugins\{Vendor}\{Plugin}` 네임스페이스를 사용합니다.
- 플러그인은 `manifest.json`의 `scopes`로 필요한 Gateway만 선언합니다.
- 플러그인 서비스/컨트롤러 등록은 반드시 `register()`의 명시 팩토리로 처리합니다.
- 플러그인은 `PluginContext`를 통해서만 라우트 callable을 등록합니다.
- `get_member()`, `sql_query()`, `common.php`, `$_SESSION`, `$GLOBALS` 직접 사용은 금지입니다.

## 경로를 보는 법

아래 3개는 같은 것을 가리키지만, 서로 다른 계층입니다.

| 계층 | 예시 | 의미 |
|------|------|------|
| 소스 저장 위치 | `api/plugins/Wolchuck/Hello/` | 레포지토리 내부 폴더 |
| PHP 클래스 경로 | `Api\Plugins\Wolchuck\Hello\...` | autoload 네임스페이스 |
| 외부 API 경로 | `/api/v1/p/hello/...` | 클라이언트가 호출하는 공개 URL |

즉, `api/plugins/`는 URL이 아니라 내부 폴더입니다.  
외부 문서와 Swagger에는 항상 `/api/v1/p/{plugin_name}/...`만 노출합니다.

## 왜 명시 팩토리인가

플러그인 컨테이너는 코어 클래스와 임의 서비스 자동 생성을 막기 위해 기본 autowiring을 끕니다. 따라서 아래처럼 등록해야 합니다.

```php
$builder->addDefinitions([
    DemoService::class => static fn (ContainerInterface $container): DemoService => new DemoService(
        $container->get(BoardGateway::class)
    ),
    DemoController::class => static fn (ContainerInterface $container): DemoController => new DemoController(
        $container->get(DemoService::class)
    ),
]);
```

`DI\autowire()`에 의존하면 플러그인 컨테이너 격리 정책과 충돌합니다.

## 라우트 등록 규칙

플러그인 라우트는 반드시 `PluginContext::callable()`을 사용합니다.

```php
$app->group('/v1/p/demo', function (RouteCollectorProxy $group) use ($context): void {
    $group->get('/status', $context->callable(DemoController::class, 'status'));
});
```

이 방식으로만 플러그인 컨트롤러가 전용 컨테이너에서 해석됩니다.
여기서 `demo`는 디렉토리명이 아니라 `manifest.json.name`에 정의한 공개용 `plugin_name`입니다.

## Scope 규칙

현재 지원 scope는 아래와 같습니다.

| Scope | 의미 |
|------|------|
| `board.read` | `BoardGateway` 접근 |
| `member.read` | `MemberGateway` 읽기 전용 |
| `member.write` | `MemberGateway` 전체 |
| `post.read` | `PostReadGateway` 권장, `PostGateway` 읽기 전용 호환 |
| `post.write` | `PostWriteGateway` 권장, `PostGateway` 전체 호환, `PostReadGateway` 읽기 helper 병행 가능 |
| `point.write` | `PointRewardGateway` 권장, `PointGateway` 전체 호환 |

`member.read`, `post.read`는 wrapper를 통해 쓰기 메서드가 런타임 차단됩니다. 새 플러그인은 broad gateway보다 더 좁은 `PostReadGateway`, `PointRewardGateway`를 우선 사용하십시오.

## 쓰기 엔드포인트 권장 방식

샘플 플러그인 `api/plugins/Wolchuck/BoardReward/Plugin.php`는 `point.write`를 사용하지만, 실제 지급 라우트는 기본 비활성입니다.

- 환경 변수: `PLUGIN_BOARD_REWARD_ENABLE_GRANT=1`
- 기본값: 비활성
- 이유: 샘플 코드가 배포 즉시 운영 데이터에 영향을 주지 않게 하기 위함

쓰기 라우트는 반드시 아래 둘 중 하나를 추가하십시오.

- 명시적 환경 변수 토글
- 관리자 인증/서명 검증

## 샘플 참고 파일

- 무료/이벤트 샘플: `api/plugins/Wolchuck/Hello/Plugin.php`
- 부분유료 샘플: `api/plugins/Wolchuck/PremiumPush/Plugin.php`
- `board.read + point.write` 샘플: `api/plugins/Wolchuck/BoardReward/Plugin.php`

## 감사 명령

```bash
composer run analyse
composer run test
composer run test:plugin:isolation
```
