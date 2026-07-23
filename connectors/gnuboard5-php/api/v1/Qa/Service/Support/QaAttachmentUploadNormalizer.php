<?php

declare(strict_types=1);

namespace Api\Qa\Service\Support;

use Api\Support\Exception\ApiException;
use Psr\Http\Message\UploadedFileInterface;

final class QaAttachmentUploadNormalizer
{
    /**
     * @return array<int, array{file: string, source: string}>
     */
    public function emptyAttachmentSlots(int $maxUploadFiles): array
    {
        $slots = [];
        for ($slot = 1; $slot <= $maxUploadFiles; $slot++) {
            $slots[$slot] = ['file' => '', 'source' => ''];
        }

        return $slots;
    }

    /**
     * @param array<int, mixed>|null $deletePayload
     * @return array<int, bool>
     */
    public function parseDeleteFlags(?array $deletePayload, int $maxUploadFiles): array
    {
        $flags = [];
        for ($slot = 1; $slot <= $maxUploadFiles; $slot++) {
            $flags[$slot] = false;
        }

        if (!is_array($deletePayload)) {
            return $flags;
        }

        for ($slot = 1; $slot <= $maxUploadFiles; $slot++) {
            $value = $deletePayload[$slot] ?? $deletePayload[(string) $slot] ?? null;
            $flags[$slot] = $this->toBoolInt($value) === 1;
        }

        return $flags;
    }

    /**
     * @param array<int|string, UploadedFileInterface> $uploadedFiles
     * @return array<int, UploadedFileInterface|null>
     */
    public function normalizeUploadSlots(array $uploadedFiles, int $maxUploadFiles): array
    {
        $slots = [];
        for ($slot = 1; $slot <= $maxUploadFiles; $slot++) {
            $slots[$slot] = null;
        }

        $numericKeys = [];
        foreach (array_keys($uploadedFiles) as $key) {
            if (is_int($key) || ctype_digit((string) $key)) {
                $numericKeys[] = (int) $key;
            }
        }
        $zeroBased = in_array(0, $numericKeys, true);

        foreach ($uploadedFiles as $key => $uploadedFile) {
            if (!$uploadedFile instanceof UploadedFileInterface) {
                continue;
            }

            $slot = 0;
            if (is_int($key) || ctype_digit((string) $key)) {
                $slot = (int) $key;
                if ($zeroBased) {
                    $slot++;
                }
            }

            if ($slot < 1 || $slot > $maxUploadFiles) {
                $slot = $this->findEmptySlot($slots, $maxUploadFiles);
            }

            if ($slot === 0) {
                if ($uploadedFile->getError() !== UPLOAD_ERR_NO_FILE) {
                    throw ApiException::badRequest('첨부파일은 최대 2개까지 업로드할 수 있습니다.');
                }
                continue;
            }

            if ($slots[$slot] instanceof UploadedFileInterface) {
                $fallbackSlot = $this->findEmptySlot($slots, $maxUploadFiles);
                if ($fallbackSlot === 0) {
                    if ($uploadedFile->getError() !== UPLOAD_ERR_NO_FILE) {
                        throw ApiException::badRequest('첨부파일은 최대 2개까지 업로드할 수 있습니다.');
                    }
                    continue;
                }
                $slot = $fallbackSlot;
            }

            $slots[$slot] = $uploadedFile;
        }

        return $slots;
    }

    /**
     * @param array<int, UploadedFileInterface|null> $slots
     */
    private function findEmptySlot(array $slots, int $maxUploadFiles): int
    {
        for ($slot = 1; $slot <= $maxUploadFiles; $slot++) {
            if (!($slots[$slot] instanceof UploadedFileInterface)) {
                return $slot;
            }
        }

        return 0;
    }

    private function toBoolInt(mixed $value): int
    {
        if (is_bool($value)) {
            return $value ? 1 : 0;
        }
        if (is_int($value) || is_float($value)) {
            return ((int) $value) > 0 ? 1 : 0;
        }

        $normalized = strtolower(trim((string) $value));

        return in_array($normalized, ['1', 'true', 'on', 'yes', 'y'], true) ? 1 : 0;
    }
}
