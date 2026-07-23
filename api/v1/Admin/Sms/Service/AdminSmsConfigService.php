<?php

declare(strict_types=1);

namespace Api\Admin\Sms\Service;

use Api\Admin\Sms\Repository\AdminSmsRepository;
use Api\Admin\Sms\Service\Support\AdminSmsConfigPresenter;
use Api\Admin\Sms\Service\Support\AdminSmsInput;
use Api\Support\Exception\ApiException;

final class AdminSmsConfigService
{
    public function __construct(private readonly AdminSmsRepository $repository)
    {
    }

    /**
     * @return array<string,mixed>
     */
    public function getConfig(): array
    {
        return AdminSmsConfigPresenter::config($this->repository->getConfig());
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function updateConfig(array $payload): array
    {
        AdminSmsInput::assertAllowedKeys($payload, [
            'cf_sms_use',
            'cf_sms_type',
            'cf_icode_id',
            'cf_icode_pw',
            'cf_icode_server_ip',
            'cf_icode_server_port',
            'cf_icode_token_key',
            'cf_phone',
        ]);
        $normalized = [];

        if (array_key_exists('cf_sms_use', $payload)) {
            $cfSmsUse = trim((string)$payload['cf_sms_use']);
            if (!in_array($cfSmsUse, ['', 'icode'], true)) {
                throw ApiException::badRequest('cf_sms_use는 빈값 또는 icode만 허용됩니다.');
            }
            $normalized['cf_sms_use'] = $cfSmsUse;
        }

        if (array_key_exists('cf_sms_type', $payload)) {
            $cfSmsType = trim((string)$payload['cf_sms_type']);
            if (!in_array($cfSmsType, ['', 'LMS'], true)) {
                throw ApiException::badRequest('cf_sms_type은 빈값 또는 LMS만 허용됩니다.');
            }
            $normalized['cf_sms_type'] = $cfSmsType;
        }

        foreach ([
            'cf_icode_id',
            'cf_icode_pw',
            'cf_icode_server_ip',
            'cf_icode_token_key',
        ] as $field) {
            if (array_key_exists($field, $payload)) {
                $normalized[$field] = trim((string)$payload[$field]);
            }
        }

        if (array_key_exists('cf_icode_server_port', $payload)) {
            $port = preg_replace('/[^0-9]/', '', (string)$payload['cf_icode_server_port']) ?? '';
            if ($port === '') {
                throw ApiException::badRequest('cf_icode_server_port는 숫자여야 합니다.');
            }
            $normalized['cf_icode_server_port'] = $port;
        }

        if (array_key_exists('cf_phone', $payload)) {
            $phone = trim((string)$payload['cf_phone']);
            if (!AdminSmsInput::isValidCallbackPhone($phone)) {
                throw ApiException::badRequest('cf_phone은 유효한 회신번호여야 합니다.');
            }
            $normalized['cf_phone'] = $phone;
        }

        if ($normalized === []) {
            throw ApiException::badRequest('변경할 SMS 설정 필드가 없습니다.');
        }

        return AdminSmsConfigPresenter::config($this->repository->updateConfig($normalized));
    }

    /**
     * @return array<string,mixed>
     */
    public function syncMembers(): array
    {
        $config = $this->repository->getConfig();
        if (trim((string)($config['cf_sms_use'] ?? '')) !== 'icode') {
            throw ApiException::badRequest('SMS 사용이 icode로 설정된 경우에만 회원 동기화를 실행할 수 있습니다.');
        }

        return AdminSmsConfigPresenter::memberSync($this->repository->syncMembers());
    }
}
