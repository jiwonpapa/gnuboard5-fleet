<?php

/**
 * AuthSessionService API module.
 *
 * @package  Gnuboard5\Api\v1\Auth\Service
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Auth\Service;

use Api\Auth\Service\Support\AuthSessionIssuer;
use Api\Auth\Service\Support\AuthSessionPolicy;
use Api\Auth\Service\Support\AuthSessionResultBuilder;
use Api\Auth\Service\Support\AuthSessionTokenManager;
use Api\Auth\Contracts\AuthIdentityGateway;
use Api\Auth\Contracts\AuthSessionGateway;
use Api\Core\Config\EnvConfig;
use Api\Core\Plugin\EventDispatcher;
use Api\Integration\Contracts\PointMaintenanceGateway;
use Api\Security\JwtService;
use Api\Support\Exception\ApiException;
use Psr\Log\LoggerInterface;
use Throwable;

final class AuthSessionService
{
    private ?AuthSessionPolicy $resolvedPolicy = null;
    private ?AuthSessionResultBuilder $resolvedResultBuilder = null;
    private ?AuthSessionIssuer $resolvedSessionIssuer = null;
    private ?AuthSessionTokenManager $resolvedTokenManager = null;

    public function __construct(
        private readonly AuthIdentityGateway $identityGateway,
        private readonly AuthSessionGateway $sessionGateway,
        private readonly JwtService $jwtService,
        private readonly PointMaintenanceGateway $pointGateway,
        private readonly EnvConfig $envConfig,
        private readonly LoggerInterface $logger,
        private readonly EventDispatcher $events,
        ?AuthSessionPolicy $policy = null,
        ?AuthSessionResultBuilder $resultBuilder = null,
        ?AuthSessionIssuer $sessionIssuer = null,
        ?AuthSessionTokenManager $tokenManager = null
    ) {
        $this->resolvedPolicy = $policy;
        $this->resolvedResultBuilder = $resultBuilder;
        $this->resolvedSessionIssuer = $sessionIssuer;
        $this->resolvedTokenManager = $tokenManager;
    }

    public function login(string $memberId, string $password, string $ipAddress): array
    {
        $memberId = $this->policy()->assertLoginInput($memberId, (string)$password);
        $password = (string)$password;
        $ipAddress = trim($ipAddress);

        ['max_attempts' => $maxAttempts, 'window_seconds' => $windowSeconds] = $this->policy()->loginThrottle($this->envConfig);
        if ($this->sessionGateway->isLoginBlocked($memberId, $ipAddress, $maxAttempts, $windowSeconds)) {
            throw ApiException::forbidden('로그인 실패 횟수를 초과했습니다. 잠시 후 다시 시도해주세요.');
        }

        $member = $this->identityGateway->findMemberById($memberId);
        if ($member === null) {
            $this->sessionGateway->registerFailedLoginAttempt($memberId, $ipAddress);
            throw ApiException::unauthorized('아이디 또는 비밀번호가 일치하지 않습니다.');
        }

        $this->policy()->assertMemberIsActive($this->identityGateway, (string)$member['mb_id'], '비활성 회원입니다.');

        if (!$this->identityGateway->verifyPassword($member, $password)) {
            $this->sessionGateway->registerFailedLoginAttempt((string)$member['mb_id'], $ipAddress);
            throw ApiException::unauthorized('아이디 또는 비밀번호가 일치하지 않습니다.');
        }

        $this->policy()->assertEmailCertified($this->identityGateway, $member);

        try {
            $this->sessionGateway->rehashPasswordIfNeeded($member, $password);
        } catch (Throwable $exception) {
            $this->logger->warning('[auth] password rehash skipped', [
                'mb_id' => (string)($member['mb_id'] ?? ''),
                'reason' => $exception->getMessage(),
            ]);
        }

        $this->sessionGateway->clearFailedLoginAttempts((string)$member['mb_id'], $ipAddress);

        return $this->issueSessionForMember($member, $ipAddress, [
            'auth_method' => 'password',
        ]);
    }

    public function refresh(string $refreshToken): array
    {
        return $this->tokenManager()->refresh($refreshToken);
    }

    public function logout(array $member, array $accessPayload, ?string $refreshToken): array
    {
        return $this->tokenManager()->logout($member, $accessPayload, $refreshToken);
    }

    /**
     * @param array<string, mixed> $member
     * @param array<string, mixed> $eventContext
     * @return array<string, mixed>
     */
    public function issueSessionForMember(array $member, string $ipAddress, array $eventContext = []): array
    {
        return $this->sessionIssuer()->issueForMember($member, $ipAddress, $eventContext);
    }

    private function policy(): AuthSessionPolicy
    {
        return $this->resolvedPolicy ??= new AuthSessionPolicy();
    }

    private function resultBuilder(): AuthSessionResultBuilder
    {
        return $this->resolvedResultBuilder ??= new AuthSessionResultBuilder();
    }

    private function sessionIssuer(): AuthSessionIssuer
    {
        if ($this->resolvedSessionIssuer instanceof AuthSessionIssuer) {
            return $this->resolvedSessionIssuer;
        }

        $this->resolvedSessionIssuer = new AuthSessionIssuer(
            $this->identityGateway,
            $this->sessionGateway,
            $this->jwtService,
            $this->pointGateway,
            $this->logger,
            $this->events,
            $this->policy(),
            $this->resultBuilder()
        );

        return $this->resolvedSessionIssuer;
    }

    private function tokenManager(): AuthSessionTokenManager
    {
        if ($this->resolvedTokenManager instanceof AuthSessionTokenManager) {
            return $this->resolvedTokenManager;
        }

        $this->resolvedTokenManager = new AuthSessionTokenManager(
            $this->identityGateway,
            $this->sessionGateway,
            $this->jwtService,
            $this->policy(),
            $this->resultBuilder()
        );

        return $this->resolvedTokenManager;
    }
}
