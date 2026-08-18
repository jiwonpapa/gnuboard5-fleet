<?php

declare(strict_types=1);

namespace Tests\Admin\Faq;

use Api\Admin\Faq\Repository\AdminFaqMasterRepository;
use Api\Admin\Faq\Service\AdminFaqMasterService;
use Api\Core\Config\EnvConfig;
use Api\Support\Exception\ApiException;
use PHPUnit\Framework\TestCase;
use Psr\Http\Message\UploadedFileInterface;

final class AdminFaqMasterServiceTest extends TestCase
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

    public function testCreateRequiresSubject(): void
    {
        $service = new AdminFaqMasterService($this->createMock(AdminFaqMasterRepository::class));

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('fm_subject는 필수입니다.');

        $service->create([
            'fm_subject' => '',
        ]);
    }

    public function testDetailIncludesImageMetadata(): void
    {
        $dataPath = $this->createDataPath();
        $faqDir = $dataPath . '/faq';
        mkdir($faqDir, 0777, true);
        file_put_contents(
            $faqDir . '/3_h',
            (string)base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Z0ecAAAAASUVORK5CYII=', true)
        );

        $repository = $this->createMock(AdminFaqMasterRepository::class);
        $repository->expects($this->once())
            ->method('find')
            ->with(3)
            ->willReturn([
                'fm_id' => 3,
                'fm_subject' => '자주 묻는 질문',
                'fm_head_html' => '<p>head</p>',
                'fm_tail_html' => '<p>tail</p>',
                'fm_mobile_head_html' => '',
                'fm_mobile_tail_html' => '',
                'fm_order' => 2,
                'faq_count' => 4,
            ]);

        $service = new AdminFaqMasterService($repository, EnvConfig::fromEnv());
        $result = $service->detail(3);

        $this->assertSame(3, $result['fm_id']);
        $this->assertTrue($result['header_image']['exists']);
        $this->assertSame('/data/faq/3_h', $result['header_image']['url']);
        $this->assertSame(1, $result['header_image']['width']);
    }

    public function testUploadHeaderImageStoresArtifact(): void
    {
        $dataPath = $this->createDataPath();
        $source = $dataPath . '/source.png';
        file_put_contents(
            $source,
            (string)base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Z0ecAAAAASUVORK5CYII=', true)
        );

        $repository = $this->createMock(AdminFaqMasterRepository::class);
        $repository->method('find')
            ->with(7)
            ->willReturn([
                'fm_id' => 7,
                'fm_subject' => '자주 묻는 질문',
                'fm_head_html' => '',
                'fm_tail_html' => '',
                'fm_mobile_head_html' => '',
                'fm_mobile_tail_html' => '',
                'fm_order' => 0,
                'faq_count' => 0,
            ]);

        $uploadedFile = $this->createMock(UploadedFileInterface::class);
        $uploadedFile->method('getError')->willReturn(UPLOAD_ERR_OK);
        $uploadedFile->method('getSize')->willReturn(filesize($source));
        $uploadedFile->method('getClientFilename')->willReturn('header.png');
        $uploadedFile->expects($this->once())
            ->method('moveTo')
            ->willReturnCallback(static function (string $target) use ($source): void {
                copy($source, $target);
            });

        $service = new AdminFaqMasterService($repository, EnvConfig::fromEnv());
        $result = $service->uploadHeaderImage(7, $uploadedFile);

        $this->assertTrue($result['exists']);
        $this->assertSame('/data/faq/7_h', $result['url']);
        $this->assertFileExists($dataPath . '/faq/7_h');
    }

    public function testDeleteRemovesItemsAndImages(): void
    {
        $dataPath = $this->createDataPath();
        $faqDir = $dataPath . '/faq';
        mkdir($faqDir, 0777, true);
        file_put_contents($faqDir . '/9_h', 'header');
        file_put_contents($faqDir . '/9_t', 'footer');

        $repository = $this->createMock(AdminFaqMasterRepository::class);
        $repository->expects($this->once())
            ->method('find')
            ->with(9)
            ->willReturn([
                'fm_id' => 9,
                'fm_subject' => '안내',
                'fm_head_html' => '',
                'fm_tail_html' => '',
                'fm_mobile_head_html' => '',
                'fm_mobile_tail_html' => '',
                'fm_order' => 1,
                'faq_count' => 2,
            ]);
        $repository->expects($this->once())
            ->method('deleteItemsByMaster')
            ->with(9)
            ->willReturn(2);
        $repository->expects($this->once())
            ->method('delete')
            ->with(9)
            ->willReturn(1);

        $service = new AdminFaqMasterService($repository, EnvConfig::fromEnv());
        $service->delete(9);

        $this->assertFileDoesNotExist($faqDir . '/9_h');
        $this->assertFileDoesNotExist($faqDir . '/9_t');
    }

    public function testDeleteHeaderImageReportsPostDeleteAbsence(): void
    {
        $dataPath = $this->createDataPath();
        $faqDir = $dataPath . '/faq';
        mkdir($faqDir, 0777, true);
        file_put_contents($faqDir . '/7_h', 'header');

        $repository = $this->createMock(AdminFaqMasterRepository::class);
        $repository->method('find')
            ->with(7)
            ->willReturn([
                'fm_id' => 7,
                'fm_subject' => '안내',
                'fm_head_html' => '',
                'fm_tail_html' => '',
                'fm_mobile_head_html' => '',
                'fm_mobile_tail_html' => '',
                'fm_order' => 1,
                'faq_count' => 0,
            ]);

        $service = new AdminFaqMasterService($repository, EnvConfig::fromEnv());
        $result = $service->deleteHeaderImage(7);

        $this->assertFalse($result['exists']);
        $this->assertNull($result['mime']);
        $this->assertFileDoesNotExist($faqDir . '/7_h');
    }

    public function testListEnrichesSummaryWithImagePresence(): void
    {
        $dataPath = $this->createDataPath();
        $faqDir = $dataPath . '/faq';
        mkdir($faqDir, 0777, true);
        file_put_contents($faqDir . '/4_t', 'footer');

        $repository = $this->createMock(AdminFaqMasterRepository::class);
        $repository->expects($this->once())
            ->method('list')
            ->with(2, 10)
            ->willReturn([
                'total' => 1,
                'items' => [[
                    'fm_id' => 4,
                    'fm_subject' => '가이드',
                    'fm_order' => 3,
                    'faq_count' => 8,
                ]],
            ]);

        $service = new AdminFaqMasterService($repository, EnvConfig::fromEnv());
        $result = $service->list([
            'page' => 2,
            'per_page' => 10,
        ]);

        $this->assertSame(2, $result['pagination']['page']);
        $this->assertSame(1, $result['pagination']['last_page']);
        $this->assertTrue($result['items'][0]['footer_image']['exists']);
    }

    public function testUpdateReturnsEnrichedDetail(): void
    {
        $repository = $this->createMock(AdminFaqMasterRepository::class);
        $repository->expects($this->exactly(2))
            ->method('find')
            ->with(5)
            ->willReturn([
                'fm_id' => 5,
                'fm_subject' => '업데이트',
                'fm_head_html' => '<p>head</p>',
                'fm_tail_html' => '<p>tail</p>',
                'fm_mobile_head_html' => '',
                'fm_mobile_tail_html' => '',
                'fm_order' => 4,
                'faq_count' => 2,
            ]);
        $repository->expects($this->once())
            ->method('update')
            ->with(5, ['fm_subject' => '업데이트', 'fm_order' => 4])
            ->willReturn(1);

        $service = new AdminFaqMasterService($repository, EnvConfig::fromEnv());
        $result = $service->update(5, [
            'fm_subject' => '업데이트',
            'fm_order' => 4,
        ]);

        $this->assertSame(5, $result['fm_id']);
        $this->assertSame('업데이트', $result['fm_subject']);
    }

    private function createDataPath(): string
    {
        $path = sys_get_temp_dir() . '/g5-faq-master-test-' . uniqid('', true);
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
