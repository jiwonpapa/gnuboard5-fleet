<?php

declare(strict_types=1);

namespace Api\Admin\Auth\Service\Support;

use Api\Support\Exception\ApiException;
use Api\Support\Validation\ValidationPatterns;
use DateTimeImmutable;

final class AdminAuthPayloadNormalizer
{
    /**
     * @param array<string,mixed> $payload
     * @return array<int,array{au_menu:string,au_auth:string}>
     */
    public function normalizeAuthRows(array $payload): array
    {
        $this->assertOnlyFields($payload, ['auths', 'au_menu', 'au_auth'], '관리자 권한 설정');
        $hasAuths = array_key_exists('auths', $payload);
        $hasLegacyFields = array_key_exists('au_menu', $payload) || array_key_exists('au_auth', $payload);
        if ($hasAuths && $hasLegacyFields) {
            throw ApiException::badRequest('auths와 au_menu/au_auth 형식은 동시에 사용할 수 없습니다.');
        }

        $rows = [];
        if ($hasAuths) {
            $rawList = $payload['auths'];
            if (!is_array($rawList) || $rawList === []) {
                throw ApiException::badRequest('auths는 1개 이상의 권한 설정이 필요합니다.');
            }
            foreach ($rawList as $rawRow) {
                if (!is_array($rawRow)) {
                    throw ApiException::badRequest('auths 항목은 객체여야 합니다.');
                }
                $this->assertOnlyFields($rawRow, ['au_menu', 'au_auth'], '관리자 권한 항목');
                $menu = $this->normalizeMenuCode($rawRow['au_menu'] ?? null);
                $auth = $this->normalizeAuth($rawRow['au_auth'] ?? null);
                $rows[$menu] = ['au_menu' => $menu, 'au_auth' => $auth];
            }
        }

        if (!$hasAuths) {
            if (!array_key_exists('au_menu', $payload) || !array_key_exists('au_auth', $payload)) {
                throw ApiException::badRequest('auths 또는 au_menu/au_auth가 필요합니다.');
            }
            $menu = $this->normalizeMenuCode($payload['au_menu']);
            $auth = $this->normalizeAuth($payload['au_auth']);
            $rows[$menu] = ['au_menu' => $menu, 'au_auth' => $auth];
        }

        return array_values($rows);
    }

    public function normalizeMemberId(string $memberId): string
    {
        $value = trim($memberId);
        if ($value === '' || preg_match(ValidationPatterns::MEMBER_ID, $value) !== 1) {
            throw ApiException::badRequest('mb_id 형식이 올바르지 않습니다.');
        }

        return $value;
    }

    public function normalizeOptionalDate(mixed $value, string $field): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }
        if (!is_string($value)) {
            throw ApiException::badRequest($field . '는 YYYY-MM-DD 형식이어야 합니다.');
        }

        $normalized = trim($value);
        $date = DateTimeImmutable::createFromFormat('!Y-m-d', $normalized);
        $errors = DateTimeImmutable::getLastErrors();
        if (
            $date === false
            || (is_array($errors) && ($errors['warning_count'] > 0 || $errors['error_count'] > 0))
            || $date->format('Y-m-d') !== $normalized
        ) {
            throw ApiException::badRequest($field . '는 유효한 YYYY-MM-DD 날짜여야 합니다.');
        }

        return $normalized;
    }

    private function normalizeMenuCode(mixed $menuCode): string
    {
        if (!is_string($menuCode)) {
            throw ApiException::badRequest('au_menu는 문자열이어야 합니다.');
        }

        $value = trim($menuCode);
        if ($value === '' || preg_match('/^[0-9]{3,6}$/', $value) !== 1) {
            throw ApiException::badRequest('au_menu 형식이 올바르지 않습니다.');
        }

        return $value;
    }

    private function normalizeAuth(mixed $auth): string
    {
        if (!is_string($auth)) {
            throw ApiException::badRequest('au_auth는 문자열이어야 합니다.');
        }

        $raw = strtolower(trim($auth));
        if ($raw === '') {
            throw ApiException::badRequest('au_auth는 필수입니다.');
        }

        $raw = str_replace(',', '', $raw);
        if (preg_match('/^[rwd]+$/', $raw) !== 1) {
            throw ApiException::badRequest('au_auth는 r/w/d 조합만 가능합니다.');
        }

        $ordered = [];
        foreach (['r', 'w', 'd'] as $token) {
            if (str_contains($raw, $token)) {
                $ordered[] = $token;
            }
        }

        return implode(',', $ordered);
    }

    /**
     * @param array<string,mixed> $payload
     * @param list<string> $allowed
     */
    private function assertOnlyFields(array $payload, array $allowed, string $context): void
    {
        $unknown = array_values(array_diff(array_keys($payload), $allowed));
        if ($unknown !== []) {
            throw ApiException::badRequest($context . ' 요청에 허용되지 않은 필드가 있습니다: ' . implode(', ', $unknown));
        }
    }
}
