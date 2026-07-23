<?php

/**
 * FileRepository API module.
 *
 * @package  Gnuboard5\Api\v1\File\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\File\Repository;

use Api\File\Contracts\FileGateway;
use Api\Integration\Contracts\FileGateway as LegacyFileGateway;

final class FileRepository implements FileGateway, LegacyFileGateway
{
    private readonly FileRecordRepository $recordRepository;
    private readonly FilePointRepository $pointRepository;

    public function __construct(
        FileRecordRepository $recordRepository,
        FilePointRepository $pointRepository
    ) {
        $this->recordRepository = $recordRepository;
        $this->pointRepository = $pointRepository;
    }

    public function countFiles(string $boTable, int $wrId): int
    {
        return $this->recordRepository->countFiles($boTable, $wrId);
    }

    public function getNextBfNo(string $boTable, int $wrId): int
    {
        return $this->recordRepository->getNextBfNo($boTable, $wrId);
    }

    public function sanitizeUploadedFileName(string $filename): string
    {
        $baseName = basename(trim($filename));
        $baseName = preg_replace('/[\x00-\x1F\x7F]+/u', '', $baseName);
        $baseName = preg_replace('#[\\\\/]+#', '_', (string)$baseName);
        $baseName = preg_replace('/\s+/', ' ', (string)$baseName);

        return trim((string)$baseName);
    }

    public function generateStoredFileName(string $filename): string
    {
        $safeName = $this->sanitizeUploadedFileName($filename);
        $ext = strtolower((string)pathinfo($safeName, PATHINFO_EXTENSION));
        $seed = bin2hex(random_bytes(8));

        return $ext === '' ? $seed : $seed . '.' . $ext;
    }

    public function createFileRecord(
        string $boTable,
        int $wrId,
        int $bfNo,
        string $source,
        string $file,
        int $filesize,
        int $width,
        int $height,
        int $type,
        string $mime,
        string $datetime
    ): array {
        return $this->recordRepository->createFileRecord(
            $boTable,
            $wrId,
            $bfNo,
            $source,
            $file,
            $filesize,
            $width,
            $height,
            $type,
            $mime,
            $datetime
        )->jsonSerialize();
    }

    public function getFile(string $boTable, int $wrId, int $bfNo): ?array
    {
        $file = $this->recordRepository->getFile($boTable, $wrId, $bfNo);

        return $file?->jsonSerialize();
    }

    public function listFiles(string $boTable, int $wrId): array
    {
        return array_map(
            static fn (\Api\Core\DTO\FileDTO $file): array => $file->jsonSerialize(),
            $this->recordRepository->listFiles($boTable, $wrId)
        );
    }

    public function deleteFileRecord(string $boTable, int $wrId, int $bfNo): int
    {
        return $this->recordRepository->deleteFileRecord($boTable, $wrId, $bfNo);
    }

    public function incrementDownloadCount(string $boTable, int $wrId, int $bfNo): void
    {
        $this->recordRepository->incrementDownloadCount($boTable, $wrId, $bfNo);
    }

    public function updateWriteFileCount(string $boTable, int $wrId): void
    {
        $this->recordRepository->updateWriteFileCount($boTable, $wrId);
    }

    public function applyDownloadPoint(string $memberId, string $boTable, int $wrId, int $bfNo, int $point, string $content): void
    {
        $this->pointRepository->applyDownloadPoint($memberId, $boTable, $wrId, $bfNo, $point, $content);
    }
}
