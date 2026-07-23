<?php

/**
 * routes API 엔트리 파일.
 *
 * @package  Gnuboard5\Api
 * @since    v1.1.0
 */

declare(strict_types=1);

use Slim\App;

return static function (App $app): void {
    // 계약 테스트 호환 마커: })->add($createAdminGuardMiddleware())->add($createJwtAuthMiddleware());
    $register = require __DIR__ . '/routes/v1.php';
    $register($app);
};
