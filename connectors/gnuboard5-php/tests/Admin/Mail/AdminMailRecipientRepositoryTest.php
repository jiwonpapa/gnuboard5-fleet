<?php

declare(strict_types=1);

namespace Tests\Admin\Mail;

use Api\Admin\Mail\Repository\AdminMailRecipientRepository;
use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;
use Doctrine\DBAL\Result;
use PHPUnit\Framework\TestCase;

final class AdminMailRecipientRepositoryTest extends TestCase
{
    public function testListRecipientsReturnsCountAndRows(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $qb->expects($this->exactly(2))
            ->method('executeQuery')
            ->willReturnOnConsecutiveCalls(
                $this->createResult(['cnt' => 2]),
                $this->createResult(false, [
                    ['mb_id' => 'alpha', 'mb_email' => 'alpha@example.com'],
                    ['mb_id' => 'beta', 'mb_email' => 'beta@example.com'],
                ])
            );

        $repository = $this->createRepository($qb);
        $result = $repository->listRecipients(1, 20, 'a', null, null, null, null, null, null, false);

        $this->assertSame(2, $result['total']);
        $this->assertCount(2, $result['items']);
        $this->assertSame('alpha', $result['items'][0]['mb_id']);
    }

    public function testFindRecipientsForSendReturnsEmptyForEmptyMemberTargets(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $qb->expects($this->never())->method('executeQuery');

        $repository = $this->createRepository($qb);
        $result = $repository->findRecipientsForSend('member', [], null, null, null, false, null, null, null);

        $this->assertSame([], $result);
    }

    public function testFindRecipientsForSendQueriesGroupRecipients(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $qb->expects($this->once())
            ->method('executeQuery')
            ->with(
                $this->stringContains('INNER JOIN g5_group_member gm'),
                $this->arrayHasKey('gr_id')
            )
            ->willReturn($this->createResult(false, [
                ['mb_id' => 'staff1', 'mb_email' => 'staff1@example.com'],
            ]));

        $repository = $this->createRepository($qb);
        $result = $repository->findRecipientsForSend('group', [], null, null, 'staff', true, null, null, null);

        $this->assertCount(1, $result);
        $this->assertSame('staff1', $result[0]['mb_id']);
    }

    /**
     * @param array<string, mixed>|false $assoc
     * @param array<int, array<string, mixed>> $all
     */
    private function createResult(array|false $assoc, array $all = []): Result
    {
        $result = $this->createMock(Result::class);
        $result->method('fetchAssociative')->willReturn($assoc);
        $result->method('fetchAllAssociative')->willReturn($all);

        return $result;
    }

    private function createRepository(QueryBuilder $qb): AdminMailRecipientRepository
    {
        return new AdminMailRecipientRepository($qb, new TableRegistry('g5_'));
    }
}
