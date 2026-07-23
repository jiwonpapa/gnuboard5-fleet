<?php

declare(strict_types=1);

namespace Api\Auth\External\Support;

use Api\Core\Config\EnvValueReader;
use Api\Core\Config\RuntimeProfile;

final readonly class ExternalAuthConfig
{
    public function __construct(
        public bool $fakeProviderEnabled,
        public bool $allowReplayScenarios,
        public int $requestTtlSeconds,
        public string $requestTokenSecret,
        public string $fakeAuthorizeBaseUrl
    ) {
    }

    public static function fromEnv(RuntimeProfile $runtimeProfile): self
    {
        $fallbackSecret = EnvValueReader::string('JWT_SECRET', 'external-auth-request-secret');

        return new self(
            fakeProviderEnabled: $runtimeProfile->isDev() && EnvValueReader::bool('AUTH_EXTERNAL_FAKE_ENABLED', true),
            allowReplayScenarios: $runtimeProfile->isDev() && EnvValueReader::bool('AUTH_EXTERNAL_ALLOW_REPLAY', true),
            requestTtlSeconds: max(60, EnvValueReader::int('AUTH_EXTERNAL_REQUEST_TTL_SECONDS', 600)),
            requestTokenSecret: EnvValueReader::string('AUTH_EXTERNAL_REQUEST_SECRET', $fallbackSecret),
            fakeAuthorizeBaseUrl: rtrim(
                EnvValueReader::string('AUTH_EXTERNAL_FAKE_AUTHORIZE_BASE_URL', '/fake-provider/authorize'),
                '/'
            )
        );
    }
}
