<?php

/**
 * QaMutationService API module.
 *
 * @package  Gnuboard5\Api\v1\Qa\Service
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Qa\Service;

use Api\Qa\Contracts\QaGateway;
use Api\Support\Exception\ApiException;
use Psr\Http\Message\UploadedFileInterface;

final class QaMutationService
{
    public function __construct(
        private readonly QaGateway $qaGateway,
        private readonly QaInputService $inputService,
        private readonly QaAttachmentService $attachmentService,
        private readonly QaReadService $readService
    ) {
    }

    /**
     * @param array<string, mixed> $member
     * @param array<string, mixed> $payload
     * @param array<int|string, UploadedFileInterface> $uploadedFiles
     * @return array<string, mixed>
     */
    public function updateQuestion(
        int $qaId,
        array $member,
        array $payload,
        array $uploadedFiles,
        string $ip
    ): array {
        $safeQaId = $this->inputService->normalizePositiveInt($qaId, 'qa_id', 1);
        $memberId = $this->inputService->requireMemberId($member);
        $isAdmin = $this->inputService->isAdmin($member);
        $config = $this->qaGateway->getQaConfig();

        $qa = $this->qaGateway->getById($safeQaId, $memberId, $isAdmin);
        if (!is_array($qa)) {
            throw ApiException::notFound('문의글을 찾을 수 없습니다.');
        }

        if (!$isAdmin && (int)($qa['qa_type'] ?? 0) === 0 && (int)($qa['qa_status'] ?? 0) === 1) {
            throw ApiException::forbidden('답변이 등록된 문의글은 수정할 수 없습니다.');
        }

        $deleteFlags = $this->attachmentService->parseDeleteFlags($payload['bf_file_del'] ?? null);
        $existingAttachments = [
            1 => [
                'file' => (string)($qa['qa_file1'] ?? ''),
                'source' => (string)($qa['qa_source1'] ?? ''),
            ],
            2 => [
                'file' => (string)($qa['qa_file2'] ?? ''),
                'source' => (string)($qa['qa_source2'] ?? ''),
            ],
        ];
        $nextAttachments = $this->attachmentService->processAttachments(
            $uploadedFiles,
            $existingAttachments,
            $deleteFlags,
            (int)($config['qa_upload_size'] ?? 0),
            $isAdmin,
            $ip
        );

        $updates = [];
        if (array_key_exists('qa_category', $payload)) {
            $updates['qa_category'] = $this->inputService->validateCategory((string)$payload['qa_category'], $config);
        }
        if (array_key_exists('qa_email', $payload)) {
            $updates['qa_email'] = $this->inputService->normalizeEmail((string)$payload['qa_email'], false);
        } elseif ((int)($qa['qa_type'] ?? 0) === 0 && (int)($config['qa_req_email'] ?? 0) === 1) {
            $updates['qa_email'] = $this->inputService->normalizeEmail((string)($qa['qa_email'] ?? ''), true);
        }
        if (array_key_exists('qa_hp', $payload)) {
            $updates['qa_hp'] = $this->inputService->normalizePhone((string)$payload['qa_hp']);
        }
        if (array_key_exists('qa_subject', $payload)) {
            $updates['qa_subject'] = $this->inputService->sanitizeSubject((string)$payload['qa_subject']);
        }
        if (array_key_exists('qa_content', $payload)) {
            $updates['qa_content'] = $this->inputService->sanitizeContent((string)$payload['qa_content']);
        }
        if (array_key_exists('qa_html', $payload)) {
            $updates['qa_html'] = $this->inputService->toBoolInt($payload['qa_html']);
        }
        if (array_key_exists('qa_email_recv', $payload)) {
            $updates['qa_email_recv'] = $this->inputService->toBoolInt($payload['qa_email_recv']);
        }
        if (array_key_exists('qa_sms_recv', $payload)) {
            $updates['qa_sms_recv'] = $this->inputService->toBoolInt($payload['qa_sms_recv']);
        }

        if ($existingAttachments[1] !== $nextAttachments[1]) {
            $updates['qa_file1'] = $nextAttachments[1]['file'];
            $updates['qa_source1'] = $nextAttachments[1]['source'];
        }
        if ($existingAttachments[2] !== $nextAttachments[2]) {
            $updates['qa_file2'] = $nextAttachments[2]['file'];
            $updates['qa_source2'] = $nextAttachments[2]['source'];
        }

        if ($updates !== []) {
            $this->qaGateway->update($safeQaId, $updates);
        }

        return $this->readService->detail($member, $safeQaId);
    }

    /**
     * @param array<string, mixed> $member
     */
    public function deleteQuestion(int $qaId, array $member): void
    {
        $safeQaId = $this->inputService->normalizePositiveInt($qaId, 'qa_id', 1);
        $memberId = $this->inputService->requireMemberId($member);
        $this->qaGateway->delete($safeQaId, $memberId, $this->inputService->isAdmin($member));
    }

    /**
     * @param array<string, mixed> $member
     * @param array<int, mixed> $qaIds
     * @return array<string, mixed>
     */
    public function bulkDelete(array $member, array $qaIds): array
    {
        $this->inputService->assertAdmin($member);

        $safeQaIds = [];
        foreach ($qaIds as $qaId) {
            $value = is_numeric((string)$qaId) ? (int)$qaId : 0;
            if ($value > 0) {
                $safeQaIds[] = $value;
            }
        }
        $safeQaIds = array_values(array_unique($safeQaIds));
        if ($safeQaIds === []) {
            throw ApiException::badRequest('qa_ids에는 1개 이상의 유효한 qa_id가 필요합니다.');
        }

        $this->qaGateway->bulkDelete($safeQaIds);

        return [
            'deleted_count' => count($safeQaIds),
            'qa_ids' => $safeQaIds,
        ];
    }
}
