<?php

/**
 * 공통 입력 검증 정규식 모음.
 *
 * @package  Gnuboard5\Api\v1\Support\Validation
 * @since    v1.1.0
 */

declare(strict_types=1);

namespace Api\Support\Validation;

final class ValidationPatterns
{
    public const MEMBER_ID = '/^[0-9a-z_]{3,20}$/i';
    public const MEMBER_ID_FILTER = '/^[A-Za-z0-9_]{1,20}$/';
    public const GROUP_ID = '/^[A-Za-z0-9_]{1,10}$/';
    public const BEARER_AUTHORIZATION = '/^Bearer\s+(.+)$/i';

    private function __construct()
    {
    }
}
