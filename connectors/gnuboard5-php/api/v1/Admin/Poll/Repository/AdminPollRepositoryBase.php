<?php

declare(strict_types=1);

namespace Api\Admin\Poll\Repository;

use Api\Admin\Common\Repository\AdminBaseRepository;

abstract class AdminPollRepositoryBase extends AdminBaseRepository
{
    protected function pollTable(): string
    {
        return $this->tables()->get('poll');
    }

    protected function pollEtcTable(): string
    {
        return $this->tables()->get('poll_etc');
    }

    protected function memberTable(): string
    {
        return $this->tables()->get('member');
    }
}
