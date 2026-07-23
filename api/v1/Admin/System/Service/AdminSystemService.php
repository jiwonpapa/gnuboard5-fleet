<?php

/**
 * AdminSystemService API module.
 *
 * @package  Gnuboard5\Api\v1\Admin\System\Service
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Admin\System\Service;

final class AdminSystemService
{
    public function __construct(
        private readonly AdminSystemAuthService $authService,
        private readonly AdminSystemPopupService $popupService,
        private readonly AdminSystemPollService $pollService,
        private readonly AdminSystemConfigService $configService,
        private readonly AdminSystemMailDispatchService $mailDispatchService,
        private readonly AdminSystemThemeService $themeService,
        private readonly AdminSystemMaintenanceService $maintenanceService
    ) {
    }

    /**
     * @param array<string, mixed> $query
     * @return array{items:array<int,array<string,mixed>>,pagination:array<string,mixed>}
     */
    public function listAuth(array $query): array
    {
        return $this->authService->listAuth($query);
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function saveAuth(array $payload): array
    {
        return $this->authService->saveAuth($payload);
    }

    public function deleteAuth(string $memberId, string $menu): void
    {
        $this->authService->deleteAuth($memberId, $menu);
    }

    /**
     * @param array<string, mixed> $query
     * @return array{items:array<int,array<string,mixed>>,pagination:array<string,mixed>}
     */
    public function listPopups(array $query): array
    {
        return $this->popupService->listPopups($query);
    }

    public function detailPopup(int $popupId): array
    {
        return $this->popupService->detailPopup($popupId);
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function createPopup(array $payload): array
    {
        return $this->popupService->createPopup($payload);
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function updatePopup(int $popupId, array $payload): array
    {
        return $this->popupService->updatePopup($popupId, $payload);
    }

    public function deletePopup(int $popupId): void
    {
        $this->popupService->deletePopup($popupId);
    }

    /**
     * @param array<string, mixed> $query
     * @return array{items:array<int,array<string,mixed>>,pagination:array<string,mixed>}
     */
    public function listPolls(array $query): array
    {
        return $this->pollService->listPolls($query);
    }

    public function detailPoll(int $pollId): array
    {
        return $this->pollService->detailPoll($pollId);
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function createPoll(array $payload): array
    {
        return $this->pollService->createPoll($payload);
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function updatePoll(int $pollId, array $payload): array
    {
        return $this->pollService->updatePoll($pollId, $payload);
    }

    public function deletePoll(int $pollId): void
    {
        $this->pollService->deletePoll($pollId);
    }

    public function getQaConfig(): array
    {
        return $this->configService->getQaConfig();
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function updateQaConfig(array $payload): array
    {
        return $this->configService->updateQaConfig($payload);
    }

    public function getTheme(array $member): array
    {
        return $this->themeService->getTheme($member);
    }

    /**
     * @param array<string, mixed> $member
     * @param array<string, mixed> $payload
     */
    public function updateTheme(array $member, array $payload): array
    {
        return $this->themeService->updateTheme($member, $payload);
    }

    /**
     * @param array<string, mixed> $member
     * @return array{items:array<int,array<string,mixed>>,total:int}
     */
    public function listThemes(array $member): array
    {
        return $this->themeService->listThemes($member);
    }

    /**
     * @param array<string, mixed> $member
     */
    public function detailTheme(array $member, string $themeId): array
    {
        return $this->themeService->detailTheme($member, $themeId);
    }

    /**
     * @param array<string, mixed> $query
     * @return array{items:array<int,array<string,mixed>>,pagination:array<string,mixed>}
     */
    public function listMails(array $query): array
    {
        return $this->configService->listMails($query);
    }

    /**
     * @param array<string, mixed> $query
     * @return array{items:array<int,array<string,mixed>>,pagination:array<string,mixed>}
     */
    public function listMailRecipients(array $query): array
    {
        return $this->configService->listMailRecipients($query);
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function sendMailTest(array $payload, string $ipAddress): array
    {
        return $this->mailDispatchService->sendMailTest($payload, $ipAddress);
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function sendMemberMail(array $payload, string $ipAddress): array
    {
        return $this->mailDispatchService->sendMemberMail($payload, $ipAddress);
    }

    /**
     * @param array<string, mixed> $member
     */
    public function phpInfo(array $member): array
    {
        return $this->maintenanceService->phpInfo($member);
    }

    /**
     * @param array<string, mixed> $member
     */
    public function purgeSessionFiles(array $member): array
    {
        return $this->maintenanceService->purgeSessionFiles($member);
    }

    /**
     * @param array<string, mixed> $member
     */
    public function purgeCacheFiles(array $member): array
    {
        return $this->maintenanceService->purgeCacheFiles($member);
    }

    /**
     * @param array<string, mixed> $member
     */
    public function purgeCaptchaFiles(array $member): array
    {
        return $this->maintenanceService->purgeCaptchaFiles($member);
    }

    /**
     * @param array<string, mixed> $member
     */
    public function purgeThumbnailFiles(array $member): array
    {
        return $this->maintenanceService->purgeThumbnailFiles($member);
    }

    /**
     * @param array<string, mixed> $member
     */
    public function purgeMemberListFiles(array $member): array
    {
        return $this->maintenanceService->purgeMemberListFiles($member);
    }

    /**
     * @param array<string, mixed> $member
     */
    public function browscapStatus(array $member): array
    {
        return $this->maintenanceService->browscapStatus($member);
    }

    /**
     * @param array<string, mixed> $member
     */
    public function updateBrowscap(array $member): array
    {
        return $this->maintenanceService->updateBrowscap($member);
    }

    /**
     * @param array<string, mixed> $member
     * @param array<string, mixed> $payload
     */
    public function convertBrowscap(array $member, array $payload): array
    {
        return $this->maintenanceService->convertBrowscap($member, $payload);
    }
}
