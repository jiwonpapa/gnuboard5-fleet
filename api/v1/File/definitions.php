<?php

declare(strict_types=1);

return [
    \Api\File\Contracts\FileGateway::class => \DI\autowire(\Api\File\Repository\FileRepository::class),
    \Api\Integration\Contracts\FileGateway::class => \DI\get(\Api\File\Contracts\FileGateway::class),
];
