<?php

declare(strict_types=1);

namespace Tests\Post;

use Api\Post\Service\Support\PostPublicPresenter;
use PHPUnit\Framework\TestCase;

final class PostPublicPresenterTest extends TestCase
{
    public function testPresenterDropsPasswordAndUndocumentedRepositoryFields(): void
    {
        $post = (new PostPublicPresenter())->present([
            'wr_id' => '12',
            'wr_subject' => '제목',
            'wr_password' => 'secret-hash',
            'internal_path' => '/srv/private',
        ]);

        self::assertSame(12, $post['wr_id']);
        self::assertSame('제목', $post['wr_subject']);
        self::assertArrayNotHasKey('wr_password', $post);
        self::assertArrayNotHasKey('internal_path', $post);
        self::assertCount(24, $post);
    }
}
