<?php

declare(strict_types=1);

namespace Api\Notification\Repository;

final class NotificationSettingRepository extends NotificationRepositorySupport
{
    /**
     * @return array{receive_comment: bool, receive_message: bool, receive_notice: bool}
     */
    public function getSettings(string $memberId): array
    {
        $this->ensurePushSettingTable();
        $table = $this->tables()->get('push_setting');
        $row = $this->fetchAssociative(
            "SELECT ps_receive_comment, ps_receive_message, ps_receive_notice
             FROM {$table}
             WHERE mb_id = :mb_id
             LIMIT 1",
            ['mb_id' => $memberId]
        );

        if (!is_array($row)) {
            return [
                'receive_comment' => true,
                'receive_message' => true,
                'receive_notice' => true,
            ];
        }

        return [
            'receive_comment' => ((int)($row['ps_receive_comment'] ?? 1)) === 1,
            'receive_message' => ((int)($row['ps_receive_message'] ?? 1)) === 1,
            'receive_notice' => ((int)($row['ps_receive_notice'] ?? 1)) === 1,
        ];
    }

    /**
     * @param array{receive_comment: bool, receive_message: bool, receive_notice: bool} $settings
     * @return array{receive_comment: bool, receive_message: bool, receive_notice: bool}
     */
    public function saveSettings(string $memberId, array $settings, string $datetime): array
    {
        $this->ensurePushSettingTable();
        $table = $this->tables()->get('push_setting');
        $this->executeStatement(
            "INSERT INTO {$table}
                (mb_id, ps_receive_comment, ps_receive_message, ps_receive_notice, ps_datetime)
             VALUES
                (:mb_id, :ps_receive_comment, :ps_receive_message, :ps_receive_notice, :ps_datetime)
             ON DUPLICATE KEY UPDATE
                ps_receive_comment = VALUES(ps_receive_comment),
                ps_receive_message = VALUES(ps_receive_message),
                ps_receive_notice = VALUES(ps_receive_notice),
                ps_datetime = VALUES(ps_datetime)",
            [
                'mb_id' => $memberId,
                'ps_receive_comment' => $settings['receive_comment'] ? 1 : 0,
                'ps_receive_message' => $settings['receive_message'] ? 1 : 0,
                'ps_receive_notice' => $settings['receive_notice'] ? 1 : 0,
                'ps_datetime' => $datetime,
            ]
        );

        return $this->getSettings($memberId);
    }
}
