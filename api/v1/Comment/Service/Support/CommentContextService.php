<?php

declare(strict_types=1);

namespace Api\Comment\Service\Support;

use Api\Comment\Contracts\CommentGateway;
use Api\Integration\Contracts\PostReadGateway;
use Api\Support\Exception\ApiException;

final readonly class CommentContextService
{
    public function __construct(
        private PostReadGateway $postGateway,
        private CommentGateway $commentGateway
    ) {
    }

    /**
     * @return array<string, mixed>
     */
    public function loadPostOrFail(string $boTable, int $postId): array
    {
        $post = $this->postGateway->getPost($boTable, $postId);
        if ($post === null) {
            throw ApiException::notFound('원글을 찾을 수 없습니다.');
        }

        return $post;
    }

    public function assertParentCommentForPost(string $boTable, int $postId, ?int $parentCommentId): void
    {
        if ($parentCommentId === null) {
            return;
        }

        $parent = $this->commentGateway->getComment($boTable, $parentCommentId);
        if ($parent === null || (int)($parent['wr_parent'] ?? 0) !== $postId) {
            throw ApiException::notFound('parent_comment_id가 유효하지 않습니다.');
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function loadCommentForPostOrFail(string $boTable, int $postId, int $commentId): array
    {
        $comment = $this->commentGateway->getComment($boTable, $commentId);
        if ($comment === null || (int)($comment['wr_parent'] ?? 0) !== $postId) {
            throw ApiException::notFound('댓글을 찾을 수 없습니다.');
        }

        return $comment;
    }
}
