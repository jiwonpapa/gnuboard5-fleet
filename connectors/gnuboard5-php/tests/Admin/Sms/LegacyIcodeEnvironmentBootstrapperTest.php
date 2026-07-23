<?php

declare(strict_types=1);

namespace Tests\Admin\Sms;

use Api\Admin\Sms\Support\LegacyIcodeEnvironmentBootstrapper;
use PHPUnit\Framework\TestCase;

final class LegacyIcodeEnvironmentBootstrapperTest extends TestCase
{
    /**
     * @var array{had_config: bool, config?: mixed}
     */
    private array $configSnapshot = [];

    protected function setUp(): void
    {
        $this->configSnapshot = ['had_config' => array_key_exists('config', $GLOBALS)];
        if ($this->configSnapshot['had_config']) {
            $this->configSnapshot['config'] = $GLOBALS['config'];
        }
    }

    protected function tearDown(): void
    {
        if (($this->configSnapshot['had_config'] ?? false) === true) {
            $GLOBALS['config'] = $this->configSnapshot['config'] ?? [];

            return;
        }

        unset($GLOBALS['config']);
    }

    public function testBootAndRestoreRoundTripsExistingLegacyConfig(): void
    {
        $bootstrapper = new LegacyIcodeEnvironmentBootstrapper(dirname(__DIR__, 3));
        $GLOBALS['config'] = [
            'existing' => 'yes',
            'cf_sms_type' => 'SMS',
        ];

        $snapshot = $bootstrapper->boot([
            'cf_icode_id' => 'icode-user',
            'cf_icode_token_key' => 'token-key',
        ]);

        self::assertSame('yes', $GLOBALS['config']['existing']);
        self::assertSame('token-key', $GLOBALS['config']['cf_icode_token_key']);
        self::assertArrayNotHasKey('cf_icode_id', $GLOBALS['config']);

        $bootstrapper->restore($snapshot);

        self::assertSame(
            [
                'existing' => 'yes',
                'cf_sms_type' => 'SMS',
            ],
            $GLOBALS['config']
        );
    }

    public function testRestoreRemovesTemporaryLegacyConfigWhenAbsentBeforeBoot(): void
    {
        unset($GLOBALS['config']);
        $bootstrapper = new LegacyIcodeEnvironmentBootstrapper(dirname(__DIR__, 3));

        $snapshot = $bootstrapper->boot([
            'cf_icode_id' => 'icode-user',
            'cf_icode_token_key' => 'token-key',
        ]);

        self::assertSame('token-key', $GLOBALS['config']['cf_icode_token_key']);
        self::assertArrayNotHasKey('cf_icode_id', $GLOBALS['config']);

        $bootstrapper->restore($snapshot);

        self::assertArrayNotHasKey('config', $GLOBALS);
    }

    public function testBootDoesNotCreateLegacyConfigWhenTokenKeyIsAbsent(): void
    {
        unset($GLOBALS['config']);
        $bootstrapper = new LegacyIcodeEnvironmentBootstrapper(dirname(__DIR__, 3));

        $snapshot = $bootstrapper->boot([
            'cf_icode_id' => 'icode-user',
            'cf_icode_pw' => 'icode-pass',
        ]);

        self::assertArrayNotHasKey('config', $GLOBALS);

        $bootstrapper->restore($snapshot);

        self::assertArrayNotHasKey('config', $GLOBALS);
    }
}
