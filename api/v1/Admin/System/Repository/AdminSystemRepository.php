<?php

/**
 * AdminSystemRepository API module.
 *
 * @package  Gnuboard5\Api\v1\Admin\System\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Admin\System\Repository;

class AdminSystemRepository
{
    private readonly AdminSystemAuthRepository $authRepository;
    private readonly AdminSystemPopupRepository $popupRepository;
    private readonly AdminSystemPollRepository $pollRepository;
    private readonly AdminSystemConfigRepository $configRepository;
    private readonly AdminSystemMailRepository $mailRepository;

    public function __construct(
        AdminSystemAuthRepository $authRepository,
        AdminSystemPopupRepository $popupRepository,
        AdminSystemPollRepository $pollRepository,
        AdminSystemConfigRepository $configRepository,
        AdminSystemMailRepository $mailRepository
    ) {
        $this->authRepository = $authRepository;
        $this->popupRepository = $popupRepository;
        $this->pollRepository = $pollRepository;
        $this->configRepository = $configRepository;
        $this->mailRepository = $mailRepository;
    }

    /**
     * @return array{total:int,items:array<int,array<string,mixed>>}
     */
    public function listAuth(int $page, int $perPage, ?string $memberId): array
    {
        return $this->authRepository->listAuth($page, $perPage, $memberId);
    }

    public function upsertAuth(string $memberId, string $menu, string $auth): void
    {
        $this->authRepository->upsertAuth($memberId, $menu, $auth);
    }

    public function deleteAuth(string $memberId, string $menu): int
    {
        return $this->authRepository->deleteAuth($memberId, $menu);
    }

    /**
     * @return array{total:int,items:array<int,array<string,mixed>>}
     */
    public function listPopups(int $page, int $perPage): array
    {
        return $this->popupRepository->listPopups($page, $perPage);
    }

    public function findPopup(int $popupId): ?array
    {
        return $this->popupRepository->findPopup($popupId);
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function createPopup(array $payload): int
    {
        return $this->popupRepository->createPopup($payload);
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function updatePopup(int $popupId, array $payload): int
    {
        return $this->popupRepository->updatePopup($popupId, $payload);
    }

    public function deletePopup(int $popupId): int
    {
        return $this->popupRepository->deletePopup($popupId);
    }

    /**
     * @return array{total:int,items:array<int,array<string,mixed>>}
     */
    public function listPolls(int $page, int $perPage): array
    {
        return $this->pollRepository->listPolls($page, $perPage);
    }

    public function findPoll(int $pollId): ?array
    {
        return $this->pollRepository->findPoll($pollId);
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function createPoll(array $payload): int
    {
        return $this->pollRepository->createPoll($payload);
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function updatePoll(int $pollId, array $payload): int
    {
        return $this->pollRepository->updatePoll($pollId, $payload);
    }

    public function deletePoll(int $pollId): int
    {
        return $this->pollRepository->deletePoll($pollId);
    }

    public function getQaConfig(): ?array
    {
        return $this->configRepository->getQaConfig();
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function updateQaConfig(array $payload): int
    {
        return $this->configRepository->updateQaConfig($payload);
    }

    /**
     * @return array<string, mixed>
     */
    public function getThemeConfig(): array
    {
        return $this->configRepository->getThemeConfig();
    }

    public function updateThemeConfig(string $theme, string $mobileTheme): int
    {
        return $this->configRepository->updateThemeConfig($theme, $mobileTheme);
    }

    /**
     * @return array{total:int,items:array<int,array<string,mixed>>}
     */
    public function listMailTemplates(int $page, int $perPage): array
    {
        return $this->mailRepository->listMailTemplates($page, $perPage);
    }

    /**
     * @return array{total:int,items:array<int,array<string,mixed>>}
     */
    public function listMailRecipients(int $page, int $perPage, ?string $search): array
    {
        return $this->mailRepository->listMailRecipients($page, $perPage, $search);
    }

    /**
     * @param array<int,string> $memberIds
     * @return array<int,array<string,mixed>>
     */
    public function findMailRecipientsByIds(array $memberIds, bool $maillingOnly): array
    {
        return $this->mailRepository->findMailRecipientsByIds($memberIds, $maillingOnly);
    }

    public function findMailTemplate(int $mailId): ?array
    {
        return $this->mailRepository->findMailTemplate($mailId);
    }

    public function createMailTestRecord(string $subject, string $content, string $ipAddress, array $meta = []): int
    {
        return $this->mailRepository->createMailTestRecord($subject, $content, $ipAddress, $meta);
    }
}
