<?php

declare(strict_types=1);

namespace Api\Admin\Sms\Support;

final class LegacyIcodeClientFactory
{
    private readonly LegacyIcodeEnvironmentBootstrapper $bootstrapper;

    public function __construct(?LegacyIcodeEnvironmentBootstrapper $bootstrapper = null)
    {
        $this->bootstrapper = $bootstrapper ?? new LegacyIcodeEnvironmentBootstrapper();
    }

    /**
     * @param array<string,mixed> $config
     * @return \LMS|\SMS
     */
    public function create(array $config, string $mode): \LMS|\SMS
    {
        $projectRoot = $this->bootstrapper->projectRoot();
        if ($this->usesLegacyJsonTransport($config)) {
            require_once __DIR__ . '/LegacyIcodeHelpers.php';
        }

        if ($mode === 'lms') {
            require_once $projectRoot . '/lib/icode.lms.lib.php';
            $client = new \LMS();
            $portCode = trim((string)($config['cf_icode_token_key'] ?? '')) !== ''
                ? 1
                : ((string)($config['cf_icode_server_port'] ?? '') === '7296' ? 2 : 1);
            $client->SMS_con(
                $this->bootstrapper->resolveHost($config),
                (string)($config['cf_icode_id'] ?? ''),
                (string)($config['cf_icode_pw'] ?? ''),
                $portCode
            );

            return $client;
        }

        require_once $projectRoot . '/lib/icode.sms.lib.php';
        $client = new \SMS();
        $client->SMS_con(
            $this->bootstrapper->resolveHost($config),
            (string)($config['cf_icode_id'] ?? ''),
            (string)($config['cf_icode_pw'] ?? ''),
            (string)($config['cf_icode_server_port'] ?? '7295')
        );

        return $client;
    }

    /**
     * @template T
     * @param array<string,mixed> $config
     * @param callable(\LMS|\SMS):T $callback
     * @return T
     */
    public function withClient(array $config, string $mode, callable $callback): mixed
    {
        $snapshot = $this->bootstrapper->boot($config);
        $bootstrapCreatedConfig = ($snapshot['had_config'] ?? false) === false && array_key_exists('config', $GLOBALS);

        try {
            $client = $this->create($config, $mode);
            if (($snapshot['had_config'] ?? false) === false && !$bootstrapCreatedConfig && array_key_exists('config', $GLOBALS)) {
                unset($GLOBALS['config']);
            }

            return $callback($client);
        } finally {
            $this->bootstrapper->restore($snapshot);
        }
    }

    /**
     * @param array<string,mixed> $config
     */
    private function usesLegacyJsonTransport(array $config): bool
    {
        return trim((string)($config['cf_icode_token_key'] ?? '')) !== '';
    }
}
