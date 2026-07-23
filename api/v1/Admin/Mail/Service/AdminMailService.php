<?php

declare(strict_types=1);

namespace Api\Admin\Mail\Service;

final class AdminMailService
{
    public function __construct(
        private readonly AdminMailQueryService $queryService,
        private readonly AdminMailDispatchService $dispatchService,
        private readonly AdminMailTemplateService $templateService
    ) {
    }

    /**
     * @param array<string,mixed> $member
     * @param array<string,mixed> $query
     * @return array{items:array<int,array<string,mixed>>,pagination:array<string,mixed>}
     */
    public function listAdmin(array $member, array $query): array
    {
        return $this->queryService->listAdmin($member, $query);
    }

    /**
     * @param array<string,mixed> $member
     */
    public function detailAdmin(array $member, int $mailId): array
    {
        return $this->templateService->detailAdmin($member, $mailId);
    }

    /**
     * @param array<string,mixed> $member
     */
    public function deleteAdmin(array $member, int $mailId): void
    {
        $this->queryService->deleteAdmin($member, $mailId);
    }

    /**
     * @param array<string,mixed> $member
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function createAdmin(array $member, array $payload, string $ipAddress): array
    {
        return $this->templateService->createAdmin($member, $payload, $ipAddress);
    }

    /**
     * @param array<string,mixed> $member
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function updateAdmin(array $member, int $mailId, array $payload, string $ipAddress): array
    {
        return $this->templateService->updateAdmin($member, $mailId, $payload, $ipAddress);
    }

    /**
     * @param array<string,mixed> $member
     * @param array<string,mixed> $query
     * @return array{items:array<int,array<string,mixed>>,pagination:array<string,mixed>}
     */
    public function recipients(array $member, array $query): array
    {
        return $this->queryService->recipients($member, $query);
    }

    /**
     * @param array<string,mixed> $member
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function sendTest(array $member, array $payload, string $ipAddress): array
    {
        return $this->dispatchService->sendTest($member, $payload, $ipAddress);
    }

    /**
     * @param array<string,mixed> $member
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function send(array $member, array $payload, string $ipAddress): array
    {
        return $this->dispatchService->send($member, $payload, $ipAddress);
    }
}
