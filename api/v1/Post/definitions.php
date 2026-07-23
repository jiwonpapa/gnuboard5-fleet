<?php

declare(strict_types=1);

return [
    \Api\Post\Contracts\PostReadGateway::class => \DI\autowire(\Api\Post\Repository\PostRepository::class),
    \Api\Post\Contracts\PostWriteGateway::class => \DI\autowire(\Api\Post\Repository\PostRepository::class),
    \Api\Post\Contracts\PostGateway::class => \DI\autowire(\Api\Post\Repository\PostRepository::class),
    \Api\Integration\Contracts\PostReadGateway::class => \DI\autowire(\Api\Post\Repository\PostRepository::class),
    \Api\Integration\Contracts\PostWriteGateway::class => \DI\autowire(\Api\Post\Repository\PostRepository::class),
    \Api\Integration\Contracts\PostGateway::class => \DI\autowire(\Api\Post\Repository\PostRepository::class),
];
