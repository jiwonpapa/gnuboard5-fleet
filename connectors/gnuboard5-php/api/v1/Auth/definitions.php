<?php

declare(strict_types=1);

return [
    \Api\Auth\External\Support\ExternalAuthConfig::class => static fn (\Api\Core\Config\RuntimeProfile $runtimeProfile): \Api\Auth\External\Support\ExternalAuthConfig => \Api\Auth\External\Support\ExternalAuthConfig::fromEnv($runtimeProfile),
    \Api\Auth\External\Support\ExternalAuthProviderConfig::class => static fn (): \Api\Auth\External\Support\ExternalAuthProviderConfig => \Api\Auth\External\Support\ExternalAuthProviderConfig::fromEnv(),
    \Api\Auth\External\Support\ExternalAuthRequestTokenCodec::class => static fn (\Api\Auth\External\Support\ExternalAuthConfig $config): \Api\Auth\External\Support\ExternalAuthRequestTokenCodec => new \Api\Auth\External\Support\ExternalAuthRequestTokenCodec(
        $config->requestTokenSecret,
        $config->requestTtlSeconds
    ),
    \Api\Auth\External\Contracts\ExternalAuthHttpClient::class => \DI\autowire(\Api\Auth\External\Support\NativeExternalAuthHttpClient::class),
    \Api\Auth\External\Provider\FakeExternalAuthProviderAdapter::class => \DI\autowire(),
    \Api\Auth\External\Provider\GoogleExternalAuthProviderAdapter::class => \DI\autowire(),
    \Api\Auth\External\Provider\KakaoExternalAuthProviderAdapter::class => \DI\autowire(),
    \Api\Auth\External\Service\ExternalAuthProviderRegistry::class => static fn (
        \Api\Auth\External\Support\ExternalAuthConfig $config,
        \Api\Auth\External\Provider\FakeExternalAuthProviderAdapter $fakeProvider,
        \Api\Auth\External\Provider\GoogleExternalAuthProviderAdapter $googleProvider,
        \Api\Auth\External\Provider\KakaoExternalAuthProviderAdapter $kakaoProvider
    ): \Api\Auth\External\Service\ExternalAuthProviderRegistry => new \Api\Auth\External\Service\ExternalAuthProviderRegistry(array_values(array_filter([
        $config->fakeProviderEnabled ? $fakeProvider : null,
        $googleProvider->isConfigured() ? $googleProvider : null,
        $kakaoProvider->isConfigured() ? $kakaoProvider : null,
    ]))),
    \Api\Security\JwtService::class => static fn (\Api\Core\Config\EnvConfig $envConfig): \Api\Security\JwtService => new \Api\Security\JwtService(
        $envConfig->jwtSecret,
        $envConfig->jwtAccessExpires,
        $envConfig->jwtRefreshExpires,
        $envConfig->jwtIssuer,
        $envConfig->jwtAudience,
        $envConfig->jwtLeewaySeconds
    ),
    \Api\Auth\Contracts\AuthIdentityGateway::class => \DI\autowire(\Api\Auth\Repository\AuthRepository::class),
    \Api\Auth\Contracts\AuthRegistrationGateway::class => \DI\autowire(\Api\Auth\Repository\AuthRepository::class),
    \Api\Auth\Contracts\AuthSessionGateway::class => \DI\autowire(\Api\Auth\Repository\AuthRepository::class),
    \Api\Auth\Contracts\AuthRecoveryGateway::class => \DI\autowire(\Api\Auth\Repository\AuthRepository::class),
    \Api\Auth\Contracts\AuthGateway::class => \DI\autowire(\Api\Auth\Repository\AuthRepository::class),
    \Api\Integration\Contracts\AuthIdentityGateway::class => \DI\autowire(\Api\Auth\Repository\AuthRepository::class),
    \Api\Integration\Contracts\AuthSessionGateway::class => \DI\autowire(\Api\Auth\Repository\AuthRepository::class),
    \Api\Integration\Contracts\AuthRecoveryGateway::class => \DI\autowire(\Api\Auth\Repository\AuthRepository::class),
    \Api\Integration\Contracts\AuthGateway::class => \DI\autowire(\Api\Auth\Repository\AuthRepository::class),
];
