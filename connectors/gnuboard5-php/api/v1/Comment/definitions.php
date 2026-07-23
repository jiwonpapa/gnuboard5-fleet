<?php

declare(strict_types=1);

return [
    \Api\Comment\Contracts\CommentGateway::class => \DI\autowire(\Api\Comment\Repository\CommentRepository::class),
    \Api\Integration\Contracts\CommentGateway::class => \DI\get(\Api\Comment\Contracts\CommentGateway::class),
];
