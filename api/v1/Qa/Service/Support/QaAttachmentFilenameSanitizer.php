<?php

declare(strict_types=1);

namespace Api\Qa\Service\Support;

final class QaAttachmentFilenameSanitizer
{
    public function sanitizeUploadedFilename(string $filename): string
    {
        $safe = basename($filename);
        $safe = preg_replace('/[^a-zA-Z0-9\.\-_ ]+/', '', $safe) ?? '';
        $safe = str_replace(' ', '_', trim($safe));
        $safe = ltrim($safe, '.');

        if ($safe === '') {
            return '';
        }

        return substr($safe, 0, 200);
    }

    public function sanitizeExecutableExtensions(string $filename): string
    {
        $sanitized = preg_replace('/\.(php|pht|phtm|htm|cgi|pl|exe|jsp|asp|inc|phar)$/i', '$0-x', $filename);

        return is_string($sanitized) ? $sanitized : $filename;
    }
}
