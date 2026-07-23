<?php

/**
 * G5DateTime API module.
 *
 * @package  Gnuboard5\Api\v1\Core\Util
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Core\Util;

final class G5DateTime
{
    public static function now(): string
    {
        return date('Y-m-d H:i:s');
    }

    public static function today(): string
    {
        return date('Y-m-d');
    }

    public static function timestamp(): int
    {
        return time();
    }
}
