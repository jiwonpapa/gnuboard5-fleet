<?php

declare(strict_types=1);

namespace Tests\Menu;

use Api\Core\DTO\MenuDTO;
use Api\Menu\Contracts\MenuGateway;
use Api\Menu\Controller\MenuController;
use Api\Menu\Service\MenuService;
use PHPUnit\Framework\TestCase;
use Slim\Psr7\Factory\ResponseFactory;
use Slim\Psr7\Factory\ServerRequestFactory;

final class MenuControllerTest extends TestCase
{
    public function testListIncludesPaginationEnvelope(): void
    {
        $controller = new MenuController(new MenuService(new InMemoryMenuGateway()));
        $request = (new ServerRequestFactory())->createServerRequest('GET', '/api/v1/menus');
        $response = (new ResponseFactory())->createResponse();

        $result = $controller->list($request, $response);
        $payload = json_decode((string)$result->getBody(), true, 512, JSON_THROW_ON_ERROR);

        $this->assertArrayHasKey('pagination', $payload);
        $this->assertSame(2, $payload['pagination']['total']);
        $this->assertSame(1, $payload['pagination']['page']);
        $this->assertSame(2, $payload['pagination']['per_page']);
        $this->assertFalse($payload['pagination']['has_next']);
        $this->assertFalse($payload['pagination']['has_prev']);
    }
}

final class InMemoryMenuGateway implements MenuGateway
{
    public function list(bool $mobileOnly = false): array
    {
        return [
            new MenuDTO(1, '10', 'home', '/', 'self', 0),
            new MenuDTO(2, '20', 'community', '/community', 'self', 1),
        ];
    }
}
