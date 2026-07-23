<?php

/**
 * SetupController API module.
 *
 * @package  Gnuboard5\Api\v1\Setup\Controller
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Setup\Controller;

use Api\Core\Config\EnvValueReader;
use Api\Core\Exception\NotFoundException;
use Api\Setup\Service\EnvironmentChecker;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class SetupController
{
    public function __construct(
        private readonly EnvironmentChecker $checker
    ) {
    }

    public function index(Request $request, Response $response): Response
    {
        $enabled = strtolower(EnvValueReader::string('SETUP_ENABLED', 'false'));
        if (!in_array($enabled, ['1', 'true', 'yes', 'on'], true)) {
            throw new NotFoundException('설치 점검 엔드포인트가 비활성화되었습니다.');
        }

        $results = $this->checker->run();
        $serialized = array_map(
            static fn ($item): array => $item->toArray(),
            $results
        );
        $complete = array_reduce(
            $results,
            static fn (bool $carry, $item): bool => $carry && $item->passed,
            true
        );

        $payload = [
            'data' => [
                'checks' => $serialized,
                'setup_complete' => $complete,
            ],
            'meta' => [
                'server_time' => gmdate(DATE_ATOM),
                'version' => '1.0.0',
            ],
        ];

        $response->getBody()->write((string)json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

        return $response->withHeader('Content-Type', 'application/json; charset=utf-8');
    }
}
