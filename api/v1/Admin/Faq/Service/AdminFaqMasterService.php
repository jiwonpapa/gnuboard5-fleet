<?php

declare(strict_types=1);

namespace Api\Admin\Faq\Service;

use Api\Admin\Faq\Repository\AdminFaqMasterRepository;
use Api\Admin\Faq\Service\Support\AdminFaqMasterImageManager;
use Api\Admin\Faq\Service\Support\AdminFaqMasterPayloadNormalizer;
use Api\Admin\Faq\Service\Support\AdminFaqMasterPresenter;
use Api\Core\Config\EnvConfig;
use Api\Support\Exception\ApiException;
use Psr\Http\Message\UploadedFileInterface;

final class AdminFaqMasterService
{
    private EnvConfig $envConfig;
    private ?AdminFaqMasterImageManager $resolvedImageManager = null;
    private ?AdminFaqMasterPayloadNormalizer $resolvedPayloadNormalizer = null;
    private ?AdminFaqMasterPresenter $resolvedPresenter = null;

    public function __construct(
        private readonly AdminFaqMasterRepository $repository,
        ?EnvConfig $envConfig = null
    ) {
        $this->envConfig = $envConfig ?? EnvConfig::fromEnv();
    }

    /**
     * @param array<string,mixed> $query
     * @return array{items:array<int,array<string,mixed>>,pagination:array<string,mixed>}
     */
    public function list(array $query): array
    {
        $page = max(1, (int)($query['page'] ?? 1));
        $perPage = min(100, max(1, (int)($query['per_page'] ?? 20)));
        $result = $this->repository->list($page, $perPage);
        $total = (int)($result['total'] ?? 0);

        $items = array_map(
            fn (array $item): array => $this->presenter()->summary($item),
            $result['items']
        );

        return [
            'items' => $items,
            'pagination' => $this->presenter()->pagination($page, $perPage, $total),
        ];
    }

    public function detail(int $masterId): array
    {
        $normalizedId = $this->payloadNormalizer()->masterId($masterId);
        $master = $this->repository->find($normalizedId);
        if (!is_array($master)) {
            throw ApiException::notFound('FAQ 마스터를 찾을 수 없습니다.');
        }

        return $this->presenter()->detail($master);
    }

    /**
     * @param array<string,mixed> $payload
     */
    public function create(array $payload): array
    {
        $masterId = $this->repository->create($this->payloadNormalizer()->create($payload));

        return $this->detail($masterId);
    }

    /**
     * @param array<string,mixed> $payload
     */
    public function update(int $masterId, array $payload): array
    {
        $normalizedId = $this->payloadNormalizer()->masterId($masterId);
        if (!is_array($this->repository->find($normalizedId))) {
            throw ApiException::notFound('FAQ 마스터를 찾을 수 없습니다.');
        }

        if ($this->repository->update($normalizedId, $this->payloadNormalizer()->update($payload)) <= 0) {
            throw ApiException::badRequest('수정할 필드가 없습니다.');
        }

        return $this->detail($normalizedId);
    }

    public function delete(int $masterId): void
    {
        $normalizedId = $this->payloadNormalizer()->masterId($masterId);
        if (!is_array($this->repository->find($normalizedId))) {
            throw ApiException::notFound('FAQ 마스터를 찾을 수 없습니다.');
        }

        $this->imageManager()->deleteArtifact($normalizedId, 'h');
        $this->imageManager()->deleteArtifact($normalizedId, 't');
        $this->repository->deleteItemsByMaster($normalizedId);

        if ($this->repository->delete($normalizedId) <= 0) {
            throw ApiException::notFound('FAQ 마스터를 찾을 수 없습니다.');
        }
    }

    public function uploadHeaderImage(int $masterId, ?UploadedFileInterface $uploadedFile): array
    {
        return $this->uploadImage($masterId, $uploadedFile, 'h');
    }

    public function deleteHeaderImage(int $masterId): array
    {
        return $this->deleteImage($masterId, 'h');
    }

    public function uploadFooterImage(int $masterId, ?UploadedFileInterface $uploadedFile): array
    {
        return $this->uploadImage($masterId, $uploadedFile, 't');
    }

    public function deleteFooterImage(int $masterId): array
    {
        return $this->deleteImage($masterId, 't');
    }

    private function uploadImage(int $masterId, ?UploadedFileInterface $uploadedFile, string $suffix): array
    {
        $normalizedId = $this->payloadNormalizer()->masterId($masterId);
        if (!is_array($this->repository->find($normalizedId))) {
            throw ApiException::notFound('FAQ 마스터를 찾을 수 없습니다.');
        }

        return $this->imageManager()->upload($normalizedId, $uploadedFile, $suffix);
    }

    private function deleteImage(int $masterId, string $suffix): array
    {
        $normalizedId = $this->payloadNormalizer()->masterId($masterId);
        if (!is_array($this->repository->find($normalizedId))) {
            throw ApiException::notFound('FAQ 마스터를 찾을 수 없습니다.');
        }

        return $this->imageManager()->delete($normalizedId, $suffix);
    }

    private function imageManager(): AdminFaqMasterImageManager
    {
        return $this->resolvedImageManager ??= new AdminFaqMasterImageManager($this->envConfig);
    }

    private function payloadNormalizer(): AdminFaqMasterPayloadNormalizer
    {
        return $this->resolvedPayloadNormalizer ??= new AdminFaqMasterPayloadNormalizer();
    }

    private function presenter(): AdminFaqMasterPresenter
    {
        return $this->resolvedPresenter ??= new AdminFaqMasterPresenter($this->imageManager());
    }
}
