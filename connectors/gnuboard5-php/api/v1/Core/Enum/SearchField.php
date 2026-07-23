<?php

/**
 * 게시글 검색 필드 정의.
 *
 * @package  Api\Core\Enum
 * @since    v1.1.0
 */

declare(strict_types=1);

namespace Api\Core\Enum;

enum SearchField: string
{
    case Title = 'title';
    case Content = 'content';
    case TitleContent = 'title_content';
    case Author = 'author';
    case Comment = 'comment';

    /**
     * @return array<int, string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
