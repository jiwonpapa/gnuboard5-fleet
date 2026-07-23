<?php

declare(strict_types=1);

namespace Api\Support\Database;

use Api\Core\Database\QueryBuilder;
use Api\Support\Exception\ApiException;
use Throwable;

final class MySqlNamedLock
{
    private const DEFAULT_TIMEOUT_SECONDS = 3;

    /**
     * @template T
     * @param callable():T $callback
     * @return T
     */
    public static function withLock(QueryBuilder $queryBuilder, string $name, callable $callback, int $timeoutSeconds = self::DEFAULT_TIMEOUT_SECONDS): mixed
    {
        $lockName = self::normalizeName($name);
        self::acquire($queryBuilder, $lockName, $timeoutSeconds);

        try {
            return $callback();
        } finally {
            self::release($queryBuilder, $lockName);
        }
    }

    private static function acquire(QueryBuilder $queryBuilder, string $lockName, int $timeoutSeconds): void
    {
        $row = $queryBuilder->executeQuery(
            'SELECT GET_LOCK(:lock_name, :timeout_seconds) AS lock_state',
            [
                'lock_name' => $lockName,
                'timeout_seconds' => max(0, $timeoutSeconds),
            ]
        )->fetchAssociative();

        $lockState = $row['lock_state'] ?? null;
        if ((string)$lockState === '1') {
            return;
        }

        if ((string)$lockState === '0') {
            throw ApiException::conflict('동시 요청 처리 중입니다. 잠시 후 다시 시도해 주세요.');
        }

        throw ApiException::serverError('논리 잠금 획득에 실패했습니다.');
    }

    private static function release(QueryBuilder $queryBuilder, string $lockName): void
    {
        try {
            $queryBuilder->executeQuery(
                'SELECT RELEASE_LOCK(:lock_name) AS released',
                ['lock_name' => $lockName]
            )->fetchAssociative();
        } catch (Throwable) {
            // Release is best-effort. The original domain exception should win.
        }
    }

    private static function normalizeName(string $name): string
    {
        $candidate = trim(preg_replace('/\s+/', ':', $name) ?? '');
        if ($candidate === '') {
            throw ApiException::serverError('논리 잠금 키가 비어 있습니다.');
        }

        if (strlen($candidate) <= 64) {
            return $candidate;
        }

        return 'g5:' . sha1($candidate);
    }
}
