<?php

declare(strict_types=1);

namespace Tests\Admin\Dev;

use Api\Admin\Dev\Support\LegacyAdminSchemaParityComparator;
use PHPUnit\Framework\TestCase;

final class LegacyAdminSchemaParityComparatorTest extends TestCase
{
    public function testComparatorPassesWhenLegacyAndSchemaMatch(): void
    {
        $inventory = [
            'fields' => [
                [
                    'name' => 'cf_admin',
                    'section_key' => 'anc_cf_basic',
                    'render_type' => 'select',
                    'required' => true,
                    'readonly' => false,
                    'disabled' => false,
                    'option_count' => 2,
                ],
                [
                    'name' => 'cf_1_subj',
                    'section_key' => 'anc_cf_extra',
                    'render_type' => 'text',
                    'required' => false,
                    'readonly' => false,
                    'disabled' => false,
                    'option_count' => 0,
                ],
                [
                    'name' => 'cf_1',
                    'section_key' => 'anc_cf_extra',
                    'render_type' => 'text',
                    'required' => false,
                    'readonly' => false,
                    'disabled' => false,
                    'option_count' => 0,
                ],
            ],
        ];

        $schema = [
            'sections' => [
                [
                    'key' => 'anc_cf_basic',
                    'fields' => [
                        [
                            'name' => 'cf_admin',
                            'input_type' => 'select',
                            'required' => true,
                            'readonly_on_update' => false,
                            'options' => [
                                ['value' => '', 'label' => '선택안함'],
                                ['value' => 'neojins', 'label' => 'neojins'],
                            ],
                        ],
                    ],
                ],
                [
                    'key' => 'anc_cf_extra',
                    'fields' => [
                        [
                            'name' => 'cf_1_subj',
                            'input_type' => 'text',
                            'required' => false,
                            'readonly_on_update' => false,
                            'options' => [],
                        ],
                        [
                            'name' => 'cf_1',
                            'input_type' => 'text',
                            'required' => false,
                            'readonly_on_update' => false,
                            'options' => [],
                        ],
                    ],
                ],
            ],
        ];

        $report = (new LegacyAdminSchemaParityComparator())->compare($inventory, $schema, ['strict_choice_options' => true]);

        self::assertSame('pass', $report['status']);
        self::assertSame([], $report['legacy_only_fields']);
        self::assertSame([], $report['schema_only_fields']);
        self::assertSame([], $report['render_type_mismatches']);
        self::assertSame([], $report['required_mismatches']);
        self::assertSame([], $report['readonly_mismatches']);
    }

    public function testComparatorReportsReadonlyRenderAndMissingFieldDrift(): void
    {
        $inventory = [
            'fields' => [
                [
                    'name' => 'cf_1_subj',
                    'section_key' => 'anc_cf_extra',
                    'render_type' => 'text',
                    'required' => false,
                    'readonly' => false,
                    'disabled' => false,
                    'option_count' => 0,
                ],
                [
                    'name' => 'cf_1',
                    'section_key' => 'anc_cf_extra',
                    'render_type' => 'text',
                    'required' => false,
                    'readonly' => false,
                    'disabled' => false,
                    'option_count' => 0,
                ],
            ],
        ];

        $schema = [
            'sections' => [
                [
                    'key' => 'anc_cf_extra',
                    'fields' => [
                        [
                            'name' => 'cf_1_subj',
                            'input_type' => 'text',
                            'required' => false,
                            'readonly_on_update' => true,
                            'options' => [],
                        ],
                    ],
                ],
            ],
        ];

        $report = (new LegacyAdminSchemaParityComparator())->compare($inventory, $schema);

        self::assertSame('fail', $report['status']);
        self::assertSame(['cf_1'], $report['legacy_only_fields']);
        self::assertSame(
            [['field' => 'cf_1_subj', 'legacy' => false, 'schema' => true]],
            $report['readonly_mismatches']
        );
    }

    public function testComparatorNormalizesLegacyAliasFieldsAndIgnoresHelperInputs(): void
    {
        $inventory = [
            'fields' => [
                [
                    'name' => 'mb_certify_case',
                    'section_key' => null,
                    'render_type' => 'radio',
                    'required' => false,
                    'readonly' => false,
                    'disabled' => false,
                    'option_count' => 3,
                ],
                [
                    'name' => 'captcha_key',
                    'section_key' => null,
                    'render_type' => 'text',
                    'required' => true,
                    'readonly' => false,
                    'disabled' => false,
                    'option_count' => 0,
                ],
            ],
        ];

        $schema = [
            'sections' => [
                [
                    'key' => 'member_profile',
                    'fields' => [
                        [
                            'name' => 'mb_certify',
                            'input_type' => 'radio',
                            'required' => false,
                            'readonly_on_update' => false,
                            'options' => [
                                ['value' => 'simple', 'label' => '간편인증'],
                                ['value' => 'hp', 'label' => '휴대폰'],
                                ['value' => 'ipin', 'label' => '아이핀'],
                            ],
                        ],
                    ],
                ],
            ],
        ];

        $report = (new LegacyAdminSchemaParityComparator())->compare(
            $inventory,
            $schema,
            [
                'source_field_map' => [
                    'mb_certify' => 'mb_certify_case',
                ],
                'ignored_legacy_fields' => ['captcha_key'],
                'strict_choice_options' => true,
            ]
        );

        self::assertSame('pass', $report['status']);
        self::assertSame([], $report['legacy_only_fields']);
        self::assertSame([], $report['schema_only_fields']);
    }

    public function testComparatorSkipsSectionMismatchWhenLegacyFormHasNoSectionMetadata(): void
    {
        $inventory = [
            'fields' => [
                [
                    'name' => 'mb_name',
                    'section_key' => null,
                    'render_type' => 'text',
                    'required' => true,
                    'readonly' => false,
                    'disabled' => false,
                    'option_count' => 0,
                ],
            ],
        ];

        $schema = [
            'sections' => [
                [
                    'key' => 'member_profile',
                    'fields' => [
                        [
                            'name' => 'mb_name',
                            'input_type' => 'text',
                            'required' => true,
                            'readonly_on_update' => false,
                            'options' => [],
                        ],
                    ],
                ],
            ],
        ];

        $report = (new LegacyAdminSchemaParityComparator())->compare($inventory, $schema);

        self::assertSame('pass', $report['status']);
        self::assertSame([], $report['section_mismatches']);
    }

    public function testComparatorCanIgnoreDeclaredRenderTypeMismatches(): void
    {
        $inventory = [
            'fields' => [
                [
                    'name' => 'cf_icode_server_port',
                    'section_key' => 'anc_cf_sms',
                    'render_type' => 'hidden',
                    'required' => false,
                    'readonly' => false,
                    'disabled' => false,
                    'option_count' => 0,
                ],
            ],
        ];

        $schema = [
            'sections' => [
                [
                    'key' => 'anc_cf_sms',
                    'fields' => [
                        [
                            'name' => 'cf_icode_server_port',
                            'input_type' => 'number',
                            'required' => false,
                            'readonly_on_update' => false,
                            'options' => [],
                        ],
                    ],
                ],
            ],
        ];

        $report = (new LegacyAdminSchemaParityComparator())->compare(
            $inventory,
            $schema,
            [
                'ignored_render_type_mismatches' => ['cf_icode_server_port'],
            ]
        );

        self::assertSame('pass', $report['status']);
        self::assertSame([], $report['render_type_mismatches']);
    }

    public function testComparatorCanIgnoreDeclaredSectionMismatches(): void
    {
        $inventory = [
            'fields' => [
                [
                    'name' => 'bo_sort_field',
                    'section_key' => 'anc_bo_design',
                    'render_type' => 'select',
                    'required' => false,
                    'readonly' => false,
                    'disabled' => false,
                    'option_count' => 2,
                ],
            ],
        ];

        $schema = [
            'sections' => [
                [
                    'key' => 'misc',
                    'fields' => [
                        [
                            'name' => 'bo_sort_field',
                            'input_type' => 'select',
                            'required' => false,
                            'readonly_on_update' => false,
                            'options' => [
                                ['value' => '', 'label' => '기본'],
                                ['value' => 'wr_num, wr_reply', 'label' => '기본정렬'],
                            ],
                        ],
                    ],
                ],
            ],
        ];

        $report = (new LegacyAdminSchemaParityComparator())->compare(
            $inventory,
            $schema,
            [
                'ignored_section_mismatches' => ['bo_sort_field'],
            ]
        );

        self::assertSame('pass', $report['status']);
        self::assertSame([], $report['section_mismatches']);
    }

    public function testComparatorCanIgnoreDeclaredRequiredMismatches(): void
    {
        $inventory = [
            'fields' => [
                [
                    'name' => 'cf_phone',
                    'section_key' => 'anc_cf_sms',
                    'render_type' => 'text',
                    'required' => true,
                    'readonly' => false,
                    'disabled' => false,
                    'option_count' => 0,
                ],
            ],
        ];

        $schema = [
            'sections' => [
                [
                    'key' => 'anc_cf_sms',
                    'fields' => [
                        [
                            'name' => 'cf_phone',
                            'input_type' => 'text',
                            'required' => false,
                            'readonly_on_update' => false,
                            'options' => [],
                        ],
                    ],
                ],
            ],
        ];

        $report = (new LegacyAdminSchemaParityComparator())->compare(
            $inventory,
            $schema,
            [
                'ignored_required_mismatches' => ['cf_phone'],
            ]
        );

        self::assertSame('pass', $report['status']);
        self::assertSame([], $report['required_mismatches']);
    }

    public function testComparatorCanIgnoreDeclaredSchemaOnlyFields(): void
    {
        $inventory = [
            'fields' => [
                [
                    'name' => 'wr_reply',
                    'section_key' => 'sms_message_send',
                    'render_type' => 'text',
                    'required' => true,
                    'readonly' => false,
                    'disabled' => false,
                    'option_count' => 0,
                ],
            ],
        ];

        $schema = [
            'sections' => [
                [
                    'key' => 'sms_message_send',
                    'fields' => [
                        [
                            'name' => 'wr_reply',
                            'input_type' => 'text',
                            'required' => true,
                            'readonly_on_update' => false,
                            'options' => [],
                        ],
                        [
                            'name' => 'booking_at',
                            'input_type' => 'datetime-local',
                            'required' => false,
                            'readonly_on_update' => false,
                            'options' => [],
                        ],
                    ],
                ],
            ],
        ];

        $report = (new LegacyAdminSchemaParityComparator())->compare(
            $inventory,
            $schema,
            [
                'ignored_schema_only_fields' => ['booking_at'],
            ]
        );

        self::assertSame('pass', $report['status']);
        self::assertSame([], $report['schema_only_fields']);
    }

    public function testComparatorCanIgnoreDeclaredReadonlyMismatches(): void
    {
        $inventory = [
            'fields' => [
                [
                    'name' => 'wr_reply',
                    'section_key' => 'sms_message_send',
                    'render_type' => 'text',
                    'required' => true,
                    'readonly' => true,
                    'disabled' => false,
                    'option_count' => 0,
                ],
            ],
        ];

        $schema = [
            'sections' => [
                [
                    'key' => 'sms_message_send',
                    'fields' => [
                        [
                            'name' => 'wr_reply',
                            'input_type' => 'text',
                            'required' => true,
                            'readonly_on_update' => false,
                            'options' => [],
                        ],
                    ],
                ],
            ],
        ];

        $report = (new LegacyAdminSchemaParityComparator())->compare(
            $inventory,
            $schema,
            [
                'ignored_readonly_mismatches' => ['wr_reply'],
            ]
        );

        self::assertSame('pass', $report['status']);
        self::assertSame([], $report['readonly_mismatches']);
    }
}
