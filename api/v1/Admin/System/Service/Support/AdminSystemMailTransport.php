<?php

declare(strict_types=1);

namespace Api\Admin\System\Service\Support;

final class AdminSystemMailTransport
{
    public function __construct(private readonly ?AdminSystemMailDispatchConfig $config = null)
    {
    }

    public function send(string $to, string $subject, string $body): bool
    {
        $normalizedTo = trim($to);
        if ($normalizedTo === '' || !filter_var($normalizedTo, FILTER_VALIDATE_EMAIL)) {
            return false;
        }

        $fullSubject = trim($this->config()->subjectPrefix() . ' ' . $subject);
        $from = $this->config()->fromAddress();
        $headers = [];
        if ($from !== '') {
            $headers[] = 'From: ' . $from;
            $headers[] = 'Reply-To: ' . $from;
        }
        $headers[] = 'Content-Type: text/plain; charset=UTF-8';

        return @mail($normalizedTo, $fullSubject, $body, implode("\r\n", $headers));
    }

    private function config(): AdminSystemMailDispatchConfig
    {
        return $this->config ?? new AdminSystemMailDispatchConfig();
    }
}
