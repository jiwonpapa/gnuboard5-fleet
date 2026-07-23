<?php

declare(strict_types=1);

namespace Api\Auth\Contracts;

interface AuthIdentityGateway
{
    public function findMemberById(string $memberId): ?array;

    public function findMemberByEmail(string $email): ?array;

    public function countMembersByEmail(string $email): int;

    public function isRecommendationEnabled(): bool;

    public function isMemberActive(string $memberId): bool;

    public function verifyPassword(array $member, string $password): bool;

    public function isEmailCertificationRequiredAndMissing(array $member): bool;
}
