<?php

/**
 * MenuGateway API module.
 *
 * @package  Gnuboard5\Api\v1\Integration\Contracts
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Integration\Contracts;

use Api\Menu\Contracts\MenuGateway as DomainMenuGateway;

/**
 * @deprecated Use \Api\Menu\Contracts\MenuGateway instead.
 */
interface MenuGateway extends DomainMenuGateway
{
}
