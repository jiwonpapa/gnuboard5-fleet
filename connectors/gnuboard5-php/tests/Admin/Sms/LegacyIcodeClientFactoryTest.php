<?php

declare(strict_types=1);

namespace Tests\Admin\Sms;

use Api\Admin\Sms\Support\LegacyIcodeClientFactory;
use Api\Admin\Sms\Support\LegacyIcodeEnvironmentBootstrapper;
use PHPUnit\Framework\TestCase;

final class LegacyIcodeClientFactoryTest extends TestCase
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

    public function testWithClientBootstrapsAndRestoresLegacyConfigScope(): void
    {
        $GLOBALS['config'] = ['existing' => 'yes'];
        $bootstrapper = new LegacyIcodeEnvironmentBootstrapper(dirname(__DIR__, 3));
        $factory = new LegacyIcodeClientFactory($bootstrapper);

        $result = $factory->withClient(
            [
                'cf_icode_id' => 'icode-user',
                'cf_icode_pw' => 'icode-pass',
                'cf_icode_server_port' => '7295',
                'cf_icode_token_key' => 'token-key',
            ],
            'sms',
            static function (\SMS $client): string {
                self::assertInstanceOf(\SMS::class, $client);
                self::assertSame('yes', $GLOBALS['config']['existing']);
                self::assertSame('token-key', $GLOBALS['config']['cf_icode_token_key']);
                self::assertArrayNotHasKey('cf_icode_id', $GLOBALS['config']);

                return 'scoped';
            }
        );

        self::assertSame('scoped', $result);
        self::assertSame(['existing' => 'yes'], $GLOBALS['config']);
    }

    public function testWithClientDoesNotCreateLegacyConfigWhenTokenKeyIsAbsent(): void
    {
        unset($GLOBALS['config']);
        $bootstrapper = new LegacyIcodeEnvironmentBootstrapper(dirname(__DIR__, 3));
        $factory = new LegacyIcodeClientFactory($bootstrapper);

        $result = $factory->withClient(
            [
                'cf_icode_id' => 'icode-user',
                'cf_icode_pw' => 'icode-pass',
                'cf_icode_server_ip' => '127.0.0.1',
                'cf_icode_server_port' => '7295',
            ],
            'sms',
            static function (\SMS $client): string {
                self::assertInstanceOf(\SMS::class, $client);
                self::assertArrayNotHasKey('config', $GLOBALS);

                return 'legacy-sms';
            }
        );

        self::assertSame('legacy-sms', $result);
        self::assertArrayNotHasKey('config', $GLOBALS);
    }

    public function testWithClientRestoresLegacyConfigWhenCallbackThrows(): void
    {
        $GLOBALS['config'] = ['existing' => 'yes'];
        $bootstrapper = new LegacyIcodeEnvironmentBootstrapper(dirname(__DIR__, 3));
        $factory = new LegacyIcodeClientFactory($bootstrapper);

        try {
            $factory->withClient(
                [
                    'cf_icode_id' => 'icode-user',
                    'cf_icode_pw' => 'icode-pass',
                    'cf_icode_server_port' => '7295',
                    'cf_icode_token_key' => 'token-key',
                ],
                'sms',
                static function (\SMS $client): never {
                    self::assertInstanceOf(\SMS::class, $client);
                    self::assertSame('token-key', $GLOBALS['config']['cf_icode_token_key']);

                    throw new \RuntimeException('expected');
                }
            );
            self::fail('Expected runtime exception was not thrown.');
        } catch (\RuntimeException $e) {
            self::assertSame('expected', $e->getMessage());
        }

        self::assertSame(['existing' => 'yes'], $GLOBALS['config']);
    }
}
