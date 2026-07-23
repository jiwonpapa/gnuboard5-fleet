<?php

/**
 * NotificationService API module.
 *
 * @package  Gnuboard5\Api\v1\Notification\Service
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Notification\Service;

use Api\Core\DTO\NotificationLogDTO;
use Api\Core\DTO\PaginationDTO;
use Api\Core\Util\G5DateTime;
use Api\Notification\Repository\NotificationRepository;
use Api\Support\Exception\ApiException;

final class NotificationService
{
    public function __construct(private readonly NotificationRepository $repository)
    {
    }

    /**
     * @return array{items: array<int, array<string, mixed>>, pagination: array<string, mixed>}
     */
    public function listMyNotifications(array $member, int $page, int $perPage, ?string $cursor = null): array
    {
        $memberId = trim((string)($member['mb_id'] ?? ''));
        if ($memberId === '') {
            throw ApiException::unauthorized('인증 토큰이 필요합니다.');
        }

        $safePerPage = max(1, min(100, $perPage));
        if (trim((string)$cursor) !== '') {
            $result = $this->repository->listLogsByCursor($memberId, $safePerPage, $cursor);

            return [
                'items' => array_map(
                    static fn (NotificationLogDTO $item): array => $item->jsonSerialize(),
                    $result->items
                ),
                'pagination' => $result->pagination->jsonSerialize(),
            ];
        }

        $safePage = max(1, $page);
        $result = $this->repository->listLogs($memberId, $safePage, $safePerPage);

        return [
            'items' => $result['items'],
            'pagination' => PaginationDTO::create((int)($result['total'] ?? 0), $safePage, $safePerPage)->jsonSerialize(),
        ];
    }

    /**
     * @return array{receive_comment: bool, receive_message: bool, receive_notice: bool}
     */
    public function updateSettings(array $member, array $payload): array
    {
        $memberId = trim((string)($member['mb_id'] ?? ''));
        if ($memberId === '') {
            throw ApiException::unauthorized('인증 토큰이 필요합니다.');
        }

        if ($payload === []) {
            throw ApiException::badRequest('설정 payload가 비어 있습니다.');
        }

        $allowedKeys = ['receive_comment', 'receive_message', 'receive_notice'];
        foreach (array_keys($payload) as $key) {
            if (!in_array((string)$key, $allowedKeys, true)) {
                throw ApiException::badRequest('허용되지 않는 설정 키가 포함되어 있습니다.');
            }
        }

        $current = $this->repository->getSettings($memberId);
        $settings = [
            'receive_comment' => $this->resolveBool($payload, 'receive_comment', (bool)($current['receive_comment'] ?? true)),
            'receive_message' => $this->resolveBool($payload, 'receive_message', (bool)($current['receive_message'] ?? true)),
            'receive_notice' => $this->resolveBool($payload, 'receive_notice', (bool)($current['receive_notice'] ?? true)),
        ];

        return $this->repository->saveSettings($memberId, $settings, G5DateTime::now());
    }

    private function resolveBool(array $payload, string $key, bool $default): bool
    {
        if (!array_key_exists($key, $payload)) {
            return $default;
        }

        $raw = $payload[$key];
        if (!is_bool($raw) && !in_array($raw, [0, 1, '0', '1'], true)) {
            throw ApiException::badRequest($key . '은 boolean이어야 합니다.');
        }

        return (bool)$raw;
    }
}
