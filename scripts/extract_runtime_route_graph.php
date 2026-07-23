<?php

/**
 * DB 요청 없이 실제 Slim RouteCollector를 부팅해 route/handler/middleware 증적을 생성합니다.
 *
 * @package  Gnuboard5\Audit
 * @since    v1.1.0
 */

declare(strict_types=1);

use Api\Admin\Dev\Middleware\AdminSchemaInspectMiddleware;
use Api\Admin\Dev\Support\AdminSchemaInspectSecretGuard;
use Api\Core\Config\EnvConfig;
use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;
use Api\Core\Middleware\AdminGuardMiddleware;
use Api\Core\Plugin\EventDispatcher;
use Api\Core\Plugin\PluginDiscoveryService;
use Api\Core\Plugin\PluginLoader;
use Api\Core\Plugin\PluginRegistry;
use Api\Core\Plugin\PluginScopePolicy;
use Api\Integration\Contracts\AuthIdentityGateway;
use Api\Integration\Contracts\AuthSessionGateway;
use Api\Middlewares\JwtAuthMiddleware;
use Api\Middlewares\OptionalJwtAuthMiddleware;
use Api\Security\JwtService;
use DI\Container;
use DI\ContainerBuilder;
use Gnuboard5\Audit\Phase1ConsumerScope;
use Psr\Log\LoggerInterface;
use Psr\Log\NullLogger;
use Slim\App;
use Slim\Factory\AppFactory;
use Slim\Interfaces\RouteInterface;
use Symfony\Component\Yaml\Yaml;

require dirname(__DIR__) . '/vendor/autoload.php';
require __DIR__ . '/lib/Phase1ConsumerScope.php';

final class RuntimeAuditIdentityGateway implements AuthIdentityGateway
{
    public function findMemberById(string $memberId): ?array
    {
        unset($memberId);
        return null;
    }

    public function findMemberByEmail(string $email): ?array
    {
        unset($email);
        return null;
    }

    public function countMembersByEmail(string $email): int
    {
        unset($email);
        return 0;
    }

    public function isRecommendationEnabled(): bool
    {
        return false;
    }

    public function isMemberActive(string $memberId): bool
    {
        unset($memberId);
        return false;
    }

    public function verifyPassword(array $member, string $password): bool
    {
        unset($member, $password);
        return false;
    }

    public function isEmailCertificationRequiredAndMissing(array $member): bool
    {
        unset($member);
        return false;
    }
}

final class RuntimeAuditSessionGateway implements AuthSessionGateway
{
    public function isLoginBlocked(string $memberId, string $ipAddress, int $maxAttempts, int $windowSeconds): bool
    {
        unset($memberId, $ipAddress, $maxAttempts, $windowSeconds);
        return false;
    }

    public function registerFailedLoginAttempt(string $memberId, string $ipAddress): void
    {
        unset($memberId, $ipAddress);
    }

    public function clearFailedLoginAttempts(string $memberId, string $ipAddress): void
    {
        unset($memberId, $ipAddress);
    }

    public function updateTodayLogin(string $memberId, string $ipAddress): void
    {
        unset($memberId, $ipAddress);
    }

    public function revokeToken(string $memberId, string $jti, string $tokenType, int $expiresAt): void
    {
        unset($memberId, $jti, $tokenType, $expiresAt);
    }

    public function isTokenRevoked(string $jti, string $tokenType): bool
    {
        unset($jti, $tokenType);
        return false;
    }

    public function rehashPasswordIfNeeded(array $member, string $plainPassword): void
    {
        unset($member, $plainPassword);
    }
}

/** @return array{output: ?string, compare: bool, openapi: string, consumer_scope: string} */
function parseRuntimeAuditArgs(array $argv): array
{
    $output = null;
    $compare = true;
    $openapi = dirname(__DIR__) . '/api/docs/openapi.yaml';
    $consumerScope = dirname(__DIR__) . '/api/docs/openapi.phase1-consumer-scope.json';
    for ($index = 1; $index < count($argv); $index++) {
        $argument = $argv[$index];
        if ($argument === '--no-compare') {
            $compare = false;
            continue;
        }
        if ($argument === '--output' || $argument === '--openapi' || $argument === '--consumer-scope') {
            $value = $argv[++$index] ?? '';
            if ($value === '') {
                throw new InvalidArgumentException(sprintf('%s 값이 필요합니다.', $argument));
            }
            if ($argument === '--output') {
                $output = $value;
            } elseif ($argument === '--consumer-scope') {
                $consumerScope = $value;
            } else {
                $openapi = $value;
            }
            continue;
        }
        throw new InvalidArgumentException('지원하지 않는 인자입니다: ' . $argument);
    }

    return [
        'output' => $output,
        'compare' => $compare,
        'openapi' => $openapi,
        'consumer_scope' => $consumerScope,
    ];
}

/** @return array{Container, PluginLoader} */
function buildRuntimeAuditContainer(): array
{
    $_ENV['G5_ENCRYPT_FUNC'] = 'create_hash';
    $_ENV['JWT_SECRET'] = 'runtime-route-audit-secret-0123456789abcdef';
    $_ENV['ADMIN_SMS_ENABLED'] = 'true';
    $_ENV['ADMIN_SCHEMA_INSPECT_SECRET'] = 'runtime-route-audit';
    $_ENV['DB_HOST'] = '127.0.0.1';
    $_ENV['DB_PORT'] = '3306';
    $_ENV['DB_NAME'] = 'runtime_route_audit';
    $_ENV['DB_USER'] = 'runtime_route_audit';
    $_ENV['DB_PASS'] = 'runtime_route_audit';

    $logger = new NullLogger();
    $identityGateway = new RuntimeAuditIdentityGateway();
    $sessionGateway = new RuntimeAuditSessionGateway();
    $jwtService = new JwtService($_ENV['JWT_SECRET'], 3600, 604800);
    $envConfig = EnvConfig::fromEnv();

    $registry = new PluginRegistry();
    $scopePolicy = new PluginScopePolicy();
    $pluginLoader = new PluginLoader(
        $logger,
        $registry,
        dirname(__DIR__) . '/api/plugins',
        $scopePolicy,
        new PluginDiscoveryService($logger, $scopePolicy, PluginLoader::API_VERSION)
    );

    $builder = new ContainerBuilder();
    $builder->addDefinitions([
        LoggerInterface::class => $logger,
        EnvConfig::class => $envConfig,
        JwtAuthMiddleware::class => new JwtAuthMiddleware($jwtService, $identityGateway, $sessionGateway),
        OptionalJwtAuthMiddleware::class => new OptionalJwtAuthMiddleware($jwtService, $identityGateway, $sessionGateway),
        AdminGuardMiddleware::class => new AdminGuardMiddleware(new QueryBuilder(), new TableRegistry('g5_')),
        AdminSchemaInspectMiddleware::class => new AdminSchemaInspectMiddleware(
            $envConfig,
            new AdminSchemaInspectSecretGuard()
        ),
    ]);
    $pluginLoader->registerAll($builder);

    return [$builder->build(), $pluginLoader];
}

/** @return array{App<\Psr\Container\ContainerInterface|null>, PluginLoader} */
function bootRuntimeRouteApp(): array
{
    [$container, $pluginLoader] = buildRuntimeAuditContainer();
    AppFactory::setContainer($container);
    $app = AppFactory::create();
    $routes = require dirname(__DIR__) . '/api/routes.php';
    $routes($app);
    $pluginLoader->bootAll($app, new EventDispatcher());

    return [$app, $pluginLoader];
}

/** @return list<string> */
function middlewareFromHandler(object $handler, array &$seen = []): array
{
    $objectId = spl_object_id($handler);
    if (isset($seen[$objectId])) {
        return [];
    }
    $seen[$objectId] = true;
    $reflection = new ReflectionObject($handler);
    $result = [];

    if ($reflection->hasProperty('middleware')) {
        $property = $reflection->getProperty('middleware');
        $middleware = $property->getValue($handler);
        if (is_object($middleware)) {
            $result[] = $middleware::class;
        } elseif (is_string($middleware)) {
            $result[] = $middleware;
        }
    }
    if ($reflection->hasProperty('next')) {
        $property = $reflection->getProperty('next');
        $next = $property->getValue($handler);
        if (is_object($next)) {
            $result = array_merge($result, middlewareFromHandler($next, $seen));
        }
    }

    return array_values(array_unique($result));
}

/** @return list<string> */
function middlewareFromDispatcher(object $dispatcher): array
{
    $reflection = new ReflectionObject($dispatcher);
    if (!$reflection->hasProperty('tip')) {
        return [];
    }
    $property = $reflection->getProperty('tip');
    $tip = $property->getValue($dispatcher);
    if (!is_object($tip)) {
        return [];
    }
    $seen = [];
    return middlewareFromHandler($tip, $seen);
}

/** @return list<string> */
function routeMiddleware(RouteInterface $route): array
{
    $result = [];
    $reflection = new ReflectionObject($route);
    if ($reflection->hasProperty('middlewareDispatcher')) {
        $property = $reflection->getProperty('middlewareDispatcher');
        $dispatcher = $property->getValue($route);
        if (is_object($dispatcher)) {
            $result = array_merge($result, middlewareFromDispatcher($dispatcher));
        }
    }

    if (method_exists($route, 'getGroups')) {
        foreach ($route->getGroups() as $group) {
            $groupReflection = new ReflectionObject($group);
            if (!$groupReflection->hasProperty('middleware')) {
                continue;
            }
            $property = $groupReflection->getProperty('middleware');
            $middleware = $property->getValue($group);
            if (!is_array($middleware)) {
                continue;
            }
            foreach ($middleware as $item) {
                if (is_object($item)) {
                    $result[] = $item::class;
                } elseif (is_string($item)) {
                    $result[] = $item;
                }
            }
        }
    }

    $result = array_values(array_unique($result));
    sort($result);
    return $result;
}

/** @return array<string, string> */
function controllerFactoryMap(string $source): array
{
    $map = [];
    preg_match_all(
        '/\$(create[A-Za-z0-9_]+)\s*=\s*static\s+fn\s*\([^)]*\)\s*(?::\s*([A-Za-z0-9_\\\\]+))?\s*=>\s*\$resolve\(\s*([A-Za-z0-9_\\\\]+)::class\s*\)/',
        $source,
        $matches,
        PREG_SET_ORDER
    );
    foreach ($matches as $match) {
        $class = trim((string)($match[2] !== '' ? $match[2] : $match[3]), '\\');
        $class = str_contains($class, '\\')
            ? (string)substr($class, (int)strrpos($class, '\\') + 1)
            : $class;
        $map[$match[1]] = $class;
    }
    preg_match_all(
        '/\$([A-Za-z0-9_]+)\s*=\s*\$(create[A-Za-z0-9_]+)\s*;/',
        $source,
        $aliases,
        PREG_SET_ORDER
    );
    foreach ($aliases as $alias) {
        if (isset($map[$alias[2]])) {
            $map[$alias[1]] = $map[$alias[2]];
        }
    }
    return $map;
}

function runtimeAuditRelativePath(?string $path): ?string
{
    if (!is_string($path) || $path === '') {
        return null;
    }
    $root = str_replace('\\', '/', dirname(__DIR__) . DIRECTORY_SEPARATOR);
    $normalized = str_replace('\\', '/', $path);
    return str_starts_with($normalized, $root)
        ? substr($normalized, strlen($root))
        : $normalized;
}

/** @return array<string, list<string>> */
function runtimeAuditClassIndex(): array
{
    $index = [];
    foreach ([dirname(__DIR__) . '/api/v1', dirname(__DIR__) . '/api/plugins'] as $scanRoot) {
        if (!is_dir($scanRoot)) {
            continue;
        }
        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($scanRoot, FilesystemIterator::SKIP_DOTS)
        );
        foreach ($iterator as $entry) {
            if (!$entry->isFile() || strtolower($entry->getExtension()) !== 'php') {
                continue;
            }
            $source = file_get_contents($entry->getPathname());
            if (!is_string($source)) {
                continue;
            }
            $namespace = '';
            if (preg_match('/\bnamespace\s+([^;{]+)\s*[;{]/', $source, $namespaceMatch) === 1) {
                $namespace = trim($namespaceMatch[1]);
                $namespace = trim($namespace, '\\');
            }
            preg_match_all(
                '/\b(?:final\s+|abstract\s+|readonly\s+)*(?:class|interface|trait|enum)\s+([A-Za-z_][A-Za-z0-9_]*)\b/',
                $source,
                $classMatches
            );
            foreach ($classMatches[1] as $shortName) {
                $fqcn = $namespace === '' ? $shortName : $namespace . '\\' . $shortName;
                $index[$shortName][] = $fqcn;
            }
        }
    }
    foreach ($index as &$classes) {
        $classes = array_values(array_unique($classes));
        sort($classes);
    }
    unset($classes);
    ksort($index);
    return $index;
}

/**
 * @param array<string, list<string>> $classIndex
 * @return array{
 *   handler_class: ?string,
 *   handler_method: ?string,
 *   handler_source: ?string,
 *   handler_line: ?int,
 *   handler_declared_response_statuses: ?list<int>,
 *   handler_declares_created_status: ?bool,
 *   handler_declares_location_header: ?bool
 * }
 */
function runtimeAuditHandlerMetadata(?string $handler, array $classIndex): array
{
    if (!is_string($handler) || !str_contains($handler, '::')) {
        return [
            'handler_class' => null,
            'handler_method' => null,
            'handler_source' => null,
            'handler_line' => null,
            'handler_declared_response_statuses' => null,
            'handler_declares_created_status' => null,
            'handler_declares_location_header' => null,
        ];
    }
    [$className, $method] = explode('::', $handler, 2);
    $shortName = str_contains($className, '\\')
        ? substr($className, (int)strrpos($className, '\\') + 1)
        : $className;
    $candidates = str_contains($className, '\\')
        ? [trim($className, '\\')]
        : ($classIndex[$shortName] ?? []);
    $fqcn = count($candidates) === 1 ? $candidates[0] : null;
    $source = null;
    $line = null;
    $declaredResponseStatuses = null;
    $declaresCreatedStatus = null;
    $declaresLocationHeader = null;
    if (is_string($fqcn) && class_exists($fqcn) && method_exists($fqcn, $method)) {
        $reflection = new ReflectionMethod($fqcn, $method);
        $source = $reflection->getFileName() ?: null;
        $line = $reflection->getStartLine() ?: null;
        if (is_string($source) && is_file($source)) {
            $lines = file($source);
            if (is_array($lines)) {
                $methodSource = implode('', array_slice(
                    $lines,
                    max(0, $reflection->getStartLine() - 1),
                    max(1, $reflection->getEndLine() - $reflection->getStartLine() + 1)
                ));
                preg_match_all(
                    '/withStatus\(\s*([1-5][0-9]{2})\s*\)/',
                    $methodSource,
                    $statusMatches
                );
                $declaredResponseStatuses = array_values(array_unique(array_map(
                    static fn (string $status): int => (int)$status,
                    $statusMatches[1] ?? []
                )));
                sort($declaredResponseStatuses);
                $declaresCreatedStatus = preg_match(
                    '/withStatus\(\s*201\s*\)/',
                    $methodSource
                ) === 1 || preg_match(
                    '/ApiResponse::envelope\([\s\S]*?,\s*null\s*,\s*\[\]\s*,\s*201\s*\)/',
                    $methodSource
                ) === 1;
                $declaresLocationHeader = preg_match(
                    '/withHeader\(\s*[\'\"]Location[\'\"]\s*,/',
                    $methodSource
                ) === 1;
            }
        }
    }
    return [
        'handler_class' => $fqcn,
        'handler_method' => $method,
        'handler_source' => runtimeAuditRelativePath($source),
        'handler_line' => $line,
        'handler_declared_response_statuses' => $declaredResponseStatuses,
        'handler_declares_created_status' => $declaresCreatedStatus,
        'handler_declares_location_header' => $declaresLocationHeader,
    ];
}

/** @param array<string, mixed> $document @return array<string, mixed> */
function resolveOpenapiObject(array $document, mixed $value): array
{
    if (!is_array($value)) {
        return [];
    }
    $ref = $value['$ref'] ?? null;
    if (!is_string($ref) || !str_starts_with($ref, '#/')) {
        return $value;
    }
    $resolved = $document;
    foreach (explode('/', substr($ref, 2)) as $segment) {
        $segment = str_replace(['~1', '~0'], ['/', '~'], $segment);
        if (!is_array($resolved) || !array_key_exists($segment, $resolved)) {
            return [];
        }
        $resolved = $resolved[$segment];
    }
    return is_array($resolved) ? $resolved : [];
}

/** @param array<string, mixed> $headers */
function openapiHeadersContain(array $headers, string $expectedName): bool
{
    foreach (array_keys($headers) as $name) {
        if (strcasecmp((string)$name, $expectedName) === 0) {
            return true;
        }
    }
    return false;
}

/** @return array{handler: ?string, source: ?string, line: ?int, handler_kind: string} */
function routeHandler(RouteInterface $route): array
{
    $callable = $route->getCallable();
    if (is_array($callable) && count($callable) === 2) {
        $class = is_object($callable[0]) ? $callable[0]::class : (string)$callable[0];
        return [
            'handler' => $class . '::' . (string)$callable[1],
            'source' => null,
            'line' => null,
            'handler_kind' => 'direct_callable',
        ];
    }
    if (is_string($callable)) {
        return ['handler' => $callable, 'source' => null, 'line' => null, 'handler_kind' => 'string_callable'];
    }
    if (!$callable instanceof Closure) {
        return ['handler' => null, 'source' => null, 'line' => null, 'handler_kind' => 'unresolved'];
    }

    $reflection = new ReflectionFunction($callable);
    $static = $reflection->getStaticVariables();
    if (isset($static['className'], $static['method'])) {
        $class = trim((string)$static['className'], '\\');
        $class = str_contains($class, '\\')
            ? (string)substr($class, (int)strrpos($class, '\\') + 1)
            : $class;
        return [
            'handler' => $class . '::' . (string)$static['method'],
            'source' => $reflection->getFileName() ?: null,
            'line' => $reflection->getStartLine() ?: null,
            'handler_kind' => 'plugin_closure_proxy',
        ];
    }

    $file = $reflection->getFileName();
    if (!is_string($file) || !is_file($file)) {
        return ['handler' => null, 'source' => null, 'line' => null, 'handler_kind' => 'unresolved_closure'];
    }
    $lines = file($file);
    if (!is_array($lines)) {
        return [
            'handler' => null,
            'source' => $file,
            'line' => $reflection->getStartLine() ?: null,
            'handler_kind' => 'unresolved_closure',
        ];
    }
    $callbackSource = implode('', array_slice(
        $lines,
        max(0, $reflection->getStartLine() - 1),
        max(1, $reflection->getEndLine() - $reflection->getStartLine() + 1)
    ));
    $fileSource = implode('', $lines);
    $factories = controllerFactoryMap($fileSource);

    if (preg_match('/\$(create[A-Za-z0-9_]+)\(\)\s*->\s*([A-Za-z0-9_]+)\s*\(/', $callbackSource, $match) === 1) {
        $factory = $match[1];
        $class = $factories[$factory] ?? preg_replace('/^create/', '', $factory);
        return [
            'handler' => $class . '::' . $match[2],
            'source' => $file,
            'line' => $reflection->getStartLine() ?: null,
            'handler_kind' => 'controller_factory_closure',
        ];
    }
    if (preg_match(
        '/\$([A-Za-z0-9_]+)\s*=\s*\$([A-Za-z0-9_]+)\(\).*?\$\1\s*->\s*([A-Za-z0-9_]+)\s*\(/s',
        $callbackSource,
        $match
    ) === 1) {
        $factory = $match[2];
        $class = $factories[$factory] ?? preg_replace('/^create/', '', $factory);
        return [
            'handler' => $class . '::' . $match[3],
            'source' => $file,
            'line' => $reflection->getStartLine() ?: null,
            'handler_kind' => 'controller_factory_closure',
        ];
    }
    if (preg_match('/([A-Za-z0-9_\\\\]+)::([A-Za-z0-9_]+)\s*\(/', $callbackSource, $match) === 1) {
        $class = trim($match[1], '\\');
        $class = str_contains($class, '\\')
            ? (string)substr($class, (int)strrpos($class, '\\') + 1)
            : $class;
        return [
            'handler' => $class . '::' . $match[2],
            'source' => $file,
            'line' => $reflection->getStartLine() ?: null,
            'handler_kind' => 'route_closure_static_call',
        ];
    }

    return [
        'handler' => null,
        'source' => $file,
        'line' => $reflection->getStartLine() ?: null,
        'handler_kind' => 'unresolved_closure',
    ];
}

/** @return array<string, array<string, mixed>> */
function openapiOperations(string $path): array
{
    $document = Yaml::parseFile($path);
    if (!is_array($document) || !is_array($document['paths'] ?? null)) {
        throw new RuntimeException('OpenAPI paths를 읽을 수 없습니다.');
    }
    $globalSecurity = is_array($document['security'] ?? null) ? $document['security'] : [];
    $operations = [];
    $methods = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace'];
    foreach ($document['paths'] as $routePath => $pathItem) {
        if (!is_array($pathItem)) {
            continue;
        }
        foreach ($methods as $method) {
            $operation = $pathItem[$method] ?? null;
            if (!is_array($operation)) {
                continue;
            }
            $security = array_key_exists('security', $operation)
                ? $operation['security']
                : $globalSecurity;
            $responses = is_array($operation['responses'] ?? null) ? $operation['responses'] : [];
            $createdResponse = resolveOpenapiObject($document, $responses['201'] ?? null);
            $createdHeaders = is_array($createdResponse['headers'] ?? null)
                ? $createdResponse['headers']
                : [];
            $operations[strtoupper($method) . ' ' . $routePath] = [
                'operation_id' => $operation['operationId'] ?? null,
                'security' => is_array($security) ? $security : [],
                'response_statuses' => array_values(array_filter(
                    array_map('strval', array_keys($responses)),
                    static fn (string $status): bool => preg_match('/^[1-5][0-9]{2}$/', $status) === 1
                )),
                'has_201_response' => array_key_exists('201', $responses),
                'location_header_for_201' => openapiHeadersContain($createdHeaders, 'Location'),
            ];
        }
    }
    ksort($operations);
    return $operations;
}

function runtimeAuditContractOperationKey(string $method, string $path): string
{
    if ($path === '/v1') {
        return strtoupper($method) . ' /';
    }
    if (str_starts_with($path, '/v1/')) {
        return strtoupper($method) . ' ' . substr($path, 3);
    }
    return strtoupper($method) . ' ' . $path;
}

/** @return array{has_bearer: bool, allows_anonymous: bool, schemes: list<string>} */
function openapiSecurity(array $requirements): array
{
    $schemes = [];
    $allowsAnonymous = $requirements === [];
    foreach ($requirements as $requirement) {
        if (!is_array($requirement)) {
            continue;
        }
        if ($requirement === []) {
            $allowsAnonymous = true;
        }
        foreach (array_keys($requirement) as $scheme) {
            $schemes[] = (string)$scheme;
        }
    }
    $schemes = array_values(array_unique($schemes));
    sort($schemes);
    return [
        'has_bearer' => in_array('bearerAuth', $schemes, true),
        'allows_anonymous' => $allowsAnonymous,
        'schemes' => $schemes,
    ];
}

/**
 * @param App<\Psr\Container\ContainerInterface|null> $app
 * @return array<string, mixed>
 */
function buildRuntimeRouteGraph(
    App $app,
    string $openapiPath,
    bool $compare,
    Phase1ConsumerScope $consumerScope
): array {
    $globalMiddleware = middlewareFromDispatcher($app->getMiddlewareDispatcher());
    sort($globalMiddleware);
    $classIndex = runtimeAuditClassIndex();
    $routes = [];
    $operationCounts = [];
    foreach ($app->getRouteCollector()->getRoutes() as $route) {
        $handler = routeHandler($route);
        $handlerMetadata = runtimeAuditHandlerMetadata($handler['handler'], $classIndex);
        $middleware = routeMiddleware($route);
        foreach ($route->getMethods() as $method) {
            $key = strtoupper($method) . ' ' . $route->getPattern();
            $operationCounts[$key] = ($operationCounts[$key] ?? 0) + 1;
            $routes[] = [
                'method' => strtoupper($method),
                'path' => $route->getPattern(),
                'handler' => $handler['handler'],
                'handler_kind' => $handler['handler_kind'],
                'handler_class' => $handlerMetadata['handler_class'],
                'handler_method' => $handlerMetadata['handler_method'],
                'handler_source' => $handlerMetadata['handler_source'],
                'handler_line' => $handlerMetadata['handler_line'],
                'handler_declared_response_statuses' => $handlerMetadata['handler_declared_response_statuses'],
                'handler_declares_created_status' => $handlerMetadata['handler_declares_created_status'],
                'handler_declares_location_header' => $handlerMetadata['handler_declares_location_header'],
                'source' => runtimeAuditRelativePath($handler['source']),
                'line' => $handler['line'],
                'middleware' => $middleware,
            ];
        }
    }
    usort($routes, static fn (array $left, array $right): int => [
        $left['path'],
        $left['method'],
    ] <=> [
        $right['path'],
        $right['method'],
    ]);

    $duplicates = array_keys(array_filter(
        $operationCounts,
        static fn (int $count): bool => $count > 1
    ));
    sort($duplicates);
    $unresolvedHandlers = array_values(array_filter(
        $routes,
        static fn (array $route): bool => !is_string($route['handler']) || $route['handler'] === ''
    ));

    $runtimeV1 = [];
    foreach ($routes as $route) {
        if (!str_starts_with($route['path'], '/v1')) {
            continue;
        }
        $contractPath = substr($route['path'], 3);
        $contractPath = $contractPath === '' ? '/' : $contractPath;
        $runtimeV1[$route['method'] . ' ' . $contractPath] = $route;
    }

    $openapi = $compare ? openapiOperations($openapiPath) : [];
    $missingInOpenapi = $compare ? array_values(array_diff(array_keys($runtimeV1), array_keys($openapi))) : [];
    $extraInOpenapi = $compare ? array_values(array_diff(array_keys($openapi), array_keys($runtimeV1))) : [];
    sort($missingInOpenapi);
    sort($extraInOpenapi);
    $securityMismatches = [];
    $responseContractMismatches = [];
    $bindings = [];

    if ($compare) {
        foreach (array_intersect(array_keys($runtimeV1), array_keys($openapi)) as $key) {
            $route = $runtimeV1[$key];
            $runtimeJwt = in_array(JwtAuthMiddleware::class, $route['middleware'], true);
            $runtimeOptionalJwt = in_array(OptionalJwtAuthMiddleware::class, $route['middleware'], true);
            $runtimeInspect = in_array(AdminSchemaInspectMiddleware::class, $route['middleware'], true);
            $security = openapiSecurity($openapi[$key]['security']);
            $bindings[] = [
                'operation' => $key,
                'operation_id' => $openapi[$key]['operation_id'],
                'handler' => $route['handler'],
                'handler_kind' => $route['handler_kind'],
                'handler_class' => $route['handler_class'],
                'handler_method' => $route['handler_method'],
                'handler_source' => $route['handler_source'],
                'handler_line' => $route['handler_line'],
                'handler_declared_response_statuses' => $route['handler_declared_response_statuses'],
                'handler_declares_created_status' => $route['handler_declares_created_status'],
                'handler_declares_location_header' => $route['handler_declares_location_header'],
                'source' => $route['source'],
                'line' => $route['line'],
                'runtime_middleware' => $route['middleware'],
                'openapi_security_schemes' => $security['schemes'],
                'openapi_allows_anonymous' => $security['allows_anonymous'],
                'openapi_response_statuses' => $openapi[$key]['response_statuses'],
                'openapi_has_201_response' => $openapi[$key]['has_201_response'],
                'openapi_location_header_for_201' => $openapi[$key]['location_header_for_201'],
            ];
            $reasons = [];
            $contractRequiresJwt = $security['has_bearer'] && !$security['allows_anonymous'];
            $contractAllowsOptionalJwt = $security['has_bearer'] && $security['allows_anonymous'];
            if ($runtimeJwt !== $contractRequiresJwt) {
                $reasons[] = 'bearerAuth/runtime JwtAuthMiddleware 불일치';
            }
            if ($runtimeOptionalJwt !== $contractAllowsOptionalJwt) {
                $reasons[] = 'OptionalJwtAuthMiddleware 의미 미표현';
            }
            if ($runtimeInspect && !in_array('adminInspectSecret', $security['schemes'], true)) {
                $reasons[] = 'AdminSchemaInspectMiddleware security scheme 누락';
            }
            if ($reasons !== []) {
                $securityMismatches[] = [
                    'operation' => $key,
                    'operation_id' => $openapi[$key]['operation_id'],
                    'reasons' => $reasons,
                    'runtime_middleware' => $route['middleware'],
                    'openapi_security_schemes' => $security['schemes'],
                    'openapi_allows_anonymous' => $security['allows_anonymous'],
                ];
            }
            $responseReasons = [];
            $runtimeDeclaredStatuses = $route['handler_declared_response_statuses'];
            $runtimeDeclaresCreated = $route['handler_declares_created_status'];
            $runtimeDeclaresLocation = $route['handler_declares_location_header'];
            if (
                is_bool($runtimeDeclaresCreated)
                && $openapi[$key]['has_201_response'] !== $runtimeDeclaresCreated
            ) {
                $responseReasons[] = '201 status 계약/runtime 선언 불일치';
            }
            if (is_array($runtimeDeclaredStatuses)) {
                $undocumentedStatuses = array_values(array_diff(
                    array_map('strval', $runtimeDeclaredStatuses),
                    $openapi[$key]['response_statuses']
                ));
                if ($undocumentedStatuses !== []) {
                    $responseReasons[] = '명시 runtime status OpenAPI 누락: ' . implode(', ', $undocumentedStatuses);
                }
            }
            if (
                ($openapi[$key]['has_201_response'] === true || $runtimeDeclaresCreated === true)
                && is_bool($runtimeDeclaresLocation)
                && $openapi[$key]['location_header_for_201'] !== $runtimeDeclaresLocation
            ) {
                $responseReasons[] = '201 Location header 계약/runtime 선언 불일치';
            }
            if ($responseReasons !== []) {
                $responseContractMismatches[] = [
                    'operation' => $key,
                    'operation_id' => $openapi[$key]['operation_id'],
                    'reason' => implode(', ', $responseReasons),
                    'reasons' => $responseReasons,
                    'openapi_response_statuses' => $openapi[$key]['response_statuses'],
                    'handler_declared_response_statuses' => $runtimeDeclaredStatuses,
                    'openapi_has_201_response' => $openapi[$key]['has_201_response'],
                    'handler_declares_created_status' => $runtimeDeclaresCreated,
                    'openapi_location_header_for_201' => $openapi[$key]['location_header_for_201'],
                    'handler_declares_location_header' => $runtimeDeclaresLocation,
                ];
            }
        }
    }

    $activeMissingInOpenapi = array_values(array_filter(
        $missingInOpenapi,
        static fn (string $operation): bool => $consumerScope->isActiveOperationKey($operation)
    ));
    $activeExtraInOpenapi = array_values(array_filter(
        $extraInOpenapi,
        static fn (string $operation): bool => $consumerScope->isActiveOperationKey($operation)
    ));
    $protectedMissingInOpenapi = array_values(array_filter(
        $missingInOpenapi,
        static fn (string $operation): bool => $consumerScope->isProtectedOperationKey($operation)
    ));
    $protectedExtraInOpenapi = array_values(array_filter(
        $extraInOpenapi,
        static fn (string $operation): bool => $consumerScope->isProtectedOperationKey($operation)
    ));
    $activeSecurityMismatches = array_values(array_filter(
        $securityMismatches,
        static fn (array $mismatch): bool => $consumerScope->isActiveOperationKey((string)$mismatch['operation'])
    ));
    $protectedSecurityMismatches = array_values(array_filter(
        $securityMismatches,
        static fn (array $mismatch): bool => $consumerScope->isProtectedOperationKey((string)$mismatch['operation'])
    ));
    $activeResponseContractMismatches = array_values(array_filter(
        $responseContractMismatches,
        static fn (array $mismatch): bool => $consumerScope->isActiveOperationKey((string)$mismatch['operation'])
    ));
    $protectedResponseContractMismatches = array_values(array_filter(
        $responseContractMismatches,
        static fn (array $mismatch): bool => $consumerScope->isProtectedOperationKey((string)$mismatch['operation'])
    ));
    $deferredFindings = [];
    foreach ($missingInOpenapi as $operation) {
        if (
            !in_array($operation, $activeMissingInOpenapi, true)
            && !in_array($operation, $protectedMissingInOpenapi, true)
        ) {
            $deferredFindings[] = [
                'rule' => 'missing_in_openapi',
                'operation' => $operation,
                'scope_classification' => $consumerScope->classifyOperationKey($operation),
            ];
        }
    }
    foreach ($extraInOpenapi as $operation) {
        if (
            !in_array($operation, $activeExtraInOpenapi, true)
            && !in_array($operation, $protectedExtraInOpenapi, true)
        ) {
            $deferredFindings[] = [
                'rule' => 'extra_in_openapi',
                'operation' => $operation,
                'scope_classification' => $consumerScope->classifyOperationKey($operation),
            ];
        }
    }
    foreach ($securityMismatches as $mismatch) {
        if (
            !in_array($mismatch, $activeSecurityMismatches, true)
            && !in_array($mismatch, $protectedSecurityMismatches, true)
        ) {
            $deferredFindings[] = [
                'rule' => 'security_mismatch',
                'operation' => $mismatch['operation'],
                'scope_classification' => $consumerScope->classifyOperationKey((string)$mismatch['operation']),
                'reasons' => $mismatch['reasons'],
            ];
        }
    }
    foreach ($responseContractMismatches as $mismatch) {
        if (
            !in_array($mismatch, $activeResponseContractMismatches, true)
            && !in_array($mismatch, $protectedResponseContractMismatches, true)
        ) {
            $deferredFindings[] = [
                'rule' => 'response_contract_mismatch',
                'operation' => $mismatch['operation'],
                'scope_classification' => $consumerScope->classifyOperationKey((string)$mismatch['operation']),
                'reason' => $mismatch['reason'],
            ];
        }
    }
    $fingerprintPayload = [
        'routes' => $routes,
        'global_middleware' => $globalMiddleware,
    ];
    $activeBindings = array_values(array_filter(
        $bindings,
        static fn (array $binding): bool => $consumerScope->isActiveOperationKey((string)$binding['operation'])
    ));
    $protectedBindings = array_values(array_filter(
        $bindings,
        static fn (array $binding): bool => $consumerScope->isProtectedOperationKey((string)$binding['operation'])
    ));
    $scopeCounts = $consumerScope->operationCounts(array_keys($openapi));
    $expectedProtectedCount = $consumerScope->expectedClassificationCounts()['deferred_general_board'] ?? 0;
    $blockingFindings = [];
    foreach ($activeMissingInOpenapi as $operation) {
        $blockingFindings[] = ['rule' => 'missing_in_openapi', 'operation' => $operation];
    }
    foreach ($activeExtraInOpenapi as $operation) {
        $blockingFindings[] = ['rule' => 'extra_in_openapi', 'operation' => $operation];
    }
    foreach ($protectedMissingInOpenapi as $operation) {
        $blockingFindings[] = ['rule' => 'protected_missing_in_openapi', 'operation' => $operation];
    }
    foreach ($protectedExtraInOpenapi as $operation) {
        $blockingFindings[] = ['rule' => 'protected_extra_in_openapi', 'operation' => $operation];
    }
    foreach ($activeSecurityMismatches as $mismatch) {
        $blockingFindings[] = [
            'rule' => 'security_mismatch',
            'operation' => $mismatch['operation'],
            'reasons' => $mismatch['reasons'],
        ];
    }
    foreach ($protectedSecurityMismatches as $mismatch) {
        $blockingFindings[] = [
            'rule' => 'protected_security_mismatch',
            'operation' => $mismatch['operation'],
            'reasons' => $mismatch['reasons'],
        ];
    }
    foreach ($activeResponseContractMismatches as $mismatch) {
        $blockingFindings[] = [
            'rule' => 'response_contract_mismatch',
            'operation' => $mismatch['operation'],
            'reason' => $mismatch['reason'],
        ];
    }
    foreach ($protectedResponseContractMismatches as $mismatch) {
        $blockingFindings[] = [
            'rule' => 'protected_response_contract_mismatch',
            'operation' => $mismatch['operation'],
            'reason' => $mismatch['reason'],
        ];
    }
    if ($compare) {
        $expectedCounts = [
            'active' => [
                'expected' => $consumerScope->expectedTotalCount(),
                'rule' => 'active_operation_count_mismatch',
            ],
            'admin_non_shop' => [
                'expected' => $consumerScope->expectedAdminCount(),
                'rule' => 'active_admin_operation_count_mismatch',
            ],
            'bootstrap' => [
                'expected' => $consumerScope->expectedBootstrapCount(),
                'rule' => 'active_bootstrap_operation_count_mismatch',
            ],
        ];
        foreach ($expectedCounts as $key => $expectation) {
            if ($scopeCounts[$key] !== $expectation['expected']) {
                $blockingFindings[] = [
                    'rule' => $expectation['rule'],
                    'expected' => $expectation['expected'],
                    'actual' => $scopeCounts[$key],
                ];
            }
        }
        foreach ($consumerScope->inventoryFindings(array_keys($openapi)) as $finding) {
            $blockingFindings[] = $finding;
        }
        if (count($activeBindings) !== $consumerScope->expectedTotalCount()) {
            $blockingFindings[] = [
                'rule' => 'active_handler_binding_count_mismatch',
                'expected' => $consumerScope->expectedTotalCount(),
                'actual' => count($activeBindings),
            ];
        }
        if (count($protectedBindings) !== $expectedProtectedCount) {
            $blockingFindings[] = [
                'rule' => 'protected_handler_binding_count_mismatch',
                'expected' => $expectedProtectedCount,
                'actual' => count($protectedBindings),
            ];
        }
    }
    $activeDuplicateCount = 0;
    $protectedDuplicateCount = 0;
    foreach ($duplicates as $operation) {
        [$method, $path] = explode(' ', $operation, 2);
        $contractOperation = runtimeAuditContractOperationKey($method, $path);
        if ($consumerScope->isActiveOperationKey($contractOperation)) {
            $blockingFindings[] = ['rule' => 'duplicate_operation', 'operation' => $contractOperation];
            $activeDuplicateCount++;
        } elseif ($consumerScope->isProtectedOperationKey($contractOperation)) {
            $blockingFindings[] = ['rule' => 'protected_duplicate_operation', 'operation' => $contractOperation];
            $protectedDuplicateCount++;
        } else {
            $deferredFindings[] = [
                'rule' => 'duplicate_operation',
                'operation' => $contractOperation,
                'scope_classification' => $consumerScope->classifyOperationKey($contractOperation),
            ];
        }
    }
    $activeUnresolvedHandlerCount = 0;
    $protectedUnresolvedHandlerCount = 0;
    foreach ($unresolvedHandlers as $route) {
        $contractOperation = runtimeAuditContractOperationKey((string)$route['method'], (string)$route['path']);
        if ($consumerScope->isActiveOperationKey($contractOperation)) {
            $blockingFindings[] = [
                'rule' => 'unresolved_handler',
                'operation' => $contractOperation,
            ];
            $activeUnresolvedHandlerCount++;
        } elseif ($consumerScope->isProtectedOperationKey($contractOperation)) {
            $blockingFindings[] = [
                'rule' => 'protected_unresolved_handler',
                'operation' => $contractOperation,
            ];
            $protectedUnresolvedHandlerCount++;
        } else {
            $deferredFindings[] = [
                'rule' => 'unresolved_handler',
                'operation' => $contractOperation,
                'scope_classification' => $consumerScope->classifyOperationKey($contractOperation),
            ];
        }
    }
    $failureCount = count($blockingFindings);

    return [
        'schema' => 'gnuboard5.php.runtime-route-graph/v3',
        'status' => $failureCount === 0 ? 'passed' : 'failed',
        'certified' => $failureCount === 0,
        'compare_openapi' => $compare,
        'consumer_scope_id' => $consumerScope->id(),
        'consumer_scope_sha256' => $consumerScope->sha256(),
        'openapi_sha256' => $compare && is_file($openapiPath) ? hash_file('sha256', $openapiPath) : null,
        'runtime_fingerprint_sha256' => hash(
            'sha256',
            (string)json_encode($fingerprintPayload, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR)
        ),
        'global_middleware' => $globalMiddleware,
        'stats' => [
            'route_operation_count' => count($routes),
            'v1_operation_count' => count($runtimeV1),
            'unresolved_handler_count' => count($unresolvedHandlers),
            'active_unresolved_handler_count' => $activeUnresolvedHandlerCount,
            'protected_unresolved_handler_count' => $protectedUnresolvedHandlerCount,
            'deferred_unresolved_handler_count' => count($unresolvedHandlers)
                - $activeUnresolvedHandlerCount
                - $protectedUnresolvedHandlerCount,
            'duplicate_operation_count' => count($duplicates),
            'active_duplicate_operation_count' => $activeDuplicateCount,
            'protected_duplicate_operation_count' => $protectedDuplicateCount,
            'deferred_duplicate_operation_count' => count($duplicates)
                - $activeDuplicateCount
                - $protectedDuplicateCount,
            'openapi_operation_count' => count($openapi),
            'active_operation_count' => $scopeCounts['active'],
            'protected_operation_count' => $scopeCounts['deferred_general_board'] ?? 0,
            'audited_operation_count' => $scopeCounts['active'] + ($scopeCounts['deferred_general_board'] ?? 0),
            'admin_non_shop_operation_count' => $scopeCounts['admin_non_shop'],
            'bootstrap_operation_count' => $scopeCounts['bootstrap'],
            'deferred_operation_count' => $scopeCounts['deferred'],
            'excluded_admin_shop_operation_count' => $scopeCounts['excluded_admin_shop'],
            'missing_in_openapi_count' => count($missingInOpenapi),
            'active_missing_in_openapi_count' => count($activeMissingInOpenapi),
            'protected_missing_in_openapi_count' => count($protectedMissingInOpenapi),
            'deferred_missing_in_openapi_count' => count($missingInOpenapi)
                - count($activeMissingInOpenapi)
                - count($protectedMissingInOpenapi),
            'extra_in_openapi_count' => count($extraInOpenapi),
            'active_extra_in_openapi_count' => count($activeExtraInOpenapi),
            'protected_extra_in_openapi_count' => count($protectedExtraInOpenapi),
            'deferred_extra_in_openapi_count' => count($extraInOpenapi)
                - count($activeExtraInOpenapi)
                - count($protectedExtraInOpenapi),
            'security_mismatch_count' => count($securityMismatches),
            'active_security_mismatch_count' => count($activeSecurityMismatches),
            'protected_security_mismatch_count' => count($protectedSecurityMismatches),
            'deferred_security_mismatch_count' => count($securityMismatches)
                - count($activeSecurityMismatches)
                - count($protectedSecurityMismatches),
            'response_contract_mismatch_count' => count($responseContractMismatches),
            'active_response_contract_mismatch_count' => count($activeResponseContractMismatches),
            'protected_response_contract_mismatch_count' => count($protectedResponseContractMismatches),
            'deferred_response_contract_mismatch_count' => count($responseContractMismatches)
                - count($activeResponseContractMismatches)
                - count($protectedResponseContractMismatches),
            'handler_binding_count' => count($bindings),
            'active_handler_binding_count' => count($activeBindings),
            'protected_handler_binding_count' => count($protectedBindings),
            'audited_handler_binding_count' => count($activeBindings) + count($protectedBindings),
            'blocking_finding_count' => count($blockingFindings),
            'deferred_finding_count' => count($deferredFindings),
        ],
        'blocking_findings' => $blockingFindings,
        'deferred_findings' => $deferredFindings,
        'active_missing_in_openapi' => $activeMissingInOpenapi,
        'active_extra_in_openapi' => $activeExtraInOpenapi,
        'protected_missing_in_openapi' => $protectedMissingInOpenapi,
        'protected_extra_in_openapi' => $protectedExtraInOpenapi,
        'active_security_mismatches' => $activeSecurityMismatches,
        'protected_security_mismatches' => $protectedSecurityMismatches,
        'active_response_contract_mismatches' => $activeResponseContractMismatches,
        'protected_response_contract_mismatches' => $protectedResponseContractMismatches,
        'missing_in_openapi' => $missingInOpenapi,
        'extra_in_openapi' => $extraInOpenapi,
        'duplicates' => $duplicates,
        'unresolved_handlers' => $unresolvedHandlers,
        'security_mismatches' => $securityMismatches,
        'response_contract_mismatches' => $responseContractMismatches,
        'bindings' => $bindings,
        'routes' => $routes,
    ];
}

function main(array $argv): int
{
    $args = parseRuntimeAuditArgs($argv);
    $consumerScope = Phase1ConsumerScope::fromFile((string)$args['consumer_scope']);
    if ((bool)$args['compare']) {
        $consumerScope->assertContractPath(dirname(__DIR__), (string)$args['openapi']);
    }
    [$app] = bootRuntimeRouteApp();
    $report = buildRuntimeRouteGraph(
        $app,
        (string)$args['openapi'],
        (bool)$args['compare'],
        $consumerScope
    );
    $encoded = json_encode(
        $report,
        JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR
    ) . PHP_EOL;
    if (is_string($args['output'])) {
        $directory = dirname($args['output']);
        if (!is_dir($directory) && !mkdir($directory, 0777, true) && !is_dir($directory)) {
            throw new RuntimeException('출력 디렉토리를 만들 수 없습니다: ' . $directory);
        }
        file_put_contents($args['output'], $encoded);
    }

    $stats = $report['stats'];
    echo "[runtime_route_graph]", PHP_EOL;
    echo "route_operations={$stats['route_operation_count']}", PHP_EOL;
    echo "v1_operations={$stats['v1_operation_count']}", PHP_EOL;
    echo "unresolved_handlers={$stats['unresolved_handler_count']}", PHP_EOL;
    echo "active_unresolved_handlers={$stats['active_unresolved_handler_count']}", PHP_EOL;
    echo "protected_unresolved_handlers={$stats['protected_unresolved_handler_count']}", PHP_EOL;
    echo "deferred_unresolved_handlers={$stats['deferred_unresolved_handler_count']}", PHP_EOL;
    echo "duplicate_operations={$stats['duplicate_operation_count']}", PHP_EOL;
    echo "active_duplicate_operations={$stats['active_duplicate_operation_count']}", PHP_EOL;
    echo "protected_duplicate_operations={$stats['protected_duplicate_operation_count']}", PHP_EOL;
    echo "deferred_duplicate_operations={$stats['deferred_duplicate_operation_count']}", PHP_EOL;
    if ((bool)$args['compare']) {
        echo "openapi_operations={$stats['openapi_operation_count']}", PHP_EOL;
        echo "active_operations={$stats['active_operation_count']}", PHP_EOL;
        echo "protected_operations={$stats['protected_operation_count']}", PHP_EOL;
        echo "audited_operations={$stats['audited_operation_count']}", PHP_EOL;
        echo "admin_non_shop_operations={$stats['admin_non_shop_operation_count']}", PHP_EOL;
        echo "bootstrap_operations={$stats['bootstrap_operation_count']}", PHP_EOL;
        echo "deferred_operations={$stats['deferred_operation_count']}", PHP_EOL;
        echo "active_missing_in_openapi={$stats['active_missing_in_openapi_count']}", PHP_EOL;
        echo "protected_missing_in_openapi={$stats['protected_missing_in_openapi_count']}", PHP_EOL;
        echo "deferred_missing_in_openapi={$stats['deferred_missing_in_openapi_count']}", PHP_EOL;
        echo "active_extra_in_openapi={$stats['active_extra_in_openapi_count']}", PHP_EOL;
        echo "protected_extra_in_openapi={$stats['protected_extra_in_openapi_count']}", PHP_EOL;
        echo "deferred_extra_in_openapi={$stats['deferred_extra_in_openapi_count']}", PHP_EOL;
        echo "active_security_mismatches={$stats['active_security_mismatch_count']}", PHP_EOL;
        echo "protected_security_mismatches={$stats['protected_security_mismatch_count']}", PHP_EOL;
        echo "deferred_security_mismatches={$stats['deferred_security_mismatch_count']}", PHP_EOL;
        echo "active_response_contract_mismatches={$stats['active_response_contract_mismatch_count']}", PHP_EOL;
        echo "protected_response_contract_mismatches={$stats['protected_response_contract_mismatch_count']}", PHP_EOL;
        echo "deferred_response_contract_mismatches={$stats['deferred_response_contract_mismatch_count']}", PHP_EOL;
        echo "handler_bindings={$stats['handler_binding_count']}", PHP_EOL;
        echo "active_handler_bindings={$stats['active_handler_binding_count']}", PHP_EOL;
        echo "protected_handler_bindings={$stats['protected_handler_binding_count']}", PHP_EOL;
        echo "audited_handler_bindings={$stats['audited_handler_binding_count']}", PHP_EOL;
        foreach (array_slice($report['active_missing_in_openapi'], 0, 20) as $operation) {
            echo "FAIL [missing_in_openapi] {$operation}", PHP_EOL;
        }
        foreach (array_slice($report['protected_missing_in_openapi'], 0, 20) as $operation) {
            echo "FAIL [protected_missing_in_openapi] {$operation}", PHP_EOL;
        }
        foreach (array_slice($report['protected_extra_in_openapi'], 0, 20) as $operation) {
            echo "FAIL [protected_extra_in_openapi] {$operation}", PHP_EOL;
        }
        foreach (array_slice($report['active_security_mismatches'], 0, 20) as $mismatch) {
            echo "FAIL [security] {$mismatch['operation']}: ", implode(', ', $mismatch['reasons']), PHP_EOL;
        }
        foreach (array_slice($report['protected_security_mismatches'], 0, 20) as $mismatch) {
            echo "FAIL [protected_security] {$mismatch['operation']}: ",
            implode(', ', $mismatch['reasons']), PHP_EOL;
        }
        foreach (array_slice($report['active_response_contract_mismatches'], 0, 20) as $mismatch) {
            echo "FAIL [response_contract] {$mismatch['operation']}: {$mismatch['reason']}", PHP_EOL;
        }
        foreach (array_slice($report['protected_response_contract_mismatches'], 0, 20) as $mismatch) {
            echo "FAIL [protected_response_contract] {$mismatch['operation']}: {$mismatch['reason']}", PHP_EOL;
        }
        foreach (array_slice($report['deferred_findings'], 0, 20) as $finding) {
            echo "DEFERRED [{$finding['rule']}] {$finding['operation']}", PHP_EOL;
        }
    }
    if ($report['status'] === 'failed') {
        echo "FAIL: runtime route graph is not closed.", PHP_EOL;
        return 1;
    }
    echo "PASS: runtime route graph", PHP_EOL;
    return 0;
}

try {
    $arguments = array_values(array_map('strval', (array)($GLOBALS['argv'] ?? [])));
    exit(main($arguments));
} catch (Throwable $exception) {
    fwrite(STDERR, 'runtime route graph bootstrap failed: ' . $exception->getMessage() . PHP_EOL);
    exit(1);
}
