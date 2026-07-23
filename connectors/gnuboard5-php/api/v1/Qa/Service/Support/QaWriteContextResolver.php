<?php

declare(strict_types=1);

namespace Api\Qa\Service\Support;

use Api\Qa\Contracts\QaGateway;
use Api\Qa\Service\QaInputService;
use Api\Support\Exception\ApiException;

final class QaWriteContextResolver
{
    public function __construct(
        private readonly QaGateway $qaGateway,
        private readonly QaInputService $inputService
    ) {
    }

    /**
     * @param array<string, mixed> $member
     * @return array<string, mixed>
     */
    public function resolveAnswerParent(int $parentQaId, array $member): array
    {
        $safeParentQaId = $this->inputService->normalizePositiveInt($parentQaId, 'qa_id', 1);
        $memberId = $this->inputService->requireMemberId($member);
        $this->inputService->assertAdmin($member);

        $parent = $this->qaGateway->getById($safeParentQaId, $memberId, true);
        if (!is_array($parent)) {
            throw ApiException::notFound('원질문을 찾을 수 없습니다.');
        }
        if ((int)($parent['qa_type'] ?? 0) === 1) {
            throw ApiException::forbidden('답변글에는 다시 답변을 등록할 수 없습니다.');
        }

        return $parent;
    }

    /**
     * @param array<string, mixed> $member
     * @return array{origin:array<string, mixed>,related_qa_id:int}
     */
    public function resolveRelatedQuestionBase(int $qaId, array $member): array
    {
        $safeQaId = $this->inputService->normalizePositiveInt($qaId, 'qa_id', 1);
        $memberId = $this->inputService->requireMemberId($member);
        $isAdmin = $this->inputService->isAdmin($member);

        $origin = $this->qaGateway->getById($safeQaId, $memberId, $isAdmin);
        if (!is_array($origin)) {
            throw ApiException::notFound('원문의 글을 찾을 수 없습니다.');
        }

        $relatedQaId = (int)($origin['qa_related'] ?? 0);
        if ($relatedQaId <= 0) {
            $relatedQaId = (int)($origin['qa_id'] ?? 0);
        }
        if ($relatedQaId <= 0) {
            throw ApiException::badRequest('연관 질문 기준값이 유효하지 않습니다.');
        }

        return [
            'origin' => $origin,
            'related_qa_id' => $relatedQaId,
        ];
    }
}
