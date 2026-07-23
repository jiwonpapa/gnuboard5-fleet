<?php

declare(strict_types=1);

namespace Api\Integration\Contracts;

use Api\Auth\Contracts\AuthIdentityGateway as DomainAuthIdentityGateway;

/**
 * @deprecated Use \Api\Auth\Contracts\AuthIdentityGateway instead.
 */
interface AuthIdentityGateway extends DomainAuthIdentityGateway
{
}
