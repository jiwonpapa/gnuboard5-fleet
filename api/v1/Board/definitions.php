<?php

declare(strict_types=1);

return [
    \Api\Integration\Contracts\BoardGateway::class => \DI\autowire(\Api\Board\Repository\BoardRepository::class),
];
