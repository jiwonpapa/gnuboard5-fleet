<?php

declare(strict_types=1);

namespace Api\Auth\External\Service\Support;

use Api\Auth\External\Support\ExternalAuthConfig;
use Api\Support\Exception\ApiException;

final readonly class ExternalAuthInputValueNormalizer
{
    /** @var list<string> */
    private const SUPPORTED_FLOWS = ['login', 'identity_verify', 'account_link'];

    public function __construct(private ExternalAuthConfig $config)
    {
    }

    public function normalizeProvider(string $provider): string
    {
        $normalized = strtolower(trim($provider));
        if ($normalized === '' || preg_match('/^[a-z][a-z0-9_-]{1,31}$/', $normalized) !== 1) {
            throw ApiException::badRequest('provider 형식이 올바르지 않습니다.');
        }

        return $normalized;
    }

    public function normalizeFlow(mixed $flow): string
    {
        $normalized = strtolower(trim((string)$flow));
        if (!in_array($normalized, self::SUPPORTED_FLOWS, true)) {
            throw ApiException::badRequest('flow는 login, identity_verify, account_link 중 하나여야 합니다.');
        }

        return $normalized;
    }

    public function normalizeCallbackUrl(string $callbackUrl): string
    {
        $normalized = trim($callbackUrl);
        if ($normalized === '') {
            throw ApiException::badRequest('callback_url이 필요합니다.');
        }

        $parts = parse_url($normalized);
        if ($parts === false || !isset($parts['scheme']) || trim((string)$parts['scheme']) === '') {
            throw ApiException::badRequest('callback_url 형식이 올바르지 않습니다.');
        }

        $scheme = strtolower((string)$parts['scheme']);
        if (($scheme === 'http' || $scheme === 'https') && !isset($parts['host'])) {
            throw ApiException::badRequest('callback_url 형식이 올바르지 않습니다.');
        }

        return $normalized;
    }

    /**
     * @return list<string>
     */
    public function normalizeStringList(mixed $value): array
    {
        if ($value === null) {
            return [];
        }

        if (!is_array($value)) {
            throw ApiException::badRequest('scopes는 문자열 배열이어야 합니다.');
        }

        $unique = [];
        foreach ($value as $item) {
            $normalized = trim((string)$item);
            if ($normalized === '') {
                continue;
            }

            $unique[$normalized] = true;
        }

        return array_keys($unique);
    }

    /**
     * @return array<string, mixed>
     */
    public function normalizeAssociativeArray(mixed $value): array
    {
        if ($value === null) {
            return [];
        }

        if (!is_array($value)) {
            throw ApiException::badRequest('payload와 metadata는 JSON object여야 합니다.');
        }

        return $value;
    }

    public function normalizeScenario(mixed $scenario): ?string
    {
        if ($scenario === null) {
            return null;
        }

        $normalized = strtolower(trim((string)$scenario));
        if ($normalized === '') {
            return null;
        }

        if (!$this->config->allowReplayScenarios) {
            throw ApiException::forbidden('외부 인증 replay 시나리오는 현재 런타임에서 비활성화되어 있습니다.');
        }

        return $normalized;
    }

    public function normalizeOptionalString(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $normalized = trim((string)$value);

        return $normalized === '' ? null : $normalized;
    }
}
