<?php

declare(strict_types=1);

namespace Api\Auth\External\Repository;

use Api\Support\Exception\ApiException;

final class ExternalAuthLinkMutationRepository extends ExternalAuthLinkRepositorySupport
{
    public function __construct(
        private readonly ExternalAuthLinkQueryRepository $queryRepository,
        ?\Api\Core\Database\QueryBuilder $qb = null,
        ?\Api\Core\Database\TableRegistry $tables = null
    ) {
        parent::__construct($qb, $tables);
    }

    /**
     * @param array<string, mixed> $providerProfile
     * @return array<string, mixed>
     */
    public function saveLink(
        string $provider,
        string $providerUserId,
        string $memberId,
        ?string $providerEmail = null,
        array $providerProfile = []
    ): array {
        $normalizedProvider = $this->normalizeProvider($provider);
        $normalizedProviderUserId = $this->normalizeProviderUserId($providerUserId);
        $normalizedMemberId = $this->normalizeMemberId($memberId);
        if ($normalizedProviderUserId === '') {
            throw ApiException::badRequest('provider_user_id가 필요합니다.');
        }
        $this->assertValidMemberId($normalizedMemberId);

        $normalizedEmail = $this->normalizeEmail($providerEmail);
        $profileJson = $providerProfile === []
            ? null
            : json_encode($providerProfile, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);

        $this->ensureTable();
        $now = gmdate('Y-m-d H:i:s');
        $this->executeStatement(
            "INSERT INTO {$this->tableName()} (
                provider,
                provider_user_id,
                mb_id,
                provider_email,
                provider_profile_json,
                linked_at,
                updated_at
            ) VALUES (
                :provider,
                :provider_user_id,
                :mb_id,
                :provider_email,
                :provider_profile_json,
                :linked_at,
                :updated_at
            )
            ON DUPLICATE KEY UPDATE
                mb_id = :u_mb_id,
                provider_email = :u_provider_email,
                provider_profile_json = :u_provider_profile_json,
                updated_at = :u_updated_at",
            [
                'provider' => $normalizedProvider,
                'provider_user_id' => $normalizedProviderUserId,
                'mb_id' => $normalizedMemberId,
                'provider_email' => $normalizedEmail,
                'provider_profile_json' => $profileJson,
                'linked_at' => $now,
                'updated_at' => $now,
                'u_mb_id' => $normalizedMemberId,
                'u_provider_email' => $normalizedEmail,
                'u_provider_profile_json' => $profileJson,
                'u_updated_at' => $now,
            ]
        );

        return $this->queryRepository->findByProviderUser($normalizedProvider, $normalizedProviderUserId) ?? [];
    }

    public function deleteLink(string $provider, string $providerUserId, string $memberId): int
    {
        $normalizedProvider = $this->normalizeProvider($provider);
        $normalizedProviderUserId = $this->normalizeProviderUserId($providerUserId);
        $normalizedMemberId = $this->normalizeMemberId($memberId);
        if ($normalizedProviderUserId === '' || !$this->isValidMemberId($normalizedMemberId)) {
            return 0;
        }

        $this->ensureTable();

        return $this->executeStatement(
            "DELETE FROM {$this->tableName()}
             WHERE provider = :provider
               AND provider_user_id = :provider_user_id
               AND mb_id = :mb_id",
            [
                'provider' => $normalizedProvider,
                'provider_user_id' => $normalizedProviderUserId,
                'mb_id' => $normalizedMemberId,
            ]
        );
    }
}
