<?php

declare(strict_types=1);

namespace Tests\Auth;

use Api\Auth\External\Service\Support\ExternalAuthRequestNormalizer;
use Api\Auth\External\Support\ExternalAuthConfig;
use Api\Support\Exception\ApiException;
use PHPUnit\Framework\TestCase;

final class ExternalAuthRequestNormalizerTest extends TestCase
{
    public function testNormalizeStartInputGeneratesStateAndDeduplicatesScopes(): void
    {
        $normalizer = new ExternalAuthRequestNormalizer($this->config(true));

        $result = $normalizer->normalizeStartInput([
            'flow' => 'login',
            'callback_url' => 'rustadmin://auth/callback',
            'scopes' => ['profile', 'email', 'profile', ''],
            'scenario' => 'success',
        ]);

        self::assertSame('login', $result['flow']);
        self::assertSame('rustadmin://auth/callback', $result['callback_url']);
        self::assertSame(['profile', 'email'], $result['scopes']);
        self::assertSame('success', $result['scenario']);
        self::assertMatchesRegularExpression('/^[a-f0-9]{24}$/', $result['state']);
    }

    public function testNormalizeCompleteInputRejectsStateMismatch(): void
    {
        $normalizer = new ExternalAuthRequestNormalizer($this->config(true));

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('외부 인증 state 검증에 실패했습니다.');

        $normalizer->normalizeCompleteInput(
            [
                'state' => 'wrong-state',
                'payload' => [],
            ],
            [
                'flow' => 'login',
                'state' => 'expected-state',
            ]
        );
    }

    private function config(bool $allowReplayScenarios): ExternalAuthConfig
    {
        return new ExternalAuthConfig(
            fakeProviderEnabled: true,
            allowReplayScenarios: $allowReplayScenarios,
            requestTtlSeconds: 600,
            requestTokenSecret: 'test-secret',
            fakeAuthorizeBaseUrl: '/fake-provider/authorize'
        );
    }
}
