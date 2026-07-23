<?php

declare(strict_types=1);

namespace Tests\Core\Enum;

use Api\Core\Enum\SearchField;
use PHPUnit\Framework\TestCase;

final class SearchFieldTest extends TestCase
{
    public function testValuesAndTryFrom(): void
    {
        $values = SearchField::values();
        $this->assertContains('title', $values);
        $this->assertContains('title_content', $values);
        $this->assertSame(SearchField::Author, SearchField::tryFrom('author'));
        $this->assertNull(SearchField::tryFrom('unknown'));
    }
}
