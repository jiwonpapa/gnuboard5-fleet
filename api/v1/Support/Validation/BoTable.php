<?php

/**
 * BoTable API 모듈 정의.
 *
 * @package  Gnuboard5\Api\v1\Support\Validation
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Support\Validation;

use Api\Support\Exception\ApiException;

final class BoTable
{
    private const BO_TABLE_PATTERN = '/^[a-zA-Z0-9_]{1,20}$/';

    public static function normalize(string $boTable): string
    {
        $normalized = trim($boTable);
        if ($normalized === '' || !preg_match(self::BO_TABLE_PATTERN, $normalized)) {
            throw ApiException::badRequest('bo_table 형식이 올바르지 않습니다.');
        }

        return $normalized;
    }
}
