<?php

/**
 * MemoRepositorySupport API module.
 *
 * @package  Gnuboard5\Api\v1\Memo\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Memo\Repository;

use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;
use Api\Support\Exception\ApiException;
use Api\Support\Repository\BaseRepository;

abstract class MemoRepositorySupport extends BaseRepository
{
    protected const UNREAD_DATETIME = '1000-01-01 00:00:00';
    protected const LEGACY_UNREAD_DATETIME = '0000-00-00 00:00:00';

    public function __construct(
        ?QueryBuilder $qb = null,
        ?TableRegistry $tables = null
    ) {
        parent::__construct($qb, $tables);
    }

    /**
     * @return array{0:string,1:string,2:string}
     */
    protected function resolveKindColumns(string $kind): array
    {
        $normalized = strtolower(trim($kind));
        if ($normalized === 'recv') {
            return ['recv', 'me_recv_mb_id', 'me_send_mb_id'];
        }
        if ($normalized === 'send') {
            return ['send', 'me_send_mb_id', 'me_recv_mb_id'];
        }

        throw ApiException::badRequest('kind 값은 recv 또는 send만 허용됩니다.');
    }

    /**
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    protected function normalizeMemoRow(array $row): array
    {
        $readDatetime = (string)($row['me_read_datetime'] ?? '');

        return [
            'me_id' => (int)($row['me_id'] ?? 0),
            'me_recv_mb_id' => (string)($row['me_recv_mb_id'] ?? ''),
            'me_send_mb_id' => (string)($row['me_send_mb_id'] ?? ''),
            'me_send_datetime' => (string)($row['me_send_datetime'] ?? ''),
            'me_read_datetime' => $readDatetime,
            'me_memo' => (string)($row['me_memo'] ?? ''),
            'me_send_id' => (int)($row['me_send_id'] ?? 0),
            'me_type' => (string)($row['me_type'] ?? ''),
            'me_send_ip' => (string)($row['me_send_ip'] ?? ''),
            'counterpart_mb_id' => (string)($row['counterpart_mb_id'] ?? ''),
            'counterpart_mb_nick' => (string)($row['counterpart_mb_nick'] ?? ''),
            'is_read' => !$this->isUnreadDatetime($readDatetime),
        ];
    }

    protected function isUnreadDatetime(string $readDatetime): bool
    {
        $trimmed = trim($readDatetime);
        return $trimmed === ''
            || $trimmed === self::UNREAD_DATETIME
            || str_starts_with($trimmed, '0000-00-00');
    }
}
