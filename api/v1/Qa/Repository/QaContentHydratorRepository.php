<?php

declare(strict_types=1);

namespace Api\Qa\Repository;

final class QaContentHydratorRepository extends QaRepositorySupport
{
    /**
     * @param array<string, mixed> $row
     */
    public function normalizeQaRow(array $row, bool $withAnswer = false): array
    {
        $normalized = [
            'qa_id' => (int)($row['qa_id'] ?? 0),
            'qa_num' => (int)($row['qa_num'] ?? 0),
            'qa_parent' => (int)($row['qa_parent'] ?? 0),
            'qa_related' => (int)($row['qa_related'] ?? 0),
            'mb_id' => (string)($row['mb_id'] ?? ''),
            'qa_name' => (string)($row['qa_name'] ?? ''),
            'qa_email' => (string)($row['qa_email'] ?? ''),
            'qa_hp' => (string)($row['qa_hp'] ?? ''),
            'qa_type' => (int)($row['qa_type'] ?? 0),
            'qa_category' => (string)($row['qa_category'] ?? ''),
            'qa_email_recv' => (int)($row['qa_email_recv'] ?? 0),
            'qa_sms_recv' => (int)($row['qa_sms_recv'] ?? 0),
            'qa_html' => (int)($row['qa_html'] ?? 0),
            'qa_subject' => (string)($row['qa_subject'] ?? ''),
            'qa_content' => (string)($row['qa_content'] ?? ''),
            'qa_status' => (int)($row['qa_status'] ?? 0),
            'qa_file1' => (string)($row['qa_file1'] ?? ''),
            'qa_source1' => (string)($row['qa_source1'] ?? ''),
            'qa_file2' => (string)($row['qa_file2'] ?? ''),
            'qa_source2' => (string)($row['qa_source2'] ?? ''),
            'qa_ip' => (string)($row['qa_ip'] ?? ''),
            'qa_datetime' => (string)($row['qa_datetime'] ?? ''),
        ];

        $files = [];
        $file1 = $this->buildFileMeta($normalized, 1);
        if ($file1 !== null) {
            $files[] = $file1;
        }
        $file2 = $this->buildFileMeta($normalized, 2);
        if ($file2 !== null) {
            $files[] = $file2;
        }

        $normalized['files'] = $files;
        $normalized['has_file'] = $files !== [];

        if (
            $withAnswer
            && (int)$normalized['qa_type'] === 0
            && (int)$normalized['qa_status'] === 1
            && (int)$normalized['qa_id'] > 0
        ) {
            $answer = $this->fetchAssociative(
                "SELECT *
                 FROM {$this->qaContentTable()}
                 WHERE qa_type = 1
                   AND qa_parent = :qa_parent
                 ORDER BY qa_id ASC
                 LIMIT 1",
                ['qa_parent' => (int)$normalized['qa_id']]
            );
            $normalized['answer'] = is_array($answer) ? $this->normalizeQaRow($answer, false) : null;
        } else {
            $normalized['answer'] = null;
        }

        return $normalized;
    }

    /**
     * @param array<string, mixed> $row
     */
    private function buildFileMeta(array $row, int $fileNo): ?array
    {
        $storedName = trim((string)($row['qa_file' . $fileNo] ?? ''));
        if ($storedName === '') {
            return null;
        }

        $sourceName = trim((string)($row['qa_source' . $fileNo] ?? ''));
        $extension = strtolower((string)pathinfo($storedName, PATHINFO_EXTENSION));
        $imageExt = $this->tokenizeExtensions($this->envString('UPLOAD_IMAGE_EXTENSIONS', 'jpg|jpeg|png|gif|webp|bmp'));

        return [
            'file_no' => $fileNo,
            'stored_name' => $storedName,
            'source_name' => $sourceName === '' ? $storedName : $sourceName,
            'is_image' => in_array($extension, $imageExt, true),
            'download_path' => '/api/v1/qa/' . (int)($row['qa_id'] ?? 0) . '/files/' . $fileNo . '/download',
        ];
    }
}
