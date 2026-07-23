<?php

declare(strict_types=1);

namespace Api\Post\Service;

use Api\Post\Service\Support\PostContentInputNormalizer;
use Api\Post\Service\Support\PostLinkNormalizer;
use Api\Post\Service\Support\PostOptionNormalizer;
use Api\Support\Exception\ApiException;

final class PostPayloadNormalizer
{
    private ?PostContentInputNormalizer $resolvedContentNormalizer = null;
    private ?PostOptionNormalizer $resolvedOptionNormalizer = null;
    private ?PostLinkNormalizer $resolvedLinkNormalizer = null;

    public function __construct(
        ?PostContentInputNormalizer $contentNormalizer = null,
        ?PostOptionNormalizer $optionNormalizer = null,
        ?PostLinkNormalizer $linkNormalizer = null
    ) {
        $this->resolvedContentNormalizer = $contentNormalizer;
        $this->resolvedOptionNormalizer = $optionNormalizer;
        $this->resolvedLinkNormalizer = $linkNormalizer;
    }

    /**
     * @return array{subject:string,content:string,category:?string,option:?string,link1:?string,link2:?string,is_notice:bool}
     */
    public function normalizeCreatePayload(array $payload, array $board, int $memberLevel): array
    {
        $this->assertAllowedFields(
            $payload,
            ['wr_subject', 'wr_content', 'ca_name', 'wr_option', 'wr_link1', 'wr_link2', 'is_notice'],
            '게시글 작성'
        );
        $this->assertStringFields($payload, ['wr_subject', 'wr_content', 'ca_name', 'wr_option', 'wr_link1', 'wr_link2']);
        [$subject, $content] = $this->contentNormalizer()->normalizeRequiredContent($payload);
        $category = isset($payload['ca_name']) ? trim((string)$payload['ca_name']) : null;
        $option = $this->optionNormalizer()->normalizeOption(isset($payload['wr_option']) ? (string)$payload['wr_option'] : null, $board, $memberLevel);
        $link1 = $this->linkNormalizer()->normalizeLinkValue($payload['wr_link1'] ?? null, 'wr_link1');
        $link2 = $this->linkNormalizer()->normalizeLinkValue($payload['wr_link2'] ?? null, 'wr_link2');

        return [
            'subject' => $this->contentNormalizer()->escapeText($subject),
            'content' => $this->contentNormalizer()->escapeText($content),
            'category' => $this->contentNormalizer()->normalizeCategory($category),
            'option' => $option === '' ? null : $option,
            'link1' => $link1,
            'link2' => $link2,
            'is_notice' => $this->optionNormalizer()->resolveBool($payload['is_notice'] ?? false),
        ];
    }

    /**
     * @return array{subject:string,content:string,option:?string}
     */
    public function normalizeReplyPayload(array $payload, array $board, int $memberLevel): array
    {
        $this->assertAllowedFields($payload, ['wr_subject', 'wr_content', 'wr_option'], '답변 작성');
        $this->assertStringFields($payload, ['wr_subject', 'wr_content', 'wr_option']);
        [$subject, $content] = $this->contentNormalizer()->normalizeRequiredContent($payload);
        $option = $this->optionNormalizer()->normalizeOption(isset($payload['wr_option']) ? (string)$payload['wr_option'] : null, $board, $memberLevel);

        return [
            'subject' => $this->contentNormalizer()->escapeText($subject),
            'content' => $this->contentNormalizer()->escapeText($content),
            'option' => $option === '' ? null : $option,
        ];
    }

    /**
     * @return array<string, string>
     */
    public function filterMutableFields(array $payload, array $board, int $memberLevel): array
    {
        $allowed = ['wr_subject', 'wr_content', 'ca_name', 'wr_option', 'wr_link1', 'wr_link2', 'is_notice'];
        $this->assertAllowedFields($payload, $allowed, '게시글 수정');
        if ($payload === []) {
            throw ApiException::badRequest('수정할 게시글 필드가 필요합니다.');
        }
        $this->assertStringFields($payload, ['wr_subject', 'wr_content', 'ca_name', 'wr_option', 'wr_link1', 'wr_link2']);
        $updates = [];

        foreach ($allowed as $field) {
            if (!array_key_exists($field, $payload)) {
                continue;
            }
            if ($field === 'is_notice') {
                continue;
            }
            $value = (string)$payload[$field];

            if ($field === 'wr_subject') {
                $updates[$field] = $this->contentNormalizer()->normalizeSubject($value);
                continue;
            }
            if ($field === 'wr_content') {
                if ($value === '') {
                    throw \Api\Support\Exception\ApiException::badRequest('wr_content는 빈 값이 될 수 없습니다.');
                }
                $updates[$field] = $this->contentNormalizer()->normalizeContent($value);
                continue;
            }
            if ($field === 'wr_option') {
                $updates[$field] = $this->optionNormalizer()->normalizeOption($value, $board, $memberLevel);
                continue;
            }
            if ($field === 'ca_name') {
                $updates[$field] = $this->contentNormalizer()->normalizeCategory($value) ?? '';
                continue;
            }

            $updates[$field] = $this->linkNormalizer()->normalizeLinkValue($value, $field) ?? '';
        }

        return $updates;
    }

    public function resolveBool(mixed $value): bool
    {
        return $this->optionNormalizer()->resolveBool($value);
    }

    /** @param array<string,mixed> $payload @param list<string> $allowed */
    private function assertAllowedFields(array $payload, array $allowed, string $context): void
    {
        $unknown = array_values(array_diff(array_keys($payload), $allowed));
        if ($unknown !== []) {
            throw ApiException::badRequest(
                $context . ' 요청에 허용되지 않은 필드가 있습니다: ' . implode(', ', $unknown)
            );
        }
    }

    /** @param array<string,mixed> $payload @param list<string> $fields */
    private function assertStringFields(array $payload, array $fields): void
    {
        foreach ($fields as $field) {
            if (array_key_exists($field, $payload) && !is_string($payload[$field])) {
                throw ApiException::badRequest($field . '는 문자열이어야 합니다.');
            }
        }
    }

    private function contentNormalizer(): PostContentInputNormalizer
    {
        if ($this->resolvedContentNormalizer instanceof PostContentInputNormalizer) {
            return $this->resolvedContentNormalizer;
        }

        $this->resolvedContentNormalizer = new PostContentInputNormalizer();

        return $this->resolvedContentNormalizer;
    }

    private function optionNormalizer(): PostOptionNormalizer
    {
        if ($this->resolvedOptionNormalizer instanceof PostOptionNormalizer) {
            return $this->resolvedOptionNormalizer;
        }

        $this->resolvedOptionNormalizer = new PostOptionNormalizer();

        return $this->resolvedOptionNormalizer;
    }

    private function linkNormalizer(): PostLinkNormalizer
    {
        if ($this->resolvedLinkNormalizer instanceof PostLinkNormalizer) {
            return $this->resolvedLinkNormalizer;
        }

        $this->resolvedLinkNormalizer = new PostLinkNormalizer();

        return $this->resolvedLinkNormalizer;
    }
}
