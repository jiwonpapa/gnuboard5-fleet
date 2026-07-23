<?php

/**
 * PushNotificationService API module.
 *
 * @package  Gnuboard5\Api\Plugins\Wolchuck\PremiumPush\Service
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Plugins\Wolchuck\PremiumPush\Service;

final class PushNotificationService
{
    /**
     * @return array<string, string>
     */
    public function sendToMember(string $memberId, string $message): array
    {
        return [
            'status' => 'sent',
            'target' => $memberId === '' ? 'all' : $memberId,
            'message' => $message === '' ? 'Premium push demo' : $message,
        ];
    }
}
