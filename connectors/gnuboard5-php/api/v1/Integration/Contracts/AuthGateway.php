<?php

/**
 * AuthGateway API 모듈 정의.
 *
 * @package  Gnuboard5\Api\v1\Integration\Contracts
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Integration\Contracts;

use Api\Auth\Contracts\AuthGateway as DomainAuthGateway;

/**
 * @deprecated Use \Api\Auth\Contracts\AuthGateway instead.
 */
interface AuthGateway extends DomainAuthGateway, AuthIdentityGateway, AuthSessionGateway, AuthRecoveryGateway
{
}
