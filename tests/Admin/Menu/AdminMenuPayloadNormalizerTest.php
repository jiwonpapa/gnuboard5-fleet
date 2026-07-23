<?php

/**
 * 관리자 메뉴 요청 정규화와 응답 프로젝션 계약을 검증합니다.
 *
 * @package  Gnuboard5\Tests\Admin\Menu
 * @since    v1.1.0
 */

declare(strict_types=1);

namespace Tests\Admin\Menu;

use Api\Admin\Menu\Service\Support\AdminMenuPayloadNormalizer;
use Api\Admin\Menu\Service\Support\AdminMenuPresenter;
use Api\Support\Exception\ApiException;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class AdminMenuPayloadNormalizerTest extends TestCase
{
    public function testCreateTrimsStringsAndAppliesContractDefaults(): void
    {
        $payload = (new AdminMenuPayloadNormalizer())->create([
            'me_code' => ' 10 ',
            'me_name' => ' 메뉴 ',
            'me_link' => ' /menu ',
        ]);

        self::assertSame([
            'me_code' => '10',
            'me_name' => '메뉴',
            'me_link' => '/menu',
            'me_target' => '_self',
            'me_order' => 0,
            'me_use' => 1,
            'me_mobile_use' => 1,
        ], $payload);
    }

    public function testCreateRejectsUndeclaredField(): void
    {
        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('허용되지 않은 필드가 있습니다: me_permission');

        (new AdminMenuPayloadNormalizer())->create([
            'me_code' => '10',
            'me_name' => '메뉴',
            'me_link' => '/menu',
            'me_permission' => 'admin',
        ]);
    }

    #[DataProvider('invalidFlagProvider')]
    public function testUpdateRejectsFlagOutsideIntegerEnum(mixed $value): void
    {
        $this->expectException(ApiException::class);

        (new AdminMenuPayloadNormalizer())->update(['me_use' => $value]);
    }

    public static function invalidFlagProvider(): array
    {
        return [
            'boolean' => [true],
            'numeric string' => ['1'],
            'outside enum' => [2],
        ];
    }

    public function testReorderRequiresClosedCompleteItems(): void
    {
        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('허용되지 않은 필드가 있습니다: label');

        (new AdminMenuPayloadNormalizer())->reorder([
            'orders' => [[
                'me_id' => 1,
                'me_order' => 0,
                'label' => 'not accepted',
            ]],
        ]);
    }

    public function testPresenterNormalizesDatabaseScalarTypes(): void
    {
        $menu = AdminMenuPresenter::menu([
            'me_id' => '7',
            'me_code' => '10',
            'me_name' => '메뉴',
            'me_link' => '/menu',
            'me_target' => '_blank',
            'me_order' => '3',
            'me_use' => '1',
            'me_mobile_use' => '0',
            'internal' => 'not exposed',
        ]);

        self::assertSame(7, $menu['me_id']);
        self::assertSame(3, $menu['me_order']);
        self::assertSame(1, $menu['me_use']);
        self::assertSame(0, $menu['me_mobile_use']);
        self::assertCount(8, $menu);
        self::assertArrayNotHasKey('internal', $menu);
    }
}
