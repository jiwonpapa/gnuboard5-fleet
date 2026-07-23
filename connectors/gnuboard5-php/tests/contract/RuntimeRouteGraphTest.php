<?php

/**
 * 실제 Slim RouteCollector 기반 runtime route graph 증적을 검증합니다.
 *
 * @package  Tests\Contract
 * @since    v1.1.0
 */

declare(strict_types=1);

namespace Tests\Contract;

use PHPUnit\Framework\TestCase;

final class RuntimeRouteGraphTest extends TestCase
{
    public function testRuntimeRouteGraphContainsHandlersAndMiddleware(): void
    {
        $outputPath = sys_get_temp_dir() . '/g5-runtime-routes-' . bin2hex(random_bytes(8)) . '.json';

        try {
            [$exitCode, $output] = $this->runExtractor($outputPath, true);

            self::assertSame(0, $exitCode, $output);
            $payload = json_decode(
                (string)file_get_contents($outputPath),
                true,
                512,
                JSON_THROW_ON_ERROR
            );

            self::assertSame('gnuboard5.php.runtime-route-graph/v3', $payload['schema']);
            self::assertSame('passed', $payload['status']);
            self::assertSame(0, $payload['stats']['unresolved_handler_count']);
            self::assertSame(0, $payload['stats']['duplicate_operation_count']);
            self::assertGreaterThanOrEqual(315, $payload['stats']['v1_operation_count']);
            foreach ($payload['routes'] as $route) {
                self::assertStringNotContainsString(dirname(__DIR__, 2), (string)($route['source'] ?? ''));
                self::assertStringNotContainsString(dirname(__DIR__, 2), (string)($route['handler_source'] ?? ''));
            }

            $mails = $this->findRoute($payload['routes'], 'GET', '/v1/admin/system/mails');
            self::assertSame('AdminSystemController::listMails', $mails['handler']);
            self::assertSame('Api\\Admin\\System\\Controller\\AdminSystemController', $mails['handler_class']);
            self::assertSame('listMails', $mails['handler_method']);
            self::assertSame(
                'api/v1/Admin/System/Controller/AdminSystemController.php',
                $mails['handler_source']
            );
            self::assertContains('Api\\Middlewares\\JwtAuthMiddleware', $mails['middleware']);
            self::assertContains('Api\\Core\\Middleware\\AdminGuardMiddleware', $mails['middleware']);

            $grant = $this->findRoute(
                $payload['routes'],
                'POST',
                '/v1/p/board-reward/reward-grants'
            );
            self::assertSame('BoardRewardController::grantReward', $grant['handler']);
            self::assertNotContains('Api\\Middlewares\\JwtAuthMiddleware', $grant['middleware']);
        } finally {
            if (is_file($outputPath)) {
                unlink($outputPath);
            }
        }
    }

    public function testDeferredRuntimeDriftDoesNotBlockPhaseOneAdminScope(): void
    {
        $outputPath = sys_get_temp_dir() . '/g5-runtime-routes-' . bin2hex(random_bytes(8)) . '.json';

        try {
            [$exitCode, $output] = $this->runExtractor($outputPath, false);

            self::assertSame(0, $exitCode, $output);
            self::assertStringContainsString('active_missing_in_openapi=0', $output);
            self::assertStringContainsString('deferred_missing_in_openapi=3', $output);
            self::assertStringContainsString('active_security_mismatches=0', $output);
            self::assertStringContainsString('protected_security_mismatches=0', $output);
            self::assertStringContainsString('deferred_security_mismatches=3', $output);
            self::assertStringContainsString('active_response_contract_mismatches=0', $output);
            self::assertStringContainsString('protected_response_contract_mismatches=0', $output);
            self::assertStringContainsString('deferred_response_contract_mismatches=0', $output);
            self::assertStringContainsString('active_handler_bindings=189', $output);
            self::assertStringContainsString('protected_handler_bindings=26', $output);
            self::assertStringContainsString('audited_handler_bindings=215', $output);
        } finally {
            if (is_file($outputPath)) {
                unlink($outputPath);
            }
        }
    }

    public function testActiveAdminRuntimeDriftStillFailsClosed(): void
    {
        $outputPath = sys_get_temp_dir() . '/g5-runtime-routes-' . bin2hex(random_bytes(8)) . '.json';
        $openapiPath = sys_get_temp_dir() . '/g5-runtime-openapi-' . bin2hex(random_bytes(8)) . '.yaml';
        $scopePath = sys_get_temp_dir() . '/g5-runtime-scope-' . bin2hex(random_bytes(8)) . '.json';
        $openapi = file_get_contents(dirname(__DIR__, 2) . '/api/docs/openapi.yaml');
        self::assertIsString($openapi);
        self::assertNotFalse(file_put_contents(
            $openapiPath,
            str_replace('  /admin/system/mails:', '  /admin/system/mails-missing:', $openapi)
        ));
        $this->writeScopeForOpenApi($openapiPath, $scopePath);

        try {
            [$exitCode, $output] = $this->runExtractor($outputPath, false, $openapiPath, $scopePath);

            self::assertGreaterThan(0, $exitCode, $output);
            self::assertStringContainsString('active_missing_in_openapi=1', $output);
            self::assertStringContainsString('active_extra_in_openapi=1', $output);
            self::assertStringContainsString('GET /admin/system/mails', $output);
        } finally {
            foreach ([$outputPath, $openapiPath, $scopePath] as $path) {
                if (is_file($path)) {
                    unlink($path);
                }
            }
        }
    }

    public function testProtectedBoardRuntimeDriftFailsEvenWhileConsumerIsDeferred(): void
    {
        $outputPath = sys_get_temp_dir() . '/g5-runtime-routes-' . bin2hex(random_bytes(8)) . '.json';
        $openapiPath = sys_get_temp_dir() . '/g5-runtime-openapi-' . bin2hex(random_bytes(8)) . '.yaml';
        $scopePath = sys_get_temp_dir() . '/g5-runtime-scope-' . bin2hex(random_bytes(8)) . '.json';
        $openapi = file_get_contents(dirname(__DIR__, 2) . '/api/docs/openapi.yaml');
        self::assertIsString($openapi);
        self::assertNotFalse(file_put_contents(
            $openapiPath,
            str_replace('  /boards:', '  /boards-missing:', $openapi)
        ));
        $this->writeScopeForOpenApi($openapiPath, $scopePath);

        try {
            [$exitCode, $output] = $this->runExtractor($outputPath, false, $openapiPath, $scopePath);

            self::assertGreaterThan(0, $exitCode, $output);
            self::assertStringContainsString('protected_missing_in_openapi=1', $output);
            self::assertStringContainsString('FAIL [protected_missing_in_openapi] GET /boards', $output);
        } finally {
            foreach ([$outputPath, $openapiPath, $scopePath] as $path) {
                if (is_file($path)) {
                    unlink($path);
                }
            }
        }
    }

    public function testProtectedBoardOptionalAuthDriftFailsEvenWhileConsumerIsDeferred(): void
    {
        $outputPath = sys_get_temp_dir() . '/g5-runtime-routes-' . bin2hex(random_bytes(8)) . '.json';
        $openapiPath = sys_get_temp_dir() . '/g5-runtime-openapi-' . bin2hex(random_bytes(8)) . '.yaml';
        $scopePath = sys_get_temp_dir() . '/g5-runtime-scope-' . bin2hex(random_bytes(8)) . '.json';
        $openapi = file_get_contents(dirname(__DIR__, 2) . '/api/docs/openapi.yaml');
        self::assertIsString($openapi);
        $optionalSecurity = <<<'YAML'
      operationId: listNewPosts
      security:
        - {}
        - bearerAuth: []
YAML;
        $requiredSecurity = <<<'YAML'
      operationId: listNewPosts
      security:
        - bearerAuth: []
YAML;
        self::assertStringContainsString($optionalSecurity, $openapi);
        self::assertNotFalse(file_put_contents(
            $openapiPath,
            str_replace($optionalSecurity, $requiredSecurity, $openapi)
        ));
        $this->writeScopeForOpenApi($openapiPath, $scopePath);

        try {
            [$exitCode, $output] = $this->runExtractor($outputPath, false, $openapiPath, $scopePath);

            self::assertGreaterThan(0, $exitCode, $output);
            self::assertStringContainsString('protected_security_mismatches=1', $output);
            self::assertStringContainsString('FAIL [protected_security] GET /boards/new-posts', $output);
        } finally {
            foreach ([$outputPath, $openapiPath, $scopePath] as $path) {
                if (is_file($path)) {
                    unlink($path);
                }
            }
        }
    }

    public function testActiveCreatedLocationHeaderDriftFailsClosed(): void
    {
        $outputPath = sys_get_temp_dir() . '/g5-runtime-routes-' . bin2hex(random_bytes(8)) . '.json';
        $openapiPath = sys_get_temp_dir() . '/g5-runtime-openapi-' . bin2hex(random_bytes(8)) . '.yaml';
        $scopePath = sys_get_temp_dir() . '/g5-runtime-scope-' . bin2hex(random_bytes(8)) . '.json';
        $openapi = file_get_contents(dirname(__DIR__, 2) . '/api/docs/openapi.yaml');
        self::assertIsString($openapi);

        $operationOffset = strpos($openapi, 'operationId: adminCreateBoardGroup');
        self::assertIsInt($operationOffset);
        $nextOperationOffset = strpos($openapi, 'operationId:', $operationOffset + 1);
        self::assertIsInt($nextOperationOffset);
        $operationYaml = substr($openapi, $operationOffset, $nextOperationOffset - $operationOffset);
        $locationHeader = <<<'YAML'
          headers:
            Location:
              $ref: '#/components/headers/Location'
YAML;
        self::assertStringContainsString($locationHeader, $operationYaml);
        $mutatedOperationYaml = str_replace($locationHeader, '', $operationYaml, $replacementCount);
        self::assertSame(1, $replacementCount);
        $mutatedOpenapi = substr($openapi, 0, $operationOffset)
            . $mutatedOperationYaml
            . substr($openapi, $nextOperationOffset);
        self::assertNotFalse(file_put_contents($openapiPath, $mutatedOpenapi));
        $this->writeScopeForOpenApi($openapiPath, $scopePath);

        try {
            [$exitCode, $output] = $this->runExtractor($outputPath, false, $openapiPath, $scopePath);

            self::assertGreaterThan(0, $exitCode, $output);
            self::assertStringContainsString('active_response_contract_mismatches=1', $output);
            self::assertStringContainsString(
                'FAIL [response_contract] POST /admin/board-groups',
                $output
            );
        } finally {
            foreach ([$outputPath, $openapiPath, $scopePath] as $path) {
                if (is_file($path)) {
                    unlink($path);
                }
            }
        }
    }

    public function testActiveCreatedStatusDriftFailsClosed(): void
    {
        $outputPath = sys_get_temp_dir() . '/g5-runtime-routes-' . bin2hex(random_bytes(8)) . '.json';
        $openapiPath = sys_get_temp_dir() . '/g5-runtime-openapi-' . bin2hex(random_bytes(8)) . '.yaml';
        $scopePath = sys_get_temp_dir() . '/g5-runtime-scope-' . bin2hex(random_bytes(8)) . '.json';
        $openapi = file_get_contents(dirname(__DIR__, 2) . '/api/docs/openapi.yaml');
        self::assertIsString($openapi);

        $operationOffset = strpos($openapi, 'operationId: adminCreateBoardGroup');
        self::assertIsInt($operationOffset);
        $nextOperationOffset = strpos($openapi, 'operationId:', $operationOffset + 1);
        self::assertIsInt($nextOperationOffset);
        $operationYaml = substr($openapi, $operationOffset, $nextOperationOffset - $operationOffset);
        self::assertStringContainsString("        '201':", $operationYaml);
        $mutatedOperationYaml = str_replace("        '201':", "        '200':", $operationYaml, $replacementCount);
        self::assertSame(1, $replacementCount);
        $mutatedOpenapi = substr($openapi, 0, $operationOffset)
            . $mutatedOperationYaml
            . substr($openapi, $nextOperationOffset);
        self::assertNotFalse(file_put_contents($openapiPath, $mutatedOpenapi));
        $this->writeScopeForOpenApi($openapiPath, $scopePath);

        try {
            [$exitCode, $output] = $this->runExtractor($outputPath, false, $openapiPath, $scopePath);

            self::assertGreaterThan(0, $exitCode, $output);
            self::assertStringContainsString('active_response_contract_mismatches=1', $output);
            self::assertStringContainsString('201 status 계약/runtime 선언 불일치', $output);
        } finally {
            foreach ([$outputPath, $openapiPath, $scopePath] as $path) {
                if (is_file($path)) {
                    unlink($path);
                }
            }
        }
    }

    public function testActiveExplicitResponseStatusDriftFailsClosed(): void
    {
        $outputPath = sys_get_temp_dir() . '/g5-runtime-routes-' . bin2hex(random_bytes(8)) . '.json';
        $openapiPath = sys_get_temp_dir() . '/g5-runtime-openapi-' . bin2hex(random_bytes(8)) . '.yaml';
        $scopePath = sys_get_temp_dir() . '/g5-runtime-scope-' . bin2hex(random_bytes(8)) . '.json';
        $openapi = file_get_contents(dirname(__DIR__, 2) . '/api/docs/openapi.yaml');
        self::assertIsString($openapi);

        $operationOffset = strpos($openapi, 'operationId: adminDeleteFaq');
        self::assertIsInt($operationOffset);
        $nextOperationOffset = strpos($openapi, 'operationId:', $operationOffset + 1);
        self::assertIsInt($nextOperationOffset);
        $operationYaml = substr($openapi, $operationOffset, $nextOperationOffset - $operationOffset);
        self::assertStringContainsString("        '204':", $operationYaml);
        $mutatedOperationYaml = str_replace("        '204':", "        '200':", $operationYaml, $replacementCount);
        self::assertSame(1, $replacementCount);
        $mutatedOpenapi = substr($openapi, 0, $operationOffset)
            . $mutatedOperationYaml
            . substr($openapi, $nextOperationOffset);
        self::assertNotFalse(file_put_contents($openapiPath, $mutatedOpenapi));
        $this->writeScopeForOpenApi($openapiPath, $scopePath);

        try {
            [$exitCode, $output] = $this->runExtractor($outputPath, false, $openapiPath, $scopePath);

            self::assertGreaterThan(0, $exitCode, $output);
            self::assertStringContainsString('active_response_contract_mismatches=1', $output);
            self::assertStringContainsString('명시 runtime status OpenAPI 누락: 204', $output);
        } finally {
            foreach ([$outputPath, $openapiPath, $scopePath] as $path) {
                if (is_file($path)) {
                    unlink($path);
                }
            }
        }
    }

    /** @return array{int, string} */
    private function runExtractor(
        string $outputPath,
        bool $noCompare,
        ?string $openapiPath = null,
        ?string $consumerScopePath = null
    ): array {
        $command = [
            PHP_BINARY,
            dirname(__DIR__, 2) . '/scripts/extract_runtime_route_graph.php',
            '--output',
            $outputPath,
        ];
        if ($noCompare) {
            $command[] = '--no-compare';
        }
        if ($openapiPath !== null) {
            $command[] = '--openapi';
            $command[] = $openapiPath;
        }
        if ($consumerScopePath !== null) {
            $command[] = '--consumer-scope';
            $command[] = $consumerScopePath;
        }

        $pipes = [];
        $process = proc_open(
            $command,
            [
                1 => ['pipe', 'w'],
                2 => ['pipe', 'w'],
            ],
            $pipes,
            dirname(__DIR__, 2)
        );
        self::assertIsResource($process);
        $stdout = stream_get_contents($pipes[1]);
        $stderr = stream_get_contents($pipes[2]);
        fclose($pipes[1]);
        fclose($pipes[2]);

        return [proc_close($process), (string)$stdout . (string)$stderr];
    }

    private function writeScopeForOpenApi(string $openapiPath, string $scopePath): void
    {
        $scope = json_decode(
            (string)file_get_contents(dirname(__DIR__, 2) . '/api/docs/openapi.phase1-consumer-scope.json'),
            true,
            512,
            JSON_THROW_ON_ERROR
        );
        $scope['contract'] = $openapiPath;
        self::assertNotFalse(file_put_contents(
            $scopePath,
            json_encode($scope, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR)
        ));
    }

    /**
     * @param array<int, array<string, mixed>> $routes
     * @return array<string, mixed>
     */
    private function findRoute(array $routes, string $method, string $path): array
    {
        foreach ($routes as $route) {
            if (($route['method'] ?? null) === $method && ($route['path'] ?? null) === $path) {
                return $route;
            }
        }

        self::fail(sprintf('Runtime route not found: %s %s', $method, $path));
    }
}
