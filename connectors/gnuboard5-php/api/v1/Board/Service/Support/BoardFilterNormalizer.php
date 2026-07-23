<?php

declare(strict_types=1);

namespace Api\Board\Service\Support;

use Api\Support\Exception\ApiException;
use Api\Support\Validation\ValidationPatterns;

final class BoardFilterNormalizer
{
    public function normalizeGroupId(?string $groupId): ?string
    {
        return $this->normalizeOptionalString($groupId, 'group_id', 10);
    }

    private function normalizeOptionalString(?string $value, string $field, int $maxLength): ?string
    {
        $trimmed = trim((string)$value);
        if ($trimmed === '') {
            return null;
        }

        if (mb_strlen($trimmed) > $maxLength) {
            throw ApiException::badRequest("{$field} 값이 최대 길이를 초과했습니다.");
        }

        if ($field === 'group_id' && preg_match(ValidationPatterns::GROUP_ID, $trimmed) !== 1) {
            throw ApiException::badRequest('group_id 형식이 올바르지 않습니다.');
        }

        return $trimmed;
    }
}
