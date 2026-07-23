<?php

/**
 * MemberUniquenessRepository API module.
 *
 * @package  Gnuboard5\Api\v1\Member\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Member\Repository;

final class MemberUniquenessRepository extends MemberRepositorySupport
{
    public function existsNick(string $nickname, string $memberId): bool
    {
        $memberTable = $this->getMemberTable();

        $row = $this->fetchAssociative(
            "SELECT COUNT(*) AS cnt FROM {$memberTable}
             WHERE mb_nick = :mb_nick AND mb_id <> :mb_id
             LIMIT 1",
            [
                'mb_nick' => trim($nickname),
                'mb_id' => trim($memberId),
            ]
        );

        if (!is_array($row)) {
            return false;
        }

        return ((int)($row['cnt'] ?? 0)) > 0;
    }

    public function existsEmail(string $email, string $memberId): bool
    {
        $memberTable = $this->getMemberTable();

        $row = $this->fetchAssociative(
            "SELECT COUNT(*) AS cnt FROM {$memberTable}
             WHERE mb_email = :mb_email AND mb_id <> :mb_id
             LIMIT 1",
            [
                'mb_email' => trim($email),
                'mb_id' => trim($memberId),
            ]
        );

        if (!is_array($row)) {
            return false;
        }

        return ((int)($row['cnt'] ?? 0)) > 0;
    }

    public function existsHpForOther(string $phone, string $memberId): bool
    {
        $memberTable = $this->getMemberTable();

        $row = $this->fetchAssociative(
            "SELECT COUNT(*) AS cnt FROM {$memberTable}
             WHERE mb_hp = :mb_hp AND mb_id <> :mb_id
             LIMIT 1",
            [
                'mb_hp' => $phone,
                'mb_id' => trim($memberId),
            ]
        );

        if (!is_array($row)) {
            return false;
        }

        return ((int)($row['cnt'] ?? 0)) > 0;
    }
}
