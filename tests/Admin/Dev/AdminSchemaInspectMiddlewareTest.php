<?php

declare(strict_types=1);

namespace Tests\Admin\Dev;

use Api\Admin\Dev\Middleware\AdminSchemaInspectMiddleware;
use Api\Admin\Dev\Support\AdminSchemaInspectSecretGuard;
use Api\Core\Config\EnvConfig;
use Api\Core\Exception\ForbiddenException;
use Api\Core\Exception\UnauthorizedException;
use PHPUnit\Framework\TestCase;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Psr7\Factory\ResponseFactory;
use Slim\Psr7\Factory\ServerRequestFactory;

final class AdminSchemaInspectMiddlewareTest extends TestCase
{
    public function testAllowsRequestWhenSecretMatches(): void
    {
        $middleware = new AdminSchemaInspectMiddleware(
            $this->createEnvConfig('inspect-secret'),
            new AdminSchemaInspectSecretGuard()
        );
        $request = (new ServerRequestFactory())
            ->createServerRequest('GET', '/api/v1/admin-inspect/schema/config')
            ->withHeader(AdminSchemaInspectSecretGuard::HEADER_NAME, 'inspect-secret');

        $response = $middleware->process($request, new DevOkHandler());

        self::assertSame(204, $response->getStatusCode());
    }

    public function testRejectsWhenSecretIsNotConfigured(): void
    {
        $middleware = new AdminSchemaInspectMiddleware(
            $this->createEnvConfig(''),
            new AdminSchemaInspectSecretGuard()
        );
        $request = (new ServerRequestFactory())->createServerRequest('GET', '/api/v1/admin-inspect/schema/config');

        $this->expectException(ForbiddenException::class);
        $this->expectExceptionMessage('관리자 스키마 검사 시크릿이 설정되지 않았습니다.');

        $middleware->process($request, new DevOkHandler());
    }

    public function testRejectsMissingOrWrongSecret(): void
    {
        $middleware = new AdminSchemaInspectMiddleware(
            $this->createEnvConfig('inspect-secret'),
            new AdminSchemaInspectSecretGuard()
        );

        $missingRequest = (new ServerRequestFactory())->createServerRequest('GET', '/api/v1/admin-inspect/schema/config');

        try {
            $middleware->process($missingRequest, new DevOkHandler());
            self::fail('Missing secret should throw.');
        } catch (UnauthorizedException $exception) {
            self::assertSame(
                AdminSchemaInspectSecretGuard::HEADER_NAME . ' 헤더가 필요합니다.',
                $exception->getMessage()
            );
        }

        $wrongRequest = (new ServerRequestFactory())
            ->createServerRequest('GET', '/api/v1/admin-inspect/schema/config')
            ->withHeader(AdminSchemaInspectSecretGuard::HEADER_NAME, 'wrong-secret');

        $this->expectException(UnauthorizedException::class);
        $this->expectExceptionMessage('유효한 관리자 스키마 검사 시크릿이 아닙니다.');

        $middleware->process($wrongRequest, new DevOkHandler());
    }

    private function createEnvConfig(string $secret): EnvConfig
    {
        return new EnvConfig(
            filePermission: 0644,
            dirPermission: 0755,
            encryptFunc: 'create_hash',
            dataPath: sys_get_temp_dir() . '/g5-admin-schema-inspect',
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
            pluginBoardRewardEnableGrant: false,
            adminSchemaInspectSecret: $secret
        );
    }
}

final class DevOkHandler implements RequestHandlerInterface
{
    public function handle(\Psr\Http\Message\ServerRequestInterface $request): ResponseInterface
    {
        return (new ResponseFactory())->createResponse(204);
    }
}
