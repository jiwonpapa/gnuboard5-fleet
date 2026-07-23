<?php

/**
 * Phase 1 관리자 소비 범위 SSOT의 operation 분류와 exact count를 검증합니다.
 *
 * @package  Tests\Contract
 * @since    v1.1.0
 */

declare(strict_types=1);

namespace Tests\Contract;

use Gnuboard5\Audit\Phase1ConsumerScope;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Yaml\Yaml;

require_once dirname(__DIR__, 2) . '/scripts/lib/Phase1ConsumerScope.php';

final class Phase1ConsumerScopeTest extends TestCase
{
    private Phase1ConsumerScope $scope;

    protected function setUp(): void
    {
        parent::setUp();
        $this->scope = Phase1ConsumerScope::fromFile(
            dirname(__DIR__, 2) . '/api/docs/openapi.phase1-consumer-scope.json'
        );
    }

    public function testPhaseOneClassifiesAdminBootstrapAndDeferredSurfaces(): void
    {
        self::assertTrue($this->scope->isActiveOperationKey('GET /admin/boards'));
        self::assertTrue($this->scope->isActiveOperationKey('POST /auth/login'));
        self::assertTrue($this->scope->isBootstrapOperationKey('POST /auth/login'));
        self::assertSame(
            'excluded_admin_shop',
            $this->scope->classifyOperationKey('GET /admin/shop/catalog/products')
        );
        self::assertSame(
            'deferred_general_board',
            $this->scope->classifyOperationKey('GET /boards/{bo_table}/posts')
        );
        self::assertSame(
            'deferred_general_board',
            $this->scope->classifyOperationKey('GET /boards')
        );
        self::assertTrue($this->scope->isProtectedOperationKey('GET /boards'));
        self::assertTrue($this->scope->isProtectedOperationKey('GET /boards/future-surface'));
        self::assertSame(
            'deferred_internal_tool',
            $this->scope->classifyOperationKey('GET /admin-inspect/schema')
        );
    }

    public function testCanonicalOpenApiMatchesExactPhaseOneCounts(): void
    {
        $root = dirname(__DIR__, 2);
        $openapiPath = $root . '/api/docs/openapi.yaml';
        $this->scope->assertContractPath($root, $openapiPath);
        $document = Yaml::parseFile($openapiPath);
        self::assertIsArray($document);
        $operations = [];
        foreach ($document['paths'] ?? [] as $path => $pathItem) {
            if (!is_array($pathItem)) {
                continue;
            }
            foreach (['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace'] as $method) {
                if (is_array($pathItem[$method] ?? null)) {
                    $operations[] = strtoupper($method) . ' ' . $path;
                }
            }
        }

        $counts = $this->scope->operationCounts($operations);

        self::assertSame(189, $counts['active']);
        self::assertSame(184, $counts['admin_non_shop']);
        self::assertSame(5, $counts['bootstrap']);
        self::assertSame(97, $counts['deferred']);
        self::assertSame(26, $counts['excluded_admin_shop']);
        self::assertSame(26, $counts['deferred_general_board']);
        self::assertSame(3, $counts['deferred_internal_tool']);
        self::assertSame(68, $counts['deferred_non_admin']);
        self::assertSame([], $this->scope->inventoryFindings($operations));
        $this->scope->assertExpectedCounts($operations);
    }

    public function testRemovingProtectedBoardOperationFailsInventory(): void
    {
        $document = Yaml::parseFile(dirname(__DIR__, 2) . '/api/docs/openapi.yaml');
        self::assertIsArray($document);
        $operations = [];
        foreach ($document['paths'] ?? [] as $path => $pathItem) {
            if (!is_array($pathItem)) {
                continue;
            }
            foreach (['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace'] as $method) {
                if (is_array($pathItem[$method] ?? null)) {
                    $operations[] = strtoupper($method) . ' ' . $path;
                }
            }
        }
        $operations = array_values(array_diff($operations, ['GET /boards']));

        $rules = array_column($this->scope->inventoryFindings($operations), 'rule');

        self::assertContains('contract_operation_count_mismatch', $rules);
        self::assertContains('contract_classification_count_mismatch', $rules);
        self::assertContains('protected_operation_missing', $rules);
    }

    public function testReplacingOperationWithoutChangingCountsFailsExactInventory(): void
    {
        $document = Yaml::parseFile(dirname(__DIR__, 2) . '/api/docs/openapi.yaml');
        self::assertIsArray($document);
        $operations = [];
        foreach ($document['paths'] ?? [] as $path => $pathItem) {
            if (!is_array($pathItem)) {
                continue;
            }
            foreach (['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace'] as $method) {
                if (is_array($pathItem[$method] ?? null)) {
                    $operations[] = strtoupper($method) . ' ' . $path;
                }
            }
        }
        $index = array_search('GET /config', $operations, true);
        self::assertIsInt($index);
        $operations[$index] = 'GET /config-v2';

        $findings = $this->scope->inventoryFindings($operations);
        $rules = array_column($findings, 'rule');

        self::assertSame(['contract_operation_set_mismatch'], $rules);
    }
}
