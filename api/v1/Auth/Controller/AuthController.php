<?php

/**
 * AuthController API 모듈 정의.
 *
 * @package  Gnuboard5\Api\v1\Auth\Controller
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Auth\Controller;

use Api\Auth\Service\AuthService;
use Api\Auth\Service\Support\AuthSessionRequestNormalizer;
use Api\Support\Exception\ApiException;
use Api\Support\Http\ApiResponse;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class AuthController
{
    private readonly AuthSessionRequestNormalizer $sessionRequestNormalizer;

    public function __construct(
        private readonly AuthService $authService,
        ?AuthSessionRequestNormalizer $sessionRequestNormalizer = null,
    ) {
        $this->sessionRequestNormalizer = $sessionRequestNormalizer ?? new AuthSessionRequestNormalizer();
    }

    public function login(Request $request, Response $response): Response
    {
        $body = ApiResponse::parseJsonBody($request);
        $input = $this->sessionRequestNormalizer->login($body);
        $result = $this->authService->login(
            $input['mb_id'],
            $input['mb_password'],
            (string)($request->getServerParams()['REMOTE_ADDR'] ?? '')
        );

        return ApiResponse::envelope($response, $result, null, [], 200);
    }

    public function checkMemberIdAvailability(Request $request, Response $response): Response
    {
        return $this->availabilityResponse(
            $request,
            $response,
            fn (string $value): array => $this->authService->checkMemberIdAvailability($value)
        );
    }

    public function checkNickAvailability(Request $request, Response $response): Response
    {
        return $this->availabilityResponse(
            $request,
            $response,
            fn (string $value): array => $this->authService->checkNickAvailability($value)
        );
    }

    public function checkEmailAvailability(Request $request, Response $response): Response
    {
        return $this->availabilityResponse(
            $request,
            $response,
            fn (string $value): array => $this->authService->checkEmailAvailability($value)
        );
    }

    public function checkPhoneAvailability(Request $request, Response $response): Response
    {
        return $this->availabilityResponse(
            $request,
            $response,
            fn (string $value): array => $this->authService->checkPhoneAvailability($value)
        );
    }

    public function checkRecommenderAvailability(Request $request, Response $response): Response
    {
        return $this->availabilityResponse(
            $request,
            $response,
            fn (string $value): array => $this->authService->checkRecommenderAvailability($value)
        );
    }

    public function register(Request $request, Response $response): Response
    {
        $body = ApiResponse::parseJsonBody($request);
        $body['mb_ip'] = (string)($request->getServerParams()['REMOTE_ADDR'] ?? '');
        $result = $this->authService->register($body);

        return ApiResponse::envelope($response, $result, null, [], 201);
    }

    public function refresh(Request $request, Response $response): Response
    {
        $body = ApiResponse::parseJsonBody($request);
        $token = $this->sessionRequestNormalizer->refresh($body);

        $result = $this->authService->refresh($token);
        return ApiResponse::envelope($response, $result, null, [], 200);
    }

    public function logout(Request $request, Response $response): Response
    {
        $member = (array)$request->getAttribute('auth_member', []);
        $payload = (array)$request->getAttribute('auth_payload', []);
        $body = ApiResponse::parseJsonBody($request);
        $refreshToken = $this->sessionRequestNormalizer->logout($body);

        $result = $this->authService->logout($member, $payload, $refreshToken);

        return ApiResponse::envelope($response, $result, null, [], 200);
    }

    public function requestPasswordReset(Request $request, Response $response): Response
    {
        $body = ApiResponse::parseJsonBody($request);
        $email = (string)($body['mb_email'] ?? '');
        $memberId = isset($body['mb_id']) ? (string)$body['mb_id'] : null;
        $result = $this->authService->requestPasswordReset($email, $memberId);

        return ApiResponse::envelope($response, $result, null, [], 200);
    }

    public function confirmPasswordReset(Request $request, Response $response): Response
    {
        $body = ApiResponse::parseJsonBody($request);
        $memberId = (string)($body['mb_id'] ?? '');
        $resetToken = (string)($body['reset_token'] ?? '');
        $newPassword = (string)($body['new_password'] ?? '');
        if ($resetToken === '' || $newPassword === '') {
            throw ApiException::badRequest('reset_token과 new_password는 필수입니다.');
        }

        $this->authService->confirmPasswordReset($memberId, $resetToken, $newPassword);

        return ApiResponse::envelope($response, ['password_reset' => true], null, [], 200);
    }

    public function requestEmailVerify(Request $request, Response $response): Response
    {
        $member = (array)$request->getAttribute('auth_member', []);
        $body = ApiResponse::parseJsonBody($request);
        $email = isset($body['mb_email']) ? (string)$body['mb_email'] : null;

        $result = $this->authService->requestEmailVerification($member, $email);

        return ApiResponse::envelope($response, $result, null, [], 200);
    }

    public function requestEmailReverify(Request $request, Response $response): Response
    {
        $body = ApiResponse::parseJsonBody($request);
        $memberId = (string)($body['mb_id'] ?? '');
        $password = (string)($body['mb_password'] ?? '');
        $email = isset($body['mb_email']) ? (string)$body['mb_email'] : null;
        $result = $this->authService->requestEmailReverification($memberId, $password, $email);

        return ApiResponse::envelope($response, $result, null, [], 200);
    }

    public function confirmEmailVerify(Request $request, Response $response): Response
    {
        $body = ApiResponse::parseJsonBody($request);
        $memberId = (string)($body['mb_id'] ?? '');
        $verifyToken = (string)($body['verify_token'] ?? '');
        if ($verifyToken === '') {
            throw ApiException::badRequest('verify_token이 필요합니다.');
        }

        $this->authService->confirmEmailVerification($memberId, $verifyToken);

        return ApiResponse::envelope($response, ['email_verified' => true], null, [], 200);
    }

    /**
     * @param callable(string):array<string,mixed> $resolver
     */
    private function availabilityResponse(Request $request, Response $response, callable $resolver): Response
    {
        $value = (string)(($request->getQueryParams())['value'] ?? '');
        $result = $resolver($value);

        return ApiResponse::envelope($response, $result, null, [], 200);
    }
}
