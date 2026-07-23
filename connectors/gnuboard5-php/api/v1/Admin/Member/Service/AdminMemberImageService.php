<?php

declare(strict_types=1);

namespace Api\Admin\Member\Service;

use Api\Admin\Member\Repository\AdminMemberRepository;
use Api\Member\Service\MemberImageManager;
use Api\Support\Exception\ApiException;
use Api\Support\Validation\ValidationPatterns;
use Psr\Http\Message\UploadedFileInterface;

final class AdminMemberImageService
{
    public function __construct(
        private readonly AdminMemberRepository $repository,
        private readonly MemberImageManager $memberImageManager
    ) {
    }

    public function uploadIcon(string $memberId, ?UploadedFileInterface $uploadedFile): array
    {
        $normalized = $this->normalizeMemberId($memberId);
        $this->requireMember($normalized);

        $config = $this->repository->getMemberImageConfig();
        $enabled = (int)($config['cf_use_member_icon'] ?? 0) === 1;
        if (!$enabled) {
            throw ApiException::forbidden('회원 아이콘 업로드가 비활성화되어 있습니다.');
        }

        return $this->memberImageManager->upload(
            $normalized,
            $uploadedFile,
            'member',
            max(0, (int)($config['cf_member_icon_size'] ?? 0)),
            max(0, (int)($config['cf_member_icon_width'] ?? 0)),
            max(0, (int)($config['cf_member_icon_height'] ?? 0))
        );
    }

    public function deleteIcon(string $memberId): array
    {
        $normalized = $this->normalizeMemberId($memberId);
        $this->requireMember($normalized);

        return $this->memberImageManager->delete($normalized, 'member');
    }

    public function uploadImage(string $memberId, ?UploadedFileInterface $uploadedFile): array
    {
        $normalized = $this->normalizeMemberId($memberId);
        $this->requireMember($normalized);

        $config = $this->repository->getMemberImageConfig();
        $maxSize = max(0, (int)($config['cf_member_img_size'] ?? 0));
        $maxWidth = max(0, (int)($config['cf_member_img_width'] ?? 0));
        $maxHeight = max(0, (int)($config['cf_member_img_height'] ?? 0));
        if ($maxSize <= 0 || $maxWidth <= 0 || $maxHeight <= 0) {
            throw ApiException::forbidden('회원 프로필 이미지 업로드가 비활성화되어 있습니다.');
        }

        return $this->memberImageManager->upload(
            $normalized,
            $uploadedFile,
            'member_image',
            $maxSize,
            $maxWidth,
            $maxHeight
        );
    }

    public function deleteImage(string $memberId): array
    {
        $normalized = $this->normalizeMemberId($memberId);
        $this->requireMember($normalized);

        return $this->memberImageManager->delete($normalized, 'member_image');
    }

    private function normalizeMemberId(string $memberId): string
    {
        $value = trim($memberId);
        if ($value === '' || preg_match(ValidationPatterns::MEMBER_ID, $value) !== 1) {
            throw ApiException::badRequest('mb_id 형식이 올바르지 않습니다.');
        }

        return $value;
    }

    private function requireMember(string $memberId): void
    {
        if (!is_array($this->repository->find($memberId))) {
            throw ApiException::notFound('회원을 찾을 수 없습니다.');
        }
    }
}
