<?php

/**
 * 관리자 콘텐츠 응답을 공개 계약 필드와 타입으로 제한합니다.
 *
 * @package  Gnuboard5\Api\v1\Admin\Content\Service\Support
 * @since    v1.1.0
 */

declare(strict_types=1);

namespace Api\Admin\Content\Service\Support;

final class AdminContentPresenter
{
    /**
     * @param array<string, mixed> $content
     * @return array<string, int|string>
     */
    public function present(array $content): array
    {
        return [
            'co_id' => (string)($content['co_id'] ?? ''),
            'co_subject' => (string)($content['co_subject'] ?? ''),
            'co_html' => (int)($content['co_html'] ?? 0),
            'co_content' => (string)($content['co_content'] ?? ''),
            'co_mobile_content' => (string)($content['co_mobile_content'] ?? ''),
            'co_include_head' => (string)($content['co_include_head'] ?? ''),
            'co_include_tail' => (string)($content['co_include_tail'] ?? ''),
            'co_tag_filter_use' => (int)($content['co_tag_filter_use'] ?? 1),
            'co_skin' => (string)($content['co_skin'] ?? ''),
            'co_mobile_skin' => (string)($content['co_mobile_skin'] ?? ''),
        ];
    }
}
