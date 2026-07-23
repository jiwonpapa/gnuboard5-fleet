<?php

declare(strict_types=1);

/**
 * 로컬/스테이징 자동화용 관리자 세션 부트스트랩입니다.
 * - 127.0.0.1, ::1, 사설망 IP 에서만 허용합니다.
 * - APP_RUNTIME_MODE=prod 인 경우 차단합니다.
 * - `ADMIN_LEGACY_BOOTSTRAP_MEMBER_ID` 회원을 최고관리자 세션으로 올린 뒤 next 로 이동합니다.
 * - curl 자동화는 `format=json` + cookie jar 를 사용하십시오.
 */

require_once __DIR__ . '/../vendor/autoload.php';

Api\Core\Config\EnvLoader::load(Api\Core\Config\EnvLoader::resolvePath(dirname(__DIR__)));
require_once __DIR__ . '/../common.php';

use Api\Admin\Dev\Support\LocalAdminBootstrapGuard;

$guard = new LocalAdminBootstrapGuard();
$appEnv = (string)(getenv('APP_ENV') ?: '');
$runtimeMode = (string)(getenv('APP_RUNTIME_MODE') ?: '');
$remoteAddr = (string)($_SERVER['REMOTE_ADDR'] ?? '');
$expectedSecret = trim((string)(getenv('ADMIN_LEGACY_BOOTSTRAP_SECRET') ?: getenv('ADMIN_SCHEMA_INSPECT_SECRET') ?: ''));
$providedSecret = trim((string)($_SERVER['HTTP_X_G5_ADMIN_INSPECT_SECRET'] ?? ($_GET['secret'] ?? '')));

if (!$guard->isAllowed($appEnv, $runtimeMode, $remoteAddr)) {
    http_response_code(403);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(
        [
            'ok' => false,
            'message' => 'local/staging private network 에서만 허용됩니다.',
            'remote_addr' => $remoteAddr,
        ],
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
    );
    exit;
}

if ($expectedSecret === '' || $providedSecret === '' || !hash_equals($expectedSecret, $providedSecret)) {
    http_response_code(401);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(
        [
            'ok' => false,
            'message' => '유효한 관리자 bootstrap 시크릿이 필요합니다.',
        ],
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
    );
    exit;
}

$memberId = $guard->resolveMemberId(getenv('ADMIN_LEGACY_BOOTSTRAP_MEMBER_ID') ?: null);
$member = get_member($memberId);
if (!is_array($member) || (string)($member['mb_id'] ?? '') !== $memberId) {
    http_response_code(404);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(
        [
            'ok' => false,
            'message' => '자동 로그인 대상 회원을 찾을 수 없습니다.',
            'member_id' => $memberId,
        ],
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
    );
    exit;
}

if (is_admin($memberId) !== 'super') {
    http_response_code(403);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(
        [
            'ok' => false,
            'message' => $memberId . ' 계정이 최고관리자가 아닙니다.',
            'member_id' => $memberId,
        ],
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
    );
    exit;
}

set_session('ss_mb_id', $memberId);
if (function_exists('generate_mb_key')) {
    generate_mb_key($member);
}
if (function_exists('update_auth_session_token')) {
    update_auth_session_token((string)($member['mb_datetime'] ?? ''));
}

$target = $guard->normalizeTarget($_GET['next'] ?? '/adm/config_form.php');
$format = strtolower(trim((string)($_GET['format'] ?? '')));

if ($format === 'json') {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(
        [
            'ok' => true,
            'member_id' => $memberId,
            'next' => $target,
            'session_name' => session_name(),
            'session_id' => session_id(),
        ],
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
    );
    session_write_close();
    exit;
}

session_write_close();
goto_url($target);
