<?php

declare(strict_types=1);

namespace Tests\Setup;

use Api\Core\Database\PdoConnectionFactory;
use Api\Setup\Service\EnvironmentChecker;
use Api\Setup\Value\CheckResult;
use PHPUnit\Framework\TestCase;
use ReflectionClass;

final class EnvironmentCheckerTest extends TestCase
{
    /** @var array<string, string|null> */
    private array $envBackup = [];

    private string $dataPath;
    private mixed $pdoBackup = null;
    private mixed $fileEnvBackup = null;

    protected function setUp(): void
    {
        parent::setUp();

        $this->dataPath = sys_get_temp_dir() . '/g5-env-check-' . bin2hex(random_bytes(6));
        mkdir($this->dataPath, 0775, true);
        $this->backupPdoFactoryState();
    }

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

        if (is_dir($this->dataPath)) {
            @rmdir($this->dataPath);
        }

        $this->restorePdoFactoryState();
        parent::tearDown();
    }

    public function testRunRejectsUnsupportedEncryptFunction(): void
    {
        $this->setEnv('APP_ENV', 'local');
        $this->setEnv('DB_HOST', '127.0.0.1');
        $this->setEnv('DB_NAME', 'gnuboard5');
        $this->setEnv('DB_USER', 'root');
        $this->setEnv('DB_PASS', 'secret');
        $this->setEnv('JWT_SECRET', str_repeat('a', 32));
        $this->setEnv('DATA_PATH', $this->dataPath);
        $this->setEnv('G5_ENCRYPT_FUNC', 'sha256');
        $this->setEnv('SETUP_ENABLED', 'true');
        $this->setPdoFactoryState('pdo', null);
        $this->setPdoFactoryState('fileEnv', []);

        $checks = (new EnvironmentChecker())->run();
        $encryptCheck = $this->findCheck($checks, 'G5_ENCRYPT_FUNC compatible');

        self::assertInstanceOf(CheckResult::class, $encryptCheck);
        self::assertFalse($encryptCheck->passed);
        self::assertStringContainsString('create_hash 또는 sql_password', $encryptCheck->instruction);
    }

    /**
     * @param array<int, CheckResult> $checks
     */
    private function findCheck(array $checks, string $label): ?CheckResult
    {
        foreach ($checks as $check) {
            if ($check->label === $label) {
                return $check;
            }
        }

        return null;
    }

    private function setEnv(string $key, string $value): void
    {
        if (!array_key_exists($key, $this->envBackup)) {
            $this->envBackup[$key] = array_key_exists($key, $_ENV) ? (string)$_ENV[$key] : null;
        }

        $_ENV[$key] = $value;
        putenv($key . '=' . $value);
    }

    private function backupPdoFactoryState(): void
    {
        $this->pdoBackup = $this->getPdoFactoryState('pdo');
        $this->fileEnvBackup = $this->getPdoFactoryState('fileEnv');
    }

    private function restorePdoFactoryState(): void
    {
        $this->setPdoFactoryState('pdo', $this->pdoBackup);
        $this->setPdoFactoryState('fileEnv', $this->fileEnvBackup);
    }

    private function getPdoFactoryState(string $property): mixed
    {
        $reflection = new ReflectionClass(PdoConnectionFactory::class);
        $instance = $reflection->getProperty($property);

        return $instance->getValue();
    }

    private function setPdoFactoryState(string $property, mixed $value): void
    {
        $reflection = new ReflectionClass(PdoConnectionFactory::class);
        $instance = $reflection->getProperty($property);
        $instance->setValue(null, $value);
    }
}
