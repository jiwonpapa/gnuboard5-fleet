<?php

declare(strict_types=1);

namespace Tests\Comment;

use Api\Comment\Service\Support\CommentInputNormalizer;
use Api\Support\Exception\ApiException;
use PHPUnit\Framework\TestCase;

final class CommentInputNormalizerTest extends TestCase
{
    public function testContentRequiresNonEmptyAndEscapesHtml(): void
    {
        $normalizer = new CommentInputNormalizer();

        $result = $normalizer->content(['wr_content' => '<b>hello</b>']);

        self::assertSame('&lt;b&gt;hello&lt;/b&gt;', $result);
    }

    public function testOptionalIntValidatesParentCommentId(): void
    {
        $normalizer = new CommentInputNormalizer();

        self::assertSame(12, $normalizer->optionalInt('12', 'parent_comment_id'));
        self::assertNull($normalizer->optionalInt('', 'parent_comment_id'));
    }

    public function testMemberIdRequiresAuthenticatedMember(): void
    {
        $normalizer = new CommentInputNormalizer();

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('인증 사용자 정보가 없습니다.');

        $normalizer->memberId([]);
    }

    public function testCreateAndUpdatePayloadsRejectUndeclaredFields(): void
    {
        $normalizer = new CommentInputNormalizer();

        try {
            $normalizer->assertCreatePayload(['wr_content' => '내용', 'unknown' => true]);
            self::fail('Unknown create field was accepted.');
        } catch (ApiException $exception) {
            self::assertStringContainsString('허용되지 않은 필드', $exception->getMessage());
        }

        $this->expectException(ApiException::class);
        $normalizer->assertUpdatePayload(['wr_content' => '내용', 'parent_comment_id' => 1]);
    }
}
