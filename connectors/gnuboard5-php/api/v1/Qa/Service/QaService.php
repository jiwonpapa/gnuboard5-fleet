<?php

/**
 * QaService API 모듈 정의.
 *
 * @package  Gnuboard5\Api\v1\Qa\Service
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Qa\Service;

use Api\Qa\Contracts\QaGateway;
use Psr\Http\Message\UploadedFileInterface;

final class QaService
{
    private readonly QaReadService $readService;
    private readonly QaWriteService $writeService;
    private readonly QaMutationService $mutationService;

    public function __construct(
        QaGateway $qaGateway,
        QaReadService $readService,
        QaWriteService $writeService,
        QaMutationService $mutationService
    ) {
        self::touchDependencies($qaGateway);
        $this->readService = $readService;
        $this->writeService = $writeService;
        $this->mutationService = $mutationService;
    }

    /**
     * @param array<string, mixed> $member
     * @param array<string, mixed> $query
     * @return array<string, mixed>
     */
    public function list(array $member, array $query): array
    {
        return $this->readService->list($member, $query);
    }

    /**
     * @param array<string, mixed> $member
     * @return array<string, mixed>
     */
    public function detail(array $member, int $qaId): array
    {
        return $this->readService->detail($member, $qaId);
    }

    /**
     * @param array<string, mixed> $member
     * @param array<string, mixed> $payload
     * @param array<int|string, UploadedFileInterface> $uploadedFiles
     * @return array<string, mixed>
     */
    public function createQuestion(array $member, array $payload, array $uploadedFiles, string $ip): array
    {
        return $this->writeService->createQuestion($member, $payload, $uploadedFiles, $ip);
    }

    /**
     * @param array<string, mixed> $member
     * @param array<string, mixed> $payload
     * @param array<int|string, UploadedFileInterface> $uploadedFiles
     * @return array<string, mixed>
     */
    public function createAnswer(
        int $parentQaId,
        array $member,
        array $payload,
        array $uploadedFiles,
        string $ip
    ): array {
        return $this->writeService->createAnswer($parentQaId, $member, $payload, $uploadedFiles, $ip);
    }

    /**
     * @param array<string, mixed> $member
     * @param array<string, mixed> $payload
     * @param array<int|string, UploadedFileInterface> $uploadedFiles
     * @return array<string, mixed>
     */
    public function createRelatedQuestion(
        int $qaId,
        array $member,
        array $payload,
        array $uploadedFiles,
        string $ip
    ): array {
        return $this->writeService->createRelatedQuestion($qaId, $member, $payload, $uploadedFiles, $ip);
    }

    /**
     * @param array<string, mixed> $member
     * @param array<string, mixed> $payload
     * @param array<int|string, UploadedFileInterface> $uploadedFiles
     * @return array<string, mixed>
     */
    public function updateQuestion(
        int $qaId,
        array $member,
        array $payload,
        array $uploadedFiles,
        string $ip
    ): array {
        return $this->mutationService->updateQuestion($qaId, $member, $payload, $uploadedFiles, $ip);
    }

    /**
     * @param array<string, mixed> $member
     */
    public function deleteQuestion(int $qaId, array $member): void
    {
        $this->mutationService->deleteQuestion($qaId, $member);
    }

    /**
     * @param array<string, mixed> $member
     * @param array<int, mixed> $qaIds
     * @return array<string, mixed>
     */
    public function bulkDelete(array $member, array $qaIds): array
    {
        return $this->mutationService->bulkDelete($member, $qaIds);
    }

    /**
     * @param array<string, mixed> $member
     * @return array<string, mixed>
     */
    public function getDownloadPayload(int $qaId, int $fileNo, array $member): array
    {
        return $this->readService->getDownloadPayload($qaId, $fileNo, $member);
    }

    private static function touchDependencies(mixed ...$dependencies): void
    {
    }
}
