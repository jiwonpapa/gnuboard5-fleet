<?php

/**
 * JwtAuthMiddleware API 모듈 정의.
 *
 * @package  Gnuboard5\Api\v1\Middlewares
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Middlewares;

use Api\Integration\Contracts\AuthIdentityGateway;
use Api\Integration\Contracts\AuthSessionGateway;
use Api\Security\JwtService;
use Api\Support\Exception\ApiException;
use Api\Support\Validation\ValidationPatterns;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;

final class JwtAuthMiddleware implements MiddlewareInterface
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
            throw ApiException::unauthorized('Authorization 헤더가 필요합니다.');
        }

        if (!preg_match(ValidationPatterns::BEARER_AUTHORIZATION, $authorization, $matches)) {
            throw ApiException::unauthorized('Bearer 토큰 형식이 아닙니다.');
        }

        $token = trim($matches[1]);
        if ($token === '') {
            throw ApiException::unauthorized('Access Token이 비어있습니다.');
        }

        $payload = $this->jwtService->getPayloadArray($this->jwtService->decode($token));
        $this->jwtService->assertAccessTokenType($payload);
        $jti = trim((string)($payload['jti'] ?? ''));
        if ($jti !== '' && $this->authSessionGateway->isTokenRevoked($jti, 'access')) {
            throw ApiException::unauthorized('폐기된 Access 토큰입니다.');
        }

        $memberId = trim((string)($payload['sub'] ?? ''));
        if ($memberId === '') {
            throw ApiException::unauthorized('토큰에 사용자 ID가 없습니다.');
        }

        $member = $this->authIdentityGateway->findMemberById($memberId);
        if ($member === null || !$this->authIdentityGateway->isMemberActive($memberId)) {
            throw ApiException::unauthorized('유효하지 않은 사용자입니다.');
        }

        $request = $request
            ->withAttribute('auth_member', $member)
            ->withAttribute('auth_payload', $payload);

        return $handler->handle($request);
    }
}
