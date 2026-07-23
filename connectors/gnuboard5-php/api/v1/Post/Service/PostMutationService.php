<?php

declare(strict_types=1);

namespace Api\Post\Service;

use Api\Board\Service\BoardService;
use Api\Core\Plugin\EventDispatcher;
use Api\Post\Contracts\PostGateway;
use Api\Post\Service\Support\PostMutationAccessGuard;
use Api\Post\Service\Support\PostMutationEventBridge;
use Api\Support\Exception\ApiException;
use Api\Support\Validation\BoTable;

final class PostMutationService
{
    private readonly PostMutationAccessGuard $accessGuard;
    private readonly PostMutationEventBridge $eventBridge;

    public function __construct(
        private readonly PostGateway $postGateway,
        private readonly BoardService $boardService,
        private readonly PostPermissionService $permissionService,
        private readonly PostPointService $pointService,
        EventDispatcher $events,
        ?PostMutationAccessGuard $accessGuard = null,
        ?PostMutationEventBridge $eventBridge = null
    ) {
        $this->accessGuard = $accessGuard ?? new PostMutationAccessGuard(
            $this->boardService,
            $this->permissionService,
            $this->postGateway
        );
        $this->eventBridge = $eventBridge ?? new PostMutationEventBridge($events);
    }

    public function createPost(string $boTable, array $member, array $payload, string $ip): int
    {
        $safeBoTable = BoTable::normalize($boTable);
        $board = $this->boardService->getBoardRow($safeBoTable);
        $adminRole = $this->accessGuard->assertCreateAllowed($member, $board, $safeBoTable);
        $memberLevel = (int)($member['mb_level'] ?? 0);
        $normalized = $this->permissionService->normalizeCreatePayload($payload, $board, $memberLevel);
        $normalized = $this->eventBridge->normalizeCreatePayload(
            $safeBoTable,
            $member,
            $normalized,
            false,
            null
        );
        if ((bool)$normalized['is_notice'] && $adminRole === null) {
            throw ApiException::forbidden('공지글 등록은 관리자만 가능합니다.');
        }

        $postId = $this->postGateway->createPost(
            $safeBoTable,
            $member,
            (string)$normalized['subject'],
            (string)$normalized['content'],
            $normalized['category'],
            $normalized['option'],
            (bool)$normalized['is_notice'],
            $ip,
            $normalized['link1'],
            $normalized['link2']
        );

        $this->pointService->grantWritePoint($member, $board, $safeBoTable, $postId);
        $this->eventBridge->dispatchCreated(
            $postId,
            $safeBoTable,
            $normalized,
            (string)($member['mb_id'] ?? ''),
            false
        );

        return $postId;
    }

    public function updatePost(string $boTable, int $wrId, array $member, array $payload): void
    {
        $safeBoTable = BoTable::normalize($boTable);
        $board = $this->boardService->getBoardRow($safeBoTable);
        $access = $this->accessGuard->assertUpdateAllowed(
            $member,
            $board,
            $this->postGateway->getPost($safeBoTable, $this->permissionService->normalizeWrId($wrId))
        );
        $post = $access['post'];
        $adminRole = $access['admin_role'];

        $updates = $this->permissionService->filterMutableFields($payload, $board, (int)($member['mb_level'] ?? 0));
        $this->postGateway->updatePost(
            $safeBoTable,
            (int)($post['wr_id'] ?? 0),
            $updates
        );

        if (array_key_exists('is_notice', $payload)) {
            if ($adminRole === null) {
                throw ApiException::forbidden('공지글 수정은 관리자만 가능합니다.');
            }

            $this->postGateway->setNotice(
                $safeBoTable,
                (int)($post['wr_id'] ?? 0),
                $this->permissionService->resolveBool($payload['is_notice'])
            );
            $updates['is_notice'] = $this->permissionService->resolveBool($payload['is_notice']);
        }

        $this->eventBridge->dispatchUpdated((int)($post['wr_id'] ?? 0), $safeBoTable, $updates);
    }

    public function createReply(string $boTable, int $wrId, array $member, array $payload, string $ip): int
    {
        $safeBoTable = BoTable::normalize($boTable);
        $parentWrId = $this->permissionService->normalizeWrId($wrId);
        $board = $this->boardService->getBoardRow($safeBoTable);
        $access = $this->accessGuard->assertReplyAllowed(
            $member,
            $board,
            $this->postGateway->getPost($safeBoTable, $parentWrId),
            $safeBoTable
        );

        $memberLevel = (int)($member['mb_level'] ?? 0);
        $normalized = $this->permissionService->normalizeReplyPayload($payload, $board, $memberLevel);
        $normalized = $this->eventBridge->normalizeCreatePayload(
            $safeBoTable,
            $member,
            $normalized,
            true,
            $parentWrId
        );
        $replyId = $this->postGateway->createReply(
            $safeBoTable,
            $parentWrId,
            $member,
            (string)$normalized['subject'],
            (string)$normalized['content'],
            $normalized['option'],
            $ip
        );

        $this->pointService->grantReplyPoint($member, $board, $safeBoTable, $replyId);
        $this->eventBridge->dispatchCreated(
            $replyId,
            $safeBoTable,
            $normalized,
            (string)($member['mb_id'] ?? ''),
            true,
            $parentWrId
        );

        return $replyId;
    }
}
