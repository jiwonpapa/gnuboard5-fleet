<?php

/**
 * AuthRegistrationService API module.
 *
 * @package  Gnuboard5\Api\v1\Auth\Service
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Auth\Service;

use Api\Core\Plugin\EventDispatcher;
use Api\Auth\Contracts\AuthIdentityGateway;
use Api\Auth\Contracts\AuthRecoveryGateway;
use Api\Auth\Contracts\AuthRegistrationGateway;
use Api\Integration\Contracts\PointRewardGateway;
use Api\Security\JwtService;
use Api\Auth\Service\Support\AuthRegistrationPayloadBuilder;
use Api\Auth\Service\Support\AuthRegistrationPointService;

final class AuthRegistrationService
{
    private readonly EventDispatcher $events;
    private readonly AuthRegistrationPayloadBuilder $payloadBuilder;
    private readonly AuthRegistrationPointService $registrationPointService;

    public function __construct(
        private readonly AuthIdentityGateway $identityGateway,
        private readonly AuthRegistrationGateway $registrationGateway,
        private readonly AuthRecoveryGateway $recoveryGateway,
        private readonly JwtService $jwtService,
        private readonly PointRewardGateway $pointGateway,
        private readonly AuthInputHelper $inputHelper,
        private readonly AuthMailService $mailService,
        EventDispatcher $events,
        ?AuthRegistrationPayloadBuilder $payloadBuilder = null,
        ?AuthRegistrationPointService $registrationPointService = null
    ) {
        $this->events = $events;
        $this->payloadBuilder = $payloadBuilder ?? new AuthRegistrationPayloadBuilder($this->registrationGateway, $this->inputHelper);
        $this->registrationPointService = $registrationPointService ?? new AuthRegistrationPointService($this->pointGateway, $this->events);
    }

    public function register(array $member): array
    {
        $payload = $this->payloadBuilder->build($member);
        $memberRow = $this->registrationGateway->registerMember($payload);
        $this->registrationPointService->applyRegisterPoints($memberRow);
        $ip = (string)($payload['mb_ip'] ?? '');

        $tokens = $this->jwtService->issuePair(
            $memberRow['mb_id'],
            ['ip' => $ip, 'scope' => 'access'],
            ['ip' => $ip, 'scope' => 'refresh']
        );

        if ($this->identityGateway->isEmailCertificationRequiredAndMissing($memberRow)) {
            $verifyToken = $this->recoveryGateway->issueEmailVerifyToken((string)$memberRow['mb_id']);
            $this->mailService->sendEmailVerifyEmail((string)($memberRow['mb_email'] ?? ''), (string)$memberRow['mb_id'], $verifyToken);
        }

        $this->mailService->sendAdminRegisterNotice(
            (string)$memberRow['mb_id'],
            (string)($memberRow['mb_email'] ?? ''),
            (string)($memberRow['mb_name'] ?? '')
        );

        $this->events->dispatch('member.registered', [
            'member_id' => (string)$memberRow['mb_id'],
            'member_data' => $memberRow,
        ]);

        return [
            'mb_id' => $memberRow['mb_id'],
            'access_token' => $tokens['access_token'],
            'refresh_token' => $tokens['refresh_token'],
            'expires_in' => $tokens['expires_in'],
        ];
    }
}
