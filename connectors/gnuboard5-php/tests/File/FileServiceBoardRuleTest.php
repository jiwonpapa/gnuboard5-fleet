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

final class FileServiceBoardRuleTest extends TestCase
{
    private ?string $dataPathBackup = null;

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
    }

    public function testDeleteFileRejectsNonOwnerWithoutAdminRole(): void
    {
        $boardGateway = $this->createMock(BoardGateway::class);
        $boardGateway->expects($this->once())
            ->method('findBoard')
            ->with('free')
            ->willReturn([
                'bo_table' => 'free',
                'gr_use_access' => 0,
                'bo_admin' => '',
                'gr_admin' => '',
            ]);

        $postGateway = $this->createMock(PostReadGateway::class);
        $postGateway->expects($this->once())
            ->method('getPost')
            ->with('free', 10)
            ->willReturn([
                'wr_id' => 10,
                'mb_id' => 'writer',
            ]);

        $fileGateway = $this->createMock(FileGateway::class);
        $fileGateway->expects($this->never())->method('getFile');

        $service = $this->createFileService($fileGateway, $boardGateway, $postGateway);

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('작성자 본인 또는 관리자만 파일을 삭제할 수 있습니다.');

        $service->deleteFile('free', 10, 0, [
            'mb_id' => 'reader',
            'mb_level' => 2,
        ]);
    }

    public function testListFilesRejectsMemberWithoutReadPermission(): void
    {
        $boardGateway = $this->createMock(BoardGateway::class);
        $boardGateway->expects($this->exactly(2))
            ->method('findBoard')
            ->with('free')
            ->willReturn([
                'bo_table' => 'free',
                'bo_read_level' => 2,
                'gr_use_access' => 0,
                'bo_admin' => '',
                'gr_admin' => '',
            ]);

        $postGateway = $this->createMock(PostReadGateway::class);
        $fileGateway = $this->createMock(FileGateway::class);

        $service = $this->createFileService($fileGateway, $boardGateway, $postGateway);

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('해당 게시판 조회 권한이 없습니다.');

        $service->listFiles('free', 10, [
            'mb_id' => 'reader',
            'mb_level' => 1,
        ]);
    }

    public function testDownloadSkipsPointForPostOwner(): void
    {
        $tempRoot = sys_get_temp_dir() . '/gnurest-file-test-' . uniqid('', true);
        $this->assertTrue(@mkdir($tempRoot . '/file/free', 0777, true) || is_dir($tempRoot . '/file/free'));
        $_ENV['DATA_PATH'] = $tempRoot;

        $filePath = $tempRoot . '/file/free/a.txt';
        file_put_contents($filePath, 'abc');

        $boardGateway = $this->createMock(BoardGateway::class);
        $boardGateway->expects($this->exactly(2))
            ->method('findBoard')
            ->with('free')
            ->willReturn([
                'bo_table' => 'free',
                'bo_read_level' => 0,
                'bo_download_level' => 0,
                'bo_download_point' => -5,
                'bo_subject' => '자유게시판',
                'gr_use_access' => 0,
                'bo_admin' => '',
                'gr_admin' => '',
            ]);

        $postGateway = $this->createMock(PostReadGateway::class);
        $postGateway->expects($this->once())
            ->method('getPost')
            ->with('free', 99)
            ->willReturn([
                'wr_id' => 99,
                'mb_id' => 'owner',
            ]);

        $fileGateway = $this->createMock(FileGateway::class);
        $fileGateway->expects($this->once())
            ->method('getFile')
            ->with('free', 99, 0)
            ->willReturn([
                'bo_table' => 'free',
                'wr_id' => 99,
                'bf_no' => 0,
                'bf_source' => 'a.txt',
                'bf_file' => 'a.txt',
                'bf_filesize' => 3,
            ]);
        $fileGateway->expects($this->never())->method('applyDownloadPoint');
        $fileGateway->expects($this->once())
            ->method('incrementDownloadCount')
            ->with('free', 99, 0);

        $service = $this->createFileService($fileGateway, $boardGateway, $postGateway);
        $payload = $service->getDownloadPayload('free', 99, 0, [
            'mb_id' => 'owner',
            'mb_level' => 2,
        ]);

        $this->assertSame($filePath, (string)($payload['path'] ?? ''));
    }

    private function createFileService(FileGateway $fileGateway, BoardGateway $boardGateway, PostReadGateway $postGateway): FileService
    {
        $boardService = new BoardService($boardGateway);
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
}
