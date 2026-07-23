<?php

declare(strict_types=1);

namespace Tests\Admin\Schema;

use Api\Admin\Schema\Repository\AdminSchemaRepository;
use Api\Admin\Schema\Repository\AdminSchemaRuntimeOptionResolver;
use Api\Admin\Schema\Service\AdminSchemaService;
use PHPUnit\Framework\TestCase;

final class AdminSchemaRuntimeOptionResolverTest extends TestCase
{
    private string $fixtureRoot;

    protected function setUp(): void
    {
        parent::setUp();

        $this->fixtureRoot = sys_get_temp_dir() . '/g5-schema-runtime-' . bin2hex(random_bytes(4));
        $this->createDirectory($this->fixtureRoot . '/skin/new/basic');
        $this->createDirectory($this->fixtureRoot . '/skin/search/search-basic');
        $this->createDirectory($this->fixtureRoot . '/skin/connect/connect-basic');
        $this->createDirectory($this->fixtureRoot . '/skin/faq/faq-basic');
        $this->createDirectory($this->fixtureRoot . '/skin/member/member-basic');
        $this->createDirectory($this->fixtureRoot . '/mobile/skin/new/mobile-new-basic');
        $this->createDirectory($this->fixtureRoot . '/mobile/skin/search/mobile-search-basic');
        $this->createDirectory($this->fixtureRoot . '/mobile/skin/connect/mobile-connect-basic');
        $this->createDirectory($this->fixtureRoot . '/mobile/skin/faq/mobile-faq-basic');
        $this->createDirectory($this->fixtureRoot . '/mobile/skin/member/mobile-member-basic');
        $this->createDirectory($this->fixtureRoot . '/plugin/editor/ckeditor5');
        $this->createDirectory($this->fixtureRoot . '/plugin/editor/smarteditor2');
        $this->createDirectory($this->fixtureRoot . '/plugin/kcaptcha/mp3/basic');
        $this->createDirectory($this->fixtureRoot . '/plugin/kcaptcha/mp3/ko');
    }

    protected function tearDown(): void
    {
        $this->removeDirectory($this->fixtureRoot);

        parent::tearDown();
    }

    public function testConfigSchemaIncludesRuntimeOptionsForLegacyDynamicSelects(): void
    {
        $resolver = new AdminSchemaRuntimeOptionResolver(
            projectRoot: $this->fixtureRoot,
            configValues: ['cf_theme' => ''],
            memberIds: ['superadmin', 'opsadmin'],
        );
        $service = new AdminSchemaService(new AdminSchemaRepository($resolver));
        $config = $service->get('config');

        self::assertSame(
            [
                ['value' => '', 'label' => '선택안함'],
                ['value' => 'superadmin', 'label' => 'superadmin'],
                ['value' => 'opsadmin', 'label' => 'opsadmin'],
            ],
            $config['fields_by_name']['cf_admin']['options']
        );
        self::assertSame(
            [
                ['value' => '', 'label' => '선택'],
                ['value' => 'basic', 'label' => 'basic'],
            ],
            $config['fields_by_name']['cf_new_skin']['options']
        );
        self::assertSame(
            [
                ['value' => '', 'label' => '선택'],
                ['value' => 'mobile-member-basic', 'label' => 'mobile-member-basic'],
            ],
            $config['fields_by_name']['cf_mobile_member_skin']['options']
        );
        self::assertSame(
            [
                ['value' => '', 'label' => '사용안함'],
                ['value' => 'ckeditor5', 'label' => 'ckeditor5'],
                ['value' => 'smarteditor2', 'label' => 'smarteditor2'],
            ],
            $config['fields_by_name']['cf_editor']['options']
        );
        self::assertSame(
            [
                ['value' => '', 'label' => '선택'],
                ['value' => 'basic', 'label' => 'basic'],
                ['value' => 'ko', 'label' => 'ko'],
            ],
            $config['fields_by_name']['cf_captcha_mp3']['options']
        );

        $dynamicSelectFields = [
            'cf_admin',
            'cf_new_skin',
            'cf_search_skin',
            'cf_connect_skin',
            'cf_faq_skin',
            'cf_mobile_new_skin',
            'cf_mobile_search_skin',
            'cf_mobile_connect_skin',
            'cf_mobile_faq_skin',
            'cf_member_skin',
            'cf_mobile_member_skin',
            'cf_editor',
            'cf_captcha_mp3',
        ];

        foreach ($dynamicSelectFields as $fieldName) {
            self::assertSame('select', $config['fields_by_name'][$fieldName]['input_type'], $fieldName);
            self::assertNotEmpty($config['fields_by_name'][$fieldName]['options'], $fieldName);
        }
    }

    private function createDirectory(string $path): void
    {
        if (!is_dir($path)) {
            mkdir($path, 0775, true);
        }
    }

    private function removeDirectory(string $path): void
    {
        if (!is_dir($path)) {
            return;
        }

        $items = scandir($path);
        if ($items === false) {
            return;
        }

        foreach ($items as $item) {
            if ($item === '.' || $item === '..') {
                continue;
            }

            $child = $path . '/' . $item;
            if (is_dir($child)) {
                $this->removeDirectory($child);
                continue;
            }

            @unlink($child);
        }

        @rmdir($path);
    }
}
