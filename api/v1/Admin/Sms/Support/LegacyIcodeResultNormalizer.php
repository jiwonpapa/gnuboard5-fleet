<?php

declare(strict_types=1);

namespace Api\Admin\Sms\Support;

final class LegacyIcodeResultNormalizer
{
    /**
     * @param array<int,array<string,mixed>> $prepared
     * @param array<int,string> $rawResults
     * @return array{success:int,failure:int,items:array<int,array<string,mixed>>}
     */
    public function summarizeDispatch(array $prepared, bool $sent, array $rawResults, string $mode): array
    {
        $resultMap = $this->buildResultCodeMap($rawResults);
        $items = [];
        $success = 0;
        $failure = 0;

        foreach ($prepared as $item) {
            if (($item['status'] ?? '') === 'prepared-failed') {
                $failure++;
                $items[] = $item;
                continue;
            }

            $phone = (string)($item['recipient']['bk_hp'] ?? '');
            $normalizedPhone = $this->normalizeMobilePhone($phone);
            $code = $resultMap[$normalizedPhone !== '' ? $normalizedPhone : $phone] ?? ($sent ? '' : 'TRANSPORT_ERROR');
            $normalized = $this->normalizeSendResultCode($code, $phone);
            if ($normalized['success']) {
                $success++;
            } else {
                $failure++;
            }

            $items[] = [
                'recipient' => $item['recipient'],
                'success' => $normalized['success'],
                'code' => $normalized['code'],
                'memo' => $normalized['memo'],
                'log' => sprintf('icode:%s:%s', $mode, $sent ? 'sent' : 'transport_error'),
            ];
        }

        return [
            'success' => $success,
            'failure' => $failure,
            'items' => $items,
        ];
    }

    /**
     * @param array<int,string> $rawResults
     * @return array<string,string>
     */
    public function buildResultCodeMap(array $rawResults): array
    {
        $resultMap = [];

        foreach ($rawResults as $rawResult) {
            [$phone, $code] = array_pad(explode(':', (string)$rawResult, 2), 2, '');
            $normalizedPhone = $this->normalizeMobilePhone($phone);
            if ($normalizedPhone !== '') {
                $resultMap[$normalizedPhone] = $code;
            }
        }

        return $resultMap;
    }

    /**
     * @return array{success:bool,code:string,memo:string}
     */
    private function normalizeSendResultCode(string $rawCode, string $phone): array
    {
        $code = trim($rawCode);
        if ($code !== '' && !str_starts_with($code, 'Error') && !in_array($code, ['TRANSPORT_ERROR', 'PREPARE_ERROR'], true)) {
            return [
                'success' => true,
                'code' => $code,
                'memo' => $this->formatMobilePhone($phone, true) . '로 전송했습니다.',
            ];
        }

        $errorCode = '99';
        if (preg_match('/Error\(([^)]+)\)/', $code, $matches) === 1) {
            $errorCode = trim($matches[1]);
        } elseif ($code !== '') {
            $errorCode = $code;
        }

        $memo = match ($errorCode) {
            '02' => '형식이 잘못되어 전송이 실패하였습니다.',
            '23' => '데이터를 다시 확인해 주시기바랍니다.',
            '97' => '잔여코인이 부족합니다.',
            '98' => '사용기간이 만료되었습니다.',
            '99', 'TRANSPORT_ERROR' => '인증 받지 못하였습니다. 계정을 다시 확인해 주세요.',
            'PREPARE_ERROR' => '발송 패킷 준비 중 오류가 발생했습니다.',
            default => '알 수 없는 오류로 전송이 실패하였습니다.',
        };

        return [
            'success' => false,
            'code' => $errorCode,
            'memo' => $memo,
        ];
    }

    private function normalizeMobilePhone(string $phone): string
    {
        $digits = preg_replace('/[^0-9]/', '', $phone) ?? '';
        if (preg_match('/^01[0-9]{8,9}$/', $digits) !== 1) {
            return '';
        }

        return $digits;
    }

    private function formatMobilePhone(string $phone, bool $withHyphen): string
    {
        $digits = $this->normalizeMobilePhone($phone);
        if ($digits === '' || !$withHyphen) {
            return $digits;
        }

        if (strlen($digits) === 10) {
            return substr($digits, 0, 3) . '-' . substr($digits, 3, 3) . '-' . substr($digits, 6);
        }

        return substr($digits, 0, 3) . '-' . substr($digits, 3, 4) . '-' . substr($digits, 7);
    }
}
