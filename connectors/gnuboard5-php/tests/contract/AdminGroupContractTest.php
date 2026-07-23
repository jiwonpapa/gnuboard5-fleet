<?php

declare(strict_types=1);

namespace Tests\Contract;

final class AdminGroupContractTest extends ContractTestCase
{
    private const GROUP_FIELDS = ['gr_id', 'gr_subject'];
    private const GROUP_OPTIONAL_FIELDS = ['gr_admin', 'gr_device', 'gr_use_access'];

    public function testListResponseContractIsDeclared(): void
    {
        $this->assertMethodHasOperationId('/admin/groups', 'get', 'adminLegacyListGroups');
        $this->assertMethodResponseSchema('/admin/groups', 'get', '200', 'GroupListResponse');
        $this->assertComponentArrayItemsUseSchemaRef('GroupListResponse', 'Group');
        $this->assertComponentHasPaginationRef('GroupListResponse');
        $this->assertSchemaHasFields('Group', self::GROUP_FIELDS);
    }

    public function testDetailResponseContractIsDeclared(): void
    {
        $this->assertMethodHasOperationId('/admin/groups/{gr_id}', 'get', 'adminLegacyGetGroup');
        $this->assertMethodResponseSchema('/admin/groups/{gr_id}', 'get', '200', 'GroupDetailResponse');
        $this->assertComponentUsesSchemaRef('GroupDetailResponse', 'Group');
        $this->assertSchemaHasFields('Group', self::GROUP_FIELDS);
    }

    public function testCreateRequired(): void
    {
        $this->assertMethodHasOperationId('/admin/groups', 'post', 'adminLegacyCreateGroup');
        $this->assertRequestBodyUsesSchemaRef('/admin/groups', 'post', 'AdminGroupCreateRequest');
        $this->assertSchemaIsClosedObject('AdminGroupCreateRequest');
        $this->assertSchemaRequiredFields('AdminGroupCreateRequest', ['gr_id', 'gr_subject']);
        $this->assertSchemaHasFields('AdminGroupCreateRequest', [...self::GROUP_FIELDS, ...self::GROUP_OPTIONAL_FIELDS]);
    }

    public function testGroupOptionalFieldsAreDocumented(): void
    {
        $this->assertSchemaHasFields('Group', self::GROUP_OPTIONAL_FIELDS);
    }

    public function testGroupAccessFlagUsesIntegerType(): void
    {
        $this->assertSchemaFieldContains('Group', 'gr_use_access', 'type: integer');
    }

    public function testCanonicalAndLegacyGroupRequestsUseClosedSchemas(): void
    {
        $requests = [
            ['/admin/board-groups', 'post', 'AdminGroupCreateRequest'],
            ['/admin/board-groups/{gr_id}', 'put', 'AdminGroupUpdateRequest'],
            ['/admin/board-groups/{gr_id}', 'patch', 'AdminGroupUpdateRequest'],
            ['/admin/board-groups/{gr_id}/members', 'post', 'AdminGroupMemberCreateRequest'],
            ['/admin/groups', 'post', 'AdminGroupCreateRequest'],
            ['/admin/groups/{gr_id}', 'put', 'AdminGroupUpdateRequest'],
            ['/admin/groups/{gr_id}/members', 'post', 'AdminGroupMemberCreateRequest'],
        ];

        foreach ($requests as [$path, $method, $schema]) {
            $this->assertRequestBodyUsesSchemaRef($path, $method, $schema);
            $this->assertSchemaIsClosedObject($schema);
        }
    }

    public function testCanonicalAndLegacySuccessBodiesUseConcreteResponses(): void
    {
        $responses = [
            ['/admin/board-groups', 'get', '200', 'GroupListResponse'],
            ['/admin/board-groups', 'post', '201', 'GroupDetailResponse'],
            ['/admin/board-groups/{gr_id}', 'get', '200', 'GroupDetailResponse'],
            ['/admin/board-groups/{gr_id}', 'put', '200', 'GroupDetailResponse'],
            ['/admin/board-groups/{gr_id}', 'patch', '200', 'GroupDetailResponse'],
            ['/admin/board-groups/{gr_id}/members', 'get', '200', 'AdminGroupMemberListResponse'],
            ['/admin/board-groups/{gr_id}/members', 'post', '201', 'AdminGroupMemberResponse'],
            ['/admin/groups', 'get', '200', 'GroupListResponse'],
            ['/admin/groups', 'post', '201', 'GroupDetailResponse'],
            ['/admin/groups/{gr_id}', 'get', '200', 'GroupDetailResponse'],
            ['/admin/groups/{gr_id}', 'put', '200', 'GroupDetailResponse'],
            ['/admin/groups/{gr_id}/members', 'get', '200', 'AdminGroupMemberListResponse'],
            ['/admin/groups/{gr_id}/members', 'post', '201', 'AdminGroupMemberResponse'],
        ];

        foreach ($responses as [$path, $method, $status, $schema]) {
            $this->assertMethodResponseSchema($path, $method, $status, $schema);
        }
    }

    public function testGroupAndMemberDtosAreClosedAndRequired(): void
    {
        $schemas = [
            'Group' => ['gr_id', 'gr_subject', 'gr_admin', 'gr_device', 'gr_use_access'],
            'AdminGroupMember' => [
                'gm_id', 'gr_id', 'mb_id', 'gm_datetime', 'mb_name', 'mb_nick', 'mb_level', 'mb_today_login',
            ],
            'AdminGroupMemberResult' => ['gr_id', 'mb_id', 'gm_datetime'],
        ];

        foreach ($schemas as $schema => $fields) {
            $this->assertSchemaIsClosedObject($schema);
            $this->assertSchemaHasFields($schema, $fields);
            $this->assertSchemaRequiredFields($schema, $fields);
        }
    }

    public function testGroupMemberListQueriesAreDocumentedOnBothPaths(): void
    {
        $parameters = ['page', 'per_page', 'search'];
        $this->assertMethodHasParameters('/admin/board-groups/{gr_id}/members', 'get', $parameters);
        $this->assertMethodHasParameters('/admin/groups/{gr_id}/members', 'get', $parameters);
    }
}
