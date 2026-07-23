<?php

declare(strict_types=1);

namespace Api\Auth\Contracts;

interface AuthRecoveryGateway
{
    public function createPasswordResetToken(string $memberId): string;

    public function resetPasswordByToken(string $memberId, string $token, string $newPassword): void;

    public function issueEmailVerifyToken(string $memberId, ?string $email = null): string;

    public function confirmEmailVerifyToken(string $memberId, string $token): void;
}
