<?php

declare(strict_types=1);

namespace Tests\Post;

use Api\Board\Service\BoardService;
use Api\Integration\Contracts\BoardGateway;
use Api\Integration\Contracts\PointRewardGateway;
use Api\Post\Contracts\PostGateway;
use PHPUnit\Framework\TestCase;
use Tests\Support\BuildsDomainServices;

final class PostServiceTest extends TestCase
{
    use BuildsDomainServices;

    public function testListPostsStripsFourByteCharactersFromSearch(): void
    {
        $boardGateway = $this->createMock(BoardGateway::class);
        $boardGateway->expects($this->once())
            ->method('exists')
            ->with('free')
            ->willReturn(true);
        $boardGateway->expects($this->once())
            ->method('findBoard')
            ->with('free')
            ->willReturn([
                'bo_table' => 'free',
                'bo_list_level' => 1,
                'gr_use_access' => 0,
            ]);

        $postGateway = $this->createMock(PostGateway::class);
        $postGateway->expects($this->once())
            ->method('listPosts')
            ->with(
                'free',
                1,
                20,
                null,
                'author',
                'abc',
                null
            )
            ->willReturn([
                'items' => [],
                'total' => 0,
            ]);

        $service = $this->createPostService(
            $postGateway,
            new BoardService($boardGateway),
            $boardGateway,
            $this->createMock(PointRewardGateway::class)
        );

        $service->listPosts('free', 1, 20, null, 'author', "𐍈abc", null);
    }

    public function testListPostsDropsSearchWhenOnlyFourByteCharactersRemain(): void
    {
        $boardGateway = $this->createMock(BoardGateway::class);
        $boardGateway->expects($this->once())
            ->method('exists')
            ->with('free')
            ->willReturn(true);
        $boardGateway->expects($this->once())
            ->method('findBoard')
            ->with('free')
            ->willReturn([
                'bo_table' => 'free',
                'bo_list_level' => 1,
                'gr_use_access' => 0,
            ]);

        $postGateway = $this->createMock(PostGateway::class);
        $postGateway->expects($this->once())
            ->method('listPosts')
            ->with(
                'free',
                1,
                20,
                null,
                'author',
                null,
                null
            )
            ->willReturn([
                'items' => [],
                'total' => 0,
            ]);

        $service = $this->createPostService(
            $postGateway,
            new BoardService($boardGateway),
            $boardGateway,
            $this->createMock(PointRewardGateway::class)
        );

        $service->listPosts('free', 1, 20, null, 'author', "𐍈𐍈", null);
    }

    public function testListPostsStripsFourByteCharactersFromCategory(): void
    {
        $boardGateway = $this->createMock(BoardGateway::class);
        $boardGateway->expects($this->once())
            ->method('exists')
            ->with('free')
            ->willReturn(true);
        $boardGateway->expects($this->once())
            ->method('findBoard')
            ->with('free')
            ->willReturn([
                'bo_table' => 'free',
                'bo_list_level' => 1,
                'gr_use_access' => 0,
            ]);

        $postGateway = $this->createMock(PostGateway::class);
        $postGateway->expects($this->once())
            ->method('listPosts')
            ->with(
                'free',
                1,
                20,
                'news',
                null,
                null,
                null
            )
            ->willReturn([
                'items' => [],
                'total' => 0,
            ]);

        $service = $this->createPostService(
            $postGateway,
            new BoardService($boardGateway),
            $boardGateway,
            $this->createMock(PointRewardGateway::class)
        );

        $service->listPosts('free', 1, 20, "𐍈news", null, null, null);
    }
}
