<?php

/**
 * QaConfigRepository API module.
 *
 * @package  Gnuboard5\Api\v1\Qa\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Qa\Repository;

final class QaConfigRepository extends QaRepositorySupport
{
    private const DEFAULT_QA_CONFIG = [
        'qa_id' => 1,
        'qa_title' => '1:1 문의',
        'qa_category' => '',
        'qa_skin' => 'basic',
        'qa_mobile_skin' => 'basic',
        'qa_req_email' => 0,
        'qa_page_rows' => 15,
        'qa_mobile_page_rows' => 15,
        'qa_upload_size' => 1048576,
    ];

    public function getQaConfig(): array
    {
        $row = $this->fetchAssociative(
            "SELECT *
             FROM {$this->qaConfigTable()}
             ORDER BY qa_id ASC
             LIMIT 1"
        );
        if (!is_array($row)) {
            return self::DEFAULT_QA_CONFIG;
        }

        return array_merge(self::DEFAULT_QA_CONFIG, $row);
    }
}
