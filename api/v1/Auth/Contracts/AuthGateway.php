<?php

declare(strict_types=1);

namespace Api\Auth\Contracts;

interface AuthGateway extends AuthIdentityGateway, AuthRegistrationGateway, AuthSessionGateway, AuthRecoveryGateway
{
}
