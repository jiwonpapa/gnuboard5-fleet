<?php

declare(strict_types=1);

return [
    \Api\Menu\Contracts\MenuGateway::class => \DI\autowire(\Api\Menu\Repository\MenuRepository::class),
    \Api\Integration\Contracts\MenuGateway::class => \DI\get(\Api\Menu\Contracts\MenuGateway::class),
];
