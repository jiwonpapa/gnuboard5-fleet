<?php

declare(strict_types=1);

namespace Tests\Core\Config;

use Api\Core\Config\RuntimeMode;
use Api\Core\Config\RuntimeProfileResolver;
use PHPUnit\Framework\TestCase;

final class RuntimeProfileResolverTest extends TestCase
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

    public function testBuildMetadataProdOverridesApiDebugFallback(): void
    {
        $this->setEnv('API_DEBUG', 'true');
        $metadataPath = $this->writeMetadata(['mode' => 'prod']);

        $profile = RuntimeProfileResolver::resolve($metadataPath);

        @unlink($metadataPath);

        self::assertSame(RuntimeMode::Prod, $profile->mode);
        self::assertFalse($profile->displayErrorDetails);
        self::assertSame('build.runtime_metadata', $profile->source);
    }

    public function testAppRuntimeModeOverridesBuildMetadata(): void
    {
        $this->setEnv('APP_RUNTIME_MODE', 'dev');
        $metadataPath = $this->writeMetadata(['mode' => 'prod']);

        $profile = RuntimeProfileResolver::resolve($metadataPath);

        @unlink($metadataPath);

        self::assertSame(RuntimeMode::Dev, $profile->mode);
        self::assertTrue($profile->displayErrorDetails);
        self::assertSame('env.app_runtime_mode', $profile->source);
    }

    public function testLocalAppEnvFallsBackToDevWithoutMetadata(): void
    {
        $this->setEnv('APP_ENV', 'local');
        $this->setEnv('API_DEBUG', 'false');

        $profile = RuntimeProfileResolver::resolve(sys_get_temp_dir() . '/missing-runtime-profile.json');

        self::assertSame(RuntimeMode::Dev, $profile->mode);
        self::assertTrue($profile->displayErrorDetails);
        self::assertSame('env.app_env', $profile->source);
    }

    /**
     * @param array<string, mixed> $payload
     */
    private function writeMetadata(array $payload): string
    {
        $path = tempnam(sys_get_temp_dir(), 'runtime-profile');
        self::assertNotFalse($path);

        file_put_contents($path, (string)json_encode($payload, JSON_THROW_ON_ERROR));

        return $path;
    }

    private function setEnv(string $key, string $value): void
    {
        if (!array_key_exists($key, $this->backup)) {
            $this->backup[$key] = array_key_exists($key, $_ENV) ? (string)$_ENV[$key] : null;
        }

        $_ENV[$key] = $value;
        putenv($key . '=' . $value);
    }
}
