<?php

/**
 * PasswordPolicy API module.
 *
 * @package  Gnuboard5\Api\v1\Core\Security
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Core\Security;

use Api\Core\Config\EnvValueReader;
use Api\Support\Exception\ApiException;

final class PasswordPolicy
{
    private const SEQUENTIAL_PATTERN = '/(?:0123|1234|2345|3456|4567|5678|6789|7890|abcd|bcde|cdef|defg|efgh|fghi|ghij|hijk|ijkl|jklm|klmn|lmno|mnop|nopq|opqr|pqrs|qrst|rstu|stuv|tuvw|uvwx|vwxy|wxyz)/i';

    public function validateOrFail(string $password): void
    {
        $minLength = max(8, EnvValueReader::int('PASSWORD_MIN_LENGTH', 8));
        if (strlen($password) < $minLength) {
            throw ApiException::badRequest("비밀번호는 {$minLength}자 이상이어야 합니다.");
        }

        $requireComplexity = EnvValueReader::bool('PASSWORD_REQUIRE_COMPLEXITY', true);
        if (!$requireComplexity) {
            return;
        }

        if (preg_match('/[A-Za-z]/', $password) !== 1
            || preg_match('/[0-9]/', $password) !== 1
            || preg_match('/[^A-Za-z0-9]/', $password) !== 1
        ) {
            throw ApiException::badRequest('비밀번호는 영문/숫자/특수문자를 모두 포함해야 합니다.');
        }

        if (preg_match('/(.)\1\1/', $password) === 1) {
            throw ApiException::badRequest('동일 문자를 3회 이상 연속으로 사용할 수 없습니다.');
        }

        if (preg_match(self::SEQUENTIAL_PATTERN, $password) === 1) {
            throw ApiException::badRequest('연속된 문자 또는 숫자 패턴은 사용할 수 없습니다.');
        }
    }
}
