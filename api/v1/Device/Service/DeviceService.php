<?php

/**
 * DeviceService API module.
 *
 * @package  Gnuboard5\Api\v1\Device\Service
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Device\Service;

use Api\Core\Enum\DevicePlatform;
use Api\Core\Util\G5DateTime;
use Api\Device\Repository\DeviceRepository;
use Api\Support\Exception\ApiException;

final class DeviceService
{
    public function __construct(private readonly DeviceRepository $repository)
    {
    }

    public function register(array $member, array $payload): array
    {
        $memberId = trim((string)($member['mb_id'] ?? ''));
        if ($memberId === '') {
            throw ApiException::unauthorized('인증 토큰이 필요합니다.');
        }

        $token = trim((string)($payload['token'] ?? ''));
        $platformValue = strtolower(trim((string)($payload['platform'] ?? '')));
        if ($token === '') {
            throw ApiException::badRequest('token은 필수입니다.');
        }
        if (strlen($token) > 512) {
            throw ApiException::badRequest('token 길이가 너무 깁니다.');
        }
        $platform = DevicePlatform::tryFrom($platformValue);
        if (!$platform instanceof DevicePlatform) {
            throw ApiException::badRequest('platform은 fcm 또는 apns만 허용됩니다.');
        }

        $saved = $this->repository->register($memberId, $token, $platform->value, G5DateTime::now());

        return [
            'pd_id' => (int)($saved['pd_id'] ?? 0),
            'mb_id' => (string)($saved['mb_id'] ?? $memberId),
            'pd_token' => (string)($saved['pd_token'] ?? $token),
            'pd_platform' => (string)($saved['pd_platform'] ?? $platform->value),
            'pd_active' => (int)($saved['pd_active'] ?? 1),
            'pd_datetime' => (string)($saved['pd_datetime'] ?? G5DateTime::now()),
        ];
    }

    public function unregister(array $member, string $token): void
    {
        $memberId = trim((string)($member['mb_id'] ?? ''));
        if ($memberId === '') {
            throw ApiException::unauthorized('인증 토큰이 필요합니다.');
        }

        $normalizedToken = trim($token);
        if ($normalizedToken === '') {
            throw ApiException::badRequest('token은 필수입니다.');
        }

        $affected = $this->repository->deactivate($memberId, $normalizedToken, G5DateTime::now());
        if ($affected < 1) {
            throw ApiException::notFound('등록된 디바이스 토큰이 없습니다.');
        }
    }
}
