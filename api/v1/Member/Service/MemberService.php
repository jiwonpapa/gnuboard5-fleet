<?php

/**
 * MemberService API 모듈 정의.
 *
 * @package  Gnuboard5\Api\v1\Member\Service
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Member\Service;

use Api\Core\Enum\MemberLevel;
use Api\Integration\Contracts\AuthIdentityGateway;
use Api\Integration\Contracts\MemberGateway;
use Api\Support\Exception\ApiException;
use Psr\Http\Message\UploadedFileInterface;

final class MemberService
{
    private readonly MemberProfilePresenter $profilePresenter;
    private readonly MemberProfileUpdateService $profileUpdateService;
    private readonly MemberMediaService $mediaService;

    public function __construct(
        private readonly MemberGateway $memberRepository,
        AuthIdentityGateway $authGateway,
        MemberProfilePresenter $profilePresenter,
        MemberProfileUpdateService $profileUpdateService,
        MemberMediaService $mediaService
    ) {
        self::touchDependencies($authGateway);
        $this->profilePresenter = $profilePresenter;
        $this->profileUpdateService = $profileUpdateService;
        $this->mediaService = $mediaService;
    }

    /**
     * @param array<string, mixed> $member
     * @return array<string, mixed>
     */
    public function getMyProfile(array $member): array
    {
        $memberId = $this->requireAuthenticatedMemberId($member);
        $memberRow = $this->memberRepository->findById($memberId);
        if ($memberRow === null) {
            throw ApiException::notFound('회원을 찾을 수 없습니다.');
        }

        return $this->profilePresenter->toMyProfile($memberRow);
    }

    /**
     * @param array<string, mixed> $member
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    public function updateMyProfile(array $member, array $payload): array
    {
        return $this->profileUpdateService->updateMyProfile($member, $payload);
    }

    /**
     * @param array<string, mixed> $viewer
     * @return array<string, mixed>
     */
    public function getPublicProfile(string $mbId, array $viewer): array
    {
        $targetId = trim($mbId);
        if ($targetId === '') {
            throw ApiException::badRequest('mb_id는 필수입니다.');
        }

        $member = $this->memberRepository->findById($targetId);
        if ($member === null) {
            throw ApiException::notFound('회원을 찾을 수 없습니다.');
        }

        $viewerId = trim((string)($viewer['mb_id'] ?? ''));
        $isAdminViewer = MemberLevel::fromNumeric((int)($viewer['mb_level'] ?? 0))->isAdmin();
        $isOwnerViewer = $viewerId !== '' && strcasecmp($viewerId, $targetId) === 0;
        if ((int)($member['mb_open'] ?? 0) !== 1 && !$isAdminViewer && !$isOwnerViewer) {
            throw ApiException::forbidden('정보공개를 하지 않은 회원입니다.');
        }

        return $this->profilePresenter->toPublicProfile($member, $isAdminViewer);
    }

    /**
     * @param array<string, mixed> $member
     * @return array<string, mixed>
     */
    public function withdraw(array $member, string $password): array
    {
        $memberId = $this->requireAuthenticatedMemberId($member);
        $password = trim($password);
        if ($password === '') {
            throw ApiException::badRequest('mb_password는 필수입니다.');
        }

        $memberRow = $this->memberRepository->findById($memberId);
        if ($memberRow === null) {
            throw ApiException::notFound('회원을 찾을 수 없습니다.');
        }

        if (MemberLevel::fromNumeric((int)($memberRow['mb_level'] ?? 0))->isAdmin()) {
            throw ApiException::forbidden('관리자 계정은 API에서 탈퇴할 수 없습니다.');
        }

        if (!$this->memberRepository->verifyPassword($memberRow, $password)) {
            throw ApiException::unauthorized('비밀번호가 일치하지 않습니다.');
        }

        $leaveDate = date('Ymd');
        $memo = $leaveDate . ' API 탈퇴함' . "\n" . trim((string)($memberRow['mb_memo'] ?? ''));
        $this->memberRepository->withdraw($memberId, $leaveDate, $memo);

        return [
            'mb_id' => $memberId,
            'withdrawn' => true,
            'leave_date' => $leaveDate,
        ];
    }

    /**
     * @param array<string, mixed> $member
     * @return array<string, mixed>
     */
    public function uploadMyIcon(array $member, ?UploadedFileInterface $uploadedFile): array
    {
        return $this->mediaService->uploadMyIcon($member, $uploadedFile);
    }

    /**
     * @param array<string, mixed> $member
     * @return array<string, mixed>
     */
    public function deleteMyIcon(array $member): array
    {
        return $this->mediaService->deleteMyIcon($member);
    }

    /**
     * @param array<string, mixed> $member
     * @return array<string, mixed>
     */
    public function uploadMyImage(array $member, ?UploadedFileInterface $uploadedFile): array
    {
        return $this->mediaService->uploadMyImage($member, $uploadedFile);
    }

    /**
     * @param array<string, mixed> $member
     * @return array<string, mixed>
     */
    public function deleteMyImage(array $member): array
    {
        return $this->mediaService->deleteMyImage($member);
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

    private static function touchDependencies(mixed ...$dependencies): void
    {
    }
}
