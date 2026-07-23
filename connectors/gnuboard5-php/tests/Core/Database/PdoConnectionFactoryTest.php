<?php

declare(strict_types=1);

namespace Tests\Core\Database;

use Api\Core\Database\PdoConnectionFactory;
use PHPUnit\Framework\TestCase;
use ReflectionClass;

final class PdoConnectionFactoryTest extends TestCase
{
    /** @var array<string, string|false> */
    private array $envBackup = [];
    private mixed $pdoBackup = null;
    private mixed $fileEnvBackup = null;

    protected function setUp(): void
    {
        parent::setUp();
        $this->backupPdoFactoryState();

        foreach ($this->managedEnvKeys() as $key) {
            $this->envBackup[$key] = getenv($key);
            putenv($key);
            unset($_ENV[$key]);
        }
    }

    protected function tearDown(): void
    {
        foreach ($this->managedEnvKeys() as $key) {
            $previous = $this->envBackup[$key] ?? false;
            if ($previous === false) {
                putenv($key);
                unset($_ENV[$key]);
                continue;
            }

            putenv($key . '=' . $previous);
            $_ENV[$key] = (string)$previous;
        }

        $this->restorePdoFactoryState();
        parent::tearDown();
    }

    public function testDbSettingsPreferFileEnvButKeepUntrimmedPasswordFallback(): void
    {
        $this->setPdoFactoryState('pdo', null);
        $this->setPdoFactoryState('fileEnv', [
            'DB_HOST' => ' file-host ',
            'DB_PORT' => '3307',
        ]);
        putenv('DB_NAME= runtime-db ');
        $_ENV['DB_NAME'] = ' runtime-db ';
        putenv('DB_USER= runtime-user ');
        $_ENV['DB_USER'] = ' runtime-user ';
        putenv('DB_PASS=  secret-with-spaces  ');
        $_ENV['DB_PASS'] = '  secret-with-spaces  ';

        $settings = PdoConnectionFactory::dbSettings();

        self::assertSame('file-host', $settings['host']);
        self::assertSame('3307', $settings['port']);
        self::assertSame('runtime-db', $settings['db_name']);
        self::assertSame('runtime-user', $settings['user']);
        self::assertSame('  secret-with-spaces  ', $settings['password']);
        self::assertSame('utf8mb4', $settings['charset']);
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

    /**
     * @return list<string>
     */
    private function managedEnvKeys(): array
    {
        return [
            'DB_HOST',
            'DB_PORT',
            'DB_NAME',
            'DB_USER',
            'DB_PASS',
            'DB_CHARSET',
        ];
    }
}
