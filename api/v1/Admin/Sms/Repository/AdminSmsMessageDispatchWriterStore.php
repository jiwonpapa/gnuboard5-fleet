<?php

declare(strict_types=1);

namespace Api\Admin\Sms\Repository;

final class AdminSmsMessageDispatchWriterStore extends AdminSmsMessageStoreBase
{
    /**
     * @param array<string,mixed> $booking
     * @param array<string,mixed> $sendResults
     * @param array<string,mixed> $duplicateSummary
     */
    public function persistDispatch(
        int $writeNo,
        int $writeRenum,
        string $reply,
        string $message,
        array $booking,
        array $sendResults,
        array $duplicateSummary
    ): void {
        $this->queryBuilder()->beginTransaction();
        try {
            $this->executeStatement(
                "INSERT INTO {$this->writeTable()}
                    (wr_no, wr_renum, wr_reply, wr_message, wr_booking, wr_total, wr_re_total,
                     wr_success, wr_failure, wr_datetime, wr_memo)
                 VALUES
                    (:wr_no, :wr_renum, :wr_reply, :wr_message, :wr_booking, :wr_total, :wr_re_total,
                     :wr_success, :wr_failure, :wr_datetime, :wr_memo)",
                [
                    'wr_no' => $writeNo,
                    'wr_renum' => $writeRenum,
                    'wr_reply' => $reply,
                    'wr_message' => $message,
                    'wr_booking' => $booking['db_value'],
                    'wr_total' => count((array) ($sendResults['items'] ?? [])),
                    'wr_re_total' => 0,
                    'wr_success' => $sendResults['success'],
                    'wr_failure' => $sendResults['failure'],
                    'wr_datetime' => $this->now(),
                    'wr_memo' => $duplicateSummary['serialized'],
                ]
            );

            foreach ((array) ($sendResults['items'] ?? []) as $item) {
                if (!is_array($item)) {
                    continue;
                }

                $recipient = is_array($item['recipient'] ?? null) ? $item['recipient'] : [];
                $this->executeStatement(
                    "INSERT INTO {$this->historyTable()}
                        (wr_no, wr_renum, bg_no, mb_id, bk_no, hs_name, hs_hp, hs_datetime,
                         hs_flag, hs_code, hs_memo, hs_log)
                     VALUES
                        (:wr_no, :wr_renum, :bg_no, :mb_id, :bk_no, :hs_name, :hs_hp, :hs_datetime,
                         :hs_flag, :hs_code, :hs_memo, :hs_log)",
                    [
                        'wr_no' => $writeNo,
                        'wr_renum' => $writeRenum,
                        'bg_no' => (int) ($recipient['bg_no'] ?? 0),
                        'mb_id' => (string) ($recipient['mb_id'] ?? ''),
                        'bk_no' => (int) ($recipient['bk_no'] ?? 0),
                        'hs_name' => (string) ($recipient['bk_name'] ?? ''),
                        'hs_hp' => $this->formatMobilePhone((string) ($recipient['bk_hp'] ?? ''), true),
                        'hs_datetime' => $this->now(),
                        'hs_flag' => !empty($item['success']) ? 1 : 0,
                        'hs_code' => (string) ($item['code'] ?? ''),
                        'hs_memo' => (string) ($item['memo'] ?? ''),
                        'hs_log' => (string) ($item['log'] ?? ''),
                    ]
                );
            }

            if ($writeRenum > 0) {
                $this->executeStatement(
                    "UPDATE {$this->writeTable()}
                     SET wr_re_total = wr_re_total + 1
                     WHERE wr_no = :wr_no AND wr_renum = 0",
                    ['wr_no' => $writeNo]
                );
            }

            $this->queryBuilder()->commit();
        } catch (\Throwable $e) {
            $this->queryBuilder()->rollback();
            throw $e;
        }
    }
}
