<?php

declare(strict_types=1);

namespace Api\Admin\Sms\Support;

/**
 * Legacy iCode adapter boundary for the admin SMS domain.
 */
final class LegacyIcodeTransport implements SmsTransport
{
    private readonly LegacyIcodeClientFactory $clientFactory;
    private readonly LegacyIcodeResultNormalizer $resultNormalizer;

    public function __construct(
        ?LegacyIcodeClientFactory $clientFactory = null,
        ?LegacyIcodeResultNormalizer $resultNormalizer = null
    ) {
        $this->clientFactory = $clientFactory ?? new LegacyIcodeClientFactory();
        $this->resultNormalizer = $resultNormalizer ?? new LegacyIcodeResultNormalizer();
    }

    /**
     * @param array<string,mixed> $config
     * @param array<int,array<string,mixed>> $recipients
     * @return array{success:int,failure:int,items:array<int,array<string,mixed>>}
     */
    public function sendBatch(
        array $config,
        string $message,
        string $reply,
        array $recipients,
        string $bookingKey
    ): array {
        if ($recipients === []) {
            return [
                'success' => 0,
                'failure' => 0,
                'items' => [],
            ];
        }

        $mode = trim((string)($config['cf_sms_type'] ?? '')) === 'LMS' ? 'lms' : 'sms';
        $prepared = [];

        try {
            return $this->clientFactory->withClient(
                $config,
                $mode,
                function (\LMS|\SMS $client) use ($config, $mode, $reply, $recipients, $message, $bookingKey, &$prepared): array {
                    $caller = trim((string)($config['cf_title'] ?? ''));
                    $replyDigits = preg_replace('/[^0-9]/', '', $reply) ?? '';

                    foreach ($recipients as $recipient) {
                        $recipientMessage = str_replace('{이름}', (string)($recipient['bk_name'] ?? ''), $message);
                        if ($mode === 'lms') {
                            $result = $client->Add(
                                [(string)$recipient['bk_hp']],
                                $replyDigits,
                                $caller,
                                '',
                                '',
                                $recipientMessage,
                                $bookingKey,
                                1
                            );
                        } else {
                            $result = $client->Add(
                                (string)$recipient['bk_hp'],
                                $replyDigits,
                                $caller,
                                $recipientMessage,
                                $bookingKey
                            );
                        }

                        if ($result !== true && $result !== '') {
                            $prepared[] = [
                                'recipient' => $recipient,
                                'success' => false,
                                'code' => 'PREPARE_ERROR',
                                'memo' => (string)$result,
                                'log' => '',
                                'status' => 'prepared-failed',
                            ];
                            continue;
                        }

                        $prepared[] = [
                            'recipient' => $recipient,
                            'success' => false,
                            'code' => '',
                            'memo' => '',
                            'log' => '',
                            'status' => 'prepared',
                        ];
                    }

                    $sent = $client->Send();

                    return $this->resultNormalizer->summarizeDispatch(
                        $prepared,
                        $sent,
                        (array)($client->Result ?? []),
                        $mode
                    );
                }
            );
        } catch (\Throwable $e) {
            $items = [];
            foreach ($recipients as $recipient) {
                $items[] = [
                    'recipient' => $recipient,
                    'success' => false,
                    'code' => 'TRANSPORT_ERROR',
                    'memo' => $e->getMessage(),
                    'log' => 'icode:exception',
                ];
            }

            return [
                'success' => 0,
                'failure' => count($items),
                'items' => $items,
            ];
        }
    }
}
