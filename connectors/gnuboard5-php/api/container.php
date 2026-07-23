<?php

/**
 * container API module.
 *
 * @package  Gnuboard5\Api
 * @since    v1.0.0
 */

declare(strict_types=1);

use Api\Core\Plugin\EventDispatcher;
use Api\Core\Plugin\PluginLoader;
use Api\Core\Plugin\PluginRegistry;
use DI\ContainerBuilder;

$pluginEvents = ($pluginEvents ?? null) instanceof EventDispatcher ? $pluginEvents : new EventDispatcher();
$pluginRegistry = ($pluginRegistry ?? null) instanceof PluginRegistry ? $pluginRegistry : new PluginRegistry();

$builder = new ContainerBuilder();
$definitionFiles = glob(__DIR__ . '/v1/*/definitions.php');
if ($definitionFiles === false) {
    $definitionFiles = [];
}

sort($definitionFiles);

$definitionContext = [
    'pluginEvents' => $pluginEvents,
    'pluginRegistry' => $pluginRegistry,
];

$definitions = [];

foreach ($definitionFiles as $definitionFile) {
    $loadedDefinitions = require $definitionFile;

    if (is_callable($loadedDefinitions)) {
        $loadedDefinitions = $loadedDefinitions($definitionContext);
    }

    if (!is_array($loadedDefinitions)) {
        throw new RuntimeException(sprintf('Definition file must return array or callable: %s', $definitionFile));
    }

    $definitions = array_replace($definitions, $loadedDefinitions);
}

$builder->addDefinitions($definitions);

if (($pluginLoader ?? null) instanceof PluginLoader) {
    $pluginLoader->registerAll($builder);
}

return $builder->build();
