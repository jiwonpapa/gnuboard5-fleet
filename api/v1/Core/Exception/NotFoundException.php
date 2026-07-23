<?php

/**
 * NotFoundException API module.
 *
 * @package  Gnuboard5\Api\v1\Core\Exception
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Core\Exception;

use Api\Core\Enum\ApiErrorType;

final class NotFoundException extends ApiException
{
    public function __construct(string $detail, ?array $guide = null)
    {
        parent::__construct(404, 'Not Found', $detail, ApiErrorType::NotFound, $guide);
    }
}
