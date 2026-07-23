<?php

/**
 * AdminMenuService API module.
 *
 * @package  Gnuboard5\Api\v1\Admin\Menu\Service
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Admin\Menu\Service;

use Api\Admin\Menu\Repository\AdminMenuRepository;
use Api\Admin\Menu\Service\Support\AdminMenuPayloadNormalizer;
use Api\Admin\Menu\Service\Support\AdminMenuPresenter;
use Api\Support\Exception\ApiException;

final class AdminMenuService
{
    public function __construct(private readonly AdminMenuRepository $repository)
    {
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function list(): array
    {
        return array_map(
            static fn (array $menu): array => AdminMenuPresenter::menu($menu),
            $this->repository->list()
        );
    }

    public function detail(int $menuId): array
    {
        $this->assertMenuId($menuId);
        $menu = $this->repository->find($menuId);
        if ($menu === null) {
            throw ApiException::notFound('메뉴를 찾을 수 없습니다.');
        }

        return AdminMenuPresenter::menu($menu);
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function create(array $payload): array
    {
        $payload = $this->payloadNormalizer()->create($payload);

        $menuId = $this->repository->create($payload);
        $created = $this->repository->find($menuId);
        if ($created === null) {
            throw ApiException::serverError('메뉴 생성 후 조회에 실패했습니다.');
        }

        return AdminMenuPresenter::menu($created);
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function update(int $menuId, array $payload): array
    {
        $this->assertMenuId($menuId);
        $existing = $this->repository->find($menuId);
        if (!is_array($existing)) {
            throw ApiException::notFound('메뉴를 찾을 수 없습니다.');
        }

        $payload = $this->payloadNormalizer()->update($payload);
        $affected = $this->repository->update($menuId, $payload);
        if ($affected <= 0) {
            throw ApiException::badRequest('수정할 필드가 없습니다.');
        }

        $updated = $this->repository->find($menuId);

        return AdminMenuPresenter::menu(is_array($updated) ? $updated : $existing);
    }

    public function delete(int $menuId): void
    {
        $this->assertMenuId($menuId);
        if ($this->repository->delete($menuId) <= 0) {
            throw ApiException::notFound('메뉴를 찾을 수 없습니다.');
        }
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function reorder(array $payload): array
    {
        $this->repository->reorder($this->payloadNormalizer()->reorder($payload));

        return ['result' => 'ok'];
    }

    private function payloadNormalizer(): AdminMenuPayloadNormalizer
    {
        return new AdminMenuPayloadNormalizer();
    }

    private function assertMenuId(int $menuId): void
    {
        if ($menuId <= 0) {
            throw ApiException::badRequest('me_id는 양수여야 합니다.');
        }
    }
}
