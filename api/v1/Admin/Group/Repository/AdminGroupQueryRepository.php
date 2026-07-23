<?php

declare(strict_types=1);

namespace Api\Admin\Group\Repository;

final class AdminGroupQueryRepository extends AdminGroupRepositoryBase
{
    /**
     * @return array<int, array<string, mixed>>
     */
    public function list(): array
    {
        return $this->fetchAllAssociative(
            "SELECT * FROM {$this->groupTable()} ORDER BY gr_id ASC"
        );
    }

    public function find(string $groupId): ?array
    {
        $row = $this->fetchAssociative(
            "SELECT * FROM {$this->groupTable()} WHERE gr_id = :gr_id LIMIT 1",
            ['gr_id' => $groupId]
        );

        return is_array($row) ? $row : null;
    }
}
