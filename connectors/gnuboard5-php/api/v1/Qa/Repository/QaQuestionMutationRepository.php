<?php

/**
 * QaQuestionMutationRepository API module.
 *
 * @package  Gnuboard5\Api\v1\Qa\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Qa\Repository;

use Api\Support\Exception\ApiException;

final class QaQuestionMutationRepository extends QaRepositorySupport
{
    public function createQuestion(array $data): int
    {
        $table = $this->qaContentTable();
        $qaNum = isset($data['qa_num']) ? (int)$data['qa_num'] : $this->nextQaNum();

        $this->executeStatement(
            "INSERT INTO {$table}
             SET qa_num = :qa_num,
                 mb_id = :mb_id,
                 qa_name = :qa_name,
                 qa_email = :qa_email,
                 qa_hp = :qa_hp,
                 qa_type = 0,
                 qa_parent = 0,
                 qa_related = 0,
                 qa_category = :qa_category,
                 qa_email_recv = :qa_email_recv,
                 qa_sms_recv = :qa_sms_recv,
                 qa_html = :qa_html,
                 qa_subject = :qa_subject,
                 qa_content = :qa_content,
                 qa_status = 0,
                 qa_file1 = :qa_file1,
                 qa_source1 = :qa_source1,
                 qa_file2 = :qa_file2,
                 qa_source2 = :qa_source2,
                 qa_ip = :qa_ip,
                 qa_datetime = :qa_datetime,
                 qa_1 = '',
                 qa_2 = '',
                 qa_3 = '',
                 qa_4 = '',
                 qa_5 = ''",
            [
                'qa_num' => $qaNum,
                'mb_id' => (string)($data['mb_id'] ?? ''),
                'qa_name' => (string)($data['qa_name'] ?? ''),
                'qa_email' => (string)($data['qa_email'] ?? ''),
                'qa_hp' => (string)($data['qa_hp'] ?? ''),
                'qa_category' => (string)($data['qa_category'] ?? ''),
                'qa_email_recv' => (int)($data['qa_email_recv'] ?? 0),
                'qa_sms_recv' => (int)($data['qa_sms_recv'] ?? 0),
                'qa_html' => (int)($data['qa_html'] ?? 0),
                'qa_subject' => (string)($data['qa_subject'] ?? ''),
                'qa_content' => (string)($data['qa_content'] ?? ''),
                'qa_file1' => (string)($data['qa_file1'] ?? ''),
                'qa_source1' => (string)($data['qa_source1'] ?? ''),
                'qa_file2' => (string)($data['qa_file2'] ?? ''),
                'qa_source2' => (string)($data['qa_source2'] ?? ''),
                'qa_ip' => (string)($data['qa_ip'] ?? ''),
                'qa_datetime' => (string)($data['qa_datetime'] ?? date('Y-m-d H:i:s')),
            ]
        );

        $qaId = $this->lastInsertId();
        if ($qaId <= 0) {
            throw ApiException::serverError('문의 등록에 실패했습니다.');
        }

        $qaRelated = (int)($data['qa_related'] ?? 0);
        $qaRelated = $qaRelated > 0 ? $qaRelated : $qaId;

        $this->executeStatement(
            "UPDATE {$table}
             SET qa_parent = :qa_parent,
                 qa_related = :qa_related
             WHERE qa_id = :qa_id",
            [
                'qa_parent' => $qaId,
                'qa_related' => $qaRelated,
                'qa_id' => $qaId,
            ]
        );

        return $qaId;
    }

    public function update(int $qaId, array $data): void
    {
        $allowed = [
            'qa_email',
            'qa_hp',
            'qa_category',
            'qa_email_recv',
            'qa_sms_recv',
            'qa_html',
            'qa_subject',
            'qa_content',
            'qa_file1',
            'qa_source1',
            'qa_file2',
            'qa_source2',
            'qa_status',
        ];

        $sets = [];
        $params = ['qa_id' => $qaId];
        foreach ($allowed as $field) {
            if (!array_key_exists($field, $data)) {
                continue;
            }

            $param = 'u_' . $field;
            $sets[] = "{$field} = :{$param}";
            $params[$param] = $data[$field];
        }

        if ($sets === []) {
            return;
        }

        $this->executeStatement(
            "UPDATE {$this->qaContentTable()}
             SET " . implode(', ', $sets) . "
             WHERE qa_id = :qa_id",
            $params
        );
    }

    private function nextQaNum(): int
    {
        $row = $this->fetchAssociative(
            "SELECT MIN(qa_num) AS min_qa_num
             FROM {$this->qaContentTable()}"
        );
        $min = (int)($row['min_qa_num'] ?? 0);

        return $min - 1;
    }
}
