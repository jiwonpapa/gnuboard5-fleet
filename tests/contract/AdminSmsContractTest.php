<?php

declare(strict_types=1);

namespace Tests\Contract;

final class AdminSmsContractTest extends ContractTestCase
{
    private const SMS_CONFIG_FIELDS = ['cf_sms_use', 'cf_sms_type', 'cf_icode_id', 'cf_icode_pw', 'cf_icode_server_port', 'cf_phone'];
    private const SMS_TEMPLATE_FIELDS = ['fo_name', 'fo_content', 'fg_no'];
    private const SMS_CONTACT_FIELDS = ['bk_name', 'bk_hp', 'bg_no', 'bk_receipt', 'bk_memo'];
    private const LEGACY_FIELDS = ['cf_icode_token_key', 'template_batch_move', 'contact_import_csv'];

    public function testSmsConfigResponseContractIsDeclared(): void
    {
        $this->assertMethodHasOperationId('/admin/sms/config', 'get', 'adminGetSmsConfig');
        $this->assertMethodResponseSchema('/admin/sms/config', 'get', '200', 'SmsConfigResponse');
        $this->assertComponentUsesSchemaRef('SmsConfigResponse', 'SmsConfig');
        $this->assertSchemaHasFields('SmsConfig', self::SMS_CONFIG_FIELDS);
    }

    public function testSmsConfigUpdatePayloadIsDocumented(): void
    {
        $this->assertMethodHasOperationId('/admin/sms/config', 'put', 'adminUpdateSmsConfig');
        $this->assertRequestBodyUsesSchemaRef('/admin/sms/config', 'put', 'AdminSmsConfigUpdateRequest');
        $this->assertSchemaIsClosedObject('AdminSmsConfigUpdateRequest');
        $this->assertSchemaHasFields('AdminSmsConfigUpdateRequest', self::SMS_CONFIG_FIELDS);
    }

    public function testSmsTemplateCreateRequired(): void
    {
        $this->assertMethodHasOperationId('/admin/sms/templates', 'post', 'adminCreateSmsTemplate');
        $this->assertRequestBodyUsesSchemaRef('/admin/sms/templates', 'post', 'AdminSmsTemplateCreateRequest');
        $this->assertSchemaIsClosedObject('AdminSmsTemplateCreateRequest');
        $this->assertSchemaRequiredFields('AdminSmsTemplateCreateRequest', ['fo_name', 'fo_content']);
        $this->assertSchemaHasFields('AdminSmsTemplateCreateRequest', self::SMS_TEMPLATE_FIELDS);
    }

    public function testSmsContactCreateRequired(): void
    {
        $this->assertMethodHasOperationId('/admin/sms/contacts', 'post', 'adminCreateSmsContact');
        $this->assertRequestBodyUsesSchemaRef('/admin/sms/contacts', 'post', 'AdminSmsContactCreateRequest');
        $this->assertSchemaIsClosedObject('AdminSmsContactCreateRequest');
        $this->assertSchemaRequiredFields('AdminSmsContactCreateRequest', ['bk_name', 'bk_hp']);
        $this->assertSchemaHasFields('AdminSmsContactCreateRequest', self::SMS_CONTACT_FIELDS);
    }

    public function testSmsReadEndpointsDeclareStorageUnavailableResponse(): void
    {
        $endpoints = [
            ['/admin/sms/template-groups', 'get'],
            ['/admin/sms/templates', 'get'],
            ['/admin/sms/contact-groups', 'get'],
            ['/admin/sms/contacts', 'get'],
            ['/admin/sms/history/batches', 'get'],
            ['/admin/sms/history/deliveries', 'get'],
        ];

        foreach ($endpoints as [$path, $method]) {
            $this->assertMethodHasResponseStatus($path, $method, '503');
        }
    }

    public function testEverySmsSuccessBodyUsesConcreteNamedResponse(): void
    {
        $responses = [
            ['/admin/sms/config', 'get', '200', 'SmsConfigResponse'],
            ['/admin/sms/config', 'put', '200', 'SmsConfigResponse'],
            ['/admin/sms/member-sync', 'post', '200', 'AdminSmsMemberSyncResponse'],
            ['/admin/sms/template-groups', 'get', '200', 'AdminSmsTemplateGroupListResponse'],
            ['/admin/sms/template-groups', 'post', '201', 'AdminSmsTemplateGroupDetailResponse'],
            ['/admin/sms/template-groups/{fg_no}', 'get', '200', 'AdminSmsTemplateGroupDetailResponse'],
            ['/admin/sms/template-groups/{fg_no}', 'put', '200', 'AdminSmsTemplateGroupDetailResponse'],
            ['/admin/sms/template-groups/{fg_no}/move', 'post', '200', 'AdminSmsTemplateGroupMoveResponse'],
            ['/admin/sms/template-groups/{fg_no}/templates', 'delete', '200', 'AdminSmsTemplateGroupClearResponse'],
            ['/admin/sms/templates', 'get', '200', 'AdminSmsTemplateListResponse'],
            ['/admin/sms/templates', 'post', '201', 'AdminSmsTemplateDetailResponse'],
            ['/admin/sms/templates/batch', 'post', '200', 'AdminSmsTemplateBatchResponse'],
            ['/admin/sms/templates/{fo_no}', 'get', '200', 'AdminSmsTemplateDetailResponse'],
            ['/admin/sms/templates/{fo_no}', 'put', '200', 'AdminSmsTemplateDetailResponse'],
            ['/admin/sms/contact-groups', 'get', '200', 'AdminSmsContactGroupListResponse'],
            ['/admin/sms/contact-groups', 'post', '201', 'AdminSmsContactGroupDetailResponse'],
            ['/admin/sms/contact-groups/{bg_no}', 'get', '200', 'AdminSmsContactGroupDetailResponse'],
            ['/admin/sms/contact-groups/{bg_no}', 'put', '200', 'AdminSmsContactGroupDetailResponse'],
            ['/admin/sms/contact-groups/{bg_no}/move', 'post', '200', 'AdminSmsContactGroupMoveResponse'],
            ['/admin/sms/contact-groups/{bg_no}/contacts', 'delete', '200', 'AdminSmsContactGroupClearResponse'],
            ['/admin/sms/contacts', 'get', '200', 'AdminSmsContactListResponse'],
            ['/admin/sms/contacts', 'post', '201', 'AdminSmsContactDetailResponse'],
            ['/admin/sms/contacts/batch', 'post', '200', 'AdminSmsContactBatchResponse'],
            ['/admin/sms/contacts/import', 'post', '200', 'AdminSmsContactImportResponse'],
            ['/admin/sms/contacts/export', 'get', '200', 'AdminSmsContactExportResponse'],
            ['/admin/sms/contacts/{bk_no}', 'get', '200', 'AdminSmsContactDetailResponse'],
            ['/admin/sms/contacts/{bk_no}', 'put', '200', 'AdminSmsContactDetailResponse'],
            ['/admin/sms/history/batches', 'get', '200', 'AdminSmsMessageBatchListResponse'],
            ['/admin/sms/history/deliveries', 'get', '200', 'AdminSmsDeliveryListResponse'],
            ['/admin/sms/history/batches/{wr_no}', 'get', '200', 'AdminSmsMessageBatchDetailResponse'],
            ['/admin/sms/history/batches/{wr_no}/resend-failures', 'post', '200', 'AdminSmsSendResponse'],
            ['/admin/sms/history/batches/{wr_no}/resend-all', 'post', '200', 'AdminSmsSendResponse'],
            ['/admin/sms/messages', 'post', '201', 'AdminSmsSendResponse'],
        ];

        foreach ($responses as [$path, $method, $status, $schema]) {
            $this->assertMethodResponseSchema($path, $method, $status, $schema);
        }
    }

    public function testSmsRuntimeDtosAreClosedAndRequiredFieldsAreExplicit(): void
    {
        $schemas = [
            'SmsConfig' => [
                'cf_title', 'cf_sms_use', 'cf_sms_type', 'cf_icode_id', 'cf_icode_pw',
                'cf_icode_server_ip', 'cf_icode_server_port', 'cf_icode_token_key',
                'cf_phone', 'cf_datetime', 'provider_ready', 'uses_token_key',
                'uses_legacy_credentials', 'storage_ready', 'missing_tables',
            ],
            'AdminSmsMemberSyncSummary' => [
                'total_members', 'leave_members', 'phone_empty', 'phone_valid',
                'phone_invalid', 'receipt_enabled', 'receipt_disabled',
            ],
            'AdminSmsTemplateGroup' => ['fg_no', 'fg_name', 'fg_count', 'fg_member', 'is_virtual'],
            'AdminSmsTemplate' => ['fo_no', 'fg_no', 'fg_member', 'fg_name', 'fo_name', 'fo_content', 'fo_datetime'],
            'AdminSmsContactGroup' => ['bg_no', 'bg_name', 'bg_count', 'bg_member', 'bg_nomember', 'bg_receipt', 'bg_reject'],
            'AdminSmsContact' => [
                'bk_no', 'bg_no', 'bg_name', 'mb_id', 'bk_name', 'bk_hp', 'bk_receipt',
                'bk_datetime', 'bk_memo', 'receipt_label', 'member_type', 'member_sync_skipped',
            ],
            'AdminSmsContactSummary' => [
                'total_count', 'receipt_count', 'reject_count', 'member_count',
                'non_member_count', 'last_synced_at',
            ],
            'AdminSmsContactImportResult' => [
                'total_count', 'invalid_count', 'duplicate_count', 'importable_count',
                'imported_count', 'dry_run', 'duplicate_phones', 'importable_phones',
            ],
            'AdminSmsMessageBatch' => [
                'wr_no', 'wr_renum', 'wr_reply', 'wr_message', 'wr_booking', 'wr_total',
                'wr_re_total', 'wr_success', 'wr_failure', 'wr_datetime', 'wr_memo', 'duplicate_summary',
            ],
            'AdminSmsDelivery' => [
                'hs_no', 'wr_no', 'wr_renum', 'bg_no', 'bg_name', 'mb_id', 'bk_no',
                'hs_name', 'hs_hp', 'hs_datetime', 'hs_flag', 'hs_code', 'hs_memo',
                'hs_log', 'wr_message', 'wr_datetime', 'wr_booking',
            ],
            'AdminSmsSendResult' => [
                'write_no', 'write_renum', 'reply', 'message', 'booking_at', 'total',
                'success', 'failure', 'duplicate_summary', 'provider_ready',
            ],
        ];

        foreach ($schemas as $schema => $fields) {
            $this->assertSchemaIsClosedObject($schema);
            $this->assertSchemaHasFields($schema, $fields);
            $this->assertSchemaRequiredFields($schema, $fields);
        }
    }

    public function testSmsFieldsMatchLegacy(): void
    {
        $this->markLegacyParitySkipped('sms', self::LEGACY_FIELDS);
    }
}
