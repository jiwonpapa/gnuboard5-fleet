<?php

/**
 * MemberMediaService API module.
 *
 * @package  Gnuboard5\Api\v1\Member\Service
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Member\Service;

use Api\Integration\Contracts\MemberGateway;
use Api\Support\Exception\ApiException;
use Psr\Http\Message\UploadedFileInterface;

final class MemberMediaService
{
    public function __construct(
        private readonly MemberGateway $memberRepository,
        private readonly MemberImageManager $memberImageManager
    ) {
    }

    /**
     * @param array<string, mixed> $member
     * @return array<string, mixed>
     */
    public function uploadMyIcon(array $member, ?UploadedFileInterface $uploadedFile): array
    {
        $memberId = $this->requireAuthenticatedMemberId($member);
        $this->assertMemberExists($memberId);

        $config = $this->memberRepository->getMemberImageConfig();
        $enabled = (int)($config['cf_use_member_icon'] ?? 0) === 1;
        if (!$enabled) {
            throw ApiException::forbidden('회원 아이콘 업로드가 비활성화되어 있습니다.');
        }

        return $this->imageManager()->upload(
            $memberId,
            $uploadedFile,
            'member',
            max(0, (int)($config['cf_member_icon_size'] ?? 0)),
            max(0, (int)($config['cf_member_icon_width'] ?? 0)),
            max(0, (int)($config['cf_member_icon_height'] ?? 0))
        );
    }

    /**
     * @param array<string, mixed> $member
     * @return array<string, mixed>
     */
    public function deleteMyIcon(array $member): array
    {
        $memberId = $this->requireAuthenticatedMemberId($member);
        $this->assertMemberExists($memberId);

        return $this->imageManager()->delete($memberId, 'member');
    }

    /**
     * @param array<string, mixed> $member
     * @return array<string, mixed>
     */
    public function uploadMyImage(array $member, ?UploadedFileInterface $uploadedFile): array
    {
        $memberId = $this->requireAuthenticatedMemberId($member);
        $this->assertMemberExists($memberId);

        $config = $this->memberRepository->getMemberImageConfig();
        $maxSize = max(0, (int)($config['cf_member_img_size'] ?? 0));
        $maxWidth = max(0, (int)($config['cf_member_img_width'] ?? 0));
        $maxHeight = max(0, (int)($config['cf_member_img_height'] ?? 0));
        if ($maxSize <= 0 || $maxWidth <= 0 || $maxHeight <= 0) {
            throw ApiException::forbidden('회원 프로필 이미지 업로드가 비활성화되어 있습니다.');
        }

        return $this->imageManager()->upload(
            $memberId,
            $uploadedFile,
            'member_image',
            $maxSize,
            $maxWidth,
            $maxHeight
        );
    }

    /**
     * @param array<string, mixed> $member
     * @return array<string, mixed>
     */
    public function deleteMyImage(array $member): array
    {
        $memberId = $this->requireAuthenticatedMemberId($member);
        $this->assertMemberExists($memberId);

        return $this->imageManager()->delete($memberId, 'member_image');
    }

    /**
     * @param array<string, mixed> $member
     */
    private function requireAuthenticatedMemberId(array $member): string
    {
        $memberId = trim((string)($member['mb_id'] ?? ''));
        if ($memberId === '') {
            throw ApiException::unauthorized('인증 토큰이 필요합니다.');
        }

        return $memberId;
    }

    private function assertMemberExists(string $memberId): void
    {
        if ($this->memberRepository->findById($memberId) === null) {
            throw ApiException::notFound('회원을 찾을 수 없습니다.');
        }
    }

    private function imageManager(): MemberImageManager
    {
        return $this->memberImageManager;
    }
}
