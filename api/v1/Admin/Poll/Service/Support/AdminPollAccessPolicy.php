<?php

/**
 * AdminPollAccessPolicy API module.
 *
 * @package  Gnuboard5\Api\v1\Admin\Poll\Service\Support
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Admin\Poll\Service\Support;

use Api\Core\Enum\MemberLevel;
use Api\Support\Exception\ApiException;

final class AdminPollAccessPolicy
{
    /**
     * @param array<string,mixed> $member
     */
    public function assertSuperAdmin(array $member): void
    {
        if (!MemberLevel::fromNumeric((int)($member['mb_level'] ?? 0))->isAdmin()) {
            throw ApiException::forbidden('최고관리자만 접근할 수 있습니다.');
        }
    }
}
