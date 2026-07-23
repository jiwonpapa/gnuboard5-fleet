<?php

declare(strict_types=1);

namespace Api\Post\Service\Support;

use Api\Support\Exception\ApiException;

final class PostContentInputNormalizer
{
    private const MAX_SUBJECT_LENGTH = 255;

    /**
     * @param array<string, mixed> $payload
     * @return array{0:string,1:string}
     */
    public function normalizeRequiredContent(array $payload): array
    {
        $subject = trim((string)($payload['wr_subject'] ?? ''));
        $content = trim((string)($payload['wr_content'] ?? ''));

        return [$this->normalizeSubject($subject), $this->normalizeContent($content)];
    }

    public function normalizeSubject(string $subject): string
    {
        if ($subject === '') {
            throw ApiException::badRequest('wr_subject는 필수입니다.');
        }
        if (mb_strlen($subject) > self::MAX_SUBJECT_LENGTH) {
            throw ApiException::badRequest('wr_subject 길이를 초과했습니다.');
        }

        return $this->sanitizeText($subject);
    }

    public function normalizeContent(string $content): string
    {
        if ($content === '') {
            throw ApiException::badRequest('wr_content는 필수입니다.');
        }

        return $this->sanitizeText($content);
    }

    public function normalizeCategory(?string $category): ?string
    {
        $value = trim((string)$category);
        if ($value === '') {
            return null;
        }
        if (!mb_check_encoding($value, 'UTF-8')) {
            throw ApiException::badRequest('ca_name 인코딩이 올바르지 않습니다.');
        }
        if (preg_match('/[\x{10000}-\x{10FFFF}]/u', $value) === 1) {
            throw ApiException::badRequest('ca_name에 지원하지 않는 문자가 포함되어 있습니다.');
        }
        if (mb_strlen($value, 'UTF-8') > 255) {
            throw ApiException::badRequest('ca_name 길이를 초과했습니다.');
        }

        return $this->sanitizeText($value);
    }

    public function escapeText(string $value): string
    {
        return $this->sanitizeText($value);
    }

    private function sanitizeText(string $value): string
    {
        return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }
}
