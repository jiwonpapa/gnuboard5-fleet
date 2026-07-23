<?php

/**
 * AdminBoardService API module.
 *
 * @package  Gnuboard5\Api\v1\Admin\Board\Service
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Admin\Board\Service;

use Api\Admin\Board\Repository\AdminBoardRepository;
use Api\Admin\Board\Service\Support\AdminBoardFileTreeCopier;
use Api\Admin\Board\Service\Support\AdminBoardInputNormalizer;
use Api\Admin\Board\Service\Support\AdminBoardPaginationBuilder;
use Api\Support\Exception\ApiException;

final class AdminBoardService
{
    private ?AdminBoardInputNormalizer $resolvedInput = null;
    private ?AdminBoardPaginationBuilder $resolvedPaginationBuilder = null;
    private ?AdminBoardFileTreeCopier $resolvedFileTreeCopier = null;

    public function __construct(
        private readonly AdminBoardRepository $repository,
        ?AdminBoardFileTreeCopier $fileTreeCopier = null
    ) {
        $this->resolvedFileTreeCopier = $fileTreeCopier;
    }

    /**
     * @param array<string, mixed> $query
     * @return array{items:array<int,array<string,mixed>>,pagination:array<string,mixed>}
     */
    public function list(array $query): array
    {
        $filters = $this->input()->normalizeListQuery($query);

        $result = $this->repository->list(
            $filters['page'],
            $filters['per_page'],
            $filters['gr_id'],
            $filters['search'],
            $filters['sort_by'],
            $filters['sort_direction']
        );
        $total = $result['total'];
        $items = [];
        foreach ($result['items'] as $board) {
            $items[] = $this->input()->normalizeBoardRecord($board);
        }

        return [
            'items' => $items,
            'pagination' => $this->paginationBuilder()->build($filters['page'], $filters['per_page'], $total),
        ];
    }

    public function detail(string $boTable): array
    {
        $normalized = $this->input()->normalizeBoardTable($boTable);
        $board = $this->repository->find($normalized);
        if ($board === null) {
            throw ApiException::notFound('게시판을 찾을 수 없습니다.');
        }

        return $this->input()->normalizeBoardRecord($board);
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function create(array $payload): array
    {
        $payload = $this->input()->normalizeCreatePayload($payload);
        $boTable = (string)$payload['bo_table'];

        if ($this->repository->find($boTable) !== null) {
            throw ApiException::conflict('이미 존재하는 게시판입니다.');
        }

        $this->repository->create($payload);

        $created = $this->repository->find($boTable);
        if ($created === null) {
            throw ApiException::serverError('게시판 생성 후 조회에 실패했습니다.');
        }

        return $this->input()->normalizeBoardRecord($created);
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function update(string $boTable, array $payload): array
    {
        $normalized = $this->input()->normalizeBoardTable($boTable);
        $payload = $this->input()->normalizeUpdatePayload($payload);
        $exists = $this->repository->find($normalized);
        if ($exists === null) {
            throw ApiException::notFound('게시판을 찾을 수 없습니다.');
        }

        $affected = $this->repository->update($normalized, $payload);
        if ($affected <= 0) {
            throw ApiException::badRequest('수정할 필드가 없습니다.');
        }

        $updated = $this->repository->find($normalized);
        if ($updated === null) {
            throw ApiException::serverError('수정 후 게시판을 조회할 수 없습니다.');
        }

        return $this->input()->normalizeBoardRecord($updated);
    }

    public function delete(string $boTable): void
    {
        $normalized = $this->input()->normalizeBoardTable($boTable);
        if ($this->repository->delete($normalized) <= 0) {
            throw ApiException::notFound('게시판을 찾을 수 없습니다.');
        }
    }

    /**
     * @param array<string,mixed> $payload
     */
    public function copy(string $sourceBoTable, array $payload): array
    {
        $source = $this->input()->normalizeBoardTable($sourceBoTable);
        $sourceBoard = $this->repository->find($source);
        if ($sourceBoard === null) {
            throw ApiException::notFound('원본 게시판을 찾을 수 없습니다.');
        }

        $copyTarget = $this->input()->normalizeCopyTarget($payload, $sourceBoard);
        $target = $copyTarget['target_bo_table'];
        if ($this->repository->find($target) !== null) {
            throw ApiException::conflict('복사 대상 게시판 코드가 이미 존재합니다.');
        }

        $this->fileTreeCopier()->copy($source, $target, $copyTarget['copy_posts']);
        try {
            $this->repository->copyBoard(
                $source,
                $target,
                $copyTarget['target_bo_subject'],
                $copyTarget['copy_posts']
            );
        } catch (\Throwable $exception) {
            $this->fileTreeCopier()->cleanup($target);
            throw $exception;
        }
        $copied = $this->repository->find($target);
        if ($copied === null) {
            throw ApiException::serverError('게시판 복사 후 조회에 실패했습니다.');
        }

        return $this->input()->normalizeBoardRecord($copied);
    }

    private function input(): AdminBoardInputNormalizer
    {
        return $this->resolvedInput ??= new AdminBoardInputNormalizer();
    }

    private function paginationBuilder(): AdminBoardPaginationBuilder
    {
        return $this->resolvedPaginationBuilder ??= new AdminBoardPaginationBuilder();
    }

    private function fileTreeCopier(): AdminBoardFileTreeCopier
    {
        return $this->resolvedFileTreeCopier ??= new AdminBoardFileTreeCopier();
    }
}
