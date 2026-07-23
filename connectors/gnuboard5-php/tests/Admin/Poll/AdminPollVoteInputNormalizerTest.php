<?php

declare(strict_types=1);

namespace Tests\Admin\Poll;

use Api\Admin\Poll\Service\Support\AdminPollVoteInputNormalizer;
use Api\Support\Exception\ApiException;
use PHPUnit\Framework\TestCase;

final class AdminPollVoteInputNormalizerTest extends TestCase
{
    public function testCanonicalAndLegacyPayloadsNormalizeToOneContract(): void
    {
        $normalizer = new AdminPollVoteInputNormalizer();

        self::assertSame(
            ['poll_no' => 2, 'po_etc_text' => '의견'],
            $normalizer->normalizePayload(['poll_no' => 2, 'po_etc_text' => ' 의견 '])
        );
        self::assertSame(
            ['poll_no' => 3, 'po_etc_text' => 'legacy'],
            $normalizer->normalizePayload(['gb_poll' => '3', 'pc_idea' => ' legacy '])
        );
    }

    public function testAmbiguousAliasesAndUnknownFieldsFailClosed(): void
    {
        $normalizer = new AdminPollVoteInputNormalizer();

        foreach (
            [
                ['poll_no' => 1, 'gb_poll' => 1],
                ['poll_no' => 1, 'unexpected' => true],
            ] as $payload
        ) {
            try {
                $normalizer->normalizePayload($payload);
                self::fail('Ambiguous or unknown payload was accepted.');
            } catch (ApiException $exception) {
                self::assertNotSame('', $exception->getMessage());
            }
        }
    }
}
