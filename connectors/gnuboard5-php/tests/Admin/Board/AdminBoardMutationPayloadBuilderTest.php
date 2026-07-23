<?php

declare(strict_types=1);

namespace Tests\Admin\Board;

use Api\Admin\Board\Repository\AdminBoardMutationPayloadBuilder;
use PHPUnit\Framework\TestCase;

final class AdminBoardMutationPayloadBuilderTest extends TestCase
{
    public function testMinimalContractCreateFillsStrictMysqlTextColumns(): void
    {
        $payload = (new AdminBoardMutationPayloadBuilder())->buildCreatePayload(
            ['bo_category_list', 'bo_content_head'],
            [
                'bo_table' => 'audit_board',
                'bo_subject' => 'Audit board',
                'gr_id' => 'audit',
            ]
        );

        foreach ([
            'bo_category_list',
            'bo_content_head',
            'bo_mobile_content_head',
            'bo_content_tail',
            'bo_mobile_content_tail',
            'bo_insert_content',
            'bo_notice',
        ] as $field) {
            self::assertArrayHasKey($field, $payload);
            self::assertSame('', $payload[$field]);
        }
    }

    public function testProvidedTextValueOverridesCreateDefault(): void
    {
        $payload = (new AdminBoardMutationPayloadBuilder())->buildCreatePayload(
            ['bo_category_list'],
            [
                'bo_table' => 'audit_board',
                'bo_subject' => 'Audit board',
                'gr_id' => 'audit',
                'bo_category_list' => 'notice|general',
            ]
        );

        self::assertSame('notice|general', $payload['bo_category_list']);
    }
}
