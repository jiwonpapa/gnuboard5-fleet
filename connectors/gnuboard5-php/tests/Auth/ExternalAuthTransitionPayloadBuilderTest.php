<?php

declare(strict_types=1);

namespace Tests\Auth;

use Api\Auth\External\Service\Support\ExternalAuthTransitionPayloadBuilder;
use Api\Support\Exception\ApiException;
use PHPUnit\Framework\TestCase;

final class ExternalAuthTransitionPayloadBuilderTest extends TestCase
{
    public function testBuildRegistrationPayloadFallsBackToProviderDefaults(): void
    {
        $builder = new ExternalAuthTransitionPayloadBuilder();

        $result = $builder->buildRegistrationPayload(
            [
                'mb_id' => 'newuser',
                'mb_password' => 'Abcd!2345',
                'mb_nick' => '새유저',
            ],
            [
                'provider' => 'fake',
                'flow' => 'login',
                'provider_user_id' => 'fake-user-001',
                'provider_email' => 'fake-user@example.com',
                'provider_profile' => [
                    'display_name' => 'Fake User',
                ],
            ],
            '127.0.0.1'
        );

        self::assertSame('fake-user@example.com', $result['mb_email'] ?? null);
        self::assertSame('Fake User', $result['mb_name'] ?? null);
        self::assertSame('127.0.0.1', $result['mb_ip'] ?? null);
    }

    public function testBuildRegistrationPayloadRejectsMissingEmail(): void
    {
        $builder = new ExternalAuthTransitionPayloadBuilder();

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('mb_email이 필요합니다. 공급자 이메일이 없으면 직접 입력해야 합니다.');

        $builder->buildRegistrationPayload(
            [
                'mb_id' => 'newuser',
            ],
            [
                'provider' => 'fake',
                'flow' => 'login',
                'provider_user_id' => 'fake-user-001',
                'provider_email' => '',
                'provider_profile' => [
                    'display_name' => 'Fake User',
                ],
            ],
            '127.0.0.1'
        );
    }
}
