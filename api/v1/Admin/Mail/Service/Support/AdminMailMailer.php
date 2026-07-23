<?php

declare(strict_types=1);

namespace Api\Admin\Mail\Service\Support;

final class AdminMailMailer
{
    public function __construct(private readonly AdminMailDispatchConfig $config)
    {
    }

    public function send(string $to, string $subject, string $body): bool
    {
        $normalizedTo = trim($to);
        if ($normalizedTo === '' || filter_var($normalizedTo, FILTER_VALIDATE_EMAIL) === false) {
            return false;
        }

        $fullSubject = trim($this->config->subjectPrefix() . ' ' . $subject);
        $from = $this->config->fromAddress();

        $headers = [];
        if ($from !== '') {
            $headers[] = 'From: ' . $from;
            $headers[] = 'Reply-To: ' . $from;
        }
        $headers[] = 'Content-Type: text/plain; charset=UTF-8';

        return @mail($normalizedTo, $fullSubject, $body, implode("\r\n", $headers));
    }
}
