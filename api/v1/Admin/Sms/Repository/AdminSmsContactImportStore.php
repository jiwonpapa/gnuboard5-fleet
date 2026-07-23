<?php

declare(strict_types=1);

namespace Api\Admin\Sms\Repository;

use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;
use Psr\Http\Message\UploadedFileInterface;

final class AdminSmsContactImportStore extends AdminSmsContactStoreBase
{
    private ?AdminSmsContactQueryStore $resolvedQueryStore = null;

    public function __construct(
        ?QueryBuilder $qb = null,
        ?TableRegistry $tables = null,
        ?AdminSmsContactQueryStore $queryStore = null
    ) {
        parent::__construct($qb, $tables);
        $this->resolvedQueryStore = $queryStore;
    }

    /**
     * @param array<int,array<string,mixed>> $contacts
     * @return array<string,mixed>
     */
    public function importContacts(array $contacts, int $groupId, bool $dryRun): array
    {
        $this->requireContactStorage('SMS 연락처 가져오기');
        $success = 0;
        $failure = 0;
        $overlap = 0;
        $innerOverlap = 0;
        $phones = [];
        $duplicatePhones = [];
        $registrablePhones = [];

        foreach ($contacts as $contact) {
            $name = trim((string)($contact['bk_name'] ?? $contact['name'] ?? ''));
            $phone = $this->normalizeMobilePhone((string)($contact['bk_hp'] ?? $contact['phone'] ?? ''));
            $memo = trim((string)($contact['bk_memo'] ?? $contact['memo'] ?? ''));
            $receipt = (int)($contact['bk_receipt'] ?? $contact['receipt'] ?? 1);

            if ($name === '' || $phone === '') {
                $failure++;
                continue;
            }

            if (in_array($phone, $phones, true)) {
                $innerOverlap++;
                continue;
            }
            $phones[] = $phone;

            if ($this->queryStore()->findContactByPhone($phone) !== null) {
                $duplicatePhones[] = $phone;
                $overlap++;
                continue;
            }

            if ($dryRun) {
                $registrablePhones[] = $phone;
                continue;
            }

            $this->executeStatement(
                "INSERT INTO {$this->contactTable()}
                    (bg_no, mb_id, bk_name, bk_hp, bk_receipt, bk_datetime, bk_memo)
                 VALUES
                    (:bg_no, '', :bk_name, :bk_hp, :bk_receipt, :bk_datetime, :bk_memo)",
                [
                    'bg_no' => $groupId,
                    'bk_name' => $name,
                    'bk_hp' => $phone,
                    'bk_receipt' => $receipt,
                    'bk_datetime' => $this->now(),
                    'bk_memo' => $memo,
                ]
            );
            $success++;
        }

        $overlap += $innerOverlap;
        if (!$dryRun && $success > 0) {
            $this->syncAllContactGroupStats();
        }

        return [
            'total_count' => count($contacts),
            'invalid_count' => $failure,
            'duplicate_count' => $overlap,
            'importable_count' => max(0, count($contacts) - $failure - $overlap),
            'imported_count' => $success,
            'dry_run' => $dryRun,
            'duplicate_phones' => $duplicatePhones,
            'importable_phones' => $registrablePhones,
        ];
    }

    /**
     * @return array<string,mixed>
     */
    public function importContactsFromUpload(UploadedFileInterface $uploadedFile, int $groupId, bool $dryRun): array
    {
        $this->requireContactStorage('SMS 연락처 업로드 가져오기');
        $filename = $uploadedFile->getClientFilename() ?? 'contacts.csv';
        $extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
        $contacts = [];

        if ($extension === 'csv') {
            $stream = $uploadedFile->getStream();
            $stream->rewind();

            while (!$stream->eof()) {
                $line = $stream->read(8192);
                foreach (preg_split('/\r\n|\r|\n/', $line) ?: [] as $row) {
                    if (trim($row) === '') {
                        continue;
                    }
                    $parsed = str_getcsv($row);
                    $contacts[] = [
                        'name' => $parsed[0] ?? '',
                        'phone' => $parsed[1] ?? '',
                    ];
                }
            }
        } elseif (in_array($extension, ['xls', 'xlsx'], true)) {
            $tmpPath = tempnam(sys_get_temp_dir(), 'sms-import-');
            if ($tmpPath === false) {
                throw new \RuntimeException('임시 파일을 만들 수 없습니다.');
            }

            $uploadedFile->moveTo($tmpPath);
            require_once dirname(__DIR__, 5) . '/lib/PHPExcel/IOFactory.php';
            /** @var mixed $workbook */
            $workbook = \PHPExcel_IOFactory::load($tmpPath);
            /** @var mixed $sheet */
            $sheet = $workbook->getSheet(0);
            $highestRow = (int)$sheet->getHighestRow();
            for ($row = 1; $row <= $highestRow; $row++) {
                $rowData = $sheet->rangeToArray('A' . $row . ':B' . $row, null, true, false);
                $contacts[] = [
                    'name' => (string)($rowData[0][0] ?? ''),
                    'phone' => (string)($rowData[0][1] ?? ''),
                ];
            }
            @unlink($tmpPath);
        } else {
            throw new \RuntimeException('csv, xls, xlsx 파일만 지원합니다.');
        }

        return $this->importContacts($contacts, $groupId, $dryRun);
    }

    private function queryStore(): AdminSmsContactQueryStore
    {
        return $this->resolvedQueryStore ??= new AdminSmsContactQueryStore($this->queryBuilder(), $this->tables());
    }
}
