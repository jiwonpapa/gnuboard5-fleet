<?php

declare(strict_types=1);

namespace Api\Auth\Service\Support;

use Api\Auth\Service\AuthInputHelper;
use Api\Support\Exception\ApiException;

final class AuthRecoveryInputNormalizer
{
    public function __construct(
        private readonly AuthInputHelper $inputHelper
    ) {
    }

    public function normalizeRequiredEmail(string $email): string
    {
        $normalizedEmail = $this->inputHelper->sanitizeSingleLine($email);
        if ($normalizedEmail === '') {
            throw ApiException::badRequest('mb_email은 필수입니다.');
        }
        if (!filter_var($normalizedEmail, FILTER_VALIDATE_EMAIL)) {
            throw ApiException::badRequest('이메일 형식이 올바르지 않습니다.');
        }

        return $normalizedEmail;
    }

    public function normalizeOptionalEmail(?string $email): ?string
    {
        if ($email === null) {
            return null;
        }

        $normalizedEmail = $this->inputHelper->sanitizeSingleLine($email);
        if ($normalizedEmail !== '' && !filter_var($normalizedEmail, FILTER_VALIDATE_EMAIL)) {
            throw ApiException::badRequest('이메일 형식이 올바르지 않습니다.');
        }

        return $normalizedEmail;
    }

    public function normalizeRequiredMemberId(string $memberId): string
    {
        $normalizedMemberId = $this->inputHelper->sanitizeMemberId($memberId);
        if ($normalizedMemberId === '') {
            throw ApiException::badRequest('mb_id는 필수입니다.');
        }
        if (!$this->inputHelper->isValidMemberId($normalizedMemberId)) {
            throw ApiException::badRequest('mb_id 형식이 올바르지 않습니다.');
        }

        return $normalizedMemberId;
    }

    public function normalizeOptionalMemberId(?string $memberId): string
    {
        $normalizedMemberId = $this->inputHelper->sanitizeMemberId((string)($memberId ?? ''));
        if ($normalizedMemberId !== '' && !$this->inputHelper->isValidMemberId($normalizedMemberId)) {
            throw ApiException::badRequest('mb_id 형식이 올바르지 않습니다.');
        }

        return $normalizedMemberId;
    }

    public function normalizeRequiredPassword(string $password): string
    {
        $normalizedPassword = trim($password);
        if ($normalizedPassword === '') {
            throw ApiException::badRequest('mb_password는 필수입니다.');
        }

        return $normalizedPassword;
    }
}
