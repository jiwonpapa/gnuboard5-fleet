<?php

declare(strict_types=1);

namespace Tests\Member;

use Api\Integration\Contracts\MemberGateway;
use Api\Member\Service\MemberProfileFieldNormalizer;
use Api\Support\Exception\ApiException;
use PHPUnit\Framework\TestCase;

final class MemberProfileFieldNormalizerTest extends TestCase
{
    public function testValidatePayloadKeysRejectsUnsupportedField(): void
    {
        $normalizer = new MemberProfileFieldNormalizer($this->createMock(MemberGateway::class));

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('허용되지 않은 수정 필드가 포함되어 있습니다.');

        $normalizer->validatePayloadKeys([
            'mb_email' => 'user@example.com',
            'mb_id' => 'user1',
        ]);
    }

    public function testNormalizeUpdatesNormalizesSupportedFields(): void
    {
        $gateway = $this->createMock(MemberGateway::class);
        $gateway->expects($this->once())
            ->method('validatePassword')
            ->with('Abcd!2345');
        $gateway->expects($this->once())
            ->method('hashPassword')
            ->with('Abcd!2345')
            ->willReturn('HASHED-PASSWORD');
        $gateway->expects($this->once())
            ->method('validateNicknameForUpdate')
            ->with('새닉네임', 'user1');
        $gateway->expects($this->once())
            ->method('validateEmailForUpdate')
            ->with('user@example.com', 'user1');
        $gateway->expects($this->once())
            ->method('validatePhoneForUpdate')
            ->with('01012345678', 'user1');

        $normalizer = new MemberProfileFieldNormalizer($gateway);
        $result = $normalizer->normalizeUpdates([
            'mb_password' => ' Abcd!2345 ',
            'mb_nick' => '<b>새닉네임</b>',
            'mb_email' => ' user@example.com ',
            'mb_hp' => '010-1234-5678',
            'mb_homepage' => '<i>https://example.com</i>',
            'mb_addr3' => '<b>역삼동</b>',
            'mb_addr_jibeon' => 'r',
            'mb_signature' => "hello<script>alert(1)</script>\nworld",
            'mb_zip' => '123-456',
            'mb_mailling' => 'on',
            'mb_sms' => 'off',
            'mb_marketing_agree' => 'yes',
            'mb_open' => false,
            'mb_addr1' => '<b>서울시</b>',
        ], 'user1');

        $this->assertSame('HASHED-PASSWORD', $result['mb_password']);
        $this->assertSame('새닉네임', $result['mb_nick']);
        $this->assertSame('user@example.com', $result['mb_email']);
        $this->assertSame('01012345678', $result['mb_hp']);
        $this->assertSame('https://example.com', $result['mb_homepage']);
        $this->assertSame('역삼동', $result['mb_addr3']);
        $this->assertSame('R', $result['mb_addr_jibeon']);
        $this->assertSame("helloalert(1)\nworld", $result['mb_signature']);
        $this->assertSame('123', $result['mb_zip1']);
        $this->assertSame('456', $result['mb_zip2']);
        $this->assertSame('1', $result['mb_mailling']);
        $this->assertSame('0', $result['mb_sms']);
        $this->assertSame('1', $result['mb_marketing_agree']);
        $this->assertSame('0', $result['mb_open']);
        $this->assertSame('서울시', $result['mb_addr1']);
    }

    public function testNormalizeUpdatesNormalizesExplicitZipSegmentsAndBooleanVariants(): void
    {
        $normalizer = new MemberProfileFieldNormalizer($this->createMock(MemberGateway::class));

        $result = $normalizer->normalizeUpdates([
            'mb_zip1' => '12a3',
            'mb_zip2' => '4-567',
            'mb_thirdparty_agree' => 'off',
        ], 'user1');

        $this->assertSame('123', $result['mb_zip1']);
        $this->assertSame('456', $result['mb_zip2']);
        $this->assertSame('0', $result['mb_thirdparty_agree']);
    }

    public function testValidatePayloadKeysRejectsIdentityAssertionFields(): void
    {
        $normalizer = new MemberProfileFieldNormalizer($this->createMock(MemberGateway::class));

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('허용되지 않은 수정 필드가 포함되어 있습니다.');

        $normalizer->validatePayloadKeys(['mb_adult' => true]);
    }
}
