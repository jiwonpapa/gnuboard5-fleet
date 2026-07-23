<?php

declare(strict_types=1);

namespace Api\Memo\Repository;

use Api\Support\Exception\ApiException;

final class MemoRecipientRepository extends MemoRepositorySupport
{
    public function validateRecipient(string $recvMbId, bool $isAdmin): array
    {
        $memberTable = $this->tables()->get('member');
        $normalizedId = trim($recvMbId);
        if ($normalizedId === '') {
            throw ApiException::badRequest('수신자 아이디가 비어 있습니다.');
        }

        $row = $this->fetchAssociative(
            "SELECT mb_id, mb_nick, mb_open, mb_leave_date, mb_intercept_date
             FROM {$memberTable}
             WHERE mb_id = :mb_id
             LIMIT 1",
            ['mb_id' => $normalizedId]
        );

        if (!is_array($row)) {
            throw ApiException::badRequest('해당 회원이 존재하지 않습니다.');
        }

        if (!$isAdmin) {
            $isOpen = (int)($row['mb_open'] ?? 0) === 1;
            $isLeave = trim((string)($row['mb_leave_date'] ?? '')) !== '';
            $isIntercept = trim((string)($row['mb_intercept_date'] ?? '')) !== '';
            if (!$isOpen || $isLeave || $isIntercept) {
                throw ApiException::badRequest('수신자에게 쪽지를 보낼 수 없습니다.');
            }
        }

        return [
            'mb_id' => (string)($row['mb_id'] ?? ''),
            'mb_nick' => (string)($row['mb_nick'] ?? ''),
            'mb_open' => (int)($row['mb_open'] ?? 0),
            'mb_leave_date' => (string)($row['mb_leave_date'] ?? ''),
            'mb_intercept_date' => (string)($row['mb_intercept_date'] ?? ''),
        ];
    }
}
