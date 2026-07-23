<?php

/**
 * AuthAvailabilityService API module.
 *
 * @package  Gnuboard5\Api\v1\Auth\Service
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Auth\Service;

use Api\Auth\Contracts\AuthIdentityGateway;
use Api\Auth\Contracts\AuthRegistrationGateway;
use Api\Support\Exception\ApiException;

final class AuthAvailabilityService
{
    public function __construct(
        private readonly AuthIdentityGateway $identityGateway,
        private readonly AuthRegistrationGateway $registrationGateway,
        private readonly AuthInputHelper $inputHelper
    ) {
    }

    public function memberId(string $value): array
    {
        return $this->probe(
            'member_id',
            $value,
            $this->inputHelper->sanitizeMemberId($value),
            fn (string $normalized): null => $this->registrationGateway->validateRegisterMemberId($normalized)
        );
    }

    public function nick(string $value): array
    {
        return $this->probe(
            'nick',
            $value,
            $this->inputHelper->sanitizeSingleLine($value),
            fn (string $normalized): null => $this->registrationGateway->validateRegisterNick($normalized)
        );
    }

    public function email(string $value): array
    {
        return $this->probe(
            'email',
            $value,
            $this->inputHelper->sanitizeSingleLine($value),
            fn (string $normalized): null => $this->registrationGateway->validateRegisterEmail($normalized)
        );
    }

    public function phone(string $value): array
    {
        return $this->probe(
            'phone',
            $value,
            $this->inputHelper->normalizePhone($value),
            fn (string $normalized): null => $this->registrationGateway->validateRegisterPhone($normalized)
        );
    }

    public function recommender(string $value): array
    {
        $normalized = $this->inputHelper->sanitizeMemberId($value);
        if ($normalized === '') {
            throw ApiException::badRequest('value 쿼리 파라미터가 필요합니다.');
        }

        if (!$this->identityGateway->isRecommendationEnabled()) {
            return $this->result(
                'recommender',
                $value,
                $normalized,
                false,
                'feature_disabled',
                '추천인 기능이 현재 비활성화되어 있습니다.'
            );
        }

        if (!$this->inputHelper->isValidMemberId($normalized)) {
            return $this->result(
                'recommender',
                $value,
                $normalized,
                false,
                'invalid',
                '회원아이디는 영문자, 숫자, _ 조합 3~20자만 허용됩니다.'
            );
        }

        if ($this->identityGateway->findMemberById($normalized) === null) {
            return $this->result(
                'recommender',
                $value,
                $normalized,
                false,
                'not_found',
                '존재하지 않는 추천인 아이디입니다.'
            );
        }

        return $this->result(
            'recommender',
            $value,
            $normalized,
            true,
            'available',
            '사용 가능한 추천인 아이디입니다.'
        );
    }

    /**
     * @param callable(string):void $validator
     */
    private function probe(string $type, string $input, string $normalized, callable $validator): array
    {
        if ($normalized === '') {
            throw ApiException::badRequest('value 쿼리 파라미터가 필요합니다.');
        }

        try {
            $validator($normalized);
        } catch (ApiException $exception) {
            return $this->result(
                $type,
                $input,
                $normalized,
                false,
                $this->reasonFor($exception),
                $exception->getMessage()
            );
        }

        return $this->result(
            $type,
            $input,
            $normalized,
            true,
            'available',
            '사용 가능합니다.'
        );
    }

    private function result(
        string $type,
        string $input,
        string $normalized,
        bool $available,
        string $reason,
        string $message
    ): array {
        return [
            'type' => $type,
            'input' => $input,
            'normalized_value' => $normalized,
            'available' => $available,
            'reason' => $reason,
            'message' => $message,
        ];
    }

    private function reasonFor(ApiException $exception): string
    {
        return match ($exception->statusCode) {
            409 => 'already_taken',
            403 => 'blocked',
            default => 'invalid',
        };
    }
}
