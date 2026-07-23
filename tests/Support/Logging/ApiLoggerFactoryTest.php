<?php

declare(strict_types=1);

namespace Tests\Support\Logging;

use Api\Support\Logging\ApiLoggerFactory;
use Monolog\Level;
use PHPUnit\Framework\TestCase;

final class ApiLoggerFactoryTest extends TestCase
{
    private string|false $previous = false;

    protected function setUp(): void
    {
        parent::setUp();
        $this->previous = getenv('LOG_LEVEL');
        putenv('LOG_LEVEL');
        unset($_ENV['LOG_LEVEL']);
    }

    protected function tearDown(): void
    {
        if ($this->previous === false) {
            putenv('LOG_LEVEL');
            unset($_ENV['LOG_LEVEL']);
        } else {
            putenv('LOG_LEVEL=' . $this->previous);
            $_ENV['LOG_LEVEL'] = (string)$this->previous;
        }

        parent::tearDown();
    }

    public function testEnvLevelUsesEnvValueReaderNormalization(): void
    {
        $_ENV['LOG_LEVEL'] = ' warning ';
        putenv('LOG_LEVEL= warning ');

        self::assertSame(Level::Warning, ApiLoggerFactory::envLevel('debug'));
    }

    public function testEnvLevelFallsBackToDefaultWhenEnvMissing(): void
    {
        self::assertSame(Level::Error, ApiLoggerFactory::envLevel('error'));
    }
}
