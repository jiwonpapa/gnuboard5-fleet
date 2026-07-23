<?php

declare(strict_types=1);

namespace Tests\Admin\Faq;

use Api\Admin\Faq\Repository\AdminFaqMasterRepository;
use Api\Admin\Faq\Repository\AdminFaqRepository;
use Api\Admin\Faq\Service\AdminFaqMasterService;
use Api\Admin\Faq\Service\AdminFaqService;
use Api\Core\Config\EnvConfig;
use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;
use Doctrine\DBAL\Result;
use PHPUnit\Framework\TestCase;
use Psr\Http\Message\UploadedFileInterface;

final class AdminFaqServiceCoverageTest extends TestCase
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

    public function testFaqServiceCoversFaqCrudAndMasterDelegation(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $faqs = [
            1 => [
                'fa_id' => 1,
                'fm_id' => 3,
                'fm_subject' => '일반',
                'fa_subject' => '기존 FAQ',
                'fa_content' => '본문',
                'fa_order' => 1,
            ],
        ];
        $nextFaqId = 2;

        $qb->method('executeQuery')
            ->willReturnCallback(function (string $sql, array $params = []) use (&$faqs): Result {
                if (str_contains($sql, 'COUNT(*) AS cnt FROM g5_faq')) {
                    return $this->createResult(['cnt' => count($faqs)]);
                }

                if (str_contains($sql, 'SELECT fm_id FROM g5_faq_master')) {
                    return $this->createResult(['fm_id' => (int)$params['fm_id']]);
                }

                if (str_contains($sql, 'LEFT JOIN g5_faq_master')) {
                    if (str_contains($sql, 'LIMIT 1')) {
                        return $this->createResult($faqs[(int)($params['fa_id'] ?? 0)] ?? false);
                    }

                    return $this->createResult(false, array_values($faqs));
                }

                return $this->createResult(false);
            });
        $qb->expects($this->exactly(3))
            ->method('executeStatement')
            ->willReturnCallback(function (string $sql, array $params = []) use (&$faqs): int {
                if (str_starts_with($sql, 'INSERT INTO g5_faq')) {
                    $faqs[2] = [
                        'fa_id' => 2,
                        'fm_id' => (int)$params['fm_id'],
                        'fm_subject' => '일반',
                        'fa_subject' => (string)$params['fa_subject'],
                        'fa_content' => (string)$params['fa_content'],
                        'fa_order' => (int)$params['fa_order'],
                    ];

                    return 1;
                }

                if (str_starts_with($sql, 'UPDATE g5_faq')) {
                    $faqs[1]['fa_subject'] = (string)$params['u_fa_subject'];

                    return 1;
                }

                unset($faqs[(int)$params['fa_id']]);
                return 1;
            });
        $qb->expects($this->once())
            ->method('lastInsertId')
            ->willReturn($nextFaqId);

        $masterRepository = $this->createMock(AdminFaqMasterRepository::class);
        $masterRepository->expects($this->once())
            ->method('list')
            ->with(2, 10)
            ->willReturn([
                'total' => 1,
                'items' => [[
                    'fm_id' => 3,
                    'fm_subject' => '일반',
                    'fm_order' => 1,
                    'faq_count' => 2,
                ]],
            ]);
        $masterRepository->method('find')
            ->willReturn([
                'fm_id' => 3,
                'fm_subject' => '일반',
                'fm_head_html' => '',
                'fm_tail_html' => '',
                'fm_mobile_head_html' => '',
                'fm_mobile_tail_html' => '',
                'fm_order' => 1,
                'faq_count' => 2,
            ]);
        $masterRepository->expects($this->once())
            ->method('create')
            ->with($this->callback(static function (array $payload): bool {
                return ($payload['fm_subject'] ?? null) === '새 마스터'
                    && ($payload['fm_order'] ?? null) === 2;
            }))
            ->willReturn(3);
        $masterRepository->expects($this->once())
            ->method('update')
            ->with(3, ['fm_subject' => '업데이트 마스터'])
            ->willReturn(1);
        $masterRepository->expects($this->once())
            ->method('deleteItemsByMaster')
            ->with(3)
            ->willReturn(2);
        $masterRepository->expects($this->once())
            ->method('delete')
            ->with(3)
            ->willReturn(1);

        $dataPath = $this->createDataPath();
        $source = $dataPath . '/faq-source.png';
        file_put_contents(
            $source,
            (string)base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Z0ecAAAAASUVORK5CYII=', true)
        );
        $uploadedFile = $this->createMock(UploadedFileInterface::class);
        $uploadedFile->method('getError')->willReturn(UPLOAD_ERR_OK);
        $uploadedFile->method('getSize')->willReturn(filesize($source));
        $uploadedFile->method('getClientFilename')->willReturn('faq.png');
        $uploadedFile->expects($this->exactly(2))
            ->method('moveTo')
            ->willReturnCallback(static function (string $target) use ($source): void {
                copy($source, $target);
            });

        $service = new AdminFaqService(
            new AdminFaqRepository($qb, new TableRegistry('g5_')),
            new AdminFaqMasterService($masterRepository, EnvConfig::fromEnv())
        );

        $listed = $service->list(['page' => 2, 'per_page' => 10, 'fm_id' => 3]);
        self::assertSame(2, $listed['pagination']['page']);
        self::assertSame('기존 FAQ', $service->detail(1)['fa_subject']);
        self::assertSame('새 FAQ', $service->create([
            'fm_id' => 3,
            'fa_subject' => '새 FAQ',
            'fa_content' => '생성',
        ])['fa_subject']);
        self::assertSame('수정 FAQ', $service->update(1, ['fa_subject' => '수정 FAQ'])['fa_subject']);
        $service->delete(2);

        self::assertSame(1, $service->listMasters(['page' => 2, 'per_page' => 10])['pagination']['last_page']);
        self::assertSame(3, $service->detailMaster(3)['fm_id']);
        self::assertSame(3, $service->createMaster(['fm_subject' => '새 마스터', 'fm_order' => 2])['fm_id']);
        self::assertSame('일반', $service->updateMaster(3, ['fm_subject' => '업데이트 마스터'])['fm_subject']);
        self::assertTrue($service->uploadMasterHeaderImage(3, $uploadedFile)['exists']);
        self::assertTrue($service->uploadMasterFooterImage(3, $uploadedFile)['exists']);
        self::assertTrue($service->deleteMasterHeaderImage(3)['exists']);
        self::assertTrue($service->deleteMasterFooterImage(3)['exists']);
        $service->deleteMaster(3);
        self::assertTrue(true);
    }

    private function createDataPath(): string
    {
        $path = sys_get_temp_dir() . '/g5-faq-service-test-' . uniqid('', true);
        mkdir($path, 0777, true);
        $_ENV['DATA_PATH'] = $path;
        $this->tempDirectories[] = $path;

        return $path;
    }

    /**
     * @param array<string, mixed>|false $assoc
     * @param array<int, array<string, mixed>> $all
     */
    private function createResult(array|false $assoc, array $all = []): Result
    {
        $result = $this->createMock(Result::class);
        $result->method('fetchAssociative')->willReturn($assoc);
        $result->method('fetchAllAssociative')->willReturn($all);

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
