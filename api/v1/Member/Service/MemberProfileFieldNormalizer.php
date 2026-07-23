<?php

/**
 * MemberProfileFieldNormalizer API module.
 *
 * @package  Gnuboard5\Api\v1\Member\Service
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Member\Service;

use Api\Integration\Contracts\MemberGateway;
use Api\Member\Service\Support\MemberProfileFieldPolicy;
use Api\Member\Service\Support\MemberProfileValueNormalizer;
use Api\Support\Exception\ApiException;

final class MemberProfileFieldNormalizer
{
    private ?MemberProfileFieldPolicy $resolvedFieldPolicy = null;
    private ?MemberProfileValueNormalizer $resolvedValueNormalizer = null;

    public function __construct(
        private readonly MemberGateway $memberRepository,
        ?MemberProfileFieldPolicy $fieldPolicy = null,
        ?MemberProfileValueNormalizer $valueNormalizer = null
    ) {
        $this->resolvedFieldPolicy = $fieldPolicy;
        $this->resolvedValueNormalizer = $valueNormalizer;
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function validatePayloadKeys(array $payload): void
    {
        $this->fieldPolicy()->validatePayloadKeys($payload);
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function normalizeUpdates(array $payload, string $memberId): array
    {
        $updates = [];
        foreach ($this->fieldPolicy()->allowedUpdateFields() as $field) {
            if (!array_key_exists($field, $payload)) {
                continue;
            }
            $updates = array_merge(
                $updates,
                $this->normalizeUpdateField($field, (string)$payload[$field], $payload, $memberId)
            );
        }

        return $updates;
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    private function normalizeUpdateField(string $field, string $value, array $payload, string $memberId): array
    {
        return match ($field) {
            'mb_password' => $this->normalizePasswordUpdate($value),
            'mb_nick' => $this->normalizeNickUpdate($value, $memberId),
            'mb_email' => $this->normalizeEmailUpdate($value, $memberId),
            'mb_hp' => $this->normalizePhoneUpdate($value, $memberId),
            'mb_homepage', 'mb_addr1', 'mb_addr2', 'mb_addr3', 'mb_tel' => [
                $field => $this->valueNormalizer()->sanitizeSingleLine($value),
            ],
            'mb_addr_jibeon' => [$field => $this->valueNormalizer()->normalizeJibeon($value)],
            'mb_signature', 'mb_profile', 'mb_1', 'mb_2', 'mb_3', 'mb_4', 'mb_5', 'mb_6', 'mb_7', 'mb_8', 'mb_9', 'mb_10' => [
                $field => $this->valueNormalizer()->sanitizeMultiline($value),
            ],
            'mb_zip' => $this->valueNormalizer()->normalizeZipUpdate($value),
            'mb_zip1' => ['mb_zip1' => $this->valueNormalizer()->normalizeZipSegment(trim($value))],
            'mb_zip2' => ['mb_zip2' => $this->valueNormalizer()->normalizeZipSegment(trim($value))],
            'mb_mailling', 'mb_sms', 'mb_marketing_agree', 'mb_thirdparty_agree', 'mb_open' => [
                $field => $this->valueNormalizer()->normalizeBoolFlag($payload[$field] ?? null),
            ],
            default => [],
        };
    }

    /**
     * @return array{mb_password:string}
     */
    private function normalizePasswordUpdate(string $value): array
    {
        $trimmed = trim($value);
        $this->memberRepository->validatePassword($trimmed);

        return ['mb_password' => $this->memberRepository->hashPassword($trimmed)];
    }

    /**
     * @return array{mb_nick:string}
     */
    private function normalizeNickUpdate(string $value, string $memberId): array
    {
        $normalized = $this->valueNormalizer()->sanitizeSingleLine($value);
        $this->memberRepository->validateNicknameForUpdate($normalized, $memberId);

        return ['mb_nick' => $normalized];
    }

    /**
     * @return array{mb_email:string}
     */
    private function normalizeEmailUpdate(string $value, string $memberId): array
    {
        $normalized = $this->valueNormalizer()->sanitizeSingleLine($value);
        $this->memberRepository->validateEmailForUpdate($normalized, $memberId);

        return ['mb_email' => $normalized];
    }

    /**
     * @return array{mb_hp:string}
     */
    private function normalizePhoneUpdate(string $value, string $memberId): array
    {
        $normalized = $this->valueNormalizer()->normalizePhone($value);
        $this->memberRepository->validatePhoneForUpdate($normalized, $memberId);

        return ['mb_hp' => $normalized];
    }

    private function fieldPolicy(): MemberProfileFieldPolicy
    {
        if ($this->resolvedFieldPolicy instanceof MemberProfileFieldPolicy) {
            return $this->resolvedFieldPolicy;
        }

        $this->resolvedFieldPolicy = new MemberProfileFieldPolicy();

        return $this->resolvedFieldPolicy;
    }

    private function valueNormalizer(): MemberProfileValueNormalizer
    {
        if ($this->resolvedValueNormalizer instanceof MemberProfileValueNormalizer) {
            return $this->resolvedValueNormalizer;
        }

        $this->resolvedValueNormalizer = new MemberProfileValueNormalizer();

        return $this->resolvedValueNormalizer;
    }
}
