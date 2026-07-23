<?php

/**
 * QaDeleteRepository API module.
 *
 * @package  Gnuboard5\Api\v1\Qa\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Qa\Repository;

use Api\Support\Exception\ApiException;

final class QaDeleteRepository extends QaRepositorySupport
{
    public function delete(int $qaId, string $memberId, bool $isAdmin): void
    {
        $table = $this->qaContentTable();
        $row = $this->fetchAssociative(
            "SELECT *
             FROM {$table}
             WHERE qa_id = :qa_id
             LIMIT 1",
            ['qa_id' => $qaId]
        );
        if (!is_array($row)) {
            throw ApiException::notFound('문의글을 찾을 수 없습니다.');
        }

        if (!$isAdmin && (string)($row['mb_id'] ?? '') !== $memberId) {
            throw ApiException::forbidden('본인 글 또는 최고관리자만 삭제할 수 있습니다.');
        }
        if (!$isAdmin && (int)($row['qa_type'] ?? 0) === 0 && (int)($row['qa_status'] ?? 0) === 1) {
            throw ApiException::forbidden('답변이 등록된 문의글은 삭제할 수 없습니다.');
        }

        if ((int)($row['qa_type'] ?? 0) === 0) {
            if ((int)($row['qa_status'] ?? 0) === 1) {
                $answers = $this->fetchAllAssociative(
                    "SELECT *
                     FROM {$table}
                     WHERE qa_type = 1
                       AND qa_parent = :qa_parent",
                    ['qa_parent' => $qaId]
                );
                foreach ($answers as $answer) {
                    $this->removeQaRow($answer);
                }
            }

            $this->removeQaRow($row);
            return;
        }

        $parentId = (int)($row['qa_parent'] ?? 0);
        $this->removeQaRow($row);
        if ($parentId > 0) {
            $this->executeStatement(
                "UPDATE {$table}
                 SET qa_status = 0
                 WHERE qa_id = :qa_id",
                ['qa_id' => $parentId]
            );
        }
    }

    public function bulkDelete(array $qaIds): void
    {
        $safeIds = [];
        foreach ($qaIds as $qaId) {
            $value = is_numeric((string)$qaId) ? (int)$qaId : 0;
            if ($value > 0) {
                $safeIds[] = $value;
            }
        }

        $safeIds = array_values(array_unique($safeIds));
        if ($safeIds === []) {
            return;
        }

        foreach ($safeIds as $qaId) {
            $row = $this->fetchAssociative(
                "SELECT *
                 FROM {$this->qaContentTable()}
                 WHERE qa_id = :qa_id
                 LIMIT 1",
                ['qa_id' => $qaId]
            );
            if (!is_array($row)) {
                continue;
            }

            if ((int)($row['qa_type'] ?? 0) === 0) {
                $answers = $this->fetchAllAssociative(
                    "SELECT *
                     FROM {$this->qaContentTable()}
                     WHERE qa_type = 1
                       AND qa_parent = :qa_parent",
                    ['qa_parent' => $qaId]
                );
                foreach ($answers as $answer) {
                    $this->removeQaRow($answer);
                }
                $this->removeQaRow($row);
                continue;
            }

            $parentId = (int)($row['qa_parent'] ?? 0);
            $this->removeQaRow($row);
            if ($parentId > 0) {
                $this->executeStatement(
                    "UPDATE {$this->qaContentTable()}
                     SET qa_status = 0
                     WHERE qa_id = :qa_id",
                    ['qa_id' => $parentId]
                );
            }
        }
    }

    /**
     * @param array<string, mixed> $row
     */
    private function removeQaRow(array $row): void
    {
        $qaId = (int)($row['qa_id'] ?? 0);
        if ($qaId <= 0) {
            return;
        }

        for ($i = 1; $i <= 2; $i++) {
            $this->removeQaFile((string)($row['qa_file' . $i] ?? ''));
        }

        $this->executeStatement(
            "DELETE FROM {$this->qaContentTable()}
             WHERE qa_id = :qa_id",
            ['qa_id' => $qaId]
        );
    }

    private function removeQaFile(string $storedName): void
    {
        $storedName = basename(trim($storedName));
        if ($storedName === '') {
            return;
        }

        $baseDir = $this->dataPath() . '/qa';
        $filePath = $baseDir . '/' . $storedName;
        if (is_file($filePath)) {
            @unlink($filePath);
        }

        $thumbCandidates = [
            $baseDir . '/thumb/' . $storedName,
            $baseDir . '/thumb-' . $storedName,
        ];
        $thumbCandidates = array_merge($thumbCandidates, glob($baseDir . '/thumb-*' . $storedName) ?: []);

        foreach (array_unique($thumbCandidates) as $thumbPath) {
            if (is_string($thumbPath) && is_file($thumbPath)) {
                @unlink($thumbPath);
            }
        }
    }
}
