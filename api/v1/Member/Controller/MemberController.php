<?php

/**
 * MemberController API 모듈 정의.
 *
 * @package  Gnuboard5\Api\v1\Member\Controller
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Member\Controller;

use Api\Member\Service\MemberService;
use Api\Support\Http\ApiResponse;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\UploadedFileInterface;

final class MemberController
{
    public function __construct(private readonly MemberService $memberService)
    {
    }

    public function me(Request $request, Response $response): Response
    {
        $member = (array)$request->getAttribute('auth_member', []);
        $profile = $this->memberService->getMyProfile($member);

        return ApiResponse::envelope($response, $profile);
    }

    public function updateMe(Request $request, Response $response): Response
    {
        $member = (array)$request->getAttribute('auth_member', []);
        $payload = ApiResponse::parseJsonBody($request);
        $profile = $this->memberService->updateMyProfile($member, $payload);

        return ApiResponse::envelope($response, $profile);
    }

    public function getPublicProfile(Request $request, Response $response, array $args): Response
    {
        $viewer = (array)$request->getAttribute('auth_member', []);
        $mbId = (string)($args['mb_id'] ?? '');
        $profile = $this->memberService->getPublicProfile($mbId, $viewer);

        return ApiResponse::envelope($response, $profile);
    }

    public function withdraw(Request $request, Response $response): Response
    {
        $member = (array)$request->getAttribute('auth_member', []);
        $payload = ApiResponse::parseJsonBody($request);
        $result = $this->memberService->withdraw($member, (string)($payload['mb_password'] ?? ''));

        return ApiResponse::envelope($response, $result, null, [], 200);
    }

    public function uploadMyIcon(Request $request, Response $response): Response
    {
        $member = (array)$request->getAttribute('auth_member', []);
        $uploadedFile = $this->pickUploadedFile($request, ['icon', 'mb_icon', 'file']);
        $result = $this->memberService->uploadMyIcon($member, $uploadedFile);

        return ApiResponse::envelope($response, $result);
    }

    public function deleteMyIcon(Request $request, Response $response): Response
    {
        $member = (array)$request->getAttribute('auth_member', []);
        $result = $this->memberService->deleteMyIcon($member);

        return ApiResponse::envelope($response, $result);
    }

    public function uploadMyImage(Request $request, Response $response): Response
    {
        $member = (array)$request->getAttribute('auth_member', []);
        $uploadedFile = $this->pickUploadedFile($request, ['image', 'mb_img', 'file']);
        $result = $this->memberService->uploadMyImage($member, $uploadedFile);

        return ApiResponse::envelope($response, $result);
    }

    public function deleteMyImage(Request $request, Response $response): Response
    {
        $member = (array)$request->getAttribute('auth_member', []);
        $result = $this->memberService->deleteMyImage($member);

        return ApiResponse::envelope($response, $result);
    }

    /**
     * @param array<int, string> $candidates
     */
    private function pickUploadedFile(Request $request, array $candidates): ?UploadedFileInterface
    {
        $uploadedFiles = $request->getUploadedFiles();
        foreach ($candidates as $key) {
            if (!array_key_exists($key, $uploadedFiles)) {
                continue;
            }

            $candidate = $uploadedFiles[$key];
            if ($candidate instanceof UploadedFileInterface) {
                return $candidate;
            }
            if (is_array($candidate) && isset($candidate[0]) && $candidate[0] instanceof UploadedFileInterface) {
                return $candidate[0];
            }
        }

        return null;
    }
}
