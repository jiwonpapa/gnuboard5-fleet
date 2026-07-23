<?php

declare(strict_types=1);

namespace Api\Admin\Sms\Repository;

final class AdminSmsMessageDetailStore extends AdminSmsMessageStoreBase
{
    /**
     * @return array<string,mixed>|null
     */
    public function findMessageBatch(int $writeNo, int $writeRenum = 0): ?array
    {
        $this->requireHistoryStorage('SMS 발송 이력 조회');
        $batch = $this->fetchAssociative(
            "SELECT wr_no, wr_renum, wr_reply, wr_message, wr_booking, wr_total, wr_re_total,
                    wr_success, wr_failure, wr_datetime, wr_memo
             FROM {$this->writeTable()}
             WHERE wr_no = :wr_no AND wr_renum = :wr_renum
             LIMIT 1",
            [
                'wr_no' => $writeNo,
                'wr_renum' => $writeRenum,
            ]
        );

        if (!is_array($batch)) {
            return null;
        }

        $retryBatches = [];
        if ($writeRenum === 0) {
            $retryBatches = $this->fetchAllAssociative(
                "SELECT wr_no, wr_renum, wr_total, wr_success, wr_failure, wr_datetime
                 FROM {$this->writeTable()}
                 WHERE wr_no = :wr_no AND wr_renum > 0
                 ORDER BY wr_renum DESC",
                ['wr_no' => $writeNo]
            );
        }

        $batch['duplicate_summary'] = $this->parseDuplicateMemo((string)($batch['wr_memo'] ?? ''));
        $batch['retry_batches'] = $retryBatches;

        return $batch;
    }

    /**
     * @return array{total:int,items:array<int,array<string,mixed>>}
     */
    public function listBatchDeliveries(
        int $writeNo,
        int $writeRenum,
        int $page,
        int $perPage,
        string $searchField,
        string $search
    ): array {
        $this->requireHistoryStorage('SMS 발송 상세 조회', true);
        $groupTable = $this->contactGroupTable();
        $historyTable = $this->historyTable();
        $where = ' WHERE h.wr_no = :wr_no AND h.wr_renum = :wr_renum ';
        $params = [
            'wr_no' => $writeNo,
            'wr_renum' => $writeRenum,
        ];

        if (trim($search) !== '') {
            switch ($searchField) {
                case 'name':
                    $where .= ' AND h.hs_name LIKE :search ';
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
                h.hs_log
             FROM {$historyTable} h
             LEFT JOIN {$groupTable} g ON g.bg_no = h.bg_no
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
