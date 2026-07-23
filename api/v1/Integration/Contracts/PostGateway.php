<?php

/**
 * PostGateway API 모듈 정의.
 *
 * @package  Gnuboard5\Api\v1\Integration\Contracts
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Integration\Contracts;

use Api\Post\Contracts\PostGateway as DomainPostGateway;

/**
 * @deprecated Use \Api\Post\Contracts\PostGateway instead.
 */
interface PostGateway extends PostReadGateway, PostWriteGateway, DomainPostGateway
{
}
