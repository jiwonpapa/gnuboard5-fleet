<?php

declare(strict_types=1);

namespace Tests\Contract;

final class MenuContractTest extends ContractTestCase
{
    public function testPublicMenuListResponseContractIsDeclared(): void
    {
        $this->assertMethodHasOperationId('/menus', 'get', 'getMenus');
        $this->assertMethodResponseSchema('/menus', 'get', '200', 'MenuListResponse');
        $this->assertComponentArrayItemsUseSchemaRef('MenuListResponse', 'MenuItem');
        $this->assertComponentHasPaginationRef('MenuListResponse');
    }
}
