<?php

declare(strict_types=1);

namespace Api\Auth\External\Service\Support;

use Api\Auth\External\Support\ExternalAuthRequestTokenCodec;

final class ExternalAuthResultBuilder
{
    private readonly ExternalAuthResultValueNormalizer $valueNormalizer;
    private readonly ExternalAuthTransitionTokenIssuer $transitionTokenIssuer;

    public function __construct(
        ExternalAuthRequestTokenCodec $requestTokenCodec,
        ?ExternalAuthResultValueNormalizer $valueNormalizer = null,
        ?ExternalAuthTransitionTokenIssuer $transitionTokenIssuer = null
    ) {
        $this->valueNormalizer = $valueNormalizer ?? new ExternalAuthResultValueNormalizer();
        $this->transitionTokenIssuer = $transitionTokenIssuer
            ?? new ExternalAuthTransitionTokenIssuer($requestTokenCodec, $this->valueNormalizer);
    }

    /**
     * @param array{
     *     flow:string,
     *     callback_url:string,
     *     scopes:list<string>,
     *     metadata:array<string, mixed>,
     *     scenario:?string,
     *     state:string
     * } $request
     * @param array<string, mixed> $adapterResult
     * @return array<string, mixed>
     */
    public function buildStartResponse(
        string $provider,
        array $request,
        string $requestToken,
        array $adapterResult,
        int $requestTtlSeconds
    ): array {
        return [
            'provider' => $provider,
            'flow' => $request['flow'],
            'request_token' => $requestToken,
            'state' => $request['state'],
            'callback_url' => $request['callback_url'],
            'callback_method' => $adapterResult['callback_method'] ?? 'POST',
            'authorization_url' => (string)($adapterResult['authorization_url'] ?? ''),
            'expires_in' => $requestTtlSeconds,
            'provider_mode' => (string)($adapterResult['provider_mode'] ?? 'external'),
            'provider_meta' => $this->valueNormalizer->normalizeOptionalArray($adapterResult['provider_meta'] ?? []),
        ];
    }

    /**
     * @param array<string, mixed> $adapterResult
     * @return array{
     *     provider:string,
     *     flow:string,
     *     status:string,
     *     provider_tx_id:string,
     *     retryable:bool,
     *     user_action_required:bool,
     *     error_code:?string,
     *     error_message:?string,
     *     provider_user:array<string, mixed>|null,
     *     transition_token:?string,
     *     provider_payload:array<string, mixed>|null,
     *     provider_meta:array<string, mixed>|null
     * }
     */
    public function buildCompletionOutcome(string $provider, string $flow, array $adapterResult): array
    {
        $status = $this->valueNormalizer->normalizeStatus((string)($adapterResult['status'] ?? ''));
        $providerUser = $this->valueNormalizer->normalizeOptionalArray($adapterResult['provider_user'] ?? null);

        return [
            'provider' => $provider,
            'flow' => $flow,
            'status' => $status,
            'provider_tx_id' => (string)($adapterResult['provider_tx_id'] ?? ''),
            'retryable' => (bool)($adapterResult['retryable'] ?? false),
            'user_action_required' => (bool)($adapterResult['user_action_required'] ?? false),
            'error_code' => $this->valueNormalizer->normalizeOptionalString($adapterResult['error_code'] ?? null),
            'error_message' => $this->valueNormalizer->normalizeOptionalString($adapterResult['error_message'] ?? null),
            'provider_user' => $providerUser,
            'transition_token' => $this->transitionTokenIssuer->issue($provider, $flow, $status, $providerUser),
            'provider_payload' => $this->valueNormalizer->normalizeOptionalArray($adapterResult['provider_payload'] ?? []),
            'provider_meta' => $this->valueNormalizer->normalizeOptionalArray($adapterResult['provider_meta'] ?? []),
        ];
    }

    /**
     * @param array{
     *     provider:string,
     *     flow:string,
     *     status:string,
     *     provider_tx_id:string,
     *     retryable:bool,
     *     user_action_required:bool,
     *     error_code:?string,
     *     error_message:?string,
     *     provider_user:array<string, mixed>|null,
     *     transition_token:?string,
     *     provider_payload:array<string, mixed>|null,
     *     provider_meta:array<string, mixed>|null
     * } $completion
     * @param array<string, mixed> $linkage
     * @return array<string, mixed>
     */
    public function buildCompleteResponse(string $requestToken, string $state, array $completion, array $linkage): array
    {
        return [
            'provider' => $completion['provider'],
            'flow' => $completion['flow'],
            'status' => $completion['status'],
            'internal_request_id' => $requestToken,
            'state' => $state,
            'provider_tx_id' => $completion['provider_tx_id'],
            'retryable' => $completion['retryable'],
            'user_action_required' => $completion['user_action_required'],
            'error_code' => $completion['error_code'],
            'error_message' => $completion['error_message'],
            'provider_user' => $completion['provider_user'],
            'linkage' => $linkage,
            'available_actions' => $this->resolveAvailableActions(
                $completion['status'],
                $linkage,
                $completion['transition_token']
            ),
            'transition_token' => $completion['transition_token'],
            'link_token' => $completion['transition_token'],
            'provider_payload' => $completion['provider_payload'],
            'provider_meta' => $completion['provider_meta'],
        ];
    }

    /**
     * @param array<string, mixed> $linkage
     * @return list<string>
     */
    private function resolveAvailableActions(string $status, array $linkage, ?string $transitionToken): array
    {
        if ($status !== 'success' || $transitionToken === null) {
            return [];
        }

        return match ((string)($linkage['status'] ?? '')) {
            'linked' => ['session'],
            'candidate' => ['claim'],
            'signup_required' => ['claim', 'register'],
            'ambiguous' => ['claim'],
            default => [],
        };
    }

}
