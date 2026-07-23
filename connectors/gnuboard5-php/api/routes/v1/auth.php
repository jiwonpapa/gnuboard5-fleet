<?php

declare(strict_types=1);

use Api\Auth\Controller\AuthController;
use Api\Auth\External\Controller\ExternalAuthController;
use Api\Core\Config\EnvConfig;
use Api\Middlewares\JwtAuthMiddleware;
use Api\Support\Http\ApiResponse;
use Psr\Http\Message\ResponseInterface as ResponseInterface;
use Psr\Http\Message\ServerRequestInterface as RequestInterface;
use Slim\Routing\RouteCollectorProxy;

return function (
    RouteCollectorProxy $app,
    callable $resolve
): void {
    $createAuthController = static fn (): AuthController => $resolve(AuthController::class);
    $createExternalAuthController = static fn (): ExternalAuthController => $resolve(ExternalAuthController::class);
    $createEnvConfig = static fn (): EnvConfig => $resolve(EnvConfig::class);
    $createJwtAuthMiddleware = static fn (): JwtAuthMiddleware => $resolve(JwtAuthMiddleware::class);
    /** @var \Closure(array): array{provider:string} $resolveProviderArgs */
    $resolveProviderArgs = static fn (array $args): array => [
        'provider' => (string)($args['provider'] ?? ''),
    ];
    /** @var \Closure(array): array{provider:string, provider_user_id:string} $resolveProviderLinkArgs */
    $resolveProviderLinkArgs = static fn (array $args): array => [
        'provider' => (string)($args['provider'] ?? ''),
        'provider_user_id' => (string)($args['provider_user_id'] ?? ''),
    ];

    $app->get('/auth/external/providers', function (RequestInterface $request, ResponseInterface $response) use ($createExternalAuthController) {
        $controller = $createExternalAuthController();
        return $controller->listProviders($request, $response);
    });

    $app->post('/auth/external/{provider}/start', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createExternalAuthController, $resolveProviderArgs) {
        $controller = $createExternalAuthController();
        return $controller->start($request, $response, $resolveProviderArgs($args));
    });

    $app->post('/auth/external/{provider}/complete', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createExternalAuthController, $resolveProviderArgs) {
        $controller = $createExternalAuthController();
        return $controller->complete($request, $response, $resolveProviderArgs($args));
    });

    $app->post('/auth/external/{provider}/sessions', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createExternalAuthController, $resolveProviderArgs) {
        $controller = $createExternalAuthController();
        return $controller->createSession($request, $response, $resolveProviderArgs($args));
    });

    $app->post('/auth/external/{provider}/claims', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createExternalAuthController, $resolveProviderArgs) {
        $controller = $createExternalAuthController();
        return $controller->claim($request, $response, $resolveProviderArgs($args));
    });

    $app->post('/auth/external/{provider}/registrations', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createExternalAuthController, $resolveProviderArgs) {
        $controller = $createExternalAuthController();
        return $controller->register($request, $response, $resolveProviderArgs($args));
    });

    $app->get('/auth/external/links', function (RequestInterface $request, ResponseInterface $response) use ($createExternalAuthController) {
        $controller = $createExternalAuthController();
        return $controller->listMyLinks($request, $response);
    })->add($createJwtAuthMiddleware());

    $app->post('/auth/external/{provider}/links', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createExternalAuthController, $resolveProviderArgs) {
        $controller = $createExternalAuthController();
        return $controller->link($request, $response, $resolveProviderArgs($args));
    })->add($createJwtAuthMiddleware());

    $app->delete('/auth/external/{provider}/links/{provider_user_id}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createExternalAuthController, $resolveProviderLinkArgs) {
        $controller = $createExternalAuthController();
        return $controller->unlink($request, $response, $resolveProviderLinkArgs($args));
    })->add($createJwtAuthMiddleware());

    $app->get('/auth/availability/member-id', function (RequestInterface $request, ResponseInterface $response) use ($createAuthController) {
        $controller = $createAuthController();
        return $controller->checkMemberIdAvailability($request, $response);
    });

    $app->get('/auth/availability/nick', function (RequestInterface $request, ResponseInterface $response) use ($createAuthController) {
        $controller = $createAuthController();
        return $controller->checkNickAvailability($request, $response);
    });

    $app->get('/auth/availability/email', function (RequestInterface $request, ResponseInterface $response) use ($createAuthController) {
        $controller = $createAuthController();
        return $controller->checkEmailAvailability($request, $response);
    });

    $app->get('/auth/availability/phone', function (RequestInterface $request, ResponseInterface $response) use ($createAuthController) {
        $controller = $createAuthController();
        return $controller->checkPhoneAvailability($request, $response);
    });

    $app->get('/auth/availability/recommender', function (RequestInterface $request, ResponseInterface $response) use ($createAuthController) {
        $controller = $createAuthController();
        return $controller->checkRecommenderAvailability($request, $response);
    });

    $app->post('/auth/login', function (RequestInterface $request, ResponseInterface $response) use ($createAuthController) {
        $controller = $createAuthController();
        return $controller->login($request, $response);
    });

    $app->post('/auth/register', function (RequestInterface $request, ResponseInterface $response) use ($createAuthController) {
        $controller = $createAuthController();
        return $controller->register($request, $response);
    });

    $app->post('/auth/refresh', function (RequestInterface $request, ResponseInterface $response) use ($createAuthController) {
        $controller = $createAuthController();
        return $controller->refresh($request, $response);
    });

    $app->post('/auth/logout', function (RequestInterface $request, ResponseInterface $response) use ($createAuthController) {
        $controller = $createAuthController();
        return $controller->logout($request, $response);
    })->add($createJwtAuthMiddleware());

    $app->post('/auth/password/reset/request', function (RequestInterface $request, ResponseInterface $response) use ($createAuthController) {
        $controller = $createAuthController();
        return $controller->requestPasswordReset($request, $response);
    });

    $app->post('/auth/password-reset-requests', function (RequestInterface $request, ResponseInterface $response) use ($createAuthController) {
        $controller = $createAuthController();
        return $controller->requestPasswordReset($request, $response);
    });

    $app->post('/auth/password/reset/confirm', function (RequestInterface $request, ResponseInterface $response) use ($createAuthController) {
        $controller = $createAuthController();
        return $controller->confirmPasswordReset($request, $response);
    });

    $app->post('/auth/password-resets', function (RequestInterface $request, ResponseInterface $response) use ($createAuthController) {
        $controller = $createAuthController();
        return $controller->confirmPasswordReset($request, $response);
    });

    $app->post('/auth/email/verify/request', function (RequestInterface $request, ResponseInterface $response) use ($createAuthController) {
        $controller = $createAuthController();
        return $controller->requestEmailVerify($request, $response);
    })->add($createJwtAuthMiddleware());

    $app->post('/auth/email-reverification-requests', function (RequestInterface $request, ResponseInterface $response) use ($createAuthController) {
        $controller = $createAuthController();
        return $controller->requestEmailReverify($request, $response);
    });

    $app->post('/auth/email-verification-requests', function (RequestInterface $request, ResponseInterface $response) use ($createAuthController) {
        $controller = $createAuthController();
        return $controller->requestEmailVerify($request, $response);
    })->add($createJwtAuthMiddleware());

    $app->post('/auth/email/verify/confirm', function (RequestInterface $request, ResponseInterface $response) use ($createAuthController) {
        $controller = $createAuthController();
        return $controller->confirmEmailVerify($request, $response);
    });

    $app->post('/auth/email-verifications', function (RequestInterface $request, ResponseInterface $response) use ($createAuthController) {
        $controller = $createAuthController();
        return $controller->confirmEmailVerify($request, $response);
    });

    $app->get('/health', function (RequestInterface $request, ResponseInterface $response) use ($createEnvConfig) {
        return ApiResponse::json($response, [
            'status' => 'ok',
            'version' => '1.0.0',
            'timestamp' => time(),
            'g5_independent' => $createEnvConfig()->g5Independent,
            'meta' => ApiResponse::meta(),
        ]);
    });
};
