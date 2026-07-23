<?php

declare(strict_types=1);

return [
    \Api\Qa\Contracts\QaGateway::class => \DI\autowire(\Api\Qa\Repository\QaRepository::class),
    \Api\Integration\Contracts\QaGateway::class => \DI\get(\Api\Qa\Contracts\QaGateway::class),
];
