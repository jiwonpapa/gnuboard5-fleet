<?php

declare(strict_types=1);

namespace Tests\Security;

use Api\Security\JwtService;
use Api\Support\Exception\ApiException;
use Firebase\JWT\JWT;
use PHPUnit\Framework\TestCase;

final class JwtServiceTest extends TestCase
{
    protected function tearDown(): void
    {
        JWT::$leeway = 0;

        parent::tearDown();
    }

    public function testDecodeAcceptsTokenWithinLeeway(): void
    {
        $secret = 'jwt-leeway-secret-1234567890-1234567890';
        $service = new JwtService($secret, 3600, 7200, leewaySeconds: 30);
        $now = time();

        $token = JWT::encode([
            'iss' => 'gnuboard5-restapi',
            'aud' => 'gnuboard5-restapi',
            'iat' => $now,
            'nbf' => $now + 20,
            'exp' => $now + 120,
            'sub' => 'neo',
            'type' => 'access',
            'jti' => 'within-leeway',
        ], $secret, 'HS256');

        $payload = $service->getPayloadArray($service->decode($token));

        $this->assertSame('neo', $payload['sub'] ?? null);
    }

    public function testDecodeRejectsTokenBeyondLeeway(): void
    {
        $secret = 'jwt-leeway-secret-1234567890-1234567890';
        $service = new JwtService($secret, 3600, 7200, leewaySeconds: 30);
        $now = time();

        $token = JWT::encode([
            'iss' => 'gnuboard5-restapi',
            'aud' => 'gnuboard5-restapi',
            'iat' => $now,
            'nbf' => $now + 40,
            'exp' => $now + 120,
            'sub' => 'neo',
            'type' => 'access',
            'jti' => 'beyond-leeway',
        ], $secret, 'HS256');

        $this->expectException(ApiException::class);

        $service->decode($token);
    }

    public function testConstructorRejectsTooShortSecret(): void
    {
        $this->expectException(ApiException::class);

        new JwtService('short-secret', 3600, 7200);
    }
}
