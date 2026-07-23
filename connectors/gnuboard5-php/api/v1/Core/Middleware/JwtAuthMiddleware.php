<?php

/**
 * JwtAuthMiddleware API module.
 *
 * @package  Gnuboard5\Api\v1\Core\Middleware
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Core\Middleware;

use Api\Core\Exception\UnauthorizedException;
use Api\Integration\Contracts\AuthIdentityGateway;
use Api\Security\JwtService;
use Api\Support\Validation\ValidationPatterns;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;

final class JwtAuthMiddleware implements MiddlewareInterface
{
    public function __construct(
        private readonly JwtService $jwtService,
        private readonly AuthIdentityGateway $authGateway
    ) {
    }

    public function process(Request $request, RequestHandlerInterface $handler): Response
    {
        $authorization = trim($request->getHeaderLine('Authorization'));
        if ($authorization === '') {
            throw new UnauthorizedException('Authorization 헤더가 필요합니다.');
        }

        if (!preg_match(ValidationPatterns::BEARER_AUTHORIZATION, $authorization, $matches)) {
            throw new UnauthorizedException('Bearer 토큰 형식이 아닙니다.');
        }

        $token = trim((string)$matches[1]);
        if ($token === '') {
            throw new UnauthorizedException('Access Token이 비어있습니다.');
        }

        $payload = $this->jwtService->getPayloadArray($this->jwtService->decode($token));
        $this->jwtService->assertAccessTokenType($payload);

        $memberId = trim((string)($payload['sub'] ?? ''));
        if ($memberId === '') {
            throw new UnauthorizedException('토큰에 사용자 ID가 없습니다.');
        }

        $member = $this->authGateway->findMemberById($memberId);
        if ($member === null || !$this->authGateway->isMemberActive($memberId)) {
            throw new UnauthorizedException('유효하지 않은 사용자입니다.');
        }

        return $handler->handle(
            $request
                ->withAttribute('auth_member', $member)
                ->withAttribute('auth_payload', $payload)
        );
    }
}
