<?php

declare(strict_types=1);

return [
    \Api\Admin\Sms\Support\SmsTransport::class => \DI\autowire(\Api\Admin\Sms\Support\LegacyIcodeTransport::class),
];
