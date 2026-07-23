<?php

declare(strict_types=1);

namespace Api\Admin\Mail\Service\Support;

use Api\Core\Config\EnvValueReader;

final class AdminMailDispatchConfig
{
    public function mailEnabled(): bool
    {
        return EnvValueReader::bool('AUTH_MAIL_SEND_ENABLED', false);
    }

    public function subjectPrefix(): string
    {
        return EnvValueReader::string('AUTH_MAIL_SUBJECT_PREFIX', '[G5 API]');
    }

    public function fromAddress(): string
    {
        return EnvValueReader::string('AUTH_MAIL_FROM', 'no-reply@localhost');
    }
}
