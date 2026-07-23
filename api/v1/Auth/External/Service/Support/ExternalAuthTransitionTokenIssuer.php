<?php

declare(strict_types=1);

namespace Api\Auth\External\Service\Support;

use Api\Auth\External\Support\ExternalAuthRequestTokenCodec;

final readonly class ExternalAuthTransitionTokenIssuer
{
    public function __construct(
        private ExternalAuthRequestTokenCodec $requestTokenCodec,
        private ExternalAuthResultValueNormalizer $valueNormalizer
    ) {
    }

    /**
     * @param array<string, mixed>|null $providerUser
     */
    public function issue(string $provider, string $flow, string $status, ?array $providerUser): ?string
    {
        if ($status !== 'success' || !is_array($providerUser)) {
            return null;
        }

        $providerUserId = trim((string)($providerUser['provider_user_id'] ?? ''));
        if ($providerUserId === '') {
            return null;
        }

        return $this->requestTokenCodec->issue([
            'kind' => 'external_transition',
            'provider' => $provider,
            'flow' => $flow,
            'provider_user_id' => $providerUserId,
            'provider_email' => trim((string)($providerUser['email'] ?? '')),
            'provider_profile' => $this->valueNormalizer->normalizeOptionalArray($providerUser) ?? [],
        ]);
    }
}
