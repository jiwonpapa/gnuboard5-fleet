<?php

declare(strict_types=1);

namespace Api\Admin\Sms\Repository;

final class AdminSmsConfigStore extends AdminSmsRepositoryBase
{
    /**
     * @return array<string,mixed>
     */
    public function getConfig(): array
    {
        $configTable = $this->configTable();
        $smsConfigTable = $this->smsConfigTable();

        if (!$this->tableExists($smsConfigTable)) {
            $row = $this->fetchAssociative(
                "SELECT
                    cf_title,
                    cf_sms_use,
                    cf_sms_type,
                    cf_icode_id,
                    cf_icode_pw,
                    cf_icode_server_ip,
                    cf_icode_server_port,
                    cf_icode_token_key
                 FROM {$configTable}
                 LIMIT 1"
            );

            $config = is_array($row) ? $row : [];
            $config['cf_phone'] = '';
            $config['cf_datetime'] = '';
            $config['provider_ready'] = false;
            $config['uses_token_key'] = trim((string)($config['cf_icode_token_key'] ?? '')) !== '';
            $config['uses_legacy_credentials'] = trim((string)($config['cf_icode_id'] ?? '')) !== ''
                && trim((string)($config['cf_icode_pw'] ?? '')) !== '';
            $config['storage_ready'] = false;
            $config['missing_tables'] = [$smsConfigTable];

            return $config;
        }

        $this->ensureSmsConfigRow();

        $row = $this->fetchAssociative(
            "SELECT
                c.cf_title,
                c.cf_sms_use,
                c.cf_sms_type,
                c.cf_icode_id,
                c.cf_icode_pw,
                c.cf_icode_server_ip,
                c.cf_icode_server_port,
                c.cf_icode_token_key,
                s.cf_phone,
                s.cf_datetime
             FROM {$configTable} c
             LEFT JOIN {$smsConfigTable} s ON 1=1
             LIMIT 1"
        );

        $config = is_array($row) ? $row : [];
        $config['provider_ready'] = $this->isProviderReady($config);
        $config['uses_token_key'] = trim((string)($config['cf_icode_token_key'] ?? '')) !== '';
        $config['uses_legacy_credentials'] = trim((string)($config['cf_icode_id'] ?? '')) !== ''
            && trim((string)($config['cf_icode_pw'] ?? '')) !== '';
        $config['storage_ready'] = true;
        $config['missing_tables'] = [];

        return $config;
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function updateConfig(array $payload): array
    {
        $configTable = $this->configTable();
        $smsConfigTable = $this->smsConfigTable();

        $this->assertSmsTablesAvailable([$smsConfigTable], 'SMS 설정');
        $this->ensureSmsConfigRow();

        $configFields = [
            'cf_sms_use',
            'cf_sms_type',
            'cf_icode_id',
            'cf_icode_pw',
            'cf_icode_server_ip',
            'cf_icode_server_port',
            'cf_icode_token_key',
        ];

        $sets = [];
        $params = [];
        foreach ($configFields as $field) {
            if (!array_key_exists($field, $payload)) {
                continue;
            }

            $param = 'cfg_' . $field;
            $sets[] = "{$field} = :{$param}";
            $params[$param] = $payload[$field];
        }

        if ($sets !== []) {
            $this->executeStatement(
                sprintf('UPDATE %s SET %s LIMIT 1', $configTable, implode(', ', $sets)),
                $params
            );
        }

        if (array_key_exists('cf_phone', $payload)) {
            $this->executeStatement(
                "UPDATE {$smsConfigTable} SET cf_phone = :cf_phone",
                ['cf_phone' => (string)$payload['cf_phone']]
            );
        }

        return $this->getConfig();
    }

    private function ensureSmsConfigRow(): void
    {
        $table = $this->smsConfigTable();
        $exists = $this->fetchAssociative("SELECT cf_phone FROM {$table} LIMIT 1");
        if (!is_array($exists)) {
            $this->executeStatement(
                "INSERT INTO {$table} (cf_phone, cf_datetime) VALUES (:cf_phone, :cf_datetime)",
                [
                    'cf_phone' => '',
                    'cf_datetime' => $this->now(),
                ]
            );
        }
    }
}
