<?php

declare(strict_types=1);

namespace Api\Admin\Dev\Support;

final class LocalAdminBootstrapGuard
{
    public function isAllowed(string $appEnv, string $runtimeMode, string $remoteAddr): bool
    {
        if (!$this->isPrivateAddress($remoteAddr)) {
            return false;
        }

        $normalizedEnv = strtolower(trim($appEnv));
        $normalizedRuntimeMode = strtolower(trim($runtimeMode));

        if ($normalizedRuntimeMode === 'prod' || $normalizedRuntimeMode === 'product') {
            return false;
        }

        if ($normalizedEnv === '') {
            return true;
        }

        return in_array($normalizedEnv, ['local', 'staging'], true);
    }

    public function normalizeTarget(?string $rawTarget): string
    {
        $target = trim((string)$rawTarget);
        if ($target === '') {
            return '/adm/config_form.php';
        }

        if (preg_match('#^https?://#i', $target)) {
            return '/adm/config_form.php';
        }

        if (!str_starts_with($target, '/')) {
            $target = '/' . ltrim($target, '/');
        }

        return $target;
    }

    public function resolveMemberId(?string $rawMemberId): string
    {
        $memberId = trim((string)$rawMemberId);

        return $memberId !== '' ? $memberId : 'neojins';
    }

    private function isPrivateAddress(string $remoteAddr): bool
    {
        $candidate = trim($remoteAddr);
        if ($candidate === '') {
            return false;
        }

        $packed = @inet_pton($candidate);
        if ($packed === false) {
            return false;
        }

        if (strlen($packed) === 4) {
            $unpacked = unpack('C4', $packed);
            if (!is_array($unpacked)) {
                return false;
            }

            $octets = array_values($unpacked);
            if ($octets === [127, 0, 0, 1]) {
                return true;
            }

            if ($octets[0] === 10) {
                return true;
            }

            if ($octets[0] === 192 && $octets[1] === 168) {
                return true;
            }

            if ($octets[0] === 172 && $octets[1] >= 16 && $octets[1] <= 31) {
                return true;
            }

            return false;
        }

        if (strlen($packed) === 16) {
            return $packed === hex2bin('00000000000000000000000000000001');
        }

        return false;
    }
}
