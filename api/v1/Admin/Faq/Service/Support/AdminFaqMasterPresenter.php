<?php

declare(strict_types=1);

namespace Api\Admin\Faq\Service\Support;

final class AdminFaqMasterPresenter
{
    public function __construct(private readonly AdminFaqMasterImageManager $imageManager)
    {
    }

    /**
     * @param array<string,mixed> $item
     * @return array<string,mixed>
     */
    public function summary(array $item): array
    {
        $masterId = (int)($item['fm_id'] ?? 0);

        return [
            'fm_id' => $masterId,
            'fm_subject' => (string)($item['fm_subject'] ?? ''),
            'fm_order' => (int)($item['fm_order'] ?? 0),
            'faq_count' => (int)($item['faq_count'] ?? 0),
            'header_image' => $this->imageManager->describe($masterId, 'h'),
            'footer_image' => $this->imageManager->describe($masterId, 't'),
        ];
    }

    /**
     * @param array<string,mixed> $master
     * @return array<string,mixed>
     */
    public function detail(array $master): array
    {
        $masterId = (int)($master['fm_id'] ?? 0);

        return [
            'fm_id' => $masterId,
            'fm_subject' => (string)($master['fm_subject'] ?? ''),
            'fm_head_html' => (string)($master['fm_head_html'] ?? ''),
            'fm_tail_html' => (string)($master['fm_tail_html'] ?? ''),
            'fm_mobile_head_html' => (string)($master['fm_mobile_head_html'] ?? ''),
            'fm_mobile_tail_html' => (string)($master['fm_mobile_tail_html'] ?? ''),
            'fm_order' => (int)($master['fm_order'] ?? 0),
            'faq_count' => (int)($master['faq_count'] ?? 0),
            'header_image' => $this->imageManager->describe($masterId, 'h'),
            'footer_image' => $this->imageManager->describe($masterId, 't'),
        ];
    }

    /**
     * @return array<string,int|bool>
     */
    public function pagination(int $page, int $perPage, int $total): array
    {
        $lastPage = max(1, (int)ceil($total / max(1, $perPage)));

        return [
            'total' => $total,
            'page' => $page,
            'per_page' => $perPage,
            'last_page' => $lastPage,
            'has_next' => $page < $lastPage,
            'has_prev' => $page > 1,
        ];
    }
}
