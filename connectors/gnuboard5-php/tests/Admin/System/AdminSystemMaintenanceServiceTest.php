<?php

declare(strict_types=1);

namespace Tests\Admin\System;

use Api\Admin\System\Repository\AdminSystemMaintenanceRepository;
use Api\Admin\System\Service\AdminSystemMaintenanceService;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\PreserveGlobalState;
use PHPUnit\Framework\Attributes\RunInSeparateProcess;
use PHPUnit\Framework\TestCase;

final class AdminSystemMaintenanceServiceTest extends TestCase
{
    private array $tempDirectories = [];

    protected function tearDown(): void
    {
        foreach ($this->tempDirectories as $directory) {
            $this->removeDirectory($directory);
        }

        $this->tempDirectories = [];
    }

    public function testPurgeSessionFilesDeletesOnlyExpiredSessions(): void
    {
        $dataPath = $this->createDataPath();
        $sessionDir = $dataPath . '/session';
        mkdir($sessionDir, 0777, true);

        $expired = $sessionDir . '/sess_expired';
        $recent = $sessionDir . '/sess_recent';
        file_put_contents($expired, 'expired');
        file_put_contents($recent, 'recent');
        touch($expired, time() - 3600 * 7, time() - 3600 * 7);
        touch($recent, time(), time());

        $service = new AdminSystemMaintenanceService(
            $this->createMock(AdminSystemMaintenanceRepository::class),
            dirname(__DIR__, 3),
            $dataPath
        );

        $result = $service->purgeSessionFiles(['mb_level' => 10]);

        $this->assertSame('completed', $result['status']);
        $this->assertSame(1, $result['deleted_count']);
        $this->assertFileDoesNotExist($expired);
        $this->assertFileExists($recent);
    }

    public function testPurgeMemberListFilesKeepsLogArtifacts(): void
    {
        $dataPath = $this->createDataPath();
        $memberListDir = $dataPath . '/member_list';
        mkdir($memberListDir . '/log', 0777, true);
        mkdir($memberListDir . '/exports', 0777, true);
        file_put_contents($memberListDir . '/keep.log', 'log');
        file_put_contents($memberListDir . '/delete.txt', 'temp');
        file_put_contents($memberListDir . '/exports/data.csv', 'csv');
        file_put_contents($memberListDir . '/log/audit.log', 'audit');

        $service = new AdminSystemMaintenanceService(
            $this->createMock(AdminSystemMaintenanceRepository::class),
            dirname(__DIR__, 3),
            $dataPath
        );

        $result = $service->purgeMemberListFiles(['mb_level' => 10]);

        $this->assertSame(2, $result['deleted_count']);
        $this->assertFileExists($memberListDir . '/keep.log');
        $this->assertDirectoryExists($memberListDir . '/log');
        $this->assertDirectoryDoesNotExist($memberListDir . '/exports');
        $this->assertFileDoesNotExist($memberListDir . '/delete.txt');
    }

    public function testBrowscapStatusIncludesPendingVisitCount(): void
    {
        $repository = $this->createMock(AdminSystemMaintenanceRepository::class);
        $repository->expects($this->once())
            ->method('countVisitRowsMissingBrowscap')
            ->willReturn(7);

        $service = new AdminSystemMaintenanceService(
            $repository,
            dirname(__DIR__, 3),
            $this->createDataPath()
        );

        $result = $service->browscapStatus(['mb_level' => 10]);

        $this->assertArrayHasKey('available', $result);
        $this->assertSame(7, $result['pending_visit_count']);
    }

    public function testPhpInfoReturnsCoreFields(): void
    {
        $service = new AdminSystemMaintenanceService(
            $this->createMock(AdminSystemMaintenanceRepository::class),
            dirname(__DIR__, 3),
            $this->createDataPath()
        );

        $result = $service->phpInfo(['mb_level' => 10]);

        $this->assertSame(PHP_VERSION, $result['php_version']);
        $this->assertSame(PHP_SAPI, $result['sapi']);
        $this->assertIsInt($result['extension_count']);
        $this->assertStringContainsString('phpinfo', strtolower((string)$result['html']));
    }

    public function testConvertBrowscapReturnsCompletedWhenNoPendingRows(): void
    {
        $projectRoot = $this->createProjectRootWithBrowscapPlugin();
        $dataPath = $this->createDataPath();
        mkdir($dataPath . '/cache', 0777, true);
        file_put_contents($dataPath . '/cache/browscap_cache.php', '<?php return [];');

        $repository = $this->createMock(AdminSystemMaintenanceRepository::class);
        $repository->expects($this->once())
            ->method('countVisitRowsMissingBrowscap')
            ->willReturn(0);

        $service = new AdminSystemMaintenanceService(
            $repository,
            $projectRoot,
            $dataPath
        );

        $result = $service->convertBrowscap(['mb_level' => 10], ['rows' => 50]);

        $this->assertSame(50, $result['rows']);
        $this->assertSame(0, $result['total_pending_before']);
        $this->assertSame(0, $result['processed_count']);
        $this->assertSame(0, $result['remaining_count']);
        $this->assertTrue($result['completed']);
    }

    public static function browscapClassVariants(): array
    {
        return ['stock G5' => [''], 'namespaced library' => ['namespace phpbrowscap;']];
    }

    #[DataProvider('browscapClassVariants')]
    #[RunInSeparateProcess]
    #[PreserveGlobalState(false)]
    public function testConvertBrowscapProcessesPendingRowsWithSupportedLibrary(string $namespace): void
    {
        $projectRoot = $this->createProjectRootWithBrowscapPlugin();
        file_put_contents($projectRoot . '/plugin/browscap/Browscap.php', '<?php ' . $namespace . <<<'PHP'

class Browscap {
    public bool $doAutoUpdate = true;
    public string $cacheFilename = '';
    public function __construct(string $cache) {}
    public function updateCache(): void { throw new \RuntimeException('network update forbidden'); }
    public function getBrowser(string $agent): object {
        if ($agent !== 'FleetTest' || $this->doAutoUpdate || $this->cacheFilename !== 'browscap_cache.php') {
            throw new \RuntimeException('invalid conversion configuration');
        }
        return (object)['Comment' => 'FixtureBrowser', 'Platform' => 'FixtureOS', 'Device_Type' => 'Desktop'];
    }
}
PHP);
        $dataPath = $this->createDataPath();
        mkdir($dataPath . '/cache', 0777, true);
        file_put_contents($dataPath . '/cache/browscap_cache.php', '<?php return [];');
        $repository = $this->createMock(AdminSystemMaintenanceRepository::class);
        $repository->expects($this->exactly(2))->method('countVisitRowsMissingBrowscap')
            ->willReturnOnConsecutiveCalls(1, 0);
        $repository->expects($this->once())->method('listVisitRowsMissingBrowscap')->with(10)
            ->willReturn([['vi_id' => 7, 'vi_agent' => 'FleetTest']]);
        $repository->expects($this->once())->method('updateVisitBrowscap')
            ->with(7, 'FixtureBrowser', 'FixtureOS', 'Desktop');

        $service = new AdminSystemMaintenanceService($repository, $projectRoot, $dataPath);
        $result = $service->convertBrowscap(['mb_level' => 10], ['rows' => 10]);

        $this->assertSame(1, $result['processed_count']);
        $this->assertSame(0, $result['remaining_count']);
        $this->assertTrue($result['completed']);
    }

    private function createDataPath(): string
    {
        $path = sys_get_temp_dir() . '/g5-maint-test-' . uniqid('', true);
        mkdir($path, 0777, true);
        $this->tempDirectories[] = $path;

        return $path;
    }

    private function createProjectRootWithBrowscapPlugin(): string
    {
        $path = sys_get_temp_dir() . '/g5-browscap-test-' . uniqid('', true);
        mkdir($path . '/plugin/browscap', 0777, true);
        file_put_contents($path . '/plugin/browscap/Browscap.php', '<?php');
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
