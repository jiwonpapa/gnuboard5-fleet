<?php

/**
 * index API module.
 *
 * @package  Gnuboard5\Api
 * @since    v1.0.0
 */

declare(strict_types=1);

use Api\Core\Middleware\ErrorMiddleware;
use Api\Core\Config\EnvConfig;
use Api\Core\Config\RuntimeProfileResolver;
use Api\Core\Middleware\RateLimitMiddleware;
use Api\Core\Config\EnvLoader;
use Api\Core\Error\ProblemDetailsHelper;
use Api\Core\Plugin\EventDispatcher;
use Api\Core\Plugin\PluginDiscoveryService;
use Api\Core\Plugin\PluginLoader;
use Api\Core\Plugin\PluginRegistry;
use Api\Core\Plugin\PluginScopePolicy;
use Api\Middlewares\CorsMiddleware;
use Api\Middlewares\RequestContextMiddleware;
use Api\Middlewares\ResponseTraceMiddleware;
use Api\Support\Http\TraceContext;
use Api\Support\Logging\ApiLoggerFactory;
use Api\Support\Logging\ErrorContextBuilder;
use Slim\Factory\AppFactory;

error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('display_startup_errors', '0');

bootApi();

function bootApi(): void
{
    try {
        loadComposerAutoload();
        loadEnv();
        validateEnvironment();
        $runtimeProfile = RuntimeProfileResolver::resolve();

        $pluginRegistry = new PluginRegistry();
        $pluginEvents = new EventDispatcher();
        $pluginLogger = buildPluginLogger();
        $pluginScopePolicy = new PluginScopePolicy();
        $pluginLoader = new PluginLoader(
            $pluginLogger,
            $pluginRegistry,
            __DIR__ . '/plugins',
            $pluginScopePolicy,
            new PluginDiscoveryService($pluginLogger, $pluginScopePolicy, PluginLoader::API_VERSION),
            null
        );
        $container = require __DIR__ . '/container.php';
        AppFactory::setContainer($container);
        $app = AppFactory::create();

        $corsAllowed = resolveCorsAllowedOrigins();

        $app->addBodyParsingMiddleware();
        $app->add(new RequestContextMiddleware());
        $app->add(new RateLimitMiddleware());
        $app->add(new CorsMiddleware($corsAllowed));

        $displayErrorDetails = $runtimeProfile->displayErrorDetails;
        $errorMiddleware = $app->addErrorMiddleware($displayErrorDetails, true, true);
        $errorMiddleware->setErrorHandler(
            Throwable::class,
            new ErrorMiddleware(
                $app->getResponseFactory(),
                ErrorMiddleware::defaultLogger(dirname(__DIR__) . '/api/logs/error.log'),
                $runtimeProfile
            ),
            true
        );
        $app->add(new ResponseTraceMiddleware(
            ApiLoggerFactory::create('api-access', __DIR__ . '/logs/access.log', ApiLoggerFactory::envLevel('info'))
        ));

        $app->setBasePath('/api');

        $routes = require __DIR__ . '/routes.php';
        $routes($app);

        $pluginLoader->bootAll($app, $container->get(EventDispatcher::class));

        $app->run();
    } catch (Throwable $exception) {
        sendBootstrapProblem($exception);
    }
}

function buildPluginLogger(): \Psr\Log\LoggerInterface
{
    return ApiLoggerFactory::create('plugin', __DIR__ . '/logs/plugin.log');
}

function loadComposerAutoload(): void
{
    $autoloadCandidates = [
        dirname(__DIR__) . '/vendor/autoload.php',
        __DIR__ . '/vendor/autoload.php',
    ];

    foreach ($autoloadCandidates as $candidate) {
        if (is_file($candidate)) {
            require $candidate;

            return;
        }
    }

    throw new RuntimeException('Composer autoload not found. Deploy root vendor or api/vendor.');
}

function loadEnv(): void
{
    EnvLoader::load(EnvLoader::resolvePath(dirname(__DIR__)));
}

function bootstrapEnvRaw(string $key): string
{
    $value = $_ENV[$key] ?? getenv($key);
    if ($value === false) {
        return '';
    }

    return trim((string)$value);
}

function bootstrapEnvString(string $key, string $default = ''): string
{
    $value = bootstrapEnvRaw($key);

    return $value === '' ? $default : $value;
}

function validateEnvironment(): void
{
    $appEnv = bootstrapEnvString('APP_ENV', '');
    if (!in_array($appEnv, ['local', 'staging', 'production'], true)) {
        throw new RuntimeException('APP_ENV는 local, staging, production만 허용됩니다.');
    }

    $runtimeMode = bootstrapEnvString('APP_RUNTIME_MODE', '');
    if ($runtimeMode !== '' && !in_array(strtolower($runtimeMode), ['dev', 'prod', 'product'], true)) {
        throw new RuntimeException('APP_RUNTIME_MODE는 dev, prod만 허용됩니다.');
    }

    $jwtSecret = bootstrapEnvString('JWT_SECRET', '');
    if ($jwtSecret === '') {
        throw new RuntimeException('JWT_SECRET가 설정되지 않았습니다.');
    }

    $requiredEnv = ['DB_HOST', 'DB_NAME', 'DB_USER', 'G5_ENCRYPT_FUNC'];
    foreach ($requiredEnv as $key) {
        if (bootstrapEnvString($key, '') === '') {
            throw new RuntimeException($key . ' is required.');
        }
    }

    $encryptFunc = bootstrapEnvString('G5_ENCRYPT_FUNC', '');
    if (!EnvConfig::isSupportedEncryptFunc($encryptFunc)) {
        throw new RuntimeException(
            'G5_ENCRYPT_FUNC는 원본 G5와 동일한 create_hash 또는 sql_password만 허용됩니다.'
        );
    }

    if (bootstrapEnvString('DB_PORT', '') === '') {
        $_ENV['DB_PORT'] = '3306';
    }
    if (bootstrapEnvString('DB_CHARSET', '') === '') {
        $_ENV['DB_CHARSET'] = 'utf8mb4';
    }

    if (bootstrapEnvString('CORS_ALLOWED_ORIGINS', '') === '') {
        $_ENV['CORS_ALLOWED_ORIGINS'] = '*';
    }

    if (!is_numeric(bootstrapEnvString('JWT_ACCESS_EXPIRES', ''))) {
        $_ENV['JWT_ACCESS_EXPIRES'] = '3600';
    }
    if (!is_numeric(bootstrapEnvString('JWT_REFRESH_EXPIRES', ''))) {
        $_ENV['JWT_REFRESH_EXPIRES'] = '604800';
    }

    if ($appEnv === 'production' && in_array('*', resolveCorsAllowedOrigins(), true)) {
        throw new RuntimeException('production 환경에서는 Access-Control-Allow-Origin "*" 사용이 금지됩니다.');
    }
}

/**
 * @return array<int, string>
 */
function resolveCorsAllowedOrigins(): array
{
    $rawOrigins = bootstrapEnvString('CORS_ALLOWED_ORIGINS', '*');

    return array_values(
        array_filter(
            array_map('trim', explode(',', $rawOrigins)),
            static fn (string $origin): bool => $origin !== ''
        )
    );
}

function sendBootstrapProblem(Throwable $exception): void
{
    if (headers_sent()) {
        return;
    }

    $runtimeProfile = class_exists(RuntimeProfileResolver::class)
        ? RuntimeProfileResolver::resolve()
        : null;
    $detail = $runtimeProfile?->isDev() === true ? $exception->getMessage() : '서버 내부 오류가 발생했습니다.';

    $type = '/errors/bootstrap';
    $status = 500;
    $title = 'Bootstrap Error';

    if (class_exists(\Api\Core\Exception\ApiException::class, false) && $exception instanceof \Api\Core\Exception\ApiException) {
        $status = $exception->status;
        $title = $exception->title;
        $type = $exception->type->value;
        $detail = ($runtimeProfile?->isDev() === true || $status < 500)
            ? $exception->getMessage()
            : ($status === 503 ? '서비스를 일시적으로 사용할 수 없습니다.' : '서버 내부 오류가 발생했습니다.');
    } elseif (class_exists(\Api\Support\Exception\ApiException::class, false) && $exception instanceof \Api\Support\Exception\ApiException) {
        $status = $exception->statusCode;
        $title = $exception->title;
        $type = $exception->type->value;
        $detail = ($runtimeProfile?->isDev() === true || $status < 500)
            ? $exception->getMessage()
            : ($status === 503 ? '서비스를 일시적으로 사용할 수 없습니다.' : '서버 내부 오류가 발생했습니다.');
    }

    if ($type === '/errors/bootstrap' && $exception instanceof RuntimeException) {
        $status = 503;
        if ($runtimeProfile?->isDev() !== true) {
            $detail = '서비스를 일시적으로 사용할 수 없습니다.';
        }
    }

    $correlationId = class_exists(TraceContext::class)
        ? TraceContext::resolveCorrelationIdFromGlobals()
        : trim((string)($_SERVER['HTTP_X_REQUEST_ID'] ?? ''));
    $serverRequestId = class_exists(TraceContext::class)
        ? TraceContext::generateServerRequestId()
        : bin2hex(random_bytes(16));
    if (class_exists(ProblemDetailsHelper::class)) {
        $classification = ProblemDetailsHelper::classify($exception, $status, $type);
        $meta = ProblemDetailsHelper::buildMeta(
            $correlationId,
            $serverRequestId,
            $classification
        );
        $guide = $classification['guide'];
    } else {
        $correlationId = trim($correlationId) !== '' ? trim($correlationId) : bin2hex(random_bytes(8));
        $classification = [
            'error_code' => 'server.bootstrap_error',
            'error_category' => 'bootstrap',
            'fault_domain' => 'server_bootstrap',
            'owner' => 'php_api',
            'retryable' => false,
            'user_actionable' => false,
        ];
        $meta = [
            'server_time' => gmdate(DATE_ATOM),
            'version' => '1.0.0',
            'request_id' => $correlationId,
            'correlation_id' => $correlationId,
            'server_request_id' => $serverRequestId,
            'error_code' => $classification['error_code'],
            'error_category' => $classification['error_category'],
            'fault_domain' => $classification['fault_domain'],
            'owner' => $classification['owner'],
            'retryable' => $classification['retryable'],
            'user_actionable' => $classification['user_actionable'],
        ];
        $guide = [
            'reason' => '서버 초기화 또는 설정 단계에서 오류가 발생했습니다.',
            'action' => 'request_id를 기준으로 배포 상태와 환경설정을 서버 로그에서 확인하세요.',
        ];
    }

    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('X-Correlation-Id: ' . $correlationId);
    header('X-Request-Id: ' . $correlationId);
    header('X-Server-Request-Id: ' . $serverRequestId);

    $payload = [
        'type' => $type,
        'status' => $status,
        'title' => $title,
        'detail' => $detail,
        'error_code' => $classification['error_code'],
        'error_category' => $classification['error_category'],
        'fault_domain' => $classification['fault_domain'],
        'owner' => $classification['owner'],
        'retryable' => $classification['retryable'],
        'user_actionable' => $classification['user_actionable'],
        'request_id' => $correlationId,
        'correlation_id' => $correlationId,
        'server_request_id' => $serverRequestId,
        'meta' => $meta,
    ];
    $payload['meta']['runtime_mode'] = $runtimeProfile?->mode->value ?? 'prod';

    if (isset($_SERVER['REQUEST_URI'])) {
        $payload['instance'] = (string)$_SERVER['REQUEST_URI'];
    }

    if (is_array($guide) && $guide !== []) {
        $payload['guide'] = $guide;
    }

    if ($runtimeProfile?->isDev() === true && class_exists(ErrorContextBuilder::class)) {
        $payload['debug'] = ErrorContextBuilder::debugPayloadFromGlobals(
            $exception,
            $correlationId,
            $runtimeProfile->logRequestPayload,
            $runtimeProfile->includeTraceInResponse,
            $runtimeProfile->traceLimit
        );
    }

    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

    $bootstrapLogPayload = [
        'timestamp' => gmdate(DATE_ATOM),
        'component' => 'api-bootstrap',
        'request_id' => $correlationId,
        'correlation_id' => $correlationId,
        'server_request_id' => $serverRequestId,
        'error_code' => $classification['error_code'],
        'error_category' => $classification['error_category'],
        'fault_domain' => $classification['fault_domain'],
        'owner' => $classification['owner'],
        'retryable' => $classification['retryable'],
        'user_actionable' => $classification['user_actionable'],
        'runtime_mode' => $runtimeProfile?->mode->value ?? 'prod',
    ];

    if (class_exists(ErrorContextBuilder::class)) {
        $bootstrapLogPayload = array_merge(
            $bootstrapLogPayload,
            ErrorContextBuilder::fromServerGlobals(
                $exception,
                $correlationId,
                $runtimeProfile?->logRequestPayload ?? true,
                $runtimeProfile?->traceLimit ?? 8
            )
        );
    } else {
        $bootstrapLogPayload['exception'] = [
            'type' => $exception::class,
            'message' => $exception->getMessage(),
            'file' => $exception->getFile(),
            'line' => $exception->getLine(),
            'trace' => $exception->getTrace(),
        ];
    }

    try {
        if (class_exists(ApiLoggerFactory::class)) {
            ApiLoggerFactory::create('api-bootstrap', __DIR__ . '/logs/error.log', ApiLoggerFactory::envLevel('error'))
                ->error('bootstrap_error', $bootstrapLogPayload);
            return;
        }
    } catch (Throwable) {
        // Fall through to append-only fallback when bootstrap logger cannot initialize.
    }

    @file_put_contents(
        __DIR__ . '/logs/error.log',
        (string)json_encode($bootstrapLogPayload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . PHP_EOL,
        FILE_APPEND | LOCK_EX
    );
}
