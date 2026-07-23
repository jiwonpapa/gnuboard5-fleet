<?php

declare(strict_types=1);

namespace Tests\Qa;

use Api\Qa\Service\QaAttachmentService;
use Api\Qa\Service\QaAttachmentStorage;
use Api\Support\Exception\ApiException;
use PHPUnit\Framework\TestCase;
use Slim\Psr7\UploadedFile;

final class QaAttachmentServiceTest extends TestCase
{
    /** @var array<string, string|null> */
    private array $envBackup = [];
    private string $tempRoot = '';

    protected function setUp(): void
    {
        parent::setUp();
        $this->tempRoot = sys_get_temp_dir() . '/g5-api-qa-attachment-' . uniqid('', true);
        mkdir($this->tempRoot, 0775, true);
        $this->setEnv('DATA_PATH', $this->tempRoot);
    }

    protected function tearDown(): void
    {
        $this->removeDirectory($this->tempRoot);
        foreach ($this->envBackup as $key => $value) {
            if ($value === null) {
                unset($_ENV[$key]);
                putenv($key);
                continue;
            }

            $_ENV[$key] = $value;
            putenv($key . '=' . $value);
        }
        $this->envBackup = [];
        parent::tearDown();
    }

    public function testParseDeleteFlagsSupportsStringAndBooleanValues(): void
    {
        $service = new QaAttachmentService(new QaAttachmentStorage());

        $flags = $service->parseDeleteFlags([
            '1' => 'yes',
            2 => false,
        ]);

        $this->assertSame([1 => true, 2 => false], $flags);
    }

    public function testProcessAttachmentsStoresZeroBasedSlotsAndSanitizesExecutableExtension(): void
    {
        $service = new QaAttachmentService(new QaAttachmentStorage());

        $result = $service->processAttachments(
            [
                0 => $this->createUploadedTextFile('evil.php', 'malicious'),
                1 => $this->createUploadedTextFile('note.txt', 'hello'),
            ],
            $service->emptyAttachmentSlots(),
            [1 => false, 2 => false],
            1024 * 1024,
            false,
            '127.0.0.1'
        );

        $this->assertSame('evil.php-x', $result[1]['source']);
        $this->assertSame('note.txt', $result[2]['source']);
        $this->assertFileExists($this->tempRoot . '/qa/' . $result[1]['file']);
        $this->assertFileExists($this->tempRoot . '/qa/' . $result[2]['file']);
    }

    public function testProcessAttachmentsDeletesExistingFileWhenFlagIsSet(): void
    {
        $storage = new QaAttachmentStorage();
        $service = new QaAttachmentService($storage);
        $qaDir = $storage->qaStorageDir();
        file_put_contents($qaDir . '/old.txt', 'old');

        $result = $service->processAttachments(
            [],
            [
                1 => ['file' => 'old.txt', 'source' => 'old.txt'],
                2 => ['file' => '', 'source' => ''],
            ],
            [1 => true, 2 => false],
            1024,
            false,
            '127.0.0.1'
        );

        $this->assertSame('', $result[1]['file']);
        $this->assertFileDoesNotExist($qaDir . '/old.txt');
    }

    public function testProcessAttachmentsRejectsTooManyFilesAndOversizedUpload(): void
    {
        $service = new QaAttachmentService(new QaAttachmentStorage());

        try {
            $service->processAttachments(
                [
                    0 => $this->createUploadedTextFile('a.txt', 'a'),
                    1 => $this->createUploadedTextFile('b.txt', 'b'),
                    2 => $this->createUploadedTextFile('c.txt', 'c'),
                ],
                $service->emptyAttachmentSlots(),
                [1 => false, 2 => false],
                1024,
                false,
                '127.0.0.1'
            );
            self::fail('ApiException was not thrown.');
        } catch (ApiException $exception) {
            self::assertSame('첨부파일은 최대 2개까지 업로드할 수 있습니다.', $exception->getMessage());
        }

        try {
            $service->processAttachments(
                [
                    1 => $this->createUploadedTextFile('big.txt', str_repeat('x', 20)),
                ],
                $service->emptyAttachmentSlots(),
                [1 => false, 2 => false],
                5,
                false,
                '127.0.0.1'
            );
            self::fail('ApiException was not thrown.');
        } catch (ApiException $exception) {
            self::assertSame('첨부파일 용량이 제한을 초과했습니다.', $exception->getMessage());
        }
    }

    public function testProcessAttachmentsRejectsUploadErrorAndInvalidFilename(): void
    {
        $service = new QaAttachmentService(new QaAttachmentStorage());

        try {
            $service->processAttachments(
                [
                    1 => $this->createUploadedTextFile('bad.txt', 'bad', UPLOAD_ERR_PARTIAL),
                ],
                $service->emptyAttachmentSlots(),
                [1 => false, 2 => false],
                1024,
                false,
                '127.0.0.1'
            );
            self::fail('ApiException was not thrown.');
        } catch (ApiException $exception) {
            self::assertSame('파일이 일부만 업로드되었습니다.', $exception->getMessage());
        }

        try {
            $service->processAttachments(
                [
                    1 => $this->createUploadedTextFile('..', 'bad'),
                ],
                $service->emptyAttachmentSlots(),
                [1 => false, 2 => false],
                1024,
                false,
                '127.0.0.1'
            );
            self::fail('ApiException was not thrown.');
        } catch (ApiException $exception) {
            self::assertSame('업로드 파일명이 유효하지 않습니다.', $exception->getMessage());
        }
    }

    private function createUploadedTextFile(string $clientFilename, string $content, int $error = UPLOAD_ERR_OK): UploadedFile
    {
        $tmpFile = tempnam($this->tempRoot, 'qa_file_');
        if (!is_string($tmpFile)) {
            self::fail('temp file create failed');
        }

        file_put_contents($tmpFile, $content);

        return new UploadedFile($tmpFile, $clientFilename, 'text/plain', filesize($tmpFile) ?: null, $error, false);
    }

    private function setEnv(string $key, string $value): void
    {
        if (!array_key_exists($key, $this->envBackup)) {
            $this->envBackup[$key] = array_key_exists($key, $_ENV) ? (string)$_ENV[$key] : null;
        }

        $_ENV[$key] = $value;
        putenv($key . '=' . $value);
    }

    private function removeDirectory(string $directory): void
    {
        if ($directory === '' || !is_dir($directory)) {
            return;
        }

        $items = scandir($directory);
        if (!is_array($items)) {
            return;
        }

        foreach ($items as $item) {
            if ($item === '.' || $item === '..') {
                continue;
            }

            $path = $directory . '/' . $item;
            if (is_dir($path)) {
                $this->removeDirectory($path);
            } else {
                @unlink($path);
            }
        }

        @rmdir($directory);
    }
}
