<?php

/**
 * PluginScopePolicy API module.
 *
 * @package  Gnuboard5\Api\v1\Core\Plugin
 * @since    v1.1.0
 */

declare(strict_types=1);

namespace Api\Core\Plugin;

use Api\Integration\Contracts\BoardGateway;
use Api\Integration\Contracts\MemberGateway;
use Api\Integration\Contracts\PointGateway;
use Api\Integration\Contracts\PointRewardGateway;
use Api\Integration\Contracts\PostGateway;
use Api\Integration\Contracts\PostReadGateway;
use Api\Integration\Contracts\PostWriteGateway;

final class PluginScopePolicy
{
    public const ACCESS_READ = 'read';
    public const ACCESS_FULL = 'full';

    /**
     * @var array<string, array<string, string>>
     */
    private const SCOPE_MAP = [
        'board.read' => [
            BoardGateway::class => self::ACCESS_FULL,
        ],
        'member.read' => [
            MemberGateway::class => self::ACCESS_READ,
        ],
        'member.write' => [
            MemberGateway::class => self::ACCESS_FULL,
        ],
        'post.read' => [
            PostReadGateway::class => self::ACCESS_READ,
            PostGateway::class => self::ACCESS_READ,
        ],
        'post.write' => [
            PostReadGateway::class => self::ACCESS_FULL,
            PostWriteGateway::class => self::ACCESS_FULL,
            PostGateway::class => self::ACCESS_FULL,
        ],
        'point.write' => [
            PointRewardGateway::class => self::ACCESS_FULL,
            PointGateway::class => self::ACCESS_FULL,
        ],
    ];

    /**
     * @param array<int, mixed> $scopes
     * @return array<int, string>
     */
    public function unsupportedScopes(array $scopes): array
    {
        $unsupported = [];
        foreach ($scopes as $scope) {
            if (!is_string($scope)) {
                $unsupported[] = get_debug_type($scope);

                continue;
            }

            $normalized = trim($scope);
            if ($normalized === '') {
                $unsupported[] = '(empty)';

                continue;
            }

            if (!isset(self::SCOPE_MAP[$normalized])) {
                $unsupported[] = $normalized;
            }
        }

        return array_values(array_unique($unsupported));
    }

    /**
     * @param array<int, mixed> $scopes
     * @return array<string, string>
     */
    public function permissionsFor(array $scopes): array
    {
        $permissions = [];

        foreach ($scopes as $scope) {
            if (!is_string($scope)) {
                continue;
            }

            $normalized = trim($scope);
            if ($normalized === '' || !isset(self::SCOPE_MAP[$normalized])) {
                continue;
            }

            foreach (self::SCOPE_MAP[$normalized] as $serviceId => $access) {
                $current = $permissions[$serviceId] ?? null;
                if ($current === self::ACCESS_FULL || $access === self::ACCESS_FULL) {
                    $permissions[$serviceId] = self::ACCESS_FULL;

                    continue;
                }

                $permissions[$serviceId] = self::ACCESS_READ;
            }
        }

        return $permissions;
    }

    public function isKnownGateway(string $serviceId): bool
    {
        foreach (self::SCOPE_MAP as $services) {
            if (isset($services[$serviceId])) {
                return true;
            }
        }

        return false;
    }
}
