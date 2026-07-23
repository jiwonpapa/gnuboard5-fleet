<?php

declare(strict_types=1);

namespace Tests\Contract;

final class AdminSchemaContractTest extends ContractTestCase
{
    public function testAdminSchemaCatalogContractIsDocumented(): void
    {
        $this->assertMethodHasOperationId('/admin/schema', 'get', 'adminListFieldSchemas');
        $this->assertMethodResponseSchema('/admin/schema', 'get', '200', 'AdminSchemaCatalogResponse');
    }

    public function testAdminSchemaDetailContractIsDocumented(): void
    {
        $this->assertMethodHasOperationId('/admin/schema/{domain}', 'get', 'adminGetFieldSchema');
        $this->assertMethodHasParameters('/admin/schema/{domain}', 'get', ['domain']);
        $this->assertMethodResponseSchema('/admin/schema/{domain}', 'get', '200', 'AdminSchemaDetailResponse');
        $this->assertSchemaHasFields('AdminFieldSchema', ['name', 'label', 'input_type', 'data_type', 'default_value']);
        $this->assertSchemaHasFields('AdminSchemaDetail', ['domain', 'title', 'sections', 'fields_by_name']);
    }
}
