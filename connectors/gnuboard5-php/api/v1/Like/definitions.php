<?php

declare(strict_types=1);

return [
    \Api\Like\Contracts\LikeGateway::class => \DI\autowire(\Api\Like\Repository\LikeRepository::class),
    \Api\Integration\Contracts\LikeGateway::class => \DI\get(\Api\Like\Contracts\LikeGateway::class),
];
