<?php

/**
 * PointGateway API 모듈 정의.
 *
 * @package  Gnuboard5\Api\v1\Integration\Contracts
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Integration\Contracts;

use Api\Point\Contracts\PointGateway as DomainPointGateway;

/**
 * @deprecated Use \Api\Point\Contracts\PointGateway instead.
 */
interface PointGateway extends PointQueryGateway, PointRewardGateway, PointMaintenanceGateway, DomainPointGateway
{
}
