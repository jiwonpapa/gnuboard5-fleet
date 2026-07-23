<?php

declare(strict_types=1);

namespace Api\Admin\Config\Support;

use Api\Support\Exception\ApiException;

final class AdminConfigRequestGuard
{
    /**
     * @param array<string, mixed> $payload
     */
    public function assertUpdateAllowed(array $payload, ?string $remoteAddress): void
    {
        $remoteAddress = trim((string)$remoteAddress);
        if ($remoteAddress === '') {
            return;
        }

        $interceptIp = trim((string)($payload['cf_intercept_ip'] ?? ''));
        if ($interceptIp === '') {
            return;
        }

        $pattern = preg_replace('/\R+/', '|', $interceptIp) ?? '';
        $pattern = str_replace(['.', '+'], ['\.', '[0-9\.]+'], $pattern);
        if ($pattern !== '' && preg_match('/^(?:' . $pattern . ')$/', $remoteAddress) === 1) {
            throw ApiException::badRequest(
                '현재 접속 IP : ' . $remoteAddress . ' 가 차단될 수 있기 때문에, 다른 IP를 입력해 주세요.'
            );
        }
    }
}
