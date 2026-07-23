<?php

/**
 * AdminSystemMailDispatchService API module.
 *
 * @package  Gnuboard5\Api\v1\Admin\System\Service
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Admin\System\Service;

use Api\Admin\System\Repository\AdminSystemRepository;
use Api\Admin\System\Service\Support\AdminSystemMailDispatchConfig;
use Api\Admin\System\Service\Support\AdminSystemMailDispatchPayloadResolver;
use Api\Admin\System\Service\Support\AdminSystemMailTransport;
use Api\Core\Util\G5DateTime;
use Api\Support\Exception\ApiException;

final class AdminSystemMailDispatchService
{
    private ?AdminSystemMailDispatchPayloadResolver $resolvedPayloadResolver = null;
    private ?AdminSystemMailDispatchConfig $resolvedConfig = null;
    private ?AdminSystemMailTransport $resolvedTransport = null;

    public function __construct(
        private readonly AdminSystemRepository $repository,
        ?AdminSystemMailDispatchPayloadResolver $payloadResolver = null,
        ?AdminSystemMailDispatchConfig $config = null,
        ?AdminSystemMailTransport $transport = null
    ) {
        $this->resolvedPayloadResolver = $payloadResolver;
        $this->resolvedConfig = $config;
        $this->resolvedTransport = $transport;
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function sendMailTest(array $payload, string $ipAddress): array
    {
        $resolved = $this->payloadResolver()->resolveTestPayload($payload);
        $to = $resolved['to'];
        $subject = $resolved['subject'];
        $content = $resolved['content'];

        $mailId = $this->repository->createMailTestRecord(
            '[TEST] ' . $subject,
            $content,
            trim($ipAddress),
            [
                'to' => $to,
                'kind' => 'sendmail_test',
                'created_at' => G5DateTime::now(),
            ]
        );

        return [
            'sent' => true,
            'mail_log_id' => $mailId,
            'to' => $to,
        ];
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function sendMemberMail(array $payload, string $ipAddress): array
    {
        $resolved = $this->payloadResolver()->resolveMemberPayload($payload);
        $mailId = $resolved['ma_id'] ?? 0;
        $subject = $resolved['subject'];
        $content = $resolved['content'];
        $maillingOnly = $resolved['mailling_only'];
        $dryRun = $resolved['dry_run'];

        $recipients = $this->repository->findMailRecipientsByIds($resolved['member_ids'], $maillingOnly);
        if ($recipients === []) {
            throw ApiException::badRequest('발송 가능한 수신자가 없습니다.');
        }

        $enabled = $this->config()->mailEnabled();
        $sentCount = 0;
        $skipped = 0;
        $recipientSummaries = [];

        foreach ($recipients as $recipient) {
            $to = trim((string)($recipient['mb_email'] ?? ''));
            if ($to === '' || !filter_var($to, FILTER_VALIDATE_EMAIL)) {
                $skipped++;
                continue;
            }

            $memberId = trim((string)($recipient['mb_id'] ?? ''));
            $name = trim((string)($recipient['mb_name'] ?? ''));
            $nick = trim((string)($recipient['mb_nick'] ?? ''));

            $personalized = $this->personalizeMailContent($content, $memberId, $name, $nick, $to);
            $recipientSummaries[] = [
                'mb_id' => $memberId,
                'mb_email' => $to,
            ];

            if ($dryRun || !$enabled) {
                continue;
            }

            if ($this->transport()->send($to, $subject, $personalized)) {
                $sentCount++;
            } else {
                $skipped++;
            }
        }

        $recordId = $this->repository->createMailTestRecord(
            '[MEMBER_SEND] ' . $subject,
            $content,
            trim($ipAddress),
            [
                'kind' => 'member_send',
                'ma_id' => $mailId > 0 ? $mailId : null,
                'target_count' => count($recipients),
                'sent_count' => $dryRun || !$enabled ? 0 : $sentCount,
                'dry_run' => $dryRun,
                'mailling_only' => $maillingOnly,
                'created_at' => G5DateTime::now(),
            ]
        );

        return [
            'mail_log_id' => $recordId,
            'target_count' => count($recipients),
            'sent_count' => $dryRun || !$enabled ? 0 : $sentCount,
            'skipped_count' => $dryRun || !$enabled ? count($recipients) : $skipped,
            'mail_enabled' => $enabled,
            'dry_run' => $dryRun,
            'recipients' => $recipientSummaries,
        ];
    }

    private function personalizeMailContent(string $content, string $memberId, string $name, string $nick, string $email): string
    {
        return $this->payloadResolver()->personalize($content, $memberId, $name, $nick, $email);
    }

    private function payloadResolver(): AdminSystemMailDispatchPayloadResolver
    {
        if ($this->resolvedPayloadResolver instanceof AdminSystemMailDispatchPayloadResolver) {
            return $this->resolvedPayloadResolver;
        }

        $this->resolvedPayloadResolver = new AdminSystemMailDispatchPayloadResolver($this->repository, $this->config());

        return $this->resolvedPayloadResolver;
    }

    private function config(): AdminSystemMailDispatchConfig
    {
        if ($this->resolvedConfig instanceof AdminSystemMailDispatchConfig) {
            return $this->resolvedConfig;
        }

        $this->resolvedConfig = new AdminSystemMailDispatchConfig();

        return $this->resolvedConfig;
    }

    private function transport(): AdminSystemMailTransport
    {
        if ($this->resolvedTransport instanceof AdminSystemMailTransport) {
            return $this->resolvedTransport;
        }

        $this->resolvedTransport = new AdminSystemMailTransport($this->config());

        return $this->resolvedTransport;
    }
}
