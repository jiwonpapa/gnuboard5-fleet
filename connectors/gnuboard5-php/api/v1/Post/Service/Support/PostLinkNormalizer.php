<?php

declare(strict_types=1);

namespace Api\Post\Service\Support;

use Api\Support\Exception\ApiException;

final class PostLinkNormalizer
{
    private const MAX_LINK_LENGTH = 1000;

    public function normalizeLinkValue(mixed $value, string $field): ?string
    {
        if ($value === null) {
            return null;
        }

        $raw = trim(strip_tags((string)$value));
        if ($raw === '') {
            return null;
        }
        if (mb_strlen($raw) > self::MAX_LINK_LENGTH) {
            throw ApiException::badRequest($field . ' 길이를 초과했습니다.');
        }
        if (preg_match('#^https?://#i', $raw) !== 1 || filter_var($raw, FILTER_VALIDATE_URL) === false) {
            throw ApiException::badRequest($field . '는 http(s) URL이어야 합니다.');
        }

        return $raw;
    }
}
