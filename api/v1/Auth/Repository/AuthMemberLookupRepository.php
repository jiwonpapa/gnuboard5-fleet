<?php

declare(strict_types=1);

namespace Api\Auth\Repository;

final class AuthMemberLookupRepository extends AuthRepositorySupport
{
    public function findMemberById(string $memberId): ?array
    {
        $normalizedId = $this->normalizeMemberId($memberId);
        if (!$this->isValidMemberId($normalizedId)) {
            return null;
        }

        $memberTable = $this->tables()->get('member');
        $row = $this->fetchAssociative(
            "SELECT * FROM {$memberTable} WHERE mb_id = :mb_id LIMIT 1",
            ['mb_id' => $normalizedId]
        );

        if (!is_array($row) || !isset($row['mb_id'])) {
            return null;
        }

        return $row;
    }

    public function findMemberByEmail(string $email): ?array
    {
        $normalized = $this->sanitizeSingleLine($email);
        if ($normalized === '') {
            return null;
        }

        $memberTable = $this->tables()->get('member');
        $row = $this->fetchAssociative(
            "SELECT * FROM {$memberTable} WHERE mb_email = :mb_email LIMIT 1",
            ['mb_email' => $normalized]
        );

        if (!is_array($row) || !isset($row['mb_id'])) {
            return null;
        }

        return $row;
    }

    public function countMembersByEmail(string $email): int
    {
        $normalized = $this->sanitizeSingleLine($email);
        if ($normalized === '') {
            return 0;
        }

        $memberTable = $this->tables()->get('member');
        $row = $this->fetchAssociative(
            "SELECT COUNT(*) AS cnt
             FROM {$memberTable}
             WHERE mb_email = :mb_email",
            ['mb_email' => $normalized]
        );

        return (int)($row['cnt'] ?? 0);
    }

    public function isMemberActive(string $memberId): bool
    {
        $member = $this->findMemberById($memberId);
        if ($member === null) {
            return false;
        }

        $leaveDate = trim((string)($member['mb_leave_date'] ?? ''));
        $interceptDate = trim((string)($member['mb_intercept_date'] ?? ''));

        return $leaveDate === '' && $interceptDate === '';
    }

    public function existsMemberId(string $memberId): bool
    {
        $normalizedId = $this->normalizeMemberId($memberId);
        if (!$this->isValidMemberId($normalizedId)) {
            return false;
        }

        $memberTable = $this->tables()->get('member');
        $row = $this->fetchAssociative(
            "SELECT COUNT(*) AS cnt FROM {$memberTable} WHERE mb_id = :mb_id",
            ['mb_id' => $normalizedId]
        );

        return ((int)($row['cnt'] ?? 0)) > 0;
    }

    public function existsNick(string $nick): bool
    {
        $memberTable = $this->tables()->get('member');
        $row = $this->fetchAssociative(
            "SELECT COUNT(*) AS cnt FROM {$memberTable} WHERE mb_nick = :mb_nick",
            ['mb_nick' => $nick]
        );

        return ((int)($row['cnt'] ?? 0)) > 0;
    }

    public function existsEmail(string $email): bool
    {
        $memberTable = $this->tables()->get('member');
        $row = $this->fetchAssociative(
            "SELECT COUNT(*) AS cnt FROM {$memberTable} WHERE mb_email = :mb_email",
            ['mb_email' => $email]
        );

        return ((int)($row['cnt'] ?? 0)) > 0;
    }

    public function existsHp(string $phone): bool
    {
        $memberTable = $this->tables()->get('member');
        $row = $this->fetchAssociative(
            "SELECT COUNT(*) AS cnt
             FROM {$memberTable}
             WHERE mb_hp = :mb_hp",
            ['mb_hp' => $phone]
        );

        return ((int)($row['cnt'] ?? 0)) > 0;
    }
}
