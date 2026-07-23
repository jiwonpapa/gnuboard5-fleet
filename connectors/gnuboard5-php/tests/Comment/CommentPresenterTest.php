<?php

declare(strict_types=1);

namespace Tests\Comment;

use Api\Comment\Service\Support\CommentPresenter;
use PHPUnit\Framework\TestCase;

final class CommentPresenterTest extends TestCase
{
    public function testPresenterReturnsTheExactPublicCommentShape(): void
    {
        $comment = (new CommentPresenter())->present([
            'wr_id' => '5',
            'wr_content' => '내용',
            'wr_password' => 'hidden',
        ]);

        self::assertSame(5, $comment['wr_id']);
        self::assertSame('내용', $comment['wr_content']);
        self::assertArrayNotHasKey('wr_password', $comment);
        self::assertCount(8, $comment);
    }
}
