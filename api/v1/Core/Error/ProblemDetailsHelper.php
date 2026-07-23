<?php

declare(strict_types=1);

namespace Api\Core\Error;

use PDOException;
use Throwable;

final class ProblemDetailsHelper
{
    private const API_VERSION = '1.0.0';

    /**
     * @return array{
     *     error_code:string,
     *     error_category:string,
     *     fault_domain:string,
     *     owner:string,
     *     retryable:bool,
     *     user_actionable:bool,
     *     guide:?array<string,mixed>
     * }
     */
    public static function classify(Throwable $exception, int $status, string $type = ''): array
    {
        if ($status === 500 || $status === 503 || $type === '/errors/bootstrap') {
            return self::classifyServerError($exception, $status, $type);
        }

        return match ($status) {
            400 => self::resolved('request.bad_request', 'request', 'client_input', 'client', false, true, [
                'action' => '입력값과 요청 필드를 확인하세요.',
                'reason' => '서버가 현재 요청 데이터를 처리할 수 없습니다.',
            ]),
            401 => self::resolved('auth.unauthorized', 'auth', 'auth', 'client', false, true, [
                'action' => '다시 로그인하세요.',
                'reason' => '인증 정보가 없거나 만료되었습니다.',
            ]),
            403 => self::resolved('auth.forbidden', 'auth', 'auth', 'client', false, true, [
                'action' => '관리자 권한을 확인하세요.',
                'reason' => '현재 계정에 필요한 권한이 없습니다.',
            ]),
            404 => self::resolved('resource.not_found', 'resource', 'resource', 'client', false, true, [
                'action' => '대상 리소스 존재 여부를 확인하세요.',
                'reason' => '요청한 리소스를 서버에서 찾지 못했습니다.',
            ]),
            405 => self::resolved('request.method_not_allowed', 'request', 'client_request', 'client', false, true, [
                'action' => '허용된 HTTP 메서드인지 확인하세요.',
                'reason' => '현재 엔드포인트가 요청한 메서드를 지원하지 않습니다.',
            ]),
            409 => self::resolved('request.conflict', 'request', 'client_request', 'client', false, true, [
                'action' => '중복 또는 현재 상태 충돌 여부를 확인하세요.',
                'reason' => '요청이 기존 데이터 또는 리소스 상태와 충돌합니다.',
            ]),
            422 => self::resolved('request.validation_failed', 'request', 'client_input', 'client', false, true, [
                'action' => '입력값과 요청 필드를 확인하세요.',
                'reason' => '서버가 현재 요청 데이터를 처리할 수 없습니다.',
            ]),
            429 => self::resolved('request.rate_limited', 'rate_limit', 'rate_limit', 'php_api', true, true, [
                'action' => '잠시 후 다시 시도하세요.',
                'reason' => '요청 빈도가 허용 한도를 초과했습니다.',
            ]),
            default => self::resolved('server.unclassified_error', 'server', 'server_runtime', 'php_api', false, false, null),
        };
    }

    public static function ensureRequestId(string $requestId = ''): string
    {
        $normalized = trim($requestId);
        if ($normalized !== '') {
            return $normalized;
        }

        return bin2hex(random_bytes(16));
    }

    /**
     * @param array{
     *     error_code:string,
     *     error_category:string,
     *     fault_domain:string,
     *     owner:string,
     *     retryable:bool,
     *     user_actionable:bool,
     *     guide:?array<string,mixed>
     * } $classification
     * @return array<string, string|bool>
     */
    public static function buildMeta(string $correlationId, string $serverRequestId, array $classification): array
    {
        return [
            'request_id' => $correlationId,
            'correlation_id' => $correlationId,
            'server_request_id' => $serverRequestId,
            'server_time' => gmdate(DATE_ATOM),
            'version' => self::API_VERSION,
            'error_code' => $classification['error_code'],
            'error_category' => $classification['error_category'],
            'fault_domain' => $classification['fault_domain'],
            'owner' => $classification['owner'],
            'retryable' => $classification['retryable'],
            'user_actionable' => $classification['user_actionable'],
        ];
    }

    /**
     * @return array{
     *     error_code:string,
     *     error_category:string,
     *     fault_domain:string,
     *     owner:string,
     *     retryable:bool,
     *     user_actionable:bool,
     *     guide:?array<string,mixed>
     * }
     */
    private static function classifyServerError(Throwable $exception, int $status, string $type): array
    {
        $class = strtolower($exception::class);
        $message = strtolower($exception->getMessage());

        if ($status === 503) {
            return self::resolved('server.service_unavailable', 'server', 'infrastructure', 'infrastructure', true, true, [
                'action' => '잠시 후 다시 시도하고, 계속되면 request_id로 서버 상태를 확인하세요.',
                'reason' => '서버가 일시적으로 요청을 처리할 수 없습니다.',
            ]);
        }

        if (
            $exception instanceof PDOException
            || str_contains($class, 'pdo')
            || str_contains($class, 'dbal')
            || self::containsAny($message, ['sqlstate', 'mysql', 'mariadb', 'database', 'query failed', 'constraint'])
        ) {
            return self::resolved('server.database_error', 'database', 'database', 'database', false, false, [
                'action' => 'request_id를 기준으로 DB 연결, 스키마, 데이터 상태를 서버 로그에서 확인하세요.',
                'reason' => '데이터베이스 처리 중 오류가 발생했습니다.',
            ]);
        }

        if (self::containsAny($message, [
            'failed to open stream',
            'permission denied',
            'no such file',
            'file_put_contents',
            'fopen(',
            'fwrite(',
            'mkdir(',
            'rename(',
            'unlink(',
            'upload',
        ])) {
            return self::resolved('server.storage_error', 'storage', 'storage', 'storage', false, false, [
                'action' => 'request_id를 기준으로 업로드 경로, 파일 존재 여부, 퍼미션을 서버 로그에서 확인하세요.',
                'reason' => '파일 저장소 처리 중 오류가 발생했습니다.',
            ]);
        }

        if (self::containsAny($message, [
            'connection refused',
            'timed out',
            'timeout',
            'could not resolve host',
            'getaddrinfo',
            'curl error',
            'ssl',
            'tls',
            'socket',
        ])) {
            return self::resolved('server.network_error', 'network', 'external_dependency', 'external_dependency', true, true, [
                'action' => '잠시 후 다시 시도하고, 계속되면 request_id를 기준으로 연동 대상 연결 상태를 확인하세요.',
                'reason' => '네트워크 또는 외부 서비스 통신 중 오류가 발생했습니다.',
            ]);
        }

        if (
            $type === '/errors/bootstrap'
            || self::containsAny($message, ['autoload not found', 'not configured', 'configuration', 'missing env', 'bootstrap'])
        ) {
            return self::resolved('server.bootstrap_error', 'bootstrap', 'server_bootstrap', 'php_api', false, false, [
                'action' => 'request_id를 기준으로 배포 상태와 환경설정을 서버 로그에서 확인하세요.',
                'reason' => '서버 초기화 또는 설정 단계에서 오류가 발생했습니다.',
            ]);
        }

        return self::resolved('server.runtime_error', 'server', 'server_runtime', 'php_api', false, false, [
            'action' => 'request_id와 요청 경로를 서버 로그에서 조회하세요.',
            'reason' => '서버 처리 중 예외가 발생했습니다.',
        ]);
    }

    /**
     * @param ?array<string, mixed> $guide
     * @return array{
     *     error_code:string,
     *     error_category:string,
     *     fault_domain:string,
     *     owner:string,
     *     retryable:bool,
     *     user_actionable:bool,
     *     guide:?array<string,mixed>
     * }
     */
    private static function resolved(
        string $errorCode,
        string $errorCategory,
        string $faultDomain,
        string $owner,
        bool $retryable,
        bool $userActionable,
        ?array $guide
    ): array {
        return [
            'error_code' => $errorCode,
            'error_category' => $errorCategory,
            'fault_domain' => $faultDomain,
            'owner' => $owner,
            'retryable' => $retryable,
            'user_actionable' => $userActionable,
            'guide' => $guide,
        ];
    }

    /**
     * @param list<string> $needles
     */
    private static function containsAny(string $haystack, array $needles): bool
    {
        foreach ($needles as $needle) {
            if ($needle !== '' && str_contains($haystack, $needle)) {
                return true;
            }
        }

        return false;
    }
}
