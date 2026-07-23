<?php

declare(strict_types=1);

namespace Api\Auth\External\Service\Support;

use Api\Auth\External\Support\ExternalAuthRequestTokenCodec;
use Api\Support\Exception\ApiException;

final readonly class ExternalAuthTransitionTokenDecoder
{
    private const LEGACY_TRANSITION_KINDS = ['external_transition', 'external_link'];

    public function __construct(private ExternalAuthRequestTokenCodec $tokenCodec)
    {
    }

    /**
     * @param list<string> $allowedFlows
     * @return array{
     *     provider:string,
     *     flow:string,
     *     provider_user_id:string,
     *     provider_email:string,
     *     provider_profile:array<string, mixed>
     * }
     */
    public function decode(string $provider, string $transitionToken, array $allowedFlows): array
    {
        $claims = $this->tokenCodec->decode($transitionToken);
        $kind = strtolower(trim((string)($claims['kind'] ?? '')));
        if (!in_array($kind, self::LEGACY_TRANSITION_KINDS, true)) {
            throw ApiException::unauthorized('외부 인증 transition_token 형식이 올바르지 않습니다.');
        }

        $normalizedProvider = strtolower(trim($provider));
        if (($claims['provider'] ?? null) !== $normalizedProvider) {
            throw ApiException::unauthorized('transition_token의 provider가 요청 경로와 일치하지 않습니다.');
        }

        $flow = strtolower(trim((string)($claims['flow'] ?? 'login')));
        if (!in_array($flow, $allowedFlows, true)) {
            throw ApiException::conflict('해당 외부 인증 흐름에서는 지원되지 않는 전환입니다.');
        }

        $providerUserId = trim((string)($claims['provider_user_id'] ?? ''));
        if ($providerUserId === '') {
            throw ApiException::badRequest('transition_token에 provider_user_id가 없습니다.');
        }

        return [
            'provider' => $normalizedProvider,
            'flow' => $flow,
            'provider_user_id' => $providerUserId,
            'provider_email' => strtolower(trim((string)($claims['provider_email'] ?? ''))),
            'provider_profile' => is_array($claims['provider_profile'] ?? null)
                ? (array)$claims['provider_profile']
                : [],
        ];
    }
}
