<?php

declare(strict_types=1);

namespace Tests\File;

use Api\File\Service\Support\FilePublicPresenter;
use PHPUnit\Framework\TestCase;

final class FilePublicPresenterTest extends TestCase
{
    public function testPresenterDropsAbsoluteStoragePathAndCastsPublicFields(): void
    {
        $file = (new FilePublicPresenter())->present([
            'bo_table' => 'free',
            'wr_id' => '3',
            'bf_no' => '1',
            'path' => '/srv/gnuboard/data/file/free/private.bin',
        ]);

        self::assertSame(3, $file['wr_id']);
        self::assertSame(1, $file['bf_no']);
        self::assertArrayNotHasKey('path', $file);
        self::assertCount(16, $file);
    }
}
