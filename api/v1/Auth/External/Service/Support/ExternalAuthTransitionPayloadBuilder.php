<?php

declare(strict_types=1);

namespace Api\Auth\External\Service\Support;

use Api\Support\Exception\ApiException;

final class ExternalAuthTransitionPayloadBuilder
{
    /**
     * @param array<string, mixed> $memberInput
     * @param array{
     *     provider:string,
     *     flow:string,
     *     provider_user_id:string,
     *     provider_email:string,
     *     provider_profile:array<string, mixed>
     * } $transition
     * @return array<string, mixed>
     */
    public function buildRegistrationPayload(array $memberInput, array $transition, string $ipAddress): array
    {
        $payload = $memberInput;
        $providerEmail = trim((string)($transition['provider_email'] ?? ''));
        $providerDisplayName = trim((string)($transition['provider_profile']['display_name'] ?? ''));

        if (!array_key_exists('mb_email', $payload) || trim((string)$payload['mb_email']) === '') {
            $payload['mb_email'] = $providerEmail;
        }

        if (!array_key_exists('mb_name', $payload) || trim((string)$payload['mb_name']) === '') {
            $payload['mb_name'] = $providerDisplayName;
        }

        $payload['mb_ip'] = trim($ipAddress);

        if (trim((string)($payload['mb_email'] ?? '')) === '') {
            throw ApiException::badRequest('mb_email이 필요합니다. 공급자 이메일이 없으면 직접 입력해야 합니다.');
        }

        if (trim((string)($payload['mb_name'] ?? '')) === '') {
            throw ApiException::badRequest('mb_name이 필요합니다. 공급자 표시 이름이 없으면 직접 입력해야 합니다.');
        }

        return $payload;
    }

    /**
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    public function serializeLink(array $row): array
    {
        $profile = null;
        $rawProfile = $row['provider_profile_json'] ?? null;
        if (is_string($rawProfile) && trim($rawProfile) !== '') {
            $decoded = json_decode($rawProfile, true);
            if (is_array($decoded)) {
                $profile = $decoded;
            }
        }

        return [
            'link_id' => (int)($row['link_id'] ?? 0),
            'provider' => (string)($row['provider'] ?? ''),
            'provider_user_id' => (string)($row['provider_user_id'] ?? ''),
            'mb_id' => (string)($row['mb_id'] ?? ''),
            'provider_email' => (string)($row['provider_email'] ?? ''),
            'provider_profile' => $profile,
            'linked_at' => (string)($row['linked_at'] ?? ''),
            'updated_at' => (string)($row['updated_at'] ?? ''),
        ];
    }
}
