<?php

declare(strict_types=1);

namespace Api\Core\Config;

enum RuntimeMode: string
{
    case Dev = 'dev';
    case Prod = 'prod';

    public static function fromString(string $value): ?self
    {
        return match (strtolower(trim($value))) {
            'dev', 'debug', 'local' => self::Dev,
            'prod', 'production', 'product', 'staging' => self::Prod,
            default => null,
        };
    }
}
