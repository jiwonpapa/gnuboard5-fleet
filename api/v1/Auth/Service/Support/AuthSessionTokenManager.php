<?php

declare(strict_types=1);

namespace Api\Auth\Service\Support;

use Api\Auth\Contracts\AuthIdentityGateway;
use Api\Auth\Contracts\AuthSessionGateway;
use Api\Security\JwtService;
use Api\Support\Exception\ApiException;

final class AuthSessionTokenManager
{
    public function __construct(
        private readonly AuthIdentityGateway $identityGateway,
        private readonly AuthSessionGateway $sessionGateway,
        private readonly JwtService $jwtService,
        private readonly AuthSessionPolicy $policy,
        private readonly AuthSessionResultBuilder $resultBuilder
    ) {
    }

    /**
     * @return array{access_token:string,refresh_token:string,expires_in:int}
     */
    public function refresh(string $refreshToken): array
    {
        $decoded = $this->jwtService->decode($refreshToken);
        $payload = $this->jwtService->getPayloadArray($decoded);

        $this->jwtService->assertRefreshTokenType($payload);
        $memberId = $this->policy->assertRefreshMemberId((string)($payload['sub'] ?? ''));
        $jti = (string)($payload['jti'] ?? '');
        $exp = (int)($payload['exp'] ?? 0);

        if ($jti !== '' && $this->sessionGateway->isTokenRevoked($jti, 'refresh')) {
            throw ApiException::unauthorized('폐기된 Refresh 토큰입니다.');
        }

        $this->policy->assertMemberIsActive($this->identityGateway, $memberId, '비활성 계정입니다.');

        if ($jti !== '') {
            $this->sessionGateway->revokeToken($memberId, $jti, 'refresh', $exp);
        }

        $tokens = $this->jwtService->issuePair(
            $memberId,
            ['scope' => 'access'],
            ['scope' => 'refresh']
        );

        return $this->resultBuilder->tokenPair($tokens);
    }

    /**
     * @param array<string, mixed> $member
     * @param array<string, mixed> $accessPayload
     * @return array{revoked:array{access:bool,refresh:bool},logged_out:bool}
     */
    public function logout(array $member, array $accessPayload, ?string $refreshToken): array
    {
        $memberId = $this->policy->assertAuthenticatedMember($member);
        $accessRevoked = false;
        $refreshRevoked = false;

        $accessJti = trim((string)($accessPayload['jti'] ?? ''));
        $accessExp = (int)($accessPayload['exp'] ?? 0);
        if ($accessJti !== '') {
            $this->sessionGateway->revokeToken($memberId, $accessJti, 'access', $accessExp);
            $accessRevoked = true;
        }

        $refreshToken = trim((string)$refreshToken);
        if ($refreshToken !== '') {
            $refreshPayload = $this->jwtService->getPayloadArray($this->jwtService->decode($refreshToken));
            $this->jwtService->assertRefreshTokenType($refreshPayload);

            $refreshSub = trim((string)($refreshPayload['sub'] ?? ''));
            if ($refreshSub !== '' && $refreshSub !== $memberId) {
                throw ApiException::forbidden('다른 회원의 Refresh 토큰은 로그아웃 처리할 수 없습니다.');
            }

            $refreshJti = trim((string)($refreshPayload['jti'] ?? ''));
            $refreshExp = (int)($refreshPayload['exp'] ?? 0);
            if ($refreshJti !== '') {
                $this->sessionGateway->revokeToken($memberId, $refreshJti, 'refresh', $refreshExp);
                $refreshRevoked = true;
            }
        }

        return $this->resultBuilder->logout($accessRevoked, $refreshRevoked);
    }
}
