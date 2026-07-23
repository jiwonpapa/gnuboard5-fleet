<?php

/**
 * MemoGateway API 모듈 정의.
 *
 * @package  Gnuboard5\Api\v1\Integration\Contracts
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Integration\Contracts;

use Api\Memo\Contracts\MemoGateway as DomainMemoGateway;

/**
 * @deprecated Use \Api\Memo\Contracts\MemoGateway instead.
 */
interface MemoGateway extends DomainMemoGateway
{
}
