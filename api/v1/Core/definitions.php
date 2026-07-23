<?php

declare(strict_types=1);

return static function (array $context): array {
    $pluginEvents = $context['pluginEvents'] ?? null;
    $pluginRegistry = $context['pluginRegistry'] ?? null;

    if (!$pluginEvents instanceof \Api\Core\Plugin\EventDispatcher) {
        throw new RuntimeException('pluginEvents context is required.');
    }

    if (!$pluginRegistry instanceof \Api\Core\Plugin\PluginRegistry) {
        throw new RuntimeException('pluginRegistry context is required.');
    }

    return [
        \PDO::class => static fn (): \PDO => \Api\Core\Database\PdoConnectionFactory::create(),
        \Api\Core\Config\EnvConfig::class => static fn (): \Api\Core\Config\EnvConfig => \Api\Core\Config\EnvConfig::fromEnv(),
        \Api\Core\Config\RuntimeProfile::class => static fn (): \Api\Core\Config\RuntimeProfile => \Api\Core\Config\RuntimeProfileResolver::resolve(),
        \Api\Core\Database\QueryBuilder::class => static fn (\PDO $pdo): \Api\Core\Database\QueryBuilder => new \Api\Core\Database\QueryBuilder($pdo),
        \Api\Core\Database\TableRegistry::class => static fn (): \Api\Core\Database\TableRegistry => new \Api\Core\Database\TableRegistry(),
        \Api\Core\Security\PasswordCompat::class => static fn (\Api\Core\Config\EnvConfig $envConfig): \Api\Core\Security\PasswordCompat => new \Api\Core\Security\PasswordCompat($envConfig),
        \Api\Core\Plugin\EventDispatcher::class => static fn (): \Api\Core\Plugin\EventDispatcher => $pluginEvents,
        \Api\Core\Plugin\PluginRegistry::class => static fn (): \Api\Core\Plugin\PluginRegistry => $pluginRegistry,
        \Api\Core\Config\G5Config::class => \DI\autowire(),
        \Psr\Log\LoggerInterface::class => static fn (): \Psr\Log\LoggerInterface => \Api\Support\Logging\ApiLoggerFactory::create(
            'api',
            dirname(__DIR__, 2) . '/logs/error.log'
        ),
    ];
};
