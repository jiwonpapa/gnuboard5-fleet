<?php

declare(strict_types=1);

namespace Tests\Like;

use Api\Board\Service\BoardService;
use Api\Core\Enum\VoteType;
use Api\Integration\Contracts\BoardGateway;
use Api\Like\Contracts\LikeGateway;
use Api\Like\Service\LikeService;
use Api\Support\Exception\ApiException;
use PHPUnit\Framework\TestCase;

final class LikeServiceTest extends TestCase
{
    public function testVoteRejectsWhenTypeMissing(): void
    {
        [$service, $likeGateway] = $this->createService(['bo_read_level' => 1]);
        $likeGateway->expects($this->never())->method('castVote');

        $this->expectException(ApiException::class);
        $service->vote('free', 12, ['mb_id' => 'user1', 'mb_level' => 2], []);
    }

    public function testVoteIncrementsCountsWithValidRequest(): void
    {
        [$service, $likeGateway] = $this->createService(['bo_read_level' => 1]);
        $likeGateway->expects($this->once())
            ->method('castVote')
            ->with('free', 12, 'user1', VoteType::Good)
            ->willReturn(['wr_good' => 3, 'wr_nogood' => 1]);

        $result = $service->vote('free', 12, ['mb_id' => 'user1', 'mb_level' => 2], ['type' => 'good']);

        $this->assertSame(3, $result['wr_good']);
        $this->assertSame(1, $result['wr_nogood']);
    }

    public function testVotePropagatesGatewayException(): void
    {
        [$service, $likeGateway] = $this->createService(['bo_read_level' => 1]);
        $likeGateway->expects($this->once())
            ->method('castVote')
            ->willThrowException(ApiException::forbidden('자신의 글에는 추천/비추천할 수 없습니다.'));

        $this->expectException(ApiException::class);
        $service->vote('free', 12, ['mb_id' => 'user1', 'mb_level' => 2], ['type' => 'good']);
    }

    public function testVoteRejectsWhenNoBoardPermission(): void
    {
        [$service, $likeGateway] = $this->createService(null);
        $likeGateway->expects($this->never())->method('castVote');

        $this->expectException(ApiException::class);
        $service->vote('free', 12, ['mb_id' => 'user1', 'mb_level' => 2], ['type' => 'good']);
    }

    /**
     * @return array{0:LikeService,1:LikeGateway}
     */
    private function createService(?array $boardRow): array
    {
        $boardGateway = $this->createMock(BoardGateway::class);
        $boardGateway->method('findBoard')->willReturn($boardRow);

        $likeGateway = $this->createMock(LikeGateway::class);

        $service = new LikeService(
            $likeGateway,
            new BoardService($boardGateway)
        );

        return [$service, $likeGateway];
    }
}
