<?php

/**
 * AdminGuardMiddleware API module.
 *
 * @package  Gnuboard5\Api\v1\Core\Middleware
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Core\Middleware;

use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;
use Api\Core\Enum\MemberLevel;
use Api\Core\Exception\ForbiddenException;
use Api\Core\Exception\UnauthorizedException;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;

final class AdminGuardMiddleware implements MiddlewareInterface
{
    public function __construct(
        private readonly QueryBuilder $qb,
        private readonly TableRegistry $tables
    ) {
    }

    public function process(Request $request, RequestHandlerInterface $handler): Response
    {
        $member = $request->getAttribute('auth_member');
        if (!is_array($member) || !isset($member['mb_id'])) {
            throw new UnauthorizedException('인증 정보가 없습니다.');
        }

        $memberId = trim((string)$member['mb_id']);
        if ($memberId === '') {
            throw new UnauthorizedException('사용자 ID가 누락되었습니다.');
        }

        $level = isset($member['mb_level']) ? (int)$member['mb_level'] : null;
        if ($level === null) {
            $table = $this->tables->get('member');
            $row = $this->qb->executeQuery(
                "SELECT mb_level FROM {$table} WHERE mb_id = :mb_id LIMIT 1",
                ['mb_id' => $memberId]
            )->fetchAssociative();
            $level = (int)($row['mb_level'] ?? 0);
        }

        if (!MemberLevel::fromNumeric((int)$level)->isAdmin()) {
            throw new ForbiddenException('관리자 권한이 필요합니다.');
        }

        return $handler->handle($request);
    }
}
