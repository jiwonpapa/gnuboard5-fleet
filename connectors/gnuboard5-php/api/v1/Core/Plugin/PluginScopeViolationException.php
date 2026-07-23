<?php

/**
 * PluginScopeViolationException API module.
 *
 * @package  Gnuboard5\Api\v1\Core\Plugin
 * @since    v1.1.0
 */

declare(strict_types=1);

namespace Api\Core\Plugin;

use RuntimeException;

final class PluginScopeViolationException extends RuntimeException
{
    public static function forService(string $pluginId, string $serviceId): self
    {
        return new self(sprintf("Plugin '%s' cannot access service '%s'.", $pluginId, $serviceId));
    }

    public static function forMethod(string $pluginId, string $serviceId, string $method, string $requiredAccess): self
    {
        return new self(
            sprintf(
                "Plugin '%s' cannot call %s::%s without '%s' access.",
                $pluginId,
                $serviceId,
                $method,
                $requiredAccess
            )
        );
    }
}
