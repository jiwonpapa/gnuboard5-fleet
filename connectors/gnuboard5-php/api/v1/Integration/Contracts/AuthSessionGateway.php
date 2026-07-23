<?php

declare(strict_types=1);

namespace Api\Integration\Contracts;

use Api\Auth\Contracts\AuthSessionGateway as DomainAuthSessionGateway;

/**
 * @deprecated Use \Api\Auth\Contracts\AuthSessionGateway instead.
 */
interface AuthSessionGateway extends DomainAuthSessionGateway
{
}
