<?php

/**
 * 커서 토큰 인코딩/디코딩 유틸리티.
 *
 * @package  Api\Support\Pagination
 * @since    v1.2.0
 */

declare(strict_types=1);

namespace Api\Support\Pagination;

use Api\Support\Exception\ApiException;
use JsonException;

final class CursorCodec
{
    public static function encode(string $type, int $value): string
    {
        try {
            $json = json_encode(
                [
                    't' => trim($type),
                    'v' => $value,
                ],
                JSON_THROW_ON_ERROR
            );
        } catch (JsonException) {
            throw ApiException::serverError('커서 토큰 생성에 실패했습니다.');
        }

        return rtrim(strtr(base64_encode($json), '+/', '-_'), '=');
    }

    public static function decode(?string $cursor, string $expectedType): ?int
    {
        $normalized = trim((string)$cursor);
        if ($normalized === '') {
            return null;
        }

        $payload = self::decodePayload($normalized);
        $type = trim((string)($payload['t'] ?? ''));
        $value = $payload['v'] ?? null;

        if ($type !== trim($expectedType) || !is_int($value) || $value <= 0) {
            throw ApiException::badRequest('cursor 값이 올바르지 않습니다.');
        }

        return $value;
    }

    /**
     * @return array<string, mixed>
     */
    private static function decodePayload(string $cursor): array
    {
        $padding = strlen($cursor) % 4;
        if ($padding > 0) {
            $cursor .= str_repeat('=', 4 - $padding);
        }

        $decoded = base64_decode(strtr($cursor, '-_', '+/'), true);
        if (!is_string($decoded) || $decoded === '') {
            throw ApiException::badRequest('cursor 값이 올바르지 않습니다.');
        }

        try {
            $payload = json_decode($decoded, true, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            throw ApiException::badRequest('cursor 값이 올바르지 않습니다.');
        }

        if (!is_array($payload)) {
            throw ApiException::badRequest('cursor 값이 올바르지 않습니다.');
        }

        return $payload;
    }
}
