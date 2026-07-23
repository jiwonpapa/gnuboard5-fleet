<?php

declare(strict_types=1);

namespace Api\Auth\External\Service\Support;

use Api\Support\Exception\ApiException;

final readonly class ExternalAuthStateResolver
{
    public function __construct(private ExternalAuthInputValueNormalizer $valueNormalizer)
    {
    }

    public function resolveStartState(string $state): string
    {
        $normalized = trim($state);
        if ($normalized !== '') {
            return $normalized;
        }

        return bin2hex(random_bytes(12));
    }

    /**
     * @param array<string, mixed> $input
     * @param array<string, mixed> $payload
     * @param array<string, mixed> $claims
     * @return array{state:string, expected_state:string}
     */
    public function resolveCompleteState(array $input, array $payload, array $claims): array
    {
        $bodyState = $this->valueNormalizer->normalizeOptionalString($input['state'] ?? null);
        $payloadState = $this->valueNormalizer->normalizeOptionalString($payload['state'] ?? null);
        $state = $bodyState !== null && $bodyState !== '' ? $bodyState : ($payloadState ?? '');
        $expectedState = trim((string)($claims['state'] ?? ''));

        if ($state !== '' && $expectedState !== '' && !hash_equals($expectedState, $state)) {
            throw ApiException::unauthorized('외부 인증 state 검증에 실패했습니다.');
        }

        return [
            'state' => $state,
            'expected_state' => $expectedState,
        ];
    }
}
