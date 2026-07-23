<?php

declare(strict_types=1);

namespace Tests\Admin\Board;

use Api\Admin\Board\Service\Support\AdminBoardInputNormalizer;
use Api\Support\Exception\ApiException;
use PHPUnit\Framework\TestCase;

final class AdminBoardInputNormalizerTest extends TestCase
{
    public function testCreateNormalizesFullLegacyAdminFieldTypes(): void
    {
        $normalizer = new AdminBoardInputNormalizer();
        $payload = $normalizer->normalizeCreatePayload([
            'bo_table' => 'free_board',
            'bo_subject' => ' 자유 게시판 ',
            'gr_id' => 'community',
            'bo_list_level' => '2',
            'bo_use_category' => true,
            'bo_use_search' => 'false',
            'bo_skin' => 'basic',
            'bo_content_head' => '<p>head</p>',
            'bo_1' => 'extra',
            'bo_count_write' => '3',
        ]);

        self::assertSame('free_board', $payload['bo_table']);
        self::assertSame('자유 게시판', $payload['bo_subject']);
        self::assertSame(2, $payload['bo_list_level']);
        self::assertSame(1, $payload['bo_use_category']);
        self::assertSame(0, $payload['bo_use_search']);
        self::assertSame('basic', $payload['bo_skin']);
        self::assertSame('<p>head</p>', $payload['bo_content_head']);
        self::assertSame('extra', $payload['bo_1']);
        self::assertSame(3, $payload['bo_count_write']);
    }

    public function testCreateAndUpdateRejectUnknownOrInvalidFields(): void
    {
        $normalizer = new AdminBoardInputNormalizer();

        try {
            $normalizer->normalizeCreatePayload([
                'bo_table' => 'free',
                'bo_subject' => '자유',
                'gr_id' => 'community',
                'unknown' => true,
            ]);
            self::fail('unknown create field must fail');
        } catch (ApiException $exception) {
            self::assertStringContainsString('지원하지 않는 게시판 요청 필드', $exception->getMessage());
        }

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('bo_list_level 값은 정수여야 합니다.');
        $normalizer->normalizeUpdatePayload(['bo_list_level' => '2a']);
    }

    public function testBoardRecordMatchesOpenApiScalarTypesAndDropsUnknownColumns(): void
    {
        $normalizer = new AdminBoardInputNormalizer();
        $board = $normalizer->normalizeBoardRecord([
            'bo_table' => 'free',
            'bo_subject' => '자유',
            'gr_id' => 'community',
            'bo_read_level' => '2',
            'bo_use_category' => '1',
            'bo_count_write' => '7',
            'unknown_column' => 'drop-me',
        ]);

        self::assertSame(2, $board['bo_read_level']);
        self::assertTrue($board['bo_use_category']);
        self::assertSame(7, $board['bo_count_write']);
        self::assertArrayNotHasKey('unknown_column', $board);
    }

    public function testCopyTargetConsumesCopyPostsAndRejectsUnknownFields(): void
    {
        $normalizer = new AdminBoardInputNormalizer();
        $target = $normalizer->normalizeCopyTarget(
            ['target_bo_table' => 'free_copy', 'copy_posts' => true],
            ['bo_subject' => '자유']
        );

        self::assertSame('free_copy', $target['target_bo_table']);
        self::assertSame('자유 (복사)', $target['target_bo_subject']);
        self::assertTrue($target['copy_posts']);

        $this->expectException(ApiException::class);
        $normalizer->normalizeCopyTarget(
            ['target_bo_table' => 'other', 'unknown' => true],
            ['bo_subject' => '자유']
        );
    }
}
