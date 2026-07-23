<?php

/**
 * RFC 7807 type 필드 정의.
 *
 * @package  Api\Core\Enum
 * @since    v1.1.0
 */

declare(strict_types=1);

namespace Api\Core\Enum;

enum ApiErrorType: string
{
    case BadRequest = '/errors/bad-request';
    case Unauthorized = '/errors/unauthorized';
    case Forbidden = '/errors/forbidden';
    case NotFound = '/errors/not-found';
    case Conflict = '/errors/conflict';
    case Validation = '/errors/validation';
    case TooManyRequests = '/errors/too-many-requests';
    case MethodNotAllowed = '/errors/method-not-allowed';
    case NotImplemented = '/errors/not-implemented';
    case Internal = '/errors/internal';
    case ServiceUnavailable = '/errors/service-unavailable';
}
