<?php

/**
 * QaMutationRepository API module.
 *
 * @package  Gnuboard5\Api\v1\Qa\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Qa\Repository;

use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;
use Api\Support\Exception\ApiException;

final class QaMutationRepository extends QaRepositorySupport
{
    private ?QaDeleteRepository $resolvedDeleteRepository = null;
    private ?QaQuestionMutationRepository $resolvedQuestionRepository = null;
    private ?QaAnswerMutationRepository $resolvedAnswerRepository = null;

    public function __construct(
        ?QueryBuilder $qb = null,
        ?TableRegistry $tables = null,
        ?QaDeleteRepository $deleteRepository = null,
        ?QaQuestionMutationRepository $questionRepository = null,
        ?QaAnswerMutationRepository $answerRepository = null
    ) {
        parent::__construct($qb, $tables);
        $this->resolvedDeleteRepository = $deleteRepository;
        $this->resolvedQuestionRepository = $questionRepository;
        $this->resolvedAnswerRepository = $answerRepository;
    }

    public function createQuestion(array $data): int
    {
        return $this->questionRepository()->createQuestion($data);
    }

    public function createAnswer(int $parentQaId, array $data): int
    {
        return $this->answerRepository()->createAnswer($parentQaId, $data);
    }

    public function createRelatedQuestion(int $relatedQaId, array $data): int
    {
        $data['qa_related'] = $relatedQaId;
        return $this->createQuestion($data);
    }

    public function update(int $qaId, array $data): void
    {
        $this->questionRepository()->update($qaId, $data);
    }

    public function delete(int $qaId, string $memberId, bool $isAdmin): void
    {
        $this->deleteRepository()->delete($qaId, $memberId, $isAdmin);
    }

    public function bulkDelete(array $qaIds): void
    {
        $this->deleteRepository()->bulkDelete($qaIds);
    }

    private function questionRepository(): QaQuestionMutationRepository
    {
        if ($this->resolvedQuestionRepository instanceof QaQuestionMutationRepository) {
            return $this->resolvedQuestionRepository;
        }

        $this->resolvedQuestionRepository = new QaQuestionMutationRepository($this->queryBuilder(), $this->tables());

        return $this->resolvedQuestionRepository;
    }

    private function answerRepository(): QaAnswerMutationRepository
    {
        if ($this->resolvedAnswerRepository instanceof QaAnswerMutationRepository) {
            return $this->resolvedAnswerRepository;
        }

        $this->resolvedAnswerRepository = new QaAnswerMutationRepository($this->queryBuilder(), $this->tables());

        return $this->resolvedAnswerRepository;
    }

    private function deleteRepository(): QaDeleteRepository
    {
        if ($this->resolvedDeleteRepository instanceof QaDeleteRepository) {
            return $this->resolvedDeleteRepository;
        }

        $this->resolvedDeleteRepository = new QaDeleteRepository($this->queryBuilder(), $this->tables());

        return $this->resolvedDeleteRepository;
    }
}
