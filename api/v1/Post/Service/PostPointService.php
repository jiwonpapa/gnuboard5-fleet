<?php

/**
 * 게시글 도메인 포인트 처리 서비스.
 *
 * @package  Gnuboard5\Api\v1\Post\Service
 * @since    v1.1.0
 */

declare(strict_types=1);

namespace Api\Post\Service;

use Api\Board\Service\BoardService;
use Api\Core\Plugin\EventDispatcher;
use Api\Integration\Contracts\PointRewardGateway;
use Api\Support\Exception\ApiException;

final class PostPointService
{
    public function __construct(
        private readonly PointRewardGateway $pointGateway,
        private readonly BoardService $boardService,
        private readonly EventDispatcher $events
    ) {
    }

    public function grantWritePoint(array $member, array $board, string $boTable, int $postId): void
    {
        $memberId = (string)($member['mb_id'] ?? '');
        $amount = (int)($board['bo_write_point'] ?? 0);
        $reason = $this->buildPointContent((string)($board['bo_subject'] ?? ''), $postId, '글쓰기');

        $this->pointGateway->grant(
            $memberId,
            $amount,
            $reason,
            $boTable,
            (string)$postId,
            '쓰기'
        );
        $this->dispatchPointAdded($memberId, $amount, $reason, $boTable, (string)$postId, '쓰기');
    }

    public function revokeWritePoint(array $post, array $board, string $boTable): void
    {
        $postId = (int)($post['wr_id'] ?? 0);
        $this->pointGateway->revoke(
            (string)($post['mb_id'] ?? ''),
            $boTable,
            (string)$postId,
            '쓰기',
            '글삭제회수',
            $this->buildPointContent((string)($board['bo_subject'] ?? ''), $postId, '글삭제')
        );
    }

    /**
     * @param array<int, array{wr_id:int,mb_id:string}> $comments
     */
    public function revokeCommentPointsForPost(array $board, string $boTable, array $comments): void
    {
        foreach ($comments as $comment) {
            $commentId = (int)($comment['wr_id'] ?? 0);
            $memberId = trim((string)($comment['mb_id'] ?? ''));
            if ($commentId <= 0 || $memberId === '') {
                continue;
            }

            $this->pointGateway->revoke(
                $memberId,
                $boTable,
                (string)$commentId,
                '댓글',
                '댓글삭제회수',
                $this->buildPointContent((string)($board['bo_subject'] ?? ''), $commentId, '댓글삭제')
            );
        }
    }

    public function grantReplyPoint(array $member, array $board, string $boTable, int $replyId): void
    {
        $memberId = (string)($member['mb_id'] ?? '');
        $amount = (int)($board['bo_comment_point'] ?? 0);
        $reason = $this->buildPointContent((string)($board['bo_subject'] ?? ''), $replyId, '답변');

        $this->pointGateway->grant(
            $memberId,
            $amount,
            $reason,
            $boTable,
            (string)$replyId,
            '답변'
        );
        $this->dispatchPointAdded($memberId, $amount, $reason, $boTable, (string)$replyId, '답변');
    }

    public function applyReadPointIfNeeded(string $boTable, int $wrId, array $post, array $member, array $board): void
    {
        $readPoint = (int)($board['bo_read_point'] ?? 0);
        if ($readPoint >= 0) {
            return;
        }

        $memberId = trim((string)($member['mb_id'] ?? ''));
        if ($memberId === '') {
            throw ApiException::forbidden('읽기 포인트 차감 게시판은 회원만 열람할 수 있습니다.');
        }

        $authorId = trim((string)($post['mb_id'] ?? ''));
        if ($authorId !== '' && $authorId === $memberId) {
            return;
        }
        if ($this->boardService->resolveAdminRole($member, $board) !== null) {
            return;
        }

        $this->pointGateway->grant(
            $memberId,
            $readPoint,
            $this->buildPointContent((string)($board['bo_subject'] ?? ''), $wrId, '글읽기'),
            $boTable,
            (string)$wrId,
            '읽기'
        );
        $this->dispatchPointAdded(
            $memberId,
            $readPoint,
            $this->buildPointContent((string)($board['bo_subject'] ?? ''), $wrId, '글읽기'),
            $boTable,
            (string)$wrId,
            '읽기'
        );
    }

    private function buildPointContent(string $boardSubject, int $wrId, string $suffix): string
    {
        $subject = trim($boardSubject);
        if ($subject === '') {
            return $wrId . ' ' . $suffix;
        }

        return $subject . ' ' . $wrId . ' ' . $suffix;
    }

    private function dispatchPointAdded(string $memberId, int $amount, string $reason, string $relTable, string $relId, string $action): void
    {
        if ($amount === 0 || trim($memberId) === '') {
            return;
        }

        $this->events->dispatch('point.added', [
            'member_id' => $memberId,
            'amount' => $amount,
            'reason' => $reason,
            'rel_table' => $relTable,
            'rel_id' => $relId,
            'action' => $action,
        ]);
    }
}
