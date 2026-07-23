<?php

/**
 * AdminSystemController API module.
 *
 * @package  Gnuboard5\Api\v1\Admin\System\Controller
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Admin\System\Controller;

use Api\Admin\System\Service\AdminSystemService;
use Api\Support\Http\ApiResponse;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class AdminSystemController
{
    public function __construct(private readonly AdminSystemService $service)
    {
    }

    public function listAuth(Request $request, Response $response): Response
    {
        $result = $this->service->listAuth($request->getQueryParams());

        return ApiResponse::envelope($response, $result['items'], $result['pagination']);
    }

    public function saveAuth(Request $request, Response $response): Response
    {
        $payload = ApiResponse::parseJsonBody($request);
        $saved = $this->service->saveAuth($payload);

        return ApiResponse::envelope($response, $saved);
    }

    public function deleteAuth(Request $request, Response $response, array $args): Response
    {
        $this->service->deleteAuth((string)($args['mb_id'] ?? ''), (string)($args['au_menu'] ?? ''));

        return $response->withStatus(204);
    }

    public function listPopups(Request $request, Response $response): Response
    {
        $result = $this->service->listPopups($request->getQueryParams());

        return ApiResponse::envelope($response, $result['items'], $result['pagination']);
    }

    public function detailPopup(Request $request, Response $response, array $args): Response
    {
        $popup = $this->service->detailPopup((int)($args['nw_id'] ?? 0));

        return ApiResponse::envelope($response, $popup);
    }

    public function createPopup(Request $request, Response $response): Response
    {
        $payload = ApiResponse::parseJsonBody($request);
        $created = $this->service->createPopup($payload);

        return ApiResponse::envelope($response, $created, null, [], 201)
            ->withHeader('Location', '/api/v1/admin/system/popups/' . (int)($created['nw_id'] ?? 0));
    }

    public function updatePopup(Request $request, Response $response, array $args): Response
    {
        $payload = ApiResponse::parseJsonBody($request);
        $updated = $this->service->updatePopup((int)($args['nw_id'] ?? 0), $payload);

        return ApiResponse::envelope($response, $updated);
    }

    public function deletePopup(Request $request, Response $response, array $args): Response
    {
        $this->service->deletePopup((int)($args['nw_id'] ?? 0));

        return $response->withStatus(204);
    }

    public function listPolls(Request $request, Response $response): Response
    {
        $result = $this->service->listPolls($request->getQueryParams());

        return ApiResponse::envelope($response, $result['items'], $result['pagination']);
    }

    public function detailPoll(Request $request, Response $response, array $args): Response
    {
        $poll = $this->service->detailPoll((int)($args['po_id'] ?? 0));

        return ApiResponse::envelope($response, $poll);
    }

    public function createPoll(Request $request, Response $response): Response
    {
        $payload = ApiResponse::parseJsonBody($request);
        $created = $this->service->createPoll($payload);

        return ApiResponse::envelope($response, $created, null, [], 201)
            ->withHeader('Location', '/api/v1/admin/system/polls/' . (int)($created['po_id'] ?? 0));
    }

    public function updatePoll(Request $request, Response $response, array $args): Response
    {
        $payload = ApiResponse::parseJsonBody($request);
        $updated = $this->service->updatePoll((int)($args['po_id'] ?? 0), $payload);

        return ApiResponse::envelope($response, $updated);
    }

    public function deletePoll(Request $request, Response $response, array $args): Response
    {
        $this->service->deletePoll((int)($args['po_id'] ?? 0));

        return $response->withStatus(204);
    }

    public function getQaConfig(Request $request, Response $response): Response
    {
        $config = $this->service->getQaConfig();

        return ApiResponse::envelope($response, $config);
    }

    public function updateQaConfig(Request $request, Response $response): Response
    {
        $payload = ApiResponse::parseJsonBody($request);
        $updated = $this->service->updateQaConfig($payload);

        return ApiResponse::envelope($response, $updated);
    }

    public function getTheme(Request $request, Response $response): Response
    {
        $member = (array)$request->getAttribute('auth_member', []);
        $theme = $this->service->getTheme($member);

        return ApiResponse::envelope($response, $theme);
    }

    public function updateTheme(Request $request, Response $response): Response
    {
        $member = (array)$request->getAttribute('auth_member', []);
        $payload = ApiResponse::parseJsonBody($request);
        $updated = $this->service->updateTheme($member, $payload);

        return ApiResponse::envelope($response, $updated);
    }

    public function listThemes(Request $request, Response $response): Response
    {
        $member = (array)$request->getAttribute('auth_member', []);
        $result = $this->service->listThemes($member);

        return ApiResponse::envelope($response, $result['items'], null, ['total' => $result['total']]);
    }

    public function detailTheme(Request $request, Response $response, array $args): Response
    {
        $member = (array)$request->getAttribute('auth_member', []);
        $theme = $this->service->detailTheme($member, (string)($args['theme'] ?? ''));

        return ApiResponse::envelope($response, $theme);
    }

    public function listMails(Request $request, Response $response): Response
    {
        $result = $this->service->listMails($request->getQueryParams());

        return ApiResponse::envelope($response, $result['items'], $result['pagination']);
    }

    public function listMailRecipients(Request $request, Response $response): Response
    {
        $result = $this->service->listMailRecipients($request->getQueryParams());

        return ApiResponse::envelope($response, $result['items'], $result['pagination']);
    }

    public function sendMailTest(Request $request, Response $response): Response
    {
        $payload = ApiResponse::parseJsonBody($request);
        $result = $this->service->sendMailTest(
            $payload,
            (string)($request->getServerParams()['REMOTE_ADDR'] ?? '')
        );

        return ApiResponse::envelope($response, $result);
    }

    public function sendMemberMail(Request $request, Response $response): Response
    {
        $payload = ApiResponse::parseJsonBody($request);
        $result = $this->service->sendMemberMail(
            $payload,
            (string)($request->getServerParams()['REMOTE_ADDR'] ?? '')
        );

        return ApiResponse::envelope($response, $result);
    }

    public function phpInfo(Request $request, Response $response): Response
    {
        $member = (array)$request->getAttribute('auth_member', []);
        $result = $this->service->phpInfo($member);

        return ApiResponse::envelope($response, $result);
    }

    public function purgeSessionFiles(Request $request, Response $response): Response
    {
        $member = (array)$request->getAttribute('auth_member', []);
        $result = $this->service->purgeSessionFiles($member);

        return ApiResponse::envelope($response, $result);
    }

    public function purgeCacheFiles(Request $request, Response $response): Response
    {
        $member = (array)$request->getAttribute('auth_member', []);
        $result = $this->service->purgeCacheFiles($member);

        return ApiResponse::envelope($response, $result);
    }

    public function purgeCaptchaFiles(Request $request, Response $response): Response
    {
        $member = (array)$request->getAttribute('auth_member', []);
        $result = $this->service->purgeCaptchaFiles($member);

        return ApiResponse::envelope($response, $result);
    }

    public function purgeThumbnailFiles(Request $request, Response $response): Response
    {
        $member = (array)$request->getAttribute('auth_member', []);
        $result = $this->service->purgeThumbnailFiles($member);

        return ApiResponse::envelope($response, $result);
    }

    public function purgeMemberListFiles(Request $request, Response $response): Response
    {
        $member = (array)$request->getAttribute('auth_member', []);
        $result = $this->service->purgeMemberListFiles($member);

        return ApiResponse::envelope($response, $result);
    }

    public function browscapStatus(Request $request, Response $response): Response
    {
        $member = (array)$request->getAttribute('auth_member', []);
        $result = $this->service->browscapStatus($member);

        return ApiResponse::envelope($response, $result);
    }

    public function updateBrowscap(Request $request, Response $response): Response
    {
        $member = (array)$request->getAttribute('auth_member', []);
        $result = $this->service->updateBrowscap($member);

        return ApiResponse::envelope($response, $result);
    }

    public function convertBrowscap(Request $request, Response $response): Response
    {
        $member = (array)$request->getAttribute('auth_member', []);
        $payload = array_merge($request->getQueryParams(), ApiResponse::parseJsonBody($request));
        $result = $this->service->convertBrowscap($member, $payload);

        return ApiResponse::envelope($response, $result);
    }
}
