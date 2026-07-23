<?php

declare(strict_types=1);

namespace Tests\Admin;

use Api\Admin\Poll\Service\Support\AdminPollPresenter;
use Api\Admin\Popular\Service\Support\AdminPopularInputNormalizer;
use Api\Admin\Push\Service\Support\AdminPushInputNormalizer;
use Api\Admin\Report\Service\Support\AdminReportInputNormalizer;
use Api\Admin\Report\Service\Support\AdminReportPresenter;
use Api\Support\Exception\ApiException;
use PHPUnit\Framework\TestCase;

final class AdminProviderSupportTest extends TestCase
{
    public function testPopularDateRangeIsValidatedAndClosed(): void
    {
        $normalizer = new AdminPopularInputNormalizer();

        self::assertSame(
            ['date_from' => '2026-07-01', 'date_to' => '2026-07-15'],
            $normalizer->dateRange(['date_from' => '2026-07-01', 'date_to' => '2026-07-15'], true)
        );

        $this->expectException(ApiException::class);
        $normalizer->dateRange(['date_from' => '2026-07-16', 'date_to' => '2026-07-15'], true);
    }

    public function testPushTargetAliasesAreExclusiveAndMemberIdsAreDeduplicated(): void
    {
        $normalizer = new AdminPushInputNormalizer();

        $result = $normalizer->normalize([
            'title' => ' 제목 ',
            'body' => ' 본문 ',
            'member_ids' => ['a', 'a', 'b'],
        ]);

        self::assertSame('manual', $result['type']);
        self::assertSame(['a', 'b'], $result['member_ids']);

        $this->expectException(ApiException::class);
        $normalizer->normalize([
            'title' => '제목',
            'body' => '본문',
            'target' => 'all',
            'member_ids' => ['a'],
        ]);
    }

    public function testReportUpdateAndPresenterExposeOnlyTheDeclaredFields(): void
    {
        $input = new AdminReportInputNormalizer();
        $presenter = new AdminReportPresenter();

        self::assertSame(
            ['status' => 'approved', 'admin_memo' => '처리'],
            $input->updatePayload(['status' => 'approved', 'admin_memo' => ' 처리 '])
        );

        $item = $presenter->item(['rp_id' => '7', 'rp_status' => 'approved', 'internal' => 'hidden']);
        self::assertSame(7, $item['rp_id']);
        self::assertSame('approved', $item['rp_status']);
        self::assertArrayNotHasKey('internal', $item);
        self::assertCount(10, $item);
    }

    public function testPollPresenterCastsAndClosesRepositoryRows(): void
    {
        $poll = (new AdminPollPresenter())->present([
            'po_id' => '9',
            'po_subject' => '설문',
            'po_cnt1' => '4',
            'internal' => 'hidden',
        ]);

        self::assertSame(9, $poll['po_id']);
        self::assertSame(4, $poll['po_cnt1']);
        self::assertArrayNotHasKey('internal', $poll);
        self::assertCount(27, $poll);
    }
}
