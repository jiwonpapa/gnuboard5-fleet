<?php

declare(strict_types=1);

namespace Tests\Support;

use Api\Support\Http\ApiResponse;
use PHPUnit\Framework\TestCase;
use Slim\Psr7\Factory\ResponseFactory;

final class ApiResponseTest extends TestCase
{
    public function testEnvelopePreservesPreconfiguredStatusCode(): void
    {
        $response = (new ResponseFactory())->createResponse(201)
            ->withHeader('Location', '/api/v1/example/1');

        $result = ApiResponse::envelope($response, ['id' => 1]);

        $this->assertSame(201, $result->getStatusCode());
        $this->assertSame('/api/v1/example/1', $result->getHeaderLine('Location'));
    }
}
