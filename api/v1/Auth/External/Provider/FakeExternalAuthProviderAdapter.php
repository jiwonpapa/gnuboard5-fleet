<?php

declare(strict_types=1);

namespace Api\Auth\External\Provider;

use Api\Auth\External\Contracts\ExternalAuthProviderAdapter;
use Api\Auth\External\Support\ExternalAuthConfig;
use Api\Support\Exception\ApiException;

final readonly class FakeExternalAuthProviderAdapter implements ExternalAuthProviderAdapter
{
    /** @var list<string> */
    private const SUPPORTED_FLOWS = ['login', 'identity_verify', 'account_link'];

    /** @var list<string> */
    private const SUPPORTED_SCENARIOS = ['success', 'pending', 'cancelled', 'failed', 'expired'];

    public function __construct(private ExternalAuthConfig $config)
    {
    }

    public function provider(): string
    {
        return 'fake';
    }

    public function describe(): array
    {
        return [
            'provider' => $this->provider(),
            'label' => 'Fake Provider',
            'mode' => 'fake',
            'description' => '개발용 외부 인증 공급자입니다. 실제 vendor 연결 없이 start/complete 흐름과 실패 시나리오를 재현합니다.',
            'flows' => self::SUPPORTED_FLOWS,
            'sandbox_available' => true,
            'replay_supported' => true,
        ];
    }

    public function start(array $request): array
    {
        $scenario = $this->normalizeScenario($request['scenario'] ?? null);
        $query = http_build_query([
            'provider' => $this->provider(),
            'flow' => $request['flow'],
            'request_token' => $request['request_token'],
            'state' => $request['state'],
            'scenario' => $scenario,
        ]);

        return [
            'provider_mode' => 'fake',
            'authorization_url' => $this->config->fakeAuthorizeBaseUrl . '?' . $query,
            'callback_method' => 'POST',
            'provider_meta' => [
                'scenario' => $scenario,
                'supported_scenarios' => self::SUPPORTED_SCENARIOS,
            ],
        ];
    }

    public function complete(array $request): array
    {
        $payload = $request['payload'] ?? [];
        $scenario = $request['scenario']
            ?? ($payload['scenario'] ?? ($request['code'] ?? null));
        $resolvedScenario = $this->normalizeScenario($scenario);
        $providerTxId = 'fake_tx_' . substr(hash('sha256', $request['request_token'] . '|' . $resolvedScenario), 0, 20);

        return match ($resolvedScenario) {
            'success' => [
                'status' => 'success',
                'provider_tx_id' => $providerTxId,
                'retryable' => false,
                'user_action_required' => false,
                'error_code' => null,
                'error_message' => null,
                'provider_user' => [
                    'provider_user_id' => 'fake-user-001',
                    'email' => 'fake-user@example.com',
                    'display_name' => 'Fake Provider User',
                ],
                'provider_payload' => [
                    'scenario' => $resolvedScenario,
                    'received_payload' => $payload,
                ],
                'provider_meta' => ['mode' => 'fake'],
            ],
            'pending' => [
                'status' => 'pending',
                'provider_tx_id' => $providerTxId,
                'retryable' => false,
                'user_action_required' => false,
                'error_code' => null,
                'error_message' => null,
                'provider_payload' => [
                    'scenario' => $resolvedScenario,
                    'received_payload' => $payload,
                ],
                'provider_meta' => ['mode' => 'fake'],
            ],
            'cancelled' => [
                'status' => 'cancelled',
                'provider_tx_id' => $providerTxId,
                'retryable' => true,
                'user_action_required' => true,
                'error_code' => 'fake.cancelled',
                'error_message' => '사용자가 외부 인증을 취소했습니다.',
                'provider_payload' => [
                    'scenario' => $resolvedScenario,
                    'received_payload' => $payload,
                ],
                'provider_meta' => ['mode' => 'fake'],
            ],
            'failed' => [
                'status' => 'failed',
                'provider_tx_id' => $providerTxId,
                'retryable' => false,
                'user_action_required' => true,
                'error_code' => 'fake.failed',
                'error_message' => '외부 인증 공급자가 실패 응답을 반환했습니다.',
                'provider_payload' => [
                    'scenario' => $resolvedScenario,
                    'received_payload' => $payload,
                ],
                'provider_meta' => ['mode' => 'fake'],
            ],
            'expired' => [
                'status' => 'expired',
                'provider_tx_id' => $providerTxId,
                'retryable' => true,
                'user_action_required' => true,
                'error_code' => 'fake.expired',
                'error_message' => '외부 인증 세션이 만료되었습니다.',
                'provider_payload' => [
                    'scenario' => $resolvedScenario,
                    'received_payload' => $payload,
                ],
                'provider_meta' => ['mode' => 'fake'],
            ],
            default => throw ApiException::badRequest('지원하지 않는 fake provider scenario입니다.'),
        };
    }

    private function normalizeScenario(mixed $value): string
    {
        $scenario = strtolower(trim((string)$value));
        if ($scenario === '') {
            return 'success';
        }

        if (!in_array($scenario, self::SUPPORTED_SCENARIOS, true)) {
            throw ApiException::badRequest('fake provider scenario는 success, pending, cancelled, failed, expired 중 하나여야 합니다.');
        }

        return $scenario;
    }
}
