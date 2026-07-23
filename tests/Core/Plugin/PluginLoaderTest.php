<?php

declare(strict_types=1);

namespace Tests\Core\Plugin;

use Api\Core\Plugin\EventDispatcher;
use Api\Core\Plugin\PluginDiscoveryService;
use Api\Core\Plugin\PluginLoader;
use Api\Core\Plugin\PluginRegistry;
use Api\Core\Plugin\PluginScopePolicy;
use DI\ContainerBuilder;
use PHPUnit\Framework\TestCase;
use Psr\Log\AbstractLogger;
use Slim\Factory\AppFactory;

final class PluginLoaderTest extends TestCase
{
    private string $pluginRoot;

    protected function setUp(): void
    {
        $this->pluginRoot = sys_get_temp_dir() . '/g5-plugin-loader-' . bin2hex(random_bytes(6));
        mkdir($this->pluginRoot, 0775, true);
    }

    protected function tearDown(): void
    {
        $this->deleteDirectory($this->pluginRoot);
    }

    public function testRegistersAndBootsValidPlugin(): void
    {
        $manifest = [
            'name' => 'good-plugin',
            'vendor' => 'AcmeGood',
            'version' => '1.0.0',
            'require_api_version' => '>=1.1.0',
            'scopes' => ['member.read'],
            'entry_class' => 'Plugin',
            'autoload' => [
                'psr-4' => [
                    'Api\\Plugins\\AcmeGood\\GoodPlugin\\' => 'src/',
                ],
            ],
        ];

        $this->createPlugin(
            'AcmeGood',
            'GoodPlugin',
            $manifest,
            <<<'PHP'
<?php
declare(strict_types=1);

namespace Api\Plugins\AcmeGood\GoodPlugin;

use Api\Core\Plugin\EventDispatcher;
use Api\Core\Plugin\PluginContext;
use Api\Core\Plugin\PluginInterface;
use DI\ContainerBuilder;
use Slim\App;

final class Plugin implements PluginInterface
{
    public static int $registerCount = 0;
    public static int $bootCount = 0;

    public function register(ContainerBuilder $builder): void
    {
        self::$registerCount++;
    }

    public function boot(App $app, EventDispatcher $events, PluginContext $context): void
    {
        self::$bootCount++;
    }
}
PHP
        );

        $registry = new PluginRegistry();
        $loader = $this->createLoader($registry);

        $loader->registerAll(new ContainerBuilder());
        AppFactory::setContainer((new ContainerBuilder())->build());
        $loader->bootAll(AppFactory::create(), new EventDispatcher());

        $this->assertSame(1, \Api\Plugins\AcmeGood\GoodPlugin\Plugin::$registerCount);
        $this->assertSame(1, \Api\Plugins\AcmeGood\GoodPlugin\Plugin::$bootCount);
        $this->assertTrue($registry->isLoaded('AcmeGood', 'good-plugin'));
        $this->assertSame('booted', $registry->get('AcmeGood', 'good-plugin')['status']);
    }

    public function testSkipsInvalidOrIncompatiblePluginsAndContinues(): void
    {
        $validManifest = [
            'name' => 'safe-plugin',
            'vendor' => 'AcmeSafe',
            'version' => '1.0.0',
            'require_api_version' => '>=1.1.0',
            'scopes' => ['member.read'],
            'entry_class' => 'Plugin',
            'autoload' => [
                'psr-4' => [
                    'Api\\Plugins\\AcmeSafe\\SafePlugin\\' => 'src/',
                ],
            ],
        ];
        $badVersionManifest = [
            'name' => 'old-plugin',
            'vendor' => 'AcmeOld',
            'version' => '1.0.0',
            'require_api_version' => '>=9.9.9',
            'scopes' => ['member.read'],
            'entry_class' => 'Plugin',
            'autoload' => [
                'psr-4' => [
                    'Api\\Plugins\\AcmeOld\\OldPlugin\\' => 'src/',
                ],
            ],
        ];

        $this->createPlugin(
            'AcmeSafe',
            'SafePlugin',
            $validManifest,
            <<<'PHP'
<?php
declare(strict_types=1);

namespace Api\Plugins\AcmeSafe\SafePlugin;

use Api\Core\Plugin\EventDispatcher;
use Api\Core\Plugin\PluginContext;
use Api\Core\Plugin\PluginInterface;
use DI\ContainerBuilder;
use Slim\App;

final class Plugin implements PluginInterface
{
    public static int $registerCount = 0;

    public function register(ContainerBuilder $builder): void
    {
        self::$registerCount++;
    }

    public function boot(App $app, EventDispatcher $events, PluginContext $context): void
    {
    }
}
PHP
        );

        $oldPluginDir = $this->createPlugin(
            'AcmeOld',
            'OldPlugin',
            $badVersionManifest,
            <<<'PHP'
<?php
declare(strict_types=1);

namespace Api\Plugins\AcmeOld\OldPlugin;

use Api\Core\Plugin\EventDispatcher;
use Api\Core\Plugin\PluginContext;
use Api\Core\Plugin\PluginInterface;
use DI\ContainerBuilder;
use Slim\App;

final class Plugin implements PluginInterface
{
    public function register(ContainerBuilder $builder): void
    {
    }

    public function boot(App $app, EventDispatcher $events, PluginContext $context): void
    {
    }
}
PHP
        );
        @unlink($oldPluginDir . '/Plugin.php');

        $registry = new PluginRegistry();
        $loader = $this->createLoader($registry);
        $loader->registerAll(new ContainerBuilder());

        $this->assertSame(1, \Api\Plugins\AcmeSafe\SafePlugin\Plugin::$registerCount);
        $this->assertTrue($registry->isLoaded('AcmeSafe', 'safe-plugin'));
        $this->assertNull($registry->get('AcmeOld', 'old-plugin'));
    }

    public function testRegisterFailureDoesNotBlockOtherPlugins(): void
    {
        $failingManifest = [
            'name' => 'failing-plugin',
            'vendor' => 'AcmeFail',
            'version' => '1.0.0',
            'require_api_version' => '>=1.1.0',
            'scopes' => ['member.read'],
            'entry_class' => 'Plugin',
            'autoload' => [
                'psr-4' => [
                    'Api\\Plugins\\AcmeFail\\FailingPlugin\\' => 'src/',
                ],
            ],
        ];
        $goodManifest = [
            'name' => 'working-plugin',
            'vendor' => 'AcmeWork',
            'version' => '1.0.0',
            'require_api_version' => '>=1.1.0',
            'scopes' => ['member.read'],
            'entry_class' => 'Plugin',
            'autoload' => [
                'psr-4' => [
                    'Api\\Plugins\\AcmeWork\\WorkingPlugin\\' => 'src/',
                ],
            ],
        ];

        $this->createPlugin(
            'AcmeFail',
            'FailingPlugin',
            $failingManifest,
            <<<'PHP'
<?php
declare(strict_types=1);

namespace Api\Plugins\AcmeFail\FailingPlugin;

use Api\Core\Plugin\EventDispatcher;
use Api\Core\Plugin\PluginContext;
use Api\Core\Plugin\PluginInterface;
use DI\ContainerBuilder;
use RuntimeException;
use Slim\App;

final class Plugin implements PluginInterface
{
    public function register(ContainerBuilder $builder): void
    {
        throw new RuntimeException('register failed');
    }

    public function boot(App $app, EventDispatcher $events, PluginContext $context): void
    {
    }
}
PHP
        );
        $this->createPlugin(
            'AcmeWork',
            'WorkingPlugin',
            $goodManifest,
            <<<'PHP'
<?php
declare(strict_types=1);

namespace Api\Plugins\AcmeWork\WorkingPlugin;

use Api\Core\Plugin\EventDispatcher;
use Api\Core\Plugin\PluginContext;
use Api\Core\Plugin\PluginInterface;
use DI\ContainerBuilder;
use Slim\App;

final class Plugin implements PluginInterface
{
    public static int $registerCount = 0;

    public function register(ContainerBuilder $builder): void
    {
        self::$registerCount++;
    }

    public function boot(App $app, EventDispatcher $events, PluginContext $context): void
    {
    }
}
PHP
        );

        $registry = new PluginRegistry();
        $loader = $this->createLoader($registry);

        $loader->registerAll(new ContainerBuilder());

        $this->assertSame(1, \Api\Plugins\AcmeWork\WorkingPlugin\Plugin::$registerCount);
        $this->assertNull($registry->get('AcmeFail', 'failing-plugin'));
        $this->assertTrue($registry->isLoaded('AcmeWork', 'working-plugin'));
    }

    /**
     * @param array<string, mixed> $manifest
     */
    private function createPlugin(string $vendorName, string $pluginName, array $manifest, string $pluginPhp): string
    {
        $pluginDir = $this->pluginRoot . '/' . $vendorName . '/' . $pluginName;
        mkdir($pluginDir, 0775, true);
        file_put_contents(
            $pluginDir . '/manifest.json',
            (string)json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)
        );
        file_put_contents($pluginDir . '/Plugin.php', $pluginPhp);

        return $pluginDir;
    }

    private function createLoader(PluginRegistry $registry): PluginLoader
    {
        $logger = new ArrayLogger();
        $scopePolicy = new PluginScopePolicy();

        return new PluginLoader(
            $logger,
            $registry,
            $this->pluginRoot,
            $scopePolicy,
            new PluginDiscoveryService($logger, $scopePolicy, PluginLoader::API_VERSION),
            null
        );
    }

    private function deleteDirectory(string $directory): void
    {
        if (!is_dir($directory)) {
            return;
        }

        $items = scandir($directory);
        if (!is_array($items)) {
            @rmdir($directory);

            return;
        }

        foreach ($items as $item) {
            if ($item === '.' || $item === '..') {
                continue;
            }

            $path = $directory . '/' . $item;
            if (is_dir($path)) {
                $this->deleteDirectory($path);
            } else {
                @unlink($path);
            }
        }

        @rmdir($directory);
    }
}

final class ArrayLogger extends AbstractLogger
{
    /** @var array<int, array{level:string, message:string, context:array<string, mixed>}> */
    public array $records = [];

    /**
     * @param array<string, mixed> $context
     */
    public function log($level, $message, array $context = []): void
    {
        $this->records[] = [
            'level' => (string)$level,
            'message' => (string)$message,
            'context' => $context,
        ];
    }
}
