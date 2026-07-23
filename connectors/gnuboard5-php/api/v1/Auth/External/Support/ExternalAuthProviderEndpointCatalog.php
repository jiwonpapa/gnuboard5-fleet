<?php

declare(strict_types=1);

namespace Api\Auth\External\Support;

use Api\Support\Exception\ApiException;

final class ExternalAuthProviderEndpointCatalog
{
    /** @var array<string,array<string,string>> */
    private array $definitions;

    public function __construct(?string $path = null)
    {
        $file = $path ?? __DIR__ . '/provider-endpoints.json';
        $raw = @file_get_contents($file);
        if ($raw === false) {
            throw ApiException::serverError('외부 인증 공급자 endpoint catalog를 읽을 수 없습니다.');
        }

        $decoded = json_decode($raw, true);
        if (!is_array($decoded)) {
            throw ApiException::serverError('외부 인증 공급자 endpoint catalog 형식이 올바르지 않습니다.');
        }

        $this->definitions = $decoded;
    }

    public function endpoint(string $provider, string $kind): string
    {
        $value = $this->definitions[$provider][$kind] ?? null;
        if (!is_string($value) || trim($value) === '') {
            throw ApiException::serverError('외부 인증 공급자 endpoint 기본값을 찾을 수 없습니다.');
        }

        return trim($value);
    }
}
