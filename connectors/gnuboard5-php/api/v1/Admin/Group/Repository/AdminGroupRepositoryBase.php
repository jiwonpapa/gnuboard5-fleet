<?php

declare(strict_types=1);

namespace Api\Admin\Group\Repository;

use Api\Admin\Common\Repository\AdminBaseRepository;

abstract class AdminGroupRepositoryBase extends AdminBaseRepository
{
    protected function groupTable(): string
    {
        return $this->tables()->get('group');
    }

    protected function groupMemberTable(): string
    {
        return $this->tables()->get('group_member');
    }

    protected function memberTable(): string
    {
        return $this->tables()->get('member');
    }
}
