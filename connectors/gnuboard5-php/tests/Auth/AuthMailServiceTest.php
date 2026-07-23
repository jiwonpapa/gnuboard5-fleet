<?php

declare(strict_types=1);

namespace Api\Auth\Service {
    function mail(string $to, string $subject, string $message, string $additionalHeaders = ''): bool
    {
        return false;
    }
}

namespace Tests\Auth {
    use Api\Auth\Service\AuthMailService;
    use Api\Core\Config\EnvConfig;
    use PHPUnit\Framework\TestCase;
    use Psr\Log\LoggerInterface;

    final class AuthMailServiceTest extends TestCase
    {
        public function testSendPasswordResetEmailSkipsWhenMailSendingIsDisabled(): void
        {
            $logger = $this->createMock(LoggerInterface::class);
            $logger->expects($this->never())->method('warning');

            $service = new AuthMailService($this->createEnvConfig(false), $logger);
            $service->sendPasswordResetEmail('user@example.com', 'user1', 'token-123');

            $this->addToAssertionCount(1);
        }

        public function testSendEmailVerifyEmailSkipsInvalidRecipient(): void
        {
            $logger = $this->createMock(LoggerInterface::class);
            $logger->expects($this->never())->method('warning');

            $service = new AuthMailService($this->createEnvConfig(true), $logger);
            $service->sendEmailVerifyEmail('not-an-email', 'user1', 'token-123');

            $this->addToAssertionCount(1);
        }

        public function testSendAdminRegisterNoticeReturnsWhenAdminAddressIsMissing(): void
        {
            $logger = $this->createMock(LoggerInterface::class);
            $logger->expects($this->never())->method('warning');

            $service = new AuthMailService($this->createEnvConfig(true, '', '', ''), $logger);
            $service->sendAdminRegisterNotice('user1', 'user@example.com', '홍길동');

            $this->addToAssertionCount(1);
        }

        public function testSendPasswordResetEmailBuildsResetUrlAndLogsOnSendFailure(): void
        {
            $logger = $this->createMock(LoggerInterface::class);
            $logger->expects($this->once())
                ->method('warning')
                ->with(
                    '[auth] mail send failed',
                    $this->callback(static function (array $context): bool {
                        return $context['to'] === 'user@example.com'
                            && $context['subject'] === '비밀번호 재설정 안내';
                    })
                );

            $service = new AuthMailService(
                $this->createEnvConfig(true, 'https://example.com/reset', '', 'admin@example.com'),
                $logger
            );
            $service->sendPasswordResetEmail('user@example.com', 'user1', 'token-123');
        }

        private function createEnvConfig(
            bool $mailEnabled,
            string $passwordResetUrl = '',
            string $emailVerifyUrl = 'https://example.com/verify',
            string $adminEmail = 'admin@example.com'
        ): EnvConfig {
            return new EnvConfig(
                filePermission: 0644,
                dirPermission: 0755,
                encryptFunc: 'create_hash',
                dataPath: sys_get_temp_dir() . '/g5-api-auth-mail',
                nicknameCooldownDays: 30,
                passwordResetUrl: $passwordResetUrl,
                emailVerifyUrl: $emailVerifyUrl,
                uploadImageExtensions: 'jpg|jpeg|png|gif|webp|bmp',
                uploadFlashExtensions: 'swf',
                loginFailMaxAttempts: 5,
                loginFailWindowSeconds: 300,
                authExposeSensitiveTokens: false,
                authMailSendEnabled: $mailEnabled,
                authMailSubjectPrefix: '[G5 API]',
                authMailFrom: 'no-reply@example.com',
                authRegisterNotifyAdminEmail: $adminEmail,
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
    }
}
