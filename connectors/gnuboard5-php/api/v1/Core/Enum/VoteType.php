<?php

/**
 * 추천/비추천 타입 정의.
 *
 * @package  Api\Core\Enum
 * @since    v1.1.0
 */

declare(strict_types=1);

namespace Api\Core\Enum;

enum VoteType: string
{
    case Good = 'good';
    case NoGood = 'nogood';
}
