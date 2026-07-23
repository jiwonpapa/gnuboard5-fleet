<?php

declare(strict_types=1);

namespace Tests\Core\Config;

use Api\Core\Config\LegacyConfigProvider;
use PHPUnit\Framework\TestCase;

final class LegacyConfigProviderTest extends TestCase
{
    private mixed $configBackup;
    private bool $hadConfig = false;

    protected function setUp(): void
    {
        parent::setUp();
        $this->hadConfig = array_key_exists('config', $GLOBALS);
        $this->configBackup = $GLOBALS['config'] ?? null;
    }

    protected function tearDown(): void
    {
        if ($this->hadConfig) {
            $GLOBALS['config'] = $this->configBackup;
        } else {
            unset($GLOBALS['config']);
        }

        parent::tearDown();
    }

    public function testAllReturnsLegacyConfigArray(): void
    {
        $GLOBALS['config'] = ['cf_title' => 'legacy-site'];

        $provider = new LegacyConfigProvider();

        self::assertSame(['cf_title' => 'legacy-site'], $provider->all());
    }

    public function testAllReturnsEmptyArrayWhenLegacyConfigIsInvalid(): void
    {
        $GLOBALS['config'] = 'not-an-array';

        $provider = new LegacyConfigProvider();

        self::assertSame([], $provider->all());
    }
}
