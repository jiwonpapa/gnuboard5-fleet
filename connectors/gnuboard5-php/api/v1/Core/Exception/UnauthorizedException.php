<?php

/**
 * UnauthorizedException API module.
 *
 * @package  Gnuboard5\Api\v1\Core\Exception
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Core\Exception;

use Api\Core\Enum\ApiErrorType;

final class UnauthorizedException extends ApiException
{
    public function __construct(string $detail, ?array $guide = null)
    {
        parent::__construct(401, 'Unauthorized', $detail, ApiErrorType::Unauthorized, $guide);
    }
}
