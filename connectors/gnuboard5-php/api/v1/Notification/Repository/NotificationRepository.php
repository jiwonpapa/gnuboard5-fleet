<?php

/**
 * NotificationRepository API module.
 *
 * @package  Gnuboard5\Api\v1\Notification\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Notification\Repository;

use Api\Core\DTO\CursorPaginatedResult;
use Api\Core\DTO\NotificationLogDTO;

final class NotificationRepository extends NotificationRepositorySupport
{
    private ?NotificationLogRepository $resolvedLogRepository = null;
    private ?NotificationSettingRepository $resolvedSettingRepository = null;

    public function __construct(
        ?\Api\Core\Database\QueryBuilder $qb = null,
        ?\Api\Core\Database\TableRegistry $tables = null,
        ?NotificationLogRepository $logRepository = null,
        ?NotificationSettingRepository $settingRepository = null
    ) {
        parent::__construct($qb, $tables);
        $this->resolvedLogRepository = $logRepository;
        $this->resolvedSettingRepository = $settingRepository;
    }

    /**
     * @return array{items: array<int, array<string, mixed>>, total: int}
     */
    public function listLogs(string $memberId, int $page, int $perPage): array
    {
        return $this->logRepository()->listLogs($memberId, $page, $perPage);
    }

    /**
     * @return CursorPaginatedResult<NotificationLogDTO>
     */
    public function listLogsByCursor(string $memberId, int $perPage, ?string $cursor): CursorPaginatedResult
    {
        return $this->logRepository()->listLogsByCursor($memberId, $perPage, $cursor);
    }

    /**
     * @return array{receive_comment: bool, receive_message: bool, receive_notice: bool}
     */
    public function getSettings(string $memberId): array
    {
        return $this->settingRepository()->getSettings($memberId);
    }

    /**
     * @param array{receive_comment: bool, receive_message: bool, receive_notice: bool} $settings
     * @return array{receive_comment: bool, receive_message: bool, receive_notice: bool}
     */
    public function saveSettings(string $memberId, array $settings, string $datetime): array
    {
        return $this->settingRepository()->saveSettings($memberId, $settings, $datetime);
    }

    private function logRepository(): NotificationLogRepository
    {
        if ($this->resolvedLogRepository instanceof NotificationLogRepository) {
            return $this->resolvedLogRepository;
        }

        $this->resolvedLogRepository = new NotificationLogRepository($this->queryBuilder(), $this->tables());

        return $this->resolvedLogRepository;
    }

    private function settingRepository(): NotificationSettingRepository
    {
        if ($this->resolvedSettingRepository instanceof NotificationSettingRepository) {
            return $this->resolvedSettingRepository;
        }

        $this->resolvedSettingRepository = new NotificationSettingRepository($this->queryBuilder(), $this->tables());

        return $this->resolvedSettingRepository;
    }
}
