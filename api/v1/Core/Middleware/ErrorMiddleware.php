<?php

/**
 * ErrorMiddleware API module.
 *
 * @package  Gnuboard5\Api\v1\Core\Middleware
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Core\Middleware;

use Api\Core\Config\RuntimeProfile;
use Api\Core\Config\RuntimeProfileResolver;
use Api\Core\Error\ProblemDetailsHelper;
use Api\Core\Enum\ApiErrorType;
use Api\Core\Exception\ApiException as CoreApiException;
use Api\Support\Http\TraceContext;
use Api\Support\Logging\ApiLoggerFactory;
use Api\Support\Logging\ErrorContextBuilder;
use Api\Support\Exception\ApiException as LegacyApiException;
use Psr\Http\Message\ResponseFactoryInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Log\LoggerInterface;
use Slim\Exception\HttpException;
use Throwable;

final class ErrorMiddleware
{
    private readonly RuntimeProfile $runtimeProfile;

    public function __construct(
        private readonly ResponseFactoryInterface $responseFactory,
        private readonly LoggerInterface $logger,
        ?RuntimeProfile $runtimeProfile = null
    ) {
        $this->runtimeProfile = $runtimeProfile ?? RuntimeProfileResolver::resolve();
    }

    public function __invoke(
        ServerRequestInterface $request,
        Throwable $exception,
        bool $displayErrorDetails,
        bool $logErrors,
        bool $logErrorDetails
    ): ResponseInterface {
        $correlationId = TraceContext::resolveCorrelationId($request);
        $serverRequestId = TraceContext::resolveServerRequestId($request);
        $request = $request
            ->withAttribute('request_id', $correlationId)
            ->withAttribute('correlation_id', $correlationId)
            ->withAttribute('server_request_id', $serverRequestId);

        $path = $request->getUri()->getPath();
        $status = 500;
        $title = 'Internal Server Error';
        $type = ApiErrorType::Internal->value;
        $detail = $this->resolveServerDetail($exception, $displayErrorDetails, $status, $title);
        $guide = null;

        if ($exception instanceof CoreApiException) {
            $status = $exception->status;
            $title = $exception->title;
            $type = $exception->type->value;
            $detail = $this->resolveExceptionDetail($exception, $displayErrorDetails, $status, $title);
            $guide = $exception->guide;
        } elseif ($exception instanceof LegacyApiException) {
            $status = $exception->statusCode;
            $title = $exception->title;
            $type = $exception->type->value;
            $detail = $this->resolveExceptionDetail($exception, $displayErrorDetails, $status, $title);
        } elseif ($exception instanceof HttpException) {
            $status = $exception->getCode() > 0 ? $exception->getCode() : 500;
            $title = self::mapHttpTitle($status);
            $type = self::mapHttpType($status);
            $detail = $this->resolveExceptionDetail($exception, $displayErrorDetails, $status, $title);
        }

        $classification = ProblemDetailsHelper::classify($exception, $status, $type);
        if (!is_array($guide) || $guide === []) {
            $guide = is_array($classification['guide']) ? $classification['guide'] : self::defaultGuide($status);
        }

        $logContext = ErrorContextBuilder::fromRequest(
            $request,
            $exception,
            $this->runtimeProfile->logRequestPayload,
            $this->runtimeProfile->traceLimit
        );

        $this->logger->error('api_error', array_merge([
            'request_id' => $correlationId,
            'correlation_id' => $correlationId,
            'server_request_id' => $serverRequestId,
            'error_code' => $classification['error_code'],
            'error_category' => $classification['error_category'],
            'fault_domain' => $classification['fault_domain'],
            'owner' => $classification['owner'],
            'retryable' => $classification['retryable'],
            'user_actionable' => $classification['user_actionable'],
            'method' => $request->getMethod(),
            'path' => $path,
            'query' => $request->getUri()->getQuery(),
            'status' => $status,
            'duration_ms' => TraceContext::durationMs($request),
            'runtime_mode' => $this->runtimeProfile->mode->value,
            'runtime_source' => $this->runtimeProfile->source,
        ], $logContext));

        $payload = [
            'type' => $type,
            'status' => $status,
            'title' => $title,
            'detail' => $detail,
            'instance' => $path,
            'error_code' => $classification['error_code'],
            'error_category' => $classification['error_category'],
            'fault_domain' => $classification['fault_domain'],
            'owner' => $classification['owner'],
            'retryable' => $classification['retryable'],
            'user_actionable' => $classification['user_actionable'],
            'request_id' => $correlationId,
            'correlation_id' => $correlationId,
            'server_request_id' => $serverRequestId,
            'meta' => ProblemDetailsHelper::buildMeta(
                $correlationId,
                $serverRequestId,
                $classification
            ),
        ];
        $payload['meta']['runtime_mode'] = $this->runtimeProfile->mode->value;

        if (is_array($guide) && $guide !== []) {
            $payload['guide'] = $guide;
        }

        if ($this->runtimeProfile->isDev()) {
            $payload['debug'] = ErrorContextBuilder::debugPayloadFromRequest(
                $request,
                $exception,
                $this->runtimeProfile->logRequestPayload,
                $this->runtimeProfile->includeTraceInResponse,
                $this->runtimeProfile->traceLimit
            );
        }

        $response = $this->responseFactory->createResponse($status)
            ->withHeader('Content-Type', 'application/json; charset=utf-8');
        $response = TraceContext::applyResponseHeaders($response, $request);
        $response->getBody()->write((string)json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

        return $response;
    }

    public static function defaultLogger(string $logPath): LoggerInterface
    {
        return ApiLoggerFactory::create('api-error', $logPath, ApiLoggerFactory::envLevel('error'));
    }

    private static function mapHttpTitle(int $status): string
    {
        return match ($status) {
            400 => 'Bad Request',
            401 => 'Unauthorized',
            403 => 'Forbidden',
            404 => 'Not Found',
            405 => 'Method Not Allowed',
            429 => 'Too Many Requests',
            default => 'Internal Server Error',
        };
    }

    private static function mapHttpType(int $status): string
    {
        return match ($status) {
            400 => ApiErrorType::BadRequest->value,
            401 => ApiErrorType::Unauthorized->value,
            403 => ApiErrorType::Forbidden->value,
            404 => ApiErrorType::NotFound->value,
            405 => ApiErrorType::MethodNotAllowed->value,
            429 => ApiErrorType::TooManyRequests->value,
            default => ApiErrorType::Internal->value,
        };
    }

    private static function defaultGuide(int $status): ?array
    {
        return match ($status) {
            400, 422 => [
                'action' => '입력값과 요청 필드를 확인하세요.',
                'reason' => '서버가 현재 요청 데이터를 처리할 수 없습니다.',
            ],
            401 => [
                'action' => '다시 로그인하세요.',
                'reason' => '인증 정보가 없거나 만료되었습니다.',
            ],
            403 => [
                'action' => '관리자 권한을 확인하세요.',
                'reason' => '현재 계정에 필요한 권한이 없습니다.',
            ],
            404 => [
                'action' => '대상 리소스 존재 여부를 확인하세요.',
                'reason' => '요청한 리소스를 서버에서 찾지 못했습니다.',
            ],
            405 => [
                'action' => '허용된 HTTP 메서드인지 확인하세요.',
                'reason' => '현재 엔드포인트가 요청한 메서드를 지원하지 않습니다.',
            ],
            409 => [
                'action' => '중복 또는 현재 상태 충돌 여부를 확인하세요.',
                'reason' => '요청이 기존 데이터 또는 리소스 상태와 충돌합니다.',
            ],
            429 => [
                'action' => '잠시 후 다시 시도하세요.',
                'reason' => '요청 빈도가 허용 한도를 초과했습니다.',
            ],
            500 => [
                'action' => 'request_id와 요청 경로를 서버 로그에서 조회하세요.',
                'reason' => '서버에서 예외가 발생했습니다. 앱 입력보다 서버 구현 또는 데이터 상태 문제일 가능성이 큽니다.',
            ],
            503 => [
                'action' => '잠시 후 다시 시도하세요.',
                'reason' => '서버가 일시적으로 요청을 처리할 수 없습니다.',
            ],
            default => null,
        };
    }

    private function resolveExceptionDetail(
        Throwable $exception,
        bool $displayErrorDetails,
        int $status,
        string $title
    ): string {
        if ($status >= 500) {
            return $this->resolveServerDetail($exception, $displayErrorDetails, $status, $title);
        }

        if ($exception instanceof HttpException) {
            return $displayErrorDetails ? $exception->getMessage() : $title;
        }

        return $exception->getMessage();
    }

    private function resolveServerDetail(
        Throwable $exception,
        bool $displayErrorDetails,
        int $status,
        string $title
    ): string {
        if ($this->runtimeProfile->isDev() || $displayErrorDetails) {
            return $exception->getMessage();
        }

        return $status === 503 ? '서비스를 일시적으로 사용할 수 없습니다.' : '서버 내부 오류가 발생했습니다.';
    }
}
