<?php

declare(strict_types=1);

namespace Api\Auth\External\Service;

use Api\Auth\External\Repository\ExternalAuthLinkRepository;
use Api\Auth\External\Service\Support\ExternalAuthTransitionPayloadBuilder;
use Api\Auth\External\Service\Support\ExternalAuthTransitionTokenDecoder;
use Api\Auth\External\Support\ExternalAuthRequestTokenCodec;
use Api\Auth\Service\AuthRegistrationService;
use Api\Auth\Service\AuthSessionService;
use Api\Auth\Contracts\AuthIdentityGateway;
use Api\Support\Exception\ApiException;
use Psr\Log\LoggerInterface;

final readonly class ExternalAuthTransitionService
{
    public function __construct(
        private ExternalAuthLinkRepository $linkRepository,
        private ExternalAuthRequestTokenCodec $tokenCodec,
        private AuthIdentityGateway $authGateway,
        private AuthSessionService $authSessionService,
        private AuthRegistrationService $authRegistrationService,
        private LoggerInterface $logger
    ) {
    }

    /**
     * @return array<string, mixed>
     */
    public function createSession(string $provider, string $transitionToken, string $ipAddress): array
    {
        $transition = $this->transitionTokenDecoder()->decode($provider, $transitionToken, ['login']);
        $existingLink = $this->linkRepository->findByProviderUser(
            $transition['provider'],
            $transition['provider_user_id']
        );

        if (!is_array($existingLink)) {
            throw ApiException::conflict('아직 회원 계정에 연결되지 않은 외부 인증입니다. 기존 회원 연결 또는 신규 가입을 먼저 진행해주세요.');
        }

        $member = $this->authGateway->findMemberById((string)($existingLink['mb_id'] ?? ''));
        if (!is_array($member)) {
            throw ApiException::conflict('연결된 회원 계정을 찾을 수 없습니다.');
        }

        $tokens = $this->authSessionService->issueSessionForMember($member, $ipAddress, [
            'auth_method' => 'external',
            'provider' => $transition['provider'],
            'provider_user_id' => $transition['provider_user_id'],
            'external_transition' => 'session',
        ]);

        $this->logger->info('external_auth.transition.session', [
            'provider' => $transition['provider'],
            'provider_user_id' => $transition['provider_user_id'],
            'mb_id' => (string)($member['mb_id'] ?? ''),
        ]);

        return array_merge($tokens, [
            'mb_id' => (string)($member['mb_id'] ?? ''),
            'provider' => $transition['provider'],
            'provider_user_id' => $transition['provider_user_id'],
            'link' => $this->payloadBuilder()->serializeLink($existingLink),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function claimExistingMember(
        string $provider,
        string $transitionToken,
        string $memberId,
        string $password,
        string $ipAddress
    ): array {
        $transition = $this->transitionTokenDecoder()->decode($provider, $transitionToken, ['login', 'account_link']);
        $normalizedMemberId = trim($memberId);
        $normalizedPassword = (string)$password;

        if ($normalizedMemberId === '' || $normalizedPassword === '') {
            throw ApiException::badRequest('mb_id와 mb_password가 필요합니다.');
        }

        $member = $this->authGateway->findMemberById($normalizedMemberId);
        if (!is_array($member) || !$this->authGateway->verifyPassword($member, $normalizedPassword)) {
            throw ApiException::unauthorized('아이디 또는 비밀번호가 일치하지 않습니다.');
        }

        $existingLink = $this->linkRepository->findByProviderUser(
            $transition['provider'],
            $transition['provider_user_id']
        );

        if (is_array($existingLink)) {
            $linkedMemberId = trim((string)($existingLink['mb_id'] ?? ''));
            if ($linkedMemberId !== '' && $linkedMemberId !== $normalizedMemberId) {
                throw ApiException::conflict('이미 다른 회원에 연결된 외부 계정입니다.');
            }
        }

        $savedLink = $this->linkRepository->saveLink(
            $transition['provider'],
            $transition['provider_user_id'],
            $normalizedMemberId,
            $transition['provider_email'],
            $transition['provider_profile']
        );

        $tokens = $this->authSessionService->issueSessionForMember($member, $ipAddress, [
            'auth_method' => 'external',
            'provider' => $transition['provider'],
            'provider_user_id' => $transition['provider_user_id'],
            'external_transition' => 'claim',
        ]);

        $this->logger->info('external_auth.transition.claim', [
            'provider' => $transition['provider'],
            'provider_user_id' => $transition['provider_user_id'],
            'mb_id' => $normalizedMemberId,
        ]);

        return array_merge($tokens, [
            'mb_id' => $normalizedMemberId,
            'provider' => $transition['provider'],
            'provider_user_id' => $transition['provider_user_id'],
            'link' => $this->payloadBuilder()->serializeLink($savedLink),
            'claimed' => true,
        ]);
    }

    /**
     * @param array<string, mixed> $memberInput
     * @return array<string, mixed>
     */
    public function registerMember(string $provider, string $transitionToken, array $memberInput, string $ipAddress): array
    {
        $transition = $this->transitionTokenDecoder()->decode($provider, $transitionToken, ['login']);
        $existingLink = $this->linkRepository->findByProviderUser(
            $transition['provider'],
            $transition['provider_user_id']
        );

        if (is_array($existingLink) && trim((string)($existingLink['mb_id'] ?? '')) !== '') {
            throw ApiException::conflict('이미 회원 계정에 연결된 외부 인증입니다.');
        }

        $registrationPayload = $this->payloadBuilder()->buildRegistrationPayload($memberInput, $transition, $ipAddress);
        $registered = $this->authRegistrationService->register($registrationPayload);

        $savedLink = $this->linkRepository->saveLink(
            $transition['provider'],
            $transition['provider_user_id'],
            (string)($registered['mb_id'] ?? ''),
            $transition['provider_email'],
            $transition['provider_profile']
        );

        $this->logger->info('external_auth.transition.register', [
            'provider' => $transition['provider'],
            'provider_user_id' => $transition['provider_user_id'],
            'mb_id' => (string)($registered['mb_id'] ?? ''),
        ]);

        return array_merge($registered, [
            'provider' => $transition['provider'],
            'provider_user_id' => $transition['provider_user_id'],
            'link' => $this->payloadBuilder()->serializeLink($savedLink),
            'registered' => true,
        ]);
    }

    private function transitionTokenDecoder(): ExternalAuthTransitionTokenDecoder
    {
        return new ExternalAuthTransitionTokenDecoder($this->tokenCodec);
    }

    private function payloadBuilder(): ExternalAuthTransitionPayloadBuilder
    {
        return new ExternalAuthTransitionPayloadBuilder();
    }
}
