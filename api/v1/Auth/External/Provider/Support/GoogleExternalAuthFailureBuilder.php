<?php

declare(strict_types=1);

namespace Api\Auth\External\Provider\Support;

final readonly class GoogleExternalAuthFailureBuilder
{
    public function __construct(private string $providerMode)
    {
    }

    /**
     * @param array<string,mixed> $payload
     * @return array{
     *     status:string,
     *     provider_tx_id:string,
     *     retryable:bool,
     *     user_action_required:bool,
     *     error_code:?string,
     *     error_message:?string,
     *     provider_user?:array<string,mixed>|null,
     *     provider_payload?:array<string,mixed>,
     *     provider_meta?:array<string,mixed>
     * }
     */
    public function build(
        string $status,
        string $errorCode,
        string $message,
        bool $retryable,
        bool $userActionRequired,
        array $payload
    ): array {
        return [
            'status' => $status,
            'provider_tx_id' => $this->providerTxId($errorCode, json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR)),
            'retryable' => $retryable,
            'user_action_required' => $userActionRequired,
            'error_code' => $errorCode,
            'error_message' => $message,
            'provider_payload' => $payload,
            'provider_meta' => [
                'mode' => $this->providerMode,
            ],
        ];
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function sanitizeTokenBody(array $payload): array
    {
        $sanitized = $payload;
        unset($sanitized['access_token'], $sanitized['refresh_token'], $sanitized['id_token']);

        return $sanitized;
    }

    public function providerTxId(string $left, string $right): string
    {
        return 'google_tx_' . substr(hash('sha256', $left . '|' . $right), 0, 20);
    }
}
