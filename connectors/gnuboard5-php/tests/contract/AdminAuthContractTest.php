<?php

declare(strict_types=1);

namespace Tests\Contract;

final class AdminAuthContractTest extends ContractTestCase
{
    public function testListBindsAllFiltersAndGroupedResponse(): void
    {
        $this->assertMethodHasParameters(
            '/admin/auth',
            'get',
            ['page', 'per_page', 'date_from', 'date_to', 'mb_id']
        );
        $this->assertMethodResponseSchema('/admin/auth', 'get', '200', 'AdminAuthMemberListResponse');
        $this->assertComponentArrayItemsUseSchemaRef('AdminAuthMemberListResponse', 'AdminAuthMember');
        $this->assertComponentHasPaginationRef('AdminAuthMemberListResponse');
    }

    public function testUpsertUsesClosedCanonicalAndLegacyContract(): void
    {
        $this->assertRequestBodyUsesSchemaRef('/admin/auth/{mb_id}', 'put', 'AdminAuthUpsertRequest');
        $this->assertSchemaIsClosedObject('AdminAuthUpsertRequest');
        $this->assertSchemaHasFields('AdminAuthUpsertRequest', ['auths', 'au_menu', 'au_auth']);
        $this->assertMethodResponseSchema('/admin/auth/{mb_id}', 'put', '200', 'AdminAuthMemberResponse');
    }

    public function testGroupedAuthSchemasAreClosedAndComplete(): void
    {
        foreach (
            [
                'AdminAuthAssignment',
                'AdminAuthAssignmentInput',
                'AdminAuthMember',
                'AdminAuthMemberListResponse',
                'AdminAuthMemberResponse',
            ] as $schema
        ) {
            $this->assertSchemaIsClosedObject($schema);
        }
        $this->assertSchemaRequiredFields('AdminAuthMember', ['mb_id', 'mb_name', 'mb_nick', 'auths']);
        $this->assertSchemaRequiredFields('AdminAuthAssignment', ['au_menu', 'au_auth']);
    }
}
