<?php

/**
 * QaGateway API 모듈 정의.
 *
 * @package  Gnuboard5\Api\v1\Integration\Contracts
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Integration\Contracts;

use Api\Qa\Contracts\QaGateway as DomainQaGateway;

/**
 * @deprecated Use \Api\Qa\Contracts\QaGateway instead.
 */
interface QaGateway extends DomainQaGateway
{
}
