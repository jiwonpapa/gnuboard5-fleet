<?php

declare(strict_types=1);

namespace Tests\Admin\Sms;

use Api\Admin\Sms\Repository\AdminSmsRepository;
use Api\Admin\Sms\Service\AdminSmsService;
use PHPUnit\Framework\TestCase;

final class AdminSmsServiceCoverageTest extends TestCase
{
    public function testTemplateGroupFlowCoversCrudAndMetadata(): void
    {
        $repository = $this->createMock(AdminSmsRepository::class);
        $repository->expects(self::once())
            ->method('getConfig')
            ->willReturn(['cf_sms_use' => 'icode']);
        $repository->expects(self::once())
            ->method('listTemplateGroups')
            ->willReturn([['fg_no' => 1], ['fg_no' => 2]]);
        $repository->expects(self::any())
            ->method('findTemplateGroup')
            ->willReturnCallback(static function (int $groupId): ?array {
                return $groupId > 0 ? ['fg_no' => $groupId, 'fg_name' => '기본'] : ['fg_no' => 0, 'fg_name' => '공통'];
            });
        $repository->expects(self::exactly(2))
            ->method('templateGroupNameExists')
            ->willReturnCallback(static function (string $name, ?int $groupId = null): bool {
                return false;
            });
        $repository->expects(self::once())
            ->method('createTemplateGroup')
            ->with('신규 그룹', 1)
            ->willReturn(['fg_no' => 3, 'fg_name' => '신규 그룹']);
        $repository->expects(self::once())
            ->method('updateTemplateGroup')
            ->with(2, ['fg_name' => '수정 그룹', 'fg_member' => 1])
            ->willReturn(['fg_no' => 2, 'fg_name' => '수정 그룹']);
        $repository->expects(self::once())
            ->method('moveTemplateGroup')
            ->with(0, 2)
            ->willReturn(4);
        $repository->expects(self::once())
            ->method('clearTemplateGroup')
            ->with(2)
            ->willReturn(5);
        $repository->expects(self::once())
            ->method('deleteTemplateGroup')
            ->with(2);

        $service = new AdminSmsService($repository);

        self::assertSame('icode', $service->getConfig()['cf_sms_use']);
        self::assertSame(2, $service->listTemplateGroups()['meta']['total']);
        self::assertSame(1, $service->detailTemplateGroup(1)['fg_no']);
        self::assertSame(3, $service->createTemplateGroup(['fg_name' => '신규 그룹', 'fg_member' => true])['fg_no']);
        self::assertSame(2, $service->updateTemplateGroup(2, ['fg_name' => '수정 그룹', 'fg_member' => '1'])['fg_no']);
        self::assertSame(4, $service->moveTemplateGroup(0, ['target_fg_no' => 2])['affected']);
        self::assertSame(5, $service->clearTemplateGroup(2)['deleted']);
        $service->deleteTemplateGroup(2);
        self::assertTrue(true);
    }

    public function testTemplateFlowCoversListCrudAndBatchOperations(): void
    {
        $repository = $this->createMock(AdminSmsRepository::class);
        $repository->expects(self::once())
            ->method('listTemplates')
            ->with(2, 15, 1, 'name', 'hello')
            ->willReturn([
                'total' => 16,
                'items' => [['fo_no' => 1]],
            ]);
        $repository->expects(self::exactly(2))
            ->method('findTemplate')
            ->willReturnOnConsecutiveCalls(
                ['fo_no' => 1, 'fo_name' => '인사'],
                ['fo_no' => 2, 'fo_name' => '수정본']
            );
        $repository->expects(self::any())
            ->method('findTemplateGroup')
            ->willReturnCallback(static fn (int $groupId): ?array => ['fg_no' => $groupId, 'fg_name' => '그룹']);
        $repository->expects(self::once())
            ->method('templateContentExists')
            ->with('안녕하세요')
            ->willReturn(false);
        $repository->expects(self::once())
            ->method('createTemplate')
            ->with([
                'fg_no' => 2,
                'fo_name' => '인사',
                'fo_content' => '안녕하세요',
            ])
            ->willReturn(['fo_no' => 10, 'fo_name' => '인사']);
        $repository->expects(self::once())
            ->method('updateTemplate')
            ->with(2, ['fg_no' => 2, 'fo_name' => '수정본', 'fo_content' => '변경'])
            ->willReturn(['fo_no' => 2, 'fo_name' => '수정본']);
        $repository->expects(self::once())
            ->method('deleteTemplate')
            ->with(2)
            ->willReturn(1);
        $repository->expects(self::once())
            ->method('batchUpdateTemplates')
            ->with('move', [1, 2], 2)
            ->willReturn(['affected' => 2]);

        $service = new AdminSmsService($repository);

        $listed = $service->listTemplates([
            'page' => 2,
            'per_page' => 15,
            'fg_no' => 1,
            'search_field' => 'name',
            'search' => 'hello',
        ]);
        self::assertSame(2, $listed['pagination']['page']);
        self::assertSame(2, $listed['pagination']['last_page']);

        self::assertSame(1, $service->detailTemplate(1)['fo_no']);
        self::assertSame(10, $service->createTemplate(['fg_no' => 2, 'fo_name' => '인사', 'fo_content' => '안녕하세요'])['fo_no']);
        self::assertSame(2, $service->updateTemplate(2, ['fg_no' => 2, 'fo_name' => '수정본', 'fo_content' => '변경'])['fo_no']);
        $service->deleteTemplate(2);
        self::assertSame(2, $service->batchTemplates([
            'action' => 'move',
            'template_ids' => [1, 2],
            'target_fg_no' => 2,
        ])['affected']);
    }

    public function testContactGroupAndContactFlowsCoverHappyPath(): void
    {
        $repository = $this->createMock(AdminSmsRepository::class);
        $repository->expects(self::once())
            ->method('listContactGroups')
            ->willReturn([['bg_no' => 1], ['bg_no' => 2]]);
        $repository->expects(self::any())
            ->method('findContactGroup')
            ->willReturnCallback(static function (int $groupId): ?array {
                return match ($groupId) {
                    1 => ['bg_no' => 1, 'bg_name' => '기본'],
                    2 => ['bg_no' => 2, 'bg_name' => '고객'],
                    3 => ['bg_no' => 3, 'bg_name' => '신규'],
                    default => null,
                };
            });
        $repository->expects(self::exactly(2))
            ->method('contactGroupNameExists')
            ->willReturn(false);
        $repository->expects(self::once())
            ->method('createContactGroup')
            ->with('신규 그룹')
            ->willReturn(['bg_no' => 3, 'bg_name' => '신규 그룹']);
        $repository->expects(self::once())
            ->method('updateContactGroup')
            ->with(2, '수정 그룹')
            ->willReturn(['bg_no' => 2, 'bg_name' => '수정 그룹']);
        $repository->expects(self::once())
            ->method('moveContactGroup')
            ->with(2, 3)
            ->willReturn(4);
        $repository->expects(self::once())
            ->method('clearContactGroup')
            ->with(2)
            ->willReturn(6);
        $repository->expects(self::once())
            ->method('deleteContactGroup')
            ->with(2);

        $repository->expects(self::once())
            ->method('listContacts')
            ->with(2, 10, 2, 'name', 'neo', false)
            ->willReturn([
                'total' => 11,
                'items' => [['bk_no' => 9]],
                'summary' => [
                    'total_count' => 11,
                    'receipt_count' => 1,
                    'reject_count' => 10,
                    'member_count' => 3,
                    'non_member_count' => 8,
                    'last_synced_at' => null,
                ],
            ]);
        $repository->expects(self::exactly(2))
            ->method('findContact')
            ->willReturnOnConsecutiveCalls(
                ['bk_no' => 9, 'bk_name' => '네오'],
                ['bk_no' => 11, 'bk_name' => '모피어스']
            );
        $repository->expects(self::exactly(2))
            ->method('findContactByPhone')
            ->willReturn(null);
        $repository->expects(self::once())
            ->method('createContact')
            ->with([
                'bg_no' => 2,
                'mb_id' => 'neo1',
                'bk_name' => '네오',
                'bk_hp' => '01012345678',
                'bk_receipt' => 1,
                'bk_memo' => '핵심 고객',
            ])
            ->willReturn(['bk_no' => 10]);
        $repository->expects(self::once())
            ->method('updateContact')
            ->with(11, [
                'bg_no' => 2,
                'bk_name' => '모피어스',
                'bk_hp' => '01087654321',
                'bk_receipt' => 0,
                'bk_memo' => '수정',
            ])
            ->willReturn(['bk_no' => 11]);
        $repository->expects(self::once())
            ->method('deleteContact')
            ->with(11)
            ->willReturn(1);
        $repository->expects(self::once())
            ->method('batchUpdateContacts')
            ->with('copy', [9, 11], 2)
            ->willReturn(['affected' => 2]);
        $repository->expects(self::once())
            ->method('importContacts')
            ->with([['name' => '네오', 'phone' => '01012345678']], 2, true)
            ->willReturn([
                'total_count' => 1,
                'invalid_count' => 0,
                'duplicate_count' => 0,
                'importable_count' => 1,
                'imported_count' => 0,
                'dry_run' => true,
                'duplicate_phones' => [],
                'importable_phones' => ['01012345678'],
            ]);
        $repository->expects(self::once())
            ->method('exportContacts')
            ->with(2, false, true)
            ->willReturn([
                ['bk_name' => '네오', 'bk_hp' => '010-1234-5678'],
            ]);

        $service = new AdminSmsService($repository);

        self::assertSame(2, $service->listContactGroups()['meta']['total']);
        self::assertSame(1, $service->detailContactGroup(1)['bg_no']);
        self::assertSame(3, $service->createContactGroup(['bg_name' => '신규 그룹'])['bg_no']);
        self::assertSame(2, $service->updateContactGroup(2, ['bg_name' => '수정 그룹'])['bg_no']);
        self::assertSame(4, $service->moveContactGroup(2, ['target_bg_no' => 3])['affected']);
        self::assertSame(6, $service->clearContactGroup(2)['deleted']);
        $service->deleteContactGroup(2);

        $listed = $service->listContacts([
            'page' => 2,
            'per_page' => 10,
            'bg_no' => 2,
            'search_field' => 'name',
            'search' => 'neo',
        ]);
        self::assertSame(2, $listed['pagination']['page']);
        self::assertSame(2, $listed['pagination']['last_page']);
        self::assertSame(1, $listed['meta']['receipt_count']);

        self::assertSame(9, $service->detailContact(9)['bk_no']);
        self::assertSame(10, $service->createContact([
            'bg_no' => 2,
            'mb_id' => 'neo1',
            'bk_name' => '네오',
            'bk_hp' => '010-1234-5678',
            'bk_receipt' => true,
            'bk_memo' => '핵심 고객',
        ])['bk_no']);
        self::assertSame(11, $service->updateContact(11, [
            'bg_no' => 2,
            'bk_name' => '모피어스',
            'bk_hp' => '010-8765-4321',
            'bk_receipt' => false,
            'bk_memo' => '수정',
        ])['bk_no']);
        $service->deleteContact(11);
        self::assertSame(2, $service->batchContacts([
            'action' => 'copy',
            'contact_ids' => [9, 11],
            'target_bg_no' => 2,
        ])['affected']);
        self::assertSame(1, $service->importContacts([
            'bg_no' => 2,
            'dry_run' => true,
            'contacts' => [['name' => '네오', 'phone' => '01012345678']],
        ])['importable_count']);
        self::assertSame(1, $service->exportContacts(['bg_no' => 2, 'hyphen' => '1'])['meta']['total']);
    }

    public function testMessageHistoryFlowCoversBatchAndDeliveryQueries(): void
    {
        $repository = $this->createMock(AdminSmsRepository::class);
        $repository->expects(self::once())
            ->method('listMessageBatches')
            ->with(2, 10, 'neo')
            ->willReturn([
                'total' => 11,
                'items' => [['wr_no' => 1]],
            ]);
        $repository->expects(self::once())
            ->method('listDeliveries')
            ->with(3, 5, 'hp', '010')
            ->willReturn([
                'total' => 6,
                'items' => [['hs_no' => 1]],
            ]);
        $repository->expects(self::once())
            ->method('findMessageBatch')
            ->with(4, 1)
            ->willReturn([
                'wr_no' => 4,
                'wr_renum' => 1,
            ]);
        $repository->expects(self::once())
            ->method('listBatchDeliveries')
            ->with(4, 1, 2, 5, 'hp', '010')
            ->willReturn([
                'total' => 7,
                'items' => [['hs_no' => 2]],
            ]);
        $repository->expects(self::exactly(2))
            ->method('resendMessageBatch')
            ->willReturnCallback(static function (int $writeNo, int $renum, bool $failuresOnly, mixed $bookingAt): array {
                if ($failuresOnly) {
                    self::assertSame(4, $writeNo);
                    self::assertSame(1, $renum);
                    self::assertSame('2026-03-10 18:30:45', $bookingAt);

                    return ['write_no' => 5];
                }

                self::assertSame(4, $writeNo);
                self::assertSame(1, $renum);
                self::assertNull($bookingAt);

                return ['write_no' => 6];
            });

        $service = new AdminSmsService($repository);

        $batches = $service->listMessageBatches(['page' => 2, 'per_page' => 10, 'search' => 'neo']);
        self::assertSame(2, $batches['pagination']['page']);

        $deliveries = $service->listDeliveries([
            'page' => 3,
            'per_page' => 5,
            'search_field' => 'hp',
            'search' => '010',
        ]);
        self::assertSame(2, $deliveries['pagination']['last_page']);

        $detail = $service->detailMessageBatch(4, [
            'wr_renum' => 1,
            'page' => 2,
            'per_page' => 5,
            'search_field' => 'hp',
            'search' => '010',
        ]);
        self::assertSame(7, $detail['deliveries_pagination']['total']);
        self::assertCount(1, $detail['deliveries']);

        self::assertSame(5, $service->resendFailures(4, [
            'wr_renum' => 1,
            'booking_at' => '2026-03-10 18:30:45',
        ])['write_no']);
        self::assertSame(6, $service->resendAll(4, ['wr_renum' => 1])['write_no']);
    }

    public function testSendMessageDelegatesScheduledPayload(): void
    {
        $repository = $this->createMock(AdminSmsRepository::class);
        $repository->expects(self::once())
            ->method('sendMessage')
            ->with(self::callback(static function (array $payload): bool {
                return ($payload['message'] ?? null) === '공지'
                    && ($payload['booking_at'] ?? null) === '2026-03-10 18:30:45'
                    && ($payload['wr_reply'] ?? null) === '02-123-4567';
            }))
            ->willReturn([
                'write_no' => 7,
                'success' => 2,
            ]);

        $service = new AdminSmsService($repository);
        $result = $service->sendMessage([
            'message' => '공지',
            'group_ids' => [1],
            'manual_targets' => [['name' => '네오', 'phone' => '010-1234-5678']],
            'booking_at' => '2026-03-10 18:30:45',
            'wr_reply' => '02-123-4567',
        ]);

        self::assertSame(7, $result['write_no']);
        self::assertSame(2, $result['success']);
    }
}
