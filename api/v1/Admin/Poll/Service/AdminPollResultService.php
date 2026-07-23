<?php

/**
 * AdminPollResultService API module.
 *
 * @package  Gnuboard5\Api\v1\Admin\Poll\Service
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Admin\Poll\Service;

use Api\Admin\Poll\Repository\AdminPollRepository;
use Api\Support\Exception\ApiException;

final class AdminPollResultService
{
    public function __construct(private readonly AdminPollRepository $repository)
    {
    }

    /**
     * @return array<string,mixed>
     */
    public function result(int $pollId, bool $includeEtc = true): array
    {
        $id = $this->normalizePositiveInt($pollId, 'po_id');
        $poll = $this->repository->find($id);
        if ($poll === null) {
            throw ApiException::notFound('투표를 찾을 수 없습니다.');
        }

        return $this->buildFromPoll($poll, $includeEtc);
    }

    /**
     * @param array<string,mixed> $poll
     * @return array<string,mixed>
     */
    public function buildFromPoll(array $poll, bool $includeEtc): array
    {
        $totalVotes = 0;
        $choices = [];

        for ($i = 1; $i <= 9; $i++) {
            $text = trim((string)($poll['po_poll' . $i] ?? ''));
            if ($text === '') {
                continue;
            }

            $count = (int)($poll['po_cnt' . $i] ?? 0);
            $totalVotes += $count;
            $choices[] = [
                'no' => $i,
                'text' => $text,
                'count' => $count,
            ];
        }

        $choicesWithPercent = [];
        foreach ($choices as $choice) {
            $count = (int)$choice['count'];
            $choicesWithPercent[] = [
                'no' => (int)$choice['no'],
                'text' => (string)$choice['text'],
                'count' => $count,
                'percent' => $totalVotes > 0
                    ? round(($count / $totalVotes) * 100, 2)
                    : 0.0,
            ];
        }

        $result = [
            'po_id' => (int)($poll['po_id'] ?? 0),
            'po_subject' => (string)($poll['po_subject'] ?? ''),
            'po_date' => (string)($poll['po_date'] ?? ''),
            'po_level' => (int)($poll['po_level'] ?? 1),
            'po_point' => (int)($poll['po_point'] ?? 0),
            'po_use' => (int)($poll['po_use'] ?? 0),
            'po_etc' => (string)($poll['po_etc'] ?? ''),
            'total_votes' => $totalVotes,
            'choices' => $choicesWithPercent,
        ];

        if ($includeEtc) {
            $result['etc_items'] = [];
            if (trim((string)($poll['po_etc'] ?? '')) !== '') {
                foreach ($this->repository->listEtc((int)($poll['po_id'] ?? 0), 100) as $item) {
                    $result['etc_items'][] = [
                        'pc_id' => (int)($item['pc_id'] ?? 0),
                        'po_id' => (int)($item['po_id'] ?? 0),
                        'mb_id' => (string)($item['mb_id'] ?? ''),
                        'pc_name' => (string)($item['pc_name'] ?? ''),
                        'pc_idea' => (string)($item['pc_idea'] ?? ''),
                        'pc_datetime' => (string)($item['pc_datetime'] ?? ''),
                    ];
                }
            }
        }

        return $result;
    }

    private function normalizePositiveInt(int $value, string $field): int
    {
        if ($value <= 0) {
            throw ApiException::badRequest($field . '는 1 이상의 정수여야 합니다.');
        }

        return $value;
    }
}
