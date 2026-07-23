<?php

/**
 * 디바이스 푸시 플랫폼 타입 정의.
 *
 * @package  Api\Core\Enum
 * @since    v1.1.0
 */

declare(strict_types=1);

namespace Api\Core\Enum;

enum DevicePlatform: string
{
    case Fcm = 'fcm';
    case Apns = 'apns';

    /**
     * @return array<int, string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
