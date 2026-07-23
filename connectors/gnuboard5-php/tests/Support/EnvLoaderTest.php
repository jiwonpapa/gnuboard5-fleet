<?php

declare(strict_types=1);

namespace Tests\Support;

use Api\Core\Config\EnvLoader;
use PHPUnit\Framework\TestCase;

final class EnvLoaderTest extends TestCase
{
    /** @var array<string, string|null> */
    private array $backup = [];

    protected function tearDown(): void
    {
        foreach ($this->backup as $key => $value) {
            if ($value === null) {
                unset($_ENV[$key]);
                putenv($key);
                continue;
            }

            $_ENV[$key] = $value;
            putenv($key . '=' . $value);
        }

        $this->backup = [];
        parent::tearDown();
    }

    public function testParseLineSupportsEqualsInValue(): void
    {
        $parsed = EnvLoader::parseLine('JWT_SECRET=abc=def==ghi');
        $this->assertSame(['JWT_SECRET', 'abc=def==ghi'], $parsed);
    }

    public function testParseLineSupportsQuotedValueAndComment(): void
    {
        $this->assertSame(
            ['API_KEY', 'value=with=equals'],
            EnvLoader::parseLine('API_KEY="value=with=equals"')
        );

        $this->assertSame(
            ['LOG_LEVEL', 'debug'],
            EnvLoader::parseLine('LOG_LEVEL=debug # inline comment')
        );
    }

    public function testLoadAppliesValuesToEnv(): void
    {
        $this->backupEnv('DB_PASS');
        $this->backupEnv('JWT_SECRET');
        $this->backupEnv('EMPTY_VALUE');

        $tmpFile = tempnam(sys_get_temp_dir(), 'envloader');
        $this->assertNotFalse($tmpFile);

        file_put_contents(
            $tmpFile,
            implode("\n", [
                '# comment',
                'DB_PASS="abc=def=123"',
                "JWT_SECRET='quoted=token'",
                'EMPTY_VALUE=',
            ])
        );

        $values = EnvLoader::load($tmpFile);

        @unlink($tmpFile);

        $this->assertSame('abc=def=123', $values['DB_PASS'] ?? null);
        $this->assertSame('quoted=token', $values['JWT_SECRET'] ?? null);
        $this->assertSame('', $values['EMPTY_VALUE'] ?? null);

        $this->assertSame('abc=def=123', $_ENV['DB_PASS'] ?? null);
        $this->assertSame('quoted=token', $_ENV['JWT_SECRET'] ?? null);
        $this->assertSame('', $_ENV['EMPTY_VALUE'] ?? null);
    }

    public function testResolvePathPrefersAppEnvFileOverride(): void
    {
        $this->backupEnv('APP_ENV_FILE');
        $this->backupEnv('API_ENV_FILE');

        $_ENV['APP_ENV_FILE'] = '/secure/runtime/api.env';
        putenv('APP_ENV_FILE=/secure/runtime/api.env');

        self::assertSame('/secure/runtime/api.env', EnvLoader::resolvePath('/tmp/project'));
    }

    public function testResolvePathFallsBackToProjectRootDotEnv(): void
    {
        $this->backupEnv('APP_ENV_FILE');
        $this->backupEnv('API_ENV_FILE');

        unset($_ENV['APP_ENV_FILE'], $_ENV['API_ENV_FILE']);
        putenv('APP_ENV_FILE');
        putenv('API_ENV_FILE');

        self::assertSame('/tmp/project/.env', EnvLoader::resolvePath('/tmp/project'));
    }

    private function backupEnv(string $key): void
    {
        if (array_key_exists($key, $this->backup)) {
            return;
        }

        $this->backup[$key] = array_key_exists($key, $_ENV) ? (string)$_ENV[$key] : null;
    }
}
