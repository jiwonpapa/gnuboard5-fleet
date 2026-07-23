<?php

declare(strict_types=1);

namespace Tests\Contract\G5Repository;

use Api\Board\Service\BoardService;
use Api\Core\Exception\NotFoundException;
use Api\Integration\Contracts\BoardGateway;
use Api\Setup\Controller\SetupController;
use Api\Setup\Service\EnvironmentChecker;
use Api\Support\Exception\ApiException;
use PHPUnit\Framework\TestCase;
use Slim\Psr7\Factory\ResponseFactory;
use Slim\Psr7\Factory\ServerRequestFactory;

final class FailureScenarioContractTest extends TestCase
{
    /** @var array<string, string|null> */
    private array $envBackup = [];

    protected function tearDown(): void
    {
        foreach ($this->envBackup as $key => $value) {
            if ($value === null) {
                unset($_ENV[$key]);
                putenv($key);
                continue;
            }

            $_ENV[$key] = $value;
            putenv($key . '=' . $value);
        }

        $this->envBackup = [];
        parent::tearDown();
    }

    public function testBoardServiceRejectsInvalidBoTableBeforeGatewayCall(): void
    {
        $gateway = new class () implements BoardGateway {
            public bool $called = false;

            public function findBoard(string $boTable): ?array
            {
                $this->called = true;
                return null;
            }

            public function listBoards(?string $groupId, ?int $memberLevel): array
            {
                return [];
            }

            public function exists(string $boTable): bool
            {
                return false;
            }

            public function getWriteTable(string $boTable): string
            {
                return '';
            }

            public function getBoardTable(): string
            {
                return '';
            }

            public function isGroupMember(string $groupId, string $memberId): bool
            {
                return false;
            }

            public function getConfig(): array
            {
                return ['cf_delay_sec' => 0];
            }
        };

        $service = new BoardService($gateway);

        try {
            $service->getBoard('../invalid');
            $this->fail('ApiException expected');
        } catch (ApiException $exception) {
            $this->assertSame(400, $exception->statusCode);
            $this->assertStringContainsString('bo_table', $exception->getMessage());
        }

        $this->assertFalse($gateway->called);
    }

    public function testSetupEndpointReturns404WhenDisabled(): void
    {
        $this->setEnv('SETUP_ENABLED', 'false');

        $controller = new SetupController(new EnvironmentChecker());
        $request = (new ServerRequestFactory())->createServerRequest('GET', '/api/setup');
        $response = (new ResponseFactory())->createResponse();

        $this->expectException(NotFoundException::class);
        $controller->index($request, $response);
    }

    public function testSetupCheckReportsMissingEnvKeys(): void
    {
        $this->setEnv('SETUP_ENABLED', 'true');
        $this->setEnv('APP_ENV', '');
        $this->setEnv('DB_HOST', '');
        $this->setEnv('DB_NAME', '');
        $this->setEnv('DB_USER', '');
        $this->setEnv('DB_PASS', '');
        $this->setEnv('JWT_SECRET', '');
        $this->setEnv('DATA_PATH', '');
        $this->setEnv('G5_ENCRYPT_FUNC', '');

        $controller = new SetupController(new EnvironmentChecker());
        $request = (new ServerRequestFactory())->createServerRequest('GET', '/api/setup');
        $response = (new ResponseFactory())->createResponse();
        $result = $controller->index($request, $response);

        $payload = json_decode((string)$result->getBody(), true);
        $this->assertIsArray($payload);
        $this->assertArrayHasKey('data', $payload);
        $this->assertArrayHasKey('checks', $payload['data']);

        $checks = is_array($payload['data']['checks']) ? $payload['data']['checks'] : [];
        $envCheck = null;
        foreach ($checks as $check) {
            if (!is_array($check)) {
                continue;
            }

            if (($check['label'] ?? '') === '.env required keys') {
                $envCheck = $check;
                break;
            }
        }

        $this->assertIsArray($envCheck);
        $this->assertFalse((bool)($envCheck['passed'] ?? true));
        $this->assertStringContainsString('APP_ENV', (string)($envCheck['instruction'] ?? ''));
    }

    private function setEnv(string $key, string $value): void
    {
        if (!array_key_exists($key, $this->envBackup)) {
            $this->envBackup[$key] = array_key_exists($key, $_ENV) ? (string)$_ENV[$key] : null;
        }

        $_ENV[$key] = $value;
        putenv($key . '=' . $value);
    }
}
