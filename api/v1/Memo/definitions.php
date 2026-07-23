<?php

declare(strict_types=1);

return [
    \Api\Memo\Contracts\MemoGateway::class => \DI\autowire(\Api\Memo\Repository\MemoRepository::class),
    \Api\Integration\Contracts\MemoGateway::class => \DI\get(\Api\Memo\Contracts\MemoGateway::class),
];
