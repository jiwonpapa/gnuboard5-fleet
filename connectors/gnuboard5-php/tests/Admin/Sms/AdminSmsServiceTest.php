<?php

declare(strict_types=1);

namespace Tests\Admin\Sms;

use Api\Admin\Sms\Repository\AdminSmsRepository;
use Api\Admin\Sms\Service\AdminSmsService;
use Api\Support\Exception\ApiException;
use PHPUnit\Framework\TestCase;

final class AdminSmsServiceTest extends TestCase
{
    public function testContactCreateCapturesInsertIdBeforeGroupStatWrites(): void
    {
        $source = (string)file_get_contents(
            dirname(__DIR__, 3) . '/api/v1/Admin/Sms/Repository/AdminSmsContactWriteStore.php'
        );
        $idPosition = strpos($source, '$contactId = $this->lastInsertId();');
        $syncPosition = strpos($source, '$this->syncAllContactGroupStats();', (int)$idPosition);

        self::assertNotFalse($idPosition);
        self::assertNotFalse($syncPosition);
        self::assertLessThan($syncPosition, $idPosition);
        self::assertStringContainsString('findContact($contactId)', $source);
    }

    public function testUpdateConfigRejectsInvalidCallbackPhone(): void
    {
        $service = new AdminSmsService($this->createMock(AdminSmsRepository::class));

        $this->expectException(ApiException::class);
        $service->updateConfig(['cf_phone' => '123']);
    }

    public function testUpdateConfigRejectsEmptyServerPort(): void
    {
        $service = new AdminSmsService($this->createMock(AdminSmsRepository::class));

        $this->expectException(ApiException::class);
        $service->updateConfig(['cf_icode_server_port' => '']);
    }

    public function testSmsWriteRequestRejectsUnknownField(): void
    {
        $service = new AdminSmsService($this->createMock(AdminSmsRepository::class));

        $this->expectException(ApiException::class);
        $service->updateConfig(['cf_sms_use' => 'icode', 'unknown' => true]);
    }

    public function testSyncMembersRequiresIcodeMode(): void
    {
        $repository = $this->createMock(AdminSmsRepository::class);
        $repository->method('getConfig')->willReturn(['cf_sms_use' => '']);

        $service = new AdminSmsService($repository);

        $this->expectException(ApiException::class);
        $service->syncMembers();
    }

    public function testCreateTemplateGroupRejectsDuplicateName(): void
    {
        $repository = $this->createMock(AdminSmsRepository::class);
        $repository->method('templateGroupNameExists')->with('기본 그룹')->willReturn(true);

        $service = new AdminSmsService($repository);

        $this->expectException(ApiException::class);
        $service->createTemplateGroup(['fg_name' => '기본 그룹']);
    }

    public function testMoveTemplateGroupRejectsSameTarget(): void
    {
        $service = new AdminSmsService($this->createMock(AdminSmsRepository::class));

        $this->expectException(ApiException::class);
        $service->moveTemplateGroup(2, ['target_fg_no' => 2]);
    }

    public function testCreateTemplateRequiresContent(): void
    {
        $service = new AdminSmsService($this->createMock(AdminSmsRepository::class));

        $this->expectException(ApiException::class);
        $service->createTemplate(['fg_no' => 0, 'fo_name' => '인사']);
    }

    public function testBatchTemplatesRequiresTargetOnMove(): void
    {
        $service = new AdminSmsService($this->createMock(AdminSmsRepository::class));

        $this->expectException(ApiException::class);
        $service->batchTemplates([
            'action' => 'move',
            'template_ids' => [1, 2],
        ]);
    }

    public function testUpdateContactRejectsDuplicatePhone(): void
    {
        $repository = $this->createMock(AdminSmsRepository::class);
        $repository->method('findContact')->with(10)->willReturn(['bk_no' => 10, 'bg_no' => 1]);
        $repository->method('findContactByPhone')->with('01012345678', 10)->willReturn(['bk_no' => 11]);

        $service = new AdminSmsService($repository);

        $this->expectException(ApiException::class);
        $service->updateContact(10, ['bk_hp' => '010-1234-5678']);
    }

    public function testBatchContactsRejectsMissingTargetOnCopy(): void
    {
        $service = new AdminSmsService($this->createMock(AdminSmsRepository::class));

        $this->expectException(ApiException::class);
        $service->batchContacts([
            'action' => 'copy',
            'contact_ids' => [3],
        ]);
    }

    public function testSendMessageRequiresTargets(): void
    {
        $service = new AdminSmsService($this->createMock(AdminSmsRepository::class));

        $this->expectException(ApiException::class);
        $service->sendMessage([
            'message' => '공지',
        ]);
    }

    public function testSendMessageRejectsManualTargetWithoutPhone(): void
    {
        $service = new AdminSmsService($this->createMock(AdminSmsRepository::class));

        $this->expectException(ApiException::class);
        $service->sendMessage([
            'message' => '공지',
            'manual_targets' => [['name' => '홍길동']],
        ]);
    }

    public function testSendMessageDelegatesToRepository(): void
    {
        $repository = $this->createMock(AdminSmsRepository::class);
        $repository
            ->expects(self::once())
            ->method('sendMessage')
            ->with(self::callback(static function (array $payload): bool {
                return $payload['message'] === '공지' && $payload['manual_targets'][0]['phone'] === '010-1234-5678';
            }))
            ->willReturn([
                'write_no' => 1,
                'write_renum' => 0,
                'total' => 1,
                'success' => 1,
                'failure' => 0,
            ]);

        $service = new AdminSmsService($repository);
        $result = $service->sendMessage([
            'message' => '공지',
            'manual_targets' => [
                ['name' => '홍길동', 'phone' => '010-1234-5678'],
            ],
        ]);

        self::assertSame(1, $result['write_no']);
        self::assertSame(1, $result['success']);
    }

    public function testListTemplatesBuildsPagination(): void
    {
        $repository = $this->createMock(AdminSmsRepository::class);
        $repository
            ->expects(self::once())
            ->method('listTemplates')
            ->with(2, 15, 0, 'all', 'hello')
            ->willReturn([
                'total' => 31,
                'items' => [['fo_no' => 1]],
            ]);

        $service = new AdminSmsService($repository);
        $result = $service->listTemplates([
            'page' => 2,
            'per_page' => 15,
            'fg_no' => 0,
            'search_field' => 'all',
            'search' => 'hello',
        ]);

        self::assertSame(31, $result['pagination']['total']);
        self::assertSame(3, $result['pagination']['last_page']);
        self::assertCount(1, $result['items']);
    }

    public function testImportContactsRequiresGroup(): void
    {
        $service = new AdminSmsService($this->createMock(AdminSmsRepository::class));

        $this->expectException(ApiException::class);
        $service->importContacts([
            'contacts' => [['name' => '홍길동', 'phone' => '010-1234-5678']],
        ]);
    }

    public function testImportContactsConsumesCanonicalAndLegacyOptionalFields(): void
    {
        $repository = $this->createMock(AdminSmsRepository::class);
        $repository->method('findContactGroup')->with(2)->willReturn(['bg_no' => 2]);
        $repository
            ->expects(self::once())
            ->method('importContacts')
            ->with([
                [
                    'name' => '홍길동',
                    'phone' => '010-1234-5678',
                    'memo' => '정상 수신',
                    'receipt' => 0,
                ],
                [
                    'bk_name' => '김관리',
                    'bk_hp' => '010-9876-5432',
                    'bk_memo' => '레거시',
                    'bk_receipt' => 1,
                ],
            ], 2, false)
            ->willReturn(['imported_count' => 2]);

        $service = new AdminSmsService($repository);
        $result = $service->importContacts([
            'bg_no' => 2,
            'contacts' => [
                [
                    'name' => '홍길동',
                    'phone' => '010-1234-5678',
                    'memo' => '정상 수신',
                    'receipt' => false,
                ],
                [
                    'bk_name' => '김관리',
                    'bk_hp' => '010-9876-5432',
                    'bk_memo' => '레거시',
                    'bk_receipt' => 'yes',
                ],
            ],
        ]);

        self::assertSame(2, $result['imported_count']);
    }

    public function testExportContactsAllowsAllGroups(): void
    {
        $repository = $this->createMock(AdminSmsRepository::class);
        $repository
            ->expects(self::once())
            ->method('exportContacts')
            ->with(null, false, true)
            ->willReturn([
                ['bk_name' => '홍길동', 'bk_hp' => '010-1234-5678'],
            ]);

        $service = new AdminSmsService($repository);
        $result = $service->exportContacts([
            'bg_no' => 'all',
            'hyphen' => '1',
        ]);

        self::assertSame(1, $result['meta']['total']);
    }

    public function testDetailMessageBatchMergesDeliveryPagination(): void
    {
        $repository = $this->createMock(AdminSmsRepository::class);
        $repository
            ->method('findMessageBatch')
            ->with(9, 0)
            ->willReturn([
                'wr_no' => 9,
                'wr_renum' => 0,
                'wr_total' => 2,
            ]);
        $repository
            ->method('listBatchDeliveries')
            ->with(9, 0, 1, 20, 'name', '')
            ->willReturn([
                'total' => 2,
                'items' => [['hs_no' => 1], ['hs_no' => 2]],
            ]);

        $service = new AdminSmsService($repository);
        $result = $service->detailMessageBatch(9, []);

        self::assertSame(2, $result['deliveries_pagination']['total']);
        self::assertCount(2, $result['deliveries']);
    }
}
