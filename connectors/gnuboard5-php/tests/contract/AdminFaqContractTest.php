<?php

declare(strict_types=1);

namespace Tests\Contract;

final class AdminFaqContractTest extends ContractTestCase
{
    private const FAQ_FIELDS = ['fm_id', 'fa_subject', 'fa_content', 'fa_order'];
    private const FAQ_MASTER_FIELDS = ['fm_subject', 'fm_order', 'fm_head_html', 'fm_tail_html'];

    public function testFaqListResponseContractIsDeclared(): void
    {
        $this->assertMethodHasOperationId('/admin/faqs', 'get', 'adminListFaqs');
        $this->assertMethodHasParameters('/admin/faqs', 'get', ['page', 'per_page', 'fm_id']);
        $this->assertMethodResponseSchema('/admin/faqs', 'get', '200', 'FaqListResponse');
        $this->assertComponentArrayItemsUseSchemaRef('FaqListResponse', 'FaqItem');
        $this->assertComponentHasPaginationRef('FaqListResponse');
        $this->assertSchemaHasFields('FaqItem', self::FAQ_FIELDS);
    }

    public function testFaqDetailResponseContractIsDeclared(): void
    {
        $this->assertMethodHasOperationId('/admin/faqs/{fa_id}', 'get', 'adminGetFaq');
        $this->assertMethodResponseSchema('/admin/faqs/{fa_id}', 'get', '200', 'FaqDetailResponse');
        $this->assertComponentUsesSchemaRef('FaqDetailResponse', 'FaqItem');
        $this->assertSchemaHasFields('FaqItem', self::FAQ_FIELDS);
    }

    public function testFaqMasterListResponseContractIsDeclared(): void
    {
        $this->assertMethodHasOperationId('/admin/faq-masters', 'get', 'adminListFaqMasters');
        $this->assertMethodResponseSchema('/admin/faq-masters', 'get', '200', 'FaqMasterListResponse');
        $this->assertComponentArrayItemsUseSchemaRef('FaqMasterListResponse', 'FaqMasterSummary');
        $this->assertComponentHasPaginationRef('FaqMasterListResponse');
        $this->assertSchemaHasFields('FaqMasterSummary', ['fm_id', 'fm_subject', 'fm_order', 'faq_count', 'header_image', 'footer_image']);
    }

    public function testFaqMasterDetailResponseContractIsDeclared(): void
    {
        $this->assertMethodHasOperationId('/admin/faq-masters/{fm_id}', 'get', 'adminGetFaqMaster');
        $this->assertMethodResponseSchema('/admin/faq-masters/{fm_id}', 'get', '200', 'FaqMasterDetailResponse');
        $this->assertComponentUsesSchemaRef('FaqMasterDetailResponse', 'FaqMasterDetail');
        $this->assertSchemaHasFields('FaqMasterDetail', ['fm_subject', 'fm_head_html', 'fm_tail_html', 'fm_mobile_head_html', 'fm_mobile_tail_html']);
    }

    public function testFaqCreateAndUpdateUseClosedNamedContracts(): void
    {
        $this->assertMethodHasOperationId('/admin/faqs', 'post', 'adminCreateFaq');
        $this->assertRequestBodyUsesSchemaRef('/admin/faqs', 'post', 'FaqCreateRequest');
        $this->assertSchemaIsClosedObject('FaqCreateRequest');
        $this->assertSchemaRequiredFields('FaqCreateRequest', ['fm_id', 'fa_subject', 'fa_content']);
        $this->assertSchemaHasFields('FaqCreateRequest', self::FAQ_FIELDS);
        $this->assertMethodResponseSchema('/admin/faqs', 'post', '201', 'FaqDetailResponse');

        $this->assertRequestBodyUsesSchemaRef('/admin/faqs/{fa_id}', 'put', 'FaqUpdateRequest');
        $this->assertSchemaIsClosedObject('FaqUpdateRequest');
        $this->assertSchemaHasFields('FaqUpdateRequest', self::FAQ_FIELDS);
        $this->assertMethodResponseSchema('/admin/faqs/{fa_id}', 'put', '200', 'FaqDetailResponse');
    }

    public function testFaqMasterCreateAndUpdateUseClosedNamedContracts(): void
    {
        $this->assertMethodHasOperationId('/admin/faq-masters', 'post', 'adminCreateFaqMaster');
        $this->assertRequestBodyUsesSchemaRef('/admin/faq-masters', 'post', 'FaqMasterCreateRequest');
        $this->assertSchemaIsClosedObject('FaqMasterCreateRequest');
        $this->assertSchemaRequiredFields('FaqMasterCreateRequest', ['fm_subject']);
        $this->assertSchemaHasFields('FaqMasterCreateRequest', self::FAQ_MASTER_FIELDS);
        $this->assertMethodResponseSchema('/admin/faq-masters', 'post', '201', 'FaqMasterDetailResponse');

        $this->assertRequestBodyUsesSchemaRef('/admin/faq-masters/{fm_id}', 'put', 'FaqMasterUpdateRequest');
        $this->assertSchemaIsClosedObject('FaqMasterUpdateRequest');
        $this->assertSchemaHasFields('FaqMasterUpdateRequest', self::FAQ_MASTER_FIELDS);
        $this->assertMethodResponseSchema('/admin/faq-masters/{fm_id}', 'put', '200', 'FaqMasterDetailResponse');
    }

    public function testFaqImageAliasesAndResponsesAreDeclared(): void
    {
        $this->assertRequestBodyUsesSchemaRef(
            '/admin/faq-masters/{fm_id}/header-image',
            'post',
            'FaqMasterHeaderImageUploadRequest'
        );
        $this->assertRequestBodyUsesSchemaRef(
            '/admin/faq-masters/{fm_id}/footer-image',
            'post',
            'FaqMasterFooterImageUploadRequest'
        );
        $this->assertSchemaHasFields('FaqMasterHeaderImageUploadRequest', ['file', 'image', 'header_image', 'fm_himg']);
        $this->assertSchemaHasFields('FaqMasterFooterImageUploadRequest', ['file', 'image', 'footer_image', 'fm_timg']);
        foreach (['post', 'delete'] as $method) {
            $this->assertMethodResponseSchema('/admin/faq-masters/{fm_id}/header-image', $method, '200', 'FaqImageResponse');
            $this->assertMethodResponseSchema('/admin/faq-masters/{fm_id}/footer-image', $method, '200', 'FaqImageResponse');
        }
    }

    public function testFaqImageNullableFieldsAreDocumented(): void
    {
        foreach (['width', 'height', 'mime', 'size'] as $field) {
            $this->assertSchemaFieldContains('FaqImage', $field, 'nullable: true');
        }
    }

    public function testFaqResponseSchemasAreClosedAndRequired(): void
    {
        foreach (
            ['FaqItem', 'FaqListResponse', 'FaqDetailResponse', 'FaqImage', 'FaqMasterSummary',
                'FaqMasterDetail', 'FaqMasterListResponse', 'FaqMasterDetailResponse', 'FaqImageResponse'] as $schema
        ) {
            $this->assertSchemaIsClosedObject($schema);
        }
        $this->assertSchemaRequiredFields('FaqItem', ['fa_id', 'fm_id', 'fm_subject', 'fa_subject', 'fa_content', 'fa_order']);
        $this->assertSchemaRequiredFields('FaqImage', ['exists', 'relative_path', 'url', 'width', 'height', 'mime', 'size']);
    }
}
