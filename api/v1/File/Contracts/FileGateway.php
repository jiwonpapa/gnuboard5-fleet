<?php

declare(strict_types=1);

namespace Api\File\Contracts;

interface FileGateway
{
    public function countFiles(string $boTable, int $wrId): int;
    public function getNextBfNo(string $boTable, int $wrId): int;
    public function sanitizeUploadedFileName(string $filename): string;
    public function generateStoredFileName(string $filename): string;
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
    ): array;
    public function getFile(string $boTable, int $wrId, int $bfNo): ?array;
    public function listFiles(string $boTable, int $wrId): array;
    public function deleteFileRecord(string $boTable, int $wrId, int $bfNo): int;
    public function incrementDownloadCount(string $boTable, int $wrId, int $bfNo): void;
    public function updateWriteFileCount(string $boTable, int $wrId): void;
    public function applyDownloadPoint(string $memberId, string $boTable, int $wrId, int $bfNo, int $point, string $content): void;
}
