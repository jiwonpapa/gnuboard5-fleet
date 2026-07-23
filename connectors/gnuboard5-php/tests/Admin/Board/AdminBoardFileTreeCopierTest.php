<?php

declare(strict_types=1);

namespace Tests\Admin\Board;

use Api\Admin\Board\Service\Support\AdminBoardFileTreeCopier;
use Api\Support\Exception\ApiException;
use PHPUnit\Framework\TestCase;

final class AdminBoardFileTreeCopierTest extends TestCase
{
    private string $root;

    protected function setUp(): void
    {
        parent::setUp();
        $this->root = sys_get_temp_dir() . '/g5-board-copy-' . bin2hex(random_bytes(6));
        mkdir($this->root . '/file/source/thumb', 0775, true);
        file_put_contents($this->root . '/file/source/photo.jpg', 'photo');
        file_put_contents($this->root . '/file/source/thumb/thumb.jpg', 'thumb');
    }

    protected function tearDown(): void
    {
        $copier = new AdminBoardFileTreeCopier($this->root);
        $copier->cleanup('source');
        $copier->cleanup('target');
        $copier->cleanup('schema_only');
        @rmdir($this->root . '/file');
        @rmdir($this->root);
        parent::tearDown();
    }

    public function testCopyPostsCopiesFileTreeAndSchemaOnlyCreatesGuardFile(): void
    {
        $copier = new AdminBoardFileTreeCopier($this->root);
        $copier->copy('source', 'target', true);
        $copier->copy('source', 'schema_only', false);

        self::assertSame('photo', file_get_contents($this->root . '/file/target/photo.jpg'));
        self::assertSame('thumb', file_get_contents($this->root . '/file/target/thumb/thumb.jpg'));
        self::assertFileExists($this->root . '/file/target/index.php');
        self::assertFileExists($this->root . '/file/schema_only/index.php');
        self::assertFileDoesNotExist($this->root . '/file/schema_only/photo.jpg');
    }

    public function testExistingTargetDirectoryFailsClosed(): void
    {
        mkdir($this->root . '/file/target');

        $this->expectException(ApiException::class);
        (new AdminBoardFileTreeCopier($this->root))->copy('source', 'target', true);
    }
}
