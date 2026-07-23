<?php

/**
 * PostScrapService API module.
 *
 * @package  Gnuboard5\Api\v1\Post\Service
 * @since    v1.1.0
 */

declare(strict_types=1);

namespace Api\Post\Service;

use Api\Board\Service\BoardService;
use Api\Core\DTO\PaginationDTO;
use Api\Core\DTO\PostScrapDTO;
use Api\Post\Contracts\PostGateway;
use Api\Support\Exception\ApiException;
use Api\Support\Validation\BoTable;

final class PostScrapService
{
    private const MAX_LIST_LENGTH = 100;

    public function __construct(
        private readonly PostGateway $postGateway,
        private readonly BoardService $boardService,
        private readonly PostPermissionService $permissionService
    ) {
    }

    public function addScrap(string $boTable, int $wrId, array $member): array
    {
        $memberId = $this->permissionService->requireMemberId($member);
        $safeBoTable = BoTable::normalize($boTable);
        $wrIdSafe = $this->permissionService->normalizeWrId($wrId);

        $board = $this->boardService->getBoardRow($safeBoTable);
        $this->boardService->assertGroupAccess($member, $board);

        $memberLevel = (int)($member['mb_level'] ?? 255);
        $readLevel = (int)($board['bo_read_level'] ?? 0);
        if ($memberLevel > 0 && $memberLevel < $readLevel) {
            throw ApiException::forbidden('해당 게시판 조회 권한이 없습니다.');
        }

        $post = $this->postGateway->getPost($safeBoTable, $wrIdSafe);
        if ($post === null) {
            throw ApiException::notFound('게시글을 찾을 수 없습니다.');
        }
        if ((string)($post['mb_id'] ?? '') === $memberId) {
            throw ApiException::forbidden('본인 글은 스크랩할 수 없습니다.');
        }
        if ($this->postGateway->isScraped($memberId, $safeBoTable, $wrIdSafe)) {
            throw ApiException::conflict('이미 스크랩한 게시글입니다.');
        }

        $msId = $this->postGateway->addScrap($memberId, $safeBoTable, $wrIdSafe);

        return ['ms_id' => $msId, 'bo_table' => $safeBoTable, 'wr_id' => $wrIdSafe, 'scraped' => true];
    }

    public function removeScrap(string $boTable, int $wrId, array $member): void
    {
        $memberId = $this->permissionService->requireMemberId($member);
        $safeBoTable = BoTable::normalize($boTable);
        $wrIdSafe = $this->permissionService->normalizeWrId($wrId);

        if (!$this->postGateway->isScraped($memberId, $safeBoTable, $wrIdSafe)) {
            throw ApiException::notFound('스크랩 내역을 찾을 수 없습니다.');
        }

        $this->postGateway->removeScrap($memberId, $safeBoTable, $wrIdSafe);
    }

    public function listMyScraps(array $member, int $page, int $perPage, ?string $cursor = null): array
    {
        $memberId = $this->permissionService->requireMemberId($member);
        $safePerPage = max(1, min(self::MAX_LIST_LENGTH, $perPage));
        if (trim((string)$cursor) !== '') {
            $result = $this->postGateway->getScrapListByCursor($memberId, $safePerPage, $cursor);

            return [
                'items' => array_map(
                    static fn (PostScrapDTO $item): array => $item->jsonSerialize(),
                    $result->items
                ),
                'pagination' => $result->pagination->jsonSerialize(),
            ];
        }

        $safePage = max(1, $page);
        $result = $this->postGateway->getScrapList($memberId, $safePage, $safePerPage);

        return [
            'items' => $result['items'] ?? [],
            'pagination' => PaginationDTO::create((int)($result['total'] ?? 0), $safePage, $safePerPage)->jsonSerialize(),
        ];
    }
}
