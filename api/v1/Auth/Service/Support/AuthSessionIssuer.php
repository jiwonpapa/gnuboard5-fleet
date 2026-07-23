<?php

declare(strict_types=1);

namespace Api\Auth\Service\Support;

use Api\Core\Plugin\EventDispatcher;
use Api\Auth\Contracts\AuthIdentityGateway;
use Api\Auth\Contracts\AuthSessionGateway;
use Api\Integration\Contracts\PointMaintenanceGateway;
use Api\Security\JwtService;
use Psr\Log\LoggerInterface;
use Throwable;

final class AuthSessionIssuer
{
    public function __construct(
        private readonly AuthIdentityGateway $identityGateway,
        private readonly AuthSessionGateway $sessionGateway,
        private readonly JwtService $jwtService,
        private readonly PointMaintenanceGateway $pointGateway,
        private readonly LoggerInterface $logger,
        private readonly EventDispatcher $events,
        private readonly AuthSessionPolicy $policy,
        private readonly AuthSessionResultBuilder $resultBuilder
    ) {
    }

    /**
     * @param array<string, mixed> $member
     * @param array<string, mixed> $eventContext
     * @return array<string, mixed>
     */
    public function issueForMember(array $member, string $ipAddress, array $eventContext = []): array
    {
        $memberId = $this->policy->assertAuthenticatedMember($member);
        $ipAddress = trim($ipAddress);
        $this->policy->assertMemberIsActive($this->identityGateway, $memberId, '비활성 회원입니다.');
        $this->policy->assertEmailCertified($this->identityGateway, $member);

        try {
            $this->pointGateway->syncTotal($memberId);
        } catch (Throwable $exception) {
            $this->logger->warning('[auth] point total sync skipped', [
                'mb_id' => $memberId,
                'reason' => $exception->getMessage(),
            ]);
        }

        $this->sessionGateway->updateTodayLogin($memberId, $ipAddress);

        $tokens = $this->jwtService->issuePair(
            $memberId,
            ['ip' => $ipAddress, 'scope' => 'access'],
            ['ip' => $ipAddress, 'scope' => 'refresh']
        );

        $this->events->dispatch('member.login', array_merge([
            'member_id' => $memberId,
            'ip' => $ipAddress,
        ], $eventContext));

        return $this->resultBuilder->tokenPair($tokens);
    }
}
