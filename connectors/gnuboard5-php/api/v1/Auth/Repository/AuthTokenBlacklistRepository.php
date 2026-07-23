<?php

/**
 * AuthTokenBlacklistRepository API module.
 *
 * @package  Gnuboard5\Api\v1\Auth\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Auth\Repository;

use Api\Core\Util\G5DateTime;

final class AuthTokenBlacklistRepository extends AuthRepositorySupport
{
    private static bool $tokenBlacklistTableReady = false;

    public function revokeToken(string $memberId, string $jti, string $tokenType, int $expiresAt): void
    {
        $normalizedMemberId = $this->normalizeMemberId($memberId);
        if (!$this->isValidMemberId($normalizedMemberId)) {
            return;
        }

        $normalizedJti = trim($jti);
        if ($normalizedJti === '') {
            return;
        }

        $this->ensureTokenBlacklistTable();
        $this->cleanupTokenBlacklist();

        $table = $this->tables()->get('api_token_blacklist');
        $this->executeStatement(
            "INSERT INTO {$table} (mb_id, token_jti, token_type, expires_at, revoked_at)
             VALUES (:mb_id, :token_jti, :token_type, :expires_at, :revoked_at)
             ON DUPLICATE KEY UPDATE revoked_at = :u_revoked_at, expires_at = :u_expires_at",
            [
                'mb_id' => $normalizedMemberId,
                'token_jti' => substr($normalizedJti, 0, 64),
                'token_type' => trim($tokenType),
                'expires_at' => max(0, $expiresAt),
                'revoked_at' => G5DateTime::now(),
                'u_revoked_at' => G5DateTime::now(),
                'u_expires_at' => max(0, $expiresAt),
            ]
        );
    }

    public function isTokenRevoked(string $jti, string $tokenType): bool
    {
        $normalizedJti = trim($jti);
        if ($normalizedJti === '') {
            return false;
        }

        $this->ensureTokenBlacklistTable();
        $this->cleanupTokenBlacklist();

        $table = $this->tables()->get('api_token_blacklist');
        $row = $this->fetchAssociative(
            "SELECT COUNT(*) AS cnt
             FROM {$table}
             WHERE token_jti = :token_jti
               AND token_type = :token_type",
            [
                'token_jti' => substr($normalizedJti, 0, 64),
                'token_type' => trim($tokenType),
            ]
        );

        return ((int)($row['cnt'] ?? 0)) > 0;
    }

    private function ensureTokenBlacklistTable(): void
    {
        if (self::$tokenBlacklistTableReady) {
            return;
        }

        $table = $this->tables()->get('api_token_blacklist');
        $sql = "CREATE TABLE IF NOT EXISTS {$table} (
            tb_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            mb_id VARCHAR(20) NOT NULL DEFAULT '',
            token_jti VARCHAR(64) NOT NULL,
            token_type VARCHAR(20) NOT NULL,
            expires_at INT NOT NULL DEFAULT 0,
            revoked_at DATETIME NOT NULL,
            PRIMARY KEY (tb_id),
            UNIQUE KEY uniq_token (token_jti, token_type),
            KEY idx_expires_at (expires_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8";

        $this->executeStatement($sql);
        self::$tokenBlacklistTableReady = true;
    }

    private function cleanupTokenBlacklist(): void
    {
        $table = $this->tables()->get('api_token_blacklist');
        $threshold = time() - 86400;
        $this->executeStatement(
            "DELETE FROM {$table}
             WHERE expires_at > 0
               AND expires_at < :expires_at",
            ['expires_at' => $threshold]
        );
    }
}
