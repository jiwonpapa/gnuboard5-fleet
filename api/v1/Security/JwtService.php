<?php

/**
 * JwtService API 모듈 정의.
 *
 * @package  Gnuboard5\Api\v1\Security
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Security;

use Api\Core\Enum\TokenType;
use Api\Support\Exception\ApiException;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Throwable;

final class JwtService
{
    public function __construct(
        private readonly string $secret,
        private readonly int $accessTtlSeconds,
        private readonly int $refreshTtlSeconds,
        private readonly string $issuer = 'gnuboard5-restapi',
        private readonly string $audience = 'gnuboard5-restapi',
        private readonly int $leewaySeconds = 30
    ) {
        if (trim($secret) === '') {
            throw ApiException::serverError('JWT_SECRET 미설정');
        }

        if (strlen($secret) < 32) {
            throw ApiException::serverError('JWT_SECRET은 최소 32자 이상이어야 합니다.');
        }

        JWT::$leeway = max(0, $this->leewaySeconds);
    }

    public function issueAccessToken(string $memberId, array $additional = []): string
    {
        return $this->issueToken($memberId, TokenType::Access, $this->accessTtlSeconds, $additional);
    }

    public function issueRefreshToken(string $memberId, array $additional = []): string
    {
        return $this->issueToken($memberId, TokenType::Refresh, $this->refreshTtlSeconds, $additional);
    }

    public function issuePair(string $memberId, array $accessAdditional = [], array $refreshAdditional = []): array
    {
        return [
            'access_token' => $this->issueAccessToken($memberId, $accessAdditional),
            'refresh_token' => $this->issueRefreshToken($memberId, $refreshAdditional),
            'expires_in' => $this->accessTtlSeconds,
        ];
    }

    public function decode(string $token): object
    {
        try {
            return JWT::decode($token, new Key($this->secret, 'HS256'));
        } catch (Throwable $exception) {
            throw ApiException::unauthorized($exception->getMessage());
        }
    }

    public function getPayloadArray(object $decoded): array
    {
        return json_decode((string)json_encode($decoded), true) ?: [];
    }

    private function issueToken(string $memberId, TokenType $type, int $ttl, array $additional): string
    {
        $now = time();
        $payload = array_merge([
            'iss' => $this->issuer,
            'aud' => $this->audience,
            'iat' => $now,
            'nbf' => $now,
            'exp' => $now + $ttl,
            'sub' => $memberId,
            'type' => $type->value,
            'jti' => bin2hex(random_bytes(12)),
        ], $additional);

        return JWT::encode($payload, $this->secret, 'HS256');
    }

    public function assertRefreshTokenType(array $payload): void
    {
        if (!isset($payload['type']) || (string)$payload['type'] !== TokenType::Refresh->value) {
            throw ApiException::unauthorized('Refresh 토큰이 아닙니다.');
        }
    }

    public function assertAccessTokenType(array $payload): void
    {
        if (!isset($payload['type']) || (string)$payload['type'] !== TokenType::Access->value) {
            throw ApiException::unauthorized('Access 토큰이 아닙니다.');
        }
    }
}
