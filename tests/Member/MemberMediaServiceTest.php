<?php

declare(strict_types=1);

namespace Tests\Member;

use Api\Core\Config\EnvConfig;
use Api\Integration\Contracts\MemberGateway;
use Api\Member\Service\MemberImageManager;
use Api\Member\Service\MemberMediaService;
use Api\Support\Exception\ApiException;
use PHPUnit\Framework\TestCase;
use Slim\Psr7\UploadedFile;

final class MemberMediaServiceTest extends TestCase
{
    /** @var array<string, string|null> */
    private array $envBackup = [];
    private string $tempRoot = '';

    protected function setUp(): void
    {
        parent::setUp();
        $this->tempRoot = sys_get_temp_dir() . '/g5-api-member-media-' . uniqid('', true);
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

    public function testUploadMyIconRequiresAuthenticatedExistingMemberAndEnabledConfig(): void
    {
        $gateway = $this->createMock(MemberGateway::class);
        $service = $this->createService($gateway);

        try {
            $service->uploadMyIcon([], null);
            self::fail('ApiException was not thrown.');
        } catch (ApiException $exception) {
            self::assertSame('인증 토큰이 필요합니다.', $exception->getMessage());
        }

        $gateway->method('findById')->willReturn(null);

        try {
            $service->uploadMyIcon(['mb_id' => 'user1'], null);
            self::fail('ApiException was not thrown.');
        } catch (ApiException $exception) {
            self::assertSame('회원을 찾을 수 없습니다.', $exception->getMessage());
        }

        $disabledGateway = $this->createMock(MemberGateway::class);
        $disabledGateway->method('findById')->willReturn(['mb_id' => 'user1']);
        $disabledGateway->method('getMemberImageConfig')->willReturn(['cf_use_member_icon' => 0]);

        try {
            $this->createService($disabledGateway)->uploadMyIcon(['mb_id' => 'user1'], null);
            self::fail('ApiException was not thrown.');
        } catch (ApiException $exception) {
            self::assertSame('회원 아이콘 업로드가 비활성화되어 있습니다.', $exception->getMessage());
        }
    }

    public function testUploadAndDeleteIconAndProfileImageSucceed(): void
    {
        $gateway = $this->createMock(MemberGateway::class);
        $gateway->method('findById')->willReturn(['mb_id' => 'user1']);
        $gateway->method('getMemberImageConfig')->willReturn([
            'cf_use_member_icon' => 1,
            'cf_member_icon_size' => 1024 * 1024,
            'cf_member_icon_width' => 80,
            'cf_member_icon_height' => 80,
            'cf_member_img_size' => 1024 * 1024,
            'cf_member_img_width' => 120,
            'cf_member_img_height' => 120,
        ]);

        $service = $this->createService($gateway);

        $icon = $service->uploadMyIcon(['mb_id' => 'user1'], $this->createUploadedPng('icon.png', 50, 50));
        $image = $service->uploadMyImage(['mb_id' => 'user1'], $this->createUploadedPng('profile.png', 60, 60));

        $this->assertSame('member/us/user1.gif', $icon['relative_path']);
        $this->assertSame('member_image/us/user1.gif', $image['relative_path']);
        $this->assertFileExists($this->tempRoot . '/member/us/user1.gif');
        $this->assertFileExists($this->tempRoot . '/member_image/us/user1.gif');

        $deletedIcon = $service->deleteMyIcon(['mb_id' => 'user1']);
        $deletedImage = $service->deleteMyImage(['mb_id' => 'user1']);

        $this->assertTrue((bool)$deletedIcon['deleted']);
        $this->assertTrue((bool)$deletedImage['deleted']);
    }

    public function testUploadMyImageRejectsDisabledConfig(): void
    {
        $gateway = $this->createMock(MemberGateway::class);
        $gateway->method('findById')->willReturn(['mb_id' => 'user1']);
        $gateway->method('getMemberImageConfig')->willReturn([
            'cf_member_img_size' => 0,
            'cf_member_img_width' => 120,
            'cf_member_img_height' => 120,
        ]);

        try {
            $this->createService($gateway)->uploadMyImage(['mb_id' => 'user1'], null);
            self::fail('ApiException was not thrown.');
        } catch (ApiException $exception) {
            self::assertSame('회원 프로필 이미지 업로드가 비활성화되어 있습니다.', $exception->getMessage());
        }
    }

    private function createService(MemberGateway $gateway): MemberMediaService
    {
        return new MemberMediaService($gateway, new MemberImageManager($this->createEnvConfig()));
    }

    private function createEnvConfig(): EnvConfig
    {
        return new EnvConfig(
            filePermission: 0644,
            dirPermission: 0755,
            encryptFunc: 'create_hash',
            dataPath: $this->tempRoot,
            nicknameCooldownDays: 30,
            passwordResetUrl: '',
            emailVerifyUrl: '',
            uploadImageExtensions: 'jpg|jpeg|png|gif|webp|bmp',
            uploadFlashExtensions: 'swf',
            loginFailMaxAttempts: 5,
            loginFailWindowSeconds: 300,
            authExposeSensitiveTokens: false,
            authMailSendEnabled: false,
            authMailSubjectPrefix: '[G5 API]',
            authMailFrom: 'no-reply@example.com',
            authRegisterNotifyAdminEmail: '',
            authAutoRehashOnLogin: true,
            authPasswordResetTtlSeconds: 1800,
            authEmailVerifyTtlSeconds: 86400,
            unknownIpFallback: 'unknown',
            prohibitMemberIds: 'admin,administrator',
            prohibitEmailDomains: '',
            prohibitMemberNicks: '',
            pluginBoardRewardEnableGrant: false
        );
    }

    private function createUploadedPng(string $clientFilename, int $width, int $height): UploadedFile
    {
        $tmpFile = tempnam($this->tempRoot, 'member_media_');
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
