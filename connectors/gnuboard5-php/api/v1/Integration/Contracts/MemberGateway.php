<?php

/**
 * MemberGateway API 모듈 정의.
 *
 * @package  Gnuboard5\Api\v1\Integration\Contracts
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Integration\Contracts;

interface MemberGateway
{
    public function findById(string $memberId): ?array;
    public function getMemberImageConfig(): array;
    public function update(string $memberId, array $updates): void;
    public function withdraw(string $memberId, string $leaveDate, string $memo): void;
    public function existsNick(string $nickname, string $memberId): bool;
    public function existsEmail(string $email, string $memberId): bool;
    public function verifyPassword(array $member, string $password): bool;
    public function validatePassword(string $password): void;
    public function hashPassword(string $password): string;
    public function validateNicknameForUpdate(string $nickname, string $memberId): void;
    public function validateEmailForUpdate(string $email, string $memberId): void;
    public function validatePhoneForUpdate(string $phone, string $memberId): void;
}
