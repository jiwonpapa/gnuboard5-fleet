<?php

declare(strict_types=1);

namespace Tests\Support {

    final class DbStub
    {
        private static array $queryLog = [];
        private static mixed $sqlQueryHandler = null;
        private static mixed $sqlFetchHandler = null;
        private static mixed $sqlFetchArrayHandler = null;
        private static mixed $sqlRealEscapeHandler = null;

        public static function reset(): void
        {
            self::$queryLog = [];
            self::$sqlQueryHandler = null;
            self::$sqlFetchHandler = null;
            self::$sqlFetchArrayHandler = null;
            self::$sqlRealEscapeHandler = null;
        }

        public static function setSqlQueryHandler(callable $handler): void
        {
            self::$sqlQueryHandler = $handler;
        }

        public static function setSqlFetchHandler(callable $handler): void
        {
            self::$sqlFetchHandler = $handler;
        }

        public static function setSqlFetchArrayHandler(callable $handler): void
        {
            self::$sqlFetchArrayHandler = $handler;
        }

        public static function setSqlRealEscapeHandler(callable $handler): void
        {
            self::$sqlRealEscapeHandler = $handler;
        }

        public static function query(string $query, bool $isCache): mixed
        {
            self::$queryLog[] = ['query' => $query, 'isCache' => $isCache];
            if (self::$sqlQueryHandler === null) {
                return null;
            }

            return (self::$sqlQueryHandler)($query, $isCache);
        }

        public static function fetch(string $query): mixed
        {
            if (self::$sqlFetchHandler === null) {
                return false;
            }

            return (self::$sqlFetchHandler)($query);
        }

        public static function fetchArray(mixed $result): mixed
        {
            if (self::$sqlFetchArrayHandler === null) {
                return false;
            }

            return (self::$sqlFetchArrayHandler)($result);
        }

        public static function realEscape(string $value): string
        {
            if (self::$sqlRealEscapeHandler === null) {
                return addslashes($value);
            }

            return (self::$sqlRealEscapeHandler)($value);
        }

        public static function getQueryLog(): array
        {
            return self::$queryLog;
        }
    }

}

namespace {
    if (!function_exists('sql_query')) {
        function sql_query(string $query, bool $isCache = false): mixed
        {
            return \Tests\Support\DbStub::query($query, $isCache);
        }
    }

    if (!function_exists('sql_fetch')) {
        function sql_fetch(string $query): mixed
        {
            return \Tests\Support\DbStub::fetch($query);
        }
    }

    if (!function_exists('sql_fetch_array')) {
        function sql_fetch_array(mixed $result): mixed
        {
            return \Tests\Support\DbStub::fetchArray($result);
        }
    }

    if (!function_exists('sql_real_escape_string')) {
        function sql_real_escape_string(string $value): string
        {
            return \Tests\Support\DbStub::realEscape($value);
        }
    }

    if (!defined('G5_TIME_YMDHIS')) {
        define('G5_TIME_YMDHIS', date('Y-m-d H:i:s'));
    }
}

namespace Api\Board\Repository {
    function sql_query(string $query, bool $isCache = false): mixed
    {
        return \Tests\Support\DbStub::query($query, $isCache);
    }

    function sql_fetch(string $query): mixed
    {
        return \Tests\Support\DbStub::fetch($query);
    }

    function sql_fetch_array(mixed $result): mixed
    {
        return \Tests\Support\DbStub::fetchArray($result);
    }

    function sql_real_escape_string(string $value): string
    {
        return \Tests\Support\DbStub::realEscape($value);
    }
}

namespace Api\Member\Repository {
    function sql_query(string $query, bool $isCache = false): mixed
    {
        return \Tests\Support\DbStub::query($query, $isCache);
    }

    function sql_fetch(string $query): mixed
    {
        return \Tests\Support\DbStub::fetch($query);
    }

    function sql_real_escape_string(string $value): string
    {
        return \Tests\Support\DbStub::realEscape($value);
    }
}

namespace Api\Like\Repository {
    function sql_query(string $query, bool $isCache = false): mixed
    {
        return \Tests\Support\DbStub::query($query, $isCache);
    }

    function sql_fetch(string $query): mixed
    {
        return \Tests\Support\DbStub::fetch($query);
    }

    function sql_fetch_array(mixed $result): mixed
    {
        return \Tests\Support\DbStub::fetchArray($result);
    }

    function sql_real_escape_string(string $value): string
    {
        return \Tests\Support\DbStub::realEscape($value);
    }
}

namespace Api\Menu\Repository {
    function sql_query(string $query, bool $isCache = false): mixed
    {
        return \Tests\Support\DbStub::query($query, $isCache);
    }

    function sql_fetch_array(mixed $result): mixed
    {
        return \Tests\Support\DbStub::fetchArray($result);
    }

    function sql_real_escape_string(string $value): string
    {
        return \Tests\Support\DbStub::realEscape($value);
    }
}

namespace Api\Point\Repository {
    function sql_query(string $query, bool $isCache = false): mixed
    {
        return \Tests\Support\DbStub::query($query, $isCache);
    }

    function sql_fetch(string $query): mixed
    {
        return \Tests\Support\DbStub::fetch($query);
    }

    function sql_fetch_array(mixed $result): mixed
    {
        return \Tests\Support\DbStub::fetchArray($result);
    }

    function sql_real_escape_string(string $value): string
    {
        return \Tests\Support\DbStub::realEscape($value);
    }
}
