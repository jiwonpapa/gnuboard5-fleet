<?php

/**
 * docs-check route graph parser의 fail-closed 회귀를 검증합니다.
 *
 * @package  Tests\Contract
 * @since    v1.1.0
 */

declare(strict_types=1);

namespace Tests\Contract;

use PHPUnit\Framework\TestCase;

final class DocsCheckRouteGraphTest extends TestCase
{
    private string $fixtureRoot;
    private string $classificationOutput;

    protected function setUp(): void
    {
        parent::setUp();

        $this->fixtureRoot = sys_get_temp_dir() . '/g5-docs-check-' . bin2hex(random_bytes(8));
        $this->classificationOutput = $this->fixtureRoot . '/provider-legacy-admin-classification.json';
        $this->mkdir('scripts');
        $this->mkdir('scripts/lib');
        $this->mkdir('api/docs');
        $this->mkdir('api/routes/v1/admin');
        $this->mkdir('docs');
        $this->mkdir('adm/sms_admin');
        $this->mkdir('adm/shop_admin');
        $this->mkdir('shop');

        self::assertTrue(copy(
            dirname(__DIR__, 2) . '/scripts/docs-check.sh',
            $this->fixtureRoot . '/scripts/docs-check.sh'
        ));
        self::assertTrue(copy(
            dirname(__DIR__, 2) . '/scripts/lib/Phase1ConsumerScope.php',
            $this->fixtureRoot . '/scripts/lib/Phase1ConsumerScope.php'
        ));

        $this->write('api/routes/v1.php', <<<'PHP'
<?php
return function ($app): void {
    $modules = [
        'health.php',
        'admin.php',
    ];
    $app->group('/v1', function ($app) use ($modules): void {
        foreach ($modules as $module) {
            (require __DIR__ . '/v1/' . $module)($app);
        }
    });
};
PHP);
        $this->write('api/routes/v1/health.php', <<<'PHP'
<?php
return function ($app): void {
    $app->get('/health', static fn () => null);
};
PHP);
        $this->write('api/routes/v1/admin.php', <<<'PHP'
<?php
return function ($app): void {
    $modules = ['core.php'];
    $app->group('/admin', function ($app) use ($modules): void {
        foreach ($modules as $module) {
            (require __DIR__ . '/admin/' . $module)($app);
        }
    });
};
PHP);
        $this->write('api/routes/v1/admin/core.php', <<<'PHP'
<?php
return function ($app): void {
    $app->get('/status', static fn () => null);
};
PHP);
        $this->write('api/docs/openapi.yaml', <<<'YAML'
openapi: 3.0.3
paths:
  /health:
    get:
      responses: {}
  /admin/status:
    get:
      responses: {}
components:
  schemas: {}
YAML);
        $this->writeConsumerScope();
        $this->write('docs/API_SPEC.md', "# API\n");

        $this->write('adm/config_form.php', "<?php\n");
        $this->write('adm/sms_admin/config.php', "<?php\n");
        $this->write('adm/shop_admin/categoryform.php', "<?php\n");
        $this->write('shop/index.php', "<?php\n");
    }

    protected function tearDown(): void
    {
        $this->removeTree($this->fixtureRoot);

        parent::tearDown();
    }

    public function testReachableRouteGraphAndRecursiveAdminOwnershipPass(): void
    {
        [$exitCode, $output] = $this->runDocsCheck();

        self::assertSame(0, $exitCode, $output);
        self::assertStringContainsString('reachable_route_files=4', $output);
        self::assertStringContainsString('legacy_admin_total=3', $output);
        self::assertStringContainsString('legacy_admin_core=2', $output);
        self::assertStringContainsString('legacy_admin_shop_admin=1', $output);
        self::assertStringContainsString('classification_records=3', $output);
        self::assertStringContainsString('admin_legacy_inventory=2', $output);
        self::assertStringContainsString('shop_admin_legacy_inventory=1', $output);
        self::assertStringContainsString('classification_duplicates=0', $output);
        self::assertStringContainsString('public_shop_excluded=true', $output);

        $classification = json_decode(
            (string)file_get_contents($this->classificationOutput),
            true,
            512,
            JSON_THROW_ON_ERROR
        );
        self::assertSame('gnuboard5.php.provider-legacy-admin-inventory/v1', $classification['schema']);
        self::assertSame(['shop/'], $classification['scope']['excluded_roots']);
        self::assertCount(3, $classification['records']);

        $recordsByPath = [];
        foreach ($classification['records'] as $record) {
            $recordsByPath[$record['path']] = $record['inventory'];
        }
        self::assertSame('admin_legacy_inventory', $recordsByPath['adm/config_form.php']);
        self::assertSame('admin_legacy_inventory', $recordsByPath['adm/sms_admin/config.php']);
        self::assertSame('shop_admin_legacy_inventory', $recordsByPath['adm/shop_admin/categoryform.php']);
        self::assertArrayNotHasKey('shop/index.php', $recordsByPath);
    }

    public function testRemovingAdminModuleFromRootGraphIsHardFailure(): void
    {
        $rootRoutes = (string)file_get_contents($this->fixtureRoot . '/api/routes/v1.php');
        $this->write('api/routes/v1.php', str_replace("        'admin.php',\n", '', $rootRoutes));

        [$exitCode, $output] = $this->runDocsCheck();

        self::assertGreaterThan(0, $exitCode, $output);
        self::assertStringContainsString('extra=1', $output);
        self::assertStringContainsString('GET /admin/status', $output);
        self::assertStringContainsString('OpenAPI에만 있고 선언 /v1 route graph에는 없는 경로', $output);
    }

    public function testRouteMethodDriftIsHardFailure(): void
    {
        $this->write('api/routes/v1/admin/core.php', <<<'PHP'
<?php
return function ($app): void {
    $app->post('/status', static fn () => null);
};
PHP);

        [$exitCode, $output] = $this->runDocsCheck();

        self::assertGreaterThan(0, $exitCode, $output);
        self::assertStringContainsString('missing=1', $output);
        self::assertStringContainsString('extra=1', $output);
        self::assertStringContainsString('POST /admin/status', $output);
        self::assertStringContainsString('GET /admin/status', $output);
    }

    public function testIncludeOnceModuleLoadIsPartOfReachableGraph(): void
    {
        foreach (['api/routes/v1.php', 'api/routes/v1/admin.php'] as $relativePath) {
            $source = (string)file_get_contents($this->fixtureRoot . '/' . $relativePath);
            $this->write($relativePath, str_replace('(require ', '(include_once ', $source));
        }

        [$exitCode, $output] = $this->runDocsCheck();

        self::assertSame(0, $exitCode, $output);
        self::assertStringContainsString('reachable_route_files=4', $output);
        self::assertStringContainsString('missing=0', $output);
        self::assertStringContainsString('extra=0', $output);
    }

    public function testDynamicRoutePathIsAnUnresolvedHardFailure(): void
    {
        $this->write('api/routes/v1/admin/core.php', <<<'PHP'
<?php
return function ($app): void {
    $path = '/status';
    $app->get($path, static fn () => null);
};
PHP);

        [$exitCode, $output] = $this->runDocsCheck();

        self::assertGreaterThan(0, $exitCode, $output);
        self::assertStringContainsString('unsupported get route path expression', $output);
        self::assertStringContainsString('라우트 선언 또는 모듈 로딩 그래프를 완전히 해석하지 못했습니다', $output);
    }

    public function testNonRouterGetCallsAreNotParsedAsRoutes(): void
    {
        $this->write('api/routes/v1/admin/core.php', <<<'PHP'
<?php
return function ($app, $container, $context): void {
    $container->get('service.id');
    $context->get('logger.id');
    $app->get('/status', static fn () => null);
};
PHP);

        [$exitCode, $output] = $this->runDocsCheck();

        self::assertSame(0, $exitCode, $output);
        self::assertStringContainsString('unresolved_route_graph_items=0', $output);
        self::assertStringContainsString('missing=0', $output);
        self::assertStringContainsString('extra=0', $output);
    }

    public function testInternalToolRouteDriftIsDeferredFromPhaseOneAdminGate(): void
    {
        $rootRoutes = (string)file_get_contents($this->fixtureRoot . '/api/routes/v1.php');
        $this->write('api/routes/v1.php', str_replace(
            "        'admin.php',\n",
            "        'admin-inspect.php',\n        'admin.php',\n",
            $rootRoutes
        ));
        $this->write('api/routes/v1/admin-inspect.php', <<<'PHP'
<?php
return function ($app): void {
    $app->get('/admin-inspect/hidden', static fn () => null);
};
PHP);

        [$exitCode, $output] = $this->runDocsCheck();

        self::assertSame(0, $exitCode, $output);
        self::assertStringContainsString('missing=1', $output);
        self::assertStringContainsString('active_missing=0', $output);
        self::assertStringContainsString('deferred_missing=1', $output);
        self::assertStringContainsString('GET /admin-inspect/hidden', $output);
    }

    public function testProtectedBoardRouteDriftIsHardFailureWhileConsumerIsDeferred(): void
    {
        $rootRoutes = (string)file_get_contents($this->fixtureRoot . '/api/routes/v1.php');
        $this->write('api/routes/v1.php', str_replace(
            "        'health.php',\n",
            "        'health.php',\n        'boards.php',\n",
            $rootRoutes
        ));
        $this->write('api/routes/v1/boards.php', <<<'PHP'
<?php
return function ($app): void {
    $app->get('/boards', static fn () => null);
};
PHP);
        $scopePath = $this->fixtureRoot . '/api/docs/openapi.phase1-consumer-scope.json';
        $scope = json_decode((string)file_get_contents($scopePath), true, 512, JSON_THROW_ON_ERROR);
        $scope['contract_inventory'] = [
            'expected_total_operations' => 3,
            'expected_operation_keys_sha256' => hash(
                'sha256',
                implode("\n", ['GET /admin/status', 'GET /boards', 'GET /health'])
            ),
            'expected_classification_counts' => [
                'active' => 2,
                'deferred_general_board' => 1,
            ],
        ];
        $scope['deferred_scope']['classifications'][] = [
            'id' => 'general_board',
            'include_paths' => ['/boards'],
            'include_path_prefixes' => ['/boards/'],
            'expected_operations' => ['GET /boards'],
        ];
        $this->write(
            'api/docs/openapi.phase1-consumer-scope.json',
            json_encode($scope, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR)
        );

        [$exitCode, $output] = $this->runDocsCheck();

        self::assertGreaterThan(0, $exitCode, $output);
        self::assertStringContainsString('protected_missing=1', $output);
        self::assertStringContainsString('GET /boards', $output);
        self::assertStringContainsString('보호된 일반 게시판 선언 route가 OpenAPI에 누락되었습니다', $output);
    }

    public function testShopAdminRouteDriftIsExcludedFromPhaseOneAdminGate(): void
    {
        $this->write('api/routes/v1/admin/core.php', <<<'PHP'
<?php
return function ($app): void {
    $app->get('/status', static fn () => null);
    $app->get('/shop/hidden', static fn () => null);
};
PHP);

        [$exitCode, $output] = $this->runDocsCheck();

        self::assertSame(0, $exitCode, $output);
        self::assertStringContainsString('missing=1', $output);
        self::assertStringContainsString('active_missing=0', $output);
        self::assertStringContainsString('deferred_missing=0', $output);
        self::assertStringContainsString('excluded_missing=1', $output);
        self::assertStringContainsString('GET /admin/shop/hidden', $output);
    }

    public function testZeroLegacyAdminScannerResultIsHardFailure(): void
    {
        self::assertTrue(unlink($this->fixtureRoot . '/adm/config_form.php'));
        self::assertTrue(unlink($this->fixtureRoot . '/adm/sms_admin/config.php'));
        self::assertTrue(unlink($this->fixtureRoot . '/adm/shop_admin/categoryform.php'));

        [$exitCode, $output] = $this->runDocsCheck();

        self::assertGreaterThan(0, $exitCode, $output);
        self::assertStringContainsString('legacy_admin_total=0', $output);
        self::assertStringContainsString('classification_records=0', $output);
        self::assertStringContainsString('adm/ 재귀 PHP scanner가 0건을 반환했습니다', $output);
    }

    /** @return array{int, string} */
    private function runDocsCheck(): array
    {
        $environment = getenv();
        self::assertIsArray($environment);
        $environment['DOCS_CHECK_PROVIDER_CLASSIFICATION_OUTPUT'] = $this->classificationOutput;

        $pipes = [];
        $process = proc_open(
            ['bash', 'scripts/docs-check.sh', '--provider-contract-only'],
            [
                1 => ['pipe', 'w'],
                2 => ['pipe', 'w'],
            ],
            $pipes,
            $this->fixtureRoot,
            $environment
        );
        self::assertIsResource($process);

        $stdout = stream_get_contents($pipes[1]);
        $stderr = stream_get_contents($pipes[2]);
        fclose($pipes[1]);
        fclose($pipes[2]);
        $exitCode = proc_close($process);

        return [$exitCode, (string)$stdout . (string)$stderr];
    }

    private function mkdir(string $relativePath): void
    {
        self::assertTrue(mkdir($this->fixtureRoot . '/' . $relativePath, 0777, true));
    }

    private function write(string $relativePath, string $contents): void
    {
        self::assertNotFalse(file_put_contents($this->fixtureRoot . '/' . $relativePath, $contents));
    }

    private function writeConsumerScope(): void
    {
        $this->write('api/docs/openapi.phase1-consumer-scope.json', json_encode([
            'schema' => 'gnuboard5.php.openapi-consumer-scope/v1',
            'scope_id' => 'test-admin',
            'contract' => 'api/docs/openapi.yaml',
            'contract_inventory' => [
                'expected_total_operations' => 2,
                'expected_operation_keys_sha256' => hash(
                    'sha256',
                    implode("\n", ['GET /admin/status', 'GET /health'])
                ),
                'expected_classification_counts' => [
                    'active' => 2,
                ],
            ],
            'active_scope' => [
                'include_path_prefixes' => ['/admin/'],
                'exclude_path_prefixes' => ['/admin/shop/'],
                'include_operations' => [
                    ['method' => 'GET', 'path' => '/health'],
                ],
                'expected_admin_non_shop_operations' => 1,
                'expected_bootstrap_operations' => 1,
                'expected_total_operations' => 2,
            ],
            'deferred_scope' => [
                'hard_fail' => false,
                'classifications' => [[
                    'id' => 'internal_tool',
                    'include_path_prefixes' => ['/admin-inspect/'],
                ]],
                'fallback_classification' => 'non_admin',
            ],
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR));
    }

    private function removeTree(string $path): void
    {
        if (!is_dir($path)) {
            return;
        }

        $iterator = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($path, \FilesystemIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::CHILD_FIRST
        );
        foreach ($iterator as $entry) {
            if ($entry->isDir()) {
                rmdir($entry->getPathname());
            } else {
                unlink($entry->getPathname());
            }
        }
        rmdir($path);
    }
}
