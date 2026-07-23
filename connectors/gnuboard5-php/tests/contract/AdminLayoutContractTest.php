<?php

/**
 * 관리자 레이아웃 요청/응답 계약 회귀를 검증합니다.
 *
 * @package  Tests\Contract
 * @since    v1.1.0
 */

declare(strict_types=1);

namespace Tests\Contract;

final class AdminLayoutContractTest extends ContractTestCase
{
    public function testEveryLayoutSuccessBodyUsesConcreteNamedResponse(): void
    {
        $responses = [
            ['/admin/layouts', 'get', '200', 'AdminLayoutListResponse'],
            ['/admin/layouts/{page_id}', 'get', '200', 'AdminLayoutDetailResponse'],
            ['/admin/layouts/{page_id}', 'put', '200', 'AdminLayoutDetailResponse'],
            ['/admin/layouts/{page_id}/widgets', 'post', '201', 'AdminLayoutDetailResponse'],
            ['/admin/layouts/{page_id}/widgets', 'patch', '200', 'AdminLayoutDetailResponse'],
            ['/admin/layouts/{page_id}/widgets/{widget_id}', 'patch', '200', 'AdminLayoutDetailResponse'],
            ['/admin/layouts/{page_id}/widgets/{widget_id}', 'delete', '200', 'AdminLayoutDetailResponse'],
            ['/admin/layouts/{page_id}/reorder', 'patch', '200', 'AdminLayoutDetailResponse'],
        ];

        foreach ($responses as [$path, $method, $status, $schema]) {
            $this->assertMethodResponseSchema($path, $method, $status, $schema);
        }
    }

    public function testLayoutRequestsAreNamedClosedAndFieldComplete(): void
    {
        $requests = [
            ['/admin/layouts/{page_id}', 'put', 'AdminLayoutSaveRequest', ['widgets']],
            ['/admin/layouts/{page_id}/widgets', 'post', 'AdminLayoutWidgetCreateRequest', ['type']],
            ['/admin/layouts/{page_id}/widgets', 'patch', 'AdminLayoutWidgetReorderRequest', ['widget_ids']],
            ['/admin/layouts/{page_id}/widgets/{widget_id}', 'patch', 'AdminLayoutWidgetUpdateRequest', []],
            ['/admin/layouts/{page_id}/reorder', 'patch', 'AdminLayoutWidgetReorderRequest', ['widget_ids']],
        ];

        foreach ($requests as [$path, $method, $schema, $required]) {
            $this->assertRequestBodyUsesSchemaRef($path, $method, $schema);
            $this->assertSchemaIsClosedObject($schema);
            $this->assertSchemaRequiredFields($schema, $required);
        }

        $widgetFields = ['widget_id', 'type', 'title', 'order', 'config', 'style'];
        $this->assertSchemaHasFields('AdminLayoutWidget', $widgetFields);
        $this->assertSchemaHasFields('AdminLayoutWidgetCreateRequest', $widgetFields);
        $this->assertSchemaHasFields('AdminLayoutWidgetUpdateRequest', ['type', 'title', 'order', 'config', 'style']);
    }

    public function testLayoutResponseDtosAreClosedAndRequired(): void
    {
        $schemas = [
            'AdminLayoutSummary' => [
                'sl_id', 'sl_page_id', 'sl_title', 'sl_active', 'sl_datetime', 'sl_updated',
            ],
            'AdminLayoutDetail' => [
                'sl_id', 'sl_page_id', 'sl_title', 'sl_schema', 'sl_active', 'sl_datetime', 'sl_updated',
            ],
        ];

        foreach ($schemas as $schema => $fields) {
            $this->assertSchemaIsClosedObject($schema);
            $this->assertSchemaHasFields($schema, $fields);
            $this->assertSchemaRequiredFields($schema, $fields);
        }
    }
}
