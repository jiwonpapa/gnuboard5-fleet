<?php

declare(strict_types=1);

namespace Api\Auth\External\Service;

use Api\Auth\External\Contracts\ExternalAuthProviderAdapter;
use Api\Support\Exception\ApiException;

final readonly class ExternalAuthProviderRegistry
{
    /** @var array<string, ExternalAuthProviderAdapter> */
    private array $providers;

    /**
     * @param iterable<ExternalAuthProviderAdapter> $providers
     */
    public function __construct(iterable $providers)
    {
        $resolved = [];
        foreach ($providers as $provider) {
            $resolved[$provider->provider()] = $provider;
        }

        ksort($resolved);
        $this->providers = $resolved;
    }

    /**
     * @return list<array{
     *     provider:string,
     *     label:string,
     *     mode:string,
     *     description:string,
     *     flows:list<string>,
     *     sandbox_available:bool,
     *     replay_supported:bool
     * }>
     */
    public function describeAvailable(): array
    {
        return array_values(
            array_map(
                static fn (ExternalAuthProviderAdapter $provider): array => $provider->describe(),
                $this->providers
            )
        );
    }

    public function resolve(string $provider): ExternalAuthProviderAdapter
    {
        if (!isset($this->providers[$provider])) {
            throw ApiException::notFound('해당 외부 인증 공급자를 사용할 수 없습니다.');
        }

        return $this->providers[$provider];
    }
}
