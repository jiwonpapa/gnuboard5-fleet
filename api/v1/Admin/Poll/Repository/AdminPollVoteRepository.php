<?php

declare(strict_types=1);

namespace Api\Admin\Poll\Repository;

use Api\Core\Util\G5DateTime;

final class AdminPollVoteRepository extends AdminPollRepositoryBase
{
    public function recordVote(int $pollId, int $pollNo, string $poIps, string $memberIds): int
    {
        $field = 'po_cnt' . $pollNo;

        return $this->executeStatement(
            "UPDATE {$this->pollTable()}
             SET {$field} = {$field} + 1,
                 po_ips = :po_ips,
                 mb_ids = :mb_ids
             WHERE po_id = :po_id",
            [
                'po_id' => $pollId,
                'po_ips' => $poIps,
                'mb_ids' => $memberIds,
            ]
        );
    }

    public function addEtcIdea(int $pollId, string $memberId, string $name, string $idea): int
    {
        $max = $this->fetchAssociative("SELECT MAX(pc_id) AS max_pc_id FROM {$this->pollEtcTable()}");
        $nextId = ((int)($max['max_pc_id'] ?? 0)) + 1;

        $this->executeStatement(
            "INSERT INTO {$this->pollEtcTable()} (pc_id, po_id, mb_id, pc_name, pc_idea, pc_datetime)
             VALUES (:pc_id, :po_id, :mb_id, :pc_name, :pc_idea, :pc_datetime)",
            [
                'pc_id' => $nextId,
                'po_id' => $pollId,
                'mb_id' => $memberId,
                'pc_name' => $name,
                'pc_idea' => $idea,
                'pc_datetime' => G5DateTime::now(),
            ]
        );

        return $nextId;
    }
}
