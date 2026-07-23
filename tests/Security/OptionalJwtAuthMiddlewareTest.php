<?php

declare(strict_types=1);

namespace Tests\Security;

use Api\Integration\Contracts\AuthIdentityGateway;
use Api\Integration\Contracts\AuthSessionGateway;
use Api\Middlewares\OptionalJwtAuthMiddleware;
use Api\Security\JwtService;
use PHPUnit\Framework\TestCase;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Psr7\Factory\ServerRequestFactory;
use Slim\Psr7\Response;

final class OptionalJwtAuthMiddlewareTest extends TestCase
{
    public function testSkipsMalformedAuthorizationHeader(): void
    {
        $request = (new ServerRequestFactory())
            ->createServerRequest('GET', '/api/v1/boards')
            ->withHeader('Authorization', 'Basic abc');

        $middleware = new OptionalJwtAuthMiddleware(
            $this->jwtService(),
            $this->createMock(AuthIdentityGateway::class),
            $this->createMock(AuthSessionGateway::class)
        );
        $handler = new OptionalAuthCapturingRequestHandler();

        $middleware->process($request, $handler);

        self::assertNotNull($handler->capturedRequest);
        self::assertSame([], (array)$handler->capturedRequest?->getAttribute('auth_member', []));
    }

    public function testSkipsRevokedAccessTokenInsteadOfThrowing(): void
    {
        $jwt = $this->jwtService();
        $accessToken = $jwt->issuePair('user1')['access_token'];

        $request = (new ServerRequestFactory())
            ->createServerRequest('GET', '/api/v1/boards')
            ->withHeader('Authorization', 'Bearer ' . $accessToken);

        $sessionGateway = $this->createMock(AuthSessionGateway::class);
        $sessionGateway->method('isTokenRevoked')->willReturn(true);

        $middleware = new OptionalJwtAuthMiddleware($jwt, $this->createMock(AuthIdentityGateway::class), $sessionGateway);
        $handler = new OptionalAuthCapturingRequestHandler();
        $middleware->process($request, $handler);

        self::assertNotNull($handler->capturedRequest);
        self::assertSame([], (array)$handler->capturedRequest?->getAttribute('auth_member', []));
    }

    public function testAttachesAuthMemberWhenTokenIsValid(): void
    {
        $jwt = $this->jwtService();
        $accessToken = $jwt->issuePair('user1')['access_token'];

        $request = (new ServerRequestFactory())
            ->createServerRequest('GET', '/api/v1/boards')
            ->withHeader('Authorization', 'Bearer ' . $accessToken);

        $identityGateway = $this->createMock(AuthIdentityGateway::class);
        $identityGateway->method('findMemberById')->willReturn(['mb_id' => 'user1']);
        $identityGateway->method('isMemberActive')->willReturn(true);
        $sessionGateway = $this->createMock(AuthSessionGateway::class);
        $sessionGateway->method('isTokenRevoked')->willReturn(false);

        $middleware = new OptionalJwtAuthMiddleware($jwt, $identityGateway, $sessionGateway);
        $handler = new OptionalAuthCapturingRequestHandler();
        $middleware->process($request, $handler);

        self::assertNotNull($handler->capturedRequest);
        self::assertSame('user1', (string)$handler->capturedRequest?->getAttribute('auth_member')['mb_id']);
        self::assertSame('user1', (string)$handler->capturedRequest?->getAttribute('auth_payload')['sub']);
    }

    private function jwtService(): JwtService
    {
        return new JwtService('optional-jwt-test-secret-1234567890-1234567890', 3600, 7200);
    }
}

final class OptionalAuthCapturingRequestHandler implements RequestHandlerInterface
{
    public ?ServerRequestInterface $capturedRequest = null;

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $this->capturedRequest = $request;
        return new Response(200);
    }
}
