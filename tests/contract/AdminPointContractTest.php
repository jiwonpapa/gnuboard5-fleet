<?php

declare(strict_types=1);

namespace Tests\Contract;

final class AdminPointContractTest extends ContractTestCase
{
    private const POINT_FIELDS = [
        'po_id', 'mb_id', 'po_datetime', 'po_content', 'po_point', 'po_use_point',
        'po_expired', 'po_expire_date', 'po_mb_point', 'po_rel_table', 'po_rel_id', 'po_rel_action',
    ];
    private const LEGACY_FIELDS = ['po_rel_table', 'po_rel_id', 'po_rel_action', 'po_expired'];

    public function testListResponseContractIsDeclared(): void
    {
        $this->assertMethodHasOperationId('/admin/points', 'get', 'adminListPoints');
        $this->assertMethodHasParameters('/admin/points', 'get', ['page', 'per_page', 'mb_id', 'search_field', 'search']);
        $this->assertMethodResponseSchema('/admin/points', 'get', '200', 'PointHistoryListResponse');
        $this->assertComponentArrayItemsUseSchemaRef('PointHistoryListResponse', 'PointItem');
        $this->assertComponentHasPaginationRef('PointHistoryListResponse');
        $this->assertSchemaIsClosedObject('PointHistoryListResponse');
        $this->assertSchemaIsClosedObject('PointItem');
        $this->assertSchemaRequiredFields('PointItem', self::POINT_FIELDS);
        $this->assertSchemaHasFields('PointItem', self::POINT_FIELDS);
    }

    public function testSummaryResponseContractIsDeclared(): void
    {
        $this->assertMethodHasOperationId('/admin/points/summary', 'get', 'adminPointSummary');
        $this->assertMethodHasParameters('/admin/points/summary', 'get', ['mb_id']);
        $this->assertMethodResponseSchema('/admin/points/summary', 'get', '200', 'PointSummaryResponse');
        $this->assertComponentUsesSchemaRef('PointSummaryResponse', 'PointSummary');
        $this->assertSchemaIsClosedObject('PointSummaryResponse');
        $this->assertSchemaIsClosedObject('PointSummary');
        $this->assertSchemaRequiredFields('PointSummary', ['total_point', 'total_rows']);
        $this->assertSchemaHasFields('PointSummary', ['mb_id', 'total_point', 'total_rows']);
    }

    public function testPointActionRequired(): void
    {
        $this->assertMethodHasOperationId('/admin/points', 'post', 'adminCreatePointAction');
        $this->assertRequestBodyUsesSchemaRef('/admin/points', 'post', 'PointActionRequest');
        $this->assertSchemaIsClosedObject('PointActionRequest');
        $this->assertSchemaRequiredFields('PointActionRequest', ['action']);
        $this->assertSchemaHasFields(
            'PointActionRequest',
            ['action', 'mb_id', 'point', 'po_content', 'base_date']
        );
        $this->assertMethodResponseSchema('/admin/points', 'post', '200', 'PointActionResponse');
    }

    public function testLegacyPointChangePathsShareClosedContract(): void
    {
        foreach (['/admin/points/grant', '/admin/points/deduct'] as $path) {
            $this->assertRequestBodyUsesSchemaRef($path, 'post', 'PointChangeRequest');
            $this->assertMethodResponseSchema($path, 'post', '200', 'PointChangeResponse');
        }
        $this->assertSchemaIsClosedObject('PointChangeRequest');
        $this->assertSchemaRequiredFields('PointChangeRequest', ['mb_id', 'point']);
        $this->assertSchemaHasFields('PointChangeResult', [
            'mb_id', 'before_point', 'changed_point', 'after_point', 'po_content', 'processed_at',
        ]);
    }

    public function testDeleteAndExpireUseNamedClosedContracts(): void
    {
        $this->assertRequestBodyUsesSchemaRef('/admin/points', 'delete', 'PointDeleteRequest');
        $this->assertSchemaIsClosedObject('PointDeleteRequest');
        $this->assertSchemaRequiredFields('PointDeleteRequest', ['po_ids']);
        $this->assertMethodResponseSchema('/admin/points', 'delete', '200', 'PointDeleteResponse');

        $this->assertRequestBodyUsesSchemaRef('/admin/points/expire', 'post', 'PointExpireRequest');
        $this->assertSchemaIsClosedObject('PointExpireRequest');
        $this->assertMethodResponseSchema('/admin/points/expire', 'post', '200', 'PointExpireResponse');
        $this->assertSchemaHasFields(
            'PointExpireResult',
            ['base_date', 'expired_count', 'synced_members']
        );
    }

    public function testPointFieldsMatchLegacy(): void
    {
        $this->markLegacyParitySkipped('point', self::LEGACY_FIELDS);
    }

    public function testPointDateTimeUsesRfc3339Format(): void
    {
        $this->assertSchemaFieldContains('PointItem', 'po_datetime', 'format: date-time');
    }
}
