<?php

/**
 * QaWriteService API module.
 *
 * @package  Gnuboard5\Api\v1\Qa\Service
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Qa\Service;

use Api\Qa\Contracts\QaGateway;
use Api\Qa\Service\Support\QaWriteContextResolver;
use Api\Qa\Service\Support\QaWritePayloadBuilder;
use Api\Support\Exception\ApiException;
use Psr\Http\Message\UploadedFileInterface;

final class QaWriteService
{
    private ?QaWritePayloadBuilder $resolvedPayloadBuilder = null;
    private ?QaWriteContextResolver $resolvedContextResolver = null;

    public function __construct(
        private readonly QaGateway $qaGateway,
        private readonly QaInputService $inputService,
        private readonly QaAttachmentService $attachmentService,
        private readonly QaReadService $readService,
        ?QaWritePayloadBuilder $payloadBuilder = null,
        ?QaWriteContextResolver $contextResolver = null
    ) {
        $this->resolvedPayloadBuilder = $payloadBuilder;
        $this->resolvedContextResolver = $contextResolver;
    }

    /**
     * @param array<string, mixed> $member
     * @param array<string, mixed> $payload
     * @param array<int|string, UploadedFileInterface> $uploadedFiles
     * @return array<string, mixed>
     */
    public function createQuestion(array $member, array $payload, array $uploadedFiles, string $ip): array
    {
        $memberId = $this->inputService->requireMemberId($member);
        $isAdmin = $this->inputService->isAdmin($member);
        $config = $this->qaGateway->getQaConfig();

        $category = $this->inputService->validateCategory((string)($payload['qa_category'] ?? ''), $config);
        $email = $this->inputService->normalizeEmail(
            array_key_exists('qa_email', $payload) ? (string)$payload['qa_email'] : '',
            (int)($config['qa_req_email'] ?? 0) === 1
        );

        $attachments = $this->attachmentService->processAttachments(
            $uploadedFiles,
            $this->attachmentService->emptyAttachmentSlots(),
            [1 => false, 2 => false],
            (int)($config['qa_upload_size'] ?? 0),
            $isAdmin,
            $ip
        );

        $qaId = $this->qaGateway->createQuestion($this->payloadBuilder()->buildQuestionPayload(
            $member,
            $memberId,
            $payload,
            $config,
            $attachments,
            $ip,
            $category,
            $email
        ));

        return $this->readService->detail($member, $qaId);
    }

    /**
     * @param array<string, mixed> $member
     * @param array<string, mixed> $payload
     * @param array<int|string, UploadedFileInterface> $uploadedFiles
     * @return array<string, mixed>
     */
    public function createAnswer(
        int $parentQaId,
        array $member,
        array $payload,
        array $uploadedFiles,
        string $ip
    ): array {
        $memberId = $this->inputService->requireMemberId($member);
        $parent = $this->contextResolver()->resolveAnswerParent($parentQaId, $member);
        $safeParentQaId = (int)($parent['qa_id'] ?? $parentQaId);

        $config = $this->qaGateway->getQaConfig();
        $attachments = $this->attachmentService->processAttachments(
            $uploadedFiles,
            $this->attachmentService->emptyAttachmentSlots(),
            [1 => false, 2 => false],
            (int)($config['qa_upload_size'] ?? 0),
            true,
            $ip
        );

        $answerId = $this->qaGateway->createAnswer($safeParentQaId, $this->payloadBuilder()->buildAnswerPayload(
            $member,
            $memberId,
            $payload,
            $parent,
            $attachments,
            $ip
        ));

        return $this->readService->detail($member, $answerId);
    }

    /**
     * @param array<string, mixed> $member
     * @param array<string, mixed> $payload
     * @param array<int|string, UploadedFileInterface> $uploadedFiles
     * @return array<string, mixed>
     */
    public function createRelatedQuestion(
        int $qaId,
        array $member,
        array $payload,
        array $uploadedFiles,
        string $ip
    ): array {
        $memberId = $this->inputService->requireMemberId($member);
        $isAdmin = $this->inputService->isAdmin($member);
        $config = $this->qaGateway->getQaConfig();

        $resolved = $this->contextResolver()->resolveRelatedQuestionBase($qaId, $member);
        $relatedQaId = $resolved['related_qa_id'];

        $category = $this->inputService->validateCategory((string)($payload['qa_category'] ?? ''), $config);
        $email = $this->inputService->normalizeEmail(
            array_key_exists('qa_email', $payload) ? (string)$payload['qa_email'] : '',
            (int)($config['qa_req_email'] ?? 0) === 1
        );

        $attachments = $this->attachmentService->processAttachments(
            $uploadedFiles,
            $this->attachmentService->emptyAttachmentSlots(),
            [1 => false, 2 => false],
            (int)($config['qa_upload_size'] ?? 0),
            $isAdmin,
            $ip
        );

        $createdQaId = $this->qaGateway->createRelatedQuestion($relatedQaId, $this->payloadBuilder()->buildQuestionPayload(
            $member,
            $memberId,
            $payload,
            $config,
            $attachments,
            $ip,
            $category,
            $email
        ));

        return $this->readService->detail($member, $createdQaId);
    }

    private function payloadBuilder(): QaWritePayloadBuilder
    {
        if ($this->resolvedPayloadBuilder instanceof QaWritePayloadBuilder) {
            return $this->resolvedPayloadBuilder;
        }

        $this->resolvedPayloadBuilder = new QaWritePayloadBuilder($this->inputService);

        return $this->resolvedPayloadBuilder;
    }

    private function contextResolver(): QaWriteContextResolver
    {
        if ($this->resolvedContextResolver instanceof QaWriteContextResolver) {
            return $this->resolvedContextResolver;
        }

        $this->resolvedContextResolver = new QaWriteContextResolver($this->qaGateway, $this->inputService);

        return $this->resolvedContextResolver;
    }
}
