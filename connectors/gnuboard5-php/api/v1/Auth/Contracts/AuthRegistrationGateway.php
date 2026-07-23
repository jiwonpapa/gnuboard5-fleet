<?php

declare(strict_types=1);

namespace Api\Auth\Contracts;

interface AuthRegistrationGateway
{
    public function registerMember(array $member): array;

    public function hashPassword(string $plainPassword): string;

    public function validateRegisterPassword(string $password): void;

    public function validateRegisterMemberId(string $memberId): void;

    public function validateRegisterNick(string $nick): void;

    public function validateRegisterEmail(string $email): void;

    public function validateRegisterPhone(string $phone): void;
}
