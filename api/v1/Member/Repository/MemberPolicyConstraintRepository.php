<?php

/**
 * MemberPolicyConstraintRepository API module.
 *
 * @package  Gnuboard5\Api\v1\Member\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Member\Repository;

final class MemberPolicyConstraintRepository extends MemberRepositorySupport
{
    public function getNicknameCooldownDays(): int
    {
        $configTable = $this->tables()->get('config');
        $row = $this->fetchAssociative(
            "SELECT cf_nick_modify FROM {$configTable} LIMIT 1"
        );

        $dbConfigured = max(0, (int)($row['cf_nick_modify'] ?? 0));
        if ($dbConfigured > 0) {
            return $dbConfigured;
        }

        return max(0, $this->envConfig()->nicknameCooldownDays);
    }

    public function isReservedNick(string $nick): bool
    {
        $blocked = $this->mergedProhibitNickWords();
        if ($blocked === []) {
            return false;
        }

        $normalizedNick = mb_strtolower($nick, 'UTF-8');
        foreach ($blocked as $blockedWord) {
            if ($normalizedNick === mb_strtolower($blockedWord, 'UTF-8')) {
                return true;
            }
        }

        return false;
    }

    public function isProhibitedEmailDomain(string $email): bool
    {
        $domain = strtolower((string)substr(strrchr($email, '@') ?: '', 1));
        if ($domain === '') {
            return false;
        }

        return in_array($domain, $this->mergedProhibitEmailDomains(), true);
    }

    /**
     * @return list<string>
     */
    private function mergedProhibitNickWords(): array
    {
        $unique = [];
        $sources = [
            $this->splitList($this->getProhibitNickRaw()),
            $this->envConfig()->prohibitMemberNickList(),
            $this->envConfig()->prohibitMemberIdList(),
        ];

        foreach ($sources as $words) {
            foreach ($words as $word) {
                $normalized = mb_strtolower(trim($word), 'UTF-8');
                if ($normalized === '') {
                    continue;
                }

                $unique[$normalized] = true;
            }
        }

        return array_keys($unique);
    }

    /**
     * @return list<string>
     */
    private function mergedProhibitEmailDomains(): array
    {
        $unique = [];
        $dbDomains = $this->splitList($this->getProhibitEmailRaw());
        $envDomains = $this->envConfig()->prohibitEmailDomainList();

        foreach (array_merge($dbDomains, $envDomains) as $domain) {
            $normalized = strtolower(trim($domain));
            if ($normalized === '') {
                continue;
            }

            $unique[$normalized] = true;
        }

        return array_keys($unique);
    }

    private function getProhibitNickRaw(): string
    {
        $configTable = $this->tables()->get('config');
        $row = $this->fetchAssociative(
            "SELECT cf_prohibit_id
             FROM {$configTable}
             LIMIT 1"
        );

        return trim((string)($row['cf_prohibit_id'] ?? ''));
    }

    private function getProhibitEmailRaw(): string
    {
        $configTable = $this->tables()->get('config');
        $row = $this->fetchAssociative(
            "SELECT cf_prohibit_email
             FROM {$configTable}
             LIMIT 1"
        );

        return trim((string)($row['cf_prohibit_email'] ?? ''));
    }

    /**
     * @return list<string>
     */
    private function splitList(string $raw): array
    {
        $tokens = preg_split('/[\r\n,|]+/', $raw);
        if (!is_array($tokens)) {
            return [];
        }

        $items = [];
        foreach ($tokens as $token) {
            $item = trim($token);
            if ($item === '') {
                continue;
            }

            $items[] = $item;
        }

        return $items;
    }
}
