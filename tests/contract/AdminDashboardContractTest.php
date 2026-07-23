<?php

declare(strict_types=1);

namespace Tests\Contract;

final class AdminDashboardContractTest extends ContractTestCase
{
    public function testDashboardResponseContractIsDeclared(): void
    {
        $this->assertMethodHasOperationId('/admin/dashboard', 'get', 'adminGetDashboard');
        $this->assertMethodHasParameters('/admin/dashboard', 'get', ['limit']);
        $this->assertMethodResponseSchema('/admin/dashboard', 'get', '200', 'AdminDashboardResponse');
        $this->assertComponentUsesSchemaRef('AdminDashboardResponse', 'AdminDashboardData');
        $this->assertSchemaHasFields('AdminDashboardData', ['limit', 'summary', 'recent_members', 'recent_posts', 'recent_points']);
        $this->assertSchemaHasFields('AdminDashboardSummary', ['members', 'posts', 'points', 'visits']);
        $this->assertSchemaHasFields('AdminDashboardMemberSummary', ['total_members', 'blocked_members', 'leave_members']);
        $this->assertSchemaHasFields('AdminDashboardPostSummary', ['total_rows']);
        $this->assertSchemaHasFields('AdminDashboardRecentMember', ['mb_id', 'mb_name', 'mb_level', 'group_count']);
        $this->assertSchemaHasFields('AdminDashboardRecentPost', ['bn_id', 'bo_table', 'wr_subject', 'wr_datetime', 'view_type']);
        $this->assertSchemaHasFields('AdminDashboardRecentPoint', ['po_id', 'mb_id', 'po_content', 'po_point']);
    }
}
