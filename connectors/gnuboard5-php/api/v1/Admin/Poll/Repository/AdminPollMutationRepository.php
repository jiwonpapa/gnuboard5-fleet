<?php

declare(strict_types=1);

namespace Api\Admin\Poll\Repository;

use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;

final class AdminPollMutationRepository extends AdminPollRepositoryBase
{
    /**
     * @var list<string>
     */
    private const UPDATABLE_FIELDS = [
        'po_subject',
        'po_poll1',
        'po_poll2',
        'po_poll3',
        'po_poll4',
        'po_poll5',
        'po_poll6',
        'po_poll7',
        'po_poll8',
        'po_poll9',
        'po_etc',
        'po_level',
        'po_point',
        'po_use',
    ];

    /**
     * @param list<string>|null $updatableFields
     */
    public function __construct(
        ?QueryBuilder $qb = null,
        ?TableRegistry $tables = null,
        private readonly ?array $updatableFields = null
    ) {
        parent::__construct($qb, $tables);
    }

    /**
     * @param array<string,mixed> $payload
     */
    public function create(array $payload): int
    {
        $this->executeStatement(
            "INSERT INTO {$this->pollTable()}
             (po_subject, po_poll1, po_poll2, po_poll3, po_poll4, po_poll5, po_poll6, po_poll7, po_poll8, po_poll9, po_cnt1, po_cnt2, po_cnt3, po_cnt4, po_cnt5, po_cnt6, po_cnt7, po_cnt8, po_cnt9, po_etc, po_level, po_point, po_date, po_ips, mb_ids, po_use)
             VALUES
             (:po_subject, :po_poll1, :po_poll2, :po_poll3, :po_poll4, :po_poll5, :po_poll6, :po_poll7, :po_poll8, :po_poll9, 0, 0, 0, 0, 0, 0, 0, 0, 0, :po_etc, :po_level, :po_point, :po_date, '', '', :po_use)",
            $payload
        );

        return $this->lastInsertId();
    }

    /**
     * @param array<string,mixed> $payload
     */
    public function update(int $pollId, array $payload): int
    {
        $sets = [];
        $params = ['po_id' => $pollId];

        foreach ($this->updatableFields() as $field) {
            if (!array_key_exists($field, $payload)) {
                continue;
            }

            $param = 'u_' . $field;
            $sets[] = "{$field} = :{$param}";
            $params[$param] = $payload[$field];
        }

        if ($sets === []) {
            return 0;
        }

        return $this->executeStatement(
            "UPDATE {$this->pollTable()}
             SET " . implode(', ', $sets) . "
             WHERE po_id = :po_id",
            $params
        );
    }

    public function delete(int $pollId): int
    {
        $this->executeStatement(
            "DELETE FROM {$this->pollEtcTable()}
             WHERE po_id = :po_id",
            ['po_id' => $pollId]
        );

        return $this->executeStatement(
            "DELETE FROM {$this->pollTable()}
             WHERE po_id = :po_id",
            ['po_id' => $pollId]
        );
    }

    /**
     * @return list<string>
     */
    private function updatableFields(): array
    {
        return $this->updatableFields ?? self::UPDATABLE_FIELDS;
    }
}
