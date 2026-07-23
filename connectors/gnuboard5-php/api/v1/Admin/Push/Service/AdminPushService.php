<?php

/**
 * AdminPushService API module.
 *
 * @package  Gnuboard5\Api\v1\Admin\Push\Service
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Admin\Push\Service;

use Api\Admin\Push\Repository\AdminPushRepository;
use Api\Admin\Push\Service\Support\AdminPushInputNormalizer;
use Api\Core\Util\G5DateTime;

final class AdminPushService
{
    private readonly AdminPushInputNormalizer $inputNormalizer;

    public function __construct(
        private readonly AdminPushRepository $repository,
        ?AdminPushInputNormalizer $inputNormalizer = null,
    ) {
        $this->inputNormalizer = $inputNormalizer ?? new AdminPushInputNormalizer();
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    public function send(array $payload, string $actorId): array
    {
        $input = $this->inputNormalizer->normalize($payload);

        if ($input['target'] === 'all') {
            $memberIds = $this->repository->listAllMemberIds();
        } else {
            $memberIds = $input['member_ids'];
        }

        if ($memberIds === []) {
            throw \Api\Support\Exception\ApiException::badRequest('발송 대상이 없습니다.');
        }

        $result = $this->repository->queue(
            $input['title'],
            $input['body'],
            $input['type'],
            $memberIds,
            G5DateTime::now()
        );

        return [
            'requested_by' => $actorId,
            'target_count' => count($memberIds),
            'queued' => (int)($result['queued'] ?? 0),
            'failed' => (int)($result['failed'] ?? 0),
        ];
    }
}
