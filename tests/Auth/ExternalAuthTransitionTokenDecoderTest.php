<?php

declare(strict_types=1);

namespace Tests\Auth;

use Api\Auth\External\Service\Support\ExternalAuthTransitionTokenDecoder;
use Api\Auth\External\Support\ExternalAuthRequestTokenCodec;
use Api\Support\Exception\ApiException;
use PHPUnit\Framework\TestCase;

final class ExternalAuthTransitionTokenDecoderTest extends TestCase
{
    public function testDecodeReturnsNormalizedTransitionPayload(): void
    {
        $codec = new ExternalAuthRequestTokenCodec('transition-secret', 600);
        $token = $codec->issue([
            'kind' => 'external_transition',
            'provider' => 'fake',
            'flow' => 'login',
            'provider_user_id' => 'fake-user-001',
            'provider_email' => 'FAKE-USER@EXAMPLE.COM',
            'provider_profile' => [
                'display_name' => 'Fake User',
            ],
        ]);

        $decoder = new ExternalAuthTransitionTokenDecoder($codec);
        $result = $decoder->decode('fake', $token, ['login']);

        self::assertSame('fake', $result['provider']);
        self::assertSame('login', $result['flow']);
        self::assertSame('fake-user-001', $result['provider_user_id']);
        self::assertSame('fake-user@example.com', $result['provider_email']);
        self::assertSame('Fake User', $result['provider_profile']['display_name'] ?? null);
    }

    public function testDecodeRejectsUnsupportedFlow(): void
    {
        $codec = new ExternalAuthRequestTokenCodec('transition-secret', 600);
        $token = $codec->issue([
            'kind' => 'external_transition',
            'provider' => 'fake',
            'flow' => 'account_link',
            'provider_user_id' => 'fake-user-001',
        ]);

        $decoder = new ExternalAuthTransitionTokenDecoder($codec);

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('해당 외부 인증 흐름에서는 지원되지 않는 전환입니다.');

        $decoder->decode('fake', $token, ['login']);
    }
}
