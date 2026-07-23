<?php

declare(strict_types=1);

namespace Tests\Admin\Config;

use Api\Admin\Config\Support\AdminConfigPresenter;
use PHPUnit\Framework\TestCase;

final class AdminConfigPresenterTest extends TestCase
{
    public function testReturnsOnlyCanonicalSafeFieldsWithDeclaredOutputTypes(): void
    {
        $config = [
            'cf_title' => '그누보드',
            'cf_use_point' => '1',
            'cf_comment_point' => '-10',
            'cf_cert_kcp_enckey' => 'kcp-secret',
            'cf_recaptcha_secret_key' => 'captcha-secret',
            'cf_google_secret' => 'google-secret',
            'unknown_database_column' => 'must-not-leak',
        ];

        $presented = (new AdminConfigPresenter())->present($config);

        self::assertSame('그누보드', $presented['cf_title']);
        self::assertSame(1, $presented['cf_use_point']);
        self::assertSame(-10, $presented['cf_comment_point']);
        self::assertArrayNotHasKey('unknown_database_column', $presented);
        foreach (AdminConfigPresenter::SENSITIVE_FIELDS as $field) {
            self::assertArrayNotHasKey($field, $presented);
        }
    }
}
