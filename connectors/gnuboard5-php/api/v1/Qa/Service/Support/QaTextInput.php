<?php

declare(strict_types=1);

namespace Api\Qa\Service\Support;

use Api\Support\Exception\ApiException;

final class QaTextInput
{
    private const MAX_SUBJECT_LENGTH = 255;
    private const MAX_CONTENT_LENGTH = 65536;

    /**
     * @param array<string, mixed> $config
     */
    public function validateCategory(string $rawCategory, array $config): string
    {
        $category = trim($rawCategory);
        $categories = $this->parseCategories((string)($config['qa_category'] ?? ''));

        if ($categories === []) {
            throw ApiException::badRequest('1:1문의 분류 설정이 필요합니다.');
        }
        if ($category === '') {
            throw ApiException::badRequest('qa_category는 필수입니다.');
        }
        if (!in_array($category, $categories, true)) {
            throw ApiException::badRequest('유효하지 않은 qa_category입니다.');
        }

        return $category;
    }

    public function sanitizeSubject(string $rawSubject): string
    {
        $subject = trim($rawSubject);
        $subject = preg_replace('/[\\\\]+$/', '', $subject) ?? $subject;
        if ($subject === '') {
            throw ApiException::badRequest('qa_subject는 필수입니다.');
        }
        if (mb_strlen($subject) > self::MAX_SUBJECT_LENGTH) {
            throw ApiException::badRequest('qa_subject 길이를 초과했습니다.');
        }

        return htmlspecialchars($subject, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }

    public function sanitizeContent(string $rawContent): string
    {
        $content = trim($rawContent);
        $content = preg_replace('/[\\\\]+$/', '', $content) ?? $content;
        if ($content === '') {
            throw ApiException::badRequest('qa_content는 필수입니다.');
        }
        if (mb_strlen($content) > self::MAX_CONTENT_LENGTH) {
            throw ApiException::badRequest('qa_content 길이를 초과했습니다.');
        }
        if (substr_count($content, '&#') > 50) {
            throw ApiException::badRequest('내용에 올바르지 않은 코드가 다수 포함되어 있습니다.');
        }

        return htmlspecialchars($content, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }

    public function normalizeNullableKeyword(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $trimmed = trim((string)$value);
        if ($trimmed === '') {
            return null;
        }

        $normalized = preg_replace('/[\x{10000}-\x{10FFFF}]/u', '', $trimmed);
        if (!is_string($normalized)) {
            return null;
        }

        $normalized = trim($normalized);
        return $normalized === '' ? null : $normalized;
    }

    /**
     * @return array<int, string>
     */
    private function parseCategories(string $raw): array
    {
        $parts = explode('|', $raw);
        $categories = [];
        foreach ($parts as $part) {
            $value = trim($part);
            if ($value !== '') {
                $categories[] = $value;
            }
        }

        return array_values(array_unique($categories));
    }
}
