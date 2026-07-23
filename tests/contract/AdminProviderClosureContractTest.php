<?php

declare(strict_types=1);

namespace Tests\Contract;

final class AdminProviderClosureContractTest extends ContractTestCase
{
    public function testRemainingAdminRequestsUseNamedClosedSchemas(): void
    {
        $requests = [
            ['/admin/polls', 'post', 'AdminPollCreateRequest'],
            ['/admin/polls/{po_id}', 'patch', 'AdminPollUpdateRequest'],
            ['/admin/popular', 'delete', 'AdminPopularResetRequest'],
            ['/admin/visits', 'delete', 'AdminVisitDeleteRequest'],
            ['/admin/push/send', 'post', 'AdminPushSendRequest'],
            ['/admin/reports/{report_id}', 'patch', 'AdminReportUpdateRequest'],
            ['/admin/qa', 'delete', 'AdminQaBulkDeleteRequest'],
        ];

        foreach ($requests as [$path, $method, $schema]) {
            $this->assertRequestBodyUsesSchemaRef($path, $method, $schema);
            $this->assertSchemaIsClosedObject($schema);
        }
    }

    public function testRemainingAdminSuccessResponsesAreConcrete(): void
    {
        $responses = [
            ['/admin/polls', 'get', '200', 'AdminPollListResponse'],
            ['/admin/polls', 'post', '201', 'PollDetailResponse'],
            ['/admin/popular', 'get', '200', 'AdminPopularListResponse'],
            ['/admin/popular/rank', 'get', '200', 'AdminPopularRankResponse'],
            ['/admin/write-count/stats', 'get', '200', 'AdminWriteCountStatsResponse'],
            ['/admin/push/send', 'post', '200', 'AdminPushSendResponse'],
            ['/admin/reports', 'get', '200', 'AdminReportListResponse'],
            ['/admin/reports/{report_id}', 'patch', '200', 'AdminReportDetailResponse'],
            ['/admin/reports/stats', 'get', '200', 'AdminReportStatsResponse'],
            ['/admin/qa', 'delete', '200', 'AdminQaBulkDeleteResponse'],
        ];

        foreach ($responses as [$path, $method, $status, $schema]) {
            $this->assertMethodResponseSchema($path, $method, $status, $schema);
            $this->assertSchemaIsClosedObject($schema);
        }
    }
}
