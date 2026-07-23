<?php

declare(strict_types=1);

namespace Api\Core\Config;

final readonly class RuntimeProfile
{
    public function __construct(
        public RuntimeMode $mode,
        public bool $displayErrorDetails,
        public bool $includeTraceInResponse,
        public bool $logRequestPayload,
        public int $traceLimit,
        public string $source
    ) {
    }

    public function isDev(): bool
    {
        return $this->mode === RuntimeMode::Dev;
    }

    public function isProd(): bool
    {
        return $this->mode === RuntimeMode::Prod;
    }
}
