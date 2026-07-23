<?php

/**
 * 관리자 메일 요청/응답 계약 회귀를 검증합니다.
 *
 * @package  Tests\Contract
 * @since    v1.1.0
 */

declare(strict_types=1);

namespace Tests\Contract;

final class AdminMailContractTest extends ContractTestCase
{
    public function testEveryMailSuccessBodyUsesConcreteNamedResponse(): void
    {
        $responses = [
            ['/admin/mails', 'get', '200', 'AdminMailListResponse'],
            ['/admin/mails', 'post', '200', 'AdminMailSendResponse'],
            ['/admin/mails/templates', 'post', '201', 'AdminMailDetailResponse'],
            ['/admin/mails/recipients', 'get', '200', 'AdminMailRecipientListResponse'],
            ['/admin/mails/test', 'post', '200', 'AdminMailTestResponse'],
            ['/admin/mail-tests', 'post', '200', 'AdminMailTestResponse'],
            ['/admin/mails/{ma_id}', 'get', '200', 'AdminMailDetailResponse'],
            ['/admin/mails/{ma_id}', 'put', '200', 'AdminMailDetailResponse'],
        ];

        foreach ($responses as [$path, $method, $status, $schema]) {
            $this->assertMethodResponseSchema($path, $method, $status, $schema);
        }
    }

    public function testMailRequestsAreNamedClosedAndFieldComplete(): void
    {
        $requests = [
            ['/admin/mails', 'post', 'AdminMailSendRequest'],
            ['/admin/mails/templates', 'post', 'AdminMailTemplateRequest'],
            ['/admin/mails/test', 'post', 'AdminMailTestRequest'],
            ['/admin/mail-tests', 'post', 'AdminMailTestRequest'],
            ['/admin/mails/{ma_id}', 'put', 'AdminMailTemplateRequest'],
        ];

        foreach ($requests as [$path, $method, $schema]) {
            $this->assertRequestBodyUsesSchemaRef($path, $method, $schema);
            $this->assertSchemaIsClosedObject($schema);
        }

        $this->assertSchemaHasFields('AdminMailTemplateRequest', ['ma_subject', 'ma_content', 'subject', 'content']);
        $this->assertSchemaHasFields('AdminMailSendRequest', [
            'ma_id', 'subject', 'content', 'target_type', 'level_min', 'level_max', 'gr_id',
            'member_id_from', 'member_id_to', 'email_contains', 'mb_ids', 'mailling_only', 'dry_run',
        ]);
        $this->assertSchemaHasFields('AdminMailTestRequest', ['ma_id', 'to', 'subject', 'content']);
        $this->assertSchemaRequiredFields('AdminMailSendRequest', ['target_type']);
        $this->assertSchemaRequiredFields('AdminMailTestRequest', ['to']);
    }

    public function testMailResponseDtosAreClosedAndRequired(): void
    {
        $schemas = [
            'AdminMailTemplate' => ['ma_id', 'ma_subject', 'ma_content', 'ma_time', 'ma_ip', 'ma_last_option'],
            'AdminMailDetail' => [
                'ma_id', 'ma_subject', 'ma_content', 'ma_time', 'ma_ip', 'ma_last_option',
                'last_option', 'preview_html',
            ],
            'AdminMailRecipient' => [
                'mb_id', 'mb_name', 'mb_nick', 'mb_email', 'mb_level', 'mb_mailling', 'mb_datetime',
            ],
            'AdminMailSendTarget' => ['mb_id', 'mb_email'],
            'AdminMailSendResult' => [
                'ma_id', 'template_used', 'target_count', 'sent_count', 'skipped_count',
                'mail_enabled', 'dry_run', 'targets',
            ],
            'AdminMailTestResult' => ['ma_id', 'template_used', 'mail_enabled', 'sent', 'to'],
        ];

        foreach ($schemas as $schema => $fields) {
            $this->assertSchemaIsClosedObject($schema);
            $this->assertSchemaHasFields($schema, $fields);
            $this->assertSchemaRequiredFields($schema, $fields);
        }
    }

    public function testMailListEndpointsDeclareRuntimeQueryDefaults(): void
    {
        $this->assertMethodHasParameters('/admin/mails', 'get', ['page', 'per_page']);
        $this->assertMethodHasParameters('/admin/mails/recipients', 'get', [
            'page', 'per_page', 'search', 'level_min', 'level_max', 'gr_id',
            'member_id_from', 'member_id_to', 'email_contains', 'mailling_only',
        ]);
    }
}
