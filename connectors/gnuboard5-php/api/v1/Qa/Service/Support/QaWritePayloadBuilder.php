<?php

declare(strict_types=1);

namespace Api\Qa\Service\Support;

use Api\Qa\Service\QaInputService;

final class QaWritePayloadBuilder
{
    public function __construct(
        private readonly QaInputService $inputService
    ) {
    }

    /**
     * @param array<string, mixed> $member
     * @param array<string, mixed> $payload
     * @param array<string, mixed> $config
     * @param array<int, array{file:string,source:string}> $attachments
     * @return array<string, mixed>
     */
    public function buildQuestionPayload(
        array $member,
        string $memberId,
        array $payload,
        array $config,
        array $attachments,
        string $ip,
        string $category,
        string $email
    ): array {
        return [
            'mb_id' => $memberId,
            'qa_name' => $this->inputService->resolveQaName($member, $memberId),
            'qa_email' => $email,
            'qa_hp' => $this->inputService->normalizePhone((string)($payload['qa_hp'] ?? '')),
            'qa_category' => $category,
            'qa_email_recv' => $this->inputService->toBoolInt($payload['qa_email_recv'] ?? 0),
            'qa_sms_recv' => $this->inputService->toBoolInt($payload['qa_sms_recv'] ?? 0),
            'qa_html' => $this->inputService->toBoolInt($payload['qa_html'] ?? 0),
            'qa_subject' => $this->inputService->sanitizeSubject((string)($payload['qa_subject'] ?? '')),
            'qa_content' => $this->inputService->sanitizeContent((string)($payload['qa_content'] ?? '')),
            'qa_file1' => $attachments[1]['file'],
            'qa_source1' => $attachments[1]['source'],
            'qa_file2' => $attachments[2]['file'],
            'qa_source2' => $attachments[2]['source'],
            'qa_ip' => trim($ip),
        ];
    }

    /**
     * @param array<string, mixed> $member
     * @param array<string, mixed> $payload
     * @param array<string, mixed> $parent
     * @param array<int, array{file:string,source:string}> $attachments
     * @return array<string, mixed>
     */
    public function buildAnswerPayload(
        array $member,
        string $memberId,
        array $payload,
        array $parent,
        array $attachments,
        string $ip
    ): array {
        return [
            'mb_id' => $memberId,
            'qa_name' => $this->inputService->resolveQaName($member, $memberId),
            'qa_email' => $this->inputService->normalizeEmail((string)($payload['qa_email'] ?? ''), false),
            'qa_hp' => $this->inputService->normalizePhone((string)($payload['qa_hp'] ?? '')),
            'qa_category' => (string)($parent['qa_category'] ?? ''),
            'qa_html' => $this->inputService->toBoolInt($payload['qa_html'] ?? 0),
            'qa_subject' => $this->inputService->sanitizeSubject((string)($payload['qa_subject'] ?? '')),
            'qa_content' => $this->inputService->sanitizeContent((string)($payload['qa_content'] ?? '')),
            'qa_file1' => $attachments[1]['file'],
            'qa_source1' => $attachments[1]['source'],
            'qa_file2' => $attachments[2]['file'],
            'qa_source2' => $attachments[2]['source'],
            'qa_ip' => trim($ip),
        ];
    }
}
