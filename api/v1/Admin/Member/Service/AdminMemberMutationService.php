<?php

declare(strict_types=1);

namespace Api\Admin\Member\Service;

use Api\Admin\Member\Repository\AdminMemberRepository;
use Api\Admin\Member\Service\Support\AdminMemberMutationAccessPolicy;
use Api\Admin\Member\Service\Support\AdminMemberPayloadNormalizer;
use Api\Admin\Member\Service\Support\AdminMemberPresenter;
use Api\Support\Exception\ApiException;
use Api\Support\Validation\ValidationPatterns;
use Psr\Http\Message\UploadedFileInterface;

final class AdminMemberMutationService
{
    private ?AdminMemberMutationAccessPolicy $resolvedAccessPolicy = null;

    private ?AdminMemberPayloadNormalizer $resolvedPayloadNormalizer = null;

    public function __construct(
        private readonly AdminMemberRepository $repository,
        private readonly AdminMemberImageService $imageService
    ) {
    }

    /**
     * @param array<string, mixed> $payload
     * @param array<string, mixed> $actor
     */
    public function update(string $memberId, array $payload, array $actor = []): array
    {
        $normalized = $this->normalizeMemberId($memberId);
        $existing = $this->requireMember($normalized);

        if ($payload === []) {
            throw ApiException::badRequest('수정할 데이터가 없습니다.');
        }

        $this->accessPolicy()->assertUpdateAllowed($actor, $normalized, $existing, $payload);

        if (array_key_exists('mb_level', $payload)) {
            $payload['mb_level'] = $this->normalizeLevel((int)$payload['mb_level']);
            $this->accessPolicy()->assertLevelChangeAllowed($actor, $normalized, $existing, (int)$payload['mb_level']);
        }

        $payload = $this->payloadNormalizer()->normalizeLegacyMemberPayload($payload);
        $payload = $this->payloadNormalizer()->applyConsentAuditFields($payload, $existing);

        $affected = $this->repository->update($normalized, $payload);
        if ($affected <= 0) {
            throw ApiException::badRequest('수정 가능한 필드가 없습니다.');
        }

        return AdminMemberPresenter::member($this->repository->find($normalized) ?? $existing);
    }

    /**
     * @param array<string, mixed> $actor
     */
    public function updateLevel(string $memberId, int $level, array $actor = []): array
    {
        $normalized = $this->normalizeMemberId($memberId);
        $existing = $this->requireMember($normalized);
        $normalizedLevel = $this->normalizeLevel($level);

        $this->accessPolicy()->assertLevelChangeAllowed($actor, $normalized, $existing, $normalizedLevel);
        $this->repository->updateLevel($normalized, $normalizedLevel);

        return AdminMemberPresenter::member($this->repository->find($normalized) ?? $existing);
    }

    /**
     * @param array<string, mixed> $actor
     */
    public function delete(string $memberId, array $actor = []): void
    {
        $normalized = $this->normalizeMemberId($memberId);
        $existing = $this->requireMember($normalized);
        $this->accessPolicy()->assertDeleteAllowed($actor, $normalized, $existing);

        if ($this->repository->softDelete($normalized) <= 0) {
            throw ApiException::notFound('회원을 찾을 수 없습니다.');
        }
    }

    public function uploadIcon(string $memberId, ?UploadedFileInterface $uploadedFile): array
    {
        return $this->imageService->uploadIcon($memberId, $uploadedFile);
    }

    public function deleteIcon(string $memberId): array
    {
        return $this->imageService->deleteIcon($memberId);
    }

    public function uploadImage(string $memberId, ?UploadedFileInterface $uploadedFile): array
    {
        return $this->imageService->uploadImage($memberId, $uploadedFile);
    }

    public function deleteImage(string $memberId): array
    {
        return $this->imageService->deleteImage($memberId);
    }

    /**
     * @return array<string, mixed>
     */
    private function requireMember(string $memberId): array
    {
        $member = $this->repository->find($memberId);
        if (!is_array($member)) {
            throw ApiException::notFound('회원을 찾을 수 없습니다.');
        }

        return $member;
    }

    private function normalizeMemberId(string $memberId): string
    {
        $value = trim($memberId);
        if ($value === '' || preg_match(ValidationPatterns::MEMBER_ID, $value) !== 1) {
            throw ApiException::badRequest('mb_id 형식이 올바르지 않습니다.');
        }

        return $value;
    }

    private function normalizeLevel(int $level): int
    {
        if ($level < 1 || $level > 10) {
            throw ApiException::badRequest('mb_level은 1~10 범위여야 합니다.');
        }

        return $level;
    }

    private function accessPolicy(): AdminMemberMutationAccessPolicy
    {
        return $this->resolvedAccessPolicy ??= new AdminMemberMutationAccessPolicy();
    }

    private function payloadNormalizer(): AdminMemberPayloadNormalizer
    {
        return $this->resolvedPayloadNormalizer ??= new AdminMemberPayloadNormalizer();
    }
}
