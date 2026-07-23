<?php

/**
 * AuthLoginAttemptRepository API module.
 *
 * @package  Gnuboard5\Api\v1\Auth\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Auth\Repository;

use Api\Core\Util\G5DateTime;

final class AuthLoginAttemptRepository extends AuthRepositorySupport
{
    private static bool $loginAttemptTableReady = false;

    public function isLoginBlocked(string $memberId, string $ipAddress, int $maxAttempts, int $windowSeconds): bool
    {
        $normalizedId = $this->normalizeMemberId($memberId);
        if (!$this->isValidMemberId($normalizedId) || $maxAttempts <= 0 || $windowSeconds <= 0) {
            return false;
        }

        $this->ensureLoginAttemptTable();
        $table = $this->tables()->get('api_login_attempt');
        $row = $this->fetchAssociative(
            "SELECT fail_count, last_fail
             FROM {$table}
             WHERE mb_id = :mb_id AND ip_address = :ip_address
             LIMIT 1",
            [
                'mb_id' => $normalizedId,
                'ip_address' => $this->normalizeIp($ipAddress),
            ]
        );

        if (!is_array($row)) {
            return false;
        }

        $failCount = (int)($row['fail_count'] ?? 0);
        $lastFail = (string)($row['last_fail'] ?? '');
        $lastTs = strtotime($lastFail);
        if ($lastTs === false || $lastTs <= 0) {
            return false;
        }

        $withinWindow = (time() - $lastTs) <= $windowSeconds;

        return $withinWindow && $failCount >= $maxAttempts;
    }

    public function registerFailedLoginAttempt(string $memberId, string $ipAddress): void
    {
        $normalizedId = $this->normalizeMemberId($memberId);
        if (!$this->isValidMemberId($normalizedId)) {
            return;
        }

        $this->ensureLoginAttemptTable();
        $table = $this->tables()->get('api_login_attempt');
        $ip = $this->normalizeIp($ipAddress);
        $now = G5DateTime::now();
        $windowSeconds = max(1, $this->envConfig()->loginFailWindowSeconds);

        $current = $this->fetchAssociative(
            "SELECT fail_count, last_fail
             FROM {$table}
             WHERE mb_id = :mb_id AND ip_address = :ip_address
             LIMIT 1",
            [
                'mb_id' => $normalizedId,
                'ip_address' => $ip,
            ]
        );

        $nextCount = 1;
        if (is_array($current)) {
            $lastFail = (string)($current['last_fail'] ?? '');
            $lastTs = strtotime($lastFail);
            if ($lastTs !== false && $lastTs > 0 && (time() - $lastTs) <= $windowSeconds) {
                $nextCount = ((int)($current['fail_count'] ?? 0)) + 1;
            }
        }

        $this->executeStatement(
            "INSERT INTO {$table} (mb_id, ip_address, fail_count, last_fail)
             VALUES (:mb_id, :ip_address, :fail_count, :last_fail)
             ON DUPLICATE KEY UPDATE fail_count = :u_fail_count, last_fail = :u_last_fail",
            [
                'mb_id' => $normalizedId,
                'ip_address' => $ip,
                'fail_count' => $nextCount,
                'last_fail' => $now,
                'u_fail_count' => $nextCount,
                'u_last_fail' => $now,
            ]
        );
    }

    public function clearFailedLoginAttempts(string $memberId, string $ipAddress): void
    {
        $normalizedId = $this->normalizeMemberId($memberId);
        if (!$this->isValidMemberId($normalizedId)) {
            return;
        }

        $this->ensureLoginAttemptTable();
        $table = $this->tables()->get('api_login_attempt');
        $this->executeStatement(
            "DELETE FROM {$table} WHERE mb_id = :mb_id AND ip_address = :ip_address",
            [
                'mb_id' => $normalizedId,
                'ip_address' => $this->normalizeIp($ipAddress),
            ]
        );
    }

    public function updateTodayLogin(string $memberId, string $ipAddress): void
    {
        $normalizedId = $this->normalizeMemberId($memberId);
        if (!$this->isValidMemberId($normalizedId)) {
            return;
        }

        $memberTable = $this->tables()->get('member');
        $this->executeStatement(
            "UPDATE {$memberTable}
             SET mb_today_login = :mb_today_login,
                 mb_login_ip = :mb_login_ip
             WHERE mb_id = :mb_id",
            [
                'mb_today_login' => G5DateTime::now(),
                'mb_login_ip' => $this->normalizeIp($ipAddress),
                'mb_id' => $normalizedId,
            ]
        );
    }

    private function ensureLoginAttemptTable(): void
    {
        if (self::$loginAttemptTableReady) {
            return;
        }

        $table = $this->tables()->get('api_login_attempt');
        $sql = "CREATE TABLE IF NOT EXISTS {$table} (
            mb_id VARCHAR(20) NOT NULL,
            ip_address VARCHAR(100) NOT NULL,
            fail_count INT NOT NULL DEFAULT 0,
            last_fail DATETIME NOT NULL,
            PRIMARY KEY (mb_id, ip_address),
            KEY idx_last_fail (last_fail)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8";

        $this->executeStatement($sql);
        self::$loginAttemptTableReady = true;
    }
}
