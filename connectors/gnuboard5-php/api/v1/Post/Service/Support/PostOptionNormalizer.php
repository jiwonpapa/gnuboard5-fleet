<?php

declare(strict_types=1);

namespace Api\Post\Service\Support;

use Api\Support\Exception\ApiException;

final class PostOptionNormalizer
{
    /**
     * @param array<string, mixed> $board
     */
    public function normalizeOption(?string $option, array $board, int $memberLevel): string
    {
        $raw = trim((string)$option);
        $tokens = array_filter(array_map('trim', explode(',', $raw)), static fn (string $item): bool => $item !== '');
        $tokens = array_values(array_unique($tokens));
        $allowed = ['html1', 'html2', 'secret', 'mail'];

        foreach ($tokens as $token) {
            if (!in_array($token, $allowed, true)) {
                throw ApiException::badRequest('wr_option 값이 올바르지 않습니다.');
            }
        }

        $useSecret = (int)($board['bo_use_secret'] ?? 0);
        $hasSecret = in_array('secret', $tokens, true);

        if ($useSecret === 0 && $hasSecret && $memberLevel < 10) {
            $tokens = array_values(array_filter($tokens, static fn (string $item): bool => $item !== 'secret'));
        }
        if ($useSecret >= 2 && !$hasSecret) {
            $tokens[] = 'secret';
        }

        return implode(',', array_values(array_unique($tokens)));
    }

    public function resolveBool(mixed $value): bool
    {
        if (is_bool($value)) {
            return $value;
        }
        if (is_int($value) || is_float($value)) {
            return ((int)$value) !== 0;
        }

        return in_array(strtolower(trim((string)$value)), ['1', 'true', 'yes', 'y', 'on'], true);
    }
}
