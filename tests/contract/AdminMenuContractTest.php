<?php

declare(strict_types=1);

namespace Tests\Contract;

final class AdminMenuContractTest extends ContractTestCase
{
    private const MENU_FIELDS = [
        'me_id', 'me_code', 'me_name', 'me_link', 'me_target', 'me_order', 'me_use', 'me_mobile_use',
    ];
    private const LEGACY_FIELDS = ['me_icon', 'me_permission', 'me_badge'];

    public function testListResponseContractIsDeclared(): void
    {
        $this->assertMethodHasOperationId('/admin/menus', 'get', 'adminListMenus');
        $this->assertMethodResponseSchema('/admin/menus', 'get', '200', 'MenuListResponse');
        $this->assertComponentArrayItemsUseSchemaRef('MenuListResponse', 'MenuItem');
        $this->assertComponentHasPaginationRef('MenuListResponse');
        $this->assertSchemaIsClosedObject('MenuListResponse');
        $this->assertSchemaIsClosedObject('MenuItem');
        $this->assertSchemaRequiredFields('MenuItem', self::MENU_FIELDS);
        $this->assertSchemaHasFields('MenuItem', self::MENU_FIELDS);
    }

    public function testDetailResponseContractIsDeclared(): void
    {
        $this->assertMethodHasOperationId('/admin/menus/{me_id}', 'get', 'adminGetMenu');
        $this->assertMethodResponseSchema('/admin/menus/{me_id}', 'get', '200', 'MenuDetailResponse');
        $this->assertComponentUsesSchemaRef('MenuDetailResponse', 'MenuItem');
        $this->assertSchemaIsClosedObject('MenuDetailResponse');
        $this->assertSchemaHasFields('MenuItem', self::MENU_FIELDS);
    }

    public function testCreateRequired(): void
    {
        $this->assertMethodHasOperationId('/admin/menus', 'post', 'adminCreateMenu');
        $this->assertRequestBodyUsesSchemaRef('/admin/menus', 'post', 'MenuCreateRequest');
        $this->assertSchemaIsClosedObject('MenuCreateRequest');
        $this->assertSchemaRequiredFields('MenuCreateRequest', ['me_code', 'me_name', 'me_link']);
        $this->assertSchemaHasFields('MenuCreateRequest', array_slice(self::MENU_FIELDS, 1));
        $this->assertMethodResponseSchema('/admin/menus', 'post', '201', 'MenuDetailResponse');
    }

    public function testUpdateUsesNamedClosedPartialRequestAndDetailResponse(): void
    {
        $this->assertRequestBodyUsesSchemaRef('/admin/menus/{me_id}', 'put', 'MenuUpdateRequest');
        $this->assertSchemaIsClosedObject('MenuUpdateRequest');
        $this->assertSchemaHasFields('MenuUpdateRequest', array_slice(self::MENU_FIELDS, 1));
        $this->assertMethodResponseSchema('/admin/menus/{me_id}', 'put', '200', 'MenuDetailResponse');
    }

    public function testReorderPayloadIsDocumented(): void
    {
        $this->assertMethodHasOperationId('/admin/menus', 'patch', 'adminReorderMenus');
        $this->assertRequestBodyUsesSchemaRef('/admin/menus', 'patch', 'MenuReorderRequest');
        $this->assertSchemaIsClosedObject('MenuReorderRequest');
        $this->assertSchemaRequiredFields('MenuReorderRequest', ['orders']);
        $this->assertSchemaIsClosedObject('MenuReorderItem');
        $this->assertSchemaRequiredFields('MenuReorderItem', ['me_id', 'me_order']);
        $this->assertMethodResponseSchema('/admin/menus', 'patch', '200', 'MenuReorderResponse');

        $this->assertMethodHasOperationId('/admin/menus/reorder', 'patch', 'adminReorderMenusLegacy');
        $this->assertRequestBodyUsesSchemaRef('/admin/menus/reorder', 'patch', 'MenuReorderRequest');
        $this->assertMethodResponseSchema('/admin/menus/reorder', 'patch', '200', 'MenuReorderResponse');
    }

    public function testMenuFieldsMatchLegacy(): void
    {
        $this->markLegacyParitySkipped('menu', self::LEGACY_FIELDS);
    }
}
