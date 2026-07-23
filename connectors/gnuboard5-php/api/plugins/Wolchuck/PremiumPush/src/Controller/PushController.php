<?php

/**
 * PushController API module.
 *
 * @package  Gnuboard5\Api\Plugins\Wolchuck\PremiumPush\Controller
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Plugins\Wolchuck\PremiumPush\Controller;

use Api\Plugins\Wolchuck\PremiumPush\Service\PushNotificationService;
use Api\Support\Http\ApiResponse;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class PushController
{
    public function __construct(private readonly PushNotificationService $pushService)
    {
    }

    public function status(Request $request, Response $response): Response
    {
        return ApiResponse::json($response, [
            'plugin' => 'premium-push',
            'status' => 'ready',
            'license_required_for' => ['/send'],
        ]);
    }

    public function send(Request $request, Response $response): Response
    {
        $payload = ApiResponse::parseJsonBody($request);
        $target = trim((string)($payload['target'] ?? 'all'));
        $message = trim((string)($payload['message'] ?? 'Premium push demo'));

        return ApiResponse::json($response, $this->pushService->sendToMember($target, $message));
    }
}
