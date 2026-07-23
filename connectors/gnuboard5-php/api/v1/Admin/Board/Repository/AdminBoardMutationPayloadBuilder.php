<?php

declare(strict_types=1);

namespace Api\Admin\Board\Repository;

final class AdminBoardMutationPayloadBuilder
{
    /** @var array<string, string> */
    private const REQUIRED_TEXT_DEFAULTS = [
        'bo_category_list' => '',
        'bo_content_head' => '',
        'bo_mobile_content_head' => '',
        'bo_content_tail' => '',
        'bo_mobile_content_tail' => '',
        'bo_insert_content' => '',
        'bo_notice' => '',
    ];

    /**
     * @param list<string> $updatableFields
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    public function buildCreatePayload(array $updatableFields, array $payload): array
    {
        $data = [
            'bo_table' => (string)$payload['bo_table'],
            'bo_subject' => (string)$payload['bo_subject'],
            'gr_id' => (string)($payload['gr_id'] ?? ''),
            ...self::REQUIRED_TEXT_DEFAULTS,
        ];

        foreach ($updatableFields as $field) {
            if (array_key_exists($field, $payload)) {
                $data[$field] = $payload[$field];
            }
        }

        $data['bo_count_write'] = (int)($payload['bo_count_write'] ?? 0);
        $data['bo_count_comment'] = (int)($payload['bo_count_comment'] ?? 0);

        return $data;
    }

    /**
     * @param list<string> $updatableFields
     * @param array<string, mixed> $payload
     * @return array{sets:list<string>, params:array<string,mixed>}
     */
    public function buildUpdatePayload(array $updatableFields, string $boTable, array $payload): array
    {
        $sets = [];
        $params = ['bo_table' => $boTable];

        foreach ($updatableFields as $field) {
            if (!array_key_exists($field, $payload)) {
                continue;
            }

            $param = 'u_' . $field;
            $sets[] = "{$field} = :{$param}";
            $params[$param] = $payload[$field];
        }

        return [
            'sets' => $sets,
            'params' => $params,
        ];
    }
}
