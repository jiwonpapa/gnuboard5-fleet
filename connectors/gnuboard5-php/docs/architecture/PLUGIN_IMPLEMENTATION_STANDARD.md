# 플러그인 구현 규약서

> 이 문서는 플러그인 아키텍처에 대한 권고문이 아니라 준수 문서입니다.
> 플러그인 개발자는 본 문서의 규칙을 그대로 따라야 하며, 예외가 필요하면 코어 스펙부터 먼저 개정해야 합니다.

## 1. 문서 성격

- 문서 분류: 구현 규약서
- 영문 표현: `Plugin Implementation Standard`
- 목적: "이 스펙대로 개발하세요"를 강제하는 기준 문서
- 우선순위: 본 문서 > 실무 예시 문서 > 개별 플러그인 README

실무 예시는 `docs/architecture/PLUGIN_DEVELOPER_GUIDE.md`를 따릅니다.  
준수 여부 판정은 반드시 본 문서를 기준으로 합니다.

## 2. 필수 준수 항목

플러그인 구현은 아래 항목을 모두 만족해야 합니다.

1. 플러그인 루트는 `api/plugins/{Vendor}/{Plugin}/` 구조를 사용합니다.
2. 네임스페이스는 `Api\Plugins\{Vendor}\{Plugin}\...` 형태를 사용합니다.
3. `manifest.json`, `Plugin.php`는 필수입니다.
4. `manifest.json`의 `scopes`는 실제 사용하는 Gateway와 정확히 일치해야 합니다.
5. `PluginInterface::register()`에서는 명시 팩토리만 사용합니다.
6. `PluginInterface::boot()`에서는 `PluginContext::callable()`로만 라우트를 등록합니다.
7. 코어 라우트(`/api/v1/posts`, `/api/v1/auth` 등)를 오버라이드하면 안 됩니다.
8. 그누보드 레거시 함수와 글로벌 상태를 직접 사용하면 안 됩니다.
9. 플러그인 예외는 안전한 API 예외로 수렴되어야 합니다.
10. 테스트, 정적분석, 격리 검사를 통과해야 커밋/배포할 수 있습니다.

## 2-1. 경로 계층 매핑

`api/plugins/...`와 `/api/v1/p/...`는 서로 다른 계층입니다. 혼용하면 안 됩니다.

| 구분 | 규칙 | 예시 |
|------|------|------|
| 파일시스템 경로 | 플러그인 소스 저장 위치 | `api/plugins/Wolchuck/Hello/` |
| PHP 네임스페이스 | 클래스 로딩 규칙 | `Api\Plugins\Wolchuck\Hello\Plugin` |
| HTTP 라우트 prefix | 외부 공개 엔드포인트 | `/api/v1/p/hello/...` |

강제 규칙:

- 파일시스템 경로는 내부 저장 구조입니다.
- 공개 URL은 항상 `/api/v1/p/{plugin_name}/...` 패턴을 사용합니다.
- `plugin_name`은 `manifest.json.name`의 kebab-case 값을 사용합니다.
- 공개 URL은 `api/plugins/...` 경로를 그대로 노출하지 않습니다.

예시 매핑:

- 디렉토리: `api/plugins/Wolchuck/PremiumPush/`
- 네임스페이스: `Api\Plugins\Wolchuck\PremiumPush\...`
- 공개 URL: `/api/v1/p/premium-push/...`

## 3. 디렉토리 및 파일 계약

최소 구조는 아래와 같습니다.

```text
api/plugins/{Vendor}/{Plugin}/
├── manifest.json
├── Plugin.php
└── src/
    ├── Controller/
    └── Service/
```

선택 구조:

- `src/Repository/`
- `migrations/`
- `README.md`

## 4. manifest.json 규약

필수 필드:

- `name`
- `vendor`
- `version`
- `require_api_version`
- `scopes`

권장 필드:

- `description`
- `license.type`
- `license.check_url`
- `license.protected_paths`
- `entry_class`
- `autoload.psr-4`

규칙:

- `name`은 kebab-case
- `vendor`는 식별 가능한 고정 문자열
- `require_api_version`은 현재 코어와 호환 가능한 범위를 명시
- 지원하지 않는 `scopes`를 선언하면 로드가 거부됩니다

## 5. 생명주기 계약

### register()

`register()`는 플러그인 전용 컨테이너 정의를 등록하는 단계입니다.

허용:

- 명시 팩토리
- 플러그인 내부 서비스/컨트롤러 정의
- scope로 허용된 Gateway 주입

금지:

- `DI\autowire()` 의존
- 코어 서비스 데코레이터/교체
- 전역 컨테이너에 대한 가정

허용 예시:

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

### boot()

`boot()`는 라우트 등록과 이벤트 구독만 담당합니다.

허용:

- `/v1/p/{plugin_name}/...` 하위 라우트 등록
- `EventDispatcher` 구독
- `PluginContext::callable()` 기반 컨트롤러 연결

금지:

- 코어 경로 점유
- 런타임에 컨테이너 구조 재정의
- 플러그인 외부 상태 직접 변경

## 6. Scope 및 Gateway 계약

현재 허용 scope:

| Scope | 허용 서비스 | 권한 |
|------|-------------|------|
| `board.read` | `BoardGateway` | 읽기 |
| `member.read` | `MemberGateway` | 읽기 전용 |
| `member.write` | `MemberGateway` | 전체 |
| `post.read` | `PostReadGateway` 권장, `PostGateway` 호환 | 읽기 전용 |
| `post.write` | `PostWriteGateway` 권장, `PostGateway`, `PostReadGateway` | 전체 |
| `point.write` | `PointRewardGateway` 권장, `PointGateway` 호환 | 전체 |

강제 규칙:

- 선언하지 않은 Gateway 접근은 런타임 예외로 차단됩니다.
- `member.read`, `post.read`는 쓰기 메서드 호출이 런타임에서 차단됩니다.
- 새 플러그인은 broad 호환 shell보다 더 좁은 `PostReadGateway`, `PostWriteGateway`, `PointRewardGateway`를 우선 사용합니다.
- scope 확대가 필요하면 먼저 코어 `PluginScopePolicy`를 확장해야 합니다.

## 7. 라우트 규약

플러그인 라우트는 반드시 아래 패턴을 사용합니다.

```text
/api/v1/p/{plugin_name}/...
```

예시:

- `/api/v1/p/hello/greet`
- `/api/v1/p/premium-push/status`
- `/api/v1/p/board-reward/rewards/preview`

규칙:

- `plugin_name`은 `manifest.json.name`과 일치해야 합니다.
- `plugin_name`은 디렉토리명 `Plugin`의 PascalCase가 아니라, 외부 공개용 kebab-case 식별자입니다.
- 경로 충돌 가능성이 있는 일반 명사 단독 사용은 피합니다.
- 쓰기 엔드포인트는 기본적으로 가드가 있어야 합니다.

## 8. 예외, 응답, 보안 규약

- 플러그인도 코어와 동일하게 날것의 PHP 에러를 노출하면 안 됩니다.
- 검증 실패는 `ApiException::badRequest()`
- 권한/토글/운영정책 거부는 `ApiException::forbidden()`
- 리소스 부재는 `ApiException::notFound()`
- 라이선스 요구는 코어 `LicenseCheckMiddleware`를 사용합니다.

응답 규칙:

- 샘플/유틸리티 라우트는 단순 JSON 객체 응답 허용
- 비즈니스 API는 가능하면 코어의 envelope 규약과 맞춥니다
- OpenAPI 문서에 실제 응답 구조를 반드시 반영합니다

## 9. 금지 사항

아래는 즉시 수정 대상입니다.

- `get_member()`, `sql_query()`, `sql_fetch()`, `add_event()`
- `common.php` 직접 include
- `$_SESSION`, `$_GLOBALS`, `$GLOBALS` 직접 조작
- 코어 서비스 교체/데코레이터 주입
- 코어 라우트 재정의
- 로컬 절대경로 하드코딩
- 서버 주소, 라이선스 키, 비밀값 하드코딩

## 10. 쓰기 엔드포인트 추가 규칙

쓰기 엔드포인트는 아래 중 하나 이상을 반드시 적용해야 합니다.

1. 관리자 인증
2. 유효한 라이선스 검증
3. 명시적 환경 변수 토글
4. 서명 검증 또는 내부망 제한

샘플 `BoardReward`는 `point.write`를 사용하지만 아래 토글이 없으면 실제 지급을 막습니다.

```env
PLUGIN_BOARD_REWARD_ENABLE_GRANT=1
```

이 패턴은 데모 플러그인의 기본값이어야 합니다.

## 11. 문서 및 테스트 게이트

플러그인 변경 후 아래 명령을 모두 통과해야 합니다.

```bash
composer run analyse
composer run test
composer run test:plugin:isolation
./scripts/docs-check.sh
```

필수 산출물:

- `manifest.json`
- OpenAPI 반영
- 구현 규약 준수 여부 확인
- 통합 테스트 또는 서비스 테스트

## 12. 완료 체크리스트

- [ ] `manifest.json` 필수 필드 작성
- [ ] scope 최소화
- [ ] 명시 팩토리 등록
- [ ] `PluginContext::callable()` 사용
- [ ] 금지 API/글로벌 상태 미사용
- [ ] OpenAPI 반영
- [ ] 테스트 추가
- [ ] `analyse`, `test`, `plugin:isolation`, `docs-check` 통과

## 13. 기준 문서

- 아키텍처 초안: `docs/architecture/G5_INTEGRATION_LAYER_DRAFT.md`
- 실무 가이드: `docs/architecture/PLUGIN_DEVELOPER_GUIDE.md`
- 계약 문서: `api/docs/openapi.yaml`
