<?php

declare(strict_types=1);

namespace Api\Auth\External\Service;

use Api\Auth\External\Repository\ExternalAuthLinkRepository;
use Api\Auth\External\Support\ExternalAuthRequestTokenCodec;
use Api\Support\Exception\ApiException;

final readonly class ExternalAuthLinkManagementService
{
    public function __construct(
        private ExternalAuthLinkRepository $linkRepository,
        private ExternalAuthRequestTokenCodec $tokenCodec
    ) {
    }

    /**
     * @param array<string, mixed> $member
     * @return array<string, mixed>
     */
    public function link(array $member, string $provider, string $linkToken): array
    {
        $memberId = $this->requireMemberId($member);
        $claims = $this->tokenCodec->decode($linkToken);
        $kind = strtolower(trim((string)($claims['kind'] ?? '')));
        if (!in_array($kind, ['external_transition', 'external_link'], true)) {
            throw ApiException::unauthorized('외부 인증 transition_token 형식이 올바르지 않습니다.');
        }

        $normalizedProvider = strtolower(trim($provider));
        if (($claims['provider'] ?? null) !== $normalizedProvider) {
            throw ApiException::unauthorized('link_token의 provider가 요청 경로와 일치하지 않습니다.');
        }

        $providerUserId = trim((string)($claims['provider_user_id'] ?? ''));
        if ($providerUserId === '') {
            throw ApiException::badRequest('link_token에 provider_user_id가 없습니다.');
        }

        $existing = $this->linkRepository->findByProviderUser($normalizedProvider, $providerUserId);
        if (is_array($existing) && (string)($existing['mb_id'] ?? '') !== '' && (string)($existing['mb_id'] ?? '') !== $memberId) {
            throw ApiException::conflict('이미 다른 회원에 연결된 외부 계정입니다.');
        }

        $saved = $this->linkRepository->saveLink(
            $normalizedProvider,
            $providerUserId,
            $memberId,
            isset($claims['provider_email']) ? (string)$claims['provider_email'] : null,
            is_array($claims['provider_profile'] ?? null) ? (array)$claims['provider_profile'] : []
        );

        return $this->serializeLink($saved);
    }

    /**
     * @param array<string, mixed> $member
     * @return array<int, array<string, mixed>>
     */
    public function listMine(array $member): array
    {
        $memberId = $this->requireMemberId($member);

        return array_values(
            array_map(
                fn (array $row): array => $this->serializeLink($row),
                $this->linkRepository->listByMemberId($memberId)
            )
        );
    }

    /**
     * @param array<string, mixed> $member
     * @return array<string, mixed>
     */
    public function unlink(array $member, string $provider, string $providerUserId): array
    {
        $memberId = $this->requireMemberId($member);
        $deleted = $this->linkRepository->deleteLink($provider, $providerUserId, $memberId);
        if ($deleted < 1) {
            throw ApiException::notFound('해당 외부 인증 연결을 찾을 수 없습니다.');
        }

        return [
            'provider' => strtolower(trim($provider)),
            'provider_user_id' => trim($providerUserId),
            'unlinked' => true,
        ];
    }

    /**
     * @param array<string, mixed> $member
     */
    private function requireMemberId(array $member): string
    {
        $memberId = trim((string)($member['mb_id'] ?? ''));
        if ($memberId === '') {
            throw ApiException::unauthorized('인증 토큰이 필요합니다.');
        }

        return $memberId;
    }

    /**
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    private function serializeLink(array $row): array
    {
        $profile = null;
        $rawProfile = $row['provider_profile_json'] ?? null;
        if (is_string($rawProfile) && trim($rawProfile) !== '') {
            $decoded = json_decode($rawProfile, true);
            if (is_array($decoded)) {
                $profile = $decoded;
            }
        }

        return [
            'link_id' => (int)($row['link_id'] ?? 0),
            'provider' => (string)($row['provider'] ?? ''),
            'provider_user_id' => (string)($row['provider_user_id'] ?? ''),
            'mb_id' => (string)($row['mb_id'] ?? ''),
            'provider_email' => (string)($row['provider_email'] ?? ''),
            'provider_profile' => $profile,
            'linked_at' => (string)($row['linked_at'] ?? ''),
            'updated_at' => (string)($row['updated_at'] ?? ''),
        ];
    }
}
