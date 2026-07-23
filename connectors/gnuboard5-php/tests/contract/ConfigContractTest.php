<?php

declare(strict_types=1);

namespace Tests\Contract;

final class ConfigContractTest extends ContractTestCase
{
    public function testPublicConfigResponseContractIsDeclared(): void
    {
        $this->assertMethodHasOperationId('/config', 'get', 'getConfig');
        $this->assertMethodResponseSchema('/config', 'get', '200', 'ConfigResponse');
        $this->assertComponentUsesSchemaRef('ConfigResponse', 'Config');
    }

    public function testPublicConfigTypedFieldsAreDocumented(): void
    {
        $this->assertSchemaFieldContains('Config', 'cf_use_point', 'type: integer');
        $this->assertSchemaFieldContains('Config', 'cf_comment_point', 'type: integer');
    }
}
