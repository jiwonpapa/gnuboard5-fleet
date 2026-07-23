<?php

declare(strict_types=1);

namespace Api\Admin\Schema\Service;

use Api\Admin\Schema\Repository\AdminSchemaRepository;
use Api\Support\Exception\ApiException;

final class AdminSchemaService
{
    private const SUPPORTED_DOMAINS = [
        'boards',
        'config',
        'contents',
        'faqs',
        'faq-masters',
        'groups',
        'members',
        'menus',
        'polls',
        'popups',
        'points',
        'theme',
        'sms-contacts',
        'sms-messages',
        'sms-templates',
        'mails',
        'system',
        'shop-catalog-category',
        'shop-catalog-product',
        'shop-catalog-review',
        'shop-catalog-inquiry',
        'shop-catalog-event',
        'shop-catalog-option',
        'shop-catalog-stocksms',
    ];

    public function __construct(private readonly AdminSchemaRepository $repository)
    {
    }

    /**
     * @return array<string, mixed>
     */
    public function list(): array
    {
        $items = $this->repository->listDomains();

        return [
            'items' => $items,
            'total' => count($items),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function get(string $domain): array
    {
        $normalized = trim($domain);
        if (!in_array($normalized, self::SUPPORTED_DOMAINS, true)) {
            throw ApiException::notFound('지원하지 않는 schema 도메인입니다.');
        }

        return $this->repository->getDomain($normalized);
    }
}
