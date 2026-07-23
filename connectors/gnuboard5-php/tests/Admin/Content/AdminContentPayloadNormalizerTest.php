<?php

declare(strict_types=1);

namespace Tests\Admin\Content;

use Api\Admin\Content\Service\Support\AdminContentPayloadNormalizer;
use Api\Support\Exception\ApiException;
use PHPUnit\Framework\TestCase;

final class AdminContentPayloadNormalizerTest extends TestCase
{
    public function testCreateNormalizesEveryCanonicalFieldAndDefault(): void
    {
        $result = (new AdminContentPayloadNormalizer())->create([
            'co_id' => ' about_us ',
            'co_subject' => ' 회사 소개 ',
            'co_content' => ' 본문 ',
        ]);

        self::assertSame([
            'co_id' => 'about_us',
            'co_subject' => '회사 소개',
            'co_html' => 0,
            'co_content' => '본문',
            'co_mobile_content' => '',
            'co_include_head' => '',
            'co_include_tail' => '',
            'co_tag_filter_use' => 1,
            'co_skin' => '',
            'co_mobile_skin' => '',
        ], $result);
    }

    public function testUpdateRejectsUnknownField(): void
    {
        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('허용되지 않은 필드');

        (new AdminContentPayloadNormalizer())->update(['co_subject' => '제목', 'password' => 'secret']);
    }

    public function testCreateRejectsNonIntegerHtmlMode(): void
    {
        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('co_html는 정수여야 합니다.');

        (new AdminContentPayloadNormalizer())->create([
            'co_id' => 'about',
            'co_subject' => '소개',
            'co_content' => '본문',
            'co_html' => '1',
        ]);
    }
}
