<?php

declare(strict_types=1);

namespace Tests\Contract;

final class AdminContentContractTest extends ContractTestCase
{
    private const CONTENT_FIELDS = [
        'co_id',
        'co_subject',
        'co_html',
        'co_content',
        'co_mobile_content',
        'co_include_head',
        'co_include_tail',
        'co_tag_filter_use',
        'co_skin',
        'co_mobile_skin',
    ];

    public function testListResponseContractIsDeclared(): void
    {
        $this->assertMethodHasOperationId('/admin/contents', 'get', 'adminListContents');
        $this->assertMethodHasParameters('/admin/contents', 'get', ['page', 'per_page', 'search']);
        $this->assertMethodResponseSchema('/admin/contents', 'get', '200', 'ContentListResponse');
        $this->assertComponentArrayItemsUseSchemaRef('ContentListResponse', 'ContentItem');
        $this->assertComponentHasPaginationRef('ContentListResponse');
        $this->assertSchemaHasFields('ContentItem', self::CONTENT_FIELDS);
    }

    public function testDetailResponseContractIsDeclared(): void
    {
        $this->assertMethodHasOperationId('/admin/contents/{co_id}', 'get', 'adminGetContent');
        $this->assertMethodResponseSchema('/admin/contents/{co_id}', 'get', '200', 'ContentDetailResponse');
        $this->assertComponentUsesSchemaRef('ContentDetailResponse', 'ContentItem');
        $this->assertSchemaHasFields('ContentItem', self::CONTENT_FIELDS);
    }

    public function testCreateAndUpdateUseClosedNamedContracts(): void
    {
        $this->assertMethodHasOperationId('/admin/contents', 'post', 'adminCreateContent');
        $this->assertRequestBodyUsesSchemaRef('/admin/contents', 'post', 'ContentCreateRequest');
        $this->assertSchemaIsClosedObject('ContentCreateRequest');
        $this->assertSchemaRequiredFields('ContentCreateRequest', ['co_id', 'co_subject', 'co_content']);
        $this->assertSchemaHasFields('ContentCreateRequest', self::CONTENT_FIELDS);
        $this->assertMethodResponseSchema('/admin/contents', 'post', '201', 'ContentDetailResponse');

        $this->assertRequestBodyUsesSchemaRef('/admin/contents/{co_id}', 'put', 'ContentUpdateRequest');
        $this->assertSchemaIsClosedObject('ContentUpdateRequest');
        $this->assertSchemaHasFields('ContentUpdateRequest', array_values(array_diff(self::CONTENT_FIELDS, ['co_id'])));
        $this->assertMethodResponseSchema('/admin/contents/{co_id}', 'put', '200', 'ContentDetailResponse');
    }

    public function testContentResponsesAreClosedAndComplete(): void
    {
        foreach (['ContentItem', 'ContentListResponse', 'ContentDetailResponse'] as $schema) {
            $this->assertSchemaIsClosedObject($schema);
        }
        $this->assertSchemaRequiredFields('ContentItem', self::CONTENT_FIELDS);
    }
}
