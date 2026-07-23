<?php

declare(strict_types=1);

namespace Api\Admin\Push\Service\Support;

use Api\Support\Exception\ApiException;

final class AdminPushInputNormalizer
{
    private const ALLOWED_FIELDS = ['title', 'body', 'type', 'target', 'member_ids'];

    private const TARGETS = ['all'];

    /**
     * @param array<string,mixed> $payload
     * @return array{title:string,body:string,type:string,target:?string,member_ids:list<string>}
     */
    public function normalize(array $payload): array
    {
        $unknown = array_values(array_diff(array_keys($payload), self::ALLOWED_FIELDS));
        if ($unknown !== []) {
            throw ApiException::badRequest(
                '푸시 발송 요청에 허용되지 않은 필드가 있습니다: ' . implode(', ', $unknown)
            );
        }

        $title = $this->requiredString($payload['title'] ?? null, 'title');
        $body = $this->requiredString($payload['body'] ?? null, 'body');
        $type = $this->requiredString($payload['type'] ?? 'manual', 'type');

        $target = null;
        if (array_key_exists('target', $payload)) {
            $target = $this->requiredString($payload['target'], 'target');
            if (!in_array($target, self::TARGETS, true)) {
                throw ApiException::badRequest('target은 all만 사용할 수 있습니다.');
            }
        }

        $memberIds = [];
        if (array_key_exists('member_ids', $payload)) {
            if (!is_array($payload['member_ids'])) {
                throw ApiException::badRequest('member_ids는 문자열 배열이어야 합니다.');
            }
            foreach ($payload['member_ids'] as $memberId) {
                $memberIds[] = $this->requiredString($memberId, 'member_ids[]');
            }
            $memberIds = array_values(array_unique($memberIds));
        }

        if ($target !== null && array_key_exists('member_ids', $payload)) {
            throw ApiException::badRequest('target과 member_ids는 동시에 사용할 수 없습니다.');
        }
        if ($target === null && $memberIds === []) {
            throw ApiException::badRequest('발송 대상이 없습니다.');
        }

        return [
            'title' => $title,
            'body' => $body,
            'type' => $type,
            'target' => $target,
            'member_ids' => $memberIds,
        ];
    }

    private function requiredString(mixed $value, string $field): string
    {
        if (!is_string($value)) {
            throw ApiException::badRequest($field . '는 문자열이어야 합니다.');
        }

        $normalized = trim($value);
        if ($normalized === '') {
            throw ApiException::badRequest($field . '는 비어 있을 수 없습니다.');
        }

        return $normalized;
    }
}
