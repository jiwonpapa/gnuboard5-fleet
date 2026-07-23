<?php

/**
 * ConfigService API 모듈 정의.
 *
 * @package  Gnuboard5\Api\v1\Config\Service
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Config\Service;

use Api\Config\Repository\ConfigRepository;

final class ConfigService
{
    public function __construct(private readonly ConfigRepository $configRepository)
    {
    }

    public function getPublicConfig(): array
    {
        return $this->configRepository->getPublicConfig();
    }
}
