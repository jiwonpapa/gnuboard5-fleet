<?php

/**
 * PdoConnectionFactory API module.
 *
 * @package  Gnuboard5\Api\v1\Core\Database
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Core\Database;

use Api\Core\Config\EnvValueReader;
use Api\Core\Config\EnvLoader;
use Api\Core\Exception\ApiException;
use PDO;
use PDOException;

final class PdoConnectionFactory
{
    private static ?PDO $pdo = null;
    /** @var array<string, string>|null */
    private static ?array $fileEnv = null;

    public static function create(): PDO
    {
        if (self::$pdo instanceof PDO) {
            return self::$pdo;
        }

        $settings = self::dbSettings();

        if ($settings['host'] === '' || $settings['db_name'] === '' || $settings['user'] === '') {
            throw ApiException::serviceUnavailable('DB 환경변수가 누락되었습니다. (.env: DB_HOST, DB_NAME, DB_USER)');
        }

        $dsn = sprintf(
            'mysql:host=%s;port=%s;dbname=%s;charset=%s',
            $settings['host'],
            $settings['port'],
            $settings['db_name'],
            $settings['charset']
        );

        try {
            self::$pdo = new PDO(
                $dsn,
                $settings['user'],
                $settings['password'],
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                ]
            );
        } catch (PDOException $exception) {
            throw ApiException::serviceUnavailable('DB 연결에 실패했습니다: ' . $exception->getMessage());
        }

        return self::$pdo;
    }

    /**
     * @return array{
     *   host:string,
     *   port:string,
     *   db_name:string,
     *   user:string,
     *   password:string,
     *   charset:string
     * }
     */
    public static function dbSettings(): array
    {
        self::loadEnvFile();
        $fileEnv = self::fileEnv();

        return [
            'host' => self::envValue('DB_HOST', '', $fileEnv),
            'port' => self::envValue('DB_PORT', '3306', $fileEnv),
            'db_name' => self::envValue('DB_NAME', '', $fileEnv),
            'user' => self::envValue('DB_USER', '', $fileEnv),
            'password' => self::envValue('DB_PASS', '', $fileEnv, false),
            'charset' => self::envValue('DB_CHARSET', 'utf8mb4', $fileEnv),
        ];
    }

    private static function loadEnvFile(): void
    {
        self::fileEnv();
    }

    /**
     * @return array<string, string>
     */
    private static function fileEnv(): array
    {
        if (is_array(self::$fileEnv)) {
            return self::$fileEnv;
        }

        $projectRoot = dirname(__DIR__, 4);
        self::$fileEnv = EnvLoader::load(EnvLoader::resolvePath($projectRoot));

        return self::$fileEnv;
    }

    /**
     * @param array<string, string> $fileEnv
     */
    private static function envValue(string $key, string $default, array $fileEnv, bool $trim = true): string
    {
        if (array_key_exists($key, $fileEnv)) {
            $value = $fileEnv[$key];

            return $trim ? trim($value) : $value;
        }

        $value = $trim
            ? EnvValueReader::string($key, $default)
            : EnvValueReader::stringUntrimmed($key, $default);

        return $trim ? trim($value) : $value;
    }
}
