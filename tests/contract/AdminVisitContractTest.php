<?php

declare(strict_types=1);

namespace Tests\Contract;

final class AdminVisitContractTest extends ContractTestCase
{
    private const VISIT_STATS_FIELDS = ['type', 'summary', 'items'];
    private const VISIT_SUMMARY_FIELDS = ['total_visits', 'active_days', 'visit_rows', 'unique_ips'];
    private const VISIT_LOG_FIELDS = ['vi_id', 'vi_ip', 'vi_date', 'vi_referer', 'vi_browser'];
    private const LEGACY_FIELDS = ['before', 'vi_os', 'vi_agent'];

    public function testStatsResponseContractIsDeclared(): void
    {
        $this->assertMethodHasOperationId('/admin/visits/stats', 'get', 'adminVisitStats');
        $this->assertMethodHasParameters('/admin/visits/stats', 'get', ['date_from', 'date_to', 'type', 'limit']);
        $this->assertMethodResponseSchema('/admin/visits/stats', 'get', '200', 'VisitStatsResponse');
        $this->assertComponentUsesSchemaRef('VisitStatsResponse', 'VisitStatsData');
        $this->assertSchemaHasFields('VisitStatsData', self::VISIT_STATS_FIELDS);
        $this->assertSchemaHasFields('VisitStatsSummary', self::VISIT_SUMMARY_FIELDS);
    }

    public function testSearchResponseContractIsDeclared(): void
    {
        $this->assertMethodHasOperationId('/admin/visits/search', 'get', 'adminSearchVisits');
        $this->assertMethodHasParameters('/admin/visits/search', 'get', ['page', 'per_page', 'date_from', 'date_to', 'ip', 'referer', 'agent']);
        $this->assertMethodResponseSchema('/admin/visits/search', 'get', '200', 'VisitSearchResponse');
        $this->assertComponentArrayItemsUseSchemaRef('VisitSearchResponse', 'VisitLogItem');
        $this->assertComponentHasPaginationRef('VisitSearchResponse');
        $this->assertSchemaHasFields('VisitLogItem', self::VISIT_LOG_FIELDS);
    }

    public function testDeletePayloadIsDocumented(): void
    {
        $this->assertMethodHasOperationId('/admin/visits', 'delete', 'adminDeleteVisits');
        $this->assertRequestBodyUsesSchemaRef('/admin/visits', 'delete', 'AdminVisitDeleteRequest');
        $this->assertSchemaIsClosedObject('AdminVisitDeleteRequest');
        $this->assertSchemaHasFields('AdminVisitDeleteRequest', ['before', 'date_from', 'date_to', 'ip']);
    }

    public function testDeleteResponseContractIsDeclared(): void
    {
        $this->assertMethodResponseSchema('/admin/visits', 'delete', '200', 'VisitDeleteResponse');
        $this->assertComponentUsesSchemaRef('VisitDeleteResponse', 'VisitDeleteResult');
        $this->assertSchemaHasFields('VisitDeleteResult', ['deleted_rows', 'before', 'date_from', 'date_to', 'ip']);
    }

    public function testVisitFieldsMatchLegacy(): void
    {
        $this->markLegacyParitySkipped('visit', self::LEGACY_FIELDS);
    }
}
