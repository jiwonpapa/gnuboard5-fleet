<?php

declare(strict_types=1);

namespace Tests\Admin\Poll;

use Api\Admin\Poll\Service\Support\AdminPollInputNormalizer;
use Api\Support\Exception\ApiException;
use PHPUnit\Framework\TestCase;

final class AdminPollInputNormalizerTest extends TestCase
{
    public function testNormalizeCreatePayloadClosesAndTypesTheCanonicalFields(): void
    {
        $normalizer = new AdminPollInputNormalizer();

        $result = $normalizer->normalizeCreatePayload([
            'po_subject' => ' 설문 ',
            'options' => [' 찬성 ', '반대'],
            'po_level' => '3',
            'po_point' => 10,
            'po_use' => 'yes',
            'po_etc' => ' 기타의견을 입력하세요 ',
            'po_date' => '2026-07-15',
        ]);

        self::assertSame('설문', $result['po_subject']);
        self::assertSame('찬성', $result['po_poll1']);
        self::assertSame('반대', $result['po_poll2']);
        self::assertSame(3, $result['po_level']);
        self::assertSame(10, $result['po_point']);
        self::assertSame(1, $result['po_use']);
        self::assertSame('기타의견을 입력하세요', $result['po_etc']);
        self::assertSame('2026-07-15', $result['po_date']);
    }

    public function testNormalizeCreatePayloadRejectsUnknownAndInvalidTypedFields(): void
    {
        $normalizer = new AdminPollInputNormalizer();

        try {
            $normalizer->normalizeCreatePayload([
                'po_subject' => '설문',
                'options' => ['찬성', '반대'],
                'unexpected' => true,
            ]);
            self::fail('Unknown field was accepted.');
        } catch (ApiException $exception) {
            self::assertStringContainsString('허용되지 않은 필드', $exception->getMessage());
        }

        try {
            $normalizer->normalizeCreatePayload([
                'po_subject' => '설문',
                'options' => ['찬성', '반대'],
                'po_date' => '2026-02-30',
            ]);
            self::fail('Invalid date was accepted.');
        } catch (ApiException $exception) {
            self::assertSame('po_date는 YYYY-MM-DD 형식이어야 합니다.', $exception->getMessage());
        }

        try {
            $normalizer->normalizeCreatePayload([
                'po_subject' => '설문',
                'options' => ['찬성', '반대'],
                'po_etc' => true,
            ]);
            self::fail('Boolean po_etc was accepted.');
        } catch (ApiException $exception) {
            self::assertSame('po_etc 값은 문자열이어야 합니다.', $exception->getMessage());
        }
    }

    public function testNormalizePollPayloadRequiresAtLeastTwoOptions(): void
    {
        $normalizer = new AdminPollInputNormalizer();

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('투표 항목은 최소 2개 이상 필요합니다.');

        $normalizer->normalizePollPayload([
            'po_subject' => '설문',
            'options' => ['찬성'],
        ]);
    }

    public function testRequirePollIdRejectsZero(): void
    {
        $normalizer = new AdminPollInputNormalizer();

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('po_id는 1 이상의 정수여야 합니다.');

        $normalizer->requirePollId(0);
    }
}
