<?php

declare(strict_types=1);

namespace Tests\Contract;

final class AdminMemberContractTest extends ContractTestCase
{
    private const MEMBER_FIELDS = [
        'mb_no', 'mb_id', 'mb_name', 'mb_nick', 'mb_email', 'mb_level', 'mb_point',
        'mb_mailling', 'mb_sms', 'mb_open', 'mb_open_date', 'mb_agree_log', 'mb_1', 'mb_10',
    ];
    private const LEGACY_FIELDS = ['mb_birth', 'mb_sex', 'mb_homepage', 'mb_profile', 'mb_1', 'mb_10'];

    public function testListResponseContractIsDeclared(): void
    {
        $this->assertMethodHasOperationId('/admin/members', 'get', 'adminListMembers');
        $this->assertMethodHasParameters(
            '/admin/members',
            'get',
            ['page', 'per_page', 'search', 'search_field', 'sort_by', 'sort_direction']
        );
        $this->assertMethodResponseSchema('/admin/members', 'get', '200', 'AdminMemberListResponse');
        $this->assertComponentArrayItemsUseSchemaRef('AdminMemberListResponse', 'AdminMember');
        $this->assertComponentHasPaginationRef('AdminMemberListResponse');
        $this->assertSchemaIsClosedObject('AdminMemberListResponse');
        $this->assertSchemaHasFields('AdminMember', self::MEMBER_FIELDS);
    }

    public function testDetailResponseContractIsDeclared(): void
    {
        $this->assertMethodHasOperationId('/admin/members/{mb_id}', 'get', 'adminGetMember');
        $this->assertMethodResponseSchema('/admin/members/{mb_id}', 'get', '200', 'AdminMemberDetailResponse');
        $this->assertComponentUsesSchemaRef('AdminMemberDetailResponse', 'AdminMember');
        $this->assertSchemaIsClosedObject('AdminMember');
        $this->assertSchemaRequiredFields('AdminMember', self::MEMBER_FIELDS);
        $this->assertSchemaHasFields('AdminMember', self::MEMBER_FIELDS);

        $properties = $this->resolvedSchemaPropertyNames('AdminMember');
        $this->assertNotContains('mb_password', $properties);
        $this->assertNotContains('mb_email_certify2', $properties);
        $this->assertNotContains('mb_lost_certify', $properties);
        $this->assertNotContains('mb_dupinfo', $properties);
    }

    public function testUpdateUsesNamedClosedRequestAndConcreteResponse(): void
    {
        $this->assertRequestBodyUsesSchemaRef('/admin/members/{mb_id}', 'patch', 'AdminMemberUpdateRequest');
        $this->assertSchemaIsClosedObject('AdminMemberUpdateRequest');
        $this->assertSchemaHasFields('AdminMemberUpdateRequest', [
            'mb_name', 'mb_level', 'mb_zip', 'mb_zip1', 'mb_zip2', 'mb_open',
            'mb_password', 'mb_certify', 'mb_certify_case', 'mb_1', 'mb_10',
        ]);
        $this->assertMethodResponseSchema(
            '/admin/members/{mb_id}',
            'patch',
            '200',
            'AdminMemberDetailResponse'
        );
    }

    public function testLevelUpdateRequired(): void
    {
        $this->assertMethodHasOperationId('/admin/members/{mb_id}/level', 'patch', 'adminUpdateMemberLevel');
        $this->assertRequestBodyUsesSchemaRef(
            '/admin/members/{mb_id}/level',
            'patch',
            'AdminMemberLevelUpdateRequest'
        );
        $this->assertSchemaIsClosedObject('AdminMemberLevelUpdateRequest');
        $this->assertSchemaRequiredFields('AdminMemberLevelUpdateRequest', ['mb_level']);
        $this->assertMethodResponseSchema(
            '/admin/members/{mb_id}/level',
            'patch',
            '200',
            'AdminMemberDetailResponse'
        );
    }

    public function testExcelExportDocumentsValidationFailure(): void
    {
        $this->assertMethodHasOperationId('/admin/members/excel', 'get', 'adminExportMembersExcel');
        $this->assertMethodResponseSchema('/admin/members/excel', 'get', '200', 'AdminMemberListResponse');
        $this->assertMethodHasResponseStatus('/admin/members/excel', 'get', '400');
    }

    public function testMemberMediaAliasesAndResponsesAreClosed(): void
    {
        $this->assertRequestBodyUsesSchemaRef(
            '/admin/members/{mb_id}/icon',
            'post',
            'AdminMemberIconUploadRequest'
        );
        $this->assertSchemaIsClosedObject('AdminMemberIconUploadRequest');
        $this->assertSchemaHasFields('AdminMemberIconUploadRequest', ['file', 'icon', 'mb_icon']);
        $this->assertMethodResponseSchema(
            '/admin/members/{mb_id}/icon',
            'post',
            '200',
            'AdminMemberMediaUploadResponse'
        );
        $this->assertMethodResponseSchema(
            '/admin/members/{mb_id}/icon',
            'delete',
            '200',
            'AdminMemberMediaDeleteResponse'
        );

        $this->assertRequestBodyUsesSchemaRef(
            '/admin/members/{mb_id}/image',
            'post',
            'AdminMemberImageUploadRequest'
        );
        $this->assertSchemaIsClosedObject('AdminMemberImageUploadRequest');
        $this->assertSchemaHasFields('AdminMemberImageUploadRequest', ['file', 'image', 'mb_img']);
        $this->assertMethodResponseSchema(
            '/admin/members/{mb_id}/image',
            'post',
            '200',
            'AdminMemberMediaUploadResponse'
        );
        $this->assertMethodResponseSchema(
            '/admin/members/{mb_id}/image',
            'delete',
            '200',
            'AdminMemberMediaDeleteResponse'
        );
    }

    public function testMemberFieldsMatchLegacy(): void
    {
        $this->markLegacyParitySkipped('member', self::LEGACY_FIELDS);
    }
}
