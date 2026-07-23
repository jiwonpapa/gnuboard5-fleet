<?php

declare(strict_types=1);

return [
    \Api\Integration\Contracts\PointQueryGateway::class => \DI\autowire(\Api\Point\Repository\PointRepository::class),
    \Api\Integration\Contracts\PointRewardGateway::class => \DI\autowire(\Api\Point\Repository\PointRepository::class),
    \Api\Integration\Contracts\PointMaintenanceGateway::class => \DI\autowire(\Api\Point\Repository\PointRepository::class),
    \Api\Point\Contracts\PointQueryGateway::class => \DI\autowire(\Api\Point\Repository\PointRepository::class),
    \Api\Point\Contracts\PointRewardGateway::class => \DI\autowire(\Api\Point\Repository\PointRepository::class),
    \Api\Point\Contracts\PointMaintenanceGateway::class => \DI\autowire(\Api\Point\Repository\PointRepository::class),
    \Api\Point\Contracts\PointGateway::class => \DI\autowire(\Api\Point\Repository\PointRepository::class),
    \Api\Integration\Contracts\PointGateway::class => \DI\autowire(\Api\Point\Repository\PointRepository::class),
];
