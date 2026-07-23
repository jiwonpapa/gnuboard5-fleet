<?php

declare(strict_types=1);

namespace Api\Admin\Sms\Repository;

use Api\Admin\Sms\Support\LegacyIcodeTransport;
use Api\Admin\Sms\Support\SmsTransport;
use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;

final class AdminSmsMessageDispatchStore extends AdminSmsMessageStoreBase
{
    private ?SmsTransport $resolvedSmsTransport = null;
    private ?AdminSmsRecipientResolverStore $resolvedRecipientResolver = null;
    private ?AdminSmsMessageDispatchWriterStore $resolvedDispatchWriter = null;

    public function __construct(
        ?QueryBuilder $qb = null,
        ?TableRegistry $tables = null,
        ?SmsTransport $smsTransport = null,
        ?AdminSmsRecipientResolverStore $recipientResolver = null,
        ?AdminSmsMessageDispatchWriterStore $dispatchWriter = null
    ) {
        parent::__construct($qb, $tables);
        $this->resolvedSmsTransport = $smsTransport;
        $this->resolvedRecipientResolver = $recipientResolver;
        $this->resolvedDispatchWriter = $dispatchWriter;
    }

    /**
     * @param array<string,mixed> $payload
     * @param array<string,mixed> $config
     * @return array<string,mixed>
     */
    public function sendMessage(array $payload, array $config): array
    {
        $this->requireHistoryStorage('SMS 메시지 발송');
        $recipients = $this->recipientResolver()->resolveRecipients($payload);
        $message = $this->recipientResolver()->resolveMessageText($payload);
        $reply = trim((string)($payload['wr_reply'] ?? $payload['reply'] ?? $config['cf_phone'] ?? ''));
        $bookingAt = $payload['booking_at'] ?? null;

        return $this->dispatchMessage($config, $recipients, $message, $reply, $bookingAt, null, 0);
    }

    /**
     * @param array<string,mixed> $config
     * @return array<string,mixed>
     */
    public function resendMessageBatch(
        int $writeNo,
        int $sourceRenum,
        bool $onlyFailures,
        mixed $bookingAt,
        array $config
    ): array {
        $this->requireHistoryStorage('SMS 재전송');
        $write = $this->fetchAssociative(
            "SELECT wr_no, wr_renum, wr_reply, wr_message
             FROM {$this->writeTable()}
             WHERE wr_no = :wr_no AND wr_renum = :wr_renum
             LIMIT 1",
            [
                'wr_no' => $writeNo,
                'wr_renum' => $sourceRenum,
            ]
        );
        if (!is_array($write)) {
            throw new \RuntimeException('전송 묶음을 찾을 수 없습니다.');
        }

        $historyRows = $this->fetchAllAssociative(
            "SELECT bg_no, mb_id, bk_no, hs_name, hs_hp, hs_flag
             FROM {$this->historyTable()}
             WHERE wr_no = :wr_no AND wr_renum = :wr_renum
             ORDER BY hs_no ASC",
            [
                'wr_no' => $writeNo,
                'wr_renum' => $sourceRenum,
            ]
        );

        $recipients = [];
        foreach ($historyRows as $row) {
            if ($onlyFailures && (int)($row['hs_flag'] ?? 0) === 1) {
                continue;
            }

            $phone = $this->normalizeMobilePhone((string)($row['hs_hp'] ?? ''));
            if ($phone === '') {
                continue;
            }

            $recipients[] = [
                'bg_no' => (int)($row['bg_no'] ?? 0),
                'mb_id' => trim((string)($row['mb_id'] ?? '')),
                'bk_no' => (int)($row['bk_no'] ?? 0),
                'bk_name' => trim((string)($row['hs_name'] ?? '')),
                'bk_hp' => $phone,
            ];
        }

        return $this->dispatchMessage(
            $config,
            $recipients,
            (string)($write['wr_message'] ?? ''),
            (string)($write['wr_reply'] ?? ''),
            $bookingAt,
            $writeNo,
            $this->nextWriteRenum($writeNo)
        );
    }

    /**
     * @param array<string,mixed> $config
     * @param array<int,array<string,mixed>> $recipients
     * @return array<string,mixed>
     */
    private function dispatchMessage(
        array $config,
        array $recipients,
        string $message,
        string $reply,
        mixed $bookingAt,
        ?int $forcedWriteNo,
        int $writeRenum
    ): array {
        [$uniqueRecipients, $duplicateSummary] = $this->recipientResolver()->deduplicateRecipients($recipients);
        $writeNo = $forcedWriteNo ?? $this->nextWriteNo();
        $booking = $this->normalizeBookingAt($bookingAt);

        $sendResults = $this->smsTransport()->sendBatch(
            $config,
            $message,
            $reply,
            $uniqueRecipients,
            $booking['provider_key']
        );

        $this->dispatchWriter()->persistDispatch(
            $writeNo,
            $writeRenum,
            $reply,
            $message,
            $booking,
            $sendResults,
            $duplicateSummary
        );

        return [
            'write_no' => $writeNo,
            'write_renum' => $writeRenum,
            'reply' => $reply,
            'message' => $message,
            'booking_at' => $booking['api_value'],
            'total' => count($uniqueRecipients),
            'success' => $sendResults['success'],
            'failure' => $sendResults['failure'],
            'duplicate_summary' => $duplicateSummary['api'],
            'provider_ready' => $this->isProviderReady($config),
        ];
    }

    private function smsTransport(): SmsTransport
    {
        if ($this->resolvedSmsTransport instanceof SmsTransport) {
            return $this->resolvedSmsTransport;
        }

        $this->resolvedSmsTransport = new LegacyIcodeTransport();

        return $this->resolvedSmsTransport;
    }

    private function recipientResolver(): AdminSmsRecipientResolverStore
    {
        if ($this->resolvedRecipientResolver instanceof AdminSmsRecipientResolverStore) {
            return $this->resolvedRecipientResolver;
        }

        $this->resolvedRecipientResolver = new AdminSmsRecipientResolverStore($this->queryBuilder(), $this->tables());

        return $this->resolvedRecipientResolver;
    }

    private function dispatchWriter(): AdminSmsMessageDispatchWriterStore
    {
        if ($this->resolvedDispatchWriter instanceof AdminSmsMessageDispatchWriterStore) {
            return $this->resolvedDispatchWriter;
        }

        $this->resolvedDispatchWriter = new AdminSmsMessageDispatchWriterStore($this->queryBuilder(), $this->tables());

        return $this->resolvedDispatchWriter;
    }
}
