<?php

declare(strict_types=1);

namespace Api\Admin\Sms\Repository;

final class AdminSmsMessageListStore extends AdminSmsMessageStoreBase
{
    /**
     * @return array{total:int,items:array<int,array<string,mixed>>}
     */
    public function listMessageBatches(int $page, int $perPage, string $search): array
    {
        $this->requireHistoryStorage('SMS 발송 이력 조회');
        $table = $this->writeTable();
        $where = ' WHERE wr_renum = 0 ';
        $params = [];
        if (trim($search) !== '') {
            $where .= ' AND wr_message LIKE :search ';
            $params['search'] = '%' . trim($search) . '%';
        }

        $countRow = $this->fetchAssociative(
            "SELECT COUNT(*) AS cnt FROM {$table}{$where}",
            $params
        );
        $total = (int)($countRow['cnt'] ?? 0);
        $offset = ($page - 1) * $perPage;

        $items = $this->fetchAllAssociative(
            "SELECT wr_no, wr_renum, wr_reply, wr_message, wr_booking, wr_total, wr_re_total,
                    wr_success, wr_failure, wr_datetime, wr_memo
             FROM {$table}{$where}
             ORDER BY wr_no DESC
             LIMIT {$perPage} OFFSET {$offset}",
            $params
        );

        foreach ($items as &$item) {
            $item['duplicate_summary'] = $this->parseDuplicateMemo((string)($item['wr_memo'] ?? ''));
        }
        unset($item);

        return [
            'total' => $total,
            'items' => $items,
        ];
    }

    /**
     * @return array{total:int,items:array<int,array<string,mixed>>}
     */
    public function listDeliveries(int $page, int $perPage, string $searchField, string $search): array
    {
        $this->requireHistoryStorage('SMS 발송 상세 조회', true);
        $historyTable = $this->historyTable();
        $groupTable = $this->contactGroupTable();
        $writeTable = $this->writeTable();
        $where = ' WHERE 1=1 ';
        $params = [];

        if (trim($search) !== '') {
            switch ($searchField) {
                case 'name':
                    $where .= ' AND h.hs_name LIKE :search ';
                    break;
                case 'bk_no':
                    $where .= ' AND CAST(h.bk_no AS CHAR) LIKE :search ';
                    break;
                default:
                    $where .= ' AND h.hs_hp LIKE :search ';
                    break;
            }
            $params['search'] = '%' . trim($search) . '%';
        }

        $countRow = $this->fetchAssociative(
            "SELECT COUNT(*) AS cnt FROM {$historyTable} h{$where}",
            $params
        );
        $total = (int)($countRow['cnt'] ?? 0);
        $offset = ($page - 1) * $perPage;

        $items = $this->fetchAllAssociative(
            "SELECT
                h.hs_no,
                h.wr_no,
                h.wr_renum,
                h.bg_no,
                g.bg_name,
                h.mb_id,
                h.bk_no,
                h.hs_name,
                h.hs_hp,
                h.hs_datetime,
                h.hs_flag,
                h.hs_code,
                h.hs_memo,
                h.hs_log,
                w.wr_message,
                w.wr_datetime,
                w.wr_booking
             FROM {$historyTable} h
             LEFT JOIN {$groupTable} g ON g.bg_no = h.bg_no
             LEFT JOIN {$writeTable} w
                    ON w.wr_no = h.wr_no AND w.wr_renum = 0
             {$where}
             ORDER BY h.hs_no DESC
             LIMIT {$perPage} OFFSET {$offset}",
            $params
        );

        return [
            'total' => $total,
            'items' => $items,
        ];
    }
}
