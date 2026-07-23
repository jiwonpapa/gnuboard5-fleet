<?php

declare(strict_types=1);

namespace Tests\Core\Config;

use Api\Core\Config\EnvValueReader;
use PHPUnit\Framework\TestCase;

final class EnvValueReaderTest extends TestCase
{
    /** @var array<string, string|false> */
    private array $envBackup = [];

    protected function setUp(): void
    {
        parent::setUp();

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

        parent::tearDown();
    }

    public function testStringAndIntHelpersUseTrimmedValues(): void
    {
        $this->setEnv('TEST_ENV_STRING', '  hello  ');
        $this->setEnv('TEST_ENV_INT', '  42 ');

        self::assertSame('hello', EnvValueReader::string('TEST_ENV_STRING', 'fallback'));
        self::assertSame(42, EnvValueReader::int('TEST_ENV_INT', 7));
        self::assertSame('  hello  ', EnvValueReader::stringUntrimmed('TEST_ENV_STRING', 'fallback'));
    }

    public function testBoolAndOptionalBoolHelpersHandleMissingInvalidAndValidValues(): void
    {
        self::assertTrue(EnvValueReader::bool('TEST_ENV_BOOL', true));
        self::assertNull(EnvValueReader::optionalBool('TEST_ENV_OPTIONAL_BOOL'));

        $this->setEnv('TEST_ENV_BOOL', 'false');
        $this->setEnv('TEST_ENV_OPTIONAL_BOOL', 'maybe');
        self::assertFalse(EnvValueReader::bool('TEST_ENV_BOOL', true));
        self::assertNull(EnvValueReader::optionalBool('TEST_ENV_OPTIONAL_BOOL'));

        $this->setEnv('TEST_ENV_OPTIONAL_BOOL', 'true');
        self::assertTrue(EnvValueReader::optionalBool('TEST_ENV_OPTIONAL_BOOL'));
    }

    private function setEnv(string $key, string $value): void
    {
        putenv($key . '=' . $value);
        $_ENV[$key] = $value;
    }

    /**
     * @return list<string>
     */
    private function managedEnvKeys(): array
    {
        return [
            'TEST_ENV_STRING',
            'TEST_ENV_INT',
            'TEST_ENV_BOOL',
            'TEST_ENV_OPTIONAL_BOOL',
        ];
    }
}
