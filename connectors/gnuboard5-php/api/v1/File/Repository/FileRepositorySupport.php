<?php

declare(strict_types=1);

namespace Api\File\Repository;

use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;
use Api\Support\Repository\BaseRepository;

abstract class FileRepositorySupport extends BaseRepository
{
    public function __construct(
        ?QueryBuilder $qb = null,
        ?TableRegistry $tables = null
    ) {
        parent::__construct($qb, $tables);
    }

    protected function getBoardFileTable(): string
    {
        return $this->tables()->get('board_file');
    }
}
