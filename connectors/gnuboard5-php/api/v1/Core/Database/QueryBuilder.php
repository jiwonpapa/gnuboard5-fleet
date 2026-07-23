<?php

/**
 * QueryBuilder API module.
 *
 * @package  Gnuboard5\Api\v1\Core\Database
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Core\Database;

use Doctrine\DBAL\Connection;
use Doctrine\DBAL\DriverManager;
use Doctrine\DBAL\Exception;
use Doctrine\DBAL\Query\QueryBuilder as DbalQueryBuilder;
use Doctrine\DBAL\Result;
use PDO;

class QueryBuilder
{
    private Connection $connection;

    public function __construct(?PDO $pdo = null)
    {
        $settings = PdoConnectionFactory::dbSettings();
        $params = [
            'driver' => 'pdo_mysql',
            'host' => $settings['host'],
            'port' => (int)$settings['port'],
            'dbname' => $settings['db_name'],
            'user' => $settings['user'],
            'password' => $settings['password'],
            'charset' => $settings['charset'],
        ];

        if ($pdo instanceof PDO) {
            $params['pdo'] = $pdo;
        }

        $this->connection = DriverManager::getConnection($params);
    }

    public function connection(): Connection
    {
        return $this->connection;
    }

    public function createQueryBuilder(): DbalQueryBuilder
    {
        return $this->connection->createQueryBuilder();
    }

    /**
     * @param array<string|int, mixed> $params
     * @param array<string|int, mixed> $types
     * @throws Exception
     */
    public function executeQuery(string $sql, array $params = [], array $types = []): Result
    {
        return $this->connection->executeQuery($sql, $params, $types);
    }

    /**
     * @param array<string|int, mixed> $params
     * @param array<string|int, mixed> $types
     * @throws Exception
     */
    public function executeStatement(string $sql, array $params = [], array $types = []): int
    {
        return (int)$this->connection->executeStatement($sql, $params, $types);
    }

    public function lastInsertId(): int
    {
        return (int)$this->connection->lastInsertId();
    }

    public function beginTransaction(): void
    {
        $this->connection->beginTransaction();
    }

    public function commit(): void
    {
        if ($this->connection->isTransactionActive()) {
            $this->connection->commit();
        }
    }

    public function rollback(): void
    {
        if ($this->connection->isTransactionActive()) {
            $this->connection->rollBack();
        }
    }
}
