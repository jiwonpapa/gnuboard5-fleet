<?php

declare(strict_types=1);

namespace Api\Admin\Sms\Repository;

final class AdminSmsContactQueryStore extends AdminSmsContactStoreBase
{
    /**
     * @return array{total:int,items:array<int,array<string,mixed>>,summary:array<string,mixed>}
     */
    public function listContacts(
        int $page,
        int $perPage,
        ?int $groupId,
        string $searchField,
        string $search,
        bool $withPhoneOnly
    ): array {
        $this->requireContactStorage('SMS 연락처 조회');
        $table = $this->contactTable();
        $groupTable = $this->contactGroupTable();
        $where = ' WHERE 1=1 ';
        $params = [];

        if ($groupId !== null) {
            $where .= ' AND b.bg_no = :bg_no ';
            $params['bg_no'] = $groupId;
        }

        if ($withPhoneOnly) {
            $where .= " AND b.bk_hp <> '' ";
        }

        $searchTerm = trim($search);
        if ($searchTerm !== '') {
            switch ($searchField) {
                case 'name':
                    $where .= ' AND b.bk_name LIKE :search ';
                    break;
                case 'hp':
                    $where .= ' AND b.bk_hp LIKE :search ';
                    break;
                default:
                    $where .= ' AND (b.bk_name LIKE :search OR b.bk_hp LIKE :search) ';
                    break;
            }
            $params['search'] = '%' . $searchTerm . '%';
        }

        $countRow = $this->fetchAssociative(
            "SELECT COUNT(*) AS cnt FROM {$table} b {$where}",
            $params
        );
        $total = (int)($countRow['cnt'] ?? 0);
        $offset = ($page - 1) * $perPage;

        $items = $this->fetchAllAssociative(
            "SELECT
                b.bk_no,
                b.bg_no,
                g.bg_name,
                b.mb_id,
                b.bk_name,
                b.bk_hp,
                b.bk_receipt,
                b.bk_datetime,
                b.bk_memo
             FROM {$table} b
             LEFT JOIN {$groupTable} g ON g.bg_no = b.bg_no
             {$where}
             ORDER BY b.bk_no DESC
             LIMIT {$perPage} OFFSET {$offset}",
            $params
        );

        foreach ($items as &$item) {
            $item['bg_name'] = (string)($item['bg_name'] ?? '');
            $item['receipt_label'] = ((int)($item['bk_receipt'] ?? 0) === 1) ? '수신' : '거부';
            $item['member_type'] = trim((string)($item['mb_id'] ?? '')) === '' ? 'non_member' : 'member';
        }
        unset($item);

        $summaryRow = $this->fetchAssociative(
            "SELECT
                COUNT(*) AS total_count,
                SUM(CASE WHEN bk_receipt = 1 THEN 1 ELSE 0 END) AS receipt_count,
                SUM(CASE WHEN COALESCE(mb_id, '') <> '' THEN 1 ELSE 0 END) AS member_count
             FROM {$table} b
             {$where}",
            $params
        );

        return [
            'total' => $total,
            'items' => $items,
            'summary' => [
                'total_count' => (int)($summaryRow['total_count'] ?? 0),
                'receipt_count' => (int)($summaryRow['receipt_count'] ?? 0),
                'reject_count' => max(
                    0,
                    (int)($summaryRow['total_count'] ?? 0) - (int)($summaryRow['receipt_count'] ?? 0)
                ),
                'member_count' => (int)($summaryRow['member_count'] ?? 0),
                'non_member_count' => max(
                    0,
                    (int)($summaryRow['total_count'] ?? 0) - (int)($summaryRow['member_count'] ?? 0)
                ),
                'last_synced_at' => $this->tableExists($this->smsConfigTable())
                    ? (string)($this->fetchAssociative(
                        "SELECT cf_datetime FROM {$this->smsConfigTable()} LIMIT 1"
                    )['cf_datetime'] ?? '')
                    : '',
            ],
        ];
    }

    /**
     * @return array<string,mixed>|null
     */
    public function findContact(int $contactId): ?array
    {
        $this->requireContactStorage('SMS 연락처 조회');
        $row = $this->fetchAssociative(
            "SELECT
                b.bk_no,
                b.bg_no,
                g.bg_name,
                b.mb_id,
                b.bk_name,
                b.bk_hp,
                b.bk_receipt,
                b.bk_datetime,
                b.bk_memo
             FROM {$this->contactTable()} b
             LEFT JOIN {$this->contactGroupTable()} g ON g.bg_no = b.bg_no
             WHERE b.bk_no = :bk_no
             LIMIT 1",
            ['bk_no' => $contactId]
        );

        return is_array($row) ? $row : null;
    }

    public function findContactByPhone(string $phone, ?int $excludeId = null): ?array
    {
        $this->requireContactStorage('SMS 연락처 조회');
        $sql = "SELECT bk_no, bg_no, mb_id, bk_name, bk_hp, bk_receipt FROM {$this->contactTable()} WHERE bk_hp = :bk_hp";
        $params = ['bk_hp' => $phone];
        if ($excludeId !== null) {
            $sql .= " AND bk_no <> :bk_no";
            $params['bk_no'] = $excludeId;
        }

        $row = $this->fetchAssociative($sql . ' LIMIT 1', $params);

        return is_array($row) ? $row : null;
    }

    public function findMemberByContactId(string $memberId, string $phone, ?string $excludeMemberId = null): ?string
    {
        $this->requireContactStorage('SMS 연락처 조회');
        $sql = "SELECT mb_id FROM {$this->memberTable()} WHERE mb_hp = :mb_hp";
        $params = ['mb_hp' => $phone];
        if ($excludeMemberId !== null && $excludeMemberId !== '') {
            $sql .= " AND mb_id <> :mb_id";
            $params['mb_id'] = $excludeMemberId;
        }

        $row = $this->fetchAssociative($sql . ' LIMIT 1', $params);

        return is_array($row) ? trim((string)($row['mb_id'] ?? '')) : null;
    }

    /**
     * @return array<int,array<string,mixed>>
     */
    public function exportContacts(?int $groupId, bool $includeNoPhone, bool $withHyphen): array
    {
        $this->requireContactStorage('SMS 연락처 내보내기');
        $where = ' WHERE 1=1 ';
        $params = [];
        if ($groupId !== null) {
            $where .= ' AND bg_no = :bg_no ';
            $params['bg_no'] = $groupId;
        }
        if (!$includeNoPhone) {
            $where .= " AND bk_hp <> '' ";
        }

        $rows = $this->fetchAllAssociative(
            "SELECT bk_name, bk_hp, bg_no, mb_id, bk_receipt
             FROM {$this->contactTable()}
             {$where}
             ORDER BY bk_name ASC, bk_no ASC",
            $params
        );

        foreach ($rows as &$row) {
            $row['bk_hp'] = $this->formatMobilePhone((string)($row['bk_hp'] ?? ''), $withHyphen);
        }
        unset($row);

        return $rows;
    }
}
