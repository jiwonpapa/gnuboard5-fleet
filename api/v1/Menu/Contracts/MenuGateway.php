<?php

declare(strict_types=1);

namespace Api\Menu\Contracts;

use Api\Core\DTO\MenuDTO;

interface MenuGateway
{
    /**
     * @return array<int, MenuDTO>
     */
    public function list(bool $mobileOnly = false): array;
}
