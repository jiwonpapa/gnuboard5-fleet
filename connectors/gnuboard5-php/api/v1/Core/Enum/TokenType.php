<?php

/**
 * JWT 토큰 타입 정의.
 *
 * @package  Api\Core\Enum
 * @since    v1.1.0
 */

declare(strict_types=1);

namespace Api\Core\Enum;

enum TokenType: string
{
    case Access = 'access';
    case Refresh = 'refresh';
}
