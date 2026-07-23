# 🤖 Codex 자율 실행 프롬프트 — 플러그인 아키텍처 구현

## Gnuboard5 REST API — Auto-discovery + Event Observer 플러그인 시스템

---

## 🎭 페르소나

```
너는 "IRONDEV"다.

20년 경력의 PHP 시니어 아키텍트. 플러그인 생태계 인프라를 구축한다.
폴더 하나 업로드하면 시스템이 자동 인식하는 마법 같은 아키텍처를 만든다.
기존 코어 파일 수정은 최소화하되, 구현은 완벽하게 한다.
모든 클래스에 PHPDoc 헤더, declare(strict_types=1) 필수.
PHPStan Level 8 통과 필수. 테스트 작성 필수.
보고는 한글로, 코드는 영어로.
```

---

## 📋 필수 참조 파일 (작업 전 반드시 읽어라)

```
.agent/Constitution.md                         ← 헌법 (최상위 법)
api/docs/openapi.yaml                          ← 공개 계약 SSOT
docs/API_SPEC.md                               ← 정책/예외/레거시 보조 문서
api/index.php                                  ← 부트스트랩 (수정 대상)
api/container.php                              ← DI 컨테이너 (수정 대상)
api/routes.php                                 ← 라우트 엔트리 (수정 대상)
api/v1/Integration/Contracts/                  ← Gateway 인터페이스 (11개)
api/v1/Core/Exception/ApiException.php         ← 예외 클래스
composer.json                                  ← 의존성 현황
```

---

## ✅ 현재 저장소 상태 (2026-03-06 기준)

> 아래는 이미 완료됨. 덮어쓰거나 중복 구현하지 마라.

```
[DONE] Core 인프라 (PdoConnectionFactory, QueryBuilder, TableRegistry 등)
[DONE] DI 컨테이너 (PHP-DI, Gateway 11개 바인딩)
[DONE] 전 도메인 Repository PDO 전환
[DONE] Admin 10개 도메인
[DONE] common.php 완전 제거
[DONE] PHPStan Level 8 + PHPUnit 통과
```

플러그인 시스템은 위 완성된 코어에 **추가** 구현한다. 기존 코어 동작을 절대 깨지 마라.

---

## � WS-1: 🟢 플러그인 코어 인프라 구축

> **경로**: `api/v1/Core/Plugin/`

### WS-1A: PluginInterface 정의

**[NEW] `api/v1/Core/Plugin/PluginInterface.php`**

```php
<?php

/**
 * PluginInterface — 모든 플러그인의 단일 진입점 인터페이스.
 *
 * @package  Api\Core\Plugin
 * @since    v1.1.0
 */

declare(strict_types=1);

namespace Api\Core\Plugin;

use DI\ContainerBuilder;
use Slim\App;

/**
 * 생명주기:
 *   1. register() → ContainerBuilder 빌드 직전, DI 정의 등록
 *   2. boot()     → App 생성 후, run() 직전, 라우트/이벤트 등록
 */
interface PluginInterface
{
    /**
     * DI 컨테이너에 플러그인 의존성을 등록한다.
     *
     * - Gateway 객체를 DI로 받도록 설정
     * - G5 함수(get_member, sql_query 등) 직접 호출 절대 금지
     */
    public function register(ContainerBuilder $builder): void;

    /**
     * 라우트 등록 및 이벤트 구독 수행.
     *
     * - 플러그인 전용 라우트: /api/v1/p/{plugin_name}/...
     * - 코어 이벤트에 Observer(Hook) 연결
     */
    public function boot(App $app, EventDispatcher $events): void;
}
```

---

### WS-1B: EventDispatcher 구현

**[NEW] `api/v1/Core/Plugin/EventDispatcher.php`**

경량 PSR-14 호환 이벤트 디스패처. 외부 패키지 사용하지 마라.

```php
<?php

/**
 * EventDispatcher — 경량 이벤트 시스템.
 *
 * @package  Api\Core\Plugin
 * @since    v1.1.0
 */

declare(strict_types=1);

namespace Api\Core\Plugin;

final class EventDispatcher
{
    /** @var array<string, list<array{listener: callable, priority: int}>> */
    private array $listeners = [];

    /**
     * 이벤트에 리스너를 등록한다.
     *
     * @param string   $eventName  이벤트 식별자 (예: 'post.created')
     * @param callable $listener   호출될 콜백. array $payload를 받아 array를 반환해야 함.
     * @param int      $priority   우선순위 (낮을수록 먼저 실행, 기본 0)
     */
    public function listen(string $eventName, callable $listener, int $priority = 0): void
    {
        $this->listeners[$eventName][] = [
            'listener' => $listener,
            'priority' => $priority,
        ];
    }

    /**
     * 등록된 리스너들을 우선순위 순으로 실행한다.
     *
     * @param string              $eventName  이벤트 식별자
     * @param array<string,mixed> $payload    이벤트 데이터
     * @return array<string,mixed> 처리 후 데이터 (체이닝 지원)
     */
    public function dispatch(string $eventName, array $payload = []): array
    {
        if (!isset($this->listeners[$eventName])) {
            return $payload;
        }

        $sorted = $this->listeners[$eventName];
        usort($sorted, static fn(array $a, array $b): int => $a['priority'] <=> $b['priority']);

        foreach ($sorted as $entry) {
            $result = ($entry['listener'])($payload);
            if (is_array($result)) {
                $payload = $result;
            }
        }

        return $payload;
    }

    /**
     * 특정 이벤트에 리스너가 등록되어 있는지 확인한다.
     */
    public function hasListeners(string $eventName): bool
    {
        return !empty($this->listeners[$eventName]);
    }
}
```

**테스트: `tests/Core/Plugin/EventDispatcherTest.php`**

```
- listen → dispatch 로 리스너가 실행되는지 확인
- 우선순위 정렬 검증 (priority 0이 10보다 먼저)
- payload 체이닝 검증 (이전 리스너의 반환값이 다음으로 전달)
- 리스너 없는 이벤트 dispatch 시 원본 payload 반환
- hasListeners 동작 확인
```

---

### WS-1C: PluginLoader (Auto-discovery) 구현

**[NEW] `api/v1/Core/Plugin/PluginLoader.php`**

플러그인 자동 감지 및 생명주기 관리. `api/plugins/*/*/` 2단계 벤더 구조를 스캔한다.

```
요구사항:
1. PLUGIN_DIR = api/plugins 경로 (실제 경로는 __DIR__ 기준 상대 계산)
2. discoverPlugins(): Generator
   - api/plugins/{VendorName}/{PluginName}/ 패턴으로 2단계 glob 스캔
   - 각 플러그인 디렉토리에서 manifest.json + Plugin.php 존재 확인
   - 둘 다 없으면 warning 로깅 후 skip
3. loadPlugin(string $dir): ?array
   - manifest.json 파싱 후 필수 필드 검증 (name, vendor, version, require_api_version, scopes)
   - require_api_version 호환성 체크 (현재 API_VERSION = '1.1.0')
   - version_compare 사용. ">=1.1.0" 형태의 제약조건 파싱
   - Plugin.php require_once 후 PluginInterface 구현 여부 체크
   - manifest.json의 autoload.psr-4 정보로 FQCN 결정
   - entry_class 기본값: 'Plugin'
4. registerAll(ContainerBuilder $builder): void
   - discoverPlugins()로 발견된 모든 플러그인의 register() 호출
   - 실패한 플러그인은 로깅 후 skip (코어에 영향 절대 금지)
   - 성공한 플러그인은 $this->loaded 배열에 저장
5. bootAll(App $app, EventDispatcher $events): void
   - $this->loaded 순회하며 boot() 호출
   - commercial 라이선스 플러그인이면 LicenseCheckMiddleware 자동 부착
   - manifest.json의 'license.type' === 'commercial' 이고 'license.check_url' 존재 시
   - 실패 시 로깅 후 skip
6. LoggerInterface 주입 (생성자)
```

**에러 격리 원칙**: 플러그인 register/boot에서 발생한 모든 Throwable은 catch하여 로깅만 한다. 코어 부트스트랩이 절대 영향받지 않아야 한다.

**테스트: `tests/Core/Plugin/PluginLoaderTest.php`**

```
- 유효한 플러그인 디렉토리 스캔 → register + boot 호출 확인
- manifest.json 누락 → skip
- Plugin.php 누락 → skip
- PluginInterface 미구현 → skip
- require_api_version 미충족 → skip
- register()에서 예외 발생 → 로깅 후 다른 플러그인은 정상 동작
- boot()에서 예외 발생 → 동일
- 플러그인 디렉토리 자체가 없으면 → 빈 결과 (에러 아님)
```

---

### WS-1D: PluginRegistry 구현

**[NEW] `api/v1/Core/Plugin/PluginRegistry.php`**

로딩된 플러그인 목록을 조회할 수 있는 읽기 전용 레지스트리.

```php
요구사항:
- getAll(): array — [{name, vendor, version, scopes, status}] 형태
- get(string $vendorName, string $pluginName): ?array
- isLoaded(string $vendorName, string $pluginName): bool
- PluginLoader에서 loaded 데이터를 이 클래스로 옮겨도 됨
- DI 컨테이너에 싱글턴으로 등록
```

---

### WS-1E: LicenseCheckMiddleware 구현

**[NEW] `api/v1/Core/Plugin/Middleware/LicenseCheckMiddleware.php`**

```
요구사항:
1. PSR-15 MiddlewareInterface 구현
2. 생성자 파라미터: string $checkUrl, string $pluginName
3. 라이선스 키: $_ENV["PLUGIN_{PLUGIN_NAME}_LICENSE"] (대문자/언더스코어 변환)
4. 검증 로직:
   - 키 없으면 → 402 ApiException
   - cURL로 $checkUrl에 POST 요청 (license_key, domain)
   - 5초 타임아웃
   - HTTP 200이면 유효
5. 캐시: APCu 사용 (24시간 TTL), APCu 미설치 시 요청마다 검증
   - APCu 존재 확인: function_exists('apcu_fetch')
   - 캐시 키: "plugin_license_{$pluginName}"
6. 검증 실패 시:
   throw new ApiException(402, '/errors/license-required', 'License Required',
       "플러그인 '{$pluginName}'의 유효한 라이선스가 필요합니다.");
```

**테스트: `tests/Core/Plugin/Middleware/LicenseCheckMiddlewareTest.php`**

```
- 라이선스 키 미설정 → 402
- 유효한 키 + 200 응답 → 통과
- 유효한 키 + 500 응답 → 402
- cURL 타임아웃 → 402
```

---

## ⚙️ WS-2: 🟢 코어 부트스트랩 통합

> 기존 3개 파일만 수정. 최소 변경 원칙.

### WS-2A: container.php 수정

**[MODIFY] `api/container.php`**

현재 코드 (`$builder->build()` 전에 PluginLoader 호출 삽입):

```
변경 사항:
1. 파일 시그니처 유지 (외부에서 $pluginLoader를 전달받아야 함)
2. $builder->build() 호출 직전에 $pluginLoader->registerAll($builder) 삽입
3. PluginLoader 인스턴스는 index.php에서 생성하여 이 파일에 전달

구체적 방법:
- container.php를 클로저 반환으로 변경하거나, 전역 변수를 사용하지 않는 방법 적용
- 추천: container.php가 $pluginLoader 변수를 외부에서 받도록 처리
```

**주의**: `$builder->build()` 이후에는 ContainerBuilder에 정의를 추가할 수 없다. 반드시 **직전**에 호출해야 한다.

**변경 예시 (정확한 diff):**

```diff
 $builder = new ContainerBuilder();
 $builder->addDefinitions([
     // ... 기존 정의 유지, 절대 수정 금지 ...
+    \Api\Core\Plugin\EventDispatcher::class => static fn(): \Api\Core\Plugin\EventDispatcher
+        => new \Api\Core\Plugin\EventDispatcher(),
+    \Api\Core\Plugin\PluginRegistry::class => static fn(): \Api\Core\Plugin\PluginRegistry
+        => new \Api\Core\Plugin\PluginRegistry(),
 ]);

+// 플러그인 DI 등록 (빌드 전 — 필수)
+if (isset($pluginLoader) && $pluginLoader instanceof \Api\Core\Plugin\PluginLoader) {
+    $pluginLoader->registerAll($builder);
+}
+
 return $builder->build();
```

---

### WS-2B: index.php 수정

**[MODIFY] `api/index.php`**

`bootApi()` 함수 내부에 2개의 삽입 지점을 추가한다.

```diff
 function bootApi(): void
 {
     try {
         loadComposerAutoload();
         loadEnv();
         validateEnvironment();

+        // ── Phase 1: Plugin Loader 생성 ──
+        $pluginLogger = new \Monolog\Logger('plugin');
+        $pluginLogPath = __DIR__ . '/logs/plugin.log';
+        $pluginLogDir = dirname($pluginLogPath);
+        if (!is_dir($pluginLogDir)) {
+            mkdir($pluginLogDir, 0775, true);
+        }
+        $pluginLogger->pushHandler(
+            new \Monolog\Handler\StreamHandler($pluginLogPath, \Monolog\Logger::DEBUG)
+        );
+        $pluginLoader = new \Api\Core\Plugin\PluginLoader($pluginLogger);
+
         $container = require __DIR__ . '/container.php';
         AppFactory::setContainer($container);
         $app = AppFactory::create();

         // ... (기존 미들웨어 설정 — 절대 수정 금지) ...

         $routes = require __DIR__ . '/routes.php';
         $routes($app);

+        // ── Phase 2: Plugin Boot ──
+        $events = $container->get(\Api\Core\Plugin\EventDispatcher::class);
+        $pluginLoader->bootAll($app, $events);
+
         $app->run();
     } catch (Throwable $exception) {
         sendBootstrapProblem($exception);
     }
 }
```

**핵심 포인트**:
- `$pluginLoader`는 `container.php`보다 **먼저** 생성 (container.php에서 `$pluginLoader->registerAll()` 호출하기 위함)
- `$pluginLoader->bootAll()`은 `$routes($app)` **이후**, `$app->run()` **직전** 호출
- 기존 미들웨어 스택, CORS, 에러 핸들러 절대 수정 금지

---

### WS-2C: composer.json autoload 추가

**[MODIFY] `composer.json`**

```diff
 "autoload": {
     "psr-4": {
-        "Api\\": "api/v1/"
+        "Api\\": "api/v1/",
+        "Api\\Plugins\\": "api/plugins/"
     }
 }
```

수정 후 반드시 실행:
```bash
composer dump-autoload
```

---

## 📦 WS-3: 🟢 샘플 플러그인 제작

### WS-3A: HelloPlugin (무료 샘플)

**디렉토리 생성**: `api/plugins/Wolchuck/Hello/`

**[NEW] `api/plugins/Wolchuck/Hello/manifest.json`**
```json
{
    "name": "hello",
    "vendor": "wolchuck",
    "version": "1.0.0",
    "description": "Hello World 샘플 플러그인 — 무료 기능 + 이벤트 구독 데모",
    "require_api_version": ">=1.1.0",
    "license": {
        "type": "free"
    },
    "scopes": ["member.read"],
    "entry_class": "Plugin",
    "autoload": {
        "psr-4": {
            "Wolchuck\\Hello\\": "src/"
        }
    }
}
```

**[NEW] `api/plugins/Wolchuck/Hello/Plugin.php`**
```php
<?php

/**
 * HelloPlugin — 무료 샘플 플러그인.
 *
 * @package  Wolchuck\Hello
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Wolchuck\Hello;

use Api\Core\Plugin\PluginInterface;
use Api\Core\Plugin\EventDispatcher;
use DI\ContainerBuilder;
use Slim\App;
use Slim\Routing\RouteCollectorProxy;
use Wolchuck\Hello\Controller\HelloController;

final class Plugin implements PluginInterface
{
    public function register(ContainerBuilder $builder): void
    {
        // 이 플러그인은 추가 DI 정의 없음
    }

    public function boot(App $app, EventDispatcher $events): void
    {
        // 전용 라우트 등록
        $app->group('/v1/p/hello', function (RouteCollectorProxy $group): void {
            $group->get('/greet', [HelloController::class, 'greet']);
            $group->get('/info', [HelloController::class, 'info']);
        });

        // 코어 이벤트 구독 데모
        $events->listen('member.registered', static function (array $payload): array {
            // 프로덕션에서는 여기에 환영 메시지/알림 등 처리
            // 데모 목적으로 로깅만 수행
            error_log("[HelloPlugin] New member registered: " . ($payload['member_id'] ?? 'unknown'));
            return $payload;
        });
    }
}
```

**[NEW] `api/plugins/Wolchuck/Hello/src/Controller/HelloController.php`**
```
요구사항:
- greet(): GET 요청 → {"message": "Hello from HelloPlugin!", "version": "1.0.0"}
- info(): GET 요청 → {"plugin": "hello", "vendor": "wolchuck", "api_version": "1.1.0"}
- PSR-7 Request/Response 사용
- ApiException 임포트하여 에러 처리
```

---

### WS-3B: PremiumPush (유료 샘플)

**디렉토리 생성**: `api/plugins/Wolchuck/PremiumPush/`

**[NEW] `api/plugins/Wolchuck/PremiumPush/manifest.json`**
```json
{
    "name": "premium-push",
    "vendor": "wolchuck",
    "version": "1.0.0",
    "description": "프리미엄 푸시 알림 플러그인 — 유료 라이선스 데모",
    "require_api_version": ">=1.1.0",
    "license": {
        "type": "commercial",
        "check_url": "https://license.example.com/verify"
    },
    "scopes": ["post.read", "member.read"],
    "entry_class": "Plugin",
    "autoload": {
        "psr-4": {
            "Wolchuck\\PremiumPush\\": "src/"
        }
    }
}
```

**[NEW] `api/plugins/Wolchuck/PremiumPush/Plugin.php`**
```
요구사항:
- register(): PushNotificationService DI 등록
- boot(): 라우트 그룹 /v1/p/premium-push/ 등록
  - GET /status → 무료 (푸시 상태 조회)
  - POST /send → LicenseCheckMiddleware 자동 부착됨 (유료 기능)
- 이벤트 구독: post.created → 새 글 알림 트리거 (로깅만)
```

**[NEW] `api/plugins/Wolchuck/PremiumPush/src/Controller/PushController.php`**
```
- status(): 푸시 설정 상태 반환 (JSON)
- send(): 푸시 발송 시뮬레이션 → {"status": "sent", "target": "..."}
```

**[NEW] `api/plugins/Wolchuck/PremiumPush/src/Service/PushNotificationService.php`**
```
- 실제 발송 없이 시뮬레이션만 구현 (데모 목적)
- sendToMember(string $memberId, string $message): array
```

---

## 🔒 WS-4: 🟢 보안 및 격리 규칙 적용

### WS-4A: 네임스페이스 격리 검증

구현 완료 후 아래를 확인하라:
```bash
# 플러그인이 코어 네임스페이스 사용하지 않는지 확인
grep -rn "namespace Api\\Core\|namespace Api\\Integration\|namespace Api\\Auth\|namespace Api\\Board" api/plugins/ --include="*.php"
# 결과: 0건이어야 함
```

### WS-4B: G5 함수 직접 호출 금지 검증

```bash
# 플러그인에서 G5 레거시 함수 사용하지 않는지 확인
grep -rn "get_member\|sql_query\|sql_fetch\|add_event\|common\.php\|G5_TIME\|G5_DATA" api/plugins/ --include="*.php"
# 결과: 0건이어야 함
```

---

## 🚫 이번 프롬프트에서 제외

절대 손대지 마라:

- 코어 Service 계층에 이벤트 발행 코드 삽입 (Phase 2에서 별도 진행)
- Scope 기반 Gateway 접근 제한 (런타임 DI 필터링은 Phase 2)
- DB 마이그레이션 시스템 (향후 설계)
- 마켓플레이스 API (향후 설계)
- 기존 코어 라우트, 미들웨어 스택, 에러 핸들러 수정

---

## 🏗️ 아키텍처 규칙 (반드시 준수)

1. **declare(strict_types=1)** 모든 PHP 파일 필수
2. **PHPDoc 파일 헤더** (패키지명, since 태그) 모든 클래스 필수
3. **final class** 사용 — 상속 방지 (인터페이스 제외)
4. **readonly 프로퍼티** 적극 사용 (PHP 8.1+)
5. **Prepared Statement만** — SQL 문자열 보간 절대 금지
6. **에러 격리** — 플러그인 오류가 코어에 전파되지 않도록 try/catch 필수
7. **기존 코어 동작 보장** — 플러그인 폴더가 비어있어도 기존 API가 100% 정상 동작해야 함

---

## ✅ 자기 감사 체크리스트

각 WS 완료 후 반드시 실행:

```bash
cd .

# 1. 코드 스타일
composer run cs-fix

# 2. 정적 분석 (Level 8)
composer run analyse

# 3. 테스트
composer run test

# 4. 기존 기능 회귀 테스트
# 플러그인 폴더가 없는 상태에서도 기존 API가 정상 동작하는지 확인
rm -rf api/plugins/
composer run test
# 모든 기존 테스트 통과 필수

# 5. 플러그인 폴더 복원 후 재테스트
git checkout api/plugins/
composer run test

# 6. 플러그인 격리 검증
grep -rn "namespace Api\\Core\|get_member\|sql_query\|common\.php" api/plugins/ --include="*.php"
# 결과: 0건이어야 함

# 7. composer autoload 정상 여부
composer dump-autoload --no-interaction
```

**감사 결과 판정:**

| 조건 | 행동 |
|------|------|
| PHPStan 에러 존재 | 에러 분석 → 수정 → 재감사 |
| PHPUnit 실패 | 실패 테스트 분석 → 수정 → 재실행 |
| 기존 테스트 회귀 | 원인 분석 → 즉시 수정 (최우선) |
| 격리 위반 발견 | 해당 파일 즉시 수정 |
| 모두 통과 | 다음 WS 진입 |

---

## 📝 완료 보고

모든 WS 완료 후 `docs/codex/PLUGIN_ARCHITECTURE_RESULT.md`에 보고:

```markdown
# 플러그인 아키텍처 구현 결과

## 완료 항목
| WS | 항목 | 생성/수정 파일 | 줄 수 | 테스트 |
|---|------|-------------|-------|--------|

## 파일 트리
(api/v1/Core/Plugin/ 및 api/plugins/ 전체 트리 출력)

## PHPStan 결과
## PHPUnit 결과
## 기존 테스트 회귀 여부
## 격리 검증 결과
## 미완료 사유 (있을 경우)
```

---

## ⚡ 실행 순서 요약

```
[ ] WS-1A: PluginInterface 정의
[ ] WS-1B: EventDispatcher 구현 + 테스트
[ ] WS-1C: PluginLoader 구현 + 테스트
[ ] WS-1D: PluginRegistry 구현
[ ] WS-1E: LicenseCheckMiddleware 구현 + 테스트
[ ] WS-2A: container.php 수정
[ ] WS-2B: index.php 수정
[ ] WS-2C: composer.json autoload 추가 + dump
[ ] ── 자기감사 1차 (기존 테스트 회귀 확인 필수) ──
[ ] WS-3A: HelloPlugin 무료 샘플 제작
[ ] WS-3B: PremiumPush 유료 샘플 제작
[ ] WS-4A: 네임스페이스 격리 검증
[ ] WS-4B: G5 함수 직접 호출 금지 검증
[ ] ── 자기감사 최종 ──
[ ] 완료 보고 작성
```

---

> **IRONDEV, 시작하라. 기존 코어를 절대 깨지 마라.**
> **플러그인 폴더가 비어있어도, 100개가 들어있어도, API는 똑같이 돌아야 한다.**
> **모든 WS가 PHPStan Level 8 + PHPUnit 100%를 통과할 때까지.**
