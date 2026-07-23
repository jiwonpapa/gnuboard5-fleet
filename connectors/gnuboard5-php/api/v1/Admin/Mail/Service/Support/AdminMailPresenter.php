<?php

/**
 * AdminMailPresenter API module.
 *
 * @package  Gnuboard5\Api\v1\Admin\Mail\Service\Support
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Admin\Mail\Service\Support;

final class AdminMailPresenter
{
    /**
     * @param array<string, mixed> $mail
     * @return array{ma_id:int, ma_subject:string, ma_content:string, ma_time:string, ma_ip:string, ma_last_option:string}
     */
    public static function template(array $mail): array
    {
        return [
            'ma_id' => (int)($mail['ma_id'] ?? 0),
            'ma_subject' => (string)($mail['ma_subject'] ?? ''),
            'ma_content' => (string)($mail['ma_content'] ?? ''),
            'ma_time' => (string)($mail['ma_time'] ?? ''),
            'ma_ip' => (string)($mail['ma_ip'] ?? ''),
            'ma_last_option' => (string)($mail['ma_last_option'] ?? ''),
        ];
    }

    /**
     * @param array<string, mixed> $mail
     * @return array<string, mixed>
     */
    public static function detail(array $mail): array
    {
        return [
            ...self::template($mail),
            'last_option' => is_array($mail['last_option'] ?? null) ? $mail['last_option'] : [],
            'preview_html' => (string)($mail['preview_html'] ?? ''),
        ];
    }

    /**
     * @param array<string, mixed> $recipient
     * @return array{mb_id:string, mb_name:string, mb_nick:string, mb_email:string, mb_level:int, mb_mailling:int, mb_datetime:string}
     */
    public static function recipient(array $recipient): array
    {
        return [
            'mb_id' => (string)($recipient['mb_id'] ?? ''),
            'mb_name' => (string)($recipient['mb_name'] ?? ''),
            'mb_nick' => (string)($recipient['mb_nick'] ?? ''),
            'mb_email' => (string)($recipient['mb_email'] ?? ''),
            'mb_level' => (int)($recipient['mb_level'] ?? 0),
            'mb_mailling' => (int)($recipient['mb_mailling'] ?? 0),
            'mb_datetime' => (string)($recipient['mb_datetime'] ?? ''),
        ];
    }
}
