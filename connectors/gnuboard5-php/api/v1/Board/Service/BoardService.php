<?php

/**
 * BoardService API 모듈 정의.
 *
 * @package  Gnuboard5\Api\v1\Board\Service
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Board\Service;

use Api\Board\Service\Support\BoardAccessPolicy;
use Api\Board\Service\Support\BoardDetailPresenter;
use Api\Board\Service\Support\BoardFilterNormalizer;
use Api\Integration\Contracts\BoardGateway;
use Api\Support\Exception\ApiException;
use Api\Support\Validation\BoTable;

final class BoardService
{
    private ?BoardFilterNormalizer $resolvedFilterNormalizer = null;
    private ?BoardAccessPolicy $resolvedAccessPolicy = null;
    private ?BoardDetailPresenter $resolvedDetailPresenter = null;

    public function __construct(
        private readonly BoardGateway $boardGateway,
        ?BoardFilterNormalizer $filterNormalizer = null,
        ?BoardAccessPolicy $accessPolicy = null,
        ?BoardDetailPresenter $detailPresenter = null
    ) {
        $this->resolvedFilterNormalizer = $filterNormalizer;
        $this->resolvedAccessPolicy = $accessPolicy;
        $this->resolvedDetailPresenter = $detailPresenter;
    }

    public function listBoards(?string $groupId = null, ?int $memberLevel = null): array
    {
        $normalizedGroup = $this->filterNormalizer()->normalizeGroupId($groupId);
        return $this->boardGateway->listBoards($normalizedGroup, $memberLevel);
    }

    public function getBoard(string $boTable): array
    {
        return $this->detailPresenter()->toDetail($this->getBoardRow($boTable));
    }

    public function getBoardRow(string $boTable): array
    {
        $safeBoTable = BoTable::normalize($boTable);
        $board = $this->boardGateway->findBoard($safeBoTable);
        if ($board === null) {
            throw ApiException::notFound('게시판을 찾을 수 없습니다.');
        }

        return $board;
    }

    public function isMemberAllowedForRead(array $member, string $boTable): bool
    {
        $board = $this->boardGateway->findBoard(BoTable::normalize($boTable));
        if ($board === null) {
            return false;
        }

        return $this->accessPolicy()->isAllowed($this->boardGateway, $member, $board, 'bo_read_level');
    }

    public function isMemberAllowedForWrite(array $member, string $boTable): bool
    {
        $board = $this->boardGateway->findBoard(BoTable::normalize($boTable));
        if ($board === null) {
            return false;
        }

        return $this->accessPolicy()->isAllowed($this->boardGateway, $member, $board, 'bo_write_level');
    }

    public function isMemberAllowedForComment(array $member, string $boTable): bool
    {
        $board = $this->boardGateway->findBoard(BoTable::normalize($boTable));
        if ($board === null) {
            return false;
        }

        return $this->accessPolicy()->isAllowed($this->boardGateway, $member, $board, 'bo_comment_level');
    }

    public function isMemberAllowedForDownload(array $member, string $boTable): bool
    {
        $board = $this->boardGateway->findBoard(BoTable::normalize($boTable));
        if ($board === null) {
            return false;
        }

        return $this->accessPolicy()->isAllowed($this->boardGateway, $member, $board, 'bo_download_level');
    }

    public function resolveAdminRole(array $member, array $board): ?string
    {
        return $this->accessPolicy()->resolveAdminRole($member, $board);
    }

    public function assertGroupAccess(array $member, array $board): void
    {
        $this->accessPolicy()->assertGroupAccess($this->boardGateway, $member, $board);
    }

    public function getDelaySeconds(): int
    {
        $config = $this->boardGateway->getConfig();
        return max(0, (int)($config['cf_delay_sec'] ?? 0));
    }

    private function filterNormalizer(): BoardFilterNormalizer
    {
        return $this->resolvedFilterNormalizer ??= new BoardFilterNormalizer();
    }

    private function accessPolicy(): BoardAccessPolicy
    {
        return $this->resolvedAccessPolicy ??= new BoardAccessPolicy();
    }

    private function detailPresenter(): BoardDetailPresenter
    {
        return $this->resolvedDetailPresenter ??= new BoardDetailPresenter();
    }
}
