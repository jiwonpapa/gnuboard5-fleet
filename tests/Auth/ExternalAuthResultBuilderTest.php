<?php

declare(strict_types=1);

namespace Tests\Auth;

use Api\Auth\External\Service\Support\ExternalAuthResultBuilder;
use Api\Auth\External\Support\ExternalAuthRequestTokenCodec;
use Api\Support\Exception\ApiException;
use PHPUnit\Framework\TestCase;

final class ExternalAuthResultBuilderTest extends TestCase
{
    public function testBuildCompletionOutcomeIssuesTransitionTokenForSuccess(): void
    {
        $builder = new ExternalAuthResultBuilder(new ExternalAuthRequestTokenCodec('test-secret', 600));

        $outcome = $builder->buildCompletionOutcome('fake', 'login', [
            'status' => 'success',
            'provider_tx_id' => 'tx-1',
            'provider_user' => [
                'provider_user_id' => 'fake-user-001',
                'email' => 'fake-user@example.com',
            ],
        ]);

        self::assertSame('success', $outcome['status']);
        self::assertSame('tx-1', $outcome['provider_tx_id']);
        self::assertSame('fake-user-001', $outcome['provider_user']['provider_user_id'] ?? null);
        self::assertIsString($outcome['transition_token']);
        self::assertNotSame('', $outcome['transition_token'] ?? '');
    }

    public function testBuildCompletionOutcomeRejectsInvalidStatus(): void
    {
        $builder = new ExternalAuthResultBuilder(new ExternalAuthRequestTokenCodec('test-secret', 600));

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('외부 인증 공급자 결과 상태가 올바르지 않습니다.');

        $builder->buildCompletionOutcome('fake', 'login', [
            'status' => 'unknown',
        ]);
    }
}
