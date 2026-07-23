<?php

declare(strict_types=1);

namespace Api\Core\Config;

final class LegacyConfigProvider
{
    /**
     * @return array<string, mixed>
     */
    public function all(): array
    {
        $legacyConfig = $GLOBALS['config'] ?? [];

        return is_array($legacyConfig) ? $legacyConfig : [];
    }
}
