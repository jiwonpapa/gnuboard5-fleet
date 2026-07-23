<?php

declare(strict_types=1);

namespace Tests\Contract;

final class AdminPollContractTest extends ContractTestCase
{
    private const POLL_FIELDS = ['po_subject', 'po_poll1', 'po_poll2', 'po_level', 'po_point', 'po_use'];
    private const LEGACY_FIELDS = ['po_poll3', 'po_poll4', 'po_poll5', 'po_poll6', 'po_poll7', 'po_poll8', 'po_poll9'];
    private const SUMMARY_FIELDS = ['po_id', 'po_subject', 'po_date', 'po_level', 'po_point', 'po_use'];

    public function testListResponseContractIsDeclared(): void
    {
        $this->assertMethodHasOperationId('/admin/system/polls', 'get', 'adminSystemListPolls');
        $this->assertMethodHasParameters('/admin/system/polls', 'get', ['page', 'per_page']);
        $this->assertMethodResponseSchema('/admin/system/polls', 'get', '200', 'PollListResponse');
        $this->assertComponentArrayItemsUseSchemaRef('PollListResponse', 'PollSummary');
        $this->assertComponentHasPaginationRef('PollListResponse');
        $this->assertResolvedSchemaHasFields('PollSummary', self::SUMMARY_FIELDS);
    }

    public function testDetailResponseContractIsDeclared(): void
    {
        $this->assertMethodHasOperationId('/admin/system/polls/{po_id}', 'get', 'adminSystemGetPoll');
        $this->assertMethodResponseSchema('/admin/system/polls/{po_id}', 'get', '200', 'PollDetailResponse');
        $this->assertComponentUsesSchemaRef('PollDetailResponse', 'Poll');
        $this->assertSchemaHasFields('Poll', self::POLL_FIELDS);
    }

    public function testCreateRequired(): void
    {
        $this->assertMethodHasOperationId('/admin/system/polls', 'post', 'adminSystemCreatePoll');
        $this->assertRequestBodyUsesSchemaRef('/admin/system/polls', 'post', 'AdminSystemPollCreateRequest');
        $this->assertSchemaRequiredFields('AdminSystemPollCreateRequest', ['po_subject', 'po_poll1', 'po_poll2']);
        $this->assertSchemaIsClosedObject('AdminSystemPollCreateRequest');
        $this->assertResolvedSchemaHasFields('AdminSystemPollCreateRequest', self::POLL_FIELDS);
    }

    public function testPollFieldsMatchLegacy(): void
    {
        $this->assertResolvedSchemaHasFields('AdminSystemPollCreateRequest', self::LEGACY_FIELDS);
        $this->assertResolvedSchemaHasFields('AdminSystemPollUpdateRequest', self::LEGACY_FIELDS);
        $this->assertSchemaIsClosedObject('AdminSystemPollUpdateRequest');
    }
}
