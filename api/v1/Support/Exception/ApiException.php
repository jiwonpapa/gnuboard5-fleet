<?php

/**
 * ApiException API 모듈 정의.
 *
 * @package  Gnuboard5\Api\v1\Support\Exception
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Support\Exception;

use Api\Core\Enum\ApiErrorType;

final class ApiException extends \RuntimeException
{
    public function __construct(
        public readonly int $statusCode,
        public readonly ApiErrorType $type,
        public readonly string $title,
        string $detail
    ) {
        parent::__construct($detail, 0);
    }

    public static function badRequest(string $detail): self
    {
        return new self(400, ApiErrorType::Validation, 'Bad Request', $detail);
    }

    public static function unauthorized(string $detail): self
    {
        return new self(401, ApiErrorType::Unauthorized, 'Unauthorized', $detail);
    }

    public static function forbidden(string $detail): self
    {
        return new self(403, ApiErrorType::Forbidden, 'Forbidden', $detail);
    }

    public static function notFound(string $detail): self
    {
        return new self(404, ApiErrorType::NotFound, 'Not Found', $detail);
    }

    public static function conflict(string $detail): self
    {
        return new self(409, ApiErrorType::Conflict, 'Conflict', $detail);
    }

    public static function tooManyRequests(string $detail): self
    {
        return new self(429, ApiErrorType::TooManyRequests, 'Too Many Requests', $detail);
    }

    public static function notImplemented(string $detail): self
    {
        return new self(501, ApiErrorType::NotImplemented, 'Not Implemented', $detail);
    }

    public static function serverError(string $detail): self
    {
        return new self(500, ApiErrorType::Internal, 'Internal Server Error', $detail);
    }
}
