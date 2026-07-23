<?php

declare(strict_types=1);

namespace Api\Admin\Dev\Support;

use Api\Core\Config\EnvConfig;
use Psr\Http\Message\ServerRequestInterface as Request;

final class AdminSchemaInspectSecretGuard
{
    public const HEADER_NAME = 'X-G5-Admin-Inspect-Secret';

    public function expectedSecret(EnvConfig $envConfig): string
    {
        return trim($envConfig->adminSchemaInspectSecret);
    }

    public function providedSecret(Request $request): string
    {
        return trim($request->getHeaderLine(self::HEADER_NAME));
    }

    public function isEnabled(string $expectedSecret): bool
    {
        return $expectedSecret !== '';
    }

    public function matches(string $expectedSecret, string $providedSecret): bool
    {
        if ($expectedSecret === '' || $providedSecret === '') {
            return false;
        }

        return hash_equals($expectedSecret, $providedSecret);
    }
}
