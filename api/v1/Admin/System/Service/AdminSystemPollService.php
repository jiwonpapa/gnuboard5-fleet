<?php

/**
 * AdminSystemPollService API module.
 *
 * @package  Gnuboard5\Api\v1\Admin\System\Service
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Admin\System\Service;

use Api\Admin\System\Repository\AdminSystemRepository;
use Api\Core\Util\G5DateTime;
use Api\Support\Exception\ApiException;

final class AdminSystemPollService
{
    private const MUTABLE_FIELDS = [
        'po_subject',
        'po_poll1',
        'po_poll2',
        'po_poll3',
        'po_poll4',
        'po_poll5',
        'po_poll6',
        'po_poll7',
        'po_poll8',
        'po_poll9',
        'po_etc',
        'po_level',
        'po_point',
        'po_use',
    ];

    private const INTEGER_FIELDS = [
        'po_id',
        'po_cnt1',
        'po_cnt2',
        'po_cnt3',
        'po_cnt4',
        'po_cnt5',
        'po_cnt6',
        'po_cnt7',
        'po_cnt8',
        'po_cnt9',
        'po_level',
        'po_point',
        'po_use',
    ];

    public function __construct(private readonly AdminSystemRepository $repository)
    {
    }

    /**
     * @param array<string, mixed> $query
     * @return array{items:array<int,array<string,mixed>>,pagination:array<string,mixed>}
     */
    public function listPolls(array $query): array
    {
        $page = max(1, (int)($query['page'] ?? 1));
        $perPage = min(100, max(1, (int)($query['per_page'] ?? 20)));
        $result = $this->repository->listPolls($page, $perPage);
        $items = [];
        foreach ($result['items'] as $poll) {
            $items[] = $this->normalizePollRecord($poll);
        }

        return [
            'items' => $items,
            'pagination' => $this->buildPagination($page, $perPage, $result['total']),
        ];
    }

    public function detailPoll(int $pollId): array
    {
        $id = $this->normalizePositiveInt($pollId, 'po_id');
        $poll = $this->repository->findPoll($id);
        if ($poll === null) {
            throw ApiException::notFound('투표를 찾을 수 없습니다.');
        }

        return $this->normalizePollRecord($poll);
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function createPoll(array $payload): array
    {
        $normalized = $this->normalizePollPayload($payload);
        $pollId = $this->repository->createPoll($normalized);

        return $this->detailPoll($pollId);
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function updatePoll(int $pollId, array $payload): array
    {
        $id = $this->normalizePositiveInt($pollId, 'po_id');
        if ($this->repository->findPoll($id) === null) {
            throw ApiException::notFound('투표를 찾을 수 없습니다.');
        }

        $normalized = $this->normalizePollPayload($payload, true);
        if ($this->repository->updatePoll($id, $normalized) <= 0) {
            throw ApiException::badRequest('수정할 필드가 없습니다.');
        }

        return $this->detailPoll($id);
    }

    public function deletePoll(int $pollId): void
    {
        $id = $this->normalizePositiveInt($pollId, 'po_id');
        if ($this->repository->deletePoll($id) <= 0) {
            throw ApiException::notFound('투표를 찾을 수 없습니다.');
        }
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    private function normalizePollPayload(array $payload, bool $partial = false): array
    {
        if (array_diff(array_keys($payload), self::MUTABLE_FIELDS) !== []) {
            throw ApiException::badRequest('지원하지 않는 투표 요청 필드가 포함되어 있습니다.');
        }

        $normalized = [];
        foreach (self::MUTABLE_FIELDS as $field) {
            if ($partial && !array_key_exists($field, $payload)) {
                continue;
            }

            $value = $payload[$field] ?? '';
            if (in_array($field, ['po_level', 'po_point', 'po_use'], true)) {
                $normalized[$field] = (int)$value;
            } else {
                $normalized[$field] = trim((string)$value);
            }
        }

        if ((!$partial || array_key_exists('po_subject', $payload)) && trim((string)($normalized['po_subject'] ?? '')) === '') {
            throw ApiException::badRequest('po_subject는 필수입니다.');
        }
        if ((!$partial || array_key_exists('po_poll1', $payload)) && trim((string)($normalized['po_poll1'] ?? '')) === '') {
            throw ApiException::badRequest('투표 항목 1은 필수입니다.');
        }
        if ((!$partial || array_key_exists('po_poll2', $payload)) && trim((string)($normalized['po_poll2'] ?? '')) === '') {
            throw ApiException::badRequest('투표 항목 2는 필수입니다.');
        }

        if (!$partial) {
            $normalized['po_date'] = G5DateTime::today();
        }

        return $normalized;
    }

    /**
     * @param array<string, mixed> $poll
     * @return array<string, int|string>
     */
    private function normalizePollRecord(array $poll): array
    {
        $normalized = [];
        foreach ([
            'po_id',
            'po_subject',
            'po_poll1',
            'po_poll2',
            'po_poll3',
            'po_poll4',
            'po_poll5',
            'po_poll6',
            'po_poll7',
            'po_poll8',
            'po_poll9',
            'po_cnt1',
            'po_cnt2',
            'po_cnt3',
            'po_cnt4',
            'po_cnt5',
            'po_cnt6',
            'po_cnt7',
            'po_cnt8',
            'po_cnt9',
            'po_etc',
            'po_level',
            'po_point',
            'po_date',
            'po_ips',
            'mb_ids',
            'po_use',
        ] as $field) {
            if (!array_key_exists($field, $poll)) {
                continue;
            }

            $normalized[$field] = in_array($field, self::INTEGER_FIELDS, true)
                ? (int)$poll[$field]
                : (string)$poll[$field];
        }

        return $normalized;
    }

    /**
     * @return array<string, int|bool>
     */
    private function buildPagination(int $page, int $perPage, int $total): array
    {
        $lastPage = max(1, (int)ceil($total / $perPage));

        return [
            'total' => $total,
            'page' => $page,
            'per_page' => $perPage,
            'last_page' => $lastPage,
            'has_next' => $page < $lastPage,
            'has_prev' => $page > 1,
        ];
    }

    private function normalizePositiveInt(int $value, string $field): int
    {
        if ($value <= 0) {
            throw ApiException::badRequest("{$field}는 1 이상의 정수여야 합니다.");
        }

        return $value;
    }
}
