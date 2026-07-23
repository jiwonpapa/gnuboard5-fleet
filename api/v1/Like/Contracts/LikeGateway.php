<?php

declare(strict_types=1);

namespace Api\Like\Contracts;

use Api\Core\Enum\VoteType;

interface LikeGateway
{
    public function castVote(string $boTable, int $wrId, string $memberId, VoteType $voteType): array;
}
