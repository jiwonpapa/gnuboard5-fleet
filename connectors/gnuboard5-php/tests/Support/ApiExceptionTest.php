<?php

declare(strict_types=1);

namespace Tests\Support;

use Api\Core\Enum\ApiErrorType;
use Api\Support\Exception\ApiException;
use PHPUnit\Framework\TestCase;

final class ApiExceptionTest extends TestCase
{
    public function testBadRequestHasCorrectHttpStatus(): void
    {
        $exception = ApiException::badRequest('잘못된 입력');
        $this->assertSame(400, $exception->statusCode);
        $this->assertSame(ApiErrorType::Validation, $exception->type);
        $this->assertSame('Bad Request', $exception->title);
        $this->assertSame('잘못된 입력', $exception->getMessage());
    }

    public function testNotFoundHasCorrectHttpStatus(): void
    {
        $exception = ApiException::notFound('없음');
        $this->assertSame(404, $exception->statusCode);
        $this->assertSame(ApiErrorType::NotFound, $exception->type);
        $this->assertSame('Not Found', $exception->title);
    }
}
