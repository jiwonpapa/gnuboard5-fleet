<?php

declare(strict_types=1);

namespace Api\Auth\External\Repository;

final class ExternalAuthLinkQueryRepository extends ExternalAuthLinkRepositorySupport
{
    /**
     * @return array<string, mixed>|null
     */
    public function findByProviderUser(string $provider, string $providerUserId): ?array
    {
        $normalizedProvider = $this->normalizeProvider($provider);
        $normalizedProviderUserId = $this->normalizeProviderUserId($providerUserId);
        if ($normalizedProviderUserId === '') {
            return null;
        }

        $this->ensureTable();
        $row = $this->fetchAssociative(
            "SELECT link_id, provider, provider_user_id, mb_id, provider_email, provider_profile_json, linked_at, updated_at
             FROM {$this->tableName()}
             WHERE provider = :provider
               AND provider_user_id = :provider_user_id
             LIMIT 1",
            [
                'provider' => $normalizedProvider,
                'provider_user_id' => $normalizedProviderUserId,
            ]
        );

        return is_array($row) ? $row : null;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function listByMemberId(string $memberId): array
    {
        $normalizedMemberId = $this->normalizeMemberId($memberId);
        if (!$this->isValidMemberId($normalizedMemberId)) {
            return [];
        }

        $this->ensureTable();

        return $this->fetchAllAssociative(
            "SELECT link_id, provider, provider_user_id, mb_id, provider_email, provider_profile_json, linked_at, updated_at
             FROM {$this->tableName()}
             WHERE mb_id = :mb_id
             ORDER BY provider ASC, provider_user_id ASC",
            ['mb_id' => $normalizedMemberId]
        );
    }
}
