<?php

declare(strict_types=1);

namespace Tests\Config;

use Api\Config\Repository\ConfigRepository;
use Api\Config\Service\ConfigService;
use PHPUnit\Framework\TestCase;

final class ConfigServiceTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        $GLOBALS['config'] = [
            'cf_title' => '테스트사이트',
            'cf_admin_email' => 'admin@example.com',
            'cf_point_term' => 30,
            'cf_secret' => 'skip-me',
        ];
    }

    public function testGetPublicConfigOnlyExposesWhitelistKeys(): void
    {
        $repository = new ConfigRepository();
        $service = new ConfigService($repository);

        $result = $service->getPublicConfig();

        $this->assertSame([
            'cf_title' => '테스트사이트',
            'cf_admin_email' => 'admin@example.com',
            'cf_point_term' => 30,
        ], $result);
    }
}
