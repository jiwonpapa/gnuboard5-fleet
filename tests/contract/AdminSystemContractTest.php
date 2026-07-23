<?php

declare(strict_types=1);

namespace Tests\Contract;

final class AdminSystemContractTest extends ContractTestCase
{
    private const AUTH_FIELDS = ['mb_id', 'au_menu', 'au_auth'];
    private const AUTH_LIST_FIELDS = ['mb_id', 'au_menu', 'au_auth', 'mb_name', 'mb_nick'];
    private const MAIL_TEST_FIELDS = ['to', 'subject', 'content'];
    private const BROWSCAP_FIELDS = ['rows'];
    private const QA_EXTRA_FIELDS = [
        'qa_1_subj', 'qa_2_subj', 'qa_3_subj', 'qa_4_subj', 'qa_5_subj',
        'qa_1', 'qa_2', 'qa_3', 'qa_4', 'qa_5',
    ];

    public function testAuthListContractIsDeclared(): void
    {
        $this->assertMethodHasOperationId('/admin/system/auths', 'get', 'adminSystemListAuths');
        $this->assertMethodHasParameters('/admin/system/auths', 'get', ['page', 'per_page', 'mb_id']);
        $this->assertMethodResponseSchema('/admin/system/auths', 'get', '200', 'AdminAuthListResponse');
        $this->assertComponentArrayItemsUseSchemaRef('AdminAuthListResponse', 'AdminSystemPermission');
        $this->assertComponentHasPaginationRef('AdminAuthListResponse');
        $this->assertSchemaHasFields('AdminSystemPermission', self::AUTH_LIST_FIELDS);
    }

    public function testAuthSaveRequired(): void
    {
        $this->assertMethodHasOperationId('/admin/system/auths', 'post', 'adminSystemSaveAuth');
        $this->assertRequestBodyUsesSchemaRef('/admin/system/auths', 'post', 'AdminSystemAuthSaveRequest');
        $this->assertSchemaRequiredFields('AdminSystemAuthSaveRequest', self::AUTH_FIELDS);
        $this->assertSchemaHasFields('AdminSystemAuthSaveRequest', self::AUTH_FIELDS);
        $this->assertSchemaIsClosedObject('AdminSystemAuthSaveRequest');
        $this->assertMethodResponseSchema('/admin/system/auths', 'post', '200', 'AdminSystemPermissionResponse');
    }

    public function testMaintenanceEndpointsRemainDocumented(): void
    {
        $this->assertMethodHasOperationId('/admin/system/maintenance/session-files/purge', 'post', 'adminSystemPurgeSessionFiles');
        $this->assertMethodHasOperationId('/admin/system/maintenance/cache-files/purge', 'post', 'adminSystemPurgeCacheFiles');
        $this->assertMethodHasOperationId('/admin/system/maintenance/captcha-files/purge', 'post', 'adminSystemPurgeCaptchaFiles');
        $this->assertMethodHasOperationId('/admin/system/maintenance/thumbnail-files/purge', 'post', 'adminSystemPurgeThumbnailFiles');
        $this->assertMethodHasOperationId('/admin/system/maintenance/member-list-files/purge', 'post', 'adminSystemPurgeMemberListFiles');
    }

    public function testMailTestRequired(): void
    {
        $this->assertMethodHasOperationId('/admin/system/mails/test', 'post', 'adminSystemSendMailTest');
        $this->assertRequestBodyUsesSchemaRef('/admin/system/mails/test', 'post', 'AdminSystemMailTestRequest');
        $this->assertSchemaRequiredFields('AdminSystemMailTestRequest', self::MAIL_TEST_FIELDS);
        $this->assertResolvedSchemaHasFields('AdminSystemMailTestRequest', self::MAIL_TEST_FIELDS);
        $this->assertSchemaIsClosedObject('AdminSystemMailTestRequest');
        $this->assertMethodResponseSchema('/admin/system/mails/test', 'post', '200', 'AdminSystemMailTestResponse');
    }

    public function testBrowscapConvertPayloadIsDocumented(): void
    {
        $this->assertMethodHasOperationId('/admin/system/browscap/convert', 'post', 'adminSystemBrowscapConvert');
        $this->assertRequestBodyUsesSchemaRef('/admin/system/browscap/convert', 'post', 'AdminSystemBrowscapConvertRequest');
        $this->assertSchemaHasFields('AdminSystemBrowscapConvertRequest', self::BROWSCAP_FIELDS);
        $this->assertSchemaIsClosedObject('AdminSystemBrowscapConvertRequest');
        $this->assertMethodResponseSchema('/admin/system/browscap/convert', 'post', '200', 'AdminSystemBrowscapConvertResponse');
    }

    public function testSystemFieldsMatchLegacy(): void
    {
        $this->assertResolvedSchemaHasFields('AdminSystemQaConfigUpdateRequest', self::QA_EXTRA_FIELDS);
        $this->assertResolvedSchemaHasFields('AdminSystemQaConfig', self::QA_EXTRA_FIELDS);
    }

    public function testSystemWriteBodiesAreNamedAndClosed(): void
    {
        foreach ([
            ['/admin/system/auths', 'post', 'AdminSystemAuthSaveRequest'],
            ['/admin/system/polls', 'post', 'AdminSystemPollCreateRequest'],
            ['/admin/system/polls/{po_id}', 'put', 'AdminSystemPollUpdateRequest'],
            ['/admin/system/qa-config', 'put', 'AdminSystemQaConfigUpdateRequest'],
            ['/admin/system/theme', 'put', 'AdminSystemThemeUpdateRequest'],
            ['/admin/system/browscap/convert', 'post', 'AdminSystemBrowscapConvertRequest'],
            ['/admin/system/mails/test', 'post', 'AdminSystemMailTestRequest'],
            ['/admin/system/mails/send', 'post', 'AdminSystemMailSendRequest'],
        ] as [$path, $method, $schema]) {
            $this->assertRequestBodyUsesSchemaRef($path, $method, $schema);
            $this->assertSchemaIsClosedObject($schema);
        }
    }

    public function testSystemSuccessResponsesUseConcreteSchemas(): void
    {
        foreach ([
            ['/admin/system/auths', 'post', '200', 'AdminSystemPermissionResponse'],
            ['/admin/system/polls', 'post', '201', 'PollDetailResponse'],
            ['/admin/system/polls/{po_id}', 'put', '200', 'PollDetailResponse'],
            ['/admin/system/qa-config', 'get', '200', 'AdminSystemQaConfigResponse'],
            ['/admin/system/qa-config', 'put', '200', 'AdminSystemQaConfigResponse'],
            ['/admin/system/theme', 'get', '200', 'AdminSystemThemeConfigResponse'],
            ['/admin/system/theme', 'put', '200', 'AdminSystemThemeConfigResponse'],
            ['/admin/system/themes', 'get', '200', 'AdminSystemThemeListResponse'],
            ['/admin/system/themes/{theme}', 'get', '200', 'AdminSystemThemeDetailResponse'],
            ['/admin/system/phpinfo', 'get', '200', 'AdminSystemPhpInfoResponse'],
            ['/admin/system/maintenance/session-files/purge', 'post', '200', 'AdminSystemMaintenanceResponse'],
            ['/admin/system/maintenance/cache-files/purge', 'post', '200', 'AdminSystemMaintenanceResponse'],
            ['/admin/system/maintenance/captcha-files/purge', 'post', '200', 'AdminSystemMaintenanceResponse'],
            ['/admin/system/maintenance/thumbnail-files/purge', 'post', '200', 'AdminSystemMaintenanceResponse'],
            ['/admin/system/maintenance/member-list-files/purge', 'post', '200', 'AdminSystemMaintenanceResponse'],
            ['/admin/system/browscap', 'get', '200', 'AdminSystemBrowscapStatusResponse'],
            ['/admin/system/browscap/update', 'post', '200', 'AdminSystemBrowscapStatusResponse'],
            ['/admin/system/browscap/convert', 'post', '200', 'AdminSystemBrowscapConvertResponse'],
            ['/admin/system/mails', 'get', '200', 'AdminSystemMailTemplateListResponse'],
            ['/admin/system/mail-recipients', 'get', '200', 'AdminSystemMailRecipientListResponse'],
            ['/admin/system/mails/test', 'post', '200', 'AdminSystemMailTestResponse'],
            ['/admin/system/mails/send', 'post', '200', 'AdminSystemMailSendResponse'],
        ] as [$path, $method, $status, $schema]) {
            $this->assertMethodResponseSchema($path, $method, $status, $schema);
        }
    }
}
