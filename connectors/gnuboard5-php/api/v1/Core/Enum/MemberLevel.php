<?php

/**
 * 회원 등급 정의.
 *
 * @package  Api\Core\Enum
 * @since    v1.1.0
 */

declare(strict_types=1);

namespace Api\Core\Enum;

enum MemberLevel: int
{
    case Guest = 0;
    case Normal = 1;
    case Certified = 2;
    case Admin = 10;

    public function isAdmin(): bool
    {
        return $this->value >= self::Admin->value;
    }

    public function isAtLeast(self $level): bool
    {
        return $this->value >= $level->value;
    }

    public static function fromNumeric(int $level): self
    {
        if ($level >= self::Admin->value) {
            return self::Admin;
        }
        if ($level >= self::Certified->value) {
            return self::Certified;
        }
        if ($level >= self::Normal->value) {
            return self::Normal;
        }

        return self::Guest;
    }
}
