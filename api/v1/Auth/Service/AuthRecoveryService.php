<?php

/**
 * AuthRecoveryService API module.
 *
 * @package  Gnuboard5\Api\v1\Auth\Service
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Auth\Service;

use Api\Core\Config\EnvConfig;
use Api\Auth\Service\Support\AuthRecoveryInputNormalizer;
use Api\Auth\Service\Support\AuthRecoveryMemberResolver;
use Api\Auth\Service\Support\AuthRecoveryResponseBuilder;
use Api\Auth\Contracts\AuthIdentityGateway;
use Api\Auth\Contracts\AuthRecoveryGateway;
use Api\Support\Exception\ApiException;

final class AuthRecoveryService
{
    private ?AuthRecoveryInputNormalizer $resolvedInputNormalizer = null;
    private ?AuthRecoveryResponseBuilder $resolvedResponseBuilder = null;
    private ?AuthRecoveryMemberResolver $resolvedMemberResolver = null;

    public function __construct(
        private readonly AuthIdentityGateway $identityGateway,
        private readonly AuthRecoveryGateway $recoveryGateway,
        private readonly AuthInputHelper $inputHelper,
        private readonly AuthMailService $mailService,
        private readonly EnvConfig $envConfig,
        ?AuthRecoveryInputNormalizer $inputNormalizer = null,
        ?AuthRecoveryResponseBuilder $responseBuilder = null,
        ?AuthRecoveryMemberResolver $memberResolver = null
    ) {
        $this->resolvedInputNormalizer = $inputNormalizer;
        $this->resolvedResponseBuilder = $responseBuilder;
        $this->resolvedMemberResolver = $memberResolver;
    }

    public function requestPasswordReset(string $email, ?string $memberId = null): array
    {
        $normalizedEmail = $this->inputs()->normalizeRequiredEmail($email);
        $normalizedMemberId = $this->inputs()->normalizeOptionalMemberId($memberId);
        $member = $this->memberResolver()->resolvePasswordResetMember($normalizedEmail, $normalizedMemberId);
        if ($member === null) {
            return $this->responses()->buildPasswordResetAcceptedResponse();
        }

        $token = $this->recoveryGateway->createPasswordResetToken((string)$member['mb_id']);
        $this->mailService->sendPasswordResetEmail(
            trim((string)($member['mb_email'] ?? $normalizedEmail)),
            (string)$member['mb_id'],
            $token
        );

        return $this->responses()->buildPasswordResetAcceptedResponse($token);
    }

    public function confirmPasswordReset(string $memberId, string $resetToken, string $newPassword): void
    {
        $normalizedMemberId = $this->inputs()->normalizeRequiredMemberId($memberId);
        $this->recoveryGateway->resetPasswordByToken($normalizedMemberId, $resetToken, $newPassword);
    }

    public function requestEmailVerification(array $member, ?string $email = null): array
    {
        $memberId = trim((string)($member['mb_id'] ?? ''));
        if ($memberId === '') {
            throw ApiException::unauthorized('인증 토큰이 필요합니다.');
        }

        $normalizedEmail = $this->inputs()->normalizeOptionalEmail($email);
        $token = $this->recoveryGateway->issueEmailVerifyToken($memberId, $normalizedEmail);
        $targetEmail = trim((string)($normalizedEmail ?? ($member['mb_email'] ?? '')));
        $this->mailService->sendEmailVerifyEmail($targetEmail, $memberId, $token);

        return $this->responses()->buildEmailVerificationAcceptedResponse($memberId, $token);
    }

    public function requestEmailReverification(string $memberId, string $password, ?string $email = null): array
    {
        $normalizedMemberId = $this->inputs()->normalizeRequiredMemberId($memberId);
        $normalizedPassword = $this->inputs()->normalizeRequiredPassword($password);
        $member = $this->memberResolver()->resolveEmailReverificationMember($normalizedMemberId, $normalizedPassword);

        if (!$this->identityGateway->isEmailCertificationRequiredAndMissing($member)) {
            return ['accepted' => true];
        }

        $normalizedEmail = $this->inputs()->normalizeOptionalEmail($email);
        $token = $this->recoveryGateway->issueEmailVerifyToken(
            $normalizedMemberId,
            ($normalizedEmail === null || $normalizedEmail === '') ? null : $normalizedEmail
        );
        $targetEmail = trim((string)($normalizedEmail ?? ($member['mb_email'] ?? '')));
        if ($targetEmail === '') {
            throw ApiException::badRequest('인증 메일을 받을 이메일이 없습니다.');
        }

        $this->mailService->sendEmailVerifyEmail($targetEmail, $normalizedMemberId, $token);

        return $this->responses()->buildEmailVerificationAcceptedResponse($normalizedMemberId, $token);
    }

    public function confirmEmailVerification(string $memberId, string $verifyToken): void
    {
        $normalizedMemberId = $this->inputs()->normalizeRequiredMemberId($memberId);
        $this->recoveryGateway->confirmEmailVerifyToken($normalizedMemberId, $verifyToken);
    }

    private function inputs(): AuthRecoveryInputNormalizer
    {
        if ($this->resolvedInputNormalizer instanceof AuthRecoveryInputNormalizer) {
            return $this->resolvedInputNormalizer;
        }

        $this->resolvedInputNormalizer = new AuthRecoveryInputNormalizer($this->inputHelper);

        return $this->resolvedInputNormalizer;
    }

    private function responses(): AuthRecoveryResponseBuilder
    {
        if ($this->resolvedResponseBuilder instanceof AuthRecoveryResponseBuilder) {
            return $this->resolvedResponseBuilder;
        }

        $this->resolvedResponseBuilder = new AuthRecoveryResponseBuilder($this->envConfig);

        return $this->resolvedResponseBuilder;
    }

    private function memberResolver(): AuthRecoveryMemberResolver
    {
        if ($this->resolvedMemberResolver instanceof AuthRecoveryMemberResolver) {
            return $this->resolvedMemberResolver;
        }

        $this->resolvedMemberResolver = new AuthRecoveryMemberResolver($this->identityGateway);

        return $this->resolvedMemberResolver;
    }
}
