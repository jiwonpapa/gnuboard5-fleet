<?php

declare(strict_types=1);

namespace Tests\File;

use Api\Board\Service\BoardService;
use Api\Core\Config\EnvConfig;
use Api\File\Contracts\FileGateway;
use Api\File\Service\FileUploadService;
use Api\Integration\Contracts\BoardGateway;
use Api\Integration\Contracts\PostReadGateway;
use PHPUnit\Framework\TestCase;
use Psr\Http\Message\UploadedFileInterface;

final class FileUploadServiceCoverageTest extends TestCase
{
    private ?string $dataPathBackup = null;

    /** @var list<string> */
    private array $tempDirectories = [];

    protected function setUp(): void
    {
        $this->dataPathBackup = array_key_exists('DATA_PATH', $_ENV) ? (string)$_ENV['DATA_PATH'] : null;
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

    public function testUploadFilePersistsRecordAndReturnsStoredMetadata(): void
    {
        $dataPath = $this->createDataPath();
        $source = $dataPath . '/upload.png';
        file_put_contents(
            $source,
            (string)base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Z0ecAAAAASUVORK5CYII=', true)
        );

        $boardGateway = $this->createMock(BoardGateway::class);
        $boardGateway->expects($this->exactly(2))
            ->method('findBoard')
            ->with('free')
            ->willReturn([
                'bo_table' => 'free',
                'bo_subject' => '자유게시판',
                'gr_id' => 'community',
                'gr_use_access' => 0,
                'bo_admin' => '',
                'gr_admin' => '',
                'bo_write_level' => 2,
                'bo_upload_size' => 2048,
                'bo_upload_count' => 3,
            ]);

        $fileGateway = $this->createMock(FileGateway::class);
        $fileGateway->expects($this->once())
            ->method('sanitizeUploadedFileName')
            ->with('image.png')
            ->willReturn('image.png');
        $fileGateway->expects($this->once())
            ->method('countFiles')
            ->with('free', 10)
            ->willReturn(1);
        $fileGateway->expects($this->once())
            ->method('generateStoredFileName')
            ->with('image.png')
            ->willReturn('stored.png');
        $fileGateway->expects($this->once())
            ->method('getNextBfNo')
            ->with('free', 10)
            ->willReturn(2);
        $fileGateway->expects($this->once())
            ->method('createFileRecord')
            ->with(
                'free',
                10,
                2,
                'image.png',
                'stored.png',
                filesize($source),
                1,
                1,
                IMAGETYPE_PNG,
                'image/png',
                $this->isType('string')
            )
            ->willReturn([
                'bf_no' => 2,
                'bf_source' => 'image.png',
                'bf_file' => 'stored.png',
            ]);
        $fileGateway->expects($this->once())
            ->method('updateWriteFileCount')
            ->with('free', 10);

        $postGateway = $this->createMock(PostReadGateway::class);
        $postGateway->expects($this->once())
            ->method('getPost')
            ->with('free', 10)
            ->willReturn([
                'wr_id' => 10,
                'mb_id' => 'neo1',
            ]);

        $boardService = new BoardService($boardGateway);
        $service = new FileUploadService($fileGateway, $boardService, $postGateway, EnvConfig::fromEnv());
        $uploadedFile = $this->createUploadedFile($source);

        $result = $service->uploadFile('free', [
            'mb_id' => 'neo1',
            'mb_level' => 2,
        ], [
            'wr_id' => 10,
        ], $uploadedFile);

        $this->assertSame(2, $result['bf_no']);
        $this->assertSame('image/png', $result['bf_file_mime']);
        $this->assertFileExists($result['path']);
    }

    private function createUploadedFile(string $source): UploadedFileInterface
    {
        $uploadedFile = $this->createMock(UploadedFileInterface::class);
        $uploadedFile->method('getError')->willReturn(UPLOAD_ERR_OK);
        $uploadedFile->method('getSize')->willReturn(filesize($source));
        $uploadedFile->method('getClientFilename')->willReturn('image.png');
        $uploadedFile->expects($this->once())
            ->method('moveTo')
            ->willReturnCallback(static function (string $target) use ($source): void {
                copy($source, $target);
            });

        return $uploadedFile;
    }

    private function createDataPath(): string
    {
        $path = sys_get_temp_dir() . '/g5-upload-test-' . uniqid('', true);
        mkdir($path, 0777, true);
        $_ENV['DATA_PATH'] = $path;
        $this->tempDirectories[] = $path;

        return $path;
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
