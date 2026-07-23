<?php

declare(strict_types=1);

namespace Api\Admin\Group\Repository;

use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;

final class AdminGroupMutationRepository extends AdminGroupRepositoryBase
{
    /**
     * @var list<string>
     */
    private const UPDATABLE_FIELDS = [
        'gr_subject',
        'gr_admin',
        'gr_device',
        'gr_use_access',
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
     * @param array<string, mixed> $payload
     */
    public function create(array $payload): void
    {
        $data = [
            'gr_id' => (string)$payload['gr_id'],
            'gr_subject' => (string)$payload['gr_subject'],
        ];

        foreach ($this->updatableFields() as $field) {
            if ($field === 'gr_subject' || !array_key_exists($field, $payload)) {
                continue;
            }

            $data[$field] = $payload[$field];
        }

        $columns = array_keys($data);
        $placeholders = array_map(static fn (string $column): string => ':' . $column, $columns);

        $this->executeStatement(
            sprintf(
                'INSERT INTO %s (%s) VALUES (%s)',
                $this->groupTable(),
                implode(', ', $columns),
                implode(', ', $placeholders)
            ),
            $data
        );
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function update(string $groupId, array $payload): int
    {
        $sets = [];
        $params = ['gr_id' => $groupId];

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
            sprintf(
                'UPDATE %s SET %s WHERE gr_id = :gr_id',
                $this->groupTable(),
                implode(', ', $sets)
            ),
            $params
        );
    }

    public function delete(string $groupId): int
    {
        return $this->executeStatement(
            "DELETE FROM {$this->groupTable()} WHERE gr_id = :gr_id",
            ['gr_id' => $groupId]
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
