<?php

declare(strict_types=1);

namespace Api\Admin\System\Service\Support;

use Api\Core\Config\EnvValueReader;

final class AdminSystemMailDispatchConfig
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

    public function unsubscribeBaseUrl(): string
    {
        return EnvValueReader::string('AUTH_MAIL_UNSUBSCRIBE_URL', '');
    }
}
