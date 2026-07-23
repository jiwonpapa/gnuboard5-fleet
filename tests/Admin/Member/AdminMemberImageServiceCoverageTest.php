<?php

declare(strict_types=1);

namespace Tests\Admin\Member;

use Api\Admin\Member\Repository\AdminMemberRepository;
use Api\Admin\Member\Service\AdminMemberImageService;
use Api\Core\Config\EnvConfig;
use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;
use Api\Member\Service\MemberImageManager;
use Doctrine\DBAL\Result;
use PHPUnit\Framework\TestCase;
use Psr\Http\Message\UploadedFileInterface;

final class AdminMemberImageServiceCoverageTest extends TestCase
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

    public function testImageServiceCoversUploadAndDeleteFlows(): void
    {
        $dataPath = $this->createDataPath();
        $source = $dataPath . '/member-image.png';
        file_put_contents(
            $source,
            (string)base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Z0ecAAAAASUVORK5CYII=', true)
        );

        $qb = $this->createMock(QueryBuilder::class);
        $qb->expects($this->exactly(6))
            ->method('executeQuery')
            ->willReturnCallback(function (string $sql, array $params = []): Result {
                if (str_contains($sql, 'FROM g5_config')) {
                    return $this->createResult([
                        'cf_use_member_icon' => 1,
                        'cf_member_icon_size' => 1024,
                        'cf_member_icon_width' => 20,
                        'cf_member_icon_height' => 20,
                        'cf_member_img_size' => 1024,
                        'cf_member_img_width' => 20,
                        'cf_member_img_height' => 20,
                    ]);
                }

                return $this->createResult([
                    'mb_id' => (string)($params['mb_id'] ?? 'neo1'),
                    'mb_level' => 2,
                ]);
            });

        $repository = new AdminMemberRepository($qb, new TableRegistry('g5_'));
        $service = new AdminMemberImageService($repository, new MemberImageManager(EnvConfig::fromEnv()));
        $uploadedFile = $this->createUploadedFile($source);

        $icon = $service->uploadIcon('neo1', $uploadedFile);
        $image = $service->uploadImage('neo1', $uploadedFile);
        $deletedIcon = $service->deleteIcon('neo1');
        $deletedImage = $service->deleteImage('neo1');

        $this->assertSame('member', $icon['storage']);
        $this->assertSame('member_image', $image['storage']);
        $this->assertTrue($deletedIcon['deleted']);
        $this->assertTrue($deletedImage['deleted']);
    }

    private function createUploadedFile(string $source): UploadedFileInterface
    {
        $uploadedFile = $this->createMock(UploadedFileInterface::class);
        $uploadedFile->method('getError')->willReturn(UPLOAD_ERR_OK);
        $uploadedFile->method('getSize')->willReturn(filesize($source));
        $uploadedFile->method('getClientFilename')->willReturn('member.png');
        $uploadedFile->method('moveTo')
            ->willReturnCallback(static function (string $target) use ($source): void {
                copy($source, $target);
            });

        return $uploadedFile;
    }

    private function createDataPath(): string
    {
        $path = sys_get_temp_dir() . '/g5-member-image-test-' . uniqid('', true);
        mkdir($path, 0777, true);
        $_ENV['DATA_PATH'] = $path;
        $this->tempDirectories[] = $path;

        return $path;
    }

    /**
     * @param array<string, mixed>|false $assoc
     */
    private function createResult(array|false $assoc): Result
    {
        $result = $this->createMock(Result::class);
        $result->method('fetchAssociative')->willReturn($assoc);

        return $result;
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
