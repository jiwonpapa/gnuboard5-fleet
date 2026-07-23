<?php

declare(strict_types=1);

namespace Tests\Member;

use Api\Member\Service\MemberImageManager;
use Api\Support\Exception\ApiException;
use PHPUnit\Framework\TestCase;
use Slim\Psr7\UploadedFile;

final class MemberImageManagerTest extends TestCase
{
    /** @var array<string, string|null> */
    private array $envBackup = [];
    private string $tempRoot = '';

    protected function setUp(): void
    {
        parent::setUp();
        $this->tempRoot = sys_get_temp_dir() . '/g5-api-member-image-' . uniqid('', true);
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

    public function testUploadAndDeleteIconSuccess(): void
    {
        $manager = new MemberImageManager();
        $uploaded = $this->createUploadedFileFromPng('icon.png');

        $result = $manager->upload('user01', $uploaded, 'member', 1024 * 1024, 80, 80);
        $this->assertSame('user01', $result['mb_id']);
        $this->assertSame('member/us/user01.gif', $result['relative_path']);
        $this->assertFileExists($this->tempRoot . '/member/us/user01.gif');
        $this->assertGreaterThan(0, (int)$result['width']);
        $this->assertGreaterThan(0, (int)$result['height']);

        $deleted = $manager->delete('user01', 'member');
        $this->assertTrue((bool)$deleted['deleted']);
    }

    public function testUploadRejectsInvalidExtension(): void
    {
        $manager = new MemberImageManager();
        $uploaded = $this->createUploadedFileFromPng('icon.txt');

        $this->expectException(ApiException::class);
        $manager->upload('user01', $uploaded, 'member', 1024 * 1024, 80, 80);
    }

    public function testUploadRejectsInvalidMemberIdAndMissingFile(): void
    {
        $manager = new MemberImageManager();

        try {
            $manager->upload('!', null, 'member', 1024 * 1024, 80, 80);
            self::fail('ApiException was not thrown.');
        } catch (ApiException $exception) {
            self::assertSame('mb_id 형식이 올바르지 않습니다.', $exception->getMessage());
        }

        try {
            $manager->upload('user01', null, 'member', 1024 * 1024, 80, 80);
            self::fail('ApiException was not thrown.');
        } catch (ApiException $exception) {
            self::assertSame('업로드 파일이 필요합니다.', $exception->getMessage());
        }
    }

    public function testUploadRejectsOversizedAndInvalidImageBinary(): void
    {
        $manager = new MemberImageManager();

        try {
            $manager->upload('user01', $this->createUploadedFileFromPng('icon.png'), 'member', 1, 80, 80);
            self::fail('ApiException was not thrown.');
        } catch (ApiException $exception) {
            self::assertSame('이미지 파일 용량이 제한을 초과했습니다.', $exception->getMessage());
        }

        $invalid = tempnam($this->tempRoot, 'invalid_');
        $this->assertIsString($invalid);
        file_put_contents($invalid, 'broken');
        $uploaded = new UploadedFile($invalid, 'broken.png', 'image/png', filesize($invalid) ?: null, UPLOAD_ERR_OK, false);

        try {
            $manager->upload('user01', $uploaded, 'member', 1024 * 1024, 80, 80);
            self::fail('ApiException was not thrown.');
        } catch (ApiException $exception) {
            self::assertSame('유효한 이미지 파일이 아닙니다.', $exception->getMessage());
        }
    }

    public function testUploadResizesLargePngAndDeleteMissingFileReturnsFalse(): void
    {
        $manager = new MemberImageManager();
        $uploaded = $this->createUploadedFileFromGeneratedPng('large.png', 160, 80);

        $result = $manager->upload('user02', $uploaded, 'member', 1024 * 1024, 80, 80);

        $this->assertSame('member/us/user02.gif', $result['relative_path']);
        $this->assertLessThanOrEqual(80, (int)$result['width']);
        $this->assertLessThanOrEqual(80, (int)$result['height']);

        $deleted = $manager->delete('user99', 'member');
        $this->assertFalse((bool)$deleted['deleted']);
    }

    private function createUploadedFileFromPng(string $clientFilename): UploadedFile
    {
        $tmpFile = tempnam($this->tempRoot, 'png_');
        if (!is_string($tmpFile)) {
            self::fail('temp file create failed');
        }

        $pngBinary = base64_decode(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Y2wAAAABJRU5ErkJggg==',
            true
        );
        if (!is_string($pngBinary)) {
            self::fail('png decode failed');
        }

        file_put_contents($tmpFile, $pngBinary);

        return new UploadedFile($tmpFile, $clientFilename, 'image/png', filesize($tmpFile) ?: null, UPLOAD_ERR_OK, false);
    }

    private function createUploadedFileFromGeneratedPng(string $clientFilename, int $width, int $height): UploadedFile
    {
        $tmpFile = tempnam($this->tempRoot, 'generated_png_');
        if (!is_string($tmpFile)) {
            self::fail('temp file create failed');
        }

        $image = imagecreatetruecolor($width, $height);
        if ($image === false) {
            self::fail('image create failed');
        }

        $white = imagecolorallocate($image, 255, 255, 255);
        if ($white === false) {
            $white = 0;
        }
        imagefilledrectangle($image, 0, 0, $width, $height, $white);
        imagepng($image, $tmpFile);

        return new UploadedFile($tmpFile, $clientFilename, 'image/png', filesize($tmpFile) ?: null, UPLOAD_ERR_OK, false);
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
