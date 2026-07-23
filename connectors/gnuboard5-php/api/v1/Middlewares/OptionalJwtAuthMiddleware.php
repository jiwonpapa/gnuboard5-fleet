<?php

/**
 * OptionalJwtAuthMiddleware API 모듈 정의.
 *
 * @package  Gnuboard5\Api\v1\Middlewares
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Middlewares;

use Api\Integration\Contracts\AuthIdentityGateway;
use Api\Integration\Contracts\AuthSessionGateway;
use Api\Security\JwtService;
use Api\Support\Validation\ValidationPatterns;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Throwable;

final class OptionalJwtAuthMiddleware implements MiddlewareInterface
{
    public function __construct(
        private readonly JwtService $jwtService,
        private readonly AuthIdentityGateway $authIdentityGateway,
        private readonly AuthSessionGateway $authSessionGateway
    ) {
    }

    public function process(Request $request, RequestHandlerInterface $handler): Response
    {
        $authorization = trim($request->getHeaderLine('Authorization'));
        if ($authorization === '') {
            return $handler->handle($request);
        }

        if (!preg_match(ValidationPatterns::BEARER_AUTHORIZATION, $authorization, $matches)) {
            return $handler->handle($request);
        }

        $token = trim((string)$matches[1]);
        if ($token === '') {
            return $handler->handle($request);
        }

        try {
            $payload = $this->jwtService->getPayloadArray($this->jwtService->decode($token));
            $this->jwtService->assertAccessTokenType($payload);
            $jti = trim((string)($payload['jti'] ?? ''));
            if ($jti !== '' && $this->authSessionGateway->isTokenRevoked($jti, 'access')) {
                return $handler->handle($request);
            }

            $memberId = trim((string)($payload['sub'] ?? ''));
            if ($memberId === '') {
                return $handler->handle($request);
            }

            $member = $this->authIdentityGateway->findMemberById($memberId);
            if ($member === null || !$this->authIdentityGateway->isMemberActive($memberId)) {
                return $handler->handle($request);
            }
        } catch (Throwable) {
            return $handler->handle($request);
        }

        return $handler->handle(
            $request
                ->withAttribute('auth_member', $member)
                ->withAttribute('auth_payload', $payload)
        );
    }
}
