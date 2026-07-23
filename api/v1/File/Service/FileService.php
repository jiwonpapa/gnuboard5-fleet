<?php

declare(strict_types=1);

namespace Api\File\Service;

use Api\Board\Service\BoardService;
use Api\Core\Config\EnvConfig;
use Api\File\Contracts\FileGateway;
use Api\Integration\Contracts\PostReadGateway;
use Psr\Http\Message\UploadedFileInterface;

final class FileService
{
    use FileOperationSupport;

    public function __construct(
        private readonly FileGateway $fileGateway,
        BoardService $boardService,
        PostReadGateway $postGateway,
        private readonly FileUploadService $uploadService,
        private readonly FileReadService $readService,
        private readonly FileDeleteService $deleteService,
        ?EnvConfig $envConfig = null
    ) {
        self::touchDependencies($boardService, $postGateway);
        $this->envConfig = $envConfig ?? EnvConfig::fromEnv();
    }

    private readonly EnvConfig $envConfig;

    public function uploadFile(string $boTable, array $member, array $payload, ?UploadedFileInterface $uploadedFile): array
    {
        return $this->uploadService->uploadFile($boTable, $member, $payload, $uploadedFile);
    }

    public function getDownloadPayload(string $boTable, int $wrId, int $bfNo, array $member): array
    {
        return $this->readService->getDownloadPayload($boTable, $wrId, $bfNo, $member);
    }

    public function listFiles(string $boTable, int $wrId, array $member = []): array
    {
        return $this->readService->listFiles($boTable, $wrId, $member);
    }

    public function deleteFile(string $boTable, int $wrId, int $bfNo, array $member): void
    {
        $this->deleteService->deleteFile($boTable, $wrId, $bfNo, $member);
    }

    protected function fileGateway(): FileGateway
    {
        return $this->fileGateway;
    }

    protected function envConfig(): EnvConfig
    {
        return $this->envConfig;
    }

    private static function touchDependencies(mixed ...$dependencies): void
    {
    }
}
