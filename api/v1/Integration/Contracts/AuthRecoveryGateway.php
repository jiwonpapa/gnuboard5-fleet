<?php

declare(strict_types=1);

namespace Api\Integration\Contracts;

use Api\Auth\Contracts\AuthRecoveryGateway as DomainAuthRecoveryGateway;

/**
 * @deprecated Use \Api\Auth\Contracts\AuthRecoveryGateway instead.
 */
interface AuthRecoveryGateway extends DomainAuthRecoveryGateway
{
}
