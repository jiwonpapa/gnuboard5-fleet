<?php

declare(strict_types=1);

namespace Tests\Admin\Faq;

use Api\Admin\Faq\Service\Support\AdminFaqInputNormalizer;
use Api\Admin\Faq\Service\Support\AdminFaqMasterPayloadNormalizer;
use Api\Support\Exception\ApiException;
use PHPUnit\Framework\TestCase;

final class AdminFaqInputNormalizerTest extends TestCase
{
    public function testCreateCarriesNormalizedOrderIntoRepositoryPayload(): void
    {
        $result = (new AdminFaqInputNormalizer())->normalizeCreatePayload([
            'fm_id' => 3,
            'fa_subject' => ' 질문 ',
            'fa_content' => ' 답변 ',
            'fa_order' => 7,
        ]);

        self::assertSame([
            'fm_id' => 3,
            'fa_subject' => '질문',
            'fa_content' => '답변',
            'fa_order' => 7,
        ], $result);
    }

    public function testUpdateRejectsNonIntegerOrder(): void
    {
        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('fa_order는 정수여야 합니다.');

        (new AdminFaqInputNormalizer())->normalizeUpdatePayload(['fa_order' => '7']);
    }

    public function testMasterRejectsUndocumentedField(): void
    {
        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('허용되지 않은 필드');

        (new AdminFaqMasterPayloadNormalizer())->create([
            'fm_subject' => 'FAQ',
            'unexpected' => true,
        ]);
    }
}
