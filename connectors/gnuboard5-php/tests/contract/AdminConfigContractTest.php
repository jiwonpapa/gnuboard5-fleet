<?php

declare(strict_types=1);

namespace Tests\Contract;

use Api\Admin\Config\Repository\AdminConfigUpdateBuilder;
use Api\Admin\Config\Support\AdminConfigPresenter;

final class AdminConfigContractTest extends ContractTestCase
{
    public function testGetResponseContractIsDeclared(): void
    {
        $this->assertMethodHasOperationId('/admin/config', 'get', 'adminGetConfig');
        $this->assertMethodResponseSchema('/admin/config', 'get', '200', 'AdminConfigResponse');
        $this->assertComponentUsesSchemaRef('AdminConfigResponse', 'AdminConfig');
        $this->assertSchemaIsClosedObject('AdminConfig');

        self::assertSame(
            array_values(array_diff(
                AdminConfigUpdateBuilder::UPDATABLE_FIELDS,
                AdminConfigPresenter::SENSITIVE_FIELDS
            )),
            $this->resolvedSchemaPropertyNames('AdminConfig')
        );
    }

    public function testUpdateRequestUsesExactClosedCanonicalFieldSet(): void
    {
        $this->assertMethodHasOperationId('/admin/config', 'put', 'adminUpdateConfig');
        $this->assertRequestBodyUsesSchemaRef('/admin/config', 'put', 'AdminConfigUpdateRequest');
        $this->assertMethodResponseSchema('/admin/config', 'put', '200', 'AdminConfigResponse');
        $this->assertSchemaIsClosedObject('AdminConfigUpdateRequest');
        self::assertSame(
            AdminConfigUpdateBuilder::UPDATABLE_FIELDS,
            $this->resolvedSchemaPropertyNames('AdminConfigUpdateRequest')
        );
    }

    public function testConfigTypedFieldsAreDocumented(): void
    {
        $this->assertSchemaFieldContains(
            'AdminConfigUpdateRequest',
            'cf_use_point',
            "#/components/schemas/AdminConfigFlagInput"
        );
        $this->assertSchemaFieldContains(
            'AdminConfigUpdateRequest',
            'cf_comment_point',
            "#/components/schemas/AdminConfigIntegerInput"
        );
        $this->assertSchemaFieldContains(
            'AdminConfigUpdateRequest',
            'cf_social_servicelist',
            "#/components/schemas/AdminConfigSocialServicesInput"
        );
        $this->assertSchemaFieldContains('AdminConfig', 'cf_use_point', 'type: integer');
        $this->assertSchemaFieldContains('AdminConfig', 'cf_comment_point', 'type: integer');
        $this->assertSchemaFieldContains('AdminConfig', 'cf_cert_use', 'type: integer');
    }

    public function testSensitiveFieldsAreWriteOnlyAndNeverReturned(): void
    {
        foreach (AdminConfigPresenter::SENSITIVE_FIELDS as $field) {
            $this->assertSchemaFieldContains('AdminConfigUpdateRequest', $field, 'writeOnly: true');
            self::assertNotContains($field, $this->resolvedSchemaPropertyNames('AdminConfig'));
        }
    }
}
