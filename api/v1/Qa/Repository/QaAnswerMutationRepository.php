<?php

/**
 * QaAnswerMutationRepository API module.
 *
 * @package  Gnuboard5\Api\v1\Qa\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Qa\Repository;

use Api\Support\Exception\ApiException;

final class QaAnswerMutationRepository extends QaRepositorySupport
{
    public function createAnswer(int $parentQaId, array $data): int
    {
        $table = $this->qaContentTable();
        $parent = $this->fetchAssociative(
            "SELECT qa_id, qa_num, qa_related, qa_category
             FROM {$table}
             WHERE qa_id = :qa_id
               AND qa_type = 0
             LIMIT 1",
            ['qa_id' => $parentQaId]
        );
        if (!is_array($parent)) {
            throw ApiException::notFound('원질문을 찾을 수 없습니다.');
        }

        $this->executeStatement(
            "INSERT INTO {$table}
             SET qa_num = :qa_num,
                 mb_id = :mb_id,
                 qa_name = :qa_name,
                 qa_email = :qa_email,
                 qa_hp = :qa_hp,
                 qa_type = 1,
                 qa_parent = :qa_parent,
                 qa_related = :qa_related,
                 qa_category = :qa_category,
                 qa_email_recv = 0,
                 qa_sms_recv = 0,
                 qa_html = :qa_html,
                 qa_subject = :qa_subject,
                 qa_content = :qa_content,
                 qa_status = 1,
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
                'qa_num' => (int)($parent['qa_num'] ?? 0),
                'mb_id' => (string)($data['mb_id'] ?? ''),
                'qa_name' => (string)($data['qa_name'] ?? ''),
                'qa_email' => (string)($data['qa_email'] ?? ''),
                'qa_hp' => (string)($data['qa_hp'] ?? ''),
                'qa_parent' => $parentQaId,
                'qa_related' => (int)($parent['qa_related'] ?? $parentQaId),
                'qa_category' => (string)($data['qa_category'] ?? (string)($parent['qa_category'] ?? '')),
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

        $answerId = $this->lastInsertId();
        if ($answerId <= 0) {
            throw ApiException::serverError('답변 등록에 실패했습니다.');
        }

        $this->executeStatement(
            "UPDATE {$table}
             SET qa_status = 1
             WHERE qa_id = :qa_id",
            ['qa_id' => $parentQaId]
        );

        return $answerId;
    }
}
