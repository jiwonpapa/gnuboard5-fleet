<?php

declare(strict_types=1);

namespace Api\Auth\External\Repository;

use Api\Support\Exception\ApiException;
use Api\Support\Repository\BaseRepository;
use Api\Support\Validation\ValidationPatterns;

abstract class ExternalAuthLinkRepositorySupport extends BaseRepository
{
    protected static bool $tableReady = false;

    protected function ensureTable(): void
    {
        if (self::$tableReady) {
            return;
        }

        $table = $this->tables()->get('api_external_auth_link');
        $sql = "CREATE TABLE IF NOT EXISTS {$table} (
            link_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            provider VARCHAR(32) NOT NULL,
            provider_user_id VARCHAR(191) NOT NULL,
            mb_id VARCHAR(20) NOT NULL,
            provider_email VARCHAR(255) NOT NULL DEFAULT '',
            provider_profile_json LONGTEXT NULL,
            linked_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL,
            PRIMARY KEY (link_id),
            UNIQUE KEY uniq_provider_user (provider, provider_user_id),
            KEY idx_mb_id (mb_id),
            KEY idx_provider_email (provider_email)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8";

        $this->executeStatement($sql);
        self::$tableReady = true;
    }

    protected function tableName(): string
    {
        return $this->tables()->get('api_external_auth_link');
    }

    protected function normalizeProvider(string $provider): string
    {
        $normalized = strtolower(trim($provider));
        if ($normalized === '' || preg_match('/^[a-z][a-z0-9_-]{1,31}$/', $normalized) !== 1) {
            throw ApiException::badRequest('provider 형식이 올바르지 않습니다.');
        }

        return $normalized;
    }

    protected function normalizeProviderUserId(string $providerUserId): string
    {
        $normalized = trim($providerUserId);
        if (mb_strlen($normalized) > 191) {
            return mb_substr($normalized, 0, 191);
        }

        return $normalized;
    }

    protected function normalizeMemberId(string $memberId): string
    {
        return trim($memberId);
    }

    protected function normalizeEmail(?string $providerEmail): string
    {
        $normalized = strtolower(trim((string)$providerEmail));

        return mb_substr($normalized, 0, 255);
    }

    protected function assertValidMemberId(string $memberId): void
    {
        if (preg_match(ValidationPatterns::MEMBER_ID, $memberId) !== 1) {
            throw ApiException::badRequest('member_id 형식이 올바르지 않습니다.');
        }
    }

    protected function isValidMemberId(string $memberId): bool
    {
        return preg_match(ValidationPatterns::MEMBER_ID, $memberId) === 1;
    }
}
