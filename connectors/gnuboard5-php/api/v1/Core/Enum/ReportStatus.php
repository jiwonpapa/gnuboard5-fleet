<?php

/**
 * 신고 처리 상태 정의.
 *
 * @package  Api\Core\Enum
 * @since    v1.1.0
 */

declare(strict_types=1);

namespace Api\Core\Enum;

enum ReportStatus: string
{
    case Pending = 'pending';
    case Approved = 'approved';
    case Rejected = 'rejected';
    case Hold = 'hold';
}
