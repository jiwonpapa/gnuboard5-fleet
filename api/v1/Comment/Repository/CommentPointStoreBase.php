<?php

declare(strict_types=1);

namespace Api\Comment\Repository;

abstract class CommentPointStoreBase extends CommentRepositorySupport
{
    protected function memberPointLockName(string $memberId): string
    {
        return 'point:member:' . $memberId;
    }
}
