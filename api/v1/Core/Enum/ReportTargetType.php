<?php

/**
 * 신고 대상 타입 정의.
 *
 * @package  Api\Core\Enum
 * @since    v1.1.0
 */

declare(strict_types=1);

namespace Api\Core\Enum;

enum ReportTargetType: string
{
    case Post = 'post';
    case Comment = 'comment';
    case Member = 'member';
}
