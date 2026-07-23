<?php

/**
 * 관리자 FAQ 응답을 공개 계약 필드와 타입으로 제한합니다.
 *
 * @package  Gnuboard5\Api\v1\Admin\Faq\Service\Support
 * @since    v1.1.0
 */

declare(strict_types=1);

namespace Api\Admin\Faq\Service\Support;

final class AdminFaqPresenter
{
    /**
     * @param array<string, mixed> $faq
     * @return array{fa_id:int,fm_id:int,fm_subject:?string,fa_subject:string,fa_content:string,fa_order:int}
     */
    public function present(array $faq): array
    {
        return [
            'fa_id' => (int)($faq['fa_id'] ?? 0),
            'fm_id' => (int)($faq['fm_id'] ?? 0),
            'fm_subject' => isset($faq['fm_subject']) ? (string)$faq['fm_subject'] : null,
            'fa_subject' => (string)($faq['fa_subject'] ?? ''),
            'fa_content' => (string)($faq['fa_content'] ?? ''),
            'fa_order' => (int)($faq['fa_order'] ?? 0),
        ];
    }
}
