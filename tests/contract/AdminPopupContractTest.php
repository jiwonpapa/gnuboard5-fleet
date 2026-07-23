<?php

declare(strict_types=1);

namespace Tests\Contract;

final class AdminPopupContractTest extends ContractTestCase
{
    private const POPUP_FIELDS = ['nw_subject', 'nw_content', 'nw_division', 'nw_device', 'nw_begin_time', 'nw_end_time'];
    private const LEGACY_FIELDS = ['nw_disable_hours', 'nw_left', 'nw_top', 'nw_height', 'nw_width', 'nw_content_html'];

    public function testListResponseContractIsDeclared(): void
    {
        $this->assertMethodHasOperationId('/admin/system/popups', 'get', 'adminSystemListPopups');
        $this->assertMethodHasParameters('/admin/system/popups', 'get', ['page', 'per_page']);
        $this->assertMethodResponseSchema('/admin/system/popups', 'get', '200', 'PopupListResponse');
        $this->assertMethodResponseSchema('/admin/popups', 'get', '200', 'PopupListResponse');
        $this->assertComponentArrayItemsUseSchemaRef('PopupListResponse', 'Popup');
        $this->assertComponentHasPaginationRef('PopupListResponse');
        $this->assertSchemaHasFields('Popup', [...self::POPUP_FIELDS, ...self::LEGACY_FIELDS]);
    }

    public function testDetailResponseContractIsDeclared(): void
    {
        $this->assertMethodHasOperationId('/admin/system/popups/{nw_id}', 'get', 'adminSystemGetPopup');
        $this->assertMethodResponseSchema('/admin/system/popups/{nw_id}', 'get', '200', 'PopupDetailResponse');
        $this->assertMethodResponseSchema('/admin/popups/{nw_id}', 'get', '200', 'PopupDetailResponse');
        $this->assertComponentUsesSchemaRef('PopupDetailResponse', 'Popup');
        $this->assertSchemaHasFields('Popup', [...self::POPUP_FIELDS, ...self::LEGACY_FIELDS]);
    }

    public function testWriteRequestsUseNamedClosedSchemas(): void
    {
        $this->assertMethodHasOperationId('/admin/system/popups', 'post', 'adminSystemCreatePopup');
        $this->assertMethodHasOperationId('/admin/popups', 'post', 'adminCreatePopup');
        $this->assertMethodHasOperationId('/admin/system/popups/{nw_id}', 'put', 'adminSystemUpdatePopup');
        $this->assertMethodHasOperationId('/admin/popups/{nw_id}', 'patch', 'adminUpdatePopup');
        foreach ([['/admin/system/popups', 'post'], ['/admin/popups', 'post']] as [$path, $method]) {
            $this->assertRequestBodyUsesSchemaRef($path, $method, 'PopupCreateRequest');
            $this->assertMethodResponseSchema($path, $method, '201', 'PopupDetailResponse');
        }
        foreach ([['/admin/system/popups/{nw_id}', 'put'], ['/admin/popups/{nw_id}', 'patch']] as [$path, $method]) {
            $this->assertRequestBodyUsesSchemaRef($path, $method, 'PopupUpdateRequest');
            $this->assertMethodResponseSchema($path, $method, '200', 'PopupDetailResponse');
        }
        $this->assertSchemaRequiredFields('PopupCreateRequest', ['nw_subject', 'nw_content']);
        $this->assertSchemaIsClosedObject('PopupCreateRequest');
        $this->assertSchemaIsClosedObject('PopupUpdateRequest');
        $this->assertSchemaHasFields('PopupCreateRequest', [...self::POPUP_FIELDS, ...self::LEGACY_FIELDS]);
        $this->assertSchemaHasFields('PopupUpdateRequest', [...self::POPUP_FIELDS, ...self::LEGACY_FIELDS]);
    }
}
