<?php

/**
 * MenuService API 모듈 정의.
 *
 * @package  Gnuboard5\Api\v1\Menu\Service
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Menu\Service;

use Api\Core\DTO\MenuDTO;
use Api\Menu\Contracts\MenuGateway;

final class MenuService
{
    public function __construct(private readonly MenuGateway $menuRepository)
    {
    }

    /**
     * @return array<int, MenuDTO>
     */
    public function listMenus(bool $mobileOnly = false): array
    {
        return $this->menuRepository->list($mobileOnly);
    }
}
