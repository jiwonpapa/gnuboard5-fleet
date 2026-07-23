<?php

declare(strict_types=1);

namespace Tests\File;

use Api\Board\Service\BoardService;
use Api\Core\Config\EnvConfig;
use Api\File\Contracts\FileGateway;
use Api\File\Service\FileDeleteService;
use Api\File\Service\FileReadService;
use Api\File\Service\FileService;
use Api\File\Service\FileUploadService;
use Api\Integration\Contracts\BoardGateway;
use Api\Integration\Contracts\PostReadGateway;
use Api\Support\Exception\ApiException;
use PHPUnit\Framework\TestCase;
use Psr\Http\Message\UploadedFileInterface;
use ReflectionMethod;

final class FileOperationSupportTest extends TestCase
{
    private ?string $dataPathBackup = null;

    /** @var list<string> */
    private array $tempDirectories = [];

    protected function setUp(): void
    {
        $this->dataPathBackup = array_key_exists('DATA_PATH', $_ENV) ? (string) $_ENV['DATA_PATH'] : null;
    }

    protected function tearDown(): void
    {
        if ($this->dataPathBackup === null) {
            unset($_ENV['DATA_PATH']);
        } else {
            $_ENV['DATA_PATH'] = $this->dataPathBackup;
        }

        foreach ($this->tempDirectories as $directory) {
            $this->removeDirectory($directory);
        }

        $this->tempDirectories = [];
    }

    public function testValidateUploadedFileSanitizesExecutableExtension(): void
    {
        $fileGateway = $this->createMock(FileGateway::class);
        $fileGateway->expects($this->once())
            ->method('sanitizeUploadedFileName')
            ->with('shell.php')
            ->willReturn('shell.php');

        $service = $this->createFileService($fileGateway);
        $uploadedFile = $this->createMock(UploadedFileInterface::class);
        $uploadedFile->method('getError')->willReturn(UPLOAD_ERR_OK);
        $uploadedFile->method('getSize')->willReturn(12);
        $uploadedFile->method('getClientFilename')->willReturn(' shell.php ');

        $result = $this->invokePrivateMethod($service, 'validateUploadedFile', $uploadedFile, 20);

        $this->assertSame($uploadedFile, $result['uploadedFile']);
        $this->assertSame(12, $result['size']);
        $this->assertSame('shell.php-x', $result['source']);
    }

    public function testValidateUploadedFileRejectsKnownUploadError(): void
    {
        $service = $this->createFileService($this->createMock(FileGateway::class));
        $uploadedFile = $this->createMock(UploadedFileInterface::class);
        $uploadedFile->method('getError')->willReturn(UPLOAD_ERR_PARTIAL);

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('파일이 일부만 업로드되었습니다.');

        $this->invokePrivateMethod($service, 'validateUploadedFile', $uploadedFile, 0);
    }

    public function testValidateUploadedFileRejectsOversizedPayload(): void
    {
        $fileGateway = $this->createMock(FileGateway::class);
        $fileGateway->expects($this->once())
            ->method('sanitizeUploadedFileName')
            ->with('photo.png')
            ->willReturn('photo.png');

        $service = $this->createFileService($fileGateway);
        $uploadedFile = $this->createMock(UploadedFileInterface::class);
        $uploadedFile->method('getError')->willReturn(UPLOAD_ERR_OK);
        $uploadedFile->method('getSize')->willReturn(21);
        $uploadedFile->method('getClientFilename')->willReturn('photo.png');

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('첨부파일 용량이 게시판 제한을 초과했습니다.');

        $this->invokePrivateMethod($service, 'validateUploadedFile', $uploadedFile, 20);
    }

    public function testDetectImageMetadataReturnsDimensionsForValidPng(): void
    {
        $tempRoot = $this->createTempDirectory();
        $_ENV['DATA_PATH'] = $tempRoot;

        $service = $this->createFileService($this->createMock(FileGateway::class));
        $imagePath = $tempRoot . '/pixel.png';
        file_put_contents(
            $imagePath,
            (string) base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Z0ecAAAAASUVORK5CYII=', true)
        );

        $metadata = $this->invokePrivateMethod($service, 'detectImageMetadata', 'pixel.png', $imagePath);

        $this->assertSame(['width' => 1, 'height' => 1, 'type' => IMAGETYPE_PNG], $metadata);
    }

    public function testDetectImageMetadataRejectsInvalidImageAndRemovesArtifact(): void
    {
        $tempRoot = $this->createTempDirectory();
        $_ENV['DATA_PATH'] = $tempRoot;

        $service = $this->createFileService($this->createMock(FileGateway::class));
        $imagePath = $tempRoot . '/invalid.gif';
        file_put_contents($imagePath, 'not-an-image');

        try {
            $this->invokePrivateMethod($service, 'detectImageMetadata', 'invalid.gif', $imagePath);
            $this->fail('ApiException was not thrown.');
        } catch (ApiException $exception) {
            $this->assertSame('이미지/플래시 파일이 유효하지 않습니다.', $exception->getMessage());
            $this->assertFileDoesNotExist($imagePath);
        }
    }

    public function testEnsureDirectoryGuessMimeTypeAndRemoveArtifacts(): void
    {
        $tempRoot = $this->createTempDirectory();
        $_ENV['DATA_PATH'] = $tempRoot;

        $service = $this->createFileService($this->createMock(FileGateway::class));
        $baseDir = $tempRoot . '/file/free';
        $thumbDir = $baseDir . '/thumb';

        $this->invokePrivateMethod($service, 'ensureDirectory', $thumbDir);
        $this->assertDirectoryExists($thumbDir);

        $filePath = $baseDir . '/demo.txt';
        $thumbPath = $thumbDir . '/demo.txt';
        $prefixedThumbPath = $baseDir . '/thumb-demo.txt';
        $globThumbPath = $baseDir . '/thumb-1-demo.txt';

        file_put_contents($filePath, 'hello');
        file_put_contents($thumbPath, 'hello');
        file_put_contents($prefixedThumbPath, 'hello');
        file_put_contents($globThumbPath, 'hello');

        $mime = $this->invokePrivateMethod($service, 'guessMimeType', $filePath);
        $this->assertSame('text/plain', $mime);

        $this->invokePrivateMethod($service, 'removeFileArtifacts', 'free', 'demo.txt');

        $this->assertFileDoesNotExist($filePath);
        $this->assertFileDoesNotExist($thumbPath);
        $this->assertFileDoesNotExist($prefixedThumbPath);
        $this->assertFileDoesNotExist($globThumbPath);
    }

    public function testNormalizeHelpersRejectInvalidValues(): void
    {
        $service = $this->createFileService($this->createMock(FileGateway::class));

        try {
            $this->invokePrivateMethod($service, 'normalizePositiveWrId', 0);
            $this->fail('ApiException was not thrown.');
        } catch (ApiException $exception) {
            $this->assertSame('wr_id는 1 이상의 정수여야 합니다.', $exception->getMessage());
        }

        try {
            $this->invokePrivateMethod($service, 'normalizeNonNegativeInt', -1, 'bf_no');
            $this->fail('ApiException was not thrown.');
        } catch (ApiException $exception) {
            $this->assertSame('bf_no는 0 이상의 정수여야 합니다.', $exception->getMessage());
        }
    }

    private function createFileService(FileGateway $fileGateway): FileService
    {
        $boardGateway = $this->createMock(BoardGateway::class);
        $boardService = new BoardService($boardGateway);
        $postGateway = $this->createMock(PostReadGateway::class);
        $envConfig = EnvConfig::fromEnv();

        return new FileService(
            $fileGateway,
            $boardService,
            $postGateway,
            new FileUploadService($fileGateway, $boardService, $postGateway, $envConfig),
            new FileReadService($fileGateway, $boardService, $postGateway, $envConfig),
            new FileDeleteService($fileGateway, $boardService, $postGateway, $envConfig),
            $envConfig
        );
    }

    private function createTempDirectory(): string
    {
        $directory = sys_get_temp_dir() . '/g5-file-op-' . uniqid('', true);
        mkdir($directory, 0777, true);
        $this->tempDirectories[] = $directory;

        return $directory;
    }

    private function invokePrivateMethod(object $service, string $method, mixed ...$args): mixed
    {
        $reflection = new ReflectionMethod($service, $method);

        return $reflection->invoke($service, ...$args);
    }

    private function removeDirectory(string $path): void
    {
        if (!is_dir($path)) {
            return;
        }

        $iterator = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($path, \FilesystemIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::CHILD_FIRST
        );

        foreach ($iterator as $item) {
            if ($item->isDir()) {
                @rmdir($item->getPathname());
                continue;
            }

            @unlink($item->getPathname());
        }

        @rmdir($path);
    }
}
