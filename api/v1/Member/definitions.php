<?php

declare(strict_types=1);

return [
    \Api\Integration\Contracts\MemberGateway::class => \DI\autowire(\Api\Member\Repository\MemberRepository::class),
];
