<?php

declare(strict_types=1);

namespace Tests\Admin\Sms;

use Api\Admin\Sms\Support\LegacyIcodeResultNormalizer;
use PHPUnit\Framework\TestCase;

final class LegacyIcodeResultNormalizerTest extends TestCase
{
    public function testSummarizeDispatchMapsSuccessfulAndFailedRecipients(): void
    {
        $normalizer = new LegacyIcodeResultNormalizer();

        $summary = $normalizer->summarizeDispatch(
            [
                [
                    'recipient' => ['bk_hp' => '01012345678', 'bk_name' => '홍길동'],
                    'status' => 'prepared',
                ],
                [
                    'recipient' => ['bk_hp' => '010-9999-8888', 'bk_name' => '김철수'],
                    'status' => 'prepared',
                ],
            ],
            true,
            ['01012345678:ABCD1234', '010-9999-8888:Error(97)'],
            'sms'
        );

        self::assertSame(1, $summary['success']);
        self::assertSame(1, $summary['failure']);
        self::assertSame('ABCD1234', $summary['items'][0]['code']);
        self::assertTrue($summary['items'][0]['success']);
        self::assertSame('010-1234-5678로 전송했습니다.', $summary['items'][0]['memo']);
        self::assertSame('97', $summary['items'][1]['code']);
        self::assertFalse($summary['items'][1]['success']);
        self::assertSame('잔여코인이 부족합니다.', $summary['items'][1]['memo']);
        self::assertSame('icode:sms:sent', $summary['items'][1]['log']);
    }

    public function testSummarizeDispatchPreservesPreparedFailureAndUsesTransportErrorFallback(): void
    {
        $normalizer = new LegacyIcodeResultNormalizer();

        $summary = $normalizer->summarizeDispatch(
            [
                [
                    'recipient' => ['bk_hp' => '01012345678', 'bk_name' => '홍길동'],
                    'success' => false,
                    'code' => 'PREPARE_ERROR',
                    'memo' => 'failed to prepare',
                    'log' => '',
                    'status' => 'prepared-failed',
                ],
                [
                    'recipient' => ['bk_hp' => '01099998888', 'bk_name' => '김철수'],
                    'status' => 'prepared',
                ],
            ],
            false,
            [],
            'lms'
        );

        self::assertSame(0, $summary['success']);
        self::assertSame(2, $summary['failure']);
        self::assertSame('PREPARE_ERROR', $summary['items'][0]['code']);
        self::assertSame('failed to prepare', $summary['items'][0]['memo']);
        self::assertSame('TRANSPORT_ERROR', $summary['items'][1]['code']);
        self::assertSame('인증 받지 못하였습니다. 계정을 다시 확인해 주세요.', $summary['items'][1]['memo']);
        self::assertSame('icode:lms:transport_error', $summary['items'][1]['log']);
    }
}
