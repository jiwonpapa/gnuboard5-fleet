<?php

declare(strict_types=1);

namespace Api\Admin\Sms\Repository;

use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;

final class AdminSmsContactWriteStore extends AdminSmsContactStoreBase
{
    private ?AdminSmsContactQueryStore $resolvedQueryStore = null;

    public function __construct(
        ?QueryBuilder $qb = null,
        ?TableRegistry $tables = null,
        ?AdminSmsContactQueryStore $queryStore = null
    ) {
        parent::__construct($qb, $tables);
        $this->resolvedQueryStore = $queryStore;
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function createContact(array $payload): array
    {
        $this->requireContactStorage('SMS 연락처 생성');
        $groupId = (int)($payload['bg_no'] ?? 1);
        $this->executeStatement(
            "INSERT INTO {$this->contactTable()}
                (bg_no, mb_id, bk_name, bk_hp, bk_receipt, bk_datetime, bk_memo)
             VALUES
                (:bg_no, :mb_id, :bk_name, :bk_hp, :bk_receipt, :bk_datetime, :bk_memo)",
            [
                'bg_no' => $groupId,
                'mb_id' => (string)($payload['mb_id'] ?? ''),
                'bk_name' => (string)$payload['bk_name'],
                'bk_hp' => (string)$payload['bk_hp'],
                'bk_receipt' => (int)$payload['bk_receipt'],
                'bk_datetime' => $this->now(),
                'bk_memo' => (string)($payload['bk_memo'] ?? ''),
            ]
        );

        $contactId = $this->lastInsertId();
        $this->syncAllContactGroupStats();

        return $this->queryStore()->findContact($contactId) ?? [];
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function updateContact(int $contactId, array $payload): array
    {
        $this->requireContactStorage('SMS 연락처 수정');
        $current = $this->queryStore()->findContact($contactId) ?? [];
        $groupId = array_key_exists('bg_no', $payload) ? (int)$payload['bg_no'] : (int)($current['bg_no'] ?? 1);
        $name = array_key_exists('bk_name', $payload) ? (string)$payload['bk_name'] : (string)($current['bk_name'] ?? '');
        $phone = array_key_exists('bk_hp', $payload) ? (string)$payload['bk_hp'] : (string)($current['bk_hp'] ?? '');
        $receipt = array_key_exists('bk_receipt', $payload) ? (int)$payload['bk_receipt'] : (int)($current['bk_receipt'] ?? 0);
        $memo = array_key_exists('bk_memo', $payload) ? (string)$payload['bk_memo'] : (string)($current['bk_memo'] ?? '');

        $this->executeStatement(
            "UPDATE {$this->contactTable()}
             SET bg_no = :bg_no,
                 bk_name = :bk_name,
                 bk_hp = :bk_hp,
                 bk_receipt = :bk_receipt,
                 bk_datetime = :bk_datetime,
                 bk_memo = :bk_memo
             WHERE bk_no = :bk_no",
            [
                'bg_no' => $groupId,
                'bk_name' => $name,
                'bk_hp' => $phone,
                'bk_receipt' => $receipt,
                'bk_datetime' => $this->now(),
                'bk_memo' => $memo,
                'bk_no' => $contactId,
            ]
        );

        $memberId = trim((string)($current['mb_id'] ?? ''));
        $memberSyncSkipped = false;
        if ($memberId !== '') {
            $duplicateMember = $this->queryStore()->findMemberByContactId($memberId, $phone, $memberId);
            if ($duplicateMember !== null && $duplicateMember !== '') {
                $memberSyncSkipped = true;
            } else {
                $this->executeStatement(
                    "UPDATE {$this->memberTable()}
                     SET mb_name = :mb_name,
                         mb_hp = :mb_hp,
                         mb_sms = :mb_sms
                     WHERE mb_id = :mb_id",
                    [
                        'mb_name' => $name,
                        'mb_hp' => $phone,
                        'mb_sms' => $receipt,
                        'mb_id' => $memberId,
                    ]
                );
            }
        }

        $this->syncAllContactGroupStats();

        $updated = $this->queryStore()->findContact($contactId) ?? [];
        $updated['member_sync_skipped'] = $memberSyncSkipped;

        return $updated;
    }

    public function deleteContact(int $contactId): int
    {
        $this->requireContactStorage('SMS 연락처 삭제');
        $affected = $this->executeStatement(
            "DELETE FROM {$this->contactTable()} WHERE bk_no = :bk_no",
            ['bk_no' => $contactId]
        );

        $this->syncAllContactGroupStats();

        return $affected;
    }

    private function queryStore(): AdminSmsContactQueryStore
    {
        return $this->resolvedQueryStore ??= new AdminSmsContactQueryStore($this->queryBuilder(), $this->tables());
    }
}
