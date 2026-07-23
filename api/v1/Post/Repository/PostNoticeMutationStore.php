<?php

/**
 * PostNoticeMutationStore API module.
 *
 * @package  Gnuboard5\Api\v1\Post\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Post\Repository;

use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;
use Api\Integration\Contracts\BoardGateway;
use Api\Support\Exception\ApiException;

final class PostNoticeMutationStore extends PostRepositorySupport
{
    public function __construct(
        BoardGateway $boardRepository,
        ?QueryBuilder $qb = null,
        ?TableRegistry $tables = null
    ) {
        parent::__construct($boardRepository, $qb, $tables);
    }

    public function setNotice(string $boTable, int $wrId, bool $isNotice): void
    {
        $board = $this->boardRepository->findBoard($boTable);
        if ($board === null) {
            throw ApiException::notFound('게시판을 찾을 수 없습니다.');
        }

        $noticeIds = $this->parseNoticeIds((string)($board['bo_notice'] ?? ''));
        $wrIdSafe = (int)$wrId;
        if ($isNotice) {
            if (!in_array($wrIdSafe, $noticeIds, true)) {
                array_unshift($noticeIds, $wrIdSafe);
            }
        } else {
            $noticeIds = array_values(array_filter($noticeIds, static fn (int $id): bool => $id !== $wrIdSafe));
        }

        $noticeIds = array_values(array_unique(array_filter($noticeIds, static fn (int $id): bool => $id > 0)));
        $noticeText = implode(',', $noticeIds);
        $boardTable = $this->boardRepository->getBoardTable();

        $this->executeStatement(
            "UPDATE {$boardTable}
             SET bo_notice = :bo_notice
             WHERE bo_table = :bo_table",
            [
                'bo_notice' => $noticeText,
                'bo_table' => $boTable,
            ]
        );
    }

    /**
     * @return array<int, int>
     */
    private function parseNoticeIds(string $boNotice): array
    {
        $result = [];
        foreach (explode(',', trim($boNotice)) as $token) {
            $token = trim($token);
            if ($token === '' || !ctype_digit($token)) {
                continue;
            }

            $value = (int)$token;
            if ($value > 0) {
                $result[] = $value;
            }
        }

        return array_values(array_unique($result));
    }
}
