<?php

declare(strict_types=1);

namespace Api\Admin\Dev\Middleware;

use Api\Admin\Dev\Support\AdminSchemaInspectSecretGuard;
use Api\Core\Config\EnvConfig;
use Api\Core\Exception\ForbiddenException;
use Api\Core\Exception\UnauthorizedException;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;

final class AdminSchemaInspectMiddleware implements MiddlewareInterface
{
    public function __construct(
        private readonly EnvConfig $envConfig,
        private readonly AdminSchemaInspectSecretGuard $guard
    ) {
    }

    public function process(Request $request, RequestHandlerInterface $handler): Response
    {
        $expectedSecret = $this->guard->expectedSecret($this->envConfig);
        if (!$this->guard->isEnabled($expectedSecret)) {
            throw new ForbiddenException('관리자 스키마 검사 시크릿이 설정되지 않았습니다.');
        }

        $providedSecret = $this->guard->providedSecret($request);
        if ($providedSecret === '') {
            throw new UnauthorizedException(sprintf('%s 헤더가 필요합니다.', AdminSchemaInspectSecretGuard::HEADER_NAME));
        }

        if (!$this->guard->matches($expectedSecret, $providedSecret)) {
            throw new UnauthorizedException('유효한 관리자 스키마 검사 시크릿이 아닙니다.');
        }

        return $handler->handle($request);
    }
}
