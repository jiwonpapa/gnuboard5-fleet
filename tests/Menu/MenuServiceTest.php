<?php

declare(strict_types=1);

namespace Tests\Menu;

use Api\Core\DTO\MenuDTO;
use Api\Menu\Contracts\MenuGateway;
use Api\Menu\Service\MenuService;
use PHPUnit\Framework\TestCase;

final class MenuServiceTest extends TestCase
{
    public function testListReturnsOrderedMenus(): void
    {
        $gateway = $this->createMock(MenuGateway::class);
        $gateway->expects($this->once())
            ->method('list')
            ->with(false)
            ->willReturn([
                new MenuDTO(2, 'community', '커뮤니티', '/community', '_self', 10),
                new MenuDTO(1, 'home', '홈', '/', '_self', 0),
            ]);

        $result = (new MenuService($gateway))->listMenus();

        $this->assertCount(2, $result);
        $this->assertSame(2, $result[0]->meId);
        $this->assertSame('/', $result[1]->meLink);
    }

    public function testListMenusUsesMobileFilterFlag(): void
    {
        $gateway = $this->createMock(MenuGateway::class);
        $gateway->expects($this->once())
            ->method('list')
            ->with(true)
            ->willReturn([]);

        $result = (new MenuService($gateway))->listMenus(true);

        $this->assertSame([], $result);
    }
}
