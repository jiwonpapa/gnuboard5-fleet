<?php

declare(strict_types=1);

namespace Api\Auth\External\Controller;

use Api\Auth\External\Service\ExternalAuthService;
use Api\Auth\External\Service\ExternalAuthLinkManagementService;
use Api\Auth\External\Service\ExternalAuthTransitionService;
use Api\Support\Http\ApiResponse;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class ExternalAuthController
{
    public function __construct(
        private readonly ExternalAuthService $service,
        private readonly ExternalAuthLinkManagementService $linkManagementService,
        private readonly ExternalAuthTransitionService $transitionService
    ) {
    }

    public function listProviders(Request $request, Response $response): Response
    {
        return ApiResponse::envelope($response, [
            'providers' => $this->service->listProviders(),
        ], null, [], 200);
    }

    /**
     * @param array{provider:string} $args
     */
    public function start(Request $request, Response $response, array $args): Response
    {
        $body = ApiResponse::parseJsonBody($request);
        $result = $this->service->start((string)($args['provider'] ?? ''), $body);

        return ApiResponse::envelope($response, $result, null, [], 200);
    }

    /**
     * @param array{provider:string} $args
     */
    public function complete(Request $request, Response $response, array $args): Response
    {
        $body = ApiResponse::parseJsonBody($request);
        $result = $this->service->complete((string)($args['provider'] ?? ''), $body);

        return ApiResponse::envelope($response, $result, null, [], 200);
    }

    public function listMyLinks(Request $request, Response $response): Response
    {
        $member = (array)$request->getAttribute('auth_member', []);
        $result = $this->linkManagementService->listMine($member);

        return ApiResponse::envelope($response, [
            'links' => $result,
        ], null, [], 200);
    }

    /**
     * @param array{provider:string} $args
     */
    public function link(Request $request, Response $response, array $args): Response
    {
        $member = (array)$request->getAttribute('auth_member', []);
        $body = ApiResponse::parseJsonBody($request);
        $result = $this->linkManagementService->link(
            $member,
            (string)($args['provider'] ?? ''),
            $this->resolveTransitionToken($body)
        );

        return ApiResponse::envelope($response, $result, null, [], 200);
    }

    /**
     * @param array{provider:string} $args
     */
    public function createSession(Request $request, Response $response, array $args): Response
    {
        $body = ApiResponse::parseJsonBody($request);
        $result = $this->transitionService->createSession(
            (string)($args['provider'] ?? ''),
            $this->resolveTransitionToken($body),
            (string)($request->getServerParams()['REMOTE_ADDR'] ?? '')
        );

        return ApiResponse::envelope($response, $result, null, [], 200);
    }

    /**
     * @param array{provider:string} $args
     */
    public function claim(Request $request, Response $response, array $args): Response
    {
        $body = ApiResponse::parseJsonBody($request);
        $result = $this->transitionService->claimExistingMember(
            (string)($args['provider'] ?? ''),
            $this->resolveTransitionToken($body),
            (string)($body['mb_id'] ?? ''),
            (string)($body['mb_password'] ?? ''),
            (string)($request->getServerParams()['REMOTE_ADDR'] ?? '')
        );

        return ApiResponse::envelope($response, $result, null, [], 200);
    }

    /**
     * @param array{provider:string} $args
     */
    public function register(Request $request, Response $response, array $args): Response
    {
        $body = ApiResponse::parseJsonBody($request);
        $result = $this->transitionService->registerMember(
            (string)($args['provider'] ?? ''),
            $this->resolveTransitionToken($body),
            $body,
            (string)($request->getServerParams()['REMOTE_ADDR'] ?? '')
        );

        return ApiResponse::envelope($response, $result, null, [], 201);
    }

    /**
     * @param array{provider:string,provider_user_id:string} $args
     */
    public function unlink(Request $request, Response $response, array $args): Response
    {
        $member = (array)$request->getAttribute('auth_member', []);
        $result = $this->linkManagementService->unlink(
            $member,
            (string)($args['provider'] ?? ''),
            (string)($args['provider_user_id'] ?? '')
        );

        return ApiResponse::envelope($response, $result, null, [], 200);
    }

    /**
     * @param array<string, mixed> $body
     */
    private function resolveTransitionToken(array $body): string
    {
        return (string)($body['transition_token'] ?? $body['link_token'] ?? '');
    }
}
