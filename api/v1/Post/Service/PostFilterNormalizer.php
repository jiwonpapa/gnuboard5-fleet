<?php

declare(strict_types=1);

namespace Api\Post\Service;

use Api\Support\Exception\ApiException;
use Api\Support\Validation\ValidationPatterns;

final class PostFilterNormalizer
{
    private const MAX_BN_DELETE_BATCH = 1000;

    public function normalizeGroupId(mixed $value): ?string
    {
        $grId = trim((string)$value);
        if ($grId === '') {
            return null;
        }
        if (preg_match(ValidationPatterns::GROUP_ID, $grId) !== 1) {
            throw ApiException::badRequest('gr_id 형식이 올바르지 않습니다.');
        }

        return $grId;
    }

    public function normalizeViewFilter(mixed $value): ?string
    {
        $view = strtolower(trim((string)$value));
        if ($view === '') {
            return null;
        }
        if (!in_array($view, ['w', 'c'], true)) {
            throw ApiException::badRequest('view 값은 w 또는 c만 허용됩니다.');
        }

        return $view;
    }

    public function normalizeMemberIdFilter(mixed $value): ?string
    {
        $mbId = trim((string)$value);
        if ($mbId === '') {
            return null;
        }
        if (preg_match(ValidationPatterns::MEMBER_ID_FILTER, $mbId) !== 1) {
            throw ApiException::badRequest('mb_id 형식이 올바르지 않습니다.');
        }

        return $mbId;
    }

    public function normalizeSearchField(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }
        if (!is_string($value)) {
            throw ApiException::badRequest('search_field 값이 올바르지 않습니다.');
        }

        $normalized = trim($value);
        if (!in_array($normalized, ['title', 'content', 'title_content', 'author', 'comment'], true)) {
            throw ApiException::badRequest('search_field 값이 올바르지 않습니다.');
        }

        return $normalized;
    }

    /**
     * @param array<int|string, mixed> $bnIds
     * @return array<int, int>
     */
    public function sanitizeBnIds(array $bnIds): array
    {
        $safeIds = [];
        foreach ($bnIds as $bnId) {
            $value = is_numeric((string)$bnId) ? (int)$bnId : 0;
            if ($value > 0) {
                $safeIds[] = $value;
            }
        }

        $safeIds = array_values(array_unique($safeIds));
        if (count($safeIds) > self::MAX_BN_DELETE_BATCH) {
            throw ApiException::badRequest('bn_ids는 최대 ' . self::MAX_BN_DELETE_BATCH . '개까지 허용됩니다.');
        }

        return $safeIds;
    }

    public function sanitizeLegacyKeyword(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $trimmed = trim($value);
        if ($trimmed === '') {
            return null;
        }

        $normalized = preg_replace('/[\x{10000}-\x{10FFFF}]/u', '', $trimmed);
        if (!is_string($normalized)) {
            return null;
        }

        $normalized = trim($normalized);

        return $normalized === '' ? null : $normalized;
    }

    public function normalizeRedirectUrl(string $url): string
    {
        $trimmed = trim($url);
        if ($trimmed === '') {
            throw ApiException::badRequest('유효하지 않은 링크입니다.');
        }

        if (preg_match('#^https?://#i', $trimmed) !== 1) {
            $trimmed = 'http' . '://' . ltrim($trimmed, '/');
        }
        if (filter_var($trimmed, FILTER_VALIDATE_URL) === false) {
            throw ApiException::badRequest('유효하지 않은 링크입니다.');
        }

        return $trimmed;
    }
}
