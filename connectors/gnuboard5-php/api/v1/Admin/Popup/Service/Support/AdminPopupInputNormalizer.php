<?php

/**
 * AdminPopupInputNormalizer API module.
 *
 * @package  Gnuboard5\Api\v1\Admin\Popup\Service\Support
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Admin\Popup\Service\Support;

use Api\Core\Util\G5DateTime;
use Api\Support\Exception\ApiException;

final class AdminPopupInputNormalizer
{
    /**
     * @param array<string,mixed> $query
     * @return array{page:int,per_page:int}
     */
    public function normalizeListQuery(array $query): array
    {
        return [
            'page' => max(1, (int)($query['page'] ?? 1)),
            'per_page' => min(100, max(1, (int)($query['per_page'] ?? 20))),
        ];
    }

    /**
     * @param array<string,mixed> $query
     * @return array{device:string,division:string}
     */
    public function normalizeActiveQuery(array $query): array
    {
        return [
            'device' => $this->normalizeDevice((string)($query['device'] ?? 'pc')),
            'division' => $this->normalizeDivision((string)($query['division'] ?? 'comm')),
        ];
    }

    public function requirePopupId(int $popupId): int
    {
        if ($popupId <= 0) {
            throw ApiException::badRequest('nw_id는 1 이상의 정수여야 합니다.');
        }

        return $popupId;
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function normalizePayload(array $payload, bool $partial = false): array
    {
        $defaults = [
            'nw_division' => 'both',
            'nw_device' => 'both',
            'nw_begin_time' => G5DateTime::now(),
            'nw_end_time' => date('Y-m-d H:i:s', strtotime('+7 days') ?: time()),
            'nw_disable_hours' => 24,
            'nw_left' => 10,
            'nw_top' => 10,
            'nw_height' => 500,
            'nw_width' => 450,
            'nw_subject' => '',
            'nw_content' => '',
            'nw_content_html' => 1,
        ];
        if (array_diff(array_keys($payload), array_keys($defaults)) !== []) {
            throw ApiException::badRequest('지원하지 않는 팝업 요청 필드가 포함되어 있습니다.');
        }

        $normalized = [];
        foreach ($defaults as $field => $defaultValue) {
            if ($partial && !array_key_exists($field, $payload)) {
                continue;
            }

            $value = array_key_exists($field, $payload) ? $payload[$field] : $defaultValue;
            if (in_array($field, ['nw_disable_hours', 'nw_left', 'nw_top', 'nw_height', 'nw_width', 'nw_content_html'], true)) {
                $normalized[$field] = max(0, (int)$value);
                continue;
            }

            $normalized[$field] = trim((string)$value);
        }

        if (array_key_exists('nw_division', $normalized)) {
            $normalized['nw_division'] = $this->normalizeDivision((string)$normalized['nw_division']);
        }
        if (array_key_exists('nw_device', $normalized)) {
            $normalized['nw_device'] = $this->normalizeDevice((string)$normalized['nw_device']);
        }
        if (array_key_exists('nw_begin_time', $normalized)) {
            $normalized['nw_begin_time'] = $this->normalizeDatetime((string)$normalized['nw_begin_time'], 'nw_begin_time');
        }
        if (array_key_exists('nw_end_time', $normalized)) {
            $normalized['nw_end_time'] = $this->normalizeDatetime((string)$normalized['nw_end_time'], 'nw_end_time');
        }

        if (!$partial || array_key_exists('nw_subject', $payload)) {
            if (trim((string)($normalized['nw_subject'] ?? '')) === '') {
                throw ApiException::badRequest('nw_subject는 필수입니다.');
            }
        }
        if (!$partial || array_key_exists('nw_content', $payload)) {
            if (trim((string)($normalized['nw_content'] ?? '')) === '') {
                throw ApiException::badRequest('nw_content는 필수입니다.');
            }
        }

        if (array_key_exists('nw_begin_time', $normalized) && array_key_exists('nw_end_time', $normalized)) {
            if (strtotime((string)$normalized['nw_begin_time']) > strtotime((string)$normalized['nw_end_time'])) {
                throw ApiException::badRequest('nw_end_time은 nw_begin_time 이후여야 합니다.');
            }
        }

        return $normalized;
    }

    private function normalizeDivision(string $division): string
    {
        $value = strtolower(trim($division));
        $allowed = ['both', 'comm', 'shop', 'layer', 'new'];
        if (!in_array($value, $allowed, true)) {
            throw ApiException::badRequest('nw_division 값이 올바르지 않습니다.');
        }

        return $value;
    }

    private function normalizeDevice(string $device): string
    {
        $value = strtolower(trim($device));
        if (!in_array($value, ['both', 'pc', 'mobile'], true)) {
            throw ApiException::badRequest('nw_device 값이 올바르지 않습니다.');
        }

        return $value;
    }

    private function normalizeDatetime(string $value, string $field): string
    {
        $trimmed = trim($value);
        if ($trimmed === '') {
            throw ApiException::badRequest($field . '는 필수입니다.');
        }

        $timestamp = strtotime($trimmed);
        if ($timestamp === false) {
            throw ApiException::badRequest($field . ' 형식이 올바르지 않습니다.');
        }

        return date('Y-m-d H:i:s', $timestamp);
    }
}
