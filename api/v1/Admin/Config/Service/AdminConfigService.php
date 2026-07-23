<?php

/**
 * AdminConfigService API module.
 *
 * @package  Gnuboard5\Api\v1\Admin\Config\Service
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Admin\Config\Service;

use Api\Admin\Config\Repository\AdminConfigRepository;
use Api\Admin\Config\Support\AdminConfigPayloadGuard;
use Api\Admin\Config\Support\AdminConfigPayloadNormalizer;
use Api\Admin\Config\Support\AdminConfigPresenter;
use Api\Support\Exception\ApiException;

final class AdminConfigService
{
    private ?AdminConfigPayloadGuard $resolvedPayloadGuard = null;
    private ?AdminConfigPayloadNormalizer $resolvedPayloadNormalizer = null;
    private ?AdminConfigPresenter $resolvedPresenter = null;

    public function __construct(private readonly AdminConfigRepository $repository)
    {
    }

    /**
     * @return array<string, mixed>
     */
    public function get(): array
    {
        $config = $this->repository->getConfig();
        return $this->presenter()->present($config);
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    public function update(array $payload): array
    {
        if ($payload === []) {
            throw ApiException::badRequest('수정할 데이터가 없습니다.');
        }

        $current = $this->repository->getConfig();
        $normalized = $this->payloadNormalizer()->normalize($payload);
        $this->payloadGuard()->applyLegacyDerivedMutations($normalized);
        $this->payloadGuard()->assertRequiredFields($normalized);
        $this->payloadGuard()->assertMergedState(array_replace($current, $normalized));
        $affected = $this->repository->updateConfig($normalized);
        if ($affected <= 0) {
            throw ApiException::badRequest('수정 가능한 필드가 없습니다.');
        }

        return $this->get();
    }

    private function payloadGuard(): AdminConfigPayloadGuard
    {
        return $this->resolvedPayloadGuard ??= new AdminConfigPayloadGuard();
    }

    private function payloadNormalizer(): AdminConfigPayloadNormalizer
    {
        return $this->resolvedPayloadNormalizer ??= new AdminConfigPayloadNormalizer($this->repository);
    }

    private function presenter(): AdminConfigPresenter
    {
        return $this->resolvedPresenter ??= new AdminConfigPresenter();
    }
}
