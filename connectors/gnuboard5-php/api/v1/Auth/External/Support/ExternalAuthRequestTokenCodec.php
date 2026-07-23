<?php

declare(strict_types=1);

namespace Api\Auth\External\Support;

use Api\Support\Exception\ApiException;

final readonly class ExternalAuthRequestTokenCodec
{
    public function __construct(
        private string $secret,
        private int $ttlSeconds
    ) {
    }

    /**
     * @param array<string, mixed> $claims
     */
    public function issue(array $claims): string
    {
        $issuedAt = time();
        $payload = array_merge($claims, [
            'iat' => $issuedAt,
            'exp' => $issuedAt + $this->ttlSeconds,
        ]);

        $json = json_encode($payload, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
        $encodedPayload = self::base64UrlEncode($json);
        $signature = self::base64UrlEncode(
            hash_hmac('sha256', $encodedPayload, $this->secret, true)
        );

        return $encodedPayload . '.' . $signature;
    }

    /**
     * @return array<string, mixed>
     */
    public function decode(string $token): array
    {
        $normalized = trim($token);
        if ($normalized === '') {
            throw ApiException::badRequest('request_token이 필요합니다.');
        }

        $parts = explode('.', $normalized, 2);
        if (count($parts) !== 2 || $parts[0] === '' || $parts[1] === '') {
            throw ApiException::badRequest('request_token 형식이 올바르지 않습니다.');
        }

        [$encodedPayload, $encodedSignature] = $parts;
        $expectedSignature = self::base64UrlEncode(
            hash_hmac('sha256', $encodedPayload, $this->secret, true)
        );

        if (!hash_equals($expectedSignature, $encodedSignature)) {
            throw ApiException::unauthorized('외부 인증 요청 검증에 실패했습니다.');
        }

        $decodedPayload = self::base64UrlDecode($encodedPayload);
        $claims = json_decode($decodedPayload, true);
        if (!is_array($claims)) {
            throw ApiException::badRequest('request_token payload를 해석할 수 없습니다.');
        }

        $expiresAt = isset($claims['exp']) && is_numeric($claims['exp']) ? (int)$claims['exp'] : null;
        if ($expiresAt === null || $expiresAt < time()) {
            throw ApiException::unauthorized('외부 인증 요청이 만료되었습니다.');
        }

        return $claims;
    }

    private static function base64UrlEncode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }

    private static function base64UrlDecode(string $value): string
    {
        $padding = strlen($value) % 4;
        if ($padding > 0) {
            $value .= str_repeat('=', 4 - $padding);
        }

        $decoded = base64_decode(strtr($value, '-_', '+/'), true);
        if ($decoded === false) {
            throw ApiException::badRequest('request_token 디코딩에 실패했습니다.');
        }

        return $decoded;
    }
}
