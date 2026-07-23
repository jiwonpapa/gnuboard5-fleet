<?php

declare(strict_types=1);

namespace Api\Admin\Sms\Support;

interface SmsTransport
{
    /**
     * @param array<string,mixed> $config
     * @param array<int,array<string,mixed>> $recipients
     * @return array{success:int,failure:int,items:array<int,array<string,mixed>>}
     */
    public function sendBatch(
        array $config,
        string $message,
        string $reply,
        array $recipients,
        string $bookingKey
    ): array;
}
