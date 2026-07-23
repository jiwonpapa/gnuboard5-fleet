<?php

declare(strict_types=1);

namespace Api\Support\Logging;

use Api\Core\Config\EnvValueReader;
use Monolog\Formatter\JsonFormatter;
use Monolog\Handler\StreamHandler;
use Monolog\Level;
use Monolog\Logger;
use Psr\Log\LoggerInterface;

final class ApiLoggerFactory
{
    public static function create(string $channel, string $logPath, Level|string|null $level = null): LoggerInterface
    {
        $directory = dirname($logPath);
        if (!is_dir($directory)) {
            mkdir($directory, 0775, true);
        }

        $handler = new StreamHandler($logPath, self::normalizeLevel($level ?? self::envLevel()));
        $handler->setFormatter(new JsonFormatter(JsonFormatter::BATCH_MODE_NEWLINES, true, false, true));

        $logger = new Logger($channel);
        $logger->pushHandler($handler);

        return $logger;
    }

    public static function envLevel(string $default = 'debug'): Level
    {
        return self::normalizeLevel(EnvValueReader::string('LOG_LEVEL', $default));
    }

    private static function normalizeLevel(Level|string $level): Level
    {
        if ($level instanceof Level) {
            return $level;
        }

        return match (strtolower(trim($level))) {
            'info' => Level::Info,
            'notice' => Level::Notice,
            'warning' => Level::Warning,
            'error' => Level::Error,
            'critical' => Level::Critical,
            'alert' => Level::Alert,
            'emergency' => Level::Emergency,
            default => Level::Debug,
        };
    }
}
