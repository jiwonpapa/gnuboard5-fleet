<?php

declare(strict_types=1);

namespace Tests\Qa;

use Api\Qa\Service\QaAttachmentStorage;
use Api\Support\Exception\ApiException;
use PHPUnit\Framework\TestCase;

final class QaAttachmentStorageTest extends TestCase
{
    /** @var array<string, string|null> */
    private array $envBackup = [];
    private string $tempRoot = '';

    protected function setUp(): void
    {
        parent::setUp();
        $this->tempRoot = sys_get_temp_dir() . '/g5-api-qa-storage-' . uniqid('', true);
        mkdir($this->tempRoot, 0775, true);
        $this->setEnv('DATA_PATH', $this->tempRoot);
        $this->setEnv('UNKNOWN_IP_FALLBACK', 'fallback-ip');
        $this->setEnv('UPLOAD_IMAGE_EXTENSIONS', 'png|jpg|jpeg|gif');
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

    public function testGenerateStoredFileNameUsesFallbackIpWhenIpMissing(): void
    {
        $storage = new QaAttachmentStorage();

        $stored = $storage->generateStoredFileName('', 'sample.txt');

        $this->assertMatchesRegularExpression(
            '/^' . preg_quote(md5(sha1('fallback-ip')), '/') . '_[A-Za-z0-9]{8}_sample\.txt$/',
            $stored
        );
    }

    public function testQaStorageDirCreatesDirectoryAndRemoveArtifactsDeletesThumbs(): void
    {
        $storage = new QaAttachmentStorage();
        $qaDir = $storage->qaStorageDir();

        $this->assertDirectoryExists($qaDir);

        file_put_contents($qaDir . '/stored.txt', 'main');
        @mkdir($qaDir . '/thumb', 0775, true);
        file_put_contents($qaDir . '/thumb/stored.txt', 'thumb');
        file_put_contents($qaDir . '/thumb-stored.txt', 'thumb2');
        file_put_contents($qaDir . '/thumb-extra-stored.txt', 'thumb3');

        $storage->removeFileArtifacts('stored.txt');

        $this->assertFileDoesNotExist($qaDir . '/stored.txt');
        $this->assertFileDoesNotExist($qaDir . '/thumb/stored.txt');
        $this->assertFileDoesNotExist($qaDir . '/thumb-stored.txt');
        $this->assertFileDoesNotExist($qaDir . '/thumb-extra-stored.txt');
    }

    public function testValidateImageFileIfNeededRejectsBrokenImageAndRemovesFile(): void
    {
        $storage = new QaAttachmentStorage();
        $path = $this->tempRoot . '/broken.png';
        file_put_contents($path, 'not-a-real-image');

        try {
            $storage->validateImageFileIfNeeded('broken.png', $path);
            self::fail('ApiException was not thrown.');
        } catch (ApiException $exception) {
            self::assertSame('이미지/플래시 파일이 유효하지 않습니다.', $exception->getMessage());
        }

        $this->assertFileDoesNotExist($path);
    }

    public function testValidateImageFileIfNeededSkipsNonImageAndAcceptsValidImage(): void
    {
        $storage = new QaAttachmentStorage();
        $textPath = $this->tempRoot . '/note.txt';
        file_put_contents($textPath, 'plain text');

        $storage->validateImageFileIfNeeded('note.txt', $textPath);
        $this->assertFileExists($textPath);

        $imagePath = $this->tempRoot . '/real.png';
        $this->writeTinyPng($imagePath);

        $storage->validateImageFileIfNeeded('real.png', $imagePath);
        $this->assertFileExists($imagePath);
    }

    private function setEnv(string $key, string $value): void
    {
        if (!array_key_exists($key, $this->envBackup)) {
            $this->envBackup[$key] = array_key_exists($key, $_ENV) ? (string)$_ENV[$key] : null;
        }

        $_ENV[$key] = $value;
        putenv($key . '=' . $value);
    }

    private function writeTinyPng(string $path): void
    {
        $pngBinary = base64_decode(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Y2wAAAABJRU5ErkJggg==',
            true
        );
        if (!is_string($pngBinary)) {
            self::fail('png decode failed');
        }

        file_put_contents($path, $pngBinary);
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
