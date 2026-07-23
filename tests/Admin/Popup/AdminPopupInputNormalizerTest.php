<?php

declare(strict_types=1);

namespace Tests\Admin\Popup;

use Api\Admin\Popup\Service\Support\AdminPopupInputNormalizer;
use Api\Support\Exception\ApiException;
use PHPUnit\Framework\TestCase;

final class AdminPopupInputNormalizerTest extends TestCase
{
    public function testNormalizePayloadAppliesDefaultsAndNormalizesEnums(): void
    {
        $normalizer = new AdminPopupInputNormalizer();

        $payload = $normalizer->normalizePayload([
            'nw_subject' => '팝업',
            'nw_content' => '본문',
        ]);

        $this->assertSame('both', $payload['nw_division']);
        $this->assertSame('both', $payload['nw_device']);
        $this->assertSame(24, $payload['nw_disable_hours']);
    }

    public function testRequirePopupIdRejectsZero(): void
    {
        $normalizer = new AdminPopupInputNormalizer();

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('nw_id는 1 이상의 정수여야 합니다.');

        $normalizer->requirePopupId(0);
    }

    public function testNormalizePayloadRejectsUndeclaredField(): void
    {
        $normalizer = new AdminPopupInputNormalizer();

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('지원하지 않는 팝업 요청 필드가 포함되어 있습니다.');

        $normalizer->normalizePayload([
            'nw_subject' => '팝업',
            'nw_content' => '본문',
            'unknown' => true,
        ]);
    }
}
