<?php

declare(strict_types=1);

namespace Tests\Admin\Dev;

use Api\Admin\Dev\Support\LegacyAdminMenuCatalog;
use PHPUnit\Framework\TestCase;

final class LegacyAdminMenuCatalogTest extends TestCase
{
    public function testCatalogIncludesConfigAndBoardPages(): void
    {
        $catalog = new LegacyAdminMenuCatalog('/Users/neojins/workspace/gnuboard5/php');
        $entries = $catalog->listEntries();
        $paths = array_column($entries, 'path');

        self::assertContains('/adm/config_form.php', $paths);
        self::assertContains('/adm/member_list.php', $paths);
        self::assertContains('/adm/board_list.php', $paths);

        $configEntry = array_values(
            array_filter(
                $entries,
                static fn (array $entry): bool => $entry['path'] === '/adm/config_form.php'
                    && $entry['menu_code'] === '100100'
            )
        );

        self::assertCount(1, $configEntry);
        self::assertSame('기본환경설정', $configEntry[0]['label']);
        self::assertSame('100', $configEntry[0]['menu_group']);
    }
}
