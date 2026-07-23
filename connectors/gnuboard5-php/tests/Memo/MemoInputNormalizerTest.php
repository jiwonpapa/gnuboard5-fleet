<?php

declare(strict_types=1);

namespace Tests\Memo;

use Api\Memo\Service\Support\MemoInputNormalizer;
use Api\Support\Exception\ApiException;
use PHPUnit\Framework\TestCase;

final class MemoInputNormalizerTest extends TestCase
{
    public function testNormalizeSendPayloadSanitizesRecipientsAndMemo(): void
    {
        $normalizer = new MemoInputNormalizer();

        $payload = $normalizer->normalizeSendPayload([
            'me_recv_mb_id' => ' user1 , user2 , user1 , @bad-id ',
            'me_memo' => ' <b>Hello</b> ',
        ]);

        $this->assertSame(['user1', 'user2', 'badid'], $payload['recipients']);
        $this->assertSame('&lt;b&gt;Hello&lt;/b&gt;', $payload['memo']);
    }

    public function testRequireMemoIdRejectsNonPositiveValue(): void
    {
        $normalizer = new MemoInputNormalizer();

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('me_id는 1 이상의 정수여야 합니다.');

        $normalizer->requireMemoId(0);
    }
}
