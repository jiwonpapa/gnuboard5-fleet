<?php

declare(strict_types=1);

namespace Tests\Admin\Dev;

use Api\Admin\Dev\Support\LegacyAdminSchemaParitySurfaceMerger;
use PHPUnit\Framework\TestCase;

final class LegacyAdminSchemaParitySurfaceMergerTest extends TestCase
{
    public function testConstrainInventoryUsesSupportedFieldScope(): void
    {
        $inventory = [
            'fields' => [
                ['name' => 'cf_sms_use', 'render_type' => 'select'],
                ['name' => 'cf_phone', 'render_type' => 'text'],
                ['name' => 'cf_title', 'render_type' => 'text'],
            ],
        ];

        $result = (new LegacyAdminSchemaParitySurfaceMerger())->constrainInventory(
            $inventory,
            [
                'supported_fields' => ['cf_sms_use', 'cf_phone'],
            ],
            [
                'schema_scope' => 'supported_fields',
            ]
        );

        self::assertSame(['cf_sms_use', 'cf_phone'], array_values(array_map(
            static fn (array $field): string => (string)$field['name'],
            $result['fields']
        )));
    }

    public function testConstrainInventoryUsesSchemaFieldScope(): void
    {
        $inventory = [
            'fields' => [
                ['name' => 'bo_subject', 'render_type' => 'text'],
                ['name' => 'chk_all_subject', 'render_type' => 'checkbox'],
            ],
        ];

        $schema = [
            'sections' => [
                [
                    'key' => 'anc_bo_basic',
                    'fields' => [
                        ['name' => 'bo_subject', 'input_type' => 'text'],
                    ],
                ],
            ],
        ];

        $result = (new LegacyAdminSchemaParitySurfaceMerger())->constrainInventory(
            $inventory,
            [],
            [
                'schema_scope' => 'schema_fields',
            ],
            $schema
        );

        self::assertSame(['bo_subject'], array_values(array_map(
            static fn (array $field): string => (string)$field['name'],
            $result['fields']
        )));
    }

    public function testMergeInventoriesPrefersVisibleFieldOverHiddenDuplicate(): void
    {
        $merger = new LegacyAdminSchemaParitySurfaceMerger();

        $result = $merger->mergeInventories([
            [
                'sections' => [
                    ['key' => 'anc_cf_sms', 'label' => 'SMS'],
                ],
                'fields' => [
                    [
                        'name' => 'cf_sms_use',
                        'label' => 'SMS 사용',
                        'section_key' => 'anc_cf_sms',
                        'section_label' => 'SMS',
                        'render_type' => 'select',
                        'required' => false,
                        'readonly' => false,
                        'disabled' => false,
                        'option_count' => 2,
                        'options' => [
                            ['value' => '', 'label' => '사용안함'],
                            ['value' => 'icode', 'label' => '아이코드'],
                        ],
                    ],
                ],
            ],
            [
                'sections' => [
                    ['key' => 'anc_cf_sms', 'label' => 'SMS'],
                ],
                'fields' => [
                    [
                        'name' => 'cf_sms_use',
                        'label' => 'SMS 사용',
                        'section_key' => 'anc_cf_sms',
                        'section_label' => 'SMS',
                        'render_type' => 'hidden',
                        'required' => false,
                        'readonly' => true,
                        'disabled' => false,
                        'option_count' => 0,
                        'options' => [],
                    ],
                    [
                        'name' => 'cf_phone',
                        'label' => '회신번호',
                        'section_key' => 'anc_cf_sms',
                        'section_label' => 'SMS',
                        'render_type' => 'text',
                        'required' => true,
                        'readonly' => false,
                        'disabled' => false,
                        'option_count' => 0,
                        'options' => [],
                    ],
                ],
            ],
        ]);

        $fieldsByName = [];
        foreach ($result['fields'] as $field) {
            $fieldsByName[$field['name']] = $field;
        }

        self::assertSame(2, $result['field_count']);
        self::assertSame('select', $fieldsByName['cf_sms_use']['render_type']);
        self::assertSame(2, $fieldsByName['cf_sms_use']['option_count']);
        self::assertSame('text', $fieldsByName['cf_phone']['render_type']);
    }

    public function testMergeSchemasCombinesFieldsFromMultipleSurfaces(): void
    {
        $result = (new LegacyAdminSchemaParitySurfaceMerger())->mergeSchemas([
            [
                'sections' => [
                    [
                        'key' => 'anc_cf_sms',
                        'label' => 'SMS',
                        'fields' => [
                            ['name' => 'cf_sms_use', 'input_type' => 'select', 'options' => []],
                        ],
                    ],
                ],
            ],
            [
                'sections' => [
                    [
                        'key' => 'anc_cf_sms',
                        'label' => 'SMS',
                        'fields' => [
                            ['name' => 'cf_phone', 'input_type' => 'text', 'options' => []],
                        ],
                    ],
                ],
            ],
        ]);

        self::assertCount(1, $result['sections']);
        self::assertSame(
            ['cf_sms_use', 'cf_phone'],
            array_values(array_map(
                static fn (array $field): string => (string)$field['name'],
                $result['sections'][0]['fields']
            ))
        );
    }

    public function testConstrainInventoryAppliesDefaultSectionWhenLegacySurfaceHasNoAnchor(): void
    {
        $result = (new LegacyAdminSchemaParitySurfaceMerger())->constrainInventory(
            [
                'fields' => [
                    [
                        'name' => 'cf_phone',
                        'section_key' => null,
                        'section_label' => null,
                        'render_type' => 'text',
                    ],
                ],
            ],
            [],
            [
                'default_section' => [
                    'key' => 'anc_cf_sms',
                    'label' => 'SMS',
                ],
            ]
        );

        self::assertSame('anc_cf_sms', $result['fields'][0]['section_key']);
        self::assertSame('SMS', $result['fields'][0]['section_label']);
    }
}
