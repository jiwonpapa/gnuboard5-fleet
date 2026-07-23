<?php

/**
 * ApiException API module.
 *
 * @package  Gnuboard5\Api\v1\Core\Exception
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Core\Exception;

use Api\Core\Enum\ApiErrorType;

class ApiException extends \RuntimeException
{
    public function __construct(
        public readonly int $status,
        public readonly string $title,
        string $detail,
        public readonly ApiErrorType $type = ApiErrorType::Internal,
        public readonly ?array $guide = null
    ) {
        parent::__construct($detail, 0);
    }

    public function getStatusCode(): int
    {
        return $this->status;
    }

    public function toProblem(string $instance = '', string $requestId = ''): array
    {
        $problem = [
            'type' => $this->type->value,
            'status' => $this->status,
            'title' => $this->title,
            'detail' => $this->getMessage(),
            'meta' => [
                'request_id' => $requestId,
                'server_time' => gmdate(DATE_ATOM),
                'version' => '1.0.0',
            ],
        ];

        if ($instance !== '') {
            $problem['instance'] = $instance;
        }

        if ($this->guide !== null) {
            $problem['guide'] = $this->guide;
        }

        return $problem;
    }

    public static function badRequest(string $detail, ?array $guide = null): self
    {
        return new self(400, 'Bad Request', $detail, ApiErrorType::Validation, $guide);
    }

    public static function unauthorized(string $detail, ?array $guide = null): self
    {
        return new self(401, 'Unauthorized', $detail, ApiErrorType::Unauthorized, $guide);
    }

    public static function forbidden(string $detail, ?array $guide = null): self
    {
        return new self(403, 'Forbidden', $detail, ApiErrorType::Forbidden, $guide);
    }

    public static function notFound(string $detail, ?array $guide = null): self
    {
        return new self(404, 'Not Found', $detail, ApiErrorType::NotFound, $guide);
    }

    public static function conflict(string $detail, ?array $guide = null): self
    {
        return new self(409, 'Conflict', $detail, ApiErrorType::Conflict, $guide);
    }

    public static function validation(string $detail, ?array $guide = null): self
    {
        return new self(422, 'Validation Error', $detail, ApiErrorType::Validation, $guide);
    }

    public static function serviceUnavailable(string $detail, ?array $guide = null): self
    {
        return new self(503, 'Service Unavailable', $detail, ApiErrorType::ServiceUnavailable, $guide);
    }

    public static function serverError(string $detail, ?array $guide = null): self
    {
        return new self(500, 'Internal Server Error', $detail, ApiErrorType::Internal, $guide);
    }
}
