<?php

/**
 * MenuController API 모듈 정의.
 *
 * @package  Gnuboard5\Api\v1\Menu\Controller
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Menu\Controller;

use Api\Core\DTO\MenuDTO;
use Api\Menu\Service\MenuService;
use Api\Support\Http\ApiResponse;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class MenuController
{
    public function __construct(private readonly MenuService $menuService)
    {
    }

    public function list(Request $request, Response $response): Response
    {
        $query = $request->getQueryParams();
        $mobileOnly = ((string)($query['mobile'] ?? '')) === '1';
        $menus = array_map(
            static fn (MenuDTO $menu): array => (array)$menu->jsonSerialize(),
            $this->menuService->listMenus($mobileOnly)
        );

        return ApiResponse::envelope($response, $menus, [
            'total' => count($menus),
            'page' => 1,
            'per_page' => count($menus),
            'last_page' => 1,
            'has_next' => false,
            'has_prev' => false,
        ]);
    }
}
