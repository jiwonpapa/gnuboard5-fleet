<?php

declare(strict_types=1);

namespace Tests\Auth;

use Api\Auth\Service\Support\AuthSessionRequestNormalizer;
use Api\Support\Exception\ApiException;
use PHPUnit\Framework\TestCase;

final class AuthSessionRequestNormalizerTest extends TestCase
{
    private AuthSessionRequestNormalizer $normalizer;

    protected function setUp(): void
    {
        $this->normalizer = new AuthSessionRequestNormalizer();
    }

    public function testLoginRejectsUnknownFields(): void
    {
        $this->expectException(ApiException::class);
        $this->normalizer->login(['mb_id' => 'user1', 'mb_password' => 'secret', 'role' => 'admin']);
    }

    public function testRefreshRejectsNonStringToken(): void
    {
        $this->expectException(ApiException::class);
        $this->normalizer->refresh(['refresh_token' => ['invalid']]);
    }

    public function testLogoutAcceptsAbsentOrNullToken(): void
    {
        self::assertNull($this->normalizer->logout([]));
        self::assertNull($this->normalizer->logout(['refresh_token' => null]));
    }
}
