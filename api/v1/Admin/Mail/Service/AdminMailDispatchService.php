<?php

declare(strict_types=1);

namespace Api\Admin\Mail\Service;

use Api\Admin\Mail\Repository\AdminMailRepository;
use Api\Admin\Mail\Service\Support\AdminMailDispatchConfig;
use Api\Admin\Mail\Service\Support\AdminMailDispatchPayloadResolver;
use Api\Admin\Mail\Service\Support\AdminMailMailer;
use Api\Core\Enum\MemberLevel;
use Api\Support\Exception\ApiException;

final class AdminMailDispatchService
{
    private ?AdminMailDispatchConfig $resolvedConfig = null;
    private ?AdminMailDispatchPayloadResolver $resolvedPayloadResolver = null;
    private ?AdminMailMailer $resolvedMailer = null;

    public function __construct(private readonly AdminMailRepository $repository)
    {
    }

    /**
     * @param array<string,mixed> $member
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function sendTest(array $member, array $payload, string $ipAddress): array
    {
        $this->assertSuperAdmin($member);
        $this->payloadResolver()->assertTestPayload($payload);

        $to = trim((string)($payload['to'] ?? ''));
        $mail = $this->payloadResolver()->resolveMailPayload($payload);
        if ($to === '' || filter_var($to, FILTER_VALIDATE_EMAIL) === false) {
            throw ApiException::badRequest('to 이메일 형식이 올바르지 않습니다.');
        }

        $enabled = $this->config()->mailEnabled();
        $sent = false;
        if ($enabled) {
            $sent = $this->mailer()->send($to, $mail['subject'], $mail['content']);
        }

        return [
            'ma_id' => $mail['ma_id'],
            'template_used' => $mail['ma_id'] !== null,
            'mail_enabled' => $enabled,
            'sent' => $enabled ? $sent : false,
            'to' => $to,
        ];
    }

    /**
     * @param array<string,mixed> $member
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function send(array $member, array $payload, string $ipAddress): array
    {
        $this->assertSuperAdmin($member);
        $this->payloadResolver()->assertSendPayload($payload);

        $mail = $this->payloadResolver()->resolveMailPayload($payload);
        $targetType = strtolower(trim((string)($payload['target_type'] ?? 'all')));
        if (!in_array($targetType, ['all', 'level', 'group', 'member'], true)) {
            throw ApiException::badRequest('target_type은 all/level/group/member만 허용됩니다.');
        }

        $levelMin = array_key_exists('level_min', $payload) ? (int)$payload['level_min'] : null;
        $levelMax = array_key_exists('level_max', $payload) ? (int)$payload['level_max'] : null;
        $groupId = array_key_exists('gr_id', $payload) ? trim((string)$payload['gr_id']) : null;
        $memberIdFrom = array_key_exists('member_id_from', $payload) ? trim((string)$payload['member_id_from']) : null;
        $memberIdTo = array_key_exists('member_id_to', $payload) ? trim((string)$payload['member_id_to']) : null;
        $emailContains = array_key_exists('email_contains', $payload) ? trim((string)$payload['email_contains']) : null;
        $maillingOnly = $this->payloadResolver()->toBool($payload['mailling_only'] ?? true, true);
        $dryRun = $this->payloadResolver()->toBool($payload['dry_run'] ?? false, false);
        $memberIds = $this->payloadResolver()->normalizeMemberIds($payload, $targetType);

        if ($targetType === 'group' && ($groupId === null || $groupId === '')) {
            throw ApiException::badRequest('target_type=group 일 때 gr_id는 필수입니다.');
        }

        $recipients = $this->repository->findRecipientsForSend(
            $targetType,
            $memberIds,
            $levelMin,
            $levelMax,
            $groupId,
            $maillingOnly,
            $memberIdFrom,
            $memberIdTo,
            $emailContains
        );

        if ($recipients === []) {
            throw ApiException::badRequest('발송 가능한 수신자가 없습니다.');
        }

        $enabled = $this->config()->mailEnabled();
        $sentCount = 0;
        $skippedCount = 0;
        $targets = [];

        foreach ($recipients as $recipient) {
            $to = trim((string)($recipient['mb_email'] ?? ''));
            if ($to === '' || filter_var($to, FILTER_VALIDATE_EMAIL) === false) {
                $skippedCount++;
                continue;
            }

            $memberId = trim((string)($recipient['mb_id'] ?? ''));
            $name = trim((string)($recipient['mb_name'] ?? ''));
            $nick = trim((string)($recipient['mb_nick'] ?? ''));
            $personalized = $this->payloadResolver()->personalize(
                $mail['content'],
                $memberId,
                $name,
                $nick,
                $to
            );
            $targets[] = [
                'mb_id' => $memberId,
                'mb_email' => $to,
            ];

            if ($dryRun || !$enabled) {
                continue;
            }

            if ($this->mailer()->send($to, $mail['subject'], $personalized)) {
                $sentCount++;
            } else {
                $skippedCount++;
            }
        }

        if ($mail['ma_id'] !== null) {
            $this->repository->saveLastOption($mail['ma_id'], $this->payloadResolver()->buildLastOption(
                $levelMin,
                $levelMax,
                $groupId,
                $memberIdFrom,
                $memberIdTo,
                $emailContains,
                $maillingOnly
            ));
        }

        return [
            'ma_id' => $mail['ma_id'],
            'template_used' => $mail['ma_id'] !== null,
            'target_count' => count($recipients),
            'sent_count' => $dryRun || !$enabled ? 0 : $sentCount,
            'skipped_count' => $dryRun || !$enabled ? count($recipients) : $skippedCount,
            'mail_enabled' => $enabled,
            'dry_run' => $dryRun,
            'targets' => $targets,
        ];
    }

    /**
     * @param array<string,mixed> $member
     */
    private function assertSuperAdmin(array $member): void
    {
        if (!MemberLevel::fromNumeric((int)($member['mb_level'] ?? 0))->isAdmin()) {
            throw ApiException::forbidden('최고관리자만 접근할 수 있습니다.');
        }
    }

    private function config(): AdminMailDispatchConfig
    {
        return $this->resolvedConfig ??= new AdminMailDispatchConfig();
    }

    private function payloadResolver(): AdminMailDispatchPayloadResolver
    {
        return $this->resolvedPayloadResolver ??= new AdminMailDispatchPayloadResolver($this->repository);
    }

    private function mailer(): AdminMailMailer
    {
        return $this->resolvedMailer ??= new AdminMailMailer($this->config());
    }
}
