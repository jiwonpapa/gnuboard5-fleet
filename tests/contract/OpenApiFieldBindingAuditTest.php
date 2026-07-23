<?php

/**
 * PHP payload field binding 감사의 pass/fail-closed 변이를 검증합니다.
 *
 * @package  Tests\Contract
 * @since    v1.1.0
 */

declare(strict_types=1);

namespace Tests\Contract;

use Gnuboard5\Audit\OpenApiFieldBindingAudit;
use Gnuboard5\Audit\PhpFieldFlowAnalyzer;
use PHPUnit\Framework\TestCase;

require_once dirname(__DIR__, 2) . '/scripts/lib/Phase1ConsumerScope.php';
require_once dirname(__DIR__, 2) . '/scripts/lib/OpenApiFieldBindingAudit.php';

final class OpenApiFieldBindingAuditTest extends TestCase
{
    private string $root;

    protected function setUp(): void
    {
        parent::setUp();
        $this->root = sys_get_temp_dir() . '/g5-field-binding-' . bin2hex(random_bytes(8));
        $this->mkdir('api/v1/Demo/Controller');
        $this->mkdir('api/v1/Demo/Service');
        $this->mkdir('api/v1/Demo/Repository');
        $this->mkdir('api/docs');
        $this->mkdir('output');
        $this->writeSources(false);
        $this->writeOpenApi('name', 'string');
        $this->writeConsumerScope();
        $this->writePolicy();
        $openapiSha = hash_file('sha256', $this->root . '/api/docs/openapi.yaml');
        self::assertIsString($openapiSha);
        $this->writeRuntimeGraph($openapiSha);
    }

    protected function tearDown(): void
    {
        $this->removeTree($this->root);
        parent::tearDown();
    }

    public function testExactRequestAndResponseFieldFlowCanPass(): void
    {
        $report = $this->runAudit();

        self::assertSame('passed', $report['status']);
        self::assertTrue($report['certified']);
        self::assertSame(1, $report['stats']['active_operation_count']);
        self::assertSame(1, $report['stats']['admin_non_shop_operation_count']);
        self::assertSame(0, $report['stats']['bootstrap_operation_count']);
        self::assertSame(1, $report['stats']['passed_operation_count']);
        self::assertSame([], $report['findings']);
        self::assertSame([], $report['operations'][0]['undocumented_implementation_fields']);
        self::assertSame(
            ['body:attachment', 'body:ids', 'body:ids[]', 'body:labels', 'body:labels[].code', 'body:name', 'body:status'],
            array_keys($report['operations'][0]['observed_request_reads'])
        );
        self::assertContains('data.id', $report['operations'][0]['observed_response_fields']);
        self::assertContains('data.items[].code', $report['operations'][0]['observed_response_fields']);
        self::assertSame(['Controller', 'Repository', 'Service'], $report['operations'][0]['required_layers']);
        self::assertSame([], $report['operations'][0]['missing_required_layers']);
        self::assertSame(1, $report['stats']['layer_reach_operation_counts']['Repository']);
        self::assertMatchesRegularExpression('/^[a-f0-9]{64}$/', $report['inputs']['analyzer_sha256']);
        self::assertMatchesRegularExpression('/^[a-f0-9]{64}$/', $report['inputs']['php_source_fingerprint_sha256']);
    }

    public function testOpenApiFieldRenameIsARequestBindingFailure(): void
    {
        $this->writeOpenApi('title', 'string');
        $openapiSha = hash_file('sha256', $this->root . '/api/docs/openapi.yaml');
        self::assertIsString($openapiSha);
        $this->writeRuntimeGraph($openapiSha);

        $report = $this->runAudit();

        self::assertSame('failed', $report['status']);
        self::assertContains('body:title', $report['operations'][0]['missing_request_fields']);
        self::assertContains('body:name', $report['operations'][0]['undocumented_implementation_fields']);
    }

    public function testDynamicRequestFieldAndStaleRuntimeGraphFailClosed(): void
    {
        $this->writeSources(true);
        $this->writeRuntimeGraph(str_repeat('0', 64));

        $report = $this->runAudit();

        self::assertSame('failed', $report['status']);
        self::assertGreaterThan(0, $report['stats']['finding_counts']['dynamic_input_access'] ?? 0);
        self::assertSame(1, $report['stats']['finding_counts']['runtime_graph_openapi_stale'] ?? 0);
    }

    public function testStaleConsumerScopeFingerprintFailsClosed(): void
    {
        $runtimePath = $this->root . '/output/runtime.json';
        $runtime = json_decode((string)file_get_contents($runtimePath), true, 512, JSON_THROW_ON_ERROR);
        $runtime['consumer_scope_sha256'] = str_repeat('0', 64);
        $this->write(
            'output/runtime.json',
            json_encode($runtime, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR)
        );

        $report = $this->runAudit();

        self::assertSame('failed', $report['status']);
        self::assertSame(1, $report['stats']['finding_counts']['runtime_graph_consumer_scope_stale'] ?? 0);
    }

    public function testOpenApiFieldTypeMismatchIsSemanticFailure(): void
    {
        $this->writeOpenApi('name', 'integer');
        $openapiSha = hash_file('sha256', $this->root . '/api/docs/openapi.yaml');
        self::assertIsString($openapiSha);
        $this->writeRuntimeGraph($openapiSha);

        $report = $this->runAudit();

        self::assertSame('failed', $report['status']);
        self::assertContains('request_semantics_unproven', $report['operations'][0]['finding_rules']);
        self::assertContains('type_mismatch', $report['operations'][0]['request_semantics_unproven'][0]['issues']);
    }

    public function testOptionalResponseFieldMayBeAbsent(): void
    {
        $report = $this->runAudit();

        self::assertSame('passed', $report['status']);
        self::assertSame([], $report['operations'][0]['missing_response_fields']);
    }

    public function testRequiredResponseFieldMustBeObserved(): void
    {
        $openapiPath = $this->root . '/api/docs/openapi.yaml';
        $openapi = file_get_contents($openapiPath);
        self::assertIsString($openapi);
        $this->write(
            'api/docs/openapi.yaml',
            str_replace(
                'required: [server_time, version]',
                'required: [server_time, version, trace_id]',
                $openapi
            )
        );
        $openapiSha = hash_file('sha256', $openapiPath);
        self::assertIsString($openapiSha);
        $this->writeRuntimeGraph($openapiSha);

        $report = $this->runAudit();

        self::assertSame('failed', $report['status']);
        self::assertContains('response_fields_unbound', $report['operations'][0]['finding_rules']);
        self::assertContains('meta.trace_id', $report['operations'][0]['missing_response_fields']);
    }

    public function testMissingOperationIdAndHandlerSourceFailClosed(): void
    {
        $openapiPath = $this->root . '/api/docs/openapi.yaml';
        $openapi = file_get_contents($openapiPath);
        self::assertIsString($openapi);
        $this->write('api/docs/openapi.yaml', str_replace('      operationId: adminCreateDemo' . PHP_EOL, '', $openapi));
        $openapiSha = hash_file('sha256', $openapiPath);
        self::assertIsString($openapiSha);
        $this->writeRuntimeGraph($openapiSha);
        $runtimePath = $this->root . '/output/runtime.json';
        $runtime = json_decode((string)file_get_contents($runtimePath), true, 512, JSON_THROW_ON_ERROR);
        unset($runtime['bindings'][0]['handler_source']);
        $this->write(
            'output/runtime.json',
            json_encode($runtime, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR)
        );

        $report = $this->runAudit();

        self::assertSame('failed', $report['status']);
        self::assertContains('operation_id_missing', $report['operations'][0]['finding_rules']);
        self::assertContains('handler_source_missing', $report['operations'][0]['finding_rules']);
    }

    public function testClassConstantFieldListAndDiBindingAreResolved(): void
    {
        $this->mkdir('api/v1/Demo/Contracts');
        $this->write('api/v1/Demo/Contracts/DemoGateway.php', <<<'PHP'
<?php
namespace Api\Demo\Contracts;
interface DemoGateway { public function create(string $name, string $status): array; }
PHP);
        $this->write('api/v1/Demo/definitions.php', <<<'PHP'
<?php
return [
    \Api\Demo\Contracts\DemoGateway::class => \DI\autowire(\Api\Demo\Repository\DemoRepository::class),
];
PHP);
        $this->write('api/v1/Demo/Service/DemoService.php', <<<'PHP'
<?php
namespace Api\Demo\Service;
use Api\Demo\Contracts\DemoGateway;
final class DemoService {
    private const STRING_FIELDS = ['name', 'status'];
    public function __construct(private readonly DemoGateway $repository) {}
    public function create(array $payload): array {
        $normalized = [];
        foreach (self::STRING_FIELDS as $field) {
            if (array_key_exists($field, $payload)) {
                $normalized[$field] = trim((string)$payload[$field]);
            }
        }
        $name = (string)($normalized['name'] ?? '');
        $status = (string)($normalized['status'] ?? 'active');
        if (!in_array($status, ['active', 'disabled'], true)) { throw new \RuntimeException(); }
        $ids = array_values(array_map('intval', (array)($payload['ids'] ?? [])));
        $labels = [];
        foreach ((array)($payload['labels'] ?? []) as $label) {
            $labels[] = ['code' => trim((string)($label['code'] ?? ''))];
        }
        return $this->repository->create($name, $status);
    }
    public function consumeUpload($upload): void { $upload->getStream()->read(8192); }
}
PHP);

        $report = $this->runAudit();

        self::assertSame('passed', $report['status']);
        self::assertSame([], $report['operations'][0]['dynamic_accesses']);
        self::assertSame([], $report['operations'][0]['missing_required_layers']);
        self::assertContains('Repository', $report['operations'][0]['observed_layers']);
    }

    public function testLargeCanonicalFieldListRemainsStaticallyExpandable(): void
    {
        $method = new \ReflectionMethod(PhpFieldFlowAnalyzer::class, 'foreachIterations');
        $fields = array_map(static fn (int $index): string => 'field_' . $index, range(1, 153));

        $iterations = $method->invoke(null, [
            'taints' => [],
            'fields' => [],
            'literals' => $fields,
            'members' => ['[]' => [
                'taints' => [],
                'fields' => [],
                'literals' => $fields,
                'members' => [],
            ]],
        ]);

        self::assertCount(153, $iterations);
        self::assertSame(['field_1'], $iterations[0]['value']['literals']);
        self::assertSame(['field_153'], $iterations[152]['value']['literals']);
    }

    public function testUploadedFileArrayEvidenceIsAcceptedOnlyForBinaryStrings(): void
    {
        $method = new \ReflectionMethod(OpenApiFieldBindingAudit::class, 'typeEvidenceMatches');

        self::assertTrue($method->invoke(null, 'string', ['php_array'], 'binary'));
        self::assertFalse($method->invoke(null, 'string', ['php_array'], null));
    }

    public function testEnvelopeCustomMetaAndSelfStaticPresenterFieldsAreResolved(): void
    {
        $this->mkdir('api/v1/Demo/Support');
        $controllerPath = $this->root . '/api/v1/Demo/Controller/DemoController.php';
        $controller = file_get_contents($controllerPath);
        self::assertIsString($controller);
        $this->write(
            'api/v1/Demo/Controller/DemoController.php',
            str_replace(
                '$created = $this->service->create($payload);' . PHP_EOL
                    . '        return ApiResponse::envelope($response, $created);',
                '$result = $this->service->create($payload);' . PHP_EOL
                    . "        return ApiResponse::envelope(\$response, \$result['item'], null, \$result['meta']);",
                $controller
            )
        );

        $servicePath = $this->root . '/api/v1/Demo/Service/DemoService.php';
        $service = file_get_contents($servicePath);
        self::assertIsString($service);
        $service = str_replace(
            'use Api\Demo\Repository\DemoRepository;',
            'use Api\Demo\Repository\DemoRepository;' . PHP_EOL . 'use Api\Demo\Support\DemoPresenter;',
            $service
        );
        $service = str_replace(
            "return \$this->repository()->create(\$normalized['name'], \$normalized['status']);",
            "\$row = \$this->repository()->create(\$normalized['name'], \$normalized['status']);" . PHP_EOL
                . "        return ['item' => DemoPresenter::present(\$row), 'meta' => ['total' => 1]];",
            $service
        );
        $this->write('api/v1/Demo/Service/DemoService.php', $service);
        $this->write('api/v1/Demo/Support/DemoPresenter.php', <<<'PHP'
<?php
namespace Api\Demo\Support;
final class DemoPresenter {
    public static function present(array $row): array {
        return [
            'id' => (int)($row['id'] ?? 0),
            'name' => (string)($row['name'] ?? ''),
            'status' => (string)($row['status'] ?? ''),
            'items' => $row['items'] ?? [],
            'nested' => self::nested(),
        ];
    }
    private static function nested(): array { return ['code' => 'presented']; }
}
PHP);

        $openApiPath = $this->root . '/api/docs/openapi.yaml';
        $openApi = file_get_contents($openApiPath);
        self::assertIsString($openApi);
        $openApi = str_replace(
            'required: [id, name, status, items]',
            'required: [id, name, status, items, nested]',
            $openApi
        );
        $openApi = str_replace(
            "                            code: {type: string}\n                  meta:",
            "                            code: {type: string}\n                      nested:\n                        type: object\n                        required: [code]\n                        properties:\n                          code: {type: string}\n                  meta:",
            $openApi
        );
        $openApi = str_replace(
            'required: [server_time, version]',
            'required: [server_time, version, total]',
            $openApi
        );
        $openApi = str_replace(
            '                      version: {type: string}',
            '                      version: {type: string}' . PHP_EOL . '                      total: {type: integer}',
            $openApi
        );
        $this->write('api/docs/openapi.yaml', $openApi);
        $openapiSha = hash_file('sha256', $openApiPath);
        self::assertIsString($openapiSha);
        $this->writeRuntimeGraph($openapiSha);

        $report = $this->runAudit();

        self::assertSame('passed', $report['status']);
        self::assertContains('data.nested.code', $report['operations'][0]['observed_response_fields']);
        self::assertContains('meta.total', $report['operations'][0]['observed_response_fields']);
        self::assertSame([], $report['operations'][0]['missing_response_fields']);
    }

    public function testDerivedMembersOfDeclaredScalarAreNotAdditionalRequestFields(): void
    {
        $method = new \ReflectionMethod(OpenApiFieldBindingAudit::class, 'isDerivedFromDeclaredScalar');
        $expected = [
            'body:code' => ['type' => 'string'],
            'body:options' => ['type' => 'object'],
        ];

        self::assertTrue($method->invoke(null, 'body:code[]', $expected));
        self::assertTrue($method->invoke(null, 'body:code.loaded.value', $expected));
        self::assertFalse($method->invoke(null, 'body:options.extra', $expected));
        self::assertFalse($method->invoke(null, 'body:other', $expected));
    }

    public function testPhpArrayEvidenceMatchesJsonArrayAndObject(): void
    {
        $method = new \ReflectionMethod(OpenApiFieldBindingAudit::class, 'typeEvidenceMatches');

        self::assertTrue($method->invoke(null, 'array', ['php_array']));
        self::assertTrue($method->invoke(null, 'object', ['php_array']));
        self::assertFalse($method->invoke(null, 'string', ['php_array']));
    }

    public function testEnumEvidenceCanBeProvenByTypedPartitions(): void
    {
        $method = new \ReflectionMethod(OpenApiFieldBindingAudit::class, 'enumEvidenceMatches');

        self::assertTrue($method->invoke(
            null,
            ['0', '1', 'true', 'false'],
            [[0, 1], ['1', 'true'], ['0', 'false']],
            'string'
        ));
        self::assertFalse($method->invoke(
            null,
            ['0', '1', 'true', 'false'],
            [['1', 'true'], ['0']],
            'string'
        ));
    }

    public function testAssignedInternalPayloadMemberDoesNotBecomeHttpRequestField(): void
    {
        $servicePath = $this->root . '/api/v1/Demo/Service/DemoService.php';
        $service = file_get_contents($servicePath);
        self::assertIsString($service);
        $this->write(
            'api/v1/Demo/Service/DemoService.php',
            str_replace(
                '        $status = (string)($normalized[\'status\'] ?? \'active\');',
                '        $payload[\'__internal_audit_at\'] = \'generated\';' . PHP_EOL
                    . '        $internal = $payload[\'__internal_audit_at\'];' . PHP_EOL
                    . '        $status = (string)($normalized[\'status\'] ?? \'active\');',
                $service
            )
        );

        $report = $this->runAudit();

        self::assertSame('passed', $report['status']);
        self::assertArrayNotHasKey(
            'body:__internal_audit_at',
            $report['operations'][0]['observed_request_reads']
        );
    }

    /** @return array<string, mixed> */
    private function runAudit(): array
    {
        return OpenApiFieldBindingAudit::run(
            $this->root,
            $this->root . '/api/docs/openapi.yaml',
            $this->root . '/output/runtime.json',
            $this->root . '/api/docs/policy.json'
        );
    }

    private function writeSources(bool $dynamic): void
    {
        $this->write('api/v1/Demo/Controller/DemoController.php', <<<'PHP'
<?php
namespace Api\Demo\Controller;
use Api\Demo\Service\DemoService;
use Api\Support\Http\ApiResponse;
final class DemoController {
    public function __construct(private readonly DemoService $service) {}
    public function create($request, $response) {
        $payload = ApiResponse::parseJsonBody($request);
        $uploads = $request->getUploadedFiles();
        if (isset($uploads['attachment'])) { $this->service->consumeUpload($uploads['attachment']); }
        $created = $this->service->create($payload);
        return ApiResponse::envelope($response, $created);
    }
}
PHP);
        $serviceBody = $dynamic
            ? <<<'PHP'
        $field = $payload['field_name'] ?? null;
        $name = trim((string)($payload[$field] ?? ''));
        $normalized = ['status' => $payload['status'] ?? 'active'];
PHP
            : <<<'PHP'
        $defaults = ['name' => '', 'status' => 'active'];
        $normalized = [];
        foreach ($defaults as $field => $default) {
            $normalized[$field] = array_key_exists($field, $payload) ? $payload[$field] : $default;
        }
        $name = $this->normalizeName((string)$normalized['name'], 'name');
PHP;
        $this->write('api/v1/Demo/Service/DemoService.php', <<<PHP
<?php
namespace Api\Demo\Service;
use Api\Demo\Repository\DemoRepository;
final class DemoService {
    public function __construct(private readonly DemoRepository \$repository) {}
    public function create(array \$payload): array {
{$serviceBody}
        \$status = (string)(\$normalized['status'] ?? 'active');
        \$allowedStatuses = ['active', 'disabled'];
        if (!in_array(\$status, \$allowedStatuses, true)) { throw new \RuntimeException(); }
        \$ids = array_values(array_map('intval', (array)(\$payload['ids'] ?? [])));
        \$labels = [];
        foreach ((array)(\$payload['labels'] ?? []) as \$label) {
            \$labels[] = ['code' => trim((string)(\$label['code'] ?? ''))];
        }
        if (str_starts_with(\$name, '02')) { \$name = trim(\$name); }
        \$normalized = ['name' => \$name, 'status' => \$status];
        return \$this->repository()->create(\$normalized['name'], \$normalized['status']);
    }
    private function normalizeName(string \$value, string \$field): string { return trim(\$value); }
    public function consumeUpload(\$upload): void { \$upload->getStream()->read(8192); }
    private function repository(): DemoRepository { return \$this->repository; }
}
PHP);
        $this->write('api/v1/Demo/Repository/DemoRepository.php', <<<'PHP'
<?php
namespace Api\Demo\Repository;
final class DemoRepository {
    public function create(string $name, string $status): array {
        $items = [];
        $items[] = ['code' => 'primary'];
        return ['id' => 1, 'name' => $name, 'status' => $status, 'items' => $items];
    }
}
PHP);
    }

    private function writeOpenApi(string $nameField, string $nameType): void
    {
        $this->write('api/docs/openapi.yaml', <<<YAML
openapi: 3.0.3
paths:
  /admin/demos:
    post:
      operationId: adminCreateDemo
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [{$nameField}]
              properties:
                ids:
                  type: array
                  items: {type: integer}
                labels:
                  type: array
                  items:
                    type: object
                    anyOf:
                      - required: [code]
                    properties:
                      code: {type: string}
                {$nameField}: {type: {$nameType}}
                status: {type: string, default: active, enum: [active, disabled]}
          multipart/form-data:
            schema:
              type: object
              properties:
                attachment: {type: string, format: binary}
      responses:
        '200':
          description: ok
          content:
            application/json:
              schema:
                type: object
                required: [data, meta]
                properties:
                  data:
                    type: object
                    required: [id, name, status, items]
                    properties:
                      id: {type: integer}
                      name: {type: string}
                      status: {type: string}
                      items:
                        type: array
                        items:
                          type: object
                          required: [code]
                          properties:
                            code: {type: string}
                  meta:
                    type: object
                    required: [server_time, version]
                    properties:
                      server_time: {type: string}
                      version: {type: string}
                      trace_id: {type: string}
                      context:
                        type: object
                        required: [trace_id]
                        properties:
                          trace_id: {type: string}
YAML);
    }

    private function writePolicy(): void
    {
        $this->write('api/docs/policy.json', json_encode([
            'schema' => 'gnuboard5.php.openapi-field-binding-policy/v1',
            'consumer_scope' => 'api/docs/consumer-scope.json',
            'source_roots' => ['api/v1'],
            'required_layers' => ['Controller', 'Service', 'Repository'],
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR));
    }

    private function writeConsumerScope(): void
    {
        $this->write('api/docs/consumer-scope.json', json_encode([
            'schema' => 'gnuboard5.php.openapi-consumer-scope/v1',
            'scope_id' => 'test-admin',
            'contract' => 'api/docs/openapi.yaml',
            'contract_inventory' => [
                'expected_total_operations' => 1,
                'expected_operation_keys_sha256' => hash('sha256', 'POST /admin/demos'),
                'expected_classification_counts' => [
                    'active' => 1,
                ],
            ],
            'active_scope' => [
                'include_path_prefixes' => ['/admin/'],
                'exclude_path_prefixes' => ['/admin/shop/'],
                'include_operations' => [],
                'expected_admin_non_shop_operations' => 1,
                'expected_bootstrap_operations' => 0,
                'expected_total_operations' => 1,
            ],
            'deferred_scope' => [
                'hard_fail' => false,
                'classifications' => [],
                'fallback_classification' => 'non_admin',
            ],
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR));
    }

    private function writeRuntimeGraph(string $openapiSha): void
    {
        $scopePath = $this->root . '/api/docs/consumer-scope.json';
        $scopeSha = hash_file('sha256', $scopePath);
        self::assertIsString($scopeSha);
        $this->write('output/runtime.json', json_encode([
            'schema' => 'gnuboard5.php.runtime-route-graph/v3',
            'openapi_sha256' => $openapiSha,
            'consumer_scope_id' => 'test-admin',
            'consumer_scope_sha256' => $scopeSha,
            'runtime_fingerprint_sha256' => str_repeat('a', 64),
            'bindings' => [[
                'operation' => 'POST /admin/demos',
                'operation_id' => 'adminCreateDemo',
                'handler' => 'DemoController::create',
                'handler_class' => 'Api\\Demo\\Controller\\DemoController',
                'handler_method' => 'create',
                'handler_source' => 'api/v1/Demo/Controller/DemoController.php',
            ]],
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR));
    }

    private function mkdir(string $relativePath): void
    {
        self::assertTrue(mkdir($this->root . '/' . $relativePath, 0777, true));
    }

    private function write(string $relativePath, string $contents): void
    {
        self::assertNotFalse(file_put_contents($this->root . '/' . $relativePath, $contents));
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
            $entry->isDir() ? rmdir($entry->getPathname()) : unlink($entry->getPathname());
        }
        rmdir($path);
    }
}
