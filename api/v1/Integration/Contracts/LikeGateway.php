<?php

/**
 * LikeGateway API 모듈 정의.
 *
 * @package  Gnuboard5\Api\v1\Integration\Contracts
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Integration\Contracts;

use Api\Like\Contracts\LikeGateway as DomainLikeGateway;

/**
 * @deprecated Use \Api\Like\Contracts\LikeGateway instead.
 */
interface LikeGateway extends DomainLikeGateway
{
}
