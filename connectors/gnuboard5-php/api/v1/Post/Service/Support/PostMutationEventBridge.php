<?php

declare(strict_types=1);

namespace Api\Post\Service\Support;

use Api\Core\Plugin\EventDispatcher;

final readonly class PostMutationEventBridge
{
    public function __construct(private EventDispatcher $events)
    {
    }

    /**
     * @param array<string, mixed> $normalized
     * @param array<string, mixed> $member
     * @return array<string, mixed>
     */
    public function normalizeCreatePayload(
        string $boardId,
        array $member,
        array $normalized,
        bool $isReply,
        ?int $parentPostId
    ): array {
        $eventPayload = $this->events->dispatch('post.creating', [
            'board_id' => $boardId,
            'member' => $member,
            'data' => $normalized,
            'is_reply' => $isReply,
            'parent_post_id' => $parentPostId,
        ]);

        if (!is_array($eventPayload['data'] ?? null)) {
            return $normalized;
        }

        /** @var array<string, mixed> $eventData */
        $eventData = $eventPayload['data'];

        return array_replace($normalized, array_intersect_key($eventData, $normalized));
    }

    /**
     * @param array<string, mixed> $data
     */
    public function dispatchCreated(
        int $postId,
        string $boardId,
        array $data,
        string $memberId,
        bool $isReply,
        ?int $parentPostId = null
    ): void {
        $payload = [
            'post_id' => $postId,
            'board_id' => $boardId,
            'data' => $data,
            'member_id' => $memberId,
            'is_reply' => $isReply,
        ];

        if ($parentPostId !== null) {
            $payload['parent_post_id'] = $parentPostId;
        }

        $this->events->dispatch('post.created', $payload);
    }

    /**
     * @param array<string, mixed> $updates
     */
    public function dispatchUpdated(int $postId, string $boardId, array $updates): void
    {
        $this->events->dispatch('post.updated', [
            'post_id' => $postId,
            'board_id' => $boardId,
            'data' => $updates,
            'changed_fields' => array_keys($updates),
        ]);
    }
}
